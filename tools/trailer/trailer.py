"""Offline capture calibration and declarative trailer editing. No game mutations."""
import argparse
import json
import math
import os
from pathlib import Path
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

RATE = 48000
ROOT = Path(__file__).resolve().parents[2]


def run(ffmpeg, *args):
    return subprocess.run([ffmpeg, '-hide_banner', '-v', 'error', '-n', *map(str, args)],
                          check=True, capture_output=True).stdout


def decode(ffmpeg, source, rate=None):
    inputs = ['-f', 'f32le', '-ar', str(rate), '-ac', '1'] if rate else []
    return np.frombuffer(run(ffmpeg, *inputs, '-i', source, '-ac', '1', '-ar', RATE,
                             '-f', 'f32le', 'pipe:1'), np.float32)


def locate(signal, reference, expected):
    """Search within 500 ms of an event timestamp; reject silent/short windows."""
    begin = max(0, int((expected - .5) * RATE))
    end = min(len(signal), int((expected + len(reference) / RATE + .5) * RATE))
    window = signal[begin:end].astype(np.float64)
    reference = reference.astype(np.float64)
    if len(reference) < RATE or len(window) < len(reference) or np.std(reference) < 1e-5:
        raise ValueError('Missing, silent, or incomplete audio reference.')
    size = 1 << (len(window) + len(reference) - 1).bit_length()
    cross = np.fft.irfft(np.fft.rfft(window, size) * np.conj(np.fft.rfft(reference, size)), size)
    lag = int(np.argmax(cross[:len(window) - len(reference) + 1]))
    matched = window[lag:lag + len(reference)]
    correlation = float(np.corrcoef(matched, reference)[0, 1]) if np.std(matched) > 1e-8 else 0.0
    return (begin + lag) / RATE, correlation


def checks_pass(checks, minimum):
    return len(checks) >= minimum and all(
        math.isfinite(c['correlation']) and c['correlation'] > .98 and abs(c['residualMs']) < 30
        for c in checks)


def ordered_frames(frames):
    # CDP delivery can arrive out of order while image encoding catches up.
    # Timestamp, rather than callback order, defines the presentation timeline.
    by_time = {frame['t']: frame for frame in frames}
    return [by_time[t] for t in sorted(by_time)]


def local_file(folder, name):
    target = (folder / name).resolve()
    if not target.is_relative_to(folder.resolve()):
        raise ValueError('Capture paths must stay within their take directory.')
    return target


