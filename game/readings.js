// Display-only readings. Scenario text, DOM base text, speech and answers stay intact.
// Contextual words precede shorter words; unknown text is escaped without guessing.
// Readings cover only kanji runs, in order, separated by | when kana lies between them.
// Keep whole words as keys so context still selects readings such as 開く / 開いた.
const vocabulary = {
  '閉じ込め':'と|こ','読み返':'よ|かえ','読み直':'よ|なお','聞き直':'き|なお',
  '書き込み':'か|こ','書かれ':'か','書いて':'か','見直':'みなお',
  '開きません':'あ','開きました':'あ','開いた':'あ','開け':'あ','開く':'ひら',
  '入って':'はい','出して':'だ','出る':'で','出られ':'で',
  '合わせ':'あ','並べ':'なら','伝え':'つた','助け':'たす','調べ':'しら',
  '遊び':'あそ','遊ぶ':'あそ','遊べ':'あそ','楽し':'たの','呼ぶ':'よ',
  '戻る':'もど','戻す':'もど','見る':'み','見つ':'み','聞こえ':'き','聞く':'き',
  '考え':'かんが','作って':'つく','使い':'つか','選んで':'えら','乗って':'の',
  '負ける':'ま','勝ち':'か','勝つ':'か','増やす':'ふ','減らす':'へ',
  '長持ち':'ながも','大好き':'だいす','生き物':'い|もの','隠れて':'かく','隠れた':'かく',
  '間に合':'ま|あ','早速':'さっそく','心待ち':'こころま','大切':'たいせつ','本当':'ほんとう',
  '赤色':'あかいろ','青色':'あおいろ','黄色':'きいろ','赤い':'あか','青い':'あお',
  '三つ':'みっ','四つ':'よっ','六つ':'むっ','二つ':'ふた','一つ':'ひと','一番':'いちばん',
  '最初':'さいしょ','最後':'さいご','全部':'ぜんぶ','必要':'ひつよう','自由':'じゆう',
  '数字':'すうじ','文字':'もじ','言葉':'ことば','端末':'たんまつ','脱出':'だっしゅつ',
  '音声':'おんせい','音量':'おんりょう','効果音':'こうかおん','設定':'せってい',
  '再生中':'さいせいちゅう','読み上げ':'よ|あ','再生':'さいせい','停止':'ていし','開始':'かいし','再開':'さいかい',
  '自動保存':'じどうほぞん','保存':'ほぞん','進行':'しんこう','入力':'にゅうりょく','確認':'かくにん','時間制限':'じかんせいげん',
  '日本語版':'にほんごばん','原作時点':'げんさくじてん','原作':'げんさく','絵本':'えほん',
  '問題':'もんだい','正解':'せいかい','答え':'こた','相手':'あいて','太陽':'たいよう','大根':'だいこん',
  '世界':'せかい','高さ':'たか','高い':'たか','寒い':'さむ','冬':'ふゆ','昔':'むかし',
  '残り':'のこ','次':'つぎ','前':'まえ','私':'わたし','君':'きみ','何':'なに','誰':'だれ',
  '枝':'えだ','向こう':'む','声':'こえ','箱':'はこ','紙':'かみ','絵':'え','球':'たま',
  '森':'もり','雪':'ゆき','横':'よこ','下':'した','中':'なか','外':'そと','山':'やま',
  '夜':'よる','鼻':'はな','指':'ゆび','数':'かず','玉':'たま','赤':'あか','青':'あお',
  '知って':'し','別':'べつ','語':'ご','来ました':'き','思った':'おも','変':'へん','会い':'あ',
  '消えて':'き','今日':'きょう','終わり':'お','終える':'お','飾って':'かざ','謎':'なぞ',
  '一手':'ひとて','一度':'いちど','今':'いま','分かった':'わ','分かっ':'わ',
  '手元':'てもと','左右':'さゆう','左':'ひだり','右':'みぎ','選び':'えら','選択':'せんたく',
  '空いて':'あ','枠':'わく','押して':'お','置け':'お','置き':'お','置く':'お',
  '動かす':'うご','動かし':'うご','移動':'いどう','移す':'うつ','移り':'うつ','交換':'こうかん','中断':'ちゅうだん',
  '並び':'なら','会う':'あ','枚目':'まいめ','枚':'まい','方':'かた',
  '読み込め':'よ|こ','読み込んで':'よ|こ','続き':'つづ','続け':'つづ',
  '秒間':'びょうかん','回':'かい','通り':'とお','式':'しき','錠':'じょう','検索':'けんさく','資料':'しりょう','名':'な','出て':'で',
};
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const pattern = new RegExp(Object.keys(vocabulary).sort((a,b)=>b.length-a.length).join('|'),'g');
export function readingMarkup(text) {
  let end=0,html='';
  for(const match of String(text).matchAll(pattern)) {
    html+=escape(String(text).slice(end,match.index));
    // The visible annotation is CSS content. rt is hidden from accessibility so
    // the original sentence is read once and copying still returns the original.
    const readings=vocabulary[match[0]].split('|');
    let index=0;
    html+=match[0].split(/([一-龯]+)/).map(part=>{
      if(!/[一-龯]/.test(part))return escape(part);
      return `<ruby>${escape(part)}<rt aria-hidden="true" data-reading="${escape(readings[index++])}"></rt></ruby>`;
    }).join('');
    end=match.index+match[0].length;
  }
  return html+escape(String(text).slice(end));
}
export function annotateReadings(root) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode()) {
    const node=walker.currentNode;
    if(!node.parentElement.closest('ruby,script,style,textarea,option,[aria-hidden="true"],[data-no-ruby]') && /[一-龯]/.test(node.data))nodes.push(node);
  }
  for(const node of nodes) {
    const markup=readingMarkup(node.data);
    if(!markup.includes('<ruby>'))continue;
    const template=document.createElement('template');template.innerHTML=markup;node.replaceWith(template.content);
  }
  // Ruby boxes can introduce spaces in computed names. Preserve explicit names
  // and update only names managed here when a toggle's visible label changes.
  for(const control of root.querySelectorAll('button,summary')) {
    if(control.dataset.readingLabel==='true' || (control.querySelector('ruby') && !control.hasAttribute('aria-label'))) {
      control.setAttribute('aria-label',control.textContent);control.dataset.readingLabel='true';
    }
  }
}
