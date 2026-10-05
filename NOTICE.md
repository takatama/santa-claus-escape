# 素材とライセンスの記録

2026-10-05、ユーザーによるGitHub公開・MITライセンス指定に基づき、今回の成果物を公開。

## リポジトリに含むもの

- 実装、SVG/CSSの絵、設計資料、確認スクリプト：今回制作した成果物。MIT。
- 台詞・謎のデータ：利用者が提供した「Santa Claus Escape / サンタの脱出」の原作をもとにしたブラウザ試作・全編設計。今回の公開指定に基づきMITで同梱。参照元と変更点は `prototype/SOURCE-NOTES.md`、`design/FULL-GAME-DESIGN.md` に記録。
- `prototype/assets/audio/*.wav`：今回Gemini TTSで生成した音声。MITで同梱。原作の録音の転載ではない。モデル、声、生成入力、SHA-256を `prototype/reference/audio-generation/` に記録。受信したWAVのC2PAメタデータを保持。
- `prototype/qa/*.jpg`：この試作のブラウザ画面の確認記録。MIT。

Googleは生成コンテンツへの所有権を主張しないとする[Gemini API追加規約](https://ai.google.dev/gemini-api/terms#use_of_generated_content)を確認。ここでのライセンスは同梱成果物に対するもので、Googleのモデルやサービスの権利・規約を変更しない。

## リポジトリに含めないもの

原作ソースの全文コピー、旧ブラウザ画面、Dialogflow原本、Driveの資産一覧、調査資料の原本、APIキー・認証情報は含めない。

PeriTune、効果音ラボ、効果音辞典、DOVA、Freesound由来の原作BGM・効果音は同梱しない。原作の参照URLと利用条件を `design/AUDIO-ASSET-AUDIT.md` に記録しているだけで、外部素材へのMITライセンスの付与・再配布ではない。とくに `dial.mp3` は作者・個別ライセンス未特定のため採用保留。
