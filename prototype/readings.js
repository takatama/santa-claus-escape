// Display-only readings. Scenario text, DOM base text, speech and answers stay intact.
// Contextual words precede shorter words; unknown text is escaped without guessing.
const vocabulary = {
  '閉じ込め':'とじこめ','読み返':'よみかえ','読み直':'よみなお','聞き直':'ききなお',
  '書き込み':'かきこみ','書かれ':'かかれ','書いて':'かいて','見直':'みなお',
  '開きません':'あきません','開きました':'あきました','開いた':'あいた','開け':'あけ','開く':'ひらく',
  '入って':'はいって','出して':'だして','出る':'でる','出られ':'でられ',
  '合わせ':'あわせ','並べ':'ならべ','伝え':'つたえ','助け':'たすけ','調べ':'しらべ',
  '遊び':'あそび','遊ぶ':'あそぶ','遊べ':'あそべ','楽し':'たのし','呼ぶ':'よぶ',
  '戻る':'もどる','戻す':'もどす','見る':'みる','見つ':'みつ','聞こえ':'きこえ','聞く':'きく',
  '考え':'かんがえ','作って':'つくって','使い':'つかい','選んで':'えらんで','乗って':'のって',
  '負ける':'まける','勝ち':'かち','勝つ':'かつ','増やす':'ふやす','減らす':'へらす',
  '長持ち':'ながもち','大好き':'だいすき','生き物':'いきもの','隠れて':'かくれて','隠れた':'かくれた',
  '間に合':'まにあ','早速':'さっそく','心待ち':'こころまち','大切':'たいせつ','本当':'ほんとう',
  '赤色':'あかいろ','青色':'あおいろ','黄色':'きいろ','赤い':'あかい','青い':'あおい',
  '三つ':'みっつ','四つ':'よっつ','六つ':'むっつ','二つ':'ふたつ','一つ':'ひとつ','一番':'いちばん',
  '最初':'さいしょ','最後':'さいご','全部':'ぜんぶ','必要':'ひつよう','自由':'じゆう',
  '数字':'すうじ','文字':'もじ','言葉':'ことば','端末':'たんまつ','脱出':'だっしゅつ',
  '音声':'おんせい','音量':'おんりょう','効果音':'こうかおん','設定':'せってい',
  '再生中':'さいせいちゅう','読み上げ':'よみあげ','再生':'さいせい','停止':'ていし','開始':'かいし','再開':'さいかい',
  '自動保存':'じどうほぞん','保存':'ほぞん','進行':'しんこう','入力':'にゅうりょく','確認':'かくにん','時間制限':'じかんせいげん',
  '日本語版':'にほんごばん','原作時点':'げんさくじてん','原作':'げんさく','絵本':'えほん',
  '問題':'もんだい','正解':'せいかい','答え':'こたえ','相手':'あいて','太陽':'たいよう','大根':'だいこん',
  '世界':'せかい','高さ':'たかさ','高い':'たかい','寒い':'さむい','冬':'ふゆ','昔':'むかし',
  '残り':'のこり','次':'つぎ','前':'まえ','私':'わたし','君':'きみ','何':'なに','誰':'だれ',
  '枝':'えだ','向こう':'むこう','声':'こえ','箱':'はこ','紙':'かみ','絵':'え','球':'たま',
  '森':'もり','雪':'ゆき','横':'よこ','下':'した','中':'なか','外':'そと','山':'やま',
  '夜':'よる','鼻':'はな','指':'ゆび','数':'かず','玉':'たま','赤':'あか','青':'あお',
  '知って':'しって','別':'べつ','語':'ご','来ました':'きました','思った':'おもった','変':'へん','会い':'あい',
  '消えて':'きえて','今日':'きょう','終わり':'おわり','終える':'おえる','飾って':'かざって','謎':'なぞ',
  '一手':'ひとて','一度':'いちど','今':'いま','分かった':'わかった','分かっ':'わかっ',
  '手元':'てもと','左右':'さゆう','左':'ひだり','右':'みぎ','選び':'えらび','選択':'せんたく',
  '空いて':'あいて','枠':'わく','押して':'おして','置け':'おけ','置き':'おき','置く':'おく',
  '動かす':'うごかす','動かし':'うごかし','移動':'いどう','移す':'うつす','移り':'うつり','交換':'こうかん','中断':'ちゅうだん',
  '並び':'ならび','会う':'あう','枚目':'まいめ','枚':'まい','方':'かた',
  '読み込め':'よみこめ','読み込んで':'よみこんで','続き':'つづき','続け':'つづけ',
  '秒間':'びょうかん','回':'かい','通り':'とおり','式':'しき','錠':'じょう','検索':'けんさく','資料':'しりょう','名':'な','出て':'でて',
};
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const pattern = new RegExp(Object.keys(vocabulary).sort((a,b)=>b.length-a.length).join('|'),'g');
export function readingMarkup(text) {
  let end=0,html='';
  for(const match of String(text).matchAll(pattern)) {
    html+=escape(String(text).slice(end,match.index));
    // The visible annotation is CSS content. rt is hidden from accessibility so
    // the original sentence is read once and copying still returns the original.
    html+=`<ruby>${escape(match[0])}<rt aria-hidden="true" data-reading="${vocabulary[match[0]]}"></rt></ruby>`;
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
