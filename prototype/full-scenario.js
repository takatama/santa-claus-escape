// 原作日本語版の固定出題。根拠と操作案内の差分は FULL-GAME-NOTES.md。
import { SCENARIO } from './scenario.js';
export const COLORS = ['red', 'blue', 'yellow'];
export const BOXES = Object.freeze({
  red: { name: '赤色', answer: '3138', letters: ['す', 'だ'], words: SCENARIO.words },
  blue: { name: '青色', answer: '8848', letters: ['い', 'よ'] },
  yellow: { name: '黄色', answer: '2502', letters: ['き', 'だ'], hands: ['グー', 'チョキ', 'パー', 'グー'] },
});
const narrator = text => ({ speaker: 'narrator', text });
const witch = text => ({ speaker: 'witch', text });
const santa = text => ({ speaker: 'santa', text });
const messages = {
  intro: SCENARIO.messages.intro,
  help: SCENARIO.messages.help,
  ...Object.fromEntries([1, 2, 3, 4].map(n => [`red${n}`, SCENARIO.messages[`red${n}`]])),
  blue1: [narrator('あなたは青色の箱を調べました。\n箱にはカギがかかっています。ダイヤル式のカギです。開けるためには四つの数字が必要です。絵がかいてあるようです。')],
  blue2: [narrator('あなたは青色の箱を調べました。箱には山の絵がかいてあります。絵の横にも何か書いてあります。')],
  blue3: [narrator('あなたは青色の箱を調べました。箱には山の絵がかいてあり、その横に「サガルマータ」と書いてあります。まだ何か書いてあるようです。')],
  blue4: [narrator('あなたは青色の箱を調べました。箱には山の絵がかいてあり、その横に「サガルマータ」と書いてあります。\nよく見ると、さらにこう書いてあります。「その高さは、この端末が知っている」。\n箱は調べつくしたようです。数字を合わせますか？別の箱を調べますか？サガルマータについて調べますか？')],
  yellow1: [narrator('あなたは黄色の箱を調べました。\n箱にはカギがかかっています。ダイヤル式のカギです。開けるためには四つの数字が必要です。絵がかいてあるようです。')],
  yellow2: [narrator('あなたは黄色の箱を調べました。\n箱にはじゃんけんのグー、チョキ、パーが全部で4つかいてあります。かいてあるのは「グー、チョキ、パー、グー」です。絵の横に何か書いてあります。')],
  yellow3: [narrator('あなたは黄色の箱を調べました。\n箱には「グー、チョキ、パー、グー」がかいてあります。その横に「負けるが勝ち」と書いてあります。まだ何か書いてあるようです。')],
  yellow4: [narrator('あなたは黄色の箱を調べました。\n箱には「グー、チョキ、パー、グー」がかいてあります。その横に「負けるが勝ち」と書いてあります。\nよく見ると「指の数があなたをみちびく」と書いてあります。\nこの箱は調べつくしたようです。')],
  information: [narrator('サガルマータは、ネパール語で、エベレストのことです。\nエベレストは、世界で一番高い山です。エベレストの高さは、8848メートルです。')],
  letters: [narrator('すべての箱が開きました。\nそれぞれの箱に、「す」「だ」「い」「よ」「き」「だ」が入っていました。\nスイカの「す」、大根の「だ」、イルカの「い」、ヨーグルトの「よ」、キリンの「き」、大根の「だ」です。\n六つのひらがなを並べなおして、ひみつの言葉を作ってください。')],
  invite: [witch('はーい！よばれて、とびでて、ジャジャジャジャーン！あなたが大好きな、まほう使いが来ましたよー！あれれ？あなた、だれ？'), narrator('まほう使いがあらわれました。'), witch('サンタじゃなくて、あなたが私をよんだのね。ふーん。まあ、いいわ。私とあそんでよ。あそんでくれたら、サンタを自由にしてあげる'), narrator('まほう使いと遊びますか？')],
  paused: [witch('あら、ざんねん。せっかくあそぶ相手が見つかったと思ったのに。じゃ、サンタはこのままね。あそびたくなったら、ひみつの言葉で私をよんでね'), santa('まったく、まほう使いのやつめ。きみがたすけにきてくれるのを心待ちにしておるぞ'), narrator('私の中にサンタさんがいるのは変な感じです。サンタの脱出でした。また会いに来てくださいね。')],
  reinvite: [narrator('箱は消えてしまいました。まほう使いと遊びますか？')],
  rescue: [witch('うふふ。ああ楽しかった！'), { ...narrator('シャララララーン。端末の中からサンタがあらわれました。'), spoken: '端末の中からサンタがあらわれました。' }, santa('どうもありがとう！君のおかげで、やっと外に出られたよ。まほう使いめ。かまってやらなかったからって、とじこめることはないじゃろう'), witch('だって、だって、さびしかったんだもの。けど、今日はきみと遊べて、とっても楽しかったよ！どうもありがとう！'), santa('さてさて、早速、プレゼントのじゅんびにとりかからねば。きみのおかげで、みんなをよろばせてやれるわい。クリスマスの夜を楽しみにしていてくれ'), narrator('これで脱出ゲームは終わりです。あそんでくれてありがとうございました。')],
};
export const QUESTIONS = Object.freeze([
  { id: 'christmas-creatures', kind: 'text', title: 'ことばに隠れた、生き物。', question: 'さいしょは、なぞなぞだよ。「クリスマス」の中には、三つの生き物がかくれているよ。10秒間、考えてみてね。「クリスマス」の中にいる、三つの生き物だよ。では問題。隠れているのは「リス」と「マス」と、もう一つは何？', aliases: ['クマ', 'くま', '熊'], response: '「クリスマス」の中にいるのは、「リス」と「マス」と「クマ」だよね！' },
  { id: 'red-ornament', kind: 'choice', title: '赤い玉は、何だろう。', question: '次は、クイズだよ。クリスマスツリーに飾ってある、赤い玉は何？次の三つから選んでね。トナカイの鼻。太陽。りんご', choices: ['トナカイの鼻', '太陽', 'りんご'], aliases: ['りんご', 'リンゴ', '林檎', 'アップル', 'apple'], response: '正解は、りんご、だよね！りんごは、寒い冬でもおいしく長持ちするので、昔から大切にされてきたんだって' },
  { id: 'deer-ten-times', kind: 'text', title: 'さいごの、ひっかけクイズ。', question: 'さいごは、ひっかけクイズだよ。わたしといっしょに、シカ、シカ、と10回いってね。はじめるよ。せーの、シカ、シカ...。では問題。サンタが乗ってくるのは？', spoken: 'さいごは、ひっかけクイズだよ。わたしといっしょに、シカ、シカ、と10回いってね。はじめるよ。せーの、シカ、シカ、シカ、シカ、シカ、シカ、シカ、シカ、シカ、シカ。では問題。サンタが乗ってくるのは？', aliases: ['そり', 'ソリ', '橇'], response: '正解は、トナカイ、じゃなくて、ソリだよね' },
]);
export function papers(state) {
  return COLORS.filter(c => state.boxes[c].opened).flatMap(c => BOXES[c].letters.map((text, index) => ({ id: `${c}-${index}`, text, color: c })));
}
export function sceneFor(state) {
  const color = state.selectedBox, box = BOXES[color], saved = state.boxes[color];
  let key, title, chapter, segments, effect;
  switch (state.phase) {
    case 'welcome': case 'intro': key = 'intro'; title = '君の助けが、必要なんじゃ。'; chapter = 'サンタの声'; break;
    case 'boxes': key = 'help'; title = '三つの箱と、ひみつの言葉。'; chapter = '三つの箱'; break;
    case 'box':
      key = state.boxMessage === 'information' ? 'information' : state.boxMessage === 'wrong' ? `${color}-wrong-${saved.lastSubmitted}` : `${color}${saved.exam}`;
      title = '四つの数字で、カギを開ける。'; chapter = `${box.name}の箱`;
      if (state.boxMessage === 'wrong') {
        const text = `カチカチ、カチカチ...。あなたは${box.name}の箱の数字を${saved.lastSubmitted}に合わせました。\n...あれれ？箱は開きませんでした。`;
        segments = [{ ...narrator(text), spoken: text.replace('カチカチ、カチカチ...。', '') }]; effect = 'wrong';
        if (color === 'yellow' && saved.exam === 4) segments[0].text += '\n負けるが勝ちなので、グーに勝つのはチョキのようです。';
      }
      break;
    case 'boxResponse':
      key = `${color}-open`; title = '箱の中に、ふたつのひらがな。'; chapter = `${box.name}の箱が開いた`; effect = 'unlock';
      { const meanings = { red: 'スイカの「す」と、大根の「だ」です。', blue: 'イルカの「い」と、ヨーグルトの「よ」です。', yellow: 'キリンの「き」と、大根の「だ」です。' };
        const text = `カチカチ、カチカチ...。あなたは${box.name}の箱の数字を${saved.lastSubmitted}に合わせました。\n...カチャ！${box.name}の箱が開きました！\n中には「${box.letters[0]}」と「${box.letters[1]}」と書かれた紙が入っています。${meanings[color]}`;
        segments = [{ ...narrator(text), spoken: text.replace('カチカチ、カチカチ...。', '').replace('...カチャ！', '') }]; }
      break;
    case 'spell': key = 'letters'; title = '六つの文字を、並べなおして。'; chapter = 'ひみつの言葉'; break;
    case 'witchInvite': key = state.reinvited ? 'reinvite' : 'invite'; title = 'まほう使いが、あらわれた。'; chapter = 'まほう使い'; effect = state.reinvited ? undefined : 'magic'; break;
    case 'witchPaused': key = 'paused'; title = 'また、会いに来てね。'; chapter = 'しおりをはさんで'; break;
    case 'witchQuestion': {
      const q = QUESTIONS[state.questionIndex]; key = `question-${q.id}`; title = q.title; chapter = `${state.questionIndex + 1} / 3 の遊び`;
      segments = [{ ...witch(q.question), spoken: q.spoken || q.question }]; break;
    }
    case 'witchResponse': {
      const q = QUESTIONS[state.questionIndex], r = state.responses[state.questionIndex];
      key = `response-${q.id}-${r.correct ? 'right' : 'wrong'}`; title = 'まほう使いの、答え。'; chapter = `${state.questionIndex + 1} / 3 の遊び`;
      segments = [witch(`${r.correct ? 'その通り！' : ''}${q.response}`)]; break;
    }
    case 'rescue': case 'complete': key = 'rescue'; title = 'クリスマスの夜を、楽しみに。'; chapter = 'サンタの脱出'; effect = 'rescue'; break;
  }
  return { key, title, chapter, segments: segments || messages[key], bgm: state.phase.startsWith('witch') ? 'witch' : 'normal', effect };
}
export function spokenSegments(scene) { return scene.segments.map(segment => ({ ...segment, text: segment.spoken || segment.text })); }
export function productionScenes() {
  const scenes = Object.fromEntries(Object.entries(messages).map(([key, segments]) => [key, segments]));
  for (const color of COLORS) {
    const boxes = Object.fromEntries(COLORS.map(c => [c, { exam: 4, lastSubmitted: BOXES[c].answer }]));
    scenes[`${color}-open`] = sceneFor({ phase: 'boxResponse', selectedBox: color, boxes }).segments;
    boxes[color].lastSubmitted = '0000';
    scenes[`${color}-wrong-0000`] = sceneFor({ phase: 'box', selectedBox: color, boxes, boxMessage: 'wrong' }).segments;
  }
  QUESTIONS.forEach(q => {
    scenes[`question-${q.id}`] = [{ ...witch(q.question), spoken: q.spoken || q.question }];
    scenes[`response-${q.id}-right`] = [witch(`その通り！${q.response}`)];
    scenes[`response-${q.id}-wrong`] = [witch(q.response)];
  });
  return scenes;
}
