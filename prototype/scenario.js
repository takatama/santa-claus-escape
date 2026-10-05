// 日本語の台詞は reference/legacy-index.js と照合。操作案内の差分は SOURCE-NOTES.md。
export const SCENARIO = Object.freeze({
  version: 1,
  id: 'original-red-3138',
  words: ['サンタ', 'イタチ', 'サンタ', 'ハタチ'], // 原作 tanukiQuestion() の第1候補
  answer: '3138', // 原作 TANUKI / makeAnswer()
  messages: {
    intro: [
      { speaker: 'narrator', text: 'あれれ？私の中から声が聞こえます。' },
      { speaker: 'santa', text: 'おー、そこの君！わしをここから出してくれんかの！\nわしはサンタ、サンタクロースじゃ。まほう使いにいたずらされて、この端末に閉じ込められてしまったのじゃ。\nいやー、こまった、こまった。このままでは、プレゼントのじゅんびが間に合わん。君の助けが必要なんじゃ' },
      { speaker: 'narrator', text: 'サンタさんを助けるために、脱出ゲームをはじめますか？' },
    ],
    help: [
      { speaker: 'santa', text: 'そうか、そうか。本当にありがとう！\nまほう使いは三つの箱をのこしていきおった。一つの箱に、それぞれ二つのひらがなが入っているそうじゃ。\nすべてのひらがなをならびかえて、この端末によびかけてくれれば、わしはここから出ることができる。\nでは早速、三つの箱を調べてくれるかの' },
      { speaker: 'narrator', text: '赤、青、黄色の箱があります。' },
    ],
    red1: [{ speaker: 'narrator', text: 'あなたは赤色の箱を調べました。\n箱にはカギがかかっています。ダイヤル式のカギです。開けるためには四つの数字が必要です。何か書いてあるようです。' }],
    red2: [{ speaker: 'narrator', text: 'あなたは赤色の箱を調べました。\n箱には「サンタ、イタチ、サンタ、ハタチ」と書いてあります。絵もかいてあるようです。' }],
    red3: [{ speaker: 'narrator', text: 'あなたは赤色の箱を調べました。\n箱には「サンタ、イタチ、サンタ、ハタチ」と書いてあり、その横にたぬきの絵がかいてあります。絵の下にも何か書いてあるようです。' }],
    red4: [{ speaker: 'narrator', text: 'あなたは赤色の箱を調べました。\n箱には「サンタ、イタチ、サンタ、ハタチ」と書いてあり、その横にたぬきの絵がかいてあります。\n絵の下に「たぬき」と書いてあるのですが、最初の「た」の文字のところにバツが書いてあります。\nこの箱は調べつくしたようです。' }],
    wrong: [{ speaker: 'narrator', text: 'カチカチ、カチカチ...。あなたは赤色の箱の数字を$numbersに合わせました。\n...あれれ？箱は開きませんでした。' }],
    success: [{ speaker: 'narrator', text: 'カチカチ、カチカチ...。あなたは赤色の箱の数字を$numbersに合わせました。\n...カチャ！赤色の箱が開きました！\n中には「す」と「だ」と書かれた紙が入っています。スイカの「す」と、大根の「だ」です。' }],
  },
});

export function getMessage(state) {
  return (SCENARIO.messages[state.message] || SCENARIO.messages.intro).map(segment => ({
    ...segment, text: segment.text.replaceAll('$numbers', state.submittedDigits || ''),
  }));
}
