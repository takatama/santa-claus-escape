# 10. 技術の選択肢と推奨スタック：大人と子どもが一緒に遊ぶ「動く絵本」型の謎解き

- 作成日：2026-10-09（クリスマスまで約11週）
- 対象：`リポジトリのルート`（ブランチ `codex/illustrated-full-journey` = PR #1 の head）
- 立場：Web とモバイルの技術顧問。調査と設計だけを行い、実装はしない。リポジトリは一切変更していない
- 凡例
  - 【確認】リポジトリの読解か、Web の一次情報（公式ドキュメント、リリースノート、caniuse）で確かめた事実
  - 【計測】このセッションで実際に測った値。条件も書く
  - 【推測】根拠からの推論。実機での確認が必要
- 作業ファイル（いずれも scratchpad 内）
  - `design/family-2026/bench/`：Canvas 2D と WebGL2 でメッシュ描画を比べるベンチ
  - `（調査用の一時領域）/enc/`：intro.wav を各形式にエンコードした比較用のファイル

---

## 0. 結論（先に要約）

1. **描画**：「絵が生きて動く」表現は、いまの Canvas 2D のままでは中位の Android や古い iPad で重くなる見込みが高い。原因はメッシュ変形の方式にある。1三角形ごとに clip をかけて画像全体を drawImage しており、赤い箱の場面では1フレームに **1,104回** 呼ぶ。【確認】
   - 同じ変形を WebGL2 で描くと、JS 側の負荷は **約1/7**（M1 で 2.3ms → 0.33ms）だった【計測】
   - そこで、12月版は**依存ゼロの小さな WebGL2 合成レイヤー**（背景、メッシュ、雪、光）を自作するのを推奨する。UI は DOM と CSS のまま
   - Rive（キャラクターの状態機械）と PixiJS v8 は長期版で検討する。Spine は有償ライセンスが要り、Lottie は塗りの絵に合わないため、優先度を下げる
2. **音声**：台詞の WAV（24kHz・モノラル・16bit）は形式を変えるだけで 1/7〜1/16 になる【計測】
   - 本編で使う68本・834秒（40.4MB）は、AAC-LC 48kbps なら約5.3MB、Ogg Opus 24kbps なら約2.6MB になる
   - iOS で Ogg Opus と Ogg Vorbis を再生できるのは iOS 18.4 以降だけ【確認】。基準の形式は **AAC（m4a）** にするのが安全
   - 画像を WebP にする分と合わせると、作品全体が **約11〜15MB** に収まる【推測】。Service Worker で「おうちで準備（全部ダウンロード）」ができる大きさになる
3. **複数端末**：12月版は**サーバー無し**にする。親のスマホを「サンタの無線機」にする静的ページを用意し、絵本の画面に出す QR から開く
   - 2027年版で、Cloudflare Durable Objects の WebSocket 部屋（QR で参加、アカウント無し）を入れる
   - 無料枠は1日10万リクエスト。1回の遊びで約25リクエストなので、**1日約4,000組まで無料**の計算になる【確認＋推測】
   - Presentation API は Safari に無い【確認】。テレビへの表示は、OS の画面ミラーリング（AirPlay や Chromecast）に任せる
4. **音声入力**：「シカを10回言う」と「だいすきだよ」は、**声に出す遊びとして残す**。ただし**音声認識で判定しない**
   - 理由1：iOS では Siri のサーバーに音声が送られる。しかもホーム画面のアプリとして起動すると認識が動かない【確認】
   - 理由2：子どもの声は大人より認識の誤りがずっと多い（英語の研究で、大人3% に対して子ども25%）【確認】
   - 代わりに、親が判定する（無線機で「ソリ／トナカイ」を押す）か、端末内だけで声の**大きさ**を測る音量メーターで「魔法が光る」演出にする
5. **カメラ・AR・印刷**：iPhone と iPad の Safari には WebXR の AR が無い【確認】
   - 印刷できる手がかりカードと、子どもの名前を入れた「サンタからの感謝状」を、端末内で作る（Canvas から PNG にするか、印刷用 CSS を使う）
   - QR は OS のカメラで読ませ、情報は**カードそのもの**（数字や絵）に載せる。Safari とホーム画面のアプリは保存領域が分かれている可能性が高い【推測】ため
6. **配布形態**：12月版は **PWA**（Cloudflare Pages の静的配信）にする。App Store と Google Play の子ども向けカテゴリーは、2027年に Capacitor 8 で包んで出す
   - 審査、子ども向けカテゴリーの規約（第三者の解析を原則禁止、外部リンクには保護者用のゲート）、Gemini TTS の規約を、11週で片づけるのは危険
7. **ビルドとテスト**：実行時のコードは素の ES モジュールのまま（ビルド不要）にする。素材変換と precache 用のマニフェストを作る **Node スクリプト**を足し、Playwright で E2E と見た目の差分テストを入れる
   - Vite 8（2026年3月公開、Rolldown を内蔵）は、TypeScript や npm の描画ライブラリを入れる段階で導入すればよい

---

## 1. 出発点：今のコードの技術的な特徴

### 1.1 事実の一覧

