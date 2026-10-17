# 全編化の設計資料

2026-10-05。現行の赤い箱プロトタイプを変更せず、原作の最後までの設計と音源の確認を行った。

- [FULL-GAME-DESIGN.md](FULL-GAME-DESIGN.md)：原作の全体構造、謎と入力、絵と操作、状態遷移、音の同期、変更候補、実装順と受入確認。
- [AUDIO-ASSET-AUDIT.md](AUDIO-ASSET-AUDIT.md)：9参照音源の到達性、11保存資産、提供元の利用条件と未確認点。
- [full-game-spec.json](full-game-spec.json)：原作との照合用の候補・正解・文字・進行条件。ゲームの実行データではない。
- [FLOW-CHECK.json](FLOW-CHECK.json)：設計モデルの検査結果。全編のブラウザ動作確認ではない。
- `reference/`：ローカルにのみ保持するDialogflow原本とDrive音源一覧。GitHubには含めない。公開用の到達結果は [audio-url-check.json](audio-url-check.json)。
- [family-2026/](family-2026/README.md)：2026-10-09〜10。PR #1 の評価と、親子で遊ぶ製品にするための調査・7案の比較・推奨設計。実装・試遊は未実施。

`node design/check-flow.mjs --model-only` は公開版だけで設計モデルを検査する。外部APIを呼ばず、原作との直接照合は省略したことを結果に明記する。原作の参照コピーを持つローカル環境では `--require-source` で原本との照合も必須にできる。`FLOW-CHECK.json` は原本の照合も行った2026-10-05の記録で、通常の検査では書き換えない。レポートを保存する場合は `--write-report` を明示する。

`check-audio-urls.mjs` は明示的に実行した場合のみ、公開済みの到達記録のURLへ読み取り専用のHEADを送る。音源を保存・配信するスクリプトではない。結果を保存する場合だけ `--write-report` を付ける。

設計書に記録した完全一致判定・ソリティア候補除外などの修正案は、未承認・未実装。原作の旧値8848の表示方法も、今後の全編実装で適用する案。新しい課金や契約は行っていない。
