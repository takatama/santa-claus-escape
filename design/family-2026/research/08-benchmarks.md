# 08 ベンチマーク調査：「大人が子どもと一緒に遊びたくなる」クリスマス謎解き絵本の参考事例

調査日：2026-10-09（クリスマスまで約11週。12/1まで53日、12/24まで76日）
担当：ゲーム・アプリ市場の分析
対象：`リポジトリのルート`（PR #1 head `codex/illustrated-full-journey`）。リポジトリの変更、状態を変えるgit操作、GitHubへの投稿はしていない。

**表記ルール**
- 【事実】出典URLで確認できたこと。数値には出典の時点を付けた。二次情報（まとめ記事・検索要約）しかないものは【二次】と書いた。
- 【推定】筆者の解釈・見積もり。
- 【リポ】リポジトリ内のファイルで確認できたこと。

**調査の限界**：Web検索はセッション上限（200回）に達したため、途中から追加の検索ができなかった。WandersongとChicoryの細部（2人プレイ、電話でヒントをもらう仕組み）と、Morning Consultの調査値は、二次情報1件だけで確認している。日本のアプリ市場は網羅していない。「存在しない」と書いた箇所は「今回の範囲では見つからなかった」という意味。

---

## 0. 要点（結論を先に）

1. **大人が「一緒に遊びたい」と思える作品は、偶然ではなく大人の出番を設計している。** 情報を分ける（Keep Talking：子がマニュアルを読み、親が爆弾を触る）、能力を分ける（マリオギャラクシーの2Pポインター、カービィの2P、Chicoryの2P絵筆）、台本を渡す（ピタゴラスイッチ「つくる・おとうさんスイッチ」では子が監督で、親が演じる）。Cooney Centerの共同視聴研究（2011）も「役割の分化」と「大人を支える足場」を設計原則に挙げている。【事実】
2. **「親が仕掛け人になる」ことが、クリスマスの魔法の正体。** Portable North Pole（個別化した動画は累計3.4億本超）、Elf on the Shelf（2005年から2,500万体超）、日本・フィンランドのサンタの手紙（1,600円〜）。どれも、大人が裏で準備して子どもが驚くという構造になっている。ただしElfは、親が毎晩準備に追われる燃え尽きの問題を抱えている。【事実／一部二次】
3. **詰まらせない仕組みは、物語の中に置くと上品になる。** Machinarium/Samorost（ミニパズルを解くと攻略本が開く）、Lumino City（1,000ページの手引書。開くページ番号を謎から計算させる）、Lost in Play（段階ヒント）、Hidden Folks（探し物それぞれに一言の手がかり文）、A Little to the Left（「Let it be」で飛ばせる）。対照的に、日本の無料脱出ゲームアプリは**広告動画を見るとヒントが出る**のが定番で、親が最も嫌う形になっている。【事実】
4. **1回の長さは「寝る前の15〜20分」が強い。** Unlock! Kidsは1話約20分で、レビュアーは「子どもの集中力にちょうどよい」と書いている。EXIT Kidsも20分、Little Orpheusは1話15〜20分×9話。2〜5時間の名作インディーは「一晩で一緒に」には長い。Bluey（約4時間未満、$40）は「2回90分で終わった」と批判された。【事実】
5. **毎日少しずつ開く（アドベントカレンダー）形がクリスマスの定番。** Google Santa Trackerは2004年から毎日1つ村の施設を開けていき、2018年12月の訪問者は4,220万。Jacquie Lawsonのカレンダーは£8で毎年売れる大人向けの例。NORADは1955年から続き、ボランティア約1,000人が12/24〜25の25時間に電話を受ける。【事実】
6. **親が嫌うものは、データで裏づけられている。** 3〜5歳児160人が使うアプリの調査（Radesky他、JAMA Network Open 2022）では、**操作的なデザインがなかったアプリは20%だけ**。キャラクターとの関係を使った圧力、作られた時間制限、ご褒美による誘導、広告が多かった。Appleは子ども向けカテゴリで、第三者の広告・解析を禁止している。【事実】
7. **クリスマスもので「謎解き」をうたう既存アプリは、品質と倫理の両方が弱い。** 例：「escape game: For SANTA」は無料で広告と課金があり、**公開日は2025-12-27でクリスマスを過ぎていた**。Etsyの印刷用「Santa Rescue from Toy Factory」（$16〜21、7問、45〜75分）は親が印刷と準備をする必要がある。AIサンタ（Tavus）は「何時間も話す」利用が報じられ、児童団体が警告している。【事実】
8. **空白地帯は「家で、24日までの数晩、親子が役割を分けて解く、日本語の質の高い謎解き絵本。広告・課金・個人データなし。最後に現実のクリスマスの夜へつながる」。** SCRAP for kids（会場型・キット、ふりがな付きファミリーキット）、東大ナゾトレ（本、180万部）、ミッケ!（945万部）、PNP（見るだけ）、Santa Tracker（一人遊びのミニゲーム）。どれもこの交点にいない。【推定】
9. **原作のテーマは、サンタものの主流と真逆の場所にいる。** 主流は「いい子にしているか見張る」（Elfの見張り役、PNPの良い子・悪い子判定、鬼から電話はシリーズ2,500万DL）。原作は「かまってもらえなかった寂しさを、一緒に遊ぶことで満たす」（`design/FULL-GAME-DESIGN.md:21`、`prototype/full-scenario.js:33`）。**見張らないサンタ、一緒に遊ぶサンタ**は差別化の核になる。【推定・リポ】
10. **PR #1の現状は、上の勝ちパターンのうち「絵の美しさ」「触れる錠と箱」は満たしている。足りないのは、音、ヒント、大人の出番、声に出す儀式、現実への橋渡し。** 【リポ】`illustrated-prototype/` のJSに音声APIの呼び出し（`new Audio`/`AudioContext`/`speechSynthesis`）と「ヒント」の文字列は見つからない（grep結果0件）。合言葉は文字入力で判定している（`illustrated-prototype/letters/word-math.js:13-14`）。

---

## 1. 調査対象の一覧（カテゴリ別の早見表）

列の意味：**共遊・魔法の仕掛け**＝親子が一緒に遊ぶ状況、または魔法のような体験を生む具体的な仕組み。**1回**＝1回のまとまった遊びの長さ。

### 1.1 子ども・家族向けの絵本／パズル／アドベンチャー（海外）

