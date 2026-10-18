# 素材とライセンスの記録

2026-10-13更新。コード等のMITと、第三者音源の条件を分ける。

## 現在の公開判断（2026-10-13）

運営者は、問い合わせによる追加確認の経路を確保できないことを踏まえ、Gemini TTSで制作時に事前収録した音声を静的配信する現状の利用を了承した。ゲームの実行時にGemini APIは呼ばない。公式回答の取得を公開前の必須作業から外す。年齢条項への公式見解を取得したことや、適用外と確認できたことを意味しない。

結末の鈴は使用しない。以下の各制作・統合時点に記載した音声の確認事項は当時の記録であり、今回の残作業はこの判断と[公開確認表](docs/RELEASE-CHECKLIST.md)を参照する。

## MITの対象

実装、SVG/CSSの絵、設計・確認スクリプト、原作をもとにした台詞・謎のデータはMIT。原作参照・変更点は prototype/SOURCE-NOTES.md と prototype/FULL-GAME-NOTES.md に記録。

Gemini TTSで制作した台詞のWAVと、その台詞だけを結合した音声はMIT。生成入力・声・ハッシュは prototype/reference/audio-generation/。API受信原音のC2PAを保持し、派生音声は元のハッシュと処理を記録する。rescue-dialogue.wav と rescue-ending.wav は既存の生成原音をバイト一致で再利用。BGMの *-loop.wav は第三者素材で、このMIT表記に含めない。声選びの試聴・試聴派生ファイルはMITだが、Pages配信対象ではない。PR Dでは、利用者の指定により枝の場面の案内一文だけを追加収録した。

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

`prototype/assets/red-box/` の三枚（赤い箱の本体・ふた、たぬき）は PR #1（aead6e9）の制作済み生成イラストを無加工で再利用しています。旧試作は廃止しました。ここから下の `illustrated-prototype/` はGit履歴の参照パスで、制作情報・出典はコミット `aead6e9b69c7c1c264d9730a1bc1737fd0a73b7c` と各素材の `docs/pr-*/art-provenance.json` に保持しています。コードと生成イラストには本リポジトリのMIT Licenseを適用します。参照元の第三者の製品写真は同梱しません。音声・音楽・効果音はmainの素材と条件を引き継ぎ、新規生成や結末の鈴の追加はありません。事前生成音声の利用条件に関するPR #2の指摘の解消は、本番公開前の確認事項です。

## PR Bで再利用した絵と操作

`prototype/assets/blue-box/` の三枚（青い本体・ふた・山）と `prototype/assets/yellow-box/` の五枚（黄色い本体・ふた・グー・チョキ・パー）は、PR #1の `aead6e9b69c7c1c264d9730a1bc1737fd0a73b7c` から無加工で再利用。生成イラストには本リポジトリのMIT Licenseを適用します。生成記録は同コミットの `illustrated-prototype/blue-box/assets/PROMPTS.json` と `illustrated-prototype/yellow-box/assets/PROMPTS.json`、配布ファイル・出典・SHA-256は `docs/pr-b/art-provenance.json` に記録しています。手の描画だけ、PR #1と同じ右手向き・掌の尺度に合わせます。素材自体は変更しません。

箱本体・ヒンジ・紙・ダイヤル・雪払いの共通部分と、色別の手がかり描画をPR A・PR #1から取り出しました。黄色の一手表示は既存の四枚の絵を拡大する補助です。新しい絵・声・音楽・効果音の生成はありません。原作の台詞・答え・音素材と、その利用条件を引き継ぎます。音声利用条件に関するPR #2の指摘は、本番公開前の確認事項として残ります。

## PR Cで再利用した絵と紙の操作

`prototype/assets/papers/forest-clean.png` と `globe.png` は、PR #1の `aead6e9b69c7c1c264d9730a1bc1737fd0a73b7c` の `illustrated-prototype/assets/` から無加工で再利用。本リポジトリのMIT Licenseを適用します。生成記録は参照コミットの `illustrated-prototype/assets/PROMPTS.json`、出典・バイト数・SHA-256は `docs/pr-c/art-provenance.json` に記録しています。サンタは球の中の既存の絵のままです。新しい枝・発見・救出の操作はありません。

