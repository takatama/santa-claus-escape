# 英語原作の確認と英語版の方針

2026-10-19。原作の確認記録と、利用者の採用指定に基づく実装。

## 今回の利用者指定

- `/en` は英語、`/ja` は日本語。
- `/` のみブラウザーの優先言語で転送する。日本語（`ja` / `ja-*`）は `/ja`、それ以外は `/en`。言語を取得できない場合も `/en`。
- `/en`、`/ja` の直接リンクをブラウザーの言語で転送しない。
- 原作英語をまず確認する。古い英訳をそのまま採用せず、自然で子どもにも分かる英語へ整える。
- 英語音声も制作する。Gemini APIキーが必要なら利用者へ伝える。

## 確認した原本

- [index.js](https://drive.google.com/file/d/1OzKQxpfxEA5Ib7J3Wg-IPIKJWCR4gUHi/view)：2021-01更新。今回取得したSHA-256は `b381e1eb9d9f8519eb3ef2c50f5ce101ff7ce9696ab6163a8b981de7fb1caefb`。既存の `game/SOURCE-NOTES.md` に記録された原本と一致。
- [witch_usersays_en.json](https://drive.google.com/file/d/1OBw9QLUZ7pQkmX9VZTnhDggYp1dqdrs3/view)：呼びかけの登録値は `sweetie`。文字列からの推測だけでなく、Dialogflowの入力候補を確認した。
- 原本のコピーを公開ゲームやGitへ追加しない。以下の行番号は今回取得した `index.js` に対するもの。

## 英語版に用意されていた遊び

| 場面 | 原作英語の内容 | 実装に向けた注意 |
| --- | --- | --- |
| 赤い箱 | `BAG is 217`、`BEE is 255` からA=1、B=2…を読み取り、四文字の単語を四桁へ変換 | 日本語のたぬきとは別の謎。現行の絵・書き込みも英語用に切り替える必要がある |
| 赤の候補 | ACID=1394、CAGE=3175、CHAI=3819、CHEF=3856、FACE=6135、HEAD=8514、ICED=9354、IDEA=9451 | 固定出題なら、子どもに身近な `FACE` が候補。原作のデータ名ANAGRAMと異なり、文字を並べ替える問題ではない |
| 青い箱 | Sagarmatha → Chomolungma → Everest と名前を順に示し、標高8848mを説明 | 現行日本語の「名前を検索し、高さで開ける」方針と差がある。現行設定を英語でも保ち、メートルの単位を明記、8848と8849を受理する案 |
| 黄色い箱 | 数字の英単語の文字数。`One is three. Three is five. Five is four. Four is the magic number.`、追加手がかり `Hundred is seven` | じゃんけんとは別の謎。例はone→3、three→5、five→4。hundredは7文字だが「100」の呼び方としては曖昧なので、書かれた語を明示する言い回しへ修正する |
| 黄の候補 | Two=3、Six=3、Seven=5、Eight=5、Nine=4から四つを選ぶ | 固定出題の案：TWO / SIX / SEVEN / NINE → 3354。原作の候補から選ぶ案であり、未採用 |
| 集める文字 | 赤 E/W、青 E/T、黄 E/I/S、計七枚 → `SWEETIE` | 日本語の六枚から枚数が変わる。青のTは場面によってtiger/tangoが混在しているため、表記・音声・絵を統一する |
| 最初のなぞなぞ | 年の終わりはDecember 31st。ではChristmasの終わりは？ → S | 日本語の生き物探しとは別問題。英語原作の二つの候補は実質同一。短い英語に整えて維持できる |
| 三択 | ツリーの赤い飾り → apple | 「赤い飾りはすべてりんご」と読める表現を避け、りんごをかたどった飾りという意味が伝わる設問に整える案 |
| 最後 | deerを十回 → What does Santa ride? → sleigh / sled | 仕組みを維持できる。英語原作のSSMLはdeerが九回のため、実制作では十回へ修正 |

主な根拠：箱の調査383–556、標高568–578、文字579–645・737–758、妖精760–800、救出823–881、赤黄の候補939–1010、後半1320行以降。

## 台詞の編集方針と例

物語、三役、遊ぶとサンタを解放する約束、正解数を救出条件にしない進行を保つ。舞台は現行版と同じスノードーム。短い文と身近な語を使い、サンタは温かく、妖精は無邪気に話す。以下は編集例であり、収録用の確定台本ではない。

| 古い英訳 | 自然な英語の案 |
| --- | --- |
| Someone speaks inside me. | Wait… I can hear a voice coming from the snow globe! |
| I'm so much in trouble. | Oh dear! I need to get the presents ready. Can you help me? |
| Each box has 2 or 3 characters. | There are two or three letters inside each box. |
| It seems something written on the box. | There's something written on the box. |
| Do you play with the fairy? | Would you like to play with the fairy? |
| If you make me happy, I will free Santa Claus. | Play with me, and I'll let Santa out! |
| You made me get out. | Thank you! You helped me get out! |
| The end of the year is December 31st, then what is the end of the Christmas? | The year ends on December 31st. What does Christmas end with? |

`SWEETIE` は大切な人を呼ぶ愛称。原作の妖精の登場台詞 `Your sweetie is here!` と対になっているが、日本語の「だいすきだよ」と同じ意味ではない。利用者から原作の謎と合言葉の採用指定を受け、七枚の文字と `SWEETIE` を採用した。登場台詞は `Ta-da! Your sweetie is here! …Oh! Who are you?` とした。

## 前セッション終了時の音声準備状況

前セッションでは `GEMINI_API_KEY` と `generativelanguage.googleapis.com` の許可が稼働中環境に反映されていなかったため、英語音声を生成せずPR #24へ引き継いだ。今回の引き継ぎ環境では変数の存在を確認し、API呼び出しも成功した。キーの値は表示・保存していない。

## 採用と実装

- 原作の英語の謎と `SWEETIE` を採用。赤は候補の `FACE → 6135`、黄は `TWO / SIX / SEVEN / NINE → 3354` に固定した。赤黄の絵の書き込み・雪の開示領域も別の英語用データを使い、日本語のたぬきとじゃんけんは日本語版に保持。
- 青は現在のブラウザー版にある名前の検索・標高の仕組みを共有し、英語ではメートルを明記。8848と8849をともに受理する。
- 後半はChristmasの末尾S、りんご、sleigh/sled。三択の選択肢は原作の太陽・りんご・トナカイの鼻を維持。設問は昔のツリー飾りという文脈を加え、すべての赤い飾りがりんごという断定を避けた。
- Eの説明語はegg、Wはwhale、Tはtiger、Iはigloo、Sはstarに統一。原作の役名fairy、三役の語り、寂しくていたずらした結末を保ち、台詞は短い自然な英語に書き直した。
- `locale.js` で明示パスから言語を選び、`language-entry.js` は `/` だけブラウザーの最優先言語で振り分ける。クエリ・ハッシュを保持し、直接リンクでは再選択しない。
- 配信用のHTMLは `/en` と `/ja` に生成し、`lang`、タイトル、説明、canonical、hreflang、OGPを言語ごとに設定。共有URLも選んだ言語を維持。
- 日本語の保存キー `santa-claus-escape:ja-full:v2` を維持し、英語は `santa-claus-escape:en-full:v2` に保存。七枚の紙と枠、ドラッグ・タップ・キー操作、再開、読み返しに対応。
- 設定に日英リンクを追加。音声の状態値と進行ロジックは共通にし、表示するラベルだけ翻訳。既存のアクセス解析OFFは維持し、英語の説明ページを追加。

## 英語音声の制作

`node game/scripts/generate-english-audio.mjs --plan` で確定した台詞と全69収録単位を確認できる。声は日本語版と同じSulafat（語り）、Algieba（サンタ）、Leda（妖精）で、英語の演技指示を使う。

`--generate` で制作し、WAV原本と入力・声・SHA-256の記録を保持、配信はAAC。既存ペアの台詞・声・ハッシュが一致する場合のみ再利用し、API失敗時に自動再試行しない。配信に登録するのはWAV/AAC/記録が揃ったものだけ。日本語の音声や日本語の時刻指定は英語で使わず、記録がなければ英語のブラウザー読み上げへ戻る。

前セッションではAPIキーとドメインの追加連絡を受けたが、稼働中環境には未反映のため英語収録を実行しなかった。2026-10-19の引き継ぎ環境では変数の存在と許可先を確認し、最初のAPI呼び出しが成功した。キーの値は表示・保存していない。


## 制作手順（前セッションの引き継ぎ）

1. この作業ツリーの差分を維持してから、新しい環境設定が適用されたセッションを使う。キーの値は表示しない。`cloud_environment.environment_status` で現在の設定・準備状態を確認し、`GEMINI_API_KEY` の存在と `generativelanguage.googleapis.com` の許可を確認する。利用者から下書き保存・公開済みとの連絡を受けたが、現セッションの環境は旧設定のまま。
2. 台本は `game/english-scenario.js`、収録単位は `game/english-audio.js`。`node game/scripts/generate-english-audio.mjs --plan` で全69単位を確認。
3. まず `node --use-env-proxy game/scripts/generate-english-audio.mjs --generate --id=intro-1` でサンタの短い一単位を生成し、音声を確認する。キーは環境変数で渡す。スクリプトもブラウザーにもキーを埋め込まない。
4. 確認後、`node --use-env-proxy game/scripts/generate-english-audio.mjs --generate` で残りを収録。成功済みのペアは照合して再利用する。自動のAPI再試行はない。ffmpegでAACを作り検査する。
5. 出力の台詞・発音・読み上げ速度・数字と文字・無音を確認し、必要な修正だけを行う。既存の台詞とハッシュが変わる録り直しは、旧音源を消さず別名で記録する。
6. `english-audio-manifest.js` の登録数が69であることを確認し、`npm test`、`npm run build`、`npm run check:pages`、英語ブラウザー検査を実行。音声を実再生して効果音・停止・聞き直し・ミュート・救出の分割を確認する。
7. 未生成という説明をREADMEと本記録で更新。現段階では公開していない。

クラウド環境のHTTPプロキシを使うため、生成時はNode.js 24の `--use-env-proxy` を指定する。通常の起動・ビルド・テストはAPIを呼ばない。

## 英語版実装時の検証結果（前セッション）

- `npm test`：115件成功、非公開原本との直接照合2件のみ既存どおりスキップ。英語は別プロセスで全6開箱順序×後半8正誤通り＝48経路、七枚の保存復元、早期呼び出し、英語音声への限定、ブラウザー読み上げの英語設定を検査。
- `npm run build` と `npm run check:pages`：成功。日英HTML、公開ファイルのバイト・ヘッダー・MIME・音声Range配信と、非公開ソースの非配信を確認。
- 英語のブラウザー検査：ブラウザー言語が日本語・英語・フランス語の場合の `/`、明示リンク `/en` `/en/` `/ja` `/ja/`、全編の操作、七枚の配置・再開、後半の回答、救出、読み返し、言語間の保存の独立を確認。
- 英語の七枚の紙は320×568、390×844、568×320、1280×720で確認。訪れた各場面では、本文・非表示の設定・ARIAラベル・画像説明にも未翻訳が残っていないことを検査（言語リンクの「日本語」は除く）。
- 日本語のブラウザー検査：箱・紙・物語・会話・救出・共有の59項目を確認。言語別URLに合わせて共有の期待値とテスト用CSPの適用先を更新した共有3項目も再実行し、成功。
- 前セッションでは英語録音がなかったため、英語のブラウザー読み上げを使用。今回の収録・再生検査は下記。

## 2026-10-19：PR #24の英語音声制作を継続

`codex/english-edition` のPR head `12841d2`を取得して制作。最初にサンタの `intro-1` を生成し、形式と波形を確認した後、残りを順番に生成した。69単位すべてのWAV原本・AAC・制作記録が揃い、`english-audio-manifest.js` に69件を登録。日本語の素材は変更していない。

- モデルと三役は既定のまま。APIキーは環境変数で渡し、生成入力・声・台詞・日時・使用量・原音SHA-256を69件の `game/reference/audio-generation/en-*.json` に保存。初回サンプルは再利用し、成功済みの音声の再生成はしていない。APIエラー・自動再試行なし。
- 使用量：入力1,330／出力12,185トークン。WAV原本は合計23,811,306 bytes。これは記録された使用量であり、請求額の確認ではない。
- 配信はAAC-LC、24kHz、mono、64kbit/s。WAV・制作記録を配信対象に含めず、実行時APIを使わない。AACのハッシュと原音・変換後の長さ・音量を `docs/performance/english-audio.json` に保存し、`check:media` で既存素材とともに検証する。
- オフライン再検査：`node game/scripts/verify-english-audio.mjs --write-report`。全69本の台本・声・原音ハッシュ・AACデコード・長さ・音量と、全場面の音声参照を検証する。ffmpegが必要。制作APIと外部の書き起こしサービスは呼ばない。
- `npm test`：115件成功、原本の直接照合2件スキップ。既存の配信素材数の期待値を、日本語77＋英語69＝146へ更新。
- 全69本の原音は合計487.28秒（約8分7秒）。クリップしたサンプルは0、先頭・末尾に1秒を超える無音なし。全AACのデコードと原音との音量差1dB未満を確認。AACの末尾パディングは最大1フレームまでを許容し、原音と変換後の長さを記録。
- 英語ブラウザー検査5件が成功（音声3件、言語振り分けと英語全編2件）。`npm run build`、`npm run check:pages`、`npm run check:audio`、`npm run check:media`、`npm run check:design` も成功。公開素材146点の音声Range配信と制作記録・WAVの非配信を確認。
- ブラウザーの音声専用検査3件：実AACをWeb Audioでデコードして導入を再生、聞き直し・停止・ミュートと古い終了通知の取り消し、青の8849の四桁・解錠からふたを開けた後の紙への切り替え、救出時の最初の声を保ったまま解放し、その終了後に効果音と結末を一度だけ再生することを確認。音声バッファは実データを使い、終了イベントの一部は検査で明示的に進める。OSからの出音を人が聞いた検査とは区別する。

### 残る試聴

発音・台詞の聞き取り・演技・数字の継ぎ目を人が確認する。とくに `en-yellow2-0` のTWO/SIX/SEVEN/NINEは遅めで、単語として読んでいるかを優先して確認。Sagarmatha、文字のE/W/T/I/S、deerが十回、任意四桁（0000、0123、8849）の継ぎ目も確認する。スマートフォン実機の出音と操作の確認は未実施。

再生用サンプル：`en-intro-1.m4a`（サンタ）、`en-red1-0.m4a`（語り）、`en-invite-0.m4a`（妖精）。原音を録り直す場合は旧音源を保持し、別名の記録を作る。機械検査とブラウザー検査の成功だけで発音・演技を確認済みと扱わない。

変更はPR #24の同じブランチへ保存し、試聴待ちのドラフトを維持する。mainマージと本番公開は行わない。
