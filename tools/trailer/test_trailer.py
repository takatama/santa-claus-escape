"""Signal-level regression tests; no game assets or browser needed."""
import unittest
import json
import os
import shutil
import tempfile
import numpy as np
from PIL import Image
from trailer import RATE, checks_pass, local_file, locate, ordered_frames, run, sync, validate_plan
from pathlib import Path


class SynchronizationTests(unittest.TestCase):
    def test_cdp_delivery_order_does_not_reorder_the_video(self):
        frames = [{'t': 3, 'file': 'c'}, {'t': 1, 'file': 'a'}, {'t': 2, 'file': 'b'}]
        self.assertEqual([f['file'] for f in ordered_frames(frames)], ['a', 'b', 'c'])

    def test_early_and_late_recording_offsets(self):
        rng = np.random.default_rng(42)
        voice = rng.normal(0, .1, RATE * 2)
        for offset in [-.12, .08]:
            with self.subTest(offset=offset):
                actual = 1 + offset
                recording = np.zeros(RATE * 5)
                start = round(actual * RATE)
                recording[start:start + len(voice)] = voice
                recording += rng.normal(0, .0001, len(recording))
                found, correlation = locate(recording, voice, 1)
                self.assertAlmostEqual(found, actual, places=3)
                self.assertGreater(correlation, .99)

    def test_missing_or_silent_audio_fails(self):
        with self.assertRaises(ValueError):
            locate(np.zeros(RATE), np.zeros(RATE * 2), 0)
        with self.assertRaises(ValueError):
            locate(np.zeros(RATE * 5), np.zeros(RATE * 2), 1)

    def test_drift_missing_reference_and_low_correlation_fail(self):
        good = {'residualMs': 3, 'correlation': .995}
        self.assertTrue(checks_pass([good, good], 2))
        self.assertFalse(checks_pass([good], 2))
        self.assertFalse(checks_pass([good, {'residualMs': 45, 'correlation': .999}], 2))
        self.assertFalse(checks_pass([{'residualMs': 0, 'correlation': .8}], 1))
        self.assertFalse(checks_pass([{'residualMs': 0, 'correlation': float('nan')}], 1))

    def test_capture_cannot_reference_files_outside_take(self):
        with self.assertRaises(ValueError):
            local_file(Path.cwd(), '../private.f32')

    def test_edit_duration_and_extreme_zoom_are_rejected(self):
        self.assertEqual(validate_plan({'scenes': [{'duration': 25, 'zoom': 1.6}]}), 25)
        for scene in [{'duration': 31}, {'duration': 25, 'zoom': 4},
                      {'duration': 25, 'caption': 'too\nmany lines'}]:
            with self.assertRaises(ValueError):
                validate_plan({'scenes': [scene]})

    @unittest.skipUnless(os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg'), 'FFmpeg not installed')
    def test_encoded_audio_and_video_round_trip(self):
        ffmpeg = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            t = np.arange(RATE * 2) / RATE
            voice = (.2 * np.sin(2 * np.pi * (200 * t + 150 * t**2)) *
                     np.minimum(1, t * 10) * np.minimum(1, (2 - t) * 10)).astype(np.float32)
            voice.tofile(folder / 'reference.f32')
            audio = np.zeros(RATE * 4, dtype=np.float32)
            audio[int(.9 * RATE):int(.9 * RATE) + len(voice)] = voice
            audio.tofile(folder / 'audio.f32')
            run(ffmpeg, '-f', 'f32le', '-ar', RATE, '-ac', '1', '-i', folder / 'audio.f32',
                '-c:a', 'libopus', '-b:a', '192k', folder / 'audio.webm')
            frames = []
            for i in range(40):
                name = f'frame-{i:05d}.jpg'
                Image.new('RGB', (160, 90), (i * 5, 40, 80)).save(folder / name)
                frames.append({'file': name, 't': i * 100})
            (folder / 'capture.json').write_text(json.dumps({
                'mode': 'trial', 'revision': 'synthetic', 'epoch': 0, 'frames': frames,
                'references': [{'file': 'reference.f32', 'sampleRate': RATE, 'scheduledT': 1000}],
            }), encoding='utf-8')
            sync(folder, ffmpeg)
            report = json.loads((folder / 'sync-check.json').read_text())
            self.assertTrue(report['pass'])
            self.assertAlmostEqual(report['audioDelayCorrectionMs'], 100, delta=5)


if __name__ == '__main__':
    unittest.main()