| 項目 | 現状 | 根拠 | 新アプリへの影響 |
|---|---|---|---|
| ページ構成 | 場面ごとに別の HTML（intro, explore, red-box, blue-box, yellow-box, letters, witch, rescue）。8つの `*/main.js` と共通の `main.js` で計3,595行 | `illustrated-prototype/*/main.js` | ページを移るたびにメモリが解放される。一方で、場面をまたぐ演出（音楽を切らさない、など）は難しい |
| 描画 | Canvas 2D、`alpha:false`、DPR の上限は2 | `red-box/main.js:11`、`:148` | DPR の上限は妥当。ただしメッシュ描画が重い（次の行） |
| メッシュ変形 | 1三角形ごとに `save → clip → transform → drawImage(画像全体) → restore` | `rescue/paint.js:30-61` | 赤い箱の場面で1フレームあたり、枝 9×12×2×2=432、蓋と雪 12×7×2×2=336、球 12×14×2=336、**計1,104回** |
| 動きのモデル | 「すべての見た目は、戻せる1つの進行度の純粋関数」 | `scene-math.js:7-21` | **大きな強み**。テストで値を固定でき、端末間の同期も「進行度」を送るだけで済む |
| 画像の読み込み | 素材ごとに JS で全画素を走査し、透明な余白を切り取る | `rescue/paint.js:1-20`、`red-box/main.js:481-482`（PNG 6枚） | 1312×1199 なら157万画素を JS で回す。中位の Android では1枚あたり数十 ms 以上かかる見込み【推測】。**ビルド時に切り取っておくべき** |
| 画像の量 | 実行時に使う PNG は17枚・34.7MB。1ページで7.5〜20.3MB | `05-assets…md:38`、`04-pr-code-review.md:40` | WebP にした試算は18枚で4.2MB（約1/8）【確認：`（調査用の一時領域）/webp/`】 |
| 声 | WAV 83本・合計1,197.6秒・73.2MB。うち BGM の WAV が2本（44.1kHz ステレオ、25.6MB）。台詞は 24kHz・モノラル・16bit の PCM | 【計測】ffprobe | 形式を変えれば1桁以上小さくなる（§3） |
| 音の再生 | 台詞は `new Audio()`。BGM は `AudioContext` と `createMediaElementSource` を通して音量を制御する。Ogg が使えない環境では WAV に切り替える | `prototype/soundtrack.js:4,24,31`、`prototype/speech.js:64-80` | iOS 18.3 以前では BGM に WAV（12〜13MB）を落とす |
| 数字の読み上げ | 間違えた番号を読むとき、短いクリップを7本続けて再生する（前置き、数字4つ、「に合わせました」「開きませんでした」） | `prototype/full-audio.js:14-19` | `HTMLAudio` で順に鳴らすと継ぎ目に隙間ができやすい【推測】。AudioBuffer で時刻を指定して鳴らせば継ぎ目なく繋がる |
| 合成音声への退避 | 音声ファイルが失敗したら `speechSynthesis` で読む | `prototype/speech.js:62-63,83-112` | 良い設計。新アプリにも残す |
| 保存 | `localStorage` のキー `santa-illustrated-journey-v1` に世代番号つきで保存し、複数タブの食い違いを防ぐ | `journey/store.js:3,11-21,61` | 端末をまたぐ同期には使えない。Safari の「7日ルール」で消える危険がある（§3.5） |
| ゲームの状態 | 純粋なリデューサー（`send(state, event)`） | `witch/test.mjs:22`、`journey/state.js` | **イベントを中継すれば端末間で同期できる**。複数端末にしやすい |
| 配信時のヘッダー | `Permissions-Policy: camera=(), microphone=()`、CSP は `connect-src 'self'` | `scripts/build-pages.mjs:17` | マイクや他ホストへの WebSocket を使うには変更が要る |
| Pages のビルド | `assets/audio` の wav/mp3/ogg をすべて許可し、1ファイル25MiBまでを検査 | `scripts/build-pages.mjs:5,15` | 使っていない WAV も配信される（05の報告）。圧縮版だけを出すべき |
| 試験 | ユニットテスト11本で **97件 PASS、失敗0、2.2秒**。静的検査で JS 51ファイル、参照218件 | 【計測】`npm test`、`npm run check` | 論理の試験は手厚い。ブラウザの自動試験は無く、QA の画像212枚は手作業で撮っている |
| 台詞の持ち方 | 原作の台詞を JS に**そのまま写して**持っている | `intro/story.js:1-2`、`witch/conversation.js:30-42` | データ（JSON/YAML）に分ければ、多言語化とエピソード追加がしやすくなる |
| 設計の仕様 | `design/full-game-spec.json`（5.9KB）が箱、合言葉、魔法使いを構造化して持っている | `design/check-flow.mjs` | エピソード用の形式の土台に使える |

### 1.2 計測：メッシュ変形を Canvas 2D と WebGL2 で比べた

- 条件
  - 機材：Apple M1、Chrome 152、1280×720 の CSS 画素
  - 中身：背景と、赤い箱の場面と同じ素材・同じ分割数のメッシュ（1,104三角形）を毎フレーム描く
  - 測り方：各120フレーム。JS が描画命令を出すのにかかった時間を測った（`design/family-2026/bench/bench.js`）
- 【計測】結果

| 方式 | DPR 1 | DPR 2 | 4倍の負荷（DPR 2） |
|---|---|---|---|
| Canvas 2D（現行の `mesh()`） | 2.32ms/フレーム | 2.27ms | 8.07ms |
| WebGL2（メッシュ1つにつき描画1回） | 0.33ms | 0.30ms | 1.22ms |

- 読み方
  - M1 ではどちらも 60fps（16.7ms 間隔）を保った。04 の報告とも一致する
  - JS 側の負荷は WebGL2 が**約1/7**。Canvas 2D は clip の経路を GPU で描く費用もかかるが、上の数字には入っていない
  - `getImageData` で読み戻して GPU の分まで含めようとも試した。しかし読み戻し自体の費用が大きく値が不安定だったので、採用しない
- 【推測】中位の Android（2023〜24年の Snapdragon 7 系など）の JS 性能は、M1 の約1/3〜1/5
  - Canvas 2D は命令を出すだけで1フレーム7〜12ms かかり、clip を描く費用が上に乗る
  - 枝が風で揺れ続けるような常時のアニメーションを足すと、30fps を割る恐れがある
  - 今は操作したときだけ描き直す（04 で確認済み）ので問題が表に出ていない
  - **「生きている絵」の方向へ進むなら、描画方式の変更はほぼ必須**

---

## 2. 描画とアニメーション：絵を生きて動かす

### 2.1 求める表現（設計からの要求）

| 表現 | 例 | 必要な技術 |
|---|---|---|
| 降る雪、積もった雪のきらめき | 森、箱の蓋 | 粒子（数百〜数千）、加算合成 |
| 灯りの揺らぎ、温かい光 | ランタン、球の中のサンタ | 放射状のグラデーション、シェーダーでの揺らぎ |
| 風で揺れる枝、息づく布 | 前景の枝、魔法使いのマント | メッシュ変形（いまの `boughPoint`） |
| 視差（奥行き） | 背景、中景、前景を傾きや指で少しずらす | 層ごとの平行移動 |
| キャラクターのまばたき、口の動き、反応 | サンタ、魔法使い、タヌキ | 骨格やメッシュのアニメーションと状態機械 |
| 物を触る感覚 | 雪を払う、蓋を開ける、ダイヤル錠 | 指の入力、進行度の関数（いまの方式） |
| 画面切り替え、文字カードの演出 | 手紙、台詞の吹き出し | DOM と CSS、View Transitions、WAAPI |

### 2.2 選択肢の比較

