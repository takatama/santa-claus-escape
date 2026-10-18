# サンタの脱出 — 日本語全編

この `prototype/` が現行の統合版です。入口は `index.html` → `full-app.js`。独立した旧 `illustrated-prototype/` は廃止しました。開発対象の取り違えを防ぐため [作業先の指示](../AGENTS.md) を参照してください。

三つの箱を自由な順で調べ、ひみつの言葉でまほう使いを呼び、原作の三問で遊んでサンタを救出する、音声つきの絵本。2026-10-05、日本語の固定出題を全編へ拡張した。

ルートフォルダで `npm start` を実行し、http://127.0.0.1:4173/ を開く。Node.js 24以降、外部ライブラリなし。`npm install` は不要。

箱は拡大画面で調べ、数字をダイヤルかキー入力で合わせ、同じ画面でふたを開閉する。この画面にスノードームは表示しない。言葉は短い自由入力、原作の三択クイズだけ三択。原作の後半は不正解でも進む。時間制限はない。声の停止・聞き直し・ミュート、BGMと効果音の個別設定、台詞表示、端末内の保存・再開・リセットを用意した。救出後は遊んだ場面を読み返せる。

絵は制作済みのイラストをCanvasで合成する。縦画面は字幕を下、横長画面は右へ配置する。森とまほう使いの場面には停止できる降雪と小さな人物・光の動きを追加した。新しい探索場所や隠しタップは追加していない。

## 実装

- `full-scenario.js`：原作台詞・謎・正解。旧 `scenario.js` の導入と赤箱を再利用。
- `full-game.js`：固定進行、正解判定、現在の全編形式の保存・復元。
- `full-app.js` / `styles.css` / `illustrations.js`：操作と絵本の表示。
- `full-audio.js` / `audio-sequence.js` / `speech.js`：事前生成WAV、四桁の結合、再生停止と重複防止、再生失敗時の読み上げへのフォールバック。
- `soundtrack.js`：PeriTuneのBGM二曲、効果音ラボの四音、自作ダイヤル音。
- `app.js` / `game.js` / `audio.js`：以前の赤箱体験版の記録。現在の入口は `full-app.js`。

制作時にGemini TTSで追加29点と、誤答用の定型台詞・数字15点を生成。通常の起動、検査、ビルド、遊ぶときに生成API・APIキー・マイクを使わない。既存の六場面を再利用し、数字の誤答も同じ声で読む。音声の読み込み・再生に失敗した場合だけブラウザ読み上げへ戻り、その声・品質は端末により変わる。文字だけでも進められる。

[原作との差分と承認された修正](FULL-GAME-NOTES.md)、[全編の確認範囲と未確認事項](FULL-GAME-QA.md)、[Cloudflare Pages手順](../docs/CLOUDFLARE-PAGES.md)を参照。`QA.md`、`STORYBOOK-QA.md`、`AUDIO-QA.md` は以前の版の確認記録。

## 検査とPages用出力

ルートで `npm test`、`npm run check:design`、`npm run check:audio`、`npm run check:publication` を実行。原本コピーは公開しないため、公開クローンでは原本との直接照合だけを明示してスキップする。

`npm run build` は公開対象を `dist/` に出力。`npm run check:pages` はそのファイル・ヘッダー・音声RangeをローカルHTTPで検査。`npm run preview` で http://127.0.0.1:4174/ を開ける。Workers、Pages Functions、DBは不要。

実装・生成音声・絵・文書は [MIT](../LICENSE)。BGM二曲は **CC BY 4.0**、効果音ラボの四音は提供元の独自規約。第三者素材をMITへ変更していない。[素材の条件](../NOTICE.md)を参照。