| 作品 | 端末 | 収益モデル・価格 | 1回／全体 | 共遊・魔法の仕掛け | 主な評価 |
|---|---|---|---|---|---|
| **Pok Pok**（Snowman出身の2人が創業） | iOS/Android | サブスク（$4/月、$30/年の記載あり）。加入者には広告・課金なし | 終わりなし（勝ち負けなし） | 勝敗・点数・言葉なし、刺激が少ない。一人でも遊べ、親が隣に座れば語彙を足す遊びになる | Apple Design Award、2023 App Store Award。親の声「依存しないので置かせやすい」 |
| **Toca Boca**（2010年創業→Spin Master） | iOS/Android | 初期は買い切り$0.99〜2.99 → 2018年からToca Life Worldで基本無料＋課金に転換 | 終わりなし | ルールなし、正解なし、性別を問わない「デジタルのおもちゃ」 | 課金の多さ、購入アイテムの消失、保護者向け制御の不足が不満 |
| **Sago Mini World** | iOS/Android | $6.99/月、$29.99〜59.99/年 | 終わりなし | 2〜6歳の自由遊び。COPPAとkidSAFEの認証あり | 「高い」「ダウンロード済みが消える」「無料で遊べる部分が少なすぎる」 |
| **Lost in Play**（Happy Juice Games） | 全機種 | モバイルは無料で始めて$5.99で全編解放。Apple Arcade版あり | 2.5〜4.5時間 | **台詞はでたらめ語と身ぶりで、読めなくても遊べる**。段階ヒントあり。「親子が並んで遊べる」 | Apple年間ベストiPadゲーム2023、Apple Design Award 2024（イノベーション）、Metascore 82 |
| **Hidden Folks** | iOS/Android/Switch/Steam | 買い切り（iPad $4.99、Switch $11.99） | 1エリア数分〜 | **探し物それぞれに一言の手がかり文が付く**（読む人と探す人に分かれる）。効果音2,000以上をすべて口で録音 | 「5歳から99歳まで」「幼い子は親の膝の上で一緒に遊ぶゲームとして」 |
| **Samorost 3 / Machinarium**（Amanita Design） | 全機種 | 買い切り（Samorost 3はiOS $6.99） | 約5時間 | **言葉を使わない**。攻略本がゲーム内にあり、**開くにはミニパズル（Machinariumはシューティング）を毎回解く必要がある** | 「幼い子と遊ぶものを探す親に」勧めるレビューあり |
| **Gorogoa**（Jason Roberts） | 全機種 | 買い切り（iOS $4.99） | 1.5〜2.5時間 | 4枚のコマを入れ替えて重ねると世界がつながる。言葉はほぼない | BAFTAデビュー賞。「短いのに高い」という不満も |
| **Little Orpheus**（The Chinese Room） | Apple Arcade→他機種 | Arcade（広告・課金なし） | **1話15〜20分×9話、約3時間** | ほら話を語る語り手と、疑う将軍の掛け合いで進む。毎話「つづく」で終わる連続活劇の形 | 声の演技が絶賛され、「テレビシリーズを一気見する感覚」 |
| **Lumino City**（State of Play） | PC/iOS | 買い切り | 数時間 | 紙と模型で作った街。**1,000ページの手引書がヒントになる。目的のページ番号は、謎の中の数を使った計算で求める** | BAFTA芸術賞 |
| **Wandersong**（Greg Lobanov） | 全機種 | 買い切り | 数時間 | 戦わずに歌で世界を動かす。レビューでは「1人が移動、1人が歌」で遊べるとある【二次。Wikipediaは一人用と記載→要確認】 | OpenCritic上位7%、IGFナラティブ部門ノミネート |
| **The Gardens Between**（Voxel Agents） | 全機種／Arcade（2025-09に撤去） | 買い切り | 2〜4時間 | 時間を早送り・巻き戻しするだけで解く。友情の記憶の物語 | 「やさしく、ほろ苦い」 |
| **Unpacking**（Witch Beam） | 全機種 | $19.99。1年で100万本 | 約3.5時間 | 文字なしで、荷ほどきするだけで人生が伝わる。時間制限なし、失敗なし | Common Sense 9+。「物を置く場所で物語を語る見本」 |
| **Monument Valley 1〜3**（ustwo） | iOS/Android、3はNetflix | 1は$3.99の買い切りで、2016年までに2,600万超（無料配布期間を含む可能性あり）。3はNetflix会員向け | 約2時間 | 開発者の言葉で「一度払えば、2時間すごいものを見られて、あとで思い返せる」。2は母と娘の物語 | 「母と遊んで泣いた」という声。子育ての比喩 |
| **Chicory: A Colorful Tale**（Greg Lobanov） | 全機種 | 買い切り | 数時間 | **2Pは「絵筆だけ」を担当**できる（出入り自由）。詰まると公衆電話で両親に電話してヒントをもらう【二次】 | BAFTA ファミリー部門2022、Metacritic 90 |
| **A Little to the Left**（Max Inferno） | 全機種 | $14.99 | 3.5〜4時間 | 片付けパズル。**「Let it be」で詰まった問題を飛ばせる**。毎日1問の「Daily Tidy」。猫が邪魔をしに来る | 「詰まったときのいら立ちを防ぐ」 |

### 1.2 日本の子ども向けアプリ・本

| 作品 | 収益モデル | 共遊・特徴 | 備考 |
|---|---|---|---|
| **ぐりとぐら（絵本アプリ）** | — | **公式の絵本アプリは今回確認できなかった**（検索で出たのは紙の本と関連グッズのみ） | 名作絵本の多くは紙で親子が読む文化。アプリ化は少ない【推定】 |
| **NHKキッズ**（Eテレの番組動画） | 無料 | 3〜7歳と保育者・保護者が対象。おかあさんといっしょ、ピタゴラスイッチ、デザインあ等 | 第13回キッズデザイン賞 |
| **ピタゴラスイッチ うたアプリ**（収録コンテンツ「つくる・おとうさんスイッチ」） | 有料アプリ（価格は未確認） | **子どもが監督として、あ・か・さ・た行の動作をするお父さんを撮影する。5つ撮ると番組と同じ音楽とナレーションが付いた家庭版ができる** | 共同制作の型として最も参考になる。親が「演者」になる |
| **しまじろうクラブ**（ベネッセ） | 無料（会員向けの機能あり）、広告なし | **「おやこモード」と「こどもモード」の2つ**。使いすぎ防止タイマー | App Storeの評価4.4（約4.4万件）。プライバシー欄には、ID・使用状況・広告識別子の収集と、外部SDK（Appier、Firebase、Adjust）が記載されている【要原文確認】 |
| **学研 もじ・かず・ちえ** ほか | 最初の5問は無料、以降は課金 | **全問に音声の読み上げ**があり、文字が読めない子も一人で進められる | 3〜5歳 |
| **ワオっち!ランド** | 無料＋課金 | 25種の知育ゲーム、集める楽しみ。シリーズ累計1,000万DL（2020年） | 警視庁などと共同開発 |
| **ごっこランド**（キッズスター） | **子どもは無料、出店する企業が費用を払う** | ごっこ遊びで社会の仕組みを学ぶ。出店は50社超、600万DL（2023-11） | 企業スポンサー型の収益モデル |
| **PIBO** | 月額400円（iOS） | 絵本360冊以上を読み放題、プロ声優の読み聞かせ付き | 寝かしつけ用 |
| **ミッケ!**（小学館） | 紙の本 | 写真の中から探す。**親子で膝の上で遊ぶ代表格** | **シリーズ累計945万部**、2022年に30周年 |
| **東大ナゾトレ**／**ウィズリンのだいぼうけん**（松丸亮吾監修、KADOKAWA、1,980円） | 紙の本 | ウィズリンは物語に沿って、切り取ったパズル9枚で道をつなぐ。体験記事では「5歳の弟は見るだけのはずが、兄から本を取り上げるほど夢中」 | ナゾトレは累計180万部。**「見習いまほう使い」と謎と絵本の組み合わせは、既に紙で成功している** |
| **鬼から電話**（反面教師） | 無料＋課金 | 言うことを聞かない子に、鬼から叱る電話がかかってくる（ほめる電話もある） | **シリーズ累計2,500万DL**。恐怖でしつけることへの懸念がある |
| **日本の無料脱出ゲームアプリ**全般 | 広告＋広告削除の課金 | **ヒントボタンを押すと広告動画が流れる** | 子どもと遊ぶと「詰まる→広告」になる |

### 1.3 協力・非対称の家族向けゲーム