| 選択肢 | 大きさ（配信時） | 強み | 弱み | 判定 |
|---|---|---|---|---|
| **Canvas 2D（いまのまま）** | 0 | 依存が無い。既存の資産がそのまま使える | 三角形ごとの clip と drawImage が重い（§1.2）。粒子数百で CPU が詰まる【推測】 | 文字、UI、雪払いのマスクなど**軽い部分だけ**に残す |
| **自作の WebGL2 合成レイヤー** | 自作で数百行（数KB） | 依存ゼロでビルド不要の方針と合う。メッシュは描画1回で済む。雪と光をシェーダーで書ける。WebGL2 の世界での対応率は97.13%、iOS は15以上【確認：caniuse】 | 自分で保守する必要がある（コンテキスト喪失、テクスチャ管理）。文字は描かない | **12月版に推奨** |
| **PixiJS v8** | 全部入りで約450KB（minify 後）。分割すれば減る【確認：二次情報】 | WebGL、WebGPU、Canvas への退避を同じ API で扱える。メッシュ、フィルター、粒子が揃っている【確認】 | 機能を絞って小さくするには事実上バンドラーが要る。CSP が `'self'` なので自前で同梱する必要がある。学習の費用 | **長期版の候補**。エピソードが増えて場面の作り方を統一したくなったら |
| **Rive** | WASM のランタイム：canvas-lite 222KB、canvas 567KB、webgl2 648KB（brotli 圧縮後、2026年1月の表）【確認】 | エディタで**状態機械**とデータバインディングが作れる【確認】。canvas-lite でもラスター画像とメッシュ変形が使える【確認】。デザイナーが反応を作り込める | エディタ側の料金と書き出し条件は未確認。lite 版は Rive の文字と音を描かない【確認】。描いた絵を部品に分ける作業が要る | **長期版でキャラクターに推奨**（サンタ、魔法使い、タヌキの表情と反応） |
| **Lottie（dotLottie）** | JS が約35KB（min+gzip）と WASM【確認】 | UI の小さな動きは資源が豊富 | After Effects のベクター前提で、**ガッシュ調の塗りの絵に合わない** | ボタンや星のきらめきなど、UI の飾りに限る |
| **Spine** | spine-pixi / spine-webgl | 2D ゲームの骨格アニメーションの定番 | 実行時ライブラリを配布するにも**Spine の有償ライセンスが必須**【確認】（価格は未確認） | 優先度は低い。Rive と役割が重なる |
| **CSS / WAAPI / View Transitions** | 0 | DOM の UI、手紙、台詞の吹き出し、画面切り替え。読み上げ機能との相性が良い | 絵のメッシュ変形はできない | **UI は全部これで作る** |
| **WebGPU** | — | Safari 26 で macOS、iOS、iPadOS の既定で有効【確認】 | iPadOS 18 以前の端末と古い Android には無い | 使わない（WebGL2 で十分） |

### 2.3 中位の Android と古い iPad で守る予算

- **端末の下限の目安**【確認＋推測】
  - iPadOS 26 の対象は A12 以上（iPad 第8世代以降）【確認】
  - iPadOS 27（2026年秋）は第8世代、Air 第3世代、mini 第5世代などを外した【確認：MacRumors 2026-06-08】
  - 家庭には iPadOS 17 や 18 のまま止まった iPad が残っている見込みが高い【推測】
  - そこで、**iPad 第7〜8世代（A10/A12）と、iPadOS 17 の Safari**を性能の下限にする
- **GPU メモリ**【推測】
  - 素材1枚（1312×1199〜1860×845）を展開すると RGBA で約6.3MB
  - 箱の場面は素材6枚、雪の層、DPR 2 の描画面（iPad で 2048×1536 なら約12.6MB）で、合計約50MB
  - ページを分けている今なら問題ない
  - 1ページのアプリ（SPA）にするなら、場面を出るときに必ずテクスチャを解放し、長辺を2048px 以下に縮める
- **フレームの予算**
  - 常時のアニメーションは**30fps で設計**し、60fps は余裕がある端末だけにする
  - `document.hidden` のときと `prefers-reduced-motion` のときは止める（後者は今も対応済み：`red-box/main.js:400`、`main.js:310`）
- **省電力**
  - 絵本として長く開いておくため、Screen Wake Lock を使う。iOS ではホーム画面のアプリでも 18.4 から動く【確認】
  - そのぶん、描画を止めている間は rAF を回さない

### 2.4 推奨

- **12月版**
  - 新しい部品を1つだけ作る。`paint.js` の `mesh()` と同じ考え方の WebGL2 版で、名前は例えば `stage-gl.js`（約300〜500行）【推測】
  - 層は「背景の絵 → 中景のメッシュ → 雪の粒子 → 光（加算）」の4つ
  - 雪払いのマスク、文字、UI は今の Canvas 2D と DOM を重ねて使う
  - 素材の余白の切り取りは**ビルド時**に移す
- **長期版**
  - キャラクターは Rive の状態機械で作る（音声の再生中は口を動かす、正解したら喜ぶ、など）
  - 場面が増えたら PixiJS v8 への移行を判断する
  - 判断の基準：場面が20を超える、デザイナーが配置を直接触りたい、のどちらか

---

## 3. 音声：iOS Safari と Android Chrome での再生、オフライン

### 3.1 形式と大きさ【計測】

intro.wav（32.4秒、1,561,264 バイト、24kHz・モノラル・PCM）をエンコードし直した（`（調査用の一時領域）/enc/`）。

| 形式 | 実ビットレート | 大きさ | WAV に対する比 | iOS Safari | Android Chrome |
|---|---|---|---|---|---|
| WAV（いまの形式） | 384kbps | 1,561,264 B | 1 | ○ | ○ |
| Ogg Opus 24k | 23.8kbps | 96,566 B | **1/16.2** | **iOS 18.4 以降のみ**【確認：Safari 18.4 リリースノート】 | ○ |
| WebM Opus 24k | 25.8kbps | 104,386 B | 1/15.0 | `<audio>` では不安定という報告あり【確認：WebKit のバグ報告】 | ○ |
| MP4 Opus 24k | 25.0kbps | 101,202 B | 1/15.4 | ×（Apple の掲示板）【確認：二次情報】 | ○ |
| HE-AAC 32k（m4a） | 33.5kbps | 136,953 B | 1/11.4 | ○【推測：要実機確認】 | ○【推測】 |
| AAC-LC 48k（m4a） | 51.1kbps | 207,139 B | 1/7.5 | ○ | ○ |
| MP3 48k | 48.1kbps | 194,924 B | 1/8.0 | ○ | ○ |

**作品全体の試算**（本編で使う台詞68本・834秒、使わないものも含めた81本は1,052秒）

| 対象 | WAV | AAC-LC 48k | HE-AAC 32k | Ogg Opus 24k |
|---|---|---|---|---|
| 本編の台詞（834秒） | 40.4MB | 約5.3MB | 約3.5MB | 約2.6MB |
| BGM 2曲（145秒、ステレオ） | 25.6MB（WAV）／3.85MB（今の Ogg Vorbis） | AAC 128k で約2.3MB | — | — |
| 効果音 | 0.47MB（MP3） | そのまま | — | — |

- 推奨
  - **基準は AAC-LC の m4a**（台詞はモノラル 48〜64kbps、BGM は 128kbps）
  - 余力があれば Ogg Opus も作り、`canPlayType` で使える方を選ぶ（Chrome、Android、iOS 18.4 以降)
  - WAV へ切り替える処理（`soundtrack.js:31`）は削除する
  - 第三者の BGM（CC BY 4.0）をエンコードし直すことは「改変」にあたる。クレジットに明記する（05 の報告による）

### 3.2 iOS と Android の再生の制約

