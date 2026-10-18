# 現行ゲームの作業先

- 現行の統合版は `prototype/`。名前に prototype とあるが、公開ゲームの実装である。
- 入口は `prototype/index.html` → `prototype/full-app.js`。`npm start` でルート `/` を開く。公開成果物は `npm run build` で生成する `dist/`。
- `illustrated-prototype/` と `/illustrated/` の独立した旧試作は廃止した。復元したり、新機能の反映先にしない。過去の資料や素材出典に記載されたパスはGit履歴の参照である。
- 箱を調べる・開閉する画面は `box-stage.js` / `box-art.js`。箱を拡大する構図を保ち、スノードームを追加しない。
- 森は `story-art.js`、発見と会話は `witch-art.js`、救出は `rescue-art.js`。環境アニメーションは `atmosphere.js`。環境演出は原作の問題・音声・進行・保存・ドラッグの進捗を変更しない。
- 作業開始時にブランチと差分を確認する。古いブランチの画面を現行版として案内しない。既存の未コミット変更を上書きしない。
- 必要な検査は `npm test`、`npm run build`、`npm run check:pages`。描画・入力の変更は対応するブラウザーテストと実画面でも確認する。