| 作品 | 共遊の仕掛け | 数字・評価 | 本作への示唆 |
|---|---|---|---|
| **It Takes Two / Split Fiction**（Hazelight） | **2人いないと進めない**。章ごとに2人の能力がまったく違う。**Friend's Passで1本買えば2人目は無料** | It Takes Twoは2,300万本超（2025-03）。Split Fictionは2か月で400万本 | 「2人目は無料」は親子向けにも効く |
| **Keep Talking and Nobody Explodes** | **爆弾を見る人とマニュアルを読む人を分ける**（情報の非対称）。マニュアルは約23ページで、無料で印刷できる | 図書館の専門誌が「親が爆弾、子がマニュアルを持つと**力関係が逆転し**、子が伝え方を工夫する」と紹介 | 青箱の「8848」を大人の知識の出番にする、あるいは逆に子が「サンタの手帳」を読む |
| **スーパーマリオブラザーズ ワンダー** | ヨッシーとトッテンはダメージを受けない。やられた仲間を助けて戻せる。時間制限なし | 幼い子向けの入口として親に好評 | 「誰が操作しても失敗しない役」を用意する |
| **スーパーマリオギャラクシー アシストプレイ** | 2Pは画面を指すだけで、敵を止める・星のかけらを集める | — | 親子のどちらかが「指さし係」になれる |
| **星のカービィ ディスカバリー** | 2Pはバンダナワドルディ（能力が少ない）。やさしいモード「はるかぜモード」 | — | 能力の少ない役でも楽しい |
| **Overcooked** | 大混乱の協力料理。**アシストモードで時間制限・火事を消し、ステージも飛ばせる** | 親の声「自分が熱くなって子に怒鳴った」「不安の強い子は大泣きする」 | **時間の圧力は家族を壊す** |
| **Jackbox Games** | 参加者は**ブラウザでjackbox.tvを開くだけで、各自のスマホがコントローラーになる**（アプリ不要）。家族向けフィルター。観客は最大1万人 | — | 大人のスマホを、QRで「サンタの手帳」につなぐ案の先例 |
| **Caribu** | **ビデオ通話しながら絵本を読み、ゲームをする**（祖父母と孫） | TIME誌 ベスト発明2019、160か国以上 | 離れて住む祖父母もクリスマスに参加できる |
| **Bluey: The Videogame**（警告事例） | 4人協力 | 4時間未満、「2回90分で終わった」、$40 | 有名IPでも薄くて高いと親は怒る |

### 1.4 ボードゲーム・リアル謎解き

| 作品 | 対象 | 長さ | 仕掛け・評価 |
|---|---|---|---|
| **EXIT the Game Kids**（KOSMOS） | 5歳以上（実質6歳が最適） | **20分** | 文字を読まない絵の謎、36枚の大判カード。壊さずに繰り返し遊べる。レビュー「4・6・7・10歳で遊ぶと、6歳がちょうどよく、10歳は退屈」 |
| **Unlock! Kids**（Space Cowboys） | 6歳以上 | **1話約20分×6話** | アプリなし、ヒントと答えは冊子。「6話を24時間以内に全部ねだられた」「20分は集中力にちょうどいい」。一方で「説明と違う展開で子どもが不安になった」 |
| **Escape Room in a Box**（Mattel） | **13歳以上** | 60〜90分 | 本物の錠前、19問。子ども向けではない |
| **リアル脱出ゲーム for kids**（SCRAP） | 6歳以上（保護者同伴） | 会場型・キット型 | **小学生以下は最大半額。ファミリーキットは難しさを調整し、難しい漢字にふりがなを付ける**。自宅キットは3,300〜4,950円 |
| **東京駅サンタ謎〜ひみつの試験〜**（2025-11-20〜12-25） | 親子 | 周遊型 | 冊子とLINEで駅を巡る。第1章は無料、第2章は買い物が条件。**「サンタ」と「謎解き」の組み合わせが商業施設の集客になっている** |
| **Etsyの印刷用クリスマス脱出ゲーム**（例：Santa Rescue from Toy Factory） | 家族 | **45〜75分**、2〜6人 | $16.12（定価$21.50）、7問、ヒントカード付き。**題材は「サンタを救う」で本作とほぼ同じ**。印刷と準備は親の負担 |

### 1.5 親が好きなクリスマスの魔法

| 作品 | 収益 | 魔法の仕組み | 数字・評価・懸念 |
|---|---|---|---|
| **Portable North Pole（PNP）** | 1本無料。追加の動画は1本$4.99、Magic Pass $13.99（2019年英国のレビュー時点）、5年有効のMagic Pass+ | **親が子どもの名前・写真・年齢・頑張ったことをこっそり入力**し、サンタが名指しで話す動画を見せる。反応を録画する機能あり。2025年に双方向のAI会話「Talk to Santa」を追加 | 個別化動画は累計3.4億本超。親の声「見てもらえていると感じさせる」「信じなくなっても覚えていたい」。一方で、ある集計ではレビューの28%が否定的【二次】 |
| **Google Santa Tracker** | 無料 | **12月の毎日、村の新しい場所が開く**（アドベント）。プログラミング学習のCode Lab、エルフ作りのElf Maker、教師向けの教材。24日夜は地図でサンタを追跡。ソースはApache 2.0で公開 | 2004年開始。2018年12月の訪問者4,220万 |
| **NORAD Tracks Santa** | 無料（企業50社超が協力） | 1955年、新聞広告の電話番号の誤植から始まった。24日に**本物の大人が電話に出る**。2024年からはWebからの通話にも対応 | ボランティア約1,000人、2013年は117,371件の電話。2025年に70周年 |
| **Elf on the Shelf** | 本と人形の物販 | 人形が毎晩北極へ報告に行き、朝には別の場所にいる。**触ると魔法が消える**というルール | 2,500万体超を販売。**親の燃え尽き、SNSでの競い合い、監視されているような感覚が批判されている**。「ほぼ半数の親が祝日の伝統の期待に圧倒されている」（Morning Consult、二次） |
| **サンタからの手紙**（日本・フィンランドサンタクロース協会／郵便局） | 1,600円〜 | 12/1締切。幼児向け・子ども向け・一般向け×日英の6種類。フィンランドの切手付き | ロヴァニエミのサンタ中央郵便局には年約50万通が届き、日本は送り手の上位国 |
| **Santa's Christmas Village**（アプリ） | 基本無料＋課金 | 北極の村を入口に17種の定番ゲーム | Common Senseが紹介。別の「Santa Claus」系ゲームは収益の76%が広告 |
| **Jacquie Lawson Advent Calendar** | **£8の買い切り**（2025年版） | 12/1〜25に毎日アニメの物語とミニゲームが開く。自分の家を飾れる | 大人が毎年買う「静かな季節の楽しみ」の代表 |
| **Advent Calendar 2025**（個人開発） | $0.99、広告なし、オフライン可 | **親が中身を選び、子がスクラッチで開く** | 「親が仕込み、子が開ける」をそのまま形にした例 |
| **サンタから電話（日本）** | 無料＋課金等 | 実写のサンタからビデオ電話がかかってくる演出。日が近づくと新しいメッセージ。知育クイズ付き | 「いい子にしてるかな？」と良い子かどうかを問う型 |
| **AIサンタ（Tavus など）** | 無料・時間制 | 双方向のAI会話。「本物のサンタではないけれど」と自ら名乗る | **利用者が1日に何時間も話し、上限に達する**と報じられた。児童団体FairplayはAIおもちゃに警告。会話の記録やアフィリエイトリンクを使うサービスもある |
| **escape game: For SANTA**（LIBERTY PLANT） | **無料・広告・課金あり**、4+ | 屋敷の脱出。ヒント・答え・メモあり | **v1.0の公開は2025-12-27（クリスマス後）**、評価4.8（68件） |

### 1.6 研究と規制（設計の物差し）

