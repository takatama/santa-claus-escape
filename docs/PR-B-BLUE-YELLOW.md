# PR B：青・黄の箱の統合

最終仕様は [Issue #3](https://github.com/takatama/santa-claus-escape/issues/3)。依存する [Draft PR A #4](https://github.com/takatama/santa-claus-escape/pull/4) の最新head `59a8d5cf840d2e2abe5b0a96f9ae786548f442bf` から開始。PR Aは未マージで、verify / browser / Cloudflare Pagesが成功。mainは `e4d225b`。PR BはPR AをbaseとするDraftで、mainへのマージ・本番公開は含めません。

## 調査と責務

PR Aの変更前の基準：`npm test` 49件成功、非公開原本照合のみ2件スキップ、Chromium E2E13項目成功。`full-game.js` が状態と保存、`full-scenario.js` が原文・答え・紙、`speech.js` / `audio-timeline.js` / `soundtrack.js` が音の正本です。PR #1 `aead6e9` の絵・雪払い・描画を参照し、別のjourney状態は取り込みません。PR #2 PRODUCT-DESIGN §8の大きな舞台・操作点・可逆操作・キーボード代替を参照します。4夜・家族の役割・儀式は対象外です。

まず赤の舞台を `box-stage.js`、台詞分割と予約を `box-presentation.js` に整理。`box-presentations.js` に絵・到達済み手がかり・操作名をまとめ、箱舞台の開始・終了、唯一の4桁入力、常設字幕、ふたのドラッグ・タップ・キー操作を共通化しました。構造整理のコミットは赤だけを統合した状態で検査しています。

青・黄のため、箱本体・ヒンジ・紙の描画も共用し、手がかりの描画・雪の安全境界・画像の比率・操作補助を色ごとのモジュールへ分離します。必要になる責務だけを整理し、実行時依存や新しい状態ストアを追加しません。カメラ、雪の演出、音声予約、一手の閲覧位置はセッション内の表示情報。謎・紙授与・進行の正本と保存キー `santa-claus-escape:ja-full:v2` は維持します。

リスクは、古い音声予約の復活、雪の下の未到達ヒントの露出、旧保存にないふた位置の扱いです。既存の音声世代管理を使い、雪の各段階で次の領域を保護し、旧開封済みのふたは開いた状態へ復元します。
