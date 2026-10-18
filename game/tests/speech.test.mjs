import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENARIO, getMessage } from '../scenario.js';
import { SpeechPlayer } from '../speech.js';
import { AUDIO_CLIPS } from '../audio.js';

test('原作の出題候補と正解対応から3138を導き、台詞を照合する', async t => {
  let source;
  try { source = await readFile(new URL('../reference/legacy-index.js', import.meta.url), 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    t.skip('非公開の原作コピーがないため直接照合のみ省略。公開版の動作検査は続行する。');
    return;
  }
  assert.ok(source.includes("['サンタ', 'イタチ', 'サンタ', 'ハタチ']"));
  const mapping = Object.fromEntries(['サンタ', 'イタチ', 'ハタチ'].map(word => [word, Number(source.match(new RegExp(`'${word}': (\\d)`))[1])]));
  assert.equal(SCENARIO.words.map(word => mapping[word]).join(''), SCENARIO.answer);
  for (const key of ['red1', 'red2', 'red3', 'red4', 'success', 'wrong']) {
    const legacyKey = key === 'success' ? 'redSolved' : key === 'wrong' ? 'notSolved1' : key.replace('red', 'redBox');
    const original = source.match(new RegExp(`${legacyKey}: \\{\\s*text: \\x60([\\s\\S]*?)\\x60,`))[1]
      .replace(/\$tanuki/g, SCENARIO.words.join('、')).replace(/\$color/g, '赤色').replace(/\$\{a\('ask[1-4]'\)\}/g, '');
    const current = SCENARIO.messages[key][0].text.replace('この箱は調べつくしたようです。', '');
    assert.equal(current.replace(/\s/g, ''), original.replace(/\s/g, ''));
  }
});

test('音声を重ねず、一桁ずつ読み、古い終了イベントから次の台詞を流さない', async () => {
  const spoken = [];
  const statuses = [];
  let cancelled = 0;
  const synth = { cancel() { cancelled++; }, speak(u) { spoken.push(u); }, getVoices: () => [{ lang: 'ja-JP', localService: true }] };
  const player = new SpeechPlayer(synth, text => ({ text }), status => statuses.push(status));
  player.play([{ speaker: 'narrator', text: '3138。次の台詞。' }]);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(spoken[0].text, '3、1、3、8。');
  const old = spoken[0];
  player.play([{ speaker: 'santa', text: '新しい台詞。' }]);
  old.onend();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].text, '新しい台詞。');
  player.setMuted(true);
  spoken[1].onend();
  player.play([{ speaker: 'narrator', text: '流れてはいけない。' }]);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(spoken.length, 2);
  assert.ok(cancelled >= 4);
  assert.match(statuses.at(-1), /音声オフ/);
  player.stop();
});

test('音声未対応・再生エラー時は文字の案内へ切り替える', async () => {
  let status;
  const unavailable = new SpeechPlayer(null, null, text => { status = text; });
  unavailable.play(SCENARIO.messages.intro);
  assert.match(status, /台詞を読んで/);
  const broken = new SpeechPlayer({ cancel() {}, speak() { throw new Error('audio unavailable'); } }, text => ({ text }), text => { status = text; });
  broken.play(SCENARIO.messages.intro);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.match(status, /台詞を読んで/);
});

test('事前生成音声の再生・停止・ミュートを扱い、古い再生終了を無視する', () => {
  const files = [];
  const statuses = [];
  const player = new SpeechPlayer(null, null, text => statuses.push(text), {
    clips: { intro: './assets/audio/intro.wav' },
    makeAudio(src) {
      const audio = { src, currentTime: 5, play() { this.played = true; return Promise.resolve(); }, pause() { this.paused = true; } };
      files.push(audio); return audio;
    },
  });
  player.play(SCENARIO.messages.intro, 'intro');
  const staleEnd = files[0].onended;
  player.play(SCENARIO.messages.intro, 'intro');
  assert.equal(files[0].paused, true);
  assert.equal(files[0].currentTime, 0);
  assert.equal(files[1].played, true);
  staleEnd();
  assert.equal(statuses.at(-1), '読み上げ中');
  player.setMuted(true);
  assert.equal(files[1].paused, true);
  player.play(SCENARIO.messages.intro, 'intro');
  assert.equal(files.length, 2);
});

test('音声ファイルの読み込み・再生失敗は同じ原作台詞の読み上げへ戻る', async () => {
  const spoken = [];
  const synth = { cancel() {}, speak(u) { spoken.push(u); } };
  const player = new SpeechPlayer(synth, text => ({text}), () => {}, {
    clips: { red1: './assets/audio/missing.wav' },
    makeAudio() { return { pause() {}, play() { return Promise.reject(new Error('missing')); } }; },
  });
  player.play(SCENARIO.messages.red1, 'red1');
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, 'あなたは赤色の箱を調べました。');
  player.stop();
});

test('登録したGemini音声が実在し、生成元台詞と現行シナリオが一致する', async () => {
  for(const [key,src] of Object.entries(AUDIO_CLIPS)) {
    const name=src.split('/').at(-1).replace('.m4a','.wav');
    const bytes=await readFile(new URL(`../assets/audio/${name}`,import.meta.url));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WAVE');
    assert.equal(bytes.readUInt32LE(4),bytes.length-8);
    const meta=JSON.parse(await readFile(new URL(`../reference/audio-generation/${name.replace('.wav','.json')}`,import.meta.url),'utf8'));
    const [message,submittedDigits]=key.split('-');
    assert.deepEqual(meta.segments,getMessage({message,submittedDigits:submittedDigits||''}));
  }
});