- **Cooney Center「The New Coviewing: Joint Media Engagement」（2011）** の設計原則は6つ。①子ども主導 ②複数の層で楽しめる（例：セサミストリートは大人向けのカメオ出演で親を座らせる）③役割の分化 ④大人を支える足場（準備のいらない、さりげない手がかり）⑤前後へのつながり（時間と場所をまたぐ物語、複数媒体）⑥共同制作。事例の読み聞かせ録音サービスでは、録音の**18%が親子一緒に、5%が祖父母二人で**行われ、想定外の使われ方が約半分を占めた。【事実：scratchpadの `_coviewing.txt` 1460-1480行、1621-1720行】
- **米国小児科学会（AAP）**：2〜5歳には大人が一緒に見る・一緒に遊ぶことを推奨。一緒に遊びながら語りかけ、問いかけ、生活につなげる。【事実】
- **Radesky他（JAMA Network Open 2022）**：3〜5歳児160人が使うアプリのうち、**操作的なデザインがないものは20%だけ**。キャラクターとの関係を使った圧力、作られた時間制限、進み方の制約、魅力的な誘い、広告による圧力。**低所得層の子どもほど多く接している。**【事実】
- **App Store審査ガイドライン 1.3／5.1.4**：子ども向けカテゴリでは第三者の広告・解析を禁止。外部リンク・許可の要求・購入の前には保護者確認（ペアレンタルゲート）が必要。【事実】

---

## 2. 共遊と魔法を生む仕組みの型（横断分析）

### 2.1 共遊の6つの型

| 型 | 中身 | 代表例 | 大人の満足の源 | 子どもの満足の源 |
|---|---|---|---|---|
| A. **情報を分ける** | 片方だけが見られる情報がある | Keep Talking、Unlock! Kids（親が冊子） | 伝え方の工夫、子の成長を見る | 自分しか知らないことを教える |
| B. **能力を分ける** | 操作の種類を分ける | ギャラクシー2P、Chicory 2P、カービィ2P、Wandersong【二次】 | 助ける側の楽しさ | 主人公でいられる |
| C. **膝の上で一緒に** | 1台の画面を一緒に見る | Hidden Folks、ミッケ!、Pok Pok | 手がかり文や絵のユーモアを読む | 見つける速さで大人に勝てる |
| D. **監督と演者** | 子が指示し、大人が演じる | おとうさんスイッチ | 照れと笑い、子の笑顔 | 大人を動かせる力 |
| E. **大人が仕掛け人** | 大人が裏で準備し、子が驚く | PNP、Elf、サンタの手紙、Advent Calendar 2025 | 驚く顔を見る、思い出になる | 魔法が本当に起きる |
| F. **毎日・季節の儀式** | 決まった日に開く、現実の日付とつながる | Santa Tracker、NORAD、Jacquie Lawson、東京駅サンタ謎 | 生活のリズムになる、懐かしさ | 明日も続きがある |

【推定】サンタの脱出が最も得をする組み合わせは **E（仕掛け人）＋A（情報を分ける）＋F（儀式）** 。C（膝の上）は現状のPR #1でも自然に起きる。D（監督と演者）は「シカ、シカ…と10回いってね」「だいすきだよ」の場面に入れられる。

### 2.2 ヒントの出し方の型（詰まらせない仕組み）

| 方式 | 例 | 品位 | 子ども向けか |
|---|---|---|---|
| ミニパズルを解くと攻略本が開く | Machinarium（毎回シューティング）、Samorost 3（輪を回して赤い点をそろえる×2） | 高い。手軽に頼りすぎるのを防ぐ | 6歳には少し難しい【推定】 |
| 謎から計算したページを開く | Lumino City（「観覧車のポスター数×111−(6×6)」） | 高い。ヒント自体が謎になる | 大人向け。大人の出番になる |
| 段階的に教える | Lost in Play、Unlock! Kids（冊子） | 高い | 向いている |
| 探し物ごとの手がかり文 | Hidden Folks | 高い。読む人と探す人に分かれる | 向いている（大人が読む） |
| 登場人物に電話する | Chicory（両親に電話）【二次】 | 高い。関係性の物語になる | 向いている |
| 飛ばして後で戻る | A Little to the Left「Let it be」、Overcooked アシスト | 実用的 | 向いている |
| **広告を見るとヒント** | 日本の無料脱出アプリ | **最低** | **不適** |

【推定】本作では「**スノードームの中のサンタに聞く**」（Chicory型）と「**大人だけが読める段階ヒント**」（Unlock!冊子型とLumino City型の中間）を組み合わせるのが、物語とも共遊とも合う。

### 2.3 1回の長さと全体の構成

| 構成 | 例 | 1回 | 全体 |
|---|---|---|---|
| 1話完結の短編×複数 | Unlock! Kids、EXIT Kids | 20分 | 6話（Unlock） |
| 連続ドラマ型 | Little Orpheus | 15〜20分 | 9話・約3時間 |
| 毎日1つ開く | Google Santa Tracker、Jacquie Lawson | 5〜15分【推定】 | 24〜25日 |
| 一気に体験 | Monument Valley、Gorogoa | 1.5〜2.5時間 | 同じ |
| 現状の本作 | 01・11の報告 | 初見の親子で30〜45分（11）、17〜33分（01） | 1回 |

【推定】本作の総量（台詞2,475字、音声約9.3分。`01-original-story.md` §0）は、**3〜4晩×15〜20分に分けるとちょうど良い**。赤箱、青箱、黄箱、まほう使いと救出の4夜にし、24日夜のエピローグを加える。

---

## 3. 個別の深掘り（本作に効く12件）

### 3.1 Keep Talking and Nobody Explodes ― 情報の非対称
- **仕組み**：爆弾は画面の1人だけが見え、マニュアル（約23ページ、無料公開）は他の人だけが読める。1回5分の制限時間がある。
- **親子で遊ぶと**：「親が爆弾、子がマニュアル」にすると力関係が逆転し、子が伝え方を学ぶ。最初は「どうして分からないの」と怒るが、だんだん聞き方を覚える（School Library Journal）。
- **本作への示唆**：**制限時間は外し、情報の非対称だけを残す。** 例：子どもの画面にはダイヤルと箱があり、大人の手元には「サンタの手帳」（印刷物か、大人のスマホ）がある。手帳には「たぬきは"た"を抜くんじゃ」のように**半分だけのヒント**が書いてあり、大人が読み上げると子どもが解ける。

### 3.2 ピタゴラスイッチ「つくる・おとうさんスイッチ」― 子が監督、大人が演者
- **仕組み**：子が五十音の行ごとにお題を出し、お父さんが演じるのを撮る。5つ撮ると、番組の音楽とナレーションが付いた家族版の映像が完成する。
- **本作への示唆**：まほう使いの「シカ、シカ…と10回いってね」は、**子がまほう使い役として大人に言わせる**形にすると成り立つ（今は文字だけで、ひっかけが効かない。`11-hands-on-playthrough.md` 9項）。「だいすきだよ」も、**最後は大人が子に言う**場面にできる。

### 3.3 Portable North Pole ― 大人が仕掛け人
- **仕組み**：大人が名前・写真・年齢・頑張ったことを入力すると、サンタが名指しで話す動画が届く。反応の録画機能、電話の演出、2025年からはAI会話もある。
- **親の評価**：映像の質と「見てもらえている」感覚。「信じなくなった後も覚えていたい思い出」。
- **弱点**：見るだけで、子どもは何もしない。課金への誘導、写真と個人情報の入力、良い子・悪い子の評価。
- **本作への示唆**：**大人だけが見る準備画面**を設ける（呼び名とサンタへの一言だけ。端末内に保存し、送信しない）。サンタが救出後に「○○ちゃん、ありがとう」と言う。**写真や実名は求めない。**

### 3.4 Google Santa Tracker ― 毎日開く・Webで無料
- **仕組み**：12/1から毎日、村の施設が1つ開く。24日夜は追跡、Code Labで学ぶ要素もある。**インストール不要のWeb**で、ソースはApache 2.0で公開されている。
- **数字**：2018年12月の訪問者4,220万。
- **弱点**：ミニゲームは一人遊びが中心で、物語の連続性は弱い【推定】。
- **本作への示唆**：**Web配布、日付で開く章、24日夜の特別イベント**の組み合わせには、すでに大きな先例がある。物語の連続性と親子の役割分担で差をつける。

