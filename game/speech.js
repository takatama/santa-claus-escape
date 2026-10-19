import { IS_EN } from './locale.js';
import { speechPauseAfter } from './voice-edits.js';
// 音声は進行を制御しない。キャンセル後のイベントも世代番号で無効化する。
export class SpeechPlayer {
  constructor(synth, makeUtterance, report = () => {}, { clips = {}, makeAudio = null, resolveClip = key => clips[key], resolveTimeline = () => null, sequencePlayer = null } = {}) {
    this.synth = synth;
    this.makeUtterance = makeUtterance;
    this.report = report;
    this.generation = 0;
    this.muted = false;
    this.utterance = null;
    this.timer = null;
    this.clips = clips;
    this.makeAudio = makeAudio;
    this.audio = null;
    this.resolveClip = resolveClip;
    this.resolveTimeline = resolveTimeline;
    this.sequencePlayer = sequencePlayer;
  }
  stop(report = true) {
    this.generation += 1;
    clearTimeout(this.timer);
    this.timer = null;
    this.utterance = null;
    this.sequencePlayer?.stop();
    if (this.audio) {
      try { this.audio.pause(); this.audio.currentTime = 0; } catch { /* 再生不可でも停止する */ }
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    try { this.synth?.cancel(); } catch { /* 文字で継続可能 */ }
    if (report) this.report(this.muted ? '音声オフ' : '音声を停止しました');
  }
  setMuted(muted) {
    this.muted = muted;
    this.stop(false);
    this.report(muted ? '音声オフ・文字で遊べます' : '音声オン・聞き直しで再生');
  }
  setEffectsEnabled(enabled){this.sequencePlayer?.setEffectsEnabled?.(enabled);}
  play(segments, key = '', {recorded=true} = {}) {
    this.stop(false);
    if (this.muted) return this.report('音声オフ・文字で遊べます');
    const timeline=recorded?this.resolveTimeline(key):null;
    if(timeline&&this.sequencePlayer?.playTimeline){
      const generation=this.generation;this.report('読み上げ中');
      this.sequencePlayer.playTimeline(timeline,
        ()=>{if(generation===this.generation)this.report('読み上げが終わりました');},
        ()=>{if(generation===this.generation&&!this.muted)this.play(segments,key,{recorded:false});},
      );return;
    }
    const clip = recorded ? this.resolveClip(key) : null;
    if(Array.isArray(clip)&&this.sequencePlayer){
      const generation=this.generation;
      this.report('読み上げ中');
      this.sequencePlayer.play(clip,
        ()=>{if(generation===this.generation)this.report('読み上げが終わりました');},
        ()=>{if(generation===this.generation&&!this.muted)this.play(segments,key,{recorded:false});},
      );
      return;
    }
    if (typeof clip==='string' && this.makeAudio) {
      const generation = this.generation;
      const fallback = () => {
        if (generation !== this.generation || this.muted) return;
        this.play(segments,key,{recorded:false}); // ファイルの失敗時は同じ台詞をブラウザで読む。
      };
      try {
        const audio = this.makeAudio(clip);
        this.audio = audio;
        audio.onended = () => {
          if (generation !== this.generation) return;
          this.sequencePlayer?.stopObservation?.();
          this.audio = null;
          this.report('読み上げが終わりました');
        };
        audio.onerror = fallback;
        this.report('読み上げ中');
        const playback = audio.play();
        this.sequencePlayer?.observeMedia?.(audio,clip);
        playback?.catch(fallback);
      } catch { fallback(); }
      return;
    }
    if (!this.synth || !this.makeUtterance) return this.report('読み上げに未対応です。台詞を読んで遊べます');
    const generation = this.generation;
    const queue = segments.flatMap(segment => (segment.text.match(/[^。！？\n]+[。！？]?/gu) || []).map(text => ({ ...segment, text })));
    let index = 0;
    const next = () => {
      if (generation !== this.generation || this.muted) return;
      if (index >= queue.length) { this.utterance = null; this.report('読み上げが終わりました'); return; }
      try {
        const segment = queue[index++];
        // 数字は原作 say-as characters と同じく一桁ずつ読む。
        const spoken = segment.text.replace(/\d{4}/g, digits => digits.split('').join(IS_EN?', ':'、'));
        const utterance = this.makeUtterance(spoken);
        utterance.lang = IS_EN ? 'en-US' : 'ja-JP';
        utterance.rate = 0.93;
        utterance.pitch = segment.speaker === 'santa' ? 0.85 : 1;
        const voices = this.synth.getVoices?.() || [];
        const japanese = voices.filter(voice => (IS_EN ? /^en(?:-|_)/i : /^ja(?:-|_)/i).test(voice.lang));
        utterance.voice = japanese.find(voice => voice.localService) || japanese[0] || null;
        utterance.onend = () => {
          if(generation!==this.generation)return;
          const pause=speechPauseAfter(key,segment.text);
          if(pause){this.report('考える時間');this.timer=setTimeout(next,pause*1000);}else next();
        };
        utterance.onerror = () => {
          if (generation !== this.generation) return;
          this.stop(false);
          this.report('音声を再生できません。台詞を読んで遊べます');
        };
        this.utterance = utterance;
        this.report('読み上げ中');
        this.synth.speak(utterance);
      } catch {
        this.stop(false);
        this.report('音声を再生できません。台詞を読んで遊べます');
      }
    };
    // キャンセルがブラウザに反映されてから、新しい一つの発話を開始。
    this.timer = setTimeout(next, 0);
  }
}
