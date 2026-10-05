# 素材とライセンスの記録

2026-10-05、ユーザーによるGitHub公開・MITライセンス指定に基づき、今回の成果物を公開。

## リポジトリに含むもの

- 実装、SVG/CSSの絵、設計資料、確認スクリプト：今回制作した成果物。MIT。
- 台詞・謎のデータ：利用者が提供した「Santa Claus Escape / サンタの脱出」の原作をもとにしたブラウザ試作・全編設計。今回の公開指定に基づきMITで同梱。参照元と変更点は `prototype/SOURCE-NOTES.md`、`design/FULL-GAME-DESIGN.md` に記録。
- `prototype/assets/audio/*.wav`：今回Gemini TTSで生成した音声と、その音声だけを制作時に結合した音声。MITで同梱。原作の録音の転載ではない。モデル、声、生成入力、SHA-256を `prototype/reference/audio-generation/` に記録。受信した原音WAVのC2PAメタデータを保持。
- `prototype/assets/audio/ja-leda-paused.wav`・`ja-leda-rescue.wav`：三役の会話を二話者単位で生成し、順番どおりに結合した派生音声。C2PA付き原音は `prototype/qa/fairy-production/*.wav` に保存（MIT）。派生ファイルに原音のC2PAをコピーせず、元のハッシュ、使用範囲、結合方法を生成記録に残す。
- `prototype/qa/*.jpg`：この試作のブラウザ画面の確認記録。MIT。
- `prototype/qa/blue-wrong-8849.wav`：今回の生成音声だけをつないだ試聴サンプル。MIT。生成された原音は変更せず、結合処理を `prototype/scripts/compose-answer-sample.mjs` に記録。
- `prototype/qa/fairy-voice-auditions/*.wav`：妖精役の声選び用に今回Gemini TTSで生成した試聴音声。MIT。生成入力・声・SHA-256は同フォルダのJSONに記録。受信した原音とC2PAを保持。`*-preview.wav` は平均音量だけをそろえた派生ファイルで、原音のハッシュと処理を記録。本編の配信ファイルには含めない。
- `prototype/assets/audio/laid-back.mp3`：Laid_Back — PeriTune。[公式配布ページ](https://peritune.com/blog/2017/01/25/laid_back/)。
- `prototype/assets/audio/spook4.mp3`：Spook4 — PeriTune。[公式配布ページ](https://peritune.com/blog/2018/09/28/spook4/)。

**上の二つのMP3はMITの対象外で、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)です。** 2026年2月以前の素材についての[PeriTune利用規約](https://peritune.com/about/)に従います。原作で指定されていた曲の、公式サイト配布MP3版を同梱しました。原作のStorage上のOGGループ版とファイルは異なります。ファイル自体は改変せず、再生時に音量・ループ・フェードを調整しています。ゲーム内とPages用NOTICE.txtにもクレジットを掲載します。

Googleは生成コンテンツへの所有権を主張しないとする[Gemini API追加規約](https://ai.google.dev/gemini-api/terms#use_of_generated_content)を確認。ここでのライセンスは同梱成果物に対するもので、Googleのモデルやサービスの権利・規約を変更しない。

## 効果音ラボの素材（MIT対象外）

| ファイル | 公式名称 | 使用箇所 |
| --- | --- | --- |
| `prototype/assets/audio/magic-cure2.mp3` | 回復魔法2 | 箱の正解 |
| `prototype/assets/audio/stupid3.mp3` | 間抜け3 | 箱の不正解 |
| `prototype/assets/audio/shine1.mp3` | きらきら輝く1 | 魔法使い登場 |
| `prototype/assets/audio/shine3.mp3` | きらきら輝く3 | サンタ救出 |

著作権：効果音ラボ。公式の[戦闘](https://soundeffect-lab.info/sound/battle/)・[演出／アニメ](https://soundeffect-lab.info/sound/anime/)から作品内の演出用途で取得。[効果音ラボの利用規約](https://soundeffect-lab.info/agreement/)が適用され、MITではない。第三者がこのリポジトリを利用する際も、この四音には提供元の規約が適用される。

[公式FAQ](https://soundeffect-lab.info/faq/)は、音源を含むゲーム・アプリの配布とGitHubでの公開を許可している。素材単体の再配布、素材集アプリ、公式ファイルへの直リンク、AI学習への利用等は許可されない。本作では素材ダウンロード・単体試聴の機能を設けず、作品の演出時にだけ再生する。

原作で指定された四音と同名の、現在の公式配布MP3を使用。原作保存ファイルとのSHA-256は一致しないため、同一バイト列とは記載しない。公式版のファイルは改変せず、再生時に音量を調整。取得ページ・ファイルURL・ハッシュ・照合結果は `prototype/assets/audio/sound-effects-provenance.json`。ゲーム内とPages用NOTICE.txtにも条件を記載する。

## リポジトリに含めないもの

原作ソースの全文コピー、旧ブラウザ画面、Dialogflow原本、Driveの資産一覧、調査資料の原本、APIキー・認証情報は含めない。

上記BGM二曲・効果音四点以外の原作音源は同梱しない。原作の参照URLと利用条件は `design/AUDIO-ASSET-AUDIT.md` に記録。とくに `dial.mp3` は作者・個別ライセンス未特定のため採用せず、ダイヤルの短い音をWeb Audioで自作した。第三者素材をMITへ変更するものではない。
