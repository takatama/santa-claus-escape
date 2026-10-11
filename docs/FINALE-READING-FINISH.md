# 読み返しの箱と大団円の一枚絵

2026-10-11 JST。既存E worktreeのローカル変更。未コミット・未push。

この実装の確認後、同日のユーザーがここまでの全作業のマージを承認した。統合範囲と当初の想定から変わった点は [全編統合の判断記録](INTEGRATION-DECISIONS-2026-10-11.md)、最終head・CI・配信結果は [PR #8](https://github.com/takatama/santa-claus-escape/pull/8) を参照。以下はローカル実装・確認時点の記録として保持する。

## 採用した方針

ユーザーは「読み返しを残し、箱は静止画にする」を選択した。操作用DOMのダイヤル錠がないまま箱の接写だけを描いていた問題を修正し、読み返しでは箱の全体・数字なしの錠・雪・到達した手がかりと紙を描く。一覧と同じ錠の描画を共有する。数字を再入力させず、読み返しで保存・回答・取得紙を変えない。

脱出操作が完了すると、既存の最後のお話を続けながら、笑顔のサンタとまほう使い、空のスノードームを描いた一枚絵を表示する。絵は縦横とも全体を表示し、人物を切り取らない。読み返しの最後と保存済み完了からの再開でも同じ絵を使う。新しい章・台詞・操作・ゲーム状態・保存項目は追加しない。

画像の取得が遅い間は既存の解放済みの絵を表示し、取得失敗でもお話・読み返し・やり直しを続けられる。画像取得の完了は進行・音声・保存の条件にしない。離脱後の取得から古い画面を表示しない。

## 一枚絵の出所

- 制作方法：imagegenスキルの組み込み画像生成ツールを使用。生成1回。
- 最終素材：`prototype/assets/rescue/finale-v1.png`。元の参照画像は変更していない。
- 寸法・容量：1254×1254、3,326,993 bytes。SHA-256：`dc6cd0ed99d927f3b98e0bc6b904cacfcb8616c3292eab6b300743aa97ffd659`。
- 参照：`prototype/assets/rescue/santa.png`、`prototype/assets/witch/wizard-feet-v2.png`、`prototype/assets/papers/forest-clean.png`、`prototype/assets/rescue/empty-globe-original-v2.png`。
- 元の生成結果はCodexの`generated_images`に保持し、採用画像をプロジェクトへコピーした。

最終プロンプト：

```text
Use case: illustration-story. Asset type: final single illustration for the existing Japanese children's picture-book game Santa Claus Escape, immediately after Santa has been rescued. Create one complete square 1:1 full-background illustration using the attached files only as visual references: image 1 defines Santa's exact character design, image 2 defines the friendly young wizard's exact character design, image 3 defines the existing snowy forest and cut-paper storybook style, image 4 defines the empty snow globe. The picture should feel like the warm, joyful grand finale of this same story. Santa and the wizard stand together outside the globe, smiling happily and warmly waving to the reader. Preserve Santa's red suit, fluffy white beard, round dark eyes, brown boots; preserve the wizard's brown curly hair, purple star-patterned hat and cloak, white lace dress, star-detailed boots and warm gold staff. Show exactly one Santa and one wizard. The small EMPTY snow globe with its same brown wooden base sits behind them as a quiet sign of the rescue, with no figure inside. Same snow-laden evergreen forest and deep blue starry Christmas night, enriched with warm golden illumination and a gentle celebratory scattering of gold starlight and snow sparkles. Match the richly textured handmade cut-paper / embossed paper / layered watercolor look of the references, detailed and warm, not plastic 3D or flat icons. Keep both characters' full bodies and friendly faces legible together in a generous central grouping, neither touching image edges, so this one illustration can be displayed uncropped on phone and desktop. The globe is secondary and smaller than the characters. Bright joyful mood with breathing room. No text, typography, frame, UI controls, logos or watermarks. No extra people, animals, vehicles, boxes, gifts, parties, additional narrative events, magic beams or imprisoned Santa.
```

## 確認

- `npm test`：80件中78成功・非公開原本の直接照合2件スキップ。箱順・紙ID・早期合言葉・辞退と再開・救出と保存・台詞と録音の検査を維持した。
- ビルド済みPagesのChromium：関連46件成功（4.6分、標準1 worker）。表紙・三箱・読み返し・8849・救出操作・音声の順序と取消・画像失敗時の継続を確認。今回の変更後に全113件を実行したとは扱わない。
- 最後の読み返しレイアウト修正後は、結末3件・救出の7寸法と旧保存2件・全履歴の読み返し1件を再実行し、6件成功（1.5分）。音声コードはこの修正では変更していない。
- 大団円は7寸法で画像全体と主要操作の収まりを確認。保存再開・最後の読み返し・画像取得失敗・取得遅延・やり直し後の遅い応答も検査した。
- 読み返しでは三箱すべての閉じた場面と開箱の場面を通し、静止画の錠・全体表示・操作欄なし・保存不変を確認。新しい舞台の画像が到着するまで描画完了と扱わない。
- 最後の読み返しでは、横向きのページ送り・終了ボタンが下にはみ出す問題も修正した。操作欄の高さを内容に合わせ、低い横画面では重複する「読み返しの時間」を省く。7寸法で画像全体、44px以上の操作ボタン、画面内への収まり、保存不変を再確認した。
- 最終ビルド・Pagesのヘッダー／音声Range／非公開資料404検査は成功。新しい画像・コード・確認画像を含む公開対象458ファイルの検査と、既存差分・新規ファイルの空白検査も成功。公開対象の検査には一時Git indexを使い、実際のステージ状態を変えていない。未追跡の既存引継ぎ資料は含めていない。

以下は最終ビルドの実画面。素材の人物・空の球・絵柄も目視確認した。

- [大団円・390×844](finale-reading/complete-390x844.png)
- [大団円・568×320](finale-reading/complete-568x320.png)
- [大団円・1280×720](finale-reading/complete-1280x720.png)
- [読み返しの最後・390×844](finale-reading/reading-last-390x844.png)
- [読み返しの最後・568×320](finale-reading/reading-last-568x320.png)
- [読み返しの閉じた箱・390×844](finale-reading/reading-box-390x844.png)
- [読み返しの開いた箱・390×844](finale-reading/reading-boxResponse-390x844.png)

実機・子どもの初見試遊・主観的な音声確認は未実施。今回の変更はローカルのみで、既存PR・main・本番公開を更新していない。
