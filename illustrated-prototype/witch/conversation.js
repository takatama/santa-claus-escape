import { normalizeWord, WORD_ALIASES } from '../letters/word-math.js';

// Source copies of the maintained Japanese full-scenario. The prototype folder
// is an authoring reference, never a runtime dependency of this conversation.
const frozenSegments = segments => Object.freeze(segments.map(segment => Object.freeze(segment)));
const messages = Object.freeze({
  invite: frozenSegments([
    { speaker: 'witch', text: 'はーい！よばれて、とびでて、ジャジャジャジャーン！あなたが大好きな、まほう使いが来ましたよー！あれれ？あなた、だれ？' },
    { speaker: 'narrator', text: 'まほう使いがあらわれました。' },
    { speaker: 'witch', text: 'サンタじゃなくて、あなたが私をよんだのね。ふーん。まあ、いいわ。私とあそんでよ。あそんでくれたら、サンタを自由にしてあげる' },
    { speaker: 'narrator', text: 'まほう使いと遊びますか？' },
  ]),
  paused: frozenSegments([
    { speaker: 'witch', text: 'あら、ざんねん。せっかくあそぶ相手が見つかったと思ったのに。じゃ、サンタはこのままね。あそびたくなったら、ひみつの言葉で私をよんでね' },
    { speaker: 'santa', text: 'まったく、まほう使いのやつめ。きみがたすけにきてくれるのを心待ちにしておるぞ' },
    { speaker: 'narrator', text: '私の中にサンタさんがいるのは変な感じです。サンタの脱出でした。また会いに来てくださいね。' },
  ]),
  reinvite: frozenSegments([
    { speaker: 'narrator', text: '箱は消えてしまいました。まほう使いと遊びますか？' },
  ]),
  rescue: frozenSegments([
    { speaker: 'witch', text: 'うふふ。ああ楽しかった！' },
    { speaker: 'narrator', text: 'シャララララーン。端末の中からサンタがあらわれました。', spoken: '端末の中からサンタがあらわれました。' },
    { speaker: 'santa', text: 'どうもありがとう！君のおかげで、やっと外に出られたよ。まほう使いめ。かまってやらなかったからって、とじこめることはないじゃろう' },
    { speaker: 'witch', text: 'だって、だって、さびしかったんだもの。けど、今日はきみと遊べて、とっても楽しかったよ！どうもありがとう！' },
    { speaker: 'santa', text: 'さてさて、早速、プレゼントのじゅんびにとりかからねば。きみのおかげで、みんなをよろばせてやれるわい。クリスマスの夜を楽しみにしていてくれ' },
    { speaker: 'narrator', text: 'これで脱出ゲームは終わりです。あそんでくれてありがとうございました。' },
  ]),
});

export const QUESTIONS = Object.freeze([
  Object.freeze({ id: 'christmas-creatures', kind: 'text', title: 'ことばに隠れた、生き物。',
    question: 'さいしょは、なぞなぞだよ。「クリスマス」の中には、三つの生き物がかくれているよ。10秒間、考えてみてね。「クリスマス」の中にいる、三つの生き物だよ。では問題。隠れているのは「リス」と「マス」と、もう一つは何？',
    aliases: Object.freeze(['クマ', 'くま', '熊']), response: '「クリスマス」の中にいるのは、「リス」と「マス」と「クマ」だよね！' }),
  Object.freeze({ id: 'red-ornament', kind: 'choice', title: '赤い玉は、何だろう。',
    question: '次は、クイズだよ。クリスマスツリーに飾ってある、赤い玉は何？次の三つから選んでね。トナカイの鼻。太陽。りんご',
    choices: Object.freeze(['トナカイの鼻', '太陽', 'りんご']), aliases: Object.freeze(['りんご', 'リンゴ', '林檎', 'アップル', 'apple']),
    response: '正解は、りんご、だよね！りんごは、寒い冬でもおいしく長持ちするので、昔から大切にされてきたんだって' }),
  Object.freeze({ id: 'deer-ten-times', kind: 'text', title: 'さいごの、ひっかけクイズ。',
    question: 'さいごは、ひっかけクイズだよ。わたしといっしょに、シカ、シカ、と10回いってね。はじめるよ。せーの、シカ、シカ...。では問題。サンタが乗ってくるのは？',
    spoken: 'さいごは、ひっかけクイズだよ。わたしといっしょに、シカ、シカ、と10回いってね。はじめるよ。せーの、シカ、シカ、シカ、シカ、シカ、シカ、シカ、シカ、シカ、シカ。では問題。サンタが乗ってくるのは？',
    aliases: Object.freeze(['そり', 'ソリ', '橇']), response: '正解は、トナカイ、じゃなくて、ソリだよね' }),
]);