| 論点 | 事実 | 設計 |
|---|---|---|
| 自動再生 | 利用者が操作するまで音は出ない（各ブラウザ共通の方針） | 表紙に「えほんをひらく」ボタンを置く。その1回のタップで `AudioContext.resume()` し、無音のバッファを鳴らして解錠する |
| iOS の消音スイッチ | Web Audio は消音スイッチに従い、`<audio>` は鳴る。動きが食い違う【確認：WebKit のバグ報告】 | `navigator.audioSession.type = 'playback'` を、使えるか確かめてから設定する【確認：Audio Session API】。いまは BGM だけが Web Audio を通るので、消音中に「声は出るが BGM は消える」状態になりうる【推測】 |
| 継ぎ目の無い連結 | 数字の読み上げ（`full-audio.js:18`）は7本を続けて鳴らす | 1つの AudioContext に AudioBuffer を読み込み、`start(when)` で時刻を指定して鳴らす。場面ごとの**音声スプライト**（1ファイルと位置情報の JSON）にすれば、リクエスト数も減る |
| メモリ | 展開した AudioBuffer は32bit 浮動小数。24kHz・モノラルで1秒約96KB。834秒すべてを展開すると約80MB【推測】 | 展開するのは**今の場面の分だけ**。BGM は `<audio>` で流し続ける（メディアの経路に乗るので消音スイッチにも強い） |
| 音声の切り替え | 台詞が鳴っている間は BGM を下げる | GainNode でダッキングする。今の `quiet()` は setTimeout で20段階に下げている（`soundtrack.js:34-37`）。`linearRampToValueAtTime` に置き換える |

### 3.3 Service Worker と PWA でのオフライン対応

- **大きさ**【推測】
  - 内訳：画像を WebP にして約4.5MB、台詞 約3〜5MB、BGM 約2.3〜3.9MB、効果音 0.5MB、コードと CSS 0.5MB 未満
  - **合計 約11〜15MB**
  - 1エピソードを丸ごと先に読み込める大きさになる
- **保存枠**【確認：WebKit「Updates to Storage Policy」、Safari 17】
  - Safari では、1つのサイトがディスクの最大60%まで、全サイトの合計で最大80%まで使える
  - ホーム画面のアプリも同じ枠を使う
  - 消すときは、最後に使われたのが古いサイトから順に消す
  - `navigator.storage.persist()` は「ホーム画面のアプリとして開かれているか」などの基準で許可され、許可されれば消されない
- **7日ルール**【確認】
  - Safari を7日使う間にそのサイトを操作しないと、スクリプトから書き込んだ保存データ（localStorage、IndexedDB、Cache API など）が消える
  - ホーム画面のアプリは、使った日数を別に数える
  - 12月の数日にわたって遊ぶ作品なので、**進み具合が消える危険が現実にある**
  - 対策
    - (1) ホーム画面への追加を勧める
    - (2) 「つづきの合言葉」（短い文字列や QR）で進み具合を戻せるようにする
    - (3) 保存するのは小さな状態だけにする
- **インストール**【確認】
  - iOS 26 では「ホーム画面に追加」すると、既定で**Web アプリとして開く**
  - iOS には `beforeinstallprompt` が無く、インストールの案内を自分で作る必要がある
- **SW の作り方**
  - 素材の変換スクリプトが、ハッシュつきのマニフェスト（`precache.json`）を出す
  - SW はそれを読んで Cache API に入れる
  - 版が上がったら、マニフェストの差分だけを取り直す
  - Workbox を使わなくても100行程度で書ける【推測】

### 3.4 推奨のまとめ

- 12月版
  - 声：AAC-LC の m4a と場面ごとのスプライト
  - BGM：`<audio>` で流し、音量は GainNode で操作する
  - 効果音：AudioBuffer
  - 解錠：最初のタップ1回で行う
  - オフライン：「おうちで準備」ボタンで全部を読み込み、進み具合を表示する
- 長期版
  - Opus とのふた通りの配信
  - 言語ごとの音声パック（§8）

---

## 4. 複数端末で一緒に遊ぶ：重いサーバーを作らずに

### 4.1 遊び方の型（技術の要求を決めるため）

| 型 | 例 | 同期の要求 |
|---|---|---|
| A. 1台を囲む | タブレット1台を親子で触る。親は読み手 | 不要 |
| B. 親の端末＝サンタの無線機（ゆるい連携） | 絵本はタブレット。親のスマホに、その章のヒント、サンタの台詞（親が演じる）、答えの判定ボタンが出る | 章の番号がわかれば十分。数秒遅れてもよい |
| C. 大画面＝絵本、手元＝道具箱（強い連携） | テレビに森を映し、子のタブレットで錠を回すとテレビの箱が開く | 1秒未満の遅れ。状態は一方が正本 |

- **12月版は A と B で十分**【推測】
- C は魅力的だが、テレビまわりの機器の組み合わせが多く、試験の費用が跳ね上がる

### 4.2 選択肢の比較

| 方式 | 届く範囲 | 遅延 | 費用 | プライバシー | 複雑さ | 判定 |
|---|---|---|---|---|---|---|
| 端末を渡す | 1台 | 0 | 0 | 最良 | 最小 | 基本の形 |
| **静的な「無線機」ページと QR** | 別の端末（ネット不要。ページはキャッシュから出す） | 人が操作する速さ | 0 | 何も送らない | 小 | **12月版に推奨** |
| BroadcastChannel | 同じ端末、同じオリジン（タブやウィンドウの間）。Safari 15.4 以降【確認】 | 約1ms | 0 | 最良 | 小 | ノート PC をテレビに繋ぎ、ウィンドウを2つ開く場合だけ。今のタブ間同期（`journey/store.js`）の置き換えにも使える |
| **Cloudflare Durable Objects の WebSocket 部屋** | インターネット経由で何台でも | 国内で数十 ms【推測】 | 無料枠：1日10万リクエスト、1日13,000 GB-s。受信した WebSocket メッセージは20件で1リクエストと数える。待機中（hibernation）は時間課金されない【確認】 | 部屋の番号だけで、アカウント無し。中継される内容は進行イベントだけ | 中 | **2027年版に推奨** |
| PartyKit / partyserver | DO の上の抽象 | 同上 | 同上 | 同上 | 中 | Cloudflare が2024年4月に買収【確認】。DO を直接書くのと大差ない |
| WebRTC のデータチャネル | 同じ家の LAN なら直接繋がる | 最小 | シグナリングのサーバーは必要。TURN は Cloudflare なら月1,000GB まで無料、その先は $0.05/GB【確認】 | 内容が直接届く | 大（NAT 越え、接続の失敗、iOS が裏に回ったときの扱い） | 進行イベントは小さいので、利点が手間に見合わない |
| Presentation API | Chrome（デスクトップ、Android） | — | 0 | — | 中 | **Safari と iOS に無い**【確認：caniuse】。採用しない |
| Google Cast の独自レシーバー | Chromecast と Google TV | — | 登録料 $5（1回）【確認】 | — | 大 | 採用しない |
| AirPlay（Web から） | Safari の `<video>` だけ（`webkitShowPlaybackTargetPicker`）【確認】 | — | 0 | — | — | Canvas の絵本には使えない。**OS の画面ミラーリング**（コントロールセンター）を案内する |

