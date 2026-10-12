"""Offline derivatives; never overwrite original WAV/PNG. Requires Pillow and FFmpeg.
Run --samples first, then --all after comparison. Build does not run an encoder.
"""
import argparse, hashlib, json, subprocess, wave, math, struct
from pathlib import Path
from PIL import Image, ImageChops

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--ffmpeg',required=True)
parser.add_argument('--samples',action='store_true')
parser.add_argument('--all',action='store_true')
args=parser.parse_args()
if args.samples==args.all: parser.error('Choose --samples or --all')
plan=json.loads((root/'scripts/media-plan.json').read_text(encoding='utf-8'))
records=[]
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def encode(source,target,codec,bitrate):
    target.parent.mkdir(parents=True,exist_ok=True)
    cmd=[args.ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(source),'-map_metadata','-1','-c:a',codec,'-b:a',bitrate]
    if codec=='aac':cmd+=['-movflags','+faststart']
    subprocess.run(cmd+[str(target)],check=True)
for item in plan:
    source=root/'prototype'/item['source']
    if args.samples and item['source'] not in ['assets/audio/storybook-help.wav','assets/audio/ja-leda-question-deer-ten-times.wav','assets/audio/answer-digit-8.wav','assets/papers/forest-clean.png','assets/papers/globe.png','assets/red-box/red-body.png']:continue
    before=digest(source)
    target=(root/'.measurements/representatives'/item['target']) if args.samples else root/'prototype'/item['target']
    target.parent.mkdir(parents=True,exist_ok=True)
    details={}
    if source.suffix=='.png':
        original=Image.open(source)
        original.save(target,format='WEBP',quality=item['quality'],method=6,exact=True)
        result=Image.open(target)
        assert result.size==original.size
        if original.mode=='RGBA':assert ImageChops.difference(original.getchannel('A'),result.getchannel('A')).getbbox() is None
        details={'dimensions':list(original.size),'alphaPreserved':original.mode=='RGBA','quality':item['quality']}
    else:
        encode(source,target,'aac',item['bitrate'])
        if args.samples:encode(source,target.with_suffix('.ogg'),'libopus','48k')
        with wave.open(str(source)) as w:rate=w.getframerate();channels=w.getnchannels();count=w.getnframes();original=w.readframes(count)
        raw=subprocess.check_output([args.ffmpeg,'-hide_banner','-loglevel','error','-i',str(target),'-f','s16le','-ar',str(rate),'-ac',str(channels),'-'])
        decodedFrames=len(raw)//(2*channels)
        assert abs(decodedFrames-count)<=1,(source,decodedFrames,count)
        ref=struct.unpack('<'+'h'*(len(original)//2),original);out=struct.unpack('<'+'h'*(len(raw)//2),raw)
        rms=lambda xs:math.sqrt(sum(v*v for v in xs)/len(xs))
        details={'codec':'AAC-LC','bitrate':item['bitrate'],'sampleRate':rate,'channels':channels,'seconds':count/rate,'decodedSeconds':decodedFrames/rate,'rmsDeltaDb':round(20*math.log10(rms(out)/rms(ref)),4)}
    assert digest(source)==before,'Original changed'
    records.append({'source':item['source'],'target':item['target'],'sourceBytes':source.stat().st_size,'targetBytes':target.stat().st_size,'reductionPercent':round(100*(1-target.stat().st_size/source.stat().st_size),2),'sourceSha256':before,'targetSha256':digest(target),**details})
    print(json.dumps({'target':item['target'],'bytes':target.stat().st_size}),flush=True)
output=root/('docs/performance/representatives.json' if args.samples else 'docs/performance/assets.json')
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({'encoder':subprocess.check_output([args.ffmpeg,'-version'],text=True).splitlines()[0],'images':'Pillow WebP, no resizing, exact alpha','files':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