### 3.5 Elf on the Shelf ― 魔法の強さと親の負担
- **仕組み**：触ってはいけない、毎晩北極へ報告する、朝には動いている、というルール。2005年から2,500万体超。
- **問題**：親の燃え尽き、SNSでの競い合い、見張りやご褒美によるしつけ。
- **本作への示唆**：大人の仕掛けは**1回5分以内**に収める（例：印刷した6枚の紙を家の中に隠すだけ）。**「いい子にしていないと」は使わない。**

### 3.6 Lost in Play ― 読めなくても遊べる絵本アドベンチャー
- **仕組み**：台詞はでたらめ語と身ぶりと絵記号。手を貸しすぎない段階ヒントがある。モバイルは無料で始めて$5.99で全編解放。
- **評価**：Apple年間ベストiPadゲーム2023、ADA 2024。「子どもと親が並んで遊べる」。
- **本作への示唆**：PR #1の絵の質はこの水準に近い（`11-hands-on-playthrough.md` 1項）。**謎を文字から絵へ移すこと**（たぬき＝絵、6枚の紙＝絵）と、**ヒントを物語の中に置くこと**が次の課題。

### 3.7 Hidden Folks ― 膝の上で遊ぶ／手がかり文
- **仕組み**：探し物それぞれに、ユーモアのある一言の手がかり文が付く。効果音2,000以上をすべて口で録った。
- **本作への示唆**：**大人が手がかり文を読み、子が探す**形はすぐ使える（例：雪の森で「サンタのぼうしのポンポン、どこかな」）。口で録った効果音は、**家族の声を録音してゲームに入れる**案にもつながる（任意、端末内のみ）。

### 3.8 Unlock! Kids / EXIT Kids ― 20分の協力謎解き
- **仕組み**：文字を読まない絵の謎、20分、ヒントは冊子。
- **評価と弱点**：子どもは夢中になるが、10歳は退屈する（EXIT）。説明と違う展開で子どもが不安になる（Unlock）。
- **本作への示唆**：**20分単位の章**にする。**大人と年上の子には別の深い層**を用意する（例：黄箱の「負けるが勝ち」を大人だけが気づく裏解答にする）。

### 3.9 Little Orpheus ― 語り手と「つづく」
- **仕組み**：ほら吹きの語り手と、それを疑う聞き手。1話15〜20分。毎話「つづく」で終わる。
- **本作への示唆**：原作の語り手は端末が一人称「私」で語る（`01-original-story.md` §2.1）。**大人がその「私」を読み上げる語り手役になる**読み聞かせモードと、毎晩「つづきはあしたの夜」で終わる構成。

### 3.10 SCRAP リアル脱出ゲーム for kids ― 日本の親子謎解きの作法
- **仕組み**：6歳以上で保護者同伴、子どもは最大半額。ファミリーキットは難しさを調整し、難しい漢字にふりがなを付ける。
- **本作への示唆**：日本の親子謎解きには**ふりがなと難しさの調整が前提**という作法がある。PR #1は漢字が多くふりがなもない（`11-hands-on-playthrough.md` 3項）ので、この作法から外れている。

### 3.11 Monument Valley ― 一度払えば、短く美しく、思い返せる
- **仕組み**：$3.99の買い切りで約2時間。2,600万超（2016年、無料配布期間を含む可能性あり）。2は母と娘の物語で、「母と遊んで泣いた」という声がある。
- **本作への示唆**：**短さは欠点ではなく価値になりうる**。ただし「余韻」と「思い返す場」がそろってこそ。救出後のエピローグと「思い出カード」をそこに当てる。

### 3.12 鬼から電話・AIサンタ ― 強い魔法の反面教師
- **鬼から電話**：シリーズ2,500万DL。恐怖でしつけることへの懸念がある。
- **AIサンタ**：「何時間も話す」利用、本物との区別の難しさ、会話記録やアフィリエイト。児童団体が警告している。
- **本作への示唆**：**サンタは子どもを叱らない、見張らない、際限なく話し続けない。** 声は録音の台詞（原作の台詞、`prototype/` のGemini TTS資産）で、毎回同じ温かさで返す。

---

## 4. 転用できるパターン（15個）

各項目の構成：**パターン名**／根拠となる製品／サンタの脱出での具体的な形／優先度（★3が最優先）

1. **大人の出番は台本として渡す** ★★★
   根拠：おとうさんスイッチ、Little Orpheus、Cooney「大人を支える足場」。
   形：画面の台詞に「大人が読むところ」の印を付ける。サンタの台詞は大人が声色で読む（「わしはサンタ、サンタクロースじゃ」）。録音音声は切り替えられる（読む／聞く）。

2. **情報を分ける（サンタの手帳）** ★★★
   根拠：Keep Talking、Unlock! Kids、Jackbox（ブラウザをコントローラーにする）。
   形：子どもは絵を触る（雪をこする、ダイヤルを回す、紙を並べる）。大人は「サンタの手帳」を読む（印刷用PDF、またはQRでつなぐ大人のスマホ）。**制限時間なし**。

3. **手を動かす主役は子ども** ★★★
   根拠：Pok Pok、Hidden Folks、Lost in Play、EXIT/Unlock Kids（物を置く手応え）。
   形：雪はボタンでなく指でこする。ふたは引き上げる。6枚の紙は子がドラッグする。PR #1で「調べてみる」ボタンを3回押す操作（`11-hands-on-playthrough.md` 5項）を、こする操作に置き換える。

4. **ヒントは物語の中に（スノードームのサンタに聞く）** ★★★
   根拠：Chicory、Lost in Play、Samorost/Machinarium、Lumino City、Hidden Folks。
   形：サンタが3段階で手がかりを出す（例：赤箱「あの絵の動物、なにかのう」→「たぬきは"た"を抜く」→答え）。**3段目は大人だけが開ける**（ペアレンタルゲート式の簡単な確認）。広告は絶対に使わない。

5. **詰まらない・負けない・急かさない** ★★★
   根拠：A Little to the Left「Let it be」、Overcooked アシスト、マリオワンダー、カービィ「はるかぜモード」。原作も誤答で救出を止めない（`design/FULL-GAME-DESIGN.md:21`）。
   形：「あとでにする」で他の箱へ移れる。時間制限なし。間違えても温かい返事。

6. **声に出す・体を動かす儀式** ★★★
   根拠：おとうさんスイッチ、Keep Talking（声が大きくなる）、Wandersong（歌）【二次】、原作がスマートスピーカーの声のゲームだったこと。
   形：「だいすきだよ」は**家族で声をそろえて言う**場面にする（マイクは任意で、端末内で判定のみ。または「みんなで言えた！」ボタン）。「シカ10回」は子がまほう使い役、大人が言う役。

7. **大人が仕掛け人になる準備画面（5分以内）** ★★★
   根拠：PNP、Elf、サンタの手紙、Advent Calendar 2025（親が中身を選ぶ）。
   形：大人だけの画面で、子の呼び名、サンタに言ってほしい一言、何夜に分けて遊ぶかを選ぶ。印刷する場合は「6枚の紙」を家の中に隠す（任意）。**個人データは端末の外に出さない。**

8. **現実のクリスマスの夜へ橋渡し** ★★★
   根拠：NORAD、Google Santa Tracker（24日夜）、サンタの手紙、東京駅サンタ謎。原作の結末「クリスマスの夜を楽しみにしていてくれ」（`prototype/full-scenario.js:33`、章題は81行）。
   形：救出後、**12/24の夜にだけ開く短いエピローグ**（サンタがソリで出発する、まほう使いも一緒に手伝う）。25日朝に「サンタからのお礼の手紙」（印刷用）。