紙の質感、移動・交換、選択・置く先の表示、ドラッグ中断とタップ・キーの代替操作は、同コミットの `illustrated-prototype/letters/` を参照して既存の原作状態へ統合しました。紙IDは `papers(state)`、判定は既存の `SPELL` と表記正規化を使用。PR #1のjourneyの状態・保存・自動遷移は移しません。原作の六文字の説明と召喚の声・効果音を再利用し、新しい音声・音源・イラストは生成しません。事前生成音声の利用条件は、引き続き本番公開前の確認事項です。

## PR Dで再利用した枝・まほう使いと操作

`prototype/assets/witch/branch.png` と `wizard-feet-v2.png` は、PR #1の `aead6e9b69c7c1c264d9730a1bc1737fd0a73b7c` の `illustrated-prototype/assets/` から無加工で再利用。本リポジトリのMIT Licenseを適用します。生成記録は参照コミットの `PROMPTS.json` と `WIZARD-FEET-EDIT.md`、出典・バイト数・SHA-256・原本のバイト一致は `docs/pr-d/art-provenance.json` に記録しています。PR Cの森・球の画像は同じファイルを共用し、複製しません。

同コミットの `scene-math.js` の枝の変形・方向計算、`main.js` の枝と操作点、`witch/scene.js` の会話構図とサンタを球内に保つ表示を参照し、既存の原作状態・字幕・音声へ統合しました。PR #1のjourney、保存キー、会話モデル、約2秒の自動移動は移しません。新しい画像・効果音・BGMは生成していません。既存の音素材と利用条件を引き継ぎ、事前生成音声の利用条件は本番公開前の確認事項として残します。

2026-10-11の利用者の明示指定により「枝の向こうに誰かがいるようです。」をGemini TTS（`gemini-3.8-flash-tts`、既存の案内役と同じ `Sulafat` と演技指定）で一文だけ生成しました。`prototype/assets/audio/ja-branch-discovery.wav` はAPI受信原音を無加工で保存。生成入力・日時・使用量・SHA-256は `prototype/reference/audio-generation/ja-branch-discovery.json`。生成は制作時だけ行い、ゲームから外部APIを呼びません。

## 同梱しないもの

原作ソース全文、Drive原本・一覧、APIキー・認証情報、取得・解析用ライブラリは非公開。原作の jingle.mp3 は使用せず、同梱・代替とも行わない。2026-10-13に本人が鈴を使わない方針を再確認したため、許諾確認は今回の公開前作業から外す。原作の出典・利用条件の記録は履歴として保持する。

## PR Eで再利用した救出の絵と操作

`prototype/assets/rescue/empty-globe.png` と `santa.png` は、PR #1の `aead6e9b69c7c1c264d9730a1bc1737fd0a73b7c` の `illustrated-prototype/rescue/assets/` から無加工で再利用。本リポジトリのMIT Licenseを適用します。制作記録は同コミットの `PROMPTS.json`、出典・バイト数・SHA-256・参照コミットとのバイト一致は `docs/pr-e/art-provenance.json` にあります。森・元の球・枝・まほう使いはC/Dの画像を共用します。

`prototype/assets/rescue/empty-globe-original-v2.png` は、2026-10-11のユーザーの明示依頼により、元の `prototype/assets/papers/globe.png` からサンタだけを消す目的で組み込みImageツールで編集生成した透過PNGです。元ファイルを保持し、球全体の編集画像を使います。旧empty-globeとの部分合成は削除しました。使用プロンプト、入力/出力のSHA-256と実際の保持範囲は `docs/pr-e/art-provenance.json` に記録。本リポジトリのMIT Licenseを適用します。

同コミットの救出の開口・単一サンタの移動、倍率、足・服の局所変形と光の計算を既存の原作状態に統合。森と球のカメラはDの会話と共通です。つまみは指と同じ距離で右へ進み、完了前の逆操作とタップ・キーに対応します。PR #1のjourney、別保存、約2秒の自動移動、試作のスライダー・百分率は移しません。声・音源の新規生成はありません。救出には既存の発話区間とshine3を使い、未許諾の結末の鈴は追加しません。事前生成音声の利用条件は引き続き本番公開前の未解決事項です。

以下は、その後廃止した途中案の記録です。最終版は上記の編集画像 `empty-globe-original-v2.png` を球全体に使用します。

利用者の確認に基づき、救出の球は既存の元の球の輪郭・ガラス・台座を保ち、サンタがいた内側だけ既存の空の球で実行時に補います。元の画像ファイルを加工・再生成しません。初回に球が一度光る短い描画演出と、救出操作による完了保存を追加し、杖からの細い線と結末の確認ボタンを削除しました。

