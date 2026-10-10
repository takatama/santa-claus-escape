# 素材とライセンスの記録

2026-10-06更新。コード等のMITと、第三者音源の条件を分ける。

## MITの対象

実装、SVG/CSSの絵、設計・確認スクリプト、原作をもとにした台詞・謎のデータはMIT。原作参照・変更点は prototype/SOURCE-NOTES.md と prototype/FULL-GAME-NOTES.md に記録。

Gemini TTSで制作した台詞のWAVと、その台詞だけを結合した音声はMIT。生成入力・声・ハッシュは prototype/reference/audio-generation/。API受信原音のC2PAを保持し、派生音声は元のハッシュと処理を記録する。rescue-dialogue.wav と rescue-ending.wav は既存の生成原音をバイト一致で再利用。BGMの *-loop.wav は第三者素材で、このMIT表記に含めない。声選びの試聴・試聴派生ファイルはMITだが、Pages配信対象ではない。今回新しいTTS生成は行わない。

## 原作から復元した第三者音源

| 同梱ファイル | 作者・提供元 | 条件 |
| --- | --- | --- |
| laid-back-loop.ogg、同じ原作由来の laid-back-loop.wav | Laid_Back — PeriTune | CC BY 4.0 |
| spook4-loop.ogg、同じ原作由来の spook4-loop.wav | Spook4 — PeriTune | CC BY 4.0 |
| dial.mp3 | Clicking Dial on Toy — Zott820 の録音の切り出しと波形照合で判断 | CC0 1.0 |
| unlocking-1.mp3 | ロック解除 — 効果音辞典 | 提供元の利用規約。MIT対象外 |
| magic-cure2.mp3、stupid3.mp3、shine1.mp3、shine3.mp3 | 回復魔法2、間抜け3、きらきら輝く1・3 — 効果音ラボ | 提供元の利用規約。MIT対象外 |

上記の場所は prototype/assets/audio/。八つのOGG/MP3は原作コードが参照するファイルとバイト一致。OGG非対応環境用WAVは原作OGGを44.1kHz・16bit・ステレオPCMへデコードしたもの。サンプルレート・音量・速さを変えない。実行時にループ、音量、フェードを調整する。操作ごとのダイヤル音は原音の冒頭0.12秒、回答確定時は全体を使う。自作のダイヤル・解錠音は本編に使わない。

原作参照URL・ハッシュ・変換・照合は prototype/assets/audio/original-audio-provenance.json。四効果音の旧公式版との差は sound-effects-provenance.json。第三者サービスや生成AIへ音源を送らず、オフラインで波形を比較した。

### PeriTune

[Laid_Back](https://peritune.com/blog/2017/01/25/laid_back/) と [Spook4](https://peritune.com/blog/2018/09/28/spook4/) は2026年2月以前の曲で、[PeriTuneの案内](https://peritune.com/about/)による継続適用の [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) に従う。OGGは原作のループ版、WAVはそのデコード版。曲・作者・条件・加工をゲーム内とPages用NOTICE.txtへ表示する。

### Zott820 / Freesound

利用者提示の [Clicking Dial on Toy / 174770](https://freesound.org/people/Zott820/sounds/174770/) は [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。原作MP3の四区間は、公式プレビューの約12.4617秒以降に同じオフセットで対応する。波形比較から同じ録音の切り出しと判断。原作MP3とプレビュー全体のバイト一致ではない。作者とページを記録する。

### 効果音辞典

[機械Vol.1のロック解除](https://sounddictionary.info/machines-1/) の公式MP3と原作の unlocking-1.mp3 はSHA-256が一致。[利用規約](https://sounddictionary.info/terms-of-use/) のアプリの操作音への組み込み用途で使用。素材単体の再配布・試聴アプリ・ダウンロード機能は設けず、公式ファイルへ直リンクしない。

### 効果音ラボ

原作コメントの [戦闘](https://soundeffect-lab.info/sound/battle/)・[演出／アニメ](https://soundeffect-lab.info/sound/anime/) とファイル名を根拠とし、原作保存ファイルを演出に使用。[利用規約](https://soundeffect-lab.info/agreement/) とゲーム配布・GitHub公開を扱う [FAQ](https://soundeffect-lab.info/faq/) に従う。第三者の再利用でも四点に提供元の条件が適用される。原音の加工やAI学習への転用は行わない。

## PR Aで再利用した絵

`prototype/assets/red-box/` の三枚（赤い箱の本体・ふた、たぬき）は PR #1（aead6e9）の制作済み生成イラストを無加工で再利用しています。PR #1の制作情報・出典は `illustrated-prototype/` にあります。コードと生成イラストには本リポジトリのMIT Licenseを適用します。参照元の第三者の製品写真は同梱しません。音声・音楽・効果音はmainの素材と条件を引き継ぎ、新規生成や結末の鈴の追加はありません。事前生成音声の利用条件に関するPR #2の指摘の解消は、本番公開前の確認事項です。

## 同梱しないもの

原作ソース全文、Drive原本・一覧、APIキー・認証情報、取得・解析用ライブラリは非公開。原作の jingle.mp3 は現在の [OpenTracks利用ライセンス](https://opentracks.com/help/articles/license/) の公開形態の条件を確認中で、同梱・代替とも行わない。原作制作時の許諾記録を利用者へ質問中。