9. **毎晩15〜20分ずつ（アドベント＋つづく）** ★★
   根拠：Unlock! Kids（20分）、Little Orpheus（15〜20分）、Santa Tracker、Jacquie Lawson。
   形：第1夜は導入と赤箱、第2夜は青箱、第3夜は黄箱、第4夜は六文字・まほう使い・救出、24日夜はエピローグ。毎晩サンタが「つづきはまたあしたの夜じゃ」と言う。

10. **大人にも刺さる二重の層** ★★
    根拠：セサミストリート（Cooney「複数の層」）、Hidden Folksのユーモア、Monument Valley 2の子育ての比喩。
    形：たぬき算・負けるが勝ちの言葉遊び。まほう使いの寂しさは大人にとって「かまってあげられなかった自分」の鏡になる。救出の場面に**大人だけが気づく一行**を置く。

11. **関係を映す物語（見張らないサンタ）** ★★
    根拠：Monument Valley 2（母と娘）、The Gardens Between（友情）。反面教師はElf、鬼から電話、PNPの良い子・悪い子判定。
    形：サンタは「いい子にしてるか」を問わない。テーマは「一緒に遊ぶ」。結末でサンタがまほう使いに謝り（原作にはない、【要判断】）、大人が子へ「だいすきだよ」を返す。

12. **一度払う／無料・広告なし・データを取らない** ★★
    根拠：Monument Valley（$3.99）、Lost in Play（$5.99で全編）、Jacquie Lawson（£8）、App Storeの子ども向けカテゴリ規則、Radesky 2022。
    形：Webで無料公開し、解析は使わない（使うとしても、アクセス数だけを数える自前の計測に限る）。収益化するなら「印刷キット」や「次の年の物語」を買い切りで。

13. **一緒に作ったものが残る** ★★
    根拠：おとうさんスイッチ（家族版の映像）、Google Elf Maker、Jacquie Lawson（家を飾る）、PNPの反応録画、Cooney「共同制作」。
    形：救出後に**「わが家の救出記念カード」**（子が選んだ飾り、呼び名、日付）を印刷・保存できる。オーナメントの絵を選んでサンタのソリに飾る。

14. **紙と画面を行き来する** ★
    根拠：EXIT/Unlock Kids、Keep Talking（印刷したマニュアル）、Etsyの印刷用脱出ゲーム、ウィズリン（切り取るパズル）。
    形：6枚の紙を印刷用に用意し、大人が隠して子が見つける宝探しにする。集めた紙をテーブルで並べて「だいすきだよ」。画面は確認役に回る。

15. **離れた家族も参加できる** ★
    根拠：Caribu、Cooney（読み聞かせ録音の5%が祖父母二人）。
    形：ビデオ通話をしながら、祖父母が「サンタの手帳」を読む役になる（リンクを共有するだけ。アカウント不要）。

---

## 5. アンチパターン（親が嫌うもの・避けるべきもの）

1. **広告、特に広告を見ないとヒントが出ない仕組み**
   日本の無料脱出アプリの定番。For SANTAは広告と課金あり。ある「Santa Claus」系ゲームは収益の76%が広告。
   → 本作では**広告ゼロ**にする。

2. **課金の圧力・ペイウォール**
   Toca Boca Worldの課金への不満、Sago Miniの「無料部分が少なすぎる」、PNPの追加販売、AIサンタの分単位課金（$3.99で2分〜）。
   → 物語の途中に課金の壁を置かない。

3. **子どもの個人データ・写真・会話の収集**
   PNPの写真入力、AIサンタの会話記録とアフィリエイト、「広告なし」でも外部の解析SDKを入れている例（しまじろうのプライバシー欄、要原文確認）、Appleの規則。
   → 呼び名だけを端末内に保存し、送信しない。

4. **操作的なデザイン**（Radesky 2022：操作的なデザインがないアプリは20%だけ）
   キャラクターとの関係を使った圧力（「サンタが悲しんでいるよ、早く戻って」）、作られた時間制限、ご褒美による引き延ばし。
   → **サンタは子どもに罪悪感を抱かせない。** 通知や催促はしない。

5. **刺激が強すぎる**
   点滅、大音量の繰り返し、派手なご褒美の演出。対照はPok Pokの刺激の少なさ。
   → 寝る前に遊ぶ前提で、**静かで温かい音と光**にする。

6. **子どもが詰まって泣く・時間に追われる**
   Overcookedで子が大泣きした、Unlock! Kidsで説明と違う展開に子が不安になった。
   → 制限時間なし、段階ヒント、「あとでにする」。

7. **大人が退屈する／逆に大人が主導権を奪う**
   EXIT Kidsで10歳が退屈した。Overcookedで親が熱くなって子に怒鳴った。
   → 役割を分ける（手は子、手帳は大人）。大人は答えを言わず手がかりを読む、と台本で決めておく。

8. **恐怖や罰で動かす・見張る**
   鬼から電話、Elfの見張り役、「いい子にしているか」を問うサンタ電話。
   → 本作のテーマ（寂しさ→一緒に遊ぶ）と正反対なので、**入れない**。

9. **親の準備が地獄になる**
   Elf on the Shelfの燃え尽き、SNSでの競い合い、印刷用脱出ゲームの準備負担。
   → 大人の仕掛けは任意で、5分以内。

10. **AIのサンタが際限なく話す・本物らしさを偽る**
    Tavusで1日何時間も話す利用、Fairplayの警告。
    → 生成AIの自由会話は子どもに直接つながない。台詞は録音と台本で。

11. **短くて高い・季節を外す**
    Bluey（$40で90分）、For SANTAは12/27に公開。
    → 値付けは短さに見合うように（無料か少額の買い切り）。**12/1までに公開**する。

---

## 6. 競合の空白地帯：サンタの脱出が取れる場所

### 6.1 位置づけ（2軸の比較）

縦軸：**共遊の設計の深さ**（偶然任せ→役割を設計）。横軸：**クリスマスの魔法と現実へのつながり**（なし→現実の24日・25日とつながる）。

| | 魔法・現実とのつながり：弱い | 中 | 強い |
|---|---|---|---|
| **共遊を設計している** | EXIT/Unlock Kids、Keep Talking、It Takes Two | SCRAP for kids（会場型）、東京駅サンタ謎（周遊型）、Etsyの印刷用脱出 | **（空白）←本作の狙い** |
| **共遊は偶然任せ** | Lost in Play、Hidden Folks、Monument Valley、Gorogoa | Santa Tracker（ミニゲーム）、Jacquie Lawson | PNP（見るだけ）、NORAD（電話・地図）、サンタの手紙 |
| **一人遊び・低品質** | 日本の無料脱出アプリ（広告ヒント） | For SANTA、Santa's Christmas Village | AIサンタ（長時間会話、リスク） |

【推定】**右上（共遊を設計していて、現実のクリスマスに強くつながる）**が空いている。SCRAPと東京駅サンタ謎はそこに近いが、**会場に行く必要がある**。Etsyの印刷用は**親の準備が重く、絵と物語の質が低い**。PNPは**子どもが何もしない**。

### 6.2 本作だけが持てるもの