### 4.3 12月版：サーバー無しの「サンタの無線機」

1. 絵本（タブレット）の章の扉に、小さな QR を出す。中身は `https://…/radio/#ch=red-box`
   - 部屋の番号も個人の情報も入れない
2. 親がスマホの標準カメラで読むと、`radio/` ページが開く。ページはキャッシュ済みの静的な HTML
3. 無線機には次の3つを載せる
   - (1) サンタの台詞の台本（親が声で演じる）
   - (2) 段階的なヒント（子どもが詰まったときだけ親が渡す）
   - (3) 「子どもの答え」を押す判定ボタン（§5 の「シカ」問題など）
4. 判定の結果は**絵本に送らない**。親が口で伝えるか、絵本の画面で子どもに選ばせる

- 利点
  - 通信、サーバー、同意の手続きがすべて不要
  - 祖父母の家など電波の弱い場所でも動く
  - 「親が演じる」ことが共遊の価値そのものになる【推測】

### 4.4 2027年版：DO の部屋で同期する設計案

- **部屋**
  - 1つの DO が1つの部屋を受け持つ（`idFromName(roomCode)`）
  - 部屋の番号は6桁、24時間で失効する
  - 絵本の側が部屋を作り、QR（`/join#room=482915&role=radio`）を表示する
- **正本**
  - 絵本の端末が正本を持つ（今の純粋なリデューサーをそのまま使う）
  - DO は (a) イベントの中継と、(b) 再接続用の最新スナップショット1件の保存だけを行う
  - 一方で、DO を正本にすればズルを防げる。ただし家族で遊ぶ作品なので不要【推測】
- **通信の中身**
  - `{type:'EVENT', seq, event}` と `{type:'SNAPSHOT', seq, state}` の2種類
  - `scene-math.js` の進行度は、ドラッグ中だけ約10Hz に間引いて送る
- **費用の試算**【確認した料金からの推測】
  - 1回の遊び（45分、3台）で、接続3と受信メッセージ約400件（20件で1と数えるので20）
  - 合計で約25リクエスト
  - 無料枠の1日10万リクエストなら、**約4,000組/日**
  - 有料プラン（最低 $5/月）でも、100万リクエストあたり $0.15 で、ほぼ無視できる
- **CSP**：`connect-src 'self' wss://<worker-domain>` に変える（`build-pages.mjs:17`）。同じオリジンの Worker にすれば変更は不要
- **障害時**：部屋に入れないときは、型 A（1台）と型 B（静的な無線機）にそのまま戻せる設計にする

### 4.5 テレビへの表示

- Web の API でテレビに出すのは、iPhone と iPad では事実上できない（Presentation API が無く、AirPlay は動画だけ）【確認】
- そこで、ヘルプページに「大きな画面で遊ぶ」方法を書く
  - (1) iPad から AirPlay の画面ミラーリング
  - (2) Android から Google TV へ画面をキャスト
  - (3) HDMI で繋ぐ
- 操作は手元の端末で行うので、ミラーリングの遅れ（数百 ms 程度【推測】）は、絵本の速さなら問題にならない

---

## 5. 子どもの声の入力

### 5.1 対応状況（2026年10月時点）

| 環境 | 状況 | 音声の送り先 |
|---|---|---|
| Chrome（デスクトップ） | `webkitSpeechRecognition`。Chrome 139 から**端末内での認識**（`processLocally`、言語パックの取得）に対応【確認】 | 既定はクラウド。端末内の認識は Windows、Mac、Linux が先行し、**Android は対象外**と案内されていた【確認：blink-dev の Intent to Ship】。言語パックは約60MB |
| Chrome for Android | 一部対応【確認：caniuse】 | Google のクラウド【推測】 |
| Safari（iOS 14.5 以降、macOS 14.1 以降） | 一部対応【確認：caniuse】。**Siri が有効である必要がある**【確認】 | Apple のサーバー。ただし Siri の設定で端末内処理の表示がある場合を除く【確認：Apple の Siri とプライバシーの説明】 |
| iOS のホーム画面のアプリ（PWA） | **動かない**（「Safari では動くが、インストールした Web アプリではまだ動かない」）【確認：whatpwacando.today】 | — |
| iOS 26 の SpeechAnalyzer | 日本語を含み、端末内で認識できる。ただし**ネイティブの API だけで、Web Speech からは使えない**【確認】 | 端末内 |
| Firefox | 既定で無効【確認】 | — |

### 5.2 子どもの声の精度とプライバシー

- **精度**【確認：英語の研究】
  - Whisper の単語誤り率は、大人が約3%、子どもが約25%
  - 子ども向けに追加学習すれば改善する
  - 日本語の幼児の声での公開値は見つけられなかった
  - 「シ・カ・シ・カ」のような早口の繰り返しや、照れた小声は、さらに悪くなると見込む【推測】
- **プライバシー**
  - 米 COPPA の2025年改正（2026年4月22日までに対応）で、**声紋**などの生体情報が個人情報に加わった
  - 子どもの声の録音は「要求に応えるためだけ」なら、通知と同意の例外がある【確認】
  - App Store の子ども向けカテゴリーは、第三者への個人情報や端末情報の送信を原則禁じる【確認：1.3】
  - 日本の家庭向けでも、「子どもの声がクラウドへ行く」ことを嫌う親は多いと見込む【推測】
- **配信の設定**：今の配信ヘッダーは `microphone=()` でマイクを止めている（`build-pages.mjs:17`）。いまの方針と一致している

### 5.3 「シカを10回」と「だいすきだよ」はどうするか

- 原作の台詞
  - 「わたしといっしょに、シカ、シカ、と10回いってね」（`witch/conversation.js:40`）
  - 合言葉は「だいすきだよ」（`letters/word-math.js:13`）
- 推奨：**声に出すことは遊びの中心に残す。ただし機械で判定しない**

| 場面 | 推奨する体験 | 技術 |
|---|---|---|
| シカ10回 | 魔法使いの声に合わせて、家族全員で「シカ、シカ…」と言う。画面には10個の鹿の足跡が拍子に合わせて灯る（音声の時刻に合わせた演出）。最後の「サンタが乗ってくるのは？」には、子どもが**口で答える**。親が無線機か絵本の上の小さな「おとなボタン」で「ソリ／トナカイ／そのほか」を押す | 音声スプライトの時刻、DOM と CSS。認識は使わない |
| だいすきだよ | 6枚の紙の文字を子どもが並べる（いまの文字の謎解き）。そろったら「みんなで声をそろえて言ってね」と案内し、**長押しの儀式**（全員が画面に手を置く、または大きなボタンを3秒）で魔法が発動する | Pointer Events の複数タッチ。認識は使わない |
| 任意：声の大きさ | 「もっと大きな声で！」で球が光る。設定で明示的にオンにしたときだけ動く | `getUserMedia` と `AnalyserNode` で**音量（RMS）だけ**を端末内で計算する。録音も送信も内容の判定もしない。`Permissions-Policy: microphone=(self)` への変更が要る |

