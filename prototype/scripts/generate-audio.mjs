// 制作時専用。サーバーは scripts/ を配信しない。既存ファイルは再生成しない。
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SCENARIO } from '../scenario.js';
import { productionScenes } from '../full-scenario.js';

const MODEL = 'gemini-3.8-flash-tts';
const output = new URL('../assets/audio/', import.meta.url);
const provenance = new URL('../reference/audio-generation/', import.meta.url);
const mode = process.argv[2] || '--plan';
const styles = {
  santa: '日本語。心優しい年配のサンタクロース。柔らかく落ち着いた低めの声で、親しみと少しの困りごとを自然に表す。大げさな物まね、怖い声、うなり声にしない。普段の会話より少しゆっくり、聞き取りやすく。台詞の語句は一切変えず、追加の挨拶や説明をしない。',
  narrator: '日本語。温かく明瞭な案内の声。絵本を一緒に読んでいるように、穏やかで自然な抑揚。謎の言葉は一語ずつはっきり、解釈や答えを付け足さない。大げさな演技は避ける。台詞の語句を一切変えず、そのまま読む。',
  witch: '日本語。少しおちゃめで寂しがりの、親しみやすい魔法使い。明るく自然な話し声。怖い声や叫び声にしない。台詞の語句を一切変えず、謎の答えを付け足さない。シカの十回の反復は省略せず正確に読む。',
};
const jobs = [
  { id: 'santa-sample', segments: [{speaker:'santa', text:SCENARIO.messages.intro[1].text.split('\n')[0]}] },
  ...['intro','help','red1','red2','red3','red4','success','wrong'].map(message => ({
    id: message === 'success' ? `success-${SCENARIO.answer}` : message === 'wrong' ? 'wrong-0000' : message,
    segments: SCENARIO.messages[message].map(segment => ({...segment,text:segment.text.replaceAll('$numbers',message === 'wrong' ? '0000' : SCENARIO.answer)})),
  })),
];
const fullJobs = Object.entries(productionScenes()).filter(([key])=>!['intro','help','red1','red2','red3','red4'].includes(key)).map(([key,segments])=>({id:`ja-${key}`,segments:segments.map(s=>({...s,text:s.spoken||s.text}))}));
const selected = mode === '--sample' ? jobs.slice(0,1) : mode === '--all' ? jobs.slice(1) : mode === '--full' ? fullJobs : [];
if (mode === '--plan') {
  console.log(JSON.stringify({model:MODEL,jobs:[...jobs,...fullJobs].map(job=>({id:job.id,characters:job.segments.map(s=>s.text).join('').length})),notes:'生成は --sample / --all / --full の明示的な実行のみ。契約・課金設定は変更しない。'}));
  process.exit(0);
}
if (!selected.length) throw new Error('Use --plan, --sample, --all or --full');
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
await mkdir(output,{recursive:true});
await mkdir(provenance,{recursive:true});
for (const job of selected) {
  const file = new URL(`${job.id}.wav`,output);
  try { await stat(file); console.log(JSON.stringify({id:job.id,cached:true})); continue; } catch {}
  // 語り手と魔法使いは同じ声を、台詞ごとの演技指定で使い分ける。API上は二話者。
  const audioSpeaker = speaker => speaker === 'witch' ? 'narrator' : speaker;
  const multiple = new Set(job.segments.map(s=>audioSpeaker(s.speaker))).size > 1;
  const config = multiple ? { speakers:[{speaker:'santa',voice:'Algieba'},{speaker:'narrator',voice:'Sulafat'}] } : [{voice:job.segments[0].speaker === 'santa' ? 'Algieba' : 'Sulafat'}];
  const content = job.segments.map(segment => ({
    type:'text',
    text:segment.text.replace(/\d{4}/g,digits=>digits.split('').join('、')),
    annotations:[{type:'speech_metadata',...(multiple?{speaker:audioSpeaker(segment.speaker)}:{}),style:styles[segment.speaker]}],
  }));
  const body = {model:MODEL,store:false,input:[{type:'user_input',content}],response_format:{type:'audio'},generation_config:{speech_config:config,max_output_tokens:4096}};
  const started = Date.now();
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000),
  });
  const result = await response.json();
  if (!response.ok) {
    // 認証キーやリクエスト全文をログへ出さない。自動で課金枠へ切り替えない。
    console.log(JSON.stringify({id:job.id,status:response.status,error:result.error?{code:result.error.code,status:result.error.status,message:result.error.message}:result.message}));
    process.exitCode=1; break;
  }
  const blocks = (result.steps || []).flatMap(step=>step.content||[]).filter(block=>block.type==='audio'&&block.data);
  const encoded = result.output_audio?.data || blocks.at(-1)?.data;
  if (!encoded) throw new Error(`No audio returned for ${job.id}; fields: ${Object.keys(result).join(',')}`);
  const bytes = Buffer.from(encoded,'base64');
  if (bytes.subarray(0,4).toString() !== 'RIFF' || bytes.subarray(8,12).toString() !== 'WAVE') throw new Error('Expected a WAV file');
  await writeFile(file,bytes);
  const metadata = {id:job.id,model:MODEL,created:new Date().toISOString(),voices:{santa:'Algieba',narrator:'Sulafat'},segments:job.segments,spokenInput:content,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),usage:result.usage||result.usage_metadata||result.usageMetadata||null,durationMs:Date.now()-started};
  await writeFile(new URL(`${job.id}.json`,provenance),JSON.stringify(metadata,null,2)+'\n');
  console.log(JSON.stringify({id:job.id,bytes:bytes.length,elapsedMs:metadata.durationMs,usage:metadata.usage}));
}