1. **「見張らないサンタ」というテーマ**。サンタものの主流は良い子・悪い子の判定（Elf、PNP、サンタ電話）。本作の救出条件は「一緒に遊ぶこと」（`design/FULL-GAME-DESIGN.md:21`）。親が「これを子どもと遊びたい」と思える倫理的な理由になる【推定】。
2. **原作が声のゲームだった来歴**。「だいすきだよ」を声に出す儀式、「シカ10回」の言葉遊び。声に出す要素は、AIサンタ以外のクリスマスアプリには見当たらない【推定・今回の範囲】。
3. **大人も唸る謎**（たぬき算、負けるが勝ち、8848）。EXIT Kidsで10歳が退屈するような問題を越えられる【推定。`01-original-story.md` §0-5】。
4. **絵の質**。PR #1の絵は「大人が『きれい』と言う水準」（`11-hands-on-playthrough.md` 1項）。印刷用脱出ゲームや無料脱出アプリとは段違い【推定】。
5. **Webで無料配布**。インストールもアカウントも不要で、リンクを祖父母にも送れる。Santa Trackerと同じ配り方ができ、App Storeの子ども向けカテゴリ審査も通らずに済む（ただし同じ水準の倫理は自分で守る）。

### 6.3 空白を取るための最小条件（ベンチマークからの逆算）【推定】

| 条件 | 根拠となる事例 | PR #1の現状 |
|---|---|---|
| 音（声・効果音・BGM） | Little Orpheus、Hidden Folks、学研の全問読み上げ | なし（JSに音声APIの呼び出し0件）【リポ】。`prototype/` にGemini TTSの資産あり |
| ふりがな・読み聞かせモード | SCRAPファミリーキット、学研 | なし（`11-hands-on-playthrough.md` 3項） |
| 物語内の段階ヒント | Lost in Play、Chicory、Samorost | なし（「ヒント」の文字列0件）【リポ】 |
| 大人の役割（手帳） | Keep Talking、Unlock Kids | なし |
| 声に出す儀式 | おとうさんスイッチ | 文字入力（`letters/word-math.js:13-14`）【リポ】 |
| 夜ごとの章立て | Little Orpheus、Unlock Kids | 1回で通す構成 |
| 24日夜とのつながり | NORAD、Santa Tracker | 結末の一行だけ |
| 広告・課金・解析なし | Monument Valley、Apple規則 | 満たしている（静的なWeb）【推定】 |
| 12/1までに公開 | Santa Tracker（12/1開始）、For SANTA（12/27の失敗例） | 残り53日 |

---

## 7. 設計への提言（ベンチマークから言えること）

1. **ポジション**：「親子で4夜かけて解く、見張らないサンタのクリスマス謎解き絵本。広告なし、データなし、24日の夜につながる」。
2. **最初に作るべき3点**（効果が大きく、既存資産で作れる）：
   - 声と読み聞かせモード：`prototype/` の録音音声を絵本版に接続し、ふりがなを付ける。
   - スノードームのサンタが出す3段階ヒント。
   - 「だいすきだよ」を家族で声に出す場面（マイクは任意）。
3. **次に作る3点**：
   - 大人だけの準備画面（呼び名、夜の分け方）。
   - 印刷用の「サンタの手帳」と6枚の紙。
   - 24日夜だけ開くエピローグと、25日朝の手紙。
4. **やらないこと**：広告、課金の壁、写真・実名の収集、AIの自由会話、制限時間、良い子・悪い子の判定、通知による催促。
5. **時期**：Google Santa Trackerは12/1から村を開いていく。**12/1（53日後）に第1夜を公開できるか**が、今年の勝負どころ。章を日付で開く形なら、12月中に後の章を追加で公開する余地も残る【推定】。

---

## 8. 出典

**子ども・家族向けアプリ**
- Pok Pok：https://apps.apple.com/us/app/pok-pok-montessori-preschool/id1550204730 ／ https://www.educationalappstore.com/app/pok-pok ／ https://www.commonsensemedia.org/app-reviews/pok-pok-playroom ／ https://techcrunch.com/2022/06/15/edtech-company-pok-pok-raises-3m-expand-digital-play-experiences-kids ／ https://news4jax.com/deals/2025/04/24/a-screen-time-solution-parents-actually-love-meet-pok-pok
- Toca Boca：https://www.axios.com/2018/11/21/toca-boca-in-app-purchases-toca-life-world ／ https://www.commonsensemedia.org/app-reviews/toca-life-world ／ https://kimola.com/reports/comprehensive-toca-boca-world-user-feedback-report-google-play-en-us-155698 ／ https://gamesbeat.com/how-toca-boca-got-100m-mobile-downloads-by-putting-kids-first/ ／ https://www.pocketgamer.com/articles/052067/r/
- Sago Mini：https://apps.appfollow.io/ios/sago-mini-world-kids-games/874425722?country=us
- Lost in Play：https://en.wikipedia.org/wiki/Lost_in_Play ／ https://www.pluggedin.com/game-reviews/lost-in-play/ ／ https://roomescapeartist.com/2024/10/25/lost-play-review/ ／ https://toucharcade.com/2023/06/15/puzzle-adventure-game-lost-in-play-mobile-release-date-price-preorder-iphone-preregister-android/ ／ https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards
- Hidden Folks：https://www.macstories.net/reviews/hidden-folks-a-whimsical-game-of-exploration/ ／ https://screenwiseapp.com/media/hidden-folks-game ／ https://www.appunwrapper.com/2017/02/15/hidden-folks-review/ ／ https://dekudeals.com/items/hidden-folks
- Amanita Design：https://www.commonsensemedia.org/game-reviews/samorost-3 ／ https://strategywiki.org/wiki/Machinarium/Gameplay ／ https://samorost.fandom.com/wiki/Book_of_Hints ／ https://www.appunwrapper.com/2016/09/05/samorost-3-ios-review/
- Gorogoa：https://www.gamerevolution.com/review/360371-gorogoa-review-short-visual-sensation ／ https://apps.apple.com/app/1269225754
- Little Orpheus：https://www.thesixthaxis.com/2020/06/12/little-orpheus-review/ ／ https://toucharcade.com/2021/01/14/little-orpheus-episode-nine-release-date/
- Lumino City：https://www.tapsmart.com/games/review-lumino-city-handmade-puzzle-adventure-game-hits-ios/ ／ https://www.pcgamesn.com/lumino-city/lumino-city-pc-review ／ https://store.steampowered.com/app/205020
- Wandersong：https://www.nookgaming.com/wandersong-review/ ／ https://en.wikipedia.org/wiki/Wandersong
- The Gardens Between：https://thesixthaxis.com/2018/09/19/the-gardens-between-review ／ https://rawg.io/games/13172 ／ https://www.pocketgamer.com/the-gardens-between/apple-arcade-release
- Unpacking：https://www.commonsensemedia.org/game-reviews/unpacking ／ https://www.nintendolife.com/news/2021/12/indie-hit-unpacking-sold-over-100k-units-in-just-10-days ／ https://multiplayer.it/notizie/unpacking-ha-venduto-piu-di-milione-di-copie.html
- Monument Valley：https://en.wikipedia.org/wiki/Monument_Valley_(video_game) ／ https://en.wikipedia.org/wiki/Monument_Valley_3 ／ https://screenwiseapp.com/guides/monument-valley ／ https://www.fandom.com/articles/monument-valley-2-review-a-powerful-journey-about-motherly-love
- Chicory：https://en.wikipedia.org/wiki/Chicory:_A_Colorful_Tale ／ https://www.co-optimus.com/game/11051/nintendo-switch/chicory-a-colorful-tale.html
- A Little to the Left：https://fingerguns.net/reviews/2022/11/07/a-little-to-the-left-review-pc-puzzle-palace/ ／ https://dekudeals.com/items/a-little-to-the-left-switch