const phases = Object.freeze(['invite', 'paused', 'question', 'response', 'rescue']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const matches = (input, aliases) => aliases.some(alias => normalizeWord(input) === normalizeWord(alias));

export function newConversation() {
  return { phase: 'invite', questionIndex: 0, draft: '', responses: [], reinvited: false };
}

export function restoreConversation(raw) {
  if (!isObject(raw) || !phases.includes(raw.phase)
    || !Number.isInteger(raw.questionIndex) || raw.questionIndex < 0 || raw.questionIndex > 2
    || typeof raw.draft !== 'string' || raw.draft.length > 64
    || typeof raw.reinvited !== 'boolean' || !Array.isArray(raw.responses) || raw.responses.length > 3) return null;
  if (['invite', 'paused'].includes(raw.phase) && (raw.questionIndex !== 0 || raw.draft !== '')) return null;
  const expected = raw.phase === 'response' ? raw.questionIndex + 1
    : raw.phase === 'question' ? raw.questionIndex : raw.phase === 'rescue' ? 3 : 0;
  if (raw.responses.length !== expected || (raw.phase === 'rescue' && raw.questionIndex !== 2)) return null;
  const responses = [];
  for (const [index, response] of [...raw.responses].entries()) {
    const question = QUESTIONS[index];
    if (!isObject(response) || response.id !== question.id || typeof response.input !== 'string'
      || !normalizeWord(response.input) || response.input.length > 64 || typeof response.correct !== 'boolean'
      || (question.kind === 'choice' && !question.choices.includes(response.input))
      || response.correct !== matches(response.input, question.aliases)) return null;
    responses.push({ id: response.id, input: response.input, correct: response.correct });
  }
  return { phase: raw.phase, questionIndex: raw.questionIndex, draft: raw.draft, responses, reinvited: raw.reinvited };
}

// Refusal returns the original state reference, allowing the shared store to
// avoid writing old clicks, empty submissions, or a reply to a different question.
export function transitionConversation(state, event) {
  if (!restoreConversation(state)) return { state, reason: 'invalid-state' };
  if (!isObject(event) || typeof event.type !== 'string') return { state, reason: 'invalid-event' };
  const refuse = reason => ({ state, reason });
  const accepted = (next, reason) => ({ state: next, reason });
  if (event.type === 'PLAY' || event.type === 'DECLINE') {
    if (state.phase !== 'invite') return refuse('wrong-phase');
    return accepted({ ...state, phase: event.type === 'PLAY' ? 'question' : 'paused', draft: '' },
      event.type === 'PLAY' ? 'played' : 'declined');
  }
  if (event.type === 'RECALL') {
    if (state.phase !== 'paused') return refuse('wrong-phase');
    if (typeof event.value !== 'string') return refuse('invalid-input');
    if (!normalizeWord(event.value)) return refuse('empty');
    if (!matches(event.value, WORD_ALIASES)) return refuse('wrong-word');
    return accepted({ ...state, phase: 'invite', draft: '', reinvited: true }, 'recalled');
  }
  if (['SET_DRAFT', 'REPLY'].includes(event.type)) {
    if (state.phase !== 'question') return refuse('wrong-phase');
    const question = QUESTIONS[state.questionIndex];
    if (event.questionId !== question.id) return refuse('stale-question');
    const input = event.value === undefined && event.type === 'REPLY' ? state.draft : event.value;
    if (typeof input !== 'string') return refuse('invalid-input');
    if (event.type === 'SET_DRAFT') {
      const draft = input.slice(0, 64);
      return draft === state.draft ? refuse('unchanged') : accepted({ ...state, draft }, 'drafted');
    }
    if (!normalizeWord(input)) return refuse('empty');
    if (input.length > 64) return refuse('invalid-input');
    if (question.kind === 'choice' && !question.choices.includes(input)) return refuse('invalid-choice');
    const response = { id: question.id, input, correct: matches(input, question.aliases) };
    return accepted({ ...state, phase: 'response', responses: [...state.responses, response] }, 'replied');
  }
  if (event.type === 'CONTINUE') {
    if (state.phase !== 'response') return refuse('wrong-phase');
    if (event.questionId !== QUESTIONS[state.questionIndex].id) return refuse('stale-question');
    return accepted(state.questionIndex === 2 ? { ...state, phase: 'rescue' }
      : { ...state, phase: 'question', questionIndex: state.questionIndex + 1, draft: '' }, 'continued');
  }
  return refuse('invalid-event');
}

export function conversationScene(state) {
  if (!restoreConversation(state)) return null;
  let key, title, chapter, segments, effect;
  if (state.phase === 'invite') {
    key = state.reinvited ? 'reinvite' : 'invite';
    title = 'まほう使いが、あらわれた。'; chapter = 'まほう使い';
    if (!state.reinvited) effect = 'magic';
  } else if (state.phase === 'paused') {
    key = 'paused'; title = 'また、会いに来てね。'; chapter = 'しおりをはさんで';
  } else if (state.phase === 'question') {
    const question = QUESTIONS[state.questionIndex];
    key = `question-${question.id}`; title = question.title; chapter = `${state.questionIndex + 1} / 3 の遊び`;
    segments = [{ speaker: 'witch', text: question.question, spoken: question.spoken || question.question }];
  } else if (state.phase === 'response') {
    const question = QUESTIONS[state.questionIndex], response = state.responses[state.questionIndex];
    key = `response-${question.id}-${response.correct ? 'right' : 'wrong'}`;
    title = 'まほう使いの、答え。'; chapter = `${state.questionIndex + 1} / 3 の遊び`;
    segments = [{ speaker: 'witch', text: `${response.correct ? 'その通り！' : ''}${question.response}` }];
  } else {
    key = 'rescue'; title = 'クリスマスの夜を、楽しみに。'; chapter = 'サンタの脱出'; effect = 'rescue';
  }
  return { key, title, chapter, segments: (segments ?? messages[key]).map(segment => ({ ...segment })),
    bgm: state.phase === 'rescue' ? 'normal' : 'witch', effect };
}
