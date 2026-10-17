// Exact copies of the maintained Japanese scenario. The original prototype is
// an authoring reference, never a runtime dependency of this introduction.
const frozenSegments = segments => Object.freeze(segments.map(segment => Object.freeze(segment)));
const messages = Object.freeze({
  intro: frozenSegments([
    { speaker: 'narrator', text: 'あれれ？私の中から声が聞こえます。' },
    { speaker: 'santa', text: 'おー、そこの君！わしをここから出してくれんかの！\nわしはサンタ、サンタクロースじゃ。まほう使いにいたずらされて、この端末に閉じ込められてしまったのじゃ。\nいやー、こまった、こまった。このままでは、プレゼントのじゅんびが間に合わん。君の助けが必要なんじゃ' },
    { speaker: 'narrator', text: 'サンタさんを助けるために、脱出ゲームをはじめますか？' },
  ]),
  help: frozenSegments([
    { speaker: 'santa', text: 'そうか、そうか。本当にありがとう！\nまほう使いは三つの箱をのこしていきおった。一つの箱に、それぞれ二つのひらがなが入っているそうじゃ。\nすべてのひらがなをならびかえて、この端末によびかけてくれれば、わしはここから出ることができる。\nでは早速、三つの箱を調べてくれるかの' },
    { speaker: 'narrator', text: '赤、青、黄色の箱があります。' },
  ]),
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function newIntroduction() {
  return { phase: 'intro', step: 0 };
}

export function restoreIntroduction(raw) {
  if (!isObject(raw) || !Number.isInteger(raw.step)) return null;
  if (raw.phase === 'intro') {
    if (raw.step < 0 || raw.step >= messages.intro.length) return null;
  } else if (raw.phase === 'help' || raw.phase === 'ready') {
    if (raw.step !== 0) return null;
  } else return null;
  return { phase: raw.phase, step: raw.step };
}

// Rejected actions retain the input reference so storage can avoid writing a
// duplicate choice or an action that belongs to a different page.
export function transitionIntroduction(state, event) {
  if (!restoreIntroduction(state)) return { state, reason: 'invalid-state' };
  if (!isObject(event) || typeof event.type !== 'string') return { state, reason: 'invalid-event' };
  if (event.type === 'NEXT') {
    if (state.phase !== 'intro' || state.step >= messages.intro.length - 1) return { state, reason: 'wrong-phase' };
    return { state: { phase: 'intro', step: state.step + 1 }, reason: 'continued' };
  }
  if (event.type === 'HELP') {
    if (state.phase !== 'intro' || state.step !== messages.intro.length - 1) return { state, reason: 'wrong-phase' };
    return { state: { phase: 'help', step: 0 }, reason: 'helped' };
  }
  if (event.type === 'EXPLORE') {
    if (state.phase !== 'help') return { state, reason: 'wrong-phase' };
    return { state: { phase: 'ready', step: 0 }, reason: 'explored' };
  }
  return { state, reason: 'invalid-event' };
}

export function introductionScene(state) {
  if (!restoreIntroduction(state) || state.phase === 'ready') return null;
  const intro = state.phase === 'intro';
  return {
    key: intro ? `intro-${state.step}` : 'help',
    title: intro ? '君の助けが、必要なんじゃ。' : '三つの箱と、ひみつの言葉。',
    chapter: intro ? 'サンタの声' : '三つの箱',
    segments: (intro ? [messages.intro[state.step]] : messages.help).map(segment => ({ ...segment })),
  };
}