- 端末内の音声認識（Moonshine-tiny-ja は2,700万パラメータ、FLEURS での文字誤り率17.87%、ライセンスは「other」で未確認【確認】）は、長期の実験にとどめる
  - 子どもの声での精度は未知
  - モデルの取得に数十 MB かかる
  - 判定に失敗すると子どもが傷つく。進行の**関門には使わない**

---

## 6. カメラ・AR・印刷との組み合わせ

### 6.1 AR

- iPhone と iPad の Safari には WebXR の `immersive-ar` が無い。visionOS も VR だけ【確認】
- Web で AR を作れば、家庭の半分ほどを占める iPhone の家族を締め出すことになる【推測】
- **採用しない**

### 6.2 QR を家のあちこちに隠す

- 読み取りは **OS 標準のカメラ**に任せる（iOS と Android の両方で QR を読める）
- アプリの中で読み取るには `BarcodeDetector` が要るが、iOS Safari では既定で無効【確認：caniuse】。jsQR のような JS ライブラリを同梱する必要がある
- **落とし穴**【推測：要実機確認】
  - iOS では QR から開いたページは Safari で開き、ホーム画面のアプリとは保存領域が分かれる見込み
  - そのため、**QR の URL で進み具合を変える設計は避ける**
- 推奨
  - カードに**情報そのもの**を載せる（絵と数字、例：「タヌキのカード：3」）
  - 子どもがそれを絵本の錠に入れる
  - QR はおまけの演出（サンタの短い音声を流すなど）に限る
  - これは原作の「箱の数字を探す」構造と一致し、実物を探す楽しさが加わる

### 6.3 印刷物を端末内で作る

| 印刷物 | 作り方 | 注意 |
|---|---|---|
| 手がかりカード（A4 に6枚） | 静的な PDF を事前に作って配る。または `print.html` と `@page` の CSS を用意し、`window.print()` で印刷する | 答えを変える版（後述）では、カードも動的に作る |
| サンタの感謝状（子どもの名前入り） | Canvas に絵の額縁と名前を描き、PNG を保存するか Web Share で共有する。印刷するなら印刷用 CSS | **名前は端末から出さない**。PDF に日本語のフォントを埋め込むと数 MB になるので、文字を画像にして貼るのが簡単【推測】 |
| 答えを変える版 | 箱の暗証番号を毎回変え、カードと絵本で同じ乱数の種を使う | 種を QR か短い文字列にしてカードに印刷すれば、きょうだいで繰り返し遊べる |

- 印刷物は「画面を見る時間を減らす」「実物を手で探す」という形で親を安心させる【推測】
- 12月版に入れる価値は高い

---

## 7. 配布形態とビルドの道具

### 7.1 PWA か、Capacitor で包むか

| 観点 | PWA（Cloudflare Pages） | Capacitor 8 で包んでストアへ |
|---|---|---|
| 公開までの時間 | すぐ出せる | 審査とメタデータの準備に数週間【推測】 |
| 要件 | — | iOS 15 以上、Android 7 以上、Xcode 26【確認】 |
| オフライン | SW。消される危険がある（§3.3） | 素材をアプリに同梱するので消えない |
| 音声と画面の制御 | Web の制約を受ける | ネイティブの音声セッション、Wake Lock、SpeechAnalyzer（プラグイン）が使える |
| 子ども向けの規約 | 自分で守る | App Store 1.3：外部リンクと購入は保護者用のゲートの奥へ、第三者の解析と広告は原則禁止。5.1.4：プライバシーポリシーが必須【確認】。Google Play の Families ポリシー【確認】 |
| 審査の危険 | 無し | 4.2「Web サイトを包み直しただけ以上のもの」が求められる【確認】。動く絵本なら通る見込みだが、確実ではない |
| 課金 | 自由（Stripe など）。子ども向けなら保護者用のゲートが必須 | アプリ内課金の規約 |
| ほかの法務 | Gemini TTS の年齢条項、BGM の抽出対策（05 の報告） | 同じ。有料で出すなら BGM の取り出し対策が必要と読める |

- **判断**
  - 12月版は PWA にする。URL を家族で共有しやすく、祖父母の端末でもすぐ開ける
  - ストア版は2027年のクリスマスを目標にする
  - Capacitor を前提に、Web の側に「端末の機能を差し替えられる層」（音声、保存、Wake Lock）を今から作っておく

### 7.2 ビルドなしのままか、Vite か

- いまは「依存なし、ビルド不要」の方針で、自前の検査（`check.mjs`）が動いている【確認】
- 新しく必要になるのは**素材の変換**（PNG→WebP、WAV→AAC/Opus、スプライト、余白の切り取り、precache 用のマニフェスト）。これは実行時のコードのバンドルとは別の仕事
- 推奨
  - 12月版：実行時は素の ESM のままにし、`scripts/build-assets.mjs` を足す
    - 外部の道具として `ffmpeg` と `cwebp` を使う。この Mac には両方ある【確認】
    - 既存の `scripts/build-pages.mjs`（19行）を広げる形
  - 長期版：Vite 8 を入れる。Vite 8 は2026年3月12日公開で、Rolldown を内蔵する【確認】
    - 入れる条件：TypeScript を使う、npm の PixiJS か Rive を使う、エントリーポイントが10を超える、のいずれか
    - 複数ページの構成をそのまま扱える
- Cloudflare 側の制限【確認】
  - Pages は1ファイル25MiB、1サイト2万ファイルまで
  - Workers の静的素材も同じ制限で、静的素材へのリクエストは無料・無制限
  - DO を使う段階では、Workers と静的素材の構成にまとめるのが素直【推測】

---

## 8. コンテンツの作り方とテスト

### 8.1 エピソードのデータ形式（案）

いまは台詞が JS の中に写してある（`intro/story.js`、`witch/conversation.js`、`prototype/full-scenario.js`）。これをデータへ分ける。

```
episodes/
  2026-santa-escape/
    episode.yaml        # 場面の順番、謎、正解、状態の不変条件（full-game-spec.json を発展）
    lines.ja.yaml       # 台詞ID → {speaker, text, ruby, audio}
    lines.en.yaml
    puzzles.ja.yaml     # 言葉遊びの謎は言語ごとに別物にする
    puzzles.en.yaml
    art/manifest.yaml   # 素材ID → 元の PNG、切り取り範囲、メッシュの分割数、層
    audio/ja/*.wav      # 生成した原音（配信しない）
```

- YAML は**ビルド時だけ** JSON に変換する（パーサーはビルドにだけ依存させる）。実行時は JSON を読む
- 不変条件の検査（`design/check-flow.mjs` の考え方）を、エピソードのデータに対して走らせる
  - 例：「全部の箱が開けられる」「紙が6枚そろう」「どの道でも救出に着く」
- 台詞 ID と音声ファイルの対応を自動で検査する
  - 今の `prototype/scripts/verify-audio.mjs` を、エピソードのデータを読む形に広げる

### 8.2 英語版への対応