def sync(folder, ffmpeg):
    metadata = json.loads((folder / 'capture.json').read_text(encoding='utf-8'))
    report_file = folder / 'sync-check.json'
    if report_file.exists() or (folder / 'synced.mp4').exists():
        raise ValueError('Sync outputs already exist; use a new take directory.')
    report = {'pass': False, 'mode': metadata.get('mode'), 'revision': metadata.get('revision')}
    try:
        refs = metadata['references']
        frames = ordered_frames(metadata['frames'])
        report['reorderedFrames'] = sum(a != b for a, b in zip(frames, metadata['frames']))
        if metadata.get('errors') or not refs or len(frames) < 2:
            raise ValueError('Browser errors, missing audio references, or missing video.')
        if any(not math.isfinite(frame['t']) for frame in frames):
            raise ValueError('Invalid video timestamp.')
        raw = decode(ffmpeg, folder / 'audio.webm')
        reference = lambda ref: decode(ffmpeg, local_file(folder, ref['file']), ref['sampleRate'])
        expected = (refs[0]['scheduledT'] - metadata['epoch']) / 1000
        actual, correlation = locate(raw, reference(refs[0]), expected)
        delay = expected - actual
        raw_correlation = correlation
        if correlation <= .98 or not math.isfinite(correlation) or abs(delay) >= .5:
            raise ValueError(f'Calibration failed: correlation={correlation}, delay={delay}. STOP.')
        audio_filter = (f'adelay={delay * 1000:.3f}:all=1' if delay >= 0 else
                        f'atrim=start={-delay:.6f},asetpts=PTS-STARTPTS')
        run(ffmpeg, '-i', folder / 'audio.webm', '-af', audio_filter,
            '-c:a', 'libopus', '-b:a', '192k', folder / 'audio-corrected.webm')
        lines = ['ffconcat version 1.0']
        for i, frame in enumerate(frames):
            local_file(folder, frame['file'])
            # Recorder generates these names; refuse concat metacharacters from edited metadata.
            if not frame['file'].startswith('frame-') or not frame['file'].endswith('.jpg') or any(
                    c not in 'abcdefghijklmnopqrstuvwxyz0123456789-.' for c in frame['file']):
                raise ValueError('Invalid frame filename.')
            duration = (frames[i + 1]['t'] - frame['t']) / 1000 if i + 1 < len(frames) else 1 / 30
            lines += [f"file '{frame['file']}'", 'option framerate 1000', f'duration {duration:.6f}']
        (folder / 'frames.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        base = frames[0]['t']
        offset = (base - metadata['epoch']) / 1000
        if offset < 0:
            raise ValueError('First video frame precedes recording epoch.')
        # concat's per-file framerate option requires safe=0; filenames above are allowlisted.
        run(ffmpeg, '-f', 'concat', '-safe', '0', '-i', folder / 'frames.txt',
            '-ss', offset, '-i', folder / 'audio-corrected.webm', '-map', '0:v', '-map', '1:a',
            *encoding(), '-shortest', '-movflags', '+faststart', folder / 'synced.mp4')
        final = decode(ffmpeg, folder / 'synced.mp4')
        checks = []
        for ref in refs:
            expected = (ref['scheduledT'] - base) / 1000
            samples = reference(ref)
            if expected < 0 or expected + len(samples) / RATE > len(final) / RATE:
                continue
            actual, correlation = locate(final, samples, expected)
            checks.append({'reference': ref['file'], 'expectedSeconds': expected,
                           'residualMs': (actual - expected) * 1000, 'correlation': correlation})
        minimum = 1 if metadata.get('mode') == 'trial' else 2
        # A full session needs a later scene, not merely two adjacent references.
        span = max((c['expectedSeconds'] for c in checks), default=0) - min(
            (c['expectedSeconds'] for c in checks), default=0)
        report.update(audioDelayCorrectionMs=delay * 1000, rawCorrelation=raw_correlation,
                      checks=checks, pass_=checks_pass(checks, minimum) and (minimum == 1 or span > 10))
        report['pass'] = report.pop('pass_')
        if not report['pass']:
            raise ValueError('Residual offset, correlation, or later-scene check failed. STOP.')
    except Exception as error:
        report['pass'] = False
        report['error'] = str(error)
        raise
    finally:
        report_file.write_text(json.dumps(report, indent=2, allow_nan=False), encoding='utf-8')
    print(json.dumps(report, indent=2))


def encoding():
    return ['-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
            '-r', '30', '-fps_mode', 'cfr', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']


def validate_plan(plan):
    scenes = plan['scenes']
    total = sum(scene['duration'] for scene in scenes)
    if not scenes or not 20 <= total <= 30:
        raise ValueError('Trailer must contain 20–30 seconds of scenes.')
    for scene in scenes:
        if scene['duration'] <= 0 or scene.get('start', 0) < 0:
            raise ValueError('Invalid scene time.')
        if not 1 <= scene.get('zoom', 1) <= 2:
            raise ValueError('Zoom must be between 1 and 2.')
        if '\n' in scene.get('caption', ''):
            raise ValueError('Use one short caption per scene.')
    return total


def render(plan_file, output, font_file, ffmpeg):
    plan = json.loads(plan_file.read_text(encoding='utf-8'))
    duration = validate_plan(plan)
    resolve = lambda name: (plan_file.parent / name).resolve()
    # Fail closed: edits require a verified capture, including later-scene checks.
    source = resolve(plan['source'])
    sync_report = json.loads((source.parent / 'sync-check.json').read_text(encoding='utf-8'))
    if not sync_report.get('pass'):
        raise ValueError('Source synchronization has not passed.')
    source_duration = len(decode(ffmpeg, source)) / RATE
    for scene in plan['scenes']:
        if not scene.get('closing') and (scene['start'] + scene.get('inputDuration', scene['duration']) > source_duration):
            raise ValueError('Scene extends beyond the source recording.')
    output.mkdir(parents=True, exist_ok=False)
    font = ImageFont.truetype(str(font_file), 64)
    background = ImageOps.fit(Image.open(resolve(plan['background'])).convert('RGB'), (1920, 1080))
    background.save(output / 'background.png')
    card = background.convert('RGBA')
    if plan.get('artwork'):
        artwork = Image.open(resolve(plan['artwork'])).convert('RGBA')
        artwork.thumbnail((960, 1000), Image.Resampling.LANCZOS)
        card.alpha_composite(artwork, (30, 1080 - artwork.height))
    shade = Image.new('RGBA', card.size)
    draw = ImageDraw.Draw(shade)
    for x in range(1920):
        draw.line((x, 0, x, 1080), fill=(6, 20, 35, int(225 * min(1, max(0, (x - 700) / 500)))))
    card = Image.alpha_composite(card, shade)
    draw = ImageDraw.Draw(card)
    for text, y in [(plan['title'], 450), (plan['guide'], 580)]:
        if draw.textbbox((0, 0), text, font=font)[2] > 880:
            raise ValueError('Closing text is too wide; shorten it.')
        draw.text((1400, y), text, font=font, anchor='mm', fill='#fff0d6')
    card.convert('RGB').save(output / 'end-card.png')
    for i, scene in enumerate(plan['scenes']):
        length = scene['duration']
        part = output / f'part-{i}.mp4'
        if scene.get('closing'):
            run(ffmpeg, '-loop', '1', '-framerate', '30', '-i', output / 'end-card.png',
                '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', length,
                '-vf', 'fade=t=in:d=0.3', *encoding(), part)
            continue
        caption = Image.new('RGBA', (1920, 1080))
        draw = ImageDraw.Draw(caption)
        text = scene.get('caption', '')
        width = draw.textbbox((0, 0), text, font=font)[2]
        if width > 1632:
            raise ValueError('Caption too wide: shorten it rather than shrinking the text.')
        if text:
            draw.rounded_rectangle((72, 56, width + 144, 170), radius=22, fill=(8, 20, 31, 210))
            draw.text((108, 113), text, font=font, anchor='lm', fill='#fff3de')
        caption.save(output / f'caption-{i}.png')
        crop = scene.get('crop', [1280, 960, 0, 0])
        if len(crop) != 4 or any(type(v) is not int or v < 0 for v in crop) or min(crop[:2]) == 0:
            raise ValueError('Crop must be [width,height,x,y] with nonnegative integer values.')
        progress = 'min(1,max(0,(on/30-0.7)/2))'
        zoom = f"1+{scene.get('zoom', 1)-1}*({progress})*({progress})*(3-2*({progress}))"
        filters = (
            f"[0:v]fps=30,tpad=stop_mode=clone:stop_duration={length},crop={':'.join(map(str, crop))},scale=1920:1080:force_original_aspect_ratio=decrease,"
            f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x102334,setsar=1,"
            f"zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30[game];"
            "[1:v]format=rgba,fade=t=in:d=0.3:alpha=1,fade=t=out:st=3.9:d=0.3:alpha=1[cap];"
            "[game][cap]overlay=x=0:y='12*max(0,1-t/0.3)':shortest=1[v]")
        run(ffmpeg, '-ss', scene['start'], '-t', scene.get('inputDuration', length), '-i', source, '-loop', '1', '-framerate', '30',
            '-i', output / f'caption-{i}.png', '-filter_complex', filters,
            '-map', '[v]', '-map', '0:a', '-af',
            ('volume=0,' if scene.get('mute') else '') + 'apad,' +
            f'afade=t=in:d=0.035,afade=t=out:st={max(0,length-.08)}:d=0.08',
            '-t', length, *encoding(), part)
    inputs = []
    streams = ''
    for i in range(len(plan['scenes'])):
        inputs += ['-i', output / f'part-{i}.mp4']
        streams += f'[{i}:v][{i}:a]'
    run(ffmpeg, *inputs, '-filter_complex',
        streams + f"concat=n={len(plan['scenes'])}:v=1:a=1[v][a]",
        '-map', '[v]', '-map', '[a]', *encoding(), output / 'cut.mp4')
    target = output / 'trailer.mp4'
    if plan.get('music'):
        gain = plan.get('musicGain', .15)
        if not 0 <= gain <= 1:
            raise ValueError('Music gain must be between 0 and 1.')
        filters = (f'[0:a]asplit=2[voice][key];[1:a]atrim=duration={duration},asetpts=PTS-STARTPTS,'
                   f'volume={gain},afade=t=in:d=0.35,afade=t=out:st={duration-1}:d=1[bed];'
                   '[bed][key]sidechaincompress=threshold=0.07:ratio=2:attack=30:release=600:knee=2.5[music];'
                   '[voice][music]amix=inputs=2:duration=first:normalize=0[a]')
        run(ffmpeg, '-i', output / 'cut.mp4', '-stream_loop', '-1', '-i', resolve(plan['music']),
            '-filter_complex', filters, '-map', '0:v', '-map', '[a]', '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k', '-t', duration, '-movflags', '+faststart', target)
    else:
        run(ffmpeg, '-i', output / 'cut.mp4', '-c', 'copy', '-movflags', '+faststart', target)
    # Decode the entire delivery; clipping is a failure, not silently limited away.
    audio = decode(ffmpeg, target)
    peak = float(np.max(np.abs(audio)))
    # FFmpeg's mono downmix can exceed either channel's peak; inspect delivered stereo for clipping.
    report = {'durationSeconds': len(audio) / RATE, 'monoDownmixPeak': peak,
              'pass': abs(len(audio) / RATE - duration) < .15}
    # Full stereo peak check (a mono downmix can conceal channel clipping).
    stereo = np.frombuffer(run(ffmpeg, '-i', target, '-f', 'f32le', '-ac', '2', 'pipe:1'), np.float32)
    report.update(stereoPeak=float(np.max(np.abs(stereo))))
    report['pass'] = report['pass'] and report['stereoPeak'] < 1
    (output / 'render-check.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    shutil.copyfile(plan_file, output / 'edit-plan.json')
    shutil.copyfile(ROOT / 'NOTICE.md', output / 'NOTICE.md')
    (output / 'credits.txt').write_text(
        'Santa Claus Escape: https://github.com/takatama/santa-claus-escape\n'
        'Material licenses and provenance: see NOTICE.md.\n' + (
            'Example music: Laid_Back by PeriTune\n'
            'https://peritune.com/blog/2017/01/25/laid_back/\n'
            'CC BY 4.0: https://creativecommons.org/licenses/by/4.0/\n'
            'Changes: excerpt, loop, gain, fades, speech ducking, AAC encoding.\n'
            if plan.get('music', '').endswith('laid-back-loop.ogg') else
            'Check credits for all music audible in the recording and any added track.\n'), encoding='utf-8')
    for name, second in [('thumbnail', 0), ('preview', .5)]:
        run(ffmpeg, '-ss', second, '-i', target, '-frames:v', '1', output / f'{name}.png')
    if not report['pass']:
        raise ValueError('Output duration or audio peak check failed.')
    print(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg'))
    commands = parser.add_subparsers(dest='command', required=True)
    capture = commands.add_parser('sync')
    capture.add_argument('take', type=Path)
    edit = commands.add_parser('render')
    edit.add_argument('plan', type=Path)
    edit.add_argument('--out', type=Path, required=True)
    edit.add_argument('--font', type=Path, required=True)
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error('Install FFmpeg or specify --ffmpeg / FFMPEG_BINARY.')
    try:
        if args.command == 'sync':
            sync(args.take.resolve(), args.ffmpeg)
        else:
            render(args.plan.resolve(), args.out.resolve(), args.font, args.ffmpeg)
    except subprocess.CalledProcessError as error:
        parser.exit(1, error.stderr.decode('utf-8', errors='replace'))
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