## 2026-10-11：全編の設定・音声と大団円の追加

ユーザーが承認したスノードーム設定と青い箱の文案へ揃えるため、既存と同じGemini TTSの声で6点を各一回収録しました。既存の会話を再利用した結合音声を含め `prototype/assets/audio/storybook-*.wav` の8点と、対応する `prototype/reference/audio-generation/storybook-*.json` を追加。生成原音・入力・使用量・ハッシュ・結合元を記録し、元の録音と制作記録を保持しています。生成音声と台詞の派生音声は本リポジトリのMIT Licenseを適用し、BGM・効果音の条件は引き継ぎます。実行時APIは使いません。制作と検査は [全編の仕上げ](docs/PR-F-STORY-FINISH.md)。事前生成音声の利用条件に関する未解決事項を、この追加で解決済みとは扱いません。

`prototype/assets/rescue/finale-v1.png` は、同日のユーザーの「一番最後は画像を一枚つくって、大団円の雰囲気にしたい」という指定で、組み込み画像生成ツールにより一回生成したイラストです。既存のサンタ・まほう使い・森・空の球を参照し、元の素材は変更していません。本リポジトリのMIT Licenseを適用します。寸法1254×1254、3,326,993 bytes、SHA-256 `dc6cd0ed99d927f3b98e0bc6b904cacfcb8616c3292eab6b300743aa97ffd659`。正確なプロンプト・参照ファイル・検証範囲は [読み返しと大団円の記録](docs/FINALE-READING-FINISH.md)。新しい台詞・BGM・効果音・結末の鈴は追加しません。

当初の素材・設定の想定から変わった理由とユーザーの承認、残る確認は [全編統合の判断記録](docs/INTEGRATION-DECISIONS-2026-10-11.md) にまとめています。

## 2026-10-12 配信用の軽量化

制作・収録の原本WAVとPNG、生成入力、出典・利用条件・既存のハッシュ記録は保持します。配信用の音声AAC-LC（M4A）と画像WebPを追加しました。新しいTTSの生成、声の変更、原本の上書きは行っていません。対応表・原本と派生のSHA-256、寸法・アルファ・デコード長・容量・削減率は `docs/performance/assets.json`。画像は縮小せず、アルファを画素ごとに一致確認しました。元の生成イラストと同じMIT条件を引き継ぎます。

PeriTuneのOGGは原音のまま配信し、Vorbis非対応環境向けの原作由来WAVをAAC 128kbpsへ変換しました。元WAVも保持します。AACにも同じCC BY 4.0の表示条件が適用されます。効果音は再圧縮せず、原音・提供元の条件を引き継ぎます。未許諾の結末の鈴、未使用の録音・旧画像はdistへ入れません。素材の試聴・再配布サイトを作るものではありません。

事前生成音声の子ども向け静的配信に関する利用条件は、引き続き公開前の未解決事項です。形式変換を、条件確認済みという扱いにしません。

## 紹介画像

`prototype/assets/share-card.png` は既存の森・スノードームのPNGをHTML/CSSで配置した1200×630画像です。答えや結末を含めず、生成APIを使っていません。同じ生成イラストのMIT条件を引き継ぎます。出典と構成は `docs/ogp-provenance.json` と `scripts/create-ogp.mjs`、元の生成記録は `docs/pr-c/art-provenance.json`。

## 2026-10-18：まほう使いの部品アニメーション

`prototype/assets/witch/wizard-whole-v2.png` は、既存の女の子 `wizard-feet-v2.png` を参照して、組み込みImageツールで編集生成した全身一体の口閉じ／笑顔と手の素材です。首が不自然になった旧パーツ分割案を撤回し、独立して動くのは手だけにしています。原画は保持しています。配信用WebPは寸法・アルファを保持した形式変換です。本リポジトリのMIT Licenseを適用します。使用プロンプト・ハッシュ・実測した部品の登録方法は `docs/wizard-entrance/` に記録しています。音声の生成・変更はありません。

同日の追加依頼で `wizard-whole-v2.png` を組み込みImageツールで編集し、目と口を閉じた全身 `prototype/assets/witch/wizard-blink-v1.png` を追加しました。既存の全身・手は上書きせず、新素材の左上の全身だけを表情切替に使用します。配信用WebPは寸法・アルファを保持しています。同じMIT Licenseを適用し、プロンプト・ハッシュは `docs/wizard-entrance/prompt-blink-v1.md` と `blink-provenance.json` に記録しています。