- 台詞は ID でひく。英語の音声は既存の Gemini TTS の仕組み（`prototype/scripts/generate-audio.mjs`）で作り直す
  - ただし Gemini の規約と、生成した音声の表記（05 の報告）を先に解決する
- **言葉遊びは翻訳できない**
  - 例：「クリスマス」の中のリス・マス・クマ、「だ・い・す・き・だ・よ」の6文字、シカ→ソリの引っかけ
  - 謎を `puzzles.<lang>` で言語ごとに作り直す（翻訳でなく創作し直す）
  - 謎の型（言葉に隠れた生き物、文字を並べる、繰り返しの引っかけ）を部品にしておく
- 文字は DOM で描く（Canvas の中に文字を描かない）。言語、ルビ、読み上げ機能への対応が楽になる

### 8.3 自動テスト

| 層 | 今 | 加えるもの |
|---|---|---|
| 論理 | 97件 PASS、2.2秒【計測】 | エピソードのデータの検査、乱数の種ごとに全部の道をたどる検査 |
| E2E（Playwright） | 無し | 導入から救出まで通しで遊ぶ。保存と再開。オフライン（`context.setOffline(true)`） |
| 見た目の差分（Playwright の `toHaveScreenshot`） | 手で撮った QA の画像が212枚【確認】 | 各場面を3つの画面サイズ（390×844、820×1180、1280×800）で撮る。基準画像は **Linux の Docker 1か所でだけ作る**【確認：Playwright の推奨】。CSS のアニメーションは既定で止まる【確認】が、**Canvas の rAF は止まらない**。そこで `?test=1` で進行度を固定するフックを入れる（`scene-math.js` の「進行度の純粋関数」がそのまま使える） |
| 複数端末 | — | 1つのテストで BrowserContext を2つ開き（スマホとタブレットを模擬）、`wrangler dev` の DO に繋いで同期を確かめる（2027年版） |
| 実機 | 手で確認 | 端末の組み合わせ（§9 (a)）。性能は実機の Safari の Web Inspector と Chrome の remote debugging でフレーム時間を記録する |

---

## 9. 推奨スタック

### (a) 2026年12月上旬に出す版（開発は約8週）

| 層 | 選ぶもの | 理由 |
|---|---|---|
| 配布 | PWA。Cloudflare Pages の静的配信、manifest、自作の SW、`storage.persist()`、ホーム画面への追加の案内 | 審査が無い。URL で共有できる |
| 実行時 | 素の ES モジュール、依存ゼロ（今の方針を守る） | 今ある97件のテストと検査がそのまま生きる |
| 描画 | DOM と CSS（UI、文字、手紙）＋**自作の WebGL2 合成レイヤー**（絵、メッシュ、雪、光、視差）＋Canvas 2D（雪払いのマスクだけ） | 中位の Android と古い iPad で、常時のアニメーションを30fps 以上に保つため |
| 素材 | WebP（長辺2048以下、余白はビルド時に切り取る）。台詞は AAC-LC の m4a を場面ごとのスプライトに、BGM は m4a 128k | 作品全体を約11〜15MB にし、全部を先に読み込めるようにする |
| 音 | AudioContext 1つ（表紙のタップで解錠、`audioSession.type='playback'`）。台詞と効果音は AudioBuffer、BGM は `<audio>` を GainNode に通す | 継ぎ目なく鳴らせ、iOS の癖にも対処できる |
| 共遊 | 型 A（1台）と型 B（QR から開く静的な「サンタの無線機」）。サーバー無し | 費用ゼロ、オフラインで動く、プライバシーも最良 |
| 声 | 認識しない。声に出す儀式と親の判定。音量メーターは任意（入れるなら設定でオンにしたときだけ） | 子ども、iOS、PWA の制約とプライバシー |
| 印刷 | 手がかりカード（静的 PDF か印刷用 CSS）、名前入りの感謝状（Canvas から PNG、印刷） | 画面の外での体験が親の安心になる |
| 保存 | localStorage に小さな状態だけ。「つづきの合言葉」で復元できる | Safari の7日ルールへの対策 |
| ビルド | `scripts/build-assets.mjs`（ffmpeg、cwebp、マニフェスト）。Vite は使わない | 道具を最小限に保つ |
| テスト | 既存のユニットテスト＋Playwright（E2E、3つの画面サイズでの見た目、オフライン）＋実機の組み合わせ | 手で撮る QA から卒業する |

**実機の組み合わせ（最低限）**

- iPhone（iOS 18.x と 26/27）
- iPad 第8か第9世代（iPadOS 17〜18）
- 中位の Android（例：Pixel 6a 相当か Galaxy A5x、Chrome）
- ノート PC の Chrome（テレビへのミラーリングを含む）

**週ごとの目安**【推測】

| 週 | 期間 | 内容 |
|---|---|---|
| W1 | 10/12〜 | 素材の変換、SW と precache、Playwright の骨組み、実機をそろえる |
| W2〜3 | | WebGL2 の合成レイヤー（メッシュの置き換え、雪、光）、音の仕組み（スプライト、解錠、ダッキング） |
| W4 | | 「サンタの無線機」ページと QR、印刷物 |
| W5 | | 台詞と謎をデータへ移す（今のエピソード分だけ）、見た目の差分の基準画像 |
| W6 | | 実機で性能を詰める（30fps と GPU メモリ） |
| W7 | | 3〜5家族で試遊し、直す |
| W8 | 11/27 凍結 | 12/1 公開、12/5 までは予備 |

**入れないもの**：ストア版、DO の部屋、Rive と Spine、音声認識、AR、英語版

### (b) 長期版（2027年のクリスマスに向けて）

| 層 | 選ぶもの |
|---|---|
| 配布 | PWA と Capacitor 8（App Store の子ども向けカテゴリー、Google Play の Families）。第三者の解析は入れず、保護者用のゲートをつける |
| ビルド | Vite 8（複数ページ、TypeScript）。素材の変換は引き続き Node のスクリプト |
| 描画 | WebGL2 の合成（自作を続けるか PixiJS v8 へ移る）、Rive の状態機械でキャラクターを動かす（声に合わせた口の動き、反応） |
| 共遊 | Cloudflare Workers と Durable Objects（部屋は QR で参加、6桁、24時間で失効、hibernation、正本は絵本の端末）。役割は「絵本・無線機・道具箱」 |
| 声 | ストア版で、iOS 26 の SpeechAnalyzer（端末内）を任意の機能として試す。進行の関門にはしない |
| コンテンツ | YAML からビルドで JSON を作るエピソードの形式。ja と en。言葉遊びは言語ごとに作り直す。答えを毎回変える版と、カードの自動生成 |
| テスト | 2つの BrowserContext での同期テスト、エピソードの全部の道の検査 |

---

## 10. リスク一覧

