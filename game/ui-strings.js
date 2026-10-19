import { IS_EN } from './locale.js';
// Translate only authored UI text; interpolated answers and player input stay intact.
const entries = [
  ['雪の森。空のスノードームの外にサンタとまほう使い','Santa and the fairy stand beside the empty snow globe in the snowy forest'],
  ['雪の森。サンタはスノードームの中、右にまほう使い','Santa is in the snow globe, with the fairy to the right'],
  ['雪の森。光の開口からサンタが外へ移っています','Santa is stepping out through a glowing opening in the snow globe'],

  ['はい、箱を調べる','Yes, look at the boxes'],
  ['プライバシー・利用状況の計測','Privacy and analytics'],
  ['保存とアクセス解析について','Saved progress and privacy'],
  ['この環境ではアクセス解析を行いません。','Analytics are off for this release.'],
  ['作品の遊ばれ方をGoogle Analyticsで調べます。許可しなくても最後まで遊べます。お子さんは保護者と確認してください。','Google Analytics helps us understand how the game is played. You can play the whole game without allowing it. Children should check with a parent or guardian.'],
  ['計測を許可しています','Analytics allowed'],['計測を許可していません','Analytics not allowed'],
  ['計測はまだ始まっていません','Analytics have not started'],['計測を許可する','Allow analytics'],
  ['許可を取り消す','Withdraw permission'],['許可しない','Do not allow'],

  ['音声を再生できません。台詞を読んで遊べます','Audio could not play. You can read the story.'],
  ['読み上げに未対応です。台詞を読んで遊べます','Read-aloud is unavailable. You can read the story.'],
  ['音声オン・聞き直しで再生','Sound is on. Press Listen again.'],
  ['読み上げが終わりました','Finished reading'],['読み上げ中','Reading aloud'],
  ['音声を停止しました','Sound stopped'],['考える時間','Time to think'],
  ['光を右へ引いて、サンタを助ける','Pull the light to the right to help Santa'],
  ['読み返すページ','Storybook pages'],['音声の操作','Audio controls'],

  ['。原作のループ版を使用し、音量・ループ・フェードを調整。OGG非対応用に同じ原作音をAACへ形式変換。効果音: 回復魔法2・間抜け3・きらきら輝く1/3 — ', '. Original loops, with volume and fades adjusted; AAC versions provided for browsers without OGG support. Effects: Magic Cure 2, Stupid 3, Shine 1/3 — '],
  ['（MIT対象外）。ダイヤル: Zott820 / ', ' (separate license). Dial: Zott820 / '],
  [' / CC0。解錠: ', ' / CC0. Unlock: '],
  ['（MIT対象外）。声はGemini TTSで事前収録。数字の誤答も同じ声で読み、再生できない場合だけ端末の読み上げに切り替えます。', ' (separate license). Voices recorded with Gemini TTS. If a recording cannot play, your device reads the same text aloud.'],
  ['ふたをあける','Open the lid'],['ふたをとじる','Close the lid'],
  ['サンタをスノードームから引き出す','Pull Santa out of the snow globe'],

  [
    "Tabで紙を選び、EnterかSpaceでつかみます。枠へTabで移り、EnterかSpaceで置きます。並べた紙は左右キーで移動・交換、Deleteで手元へ。Escapeで選択やドラッグを中断します。",
    "Tab to a letter and press Enter or Space to pick it up. Tab to a slot and press Enter or Space to place it. Use the arrow keys to swap letters, Delete to return a letter, and Escape to cancel."
  ],
  [
    "雪の森。空のスノードームの外で、サンタとまほう使いが笑顔で手を振っています。",
    "Santa and the fairy wave in the snowy forest, beside an empty snow globe."
  ],
  [
    "紙を選んで枠を押しても置けます。戻すときは紙を選び、手元の空きを押します。",
    "You can also tap a letter, then tap a slot. To return it, tap the letter and an empty space in the tray."
  ],
  [
    "上下のキーで列を回す。数字キーで直接入力する。左右のキーで桁を移る。",
    "Use Up and Down to turn a wheel, or type a digit. Use Left and Right to move between wheels."
  ],
  [
    "ひみつの言葉は、まだ合っていないようです。見つけた文字を見直せます。",
    "That isn't the secret word yet. Take another look at your letters."
  ],
  [
    "箱の絵を読み込めませんでした。お話の文字とダイヤルで続けられます。",
    "The picture could not load. You can still use the clues and number wheels."
  ],
  [
    "最後の絵を読み込めませんでした。お話と読み返しは続けられます。",
    "The last picture could not load. You can still read the story."
  ],
  [
    "の絵を読み込めませんでした。手がかりとダイヤルで続けられます。",
    " picture could not load. You can still use the clues and number wheels."
  ],
  [
    "絵を読み込めませんでした。枝のつまみとお話で続けられます。",
    "The picture could not load. You can still use the arrows and read the story."
  ],
  [
    "ひみつのことばを伝えました。まほう使いがあらわれました。",
    "You said the secret word. The fairy is here!"
  ],
  [
    "答えを入力してください。「わからない」でも伝えられます。",
    "Type your answer. You can say “I don't know” too."
  ],
  [
    "紙を枠へドラッグ。手元の紙はダブルクリックでも置けます。",
    "Drag letters into the slots, or double-click a letter to place it."
  ],
  [
    "雪の入った、まるいガラスの中に、サンタが閉じ込められた。",
    "Santa is trapped inside a snow globe."
  ],
  [
    "箱を全部開けていなくても、分かった言葉を伝えてみよう。",
    "You can try the word even before you open all the boxes."
  ],
  [
    "絵を読み込めませんでした。お話とボタンで続けられます。",
    "The picture could not load. You can still use the story and buttons."
  ],
  [
    "URLをコピーしました。友だちに送ってみてください。",
    "Link copied. Send it to a friend!"
  ],
  [
    "まだ空いている枠があります。六枚の紙を置いてみよう。",
    "Some slots are still empty. Place all seven letters."
  ],
  [
    "絵を読み込めませんでした。矢印とお話で続けられます。",
    "The picture could not load. You can still use the arrows and read the story."
  ],
  [
    "雪の森。サンタはスノードームの中、枝の奥にまほう使い",
    "A snowy forest. Santa is in a snow globe, with a fairy behind the branches"
  ],
  [
    "まだ合っていないようです。紙を動かして見直せます。",
    "Not quite! Try moving the letters around."
  ],
  [
    "スノードームのサンタを、箱の謎で助ける絵本ゲーム。",
    "Solve three boxes and help Santa escape from a snow globe. A storybook game."
  ],
  [
    "絵を読み込めませんでした。紙とお話で続けられます。",
    "The picture could not load. You can still arrange the letters and read the story."
  ],
  [
    "前の体験版の赤い箱の進行を引き継ぎました。",
    "Your red box progress has been restored."
  ],
  [
    "雪の森。スノードームに閉じ込められたサンタ",
    "Santa is trapped in a snow globe in a snowy forest"
  ],
  [
    "左右に移すと、となりの紙と交換できます。",
    "Use Left or Right to swap it with the next letter."
  ],
  [
    "このことばで、まほう使いを呼びました。",
    "You called the fairy with this word."
  ],
  [
    "雪の森、サンタのスノードームと三つの箱",
    "A snowy forest, Santa's snow globe, and three boxes"
  ],
  [
    "0〜9の数字を四つ入力してください。",
    "Enter four digits from 0 to 9."
  ],
  [
    "わしをここから出してくれんかの！」",
    "Can you help me get out?”"
  ],
  [
    "ここを押して、手がかりを見つけよう",
    "Tap here to find a clue"
  ],
  [
    "下のURLを選んでコピーできます。",
    "Select and copy the link below."
  ],
  [
    "ひみつの言葉を入力してください。",
    "Type the secret word."
  ],
  [
    "まだ開かない。もう一度ためそう。",
    "Still locked. Try again!"
  ],
  [
    "サガルマータを検索する（別タブ）",
    "Search for Sagarmatha (opens a new tab)"
  ],
  [
    "保存できません・このまま遊べます",
    "Unable to save. You can still play."
  ],
  [
    "先に、動かす紙を選んでください。",
    "First, choose a letter to move."
  ],
  [
    "箱の謎を解いて、助けてあげよう。",
    "Solve the boxes and help him escape!"
  ],
  [
    "森の中の球に閉じ込められたサンタ",
    "Santa is trapped in a snow globe in the forest"
  ],
  [
    "四つの数字を入力してください。",
    "Enter four digits."
  ],
  [
    "ひみつの言葉が、もう分かったら",
    "Already know the secret word?"
  ],
  [
    "サンタは、スノードームの外へ。",
    "Santa is out of the snow globe!"
  ],
  [
    "現在の台詞、スクロールして読む",
    "Current story text. Scroll to read."
  ],
  [
    "しおりは、この端末に自動保存",
    "Your place is saved on this device"
  ],
  [
    "まほう使いを、もう一度呼ぶ",
    "Call the fairy again"
  ],
  [
    "動かす紙を選んでください。",
    "Choose a letter to move."
  ],
  [
    "紙は元の場所に戻りました。",
    "The letter went back to its place."
  ],
  [
    "タップ・キーでの動かし方",
    "How to use taps or keys"
  ],
  [
    "再開ボタンで読み上げます",
    "Press Continue to listen"
  ],
  [
    "桁目の数字の列を上へ回す",
    ": turn wheel up"
  ],
  [
    "桁目の数字の列を下へ回す",
    ": turn wheel down"
  ],
  [
    "置く枠を押してください。",
    "Tap a slot to place it."
  ],
  [
    "開始ボタンで読み上げます",
    "Press Help Santa to listen"
  ],
  [
    "音声オフ・文字で遊べます",
    "Sound is off. You can read the story."
  ],
  [
    "まほう使いとのお話と回答",
    "Talk and play with the fairy"
  ],
  [
    "さぁ、サンタを助けよう",
    "Let's help Santa!"
  ],
  [
    "二枚の紙が見つかった。",
    "You found the letters!"
  ],
  [
    "共有画面を開きました。",
    "Sharing is open."
  ],
  [
    "手がかりが、そろった。",
    "You found all the clues."
  ],
  [
    "文字だけでも遊べます。",
    "You can also play by reading."
  ],
  [
    "絵を読み込んでいます。",
    "Loading the picture…"
  ],
  [
    "続きの書き込みを調べる",
    "Read the next clue"
  ],
  [
    "ひみつの言葉を考える",
    "Find the secret word"
  ],
  [
    "を手元に戻しました。",
    " returned to the tray."
  ],
  [
    "聞き直しでお話を再生",
    "Press Listen again to hear the story"
  ],
  [
    "雪の下に、何かある。",
    "Something is hidden under the snow."
  ],
  [
    "音の設定・クレジット",
    "Sound and credits"
  ],
  [
    "音声オフで始めます。",
    "Sound is off. "
  ],
  [
    "サンタを右へ引き出す",
    "Pull Santa to the right"
  ],
  [
    "「おー、そこの君！",
    "“Hello there!"
  ],
  [
    "この端末に自動保存",
    "Saved on this device"
  ],
  [
    "この絵本を読み返す",
    "Read your story again"
  ],
  [
    "番目に置きました。",
    ": letter placed."
  ],
  [
    "雪の下を調べよう。",
    "Look under the snow."
  ],
  [
    "左から読む六つの枠",
    "Seven slots, read from left to right"
  ],
  [
    "この並びで伝える",
    "Try this word"
  ],
  [
    "ほかの箱を調べる",
    "Look at another box"
  ],
  [
    "まほう使いと遊ぶ",
    "Play with the fairy"
  ],
  [
    "まほう使いに会う",
    "Meet the fairy"
  ],
  [
    "を選んでいます。",
    " selected. "
  ],
  [
    "コピーするURL",
    "Link to copy"
  ],
  [
    "タップして調べる",
    "Tap to explore"
  ],
  [
    "四桁のダイアル錠",
    "Four-digit combination lock"
  ],
  [
    "最初からやり直す",
    "Start a new game"
  ],
  [
    "最初から謎を解く",
    "Play again"
  ],
  [
    "読み返しを終える",
    "Close the storybook"
  ],
  [
    "開いた箱を見直す",
    "Look inside again"
  ],
  [
    "雪を払っています",
    "Brushing away the snow…"
  ],
  [
    "音声が流れます。",
    "Sound is on. "
  ],
  [
    "六枚の紙を並べる",
    "Arrange seven letters"
  ],
  [
    "見つけたひらがな",
    "Letters you found"
  ],
  [
    "サンタを助けよう",
    "Help Santa escape"
  ],
  [
    "ひみつのことば",
    "The secret word"
  ],
  [
    "カギが開いた！",
    "Unlocked!"
  ],
  [
    "カギが開いた。",
    "Unlocked."
  ],
  [
    "サガルマータを",
    "Sagarmatha: "
  ],
  [
    "サンタのもとへ",
    "Go to Santa"
  ],
  [
    "サンタを助ける",
    "Help Santa"
  ],
  [
    "友だちに教える",
    "Share with a friend"
  ],
  [
    "枚目 / 4枚",
    " of 4"
  ],
  [
    "桁目のダイアル",
    ": number wheel"
  ],
  [
    "次の問題を聞く",
    "Next question"
  ],
  [
    "番目の枠に置く",
    ": place a letter here"
  ],
  [
    "絵の下を調べる",
    "Read the last clue"
  ],
  [
    "絵の横を調べる",
    "Look beside the picture"
  ],
  [
    "見つけた文字 ",
    "Letters found: "
  ],
  [
    "読み返しの時間",
    "Your storybook"
  ],
  [
    "↻ 聞き直す",
    "↻ Listen again"
  ],
  [
    "BGMの音量",
    "Music volume"
  ],
  [
    "あなたの答え",
    "Your answer"
  ],
  [
    "ひみつの言葉",
    "The secret word"
  ],
  [
    "カギが開いた",
    "Unlocked"
  ],
  [
    "ゲームに戻る",
    "Back to the game"
  ],
  [
    "コピーできた",
    "I've copied it"
  ],
  [
    "サンタの脱出",
    "Santa Claus Escape"
  ],
  [
    "一手ずつ見る",
    "See each hand"
  ],
  [
    "今は遊ばない",
    "Not right now"
  ],
  [
    "答えを伝える",
    "Send my answer"
  ],
  [
    "続きから遊ぶ",
    "Continue"
  ],
  [
    "言葉を伝える",
    "Say the word"
  ],
  [
    "調べた続きへ",
    "Keep exploring"
  ],
  [
    "サンタを外へ",
    "Help Santa out"
  ],
  [
    "の箱を調べる",
    " box: explore"
  ],
  [
    "ふたの中に「",
    " Letters inside: “"
  ],
  [
    "ことばの枠",
    "Put the word here"
  ],
  [
    "まほう使い",
    "Fairy"
  ],
  [
    "三つの箱へ",
    "Back to the boxes"
  ],
  [
    "前のページ",
    "Previous page"
  ],
  [
    "効果音ラボ",
    "Sound Effect Lab"
  ],
  [
    "効果音辞典",
    "Sound Dictionary"
  ],
  [
    "声を再生中",
    "Reading aloud"
  ],
  [
    "大きく見た",
    "Close view: "
  ],
  [
    "次のページ",
    "Next page"
  ],
  [
    "絵を調べる",
    "Look for another clue"
  ],
  [
    "資料を見る",
    "Read about the mountain"
  ],
  [
    "の箱の紙「",
    " box, letter “"
  ],
  [
    "■ 停止",
    "■ Stop"
  ],
  [
    "お話の声",
    "Narrator"
  ],
  [
    "このあと",
    "Up next"
  ],
  [
    "やり直す",
    "Start over"
  ],
  [
    "利用規約",
    "Terms of use"
  ],
  [
    "効果音 ",
    "Sound effects: "
  ],
  [
    "外へ開く",
    "open outward"
  ],
  [
    "手元の紙",
    "Your letters"
  ],
  [
    "検索する",
    "Search"
  ],
  [
    "箱へ戻る",
    "Back to the box"
  ],
  [
    "音の設定",
    "Sound settings"
  ],
  [
    "音声オフ",
    "Sound off"
  ],
  [
    "音声オン",
    "Sound on"
  ],
  [
    "黄色い箱",
    "Yellow box"
  ],
  [
    "の箱の ",
    " box: "
  ],
  [
    "」の紙。",
    "”."
  ],
  [
    "ためす",
    "Try the lock"
  ],
  [
    "サンタ",
    "Santa"
  ],
  [
    "再生中",
    "Playing"
  ],
  [
    "前の絵",
    "Previous picture"
  ],
  [
    "次の絵",
    "Next picture"
  ],
  [
    "調べる",
    "Look closer"
  ],
  [
    "赤い箱",
    "Red box"
  ],
  [
    "雪の森",
    "The snowy forest"
  ],
  [
    "青い箱",
    "Blue box"
  ],
  [
    "の枝を",
    " branch: "
  ],
  [
    "」と「",
    "” and “"
  ],
  [
    "お話",
    "The story"
  ],
  [
    "オン",
    "On"
  ],
  [
    "オフ",
    "Off"
  ],
  [
    "戻す",
    "close"
  ],
  [
    "手元",
    "Tray"
  ],
  [
    "番目",
    " slot"
  ],
  [
    "の箱",
    " box"
  ],
  [
    "の錠",
    " lock"
  ],
  [
    "の絵",
    " illustration"
  ],
  [
    "左",
    "left"
  ],
  [
    "右",
    "right"
  ],
  [
    "「",
    "“"
  ],
  [
    "」",
    "”"
  ],
  [
    "、",
    ", "
  ],
  [
    "を",
    " "
  ]
];
entries.sort((a,b)=>b[0].length-a[0].length);
const translated = new Map();
export function translateUi(text) {
  if(!IS_EN)return text;
  if(translated.has(text))return translated.get(text);
  let result='',index=0;
  while(index<text.length){const entry=entries.find(([ja])=>text.startsWith(ja,index));if(entry){result+=entry[1];index+=entry[0].length;}else result+=text[index++];}
  translated.set(text,result);
  return result;
}
export function ui(value,...args){
  if(typeof value==='string')return translateUi(value);
  return value.reduce((text,part,index)=>text+translateUi(part)+(index<args.length?args[index]:''),'');
}