**日本**
- NHKキッズ：https://resemom.jp/release/prtimes/20191119/58366.html
- ピタゴラスイッチ うたアプリ：https://apps.apple.com/jp/app/id909225086 ／ https://gigazine.net/news/20180701-pitagora-uta-app-5-set/
- しまじろうクラブ：https://apps.apple.com/jp/app/id1546176901
- 学研：https://apps.apple.com/jp/app/id6444698979
- ワオっち!：https://resemom.jp/release/prtimes/20200720/64070.html ／ https://appllio.com/app-waocchi
- ごっこランド：https://edinetdb.jp/company/E39449/text ／ https://ascii.jp/elem/000/004/099/4099258/
- PIBO：https://apps.apple.com/JP/app/id765195011
- ミッケ!：https://hugkum.sho.jp/388722
- 東大ナゾトレ／ウィズリン：https://hugkum.sho.jp/118522 ／ https://hugkum.sho.jp/669842
- 鬼から電話：https://kyodonewsprwire.jp/release/202312224701 ／ https://apps.apple.com/JP/app/id566799704
- 日本の脱出アプリのヒント広告：https://apps.apple.com/jp/app/id1245376733
- SCRAP for kids：https://realdgame.jp/kids/ ／ https://www.atpress.ne.jp/news/8867732 ／ https://news.denfaminicogamer.jp/news/2407082c
- 東京駅サンタ謎ほか：https://report.iko-yo.net/articles/28865 ／ https://kids.rurubu.jp/article/216295/

**協力・非対称**
- It Takes Two／Split Fiction：https://en.wikipedia.org/wiki/It_Takes_Two_(video_game) ／ https://gamingbolt.com/it-takes-two-has-sold-23-million-units-a-way-out-at-11-million/amp ／ https://insider-gaming.com/split-fiction-is-on-course-to-outsell-it-takes-twos-20-million-copies/
- Keep Talking：https://www.schoollibraryjournal.com/story/video-games-weekly-keep-talking-and-nobody-explodes ／ https://www.co-optimus.com/game/5303/nintendo-switch/keep-talking-and-nobody-explodes.html
- マリオワンダー：https://esrb.org/blog/what-parents-need-to-know-about-super-mario-bros-wonder ／ https://kiddiehood.com.au/blog/review-super-mario-bros-wonder-nintendo-switch/
- ギャラクシー：https://www.mariowiki.com/Star_Pointer
- カービィ：https://shacknews.com/article/129489/how-to-play-co-op-kirby-and-the-forgotten-land
- Overcooked：https://www.commonsensemedia.org/game-reviews/overcooked ／ https://screenwiseapp.com/guides/overcooked-2-the-game
- Jackbox：https://jackboxgames.com/streaming-moderation-accessibility-features-jackbox-party-pack-eight
- Caribu：https://www.nextavenue.org/technology-makes-virtual-playdates-possible/ ／ https://www.romper.com/p/the-caribu-video-calling-app-lets-kids-play-virtual-games-read-with-family-22767309
- Bluey：https://www.pcgamer.com/bluey-the-videogame-review/ ／ https://www.xboxtavern.com/bluey-the-videogame-review/

**ボードゲーム・謎解き**
- EXIT Kids：https://roomescapeartist.com/2023/07/05/exit-game-kids-jungle-riddles-kids-review/ ／ https://www.meeplemountain.com/reviews/exit-the-game-kids-jungle-of-riddles/
- Unlock! Kids：https://roomescapeartist.com/2023/07/25/asmodee-unlock-kids-detective-stories-kids-review/ ／ https://dicetower.com/board-game/327056
- Escape Room in a Box：https://opinionatedgamers.com/2016/04/12/escape-room-in-a-box-the-werewolf-experiment/
- Etsyの印刷用：https://partywowzy.patternbyetsy.com/listing/4360916909/santa-rescue-from-toy-factory-printable ／ https://www.etsy.com/listing/1556121085

**クリスマス**
- PNP：https://arlingtontx.macaronikid.com/articles/691b4069b8e82af90cfa1ea4/how-portable-north-pole-kept-the-magic-alive-for-my-kids- ／ https://sanoma.portablenorthpole.com/hc/en-us/articles/360018614591-What-is-the-Magic-Pass ／ https://www.playdaysandrunways.co.uk/2019/11/portable-north-pole-magic-pass.html ／ https://justuseapp.com/en/app/902026228/pnp-portable-north-pole/reviews
- Google Santa Tracker：https://en.wikipedia.org/wiki/Google_Santa_Tracker ／ https://betanews.com/article/google-makes-santa-tracker-open-source-on-github-will-you-fork-santa-claus/ ／ https://www.googlewatchblog.de/?p=258226
- NORAD：https://en.wikipedia.org/wiki/NORAD_Tracks_Santa ／ https://www.afrc.af.mil/News/Article/561324/norad-tracks-santa-program-breaks-record
- Elf on the Shelf：https://www.nbcconnecticut.com/holidays/elf-on-shelf-story-how-christmas-tradition-began/3673675/ ／ https://pymnts.com/news/retail/2023/how-elf-on-the-shelf-co-founder-turns-tradition-into-retail-success ／ https://gulfnews.com/parenting/mums-dads/5-reasons-parenting-experts-dislike-elf-on-the-shelf-1.1607439044480 ／ https://www.fox5atlanta.com/video/1560109
- サンタの手紙：https://www.post.japanpost.jp/int/ems/greeting/special/santaletter.html ／ https://allabout.co.jp/gm/gc/408808/ ／ https://www.rcinet.ca/eye-on-the-arctic/?p=20842
- Santa's Christmas Village：https://www.commonsensemedia.org/app-reviews/santas-christmas-village ／ https://appgoblin.info/apps/948165343
- Jacquie Lawson：https://www.easterneye.biz/jacquie-lawson-2025-advent-calendar/ ／ https://everyday-reading.com/jacquie-lawson-advent-calendar/
- Advent Calendar 2025：https://apps.apple.com/vc/app/advent-calendar-2025/id6738931350
- サンタから電話（日本）：https://app-liv.jp/articles/153296/ ／ https://apps.apple.com/jp/app/id1486137263
- AIサンタ：https://techcrunch.com/2025/12/10/ai-startup-tavus-founder-says-users-talk-to-its-ai-santa-for-hours-per-day ／ https://getcoai.com/news/ai-santa-clause-may-actually-be-keeping-a-list-on-you/ ／ https://www.mlexwatch.com/ftcwatch/articles/2419409
- For SANTA：https://apps.apple.com/app/id6755115682

**研究・規制**
- Cooney Center JME（2011）：https://joanganzcooneycenter.org/publication/the-new-coviewing-designing-for-learning-through-joint-media-engagement/ （本文はscratchpadの `_coviewing.txt` で確認）
- AAP：https://www.healthychildren.org/English/family-life/Media/Pages/why-co-viewing-is-important-tips-to-share-screen-time-with-your-kids.aspx
- Radesky 2022：https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/ ／ https://www.michiganmedicine.org/health-lab/design-tricks-commonly-used-monetize-young-childrens-app-use
- App Store 子ども向けカテゴリ：https://9to5mac.com/2019/06/03/apple-kids-privacy/ ／ https://developer.apple.com/forums/thread/117320

**リポジトリ内**
- `design/FULL-GAME-DESIGN.md:21`（後半の約束は遊ぶこと）
- `prototype/full-scenario.js:33`（救出と結末の台詞）、`:81`（章題「クリスマスの夜を、楽しみに。」）
- `prototype/scenario.js:9-11`（導入）
- `illustrated-prototype/letters/word-math.js:13-14`（合言葉の文字入力と別表記）
- `prototype/full-app.js:85`、`prototype/app.js:115`（「絵の下を調べる（原作のヒント）」。声つき版にだけ原作のヒント導線がある）
- 参照した他担当のレポート：`design/family-2026/research/01-original-story.md`、`design/family-2026/research/11-hands-on-playthrough.md`