| リスク | 起こりやすさ | 影響 | 対策 |
|---|---|---|---|
| WebGL2 レイヤーの自作が遅れる | 中 | 中 | 予備案：メッシュの分割を減らし（9×12 を 4×6 に）、動かない層をビットマップにして Canvas 2D のまま出す。常時のアニメーションは雪だけにする |
| iOS の音の癖（消音スイッチ、Bluetooth、裏に回った後の再開） | 高 | 中 | 解錠の流れを1か所にまとめる。`visibilitychange` で resume する。合成音声と字幕へ退避する（既存） |
| Safari が保存データを消す（7日ルール、容量） | 中 | 高（進み具合が消える） | ホーム画面への追加を案内する。合言葉で復元できるようにする。状態を小さく保つ |
| 古い iPad の GPU メモリが足りない | 中 | 高（タブが落ちる） | 長辺2048以下。場面を出るときに解放する。実機で確認する |
| 画像生成の画風の不統一、透明部の縁のゴミ | 高 | 中 | 05 の報告にある縁の処理を素材の変換に組み込む |
| 生成音声と生成画像の規約（Gemini の年齢条項、C2PA、表記） | 中 | 高（公開が止まる） | 05 の報告に従い、W1 で法務の確認を始める |
| 音声認識を求める声 | 中 | 低 | 「声に出す儀式」の良さを説明する。2027年に任意の機能で試す |
| QR の保存領域が分かれる（iOS） | 中 | 中 | QR に状態を載せない設計（§6.2） |
| Cloudflare Pages の今後 | 低 | 低 | Workers の静的素材へ移れるよう、出力をただの静的ファイルに保つ【推測】 |
| ストアの審査（2027年） | 中 | 中 | 1.3、4.2、5.1.4 の点検表。保護者用のゲート。プライバシーポリシー |

---

## 11. 実機で確かめるべきこと（今回は未検証）

1. 中位の Android と iPad 第8世代で、現行の赤い箱の場面のフレーム時間を測る。§1.2 のベンチを `design/family-2026/bench/` から実機で開けば測れる
2. iOS 17 の Safari、18.4 以降、26 以降で、m4a、HE-AAC、Ogg Opus を `<audio>` と `decodeAudioData` で鳴らせるか
3. iOS 26 と 27 で、ホーム画面のアプリと Safari の保存領域が分かれているか。QR から開いた場合はどうなるか
4. `navigator.audioSession` が iOS の各版で使えるか、消音スイッチがオンのときの動き
5. `storage.persist()` がホーム画面のアプリで許可されるか
6. AirPlay のミラーリングで、Web Audio の音がテレビへ出るか
7. 子どもの日本語の声で、Chrome Android の認識がどれくらい当たるか（参考に測るだけ。採用はしない）

---

## 出典（2026-10-09 に閲覧）

- Rive のランタイムの大きさ（2026年1月更新）：https://rive.app/docs/runtimes/runtime-sizes.md
- Rive の Canvas と WebGL、canvas-lite の制限：https://rive.app/docs/runtimes/web/canvas-vs-webgl
- PixiJS v8 の発表：https://pixijs.com/blog/pixi-v8-launches
- dotLottie web：https://github.com/LottieFiles/dotlottie-web
- Spine Editor のライセンス：https://en.esotericsoftware.com/spine-editor-license
- Safari 18.4 のリリースノート（Ogg Opus と Vorbis、ホーム画面のアプリの Wake Lock 修正）：https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes
- WebKit「Updates to Storage Policy」（Safari 17）：https://webkit.org/blog/14403/updates-to-storage-policy/
- iOS 26 のホーム画面のアプリの動きの変化：https://heise.de/-10749652
- Safari 26 の WebGPU：https://appdevelopermagazine.com/webgpu-in-ios-26/
- WWDC26 の WebKit（Safari 27 ベータ）：https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-saf
- iPadOS 27 で対象外になる iPad：https://www.macrumors.com/2026/06/08/ipados-27-drops-support-for-a-wave-of-ipads/
- iPadOS 26 の対応機種：https://www.cultofmac.com/news/ios-26-ipados-26-macos-26-compatibility-list
- caniuse：WebGL2 https://caniuse.com/webgl2 、BroadcastChannel https://caniuse.com/broadcastchannel 、Speech Recognition https://caniuse.com/speech-recognition 、BarcodeDetector https://caniuse.com/mdn-api_barcodedetector 、Presentation API https://caniuse.com/mdn-api_presentation
- Chrome の端末内 Web Speech（Intent to Ship）：https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM/m/TQpe9shjCgAJ
- Chrome 139 の新機能：https://developer.chrome.com/blog/new-in-chrome-139
- MDN `SpeechRecognition.processLocally`：https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally
- iOS の PWA での音声認識：https://whatpwacando.today/speech-recognition
- Apple の Siri、音声入力とプライバシー：https://apple.com/legal/privacy/data/en/ask-siri-dictation
- Apple SpeechAnalyzer の解説：https://blog.addpipe.com/apple-speechanalyzer-api/
- 子どもの声の認識精度：https://the-learning-agency.com/the-cutting-ed/article/how-speech-recognition-systems-struggle-with-childrens-voices/ 、https://arxiv.org/html/2502.08587v1
- Moonshine tiny ja：https://huggingface.co/UsefulSensors/moonshine-tiny-ja
- COPPA の2025年改正：https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-publishes-final-coppa-rule-amendments
- Cloudflare Durable Objects の料金：https://developers.cloudflare.com/durable-objects/platform/pricing
- Cloudflare による PartyKit の買収：https://blog.cloudflare.com/cloudflare-acquires-partykit
- Cloudflare Realtime（TURN）：https://developers.cloudflare.com/realtime/
- Cloudflare Pages の制限：https://developers.cloudflare.com/pages/platform/limits
- Workers の静的素材の制限：https://developers.cloudflare.com/workers/static-assets/billing-and-limitations
- Presentation API と Cast（Chrome）：https://developer.chrome.com/blog/presentation-api
- Google Cast の登録料：https://support.google.com/cast-developer/answer/4512496
- Safari の AirPlay API：https://whatpwacando.today/airplay
- WebXR と visionOS、iOS：https://developer.apple.com/forums/thread/756850
- iOS の Web Audio と消音スイッチ：https://bugs.webkit.org/show_bug.cgi?id=237322 、https://github.com/swevans/unmute
- Screen Wake Lock（iOS のホーム画面のアプリの不具合と修正）：https://bugs.webkit.org/show_bug.cgi?id=254545
- iOS と `beforeinstallprompt`：https://developer.apple.com/forums/thread/807603
- App Store 審査ガイドライン（1.3、4.2、4.7、5.1.4）：https://developer.apple.com/app-store/review/guidelines/
- Google Play の Families：https://support.google.com/googleplay/android-developer/answer/12918983
- Capacitor 8：https://ionic.io/blog/announcing-capacitor-8 、Capacitor 7：https://ionic.io/blog/capacitor-7-has-hit-ga
- Vite 8：https://vite.dev/blog/announcing-vite8
- Playwright の見た目の比較（基準画像と環境）：https://argos-ci.com/blog/playwright-visual-regression-testing-ci
