# 初めてのGA4設定ガイド

2026-10-12。**Googleアカウント・規約承諾・Cloudflareの環境変数・GA管理画面は本人が操作します。Codexが代行したことにはなりません。** プロパティを先に作る必要はありません。先に作る場合もタグを別途HTMLへ貼らず、測定IDを保存するだけにします。

現在は**Production・Previewとも計測を無効のまま維持する**。[CFの設定画面とOFF設定](GA4-CLOUDFLARE-SETTINGS.md)、[海外公開を含む対応範囲](GA4-PRIVACY-SCOPE.md)を先に確認する。以下のID入力・承認・再ビルド・Realtimeの手順は、将来有効化を認めた場合の参考であり、今回実行する手順ではない。

2026-10-13、本人からイベント保持2か月、保持リセット・シグナル・広告パーソナライズ・拡張計測OFF、Google広告リンクなし、アカウント共有4項目OFFの完了報告を受けた。[作業済み項目と公開の前提](GA4-SETUP-PROGRESS.md)を参照し、同じ設定をやり直さない。趣味・無料・子どもも利用する海外公開の条件判断は引き続き未完了。

## 1. アカウント・プロパティ

1. [Google Analytics](https://analytics.google.com/)へ自分のGoogleアカウントでログイン。「測定を開始」、または左下「管理」→「作成」→「アカウント」。アカウント名は例「takatama」。Googleへのデータ共有は必要なものだけにする。
2. プロパティ名「サンタの脱出 本番」。レポートのタイムゾーンを日本、通貨を日本円にする。業種・規模・ビジネス目標は実態に合わせる（アクセス・ユーザー行動の把握）。
3. 表示される地域向け利用規約・データ処理条件を本人が読み、同意できる場合だけ作成する。子ども利用の条件は[確認文書](GA4-PRIVACY-REVIEW.md)で判断する。
4. 同じ手順で「サンタの脱出 検証用」を別プロパティとして作成しておくと、DebugViewやプレビューの検証が本番へ混じらない。

Google公式：[アカウントとプロパティの作成](https://support.google.com/analytics/answer/14183469?hl=ja)。管理画面の文言・配置が変わることがあるため、検索窓で「データストリーム」等を検索してもよい。

## 2. ウェブデータストリーム・測定ID

1. 管理→「データの収集と修正」→「データストリーム」→「ストリームを追加」→「ウェブ」。
2. URLは `https://santa-claus-escape.pages.dev/`、名前は「日本語ゲーム 本番」。実際に使う独自ドメインがあればそのURL。
3. **拡張計測はオフ**。特にフォーム操作・検索語・クリック・ブラウザ履歴によるpage_viewを有効にしない。本作品はconfigによる標準page_viewと必要なゲームイベントだけを送る。
4. 「ストリームを作成」。詳細にある「測定ID」 `G-...` を控える。数字だけのプロパティID／ストリームIDやGTM-IDとは異なる。
5. 「Googleタグを手動でインストール」のコードを追加しない。今回の実装が同意後にタグを一回だけ読み込む。追加するとPV重複や同意前の送信につながる。
6. 検証用プロパティにもウェブストリームを作り、**別の測定ID**を控える。

## 3. 収集・プライバシー設定

管理→「データ設定／データ収集」でGoogleシグナルと広告パーソナライズをオフ、広告連携を作らない。「データ保持」はユーザー・イベントデータ2か月。「データ共有」は必要最小限。ウェブストリームの拡張計測がオフであることを再確認する。

### 削除依頼の準備

GA管理画面に「削除依頼を受け付ける」というスイッチを設定する作業ではない。運営者が、非公開の受付先・対象ブラウザの特定方法・Googleへの削除操作・依頼者への返信を準備する。2026-10-13に[Googleフォームの相談窓口](CONTACT-FORM.md)を用意したが、Cookie識別子等は入力しないよう案内しており、GAデータの安全な対象特定方法は未整備。[個別削除の具体的な手順](GA4-DELETION-PROCEDURE.md)を参照する。

「許可を取り消す」は以後の送信停止と端末内GA Cookie削除。「2か月の保持」はイベントデータの保持設定。「既にGoogleへ送った個別データの削除」は別の処理である。保持設定は標準の集計レポートを一律に削除するものではない。[Googleの保持の説明](https://support.google.com/analytics/answer/7667196?hl=ja)。

## 4. Cloudflare Pagesへの設定

本人がCloudflareダッシュボード→Workers & Pages→`santa-claus-escape`→Settings→Variables and Secrets（または環境変数）を開く。ビルドは `npm run build`、出力は `dist` のまま。

| 変数 | Production | Preview |
| --- | --- | --- |
| `SANTA_GA4_ID` | `G-MHGWR7DQGB` | 設定しない |
| `SANTA_PUBLIC_URL` | 本番のHTTPSルートURL。未設定は既存Pages URL | 同じ本番URL（OGPと共有の正規URL） |
| `SANTA_GA4_POLICY_APPROVED` | 条件確認が完了した場合のみ `true` | 検証用も条件確認後に `true` |
| `SANTA_GA4_TEST_ID` | 設定しない | `G-B2YBCVGPDD` |
| `SANTA_GA4_TEST_ORIGIN` | 設定しない | `https://codex-release-readiness.santa-claus-escape.pages.dev` |

上表は**将来の有効化用**。今は両環境の`SANTA_GA4_POLICY_APPROVED`を未設定または`false`に保つ。測定IDを受領済みでも承認されたことにはならない。海外の子ども利用を含む条件確認は[対応範囲](GA4-PRIVACY-SCOPE.md)に従う。

Cloudflareが供給する `CF_PAGES` と `CF_PAGES_BRANCH` は上書きしない。main以外へ本番IDだけ設定しても計測は無効。ProductionとPreviewの両方に同じIDをコピーしない。設定変更は次のビルドへ反映される。今回のPRではmainへマージ・本番ビルドの再実行は行わない。

2026-10-12に本人から本番・評価の測定IDを受領した。上表はCloudflareへ入力する値であり、IDをJSへ直接埋め込んだり、Cloudflareの環境変数を代行設定したりしていない。

### 承認フラグをtrueにしてよい条件

`SANTA_GA4_POLICY_APPROVED` はこの作品独自の運営者確認フラグ。Googleが発行・審査する値ではなく、`true` と書くこと自体で必要な同意や適用条件が解決するものではない。

本番は以下を運営者が確認してから、**Productionの値欄へ半角の `true`（引用符なし）**を入力する。未確認なら未設定または `false` のままでよい。

- 子ども向けに該当するか、提供地域と適用条件、必要な保護者同意の方法について判断と根拠を記録した。[条件確認](GA4-PRIVACY-REVIEW.md)を参照。現在の子どものボタン操作だけを保護者同意の確認に置き換えない。
- Googleシグナル・広告パーソナライズ・広告連携・拡張計測をオフにし、イベント保持を2か月にした。
- 運営者、目的、送信内容、Cookieの扱い、非公開の削除依頼窓口と手続きがprivacy.htmlの説明と一致する。[削除手順](GA4-DELETION-PROCEDURE.md)の未整備箇所を解消した。

評価環境の承認は本番と別に扱う。例えば成人の本人だけがローカルで試す場合は、その限定した評価範囲の規約・同意・削除手順を確認して評価側だけ `true` にし、本番は `false` を維持できる。公開のプレビューURLにしただけで成人限定になるわけではない。評価で動いたことを、子ども向け本番利用の条件確認へ読み替えない。どちらもフラグだけでは送信せず、ゲーム内の「計測を許可する」が必要。

### 毎回変わるURLと固定URL

`SANTA_GA4_TEST_ORIGIN` はURLの完全一致。`*.santa-claus-escape.pages.dev`、複数URL、パス、クエリは指定しない。Cloudflareの `<hash>.santa-claus-escape.pages.dev` はデプロイごとに変わるが、同じブランチのaliasは最新デプロイへ追従する。[Cloudflareのpreview aliases](https://developers.cloudflare.com/pages/configuration/preview-deployments/#preview-aliases)。

今回の評価では **`https://codex-release-readiness.santa-claus-escape.pages.dev/` から開く**。環境変数の値は上表のとおり末尾の `/` なしでよい。ハッシュURLや他のブランチから開くと、originが違うため計測しない。ブランチを変更した場合だけ、この設定も変更して再ビルドする。OGP画像の `CF_PAGES_URL` と計測originは別の用途である。

### 環境変数の変更後

**新しいビルドとデプロイが必要**。この作品はビルド時に環境変数を `dist/analytics-config.js` と `dist/_headers` へ書き込むため、設定を保存しただけでは既存のHTML/JS/CSPは変わらない。

1. PagesのSettingsでProduction / Previewを選び、上表の値を保存する。
2. 対象ブランチの新しいコミットのpush等で、新しいビルドを行う。ダッシュボードの再ビルド／再試行を使う場合も、完了後に設定の反映を確認する。GA実装を含まない古いコミットを再デプロイしても計測機能は増えない。
3. 成功後、固定aliasから開く。`/analytics-config.js` を直接表示し、評価なら `measurementId` が `G-B2YBCVGPDD`、`origin` が固定alias、承認済みなら `approved:true` であることを確認する。
4. ブラウザを再読み込みし、ゲーム内で許可してから評価用プロパティのRealtime / DebugViewを見る。変数が更新されても、既に開いているページには古い設定が残ることがある。

Productionの再デプロイは本番公開になる。現時点ではPR #10〜#14は未マージなので、評価はPR #14のブランチから行い、本番の再公開は別途判断する。ここでは本番の再デプロイを実行しない。

ローカルの検証も別IDを明示したビルドを使う。PowerShellの例（本番IDを使わない）：

```powershell
$env:SANTA_GA4_TEST_ID='G-B2YBCVGPDD'
$env:SANTA_GA4_TEST_ORIGIN='http://127.0.0.1:4174'
$env:SANTA_GA4_POLICY_APPROVED='true'
npm run build
npm run preview
```

`npm start` のソース設定は常に無効。ローカル値はシェルを閉じるかRemove-Item Env:...で解除する。IDは秘密鍵ではない。APIキーやサービスアカウントは不要。

## 5. カスタムディメンション

管理→「データの表示」→「カスタム定義」→「カスタムディメンションを作成」。すべてスコープは**イベント**。

| 表示名 | イベントパラメータ | 意味 |
| --- | --- | --- |
| 箱の色 | `box_color` | red / blue / yellow |
| 手がかりの段階 | `hint_step` | 1 / 2 / 3 |
| 合言葉時の紙枚数 | `paper_count` | 0 / 2 / 4 / 6 |
| 再開した場面 | `resume_phase` | 保存場面 |
| 共有方法 | `method` | native / copy / manual_copy |

イベント名・ページURL・流入元は標準項目を使う。ユーザーID、セッションID、時刻を登録しない。登録後の通常レポート反映は24〜48時間程度を見込む。[公式のカスタムディメンション説明](https://support.google.com/analytics/answer/14240153?hl=ja)。

## 6. リアルタイム・DebugView

1. 検証用プロパティ、固定のプレビューoriginを設定。テスト用ビルドは `debug_mode=true`。本番はfalse。URLにdebugパラメータを足して本番計測を迂回しない。
2. 自分のブラウザで開き、「音の設定」→「プライバシー・利用状況の計測」→「計測を許可する」。ネットワークでGoogleタグが一回だけ取得されるか確認。
3. GAの「レポート」→「リアルタイム」でpage_view、game_start等を見る。「管理」→「データの表示」→「DebugView」で色・段階を確認。
4. 赤い箱を調べる→正解で解錠、残りの箱、合言葉、救出まで遊ぶ。答えや数字がパラメータにないことを確認。
5. 再読み込み→「続きから遊ぶ」はgame_resumeのみ。クリア済みの再開・読み返しでgame_completeが増えないことを確認。
6. 許可しない／未選択／取り消した後は送信しないこと、広告ブロッカーでも遊べることを確認。ローカル未設定や通常プレビューではGoogleへのリクエストがゼロ。

反映されない場合はプロパティ違い、承認フラグ、origin違い、同意未選択、広告ブロッカー、CSP、拡張計測・他タグ重複を確認する。検査のために本番へ別のタグを貼らない。Googleに実際に到達したかは管理画面確認が必要で、今回のローカルのタグ代替テストだけでは確認済みにしない。[DebugViewの公式説明](https://support.google.com/analytics/answer/7201382?hl=ja)。

## 7. 開始率・クリア率・流入比較

「探索」→「ファネルデータ探索」。期間は例：公開後7日。閉じたファネル、ステップは間接的に続く設定。

1. 開始率：step 1 イベント名=page_view、step 2=game_start。step 2へ到達したユーザーの割合を記録。
2. 完了率：step 1=game_start、step 2=spell_completed、step 3=game_complete。箱の順は固定しない。開始と完了の2段階版も作り、分母を揃える。
3. 箱別：自由形式探索で行=箱の色、列=イベント名、値=総ユーザー数・イベント数。box_openedとhint_revealedにフィルタ、必要なら手がかりの段階を追加。
4. 再開：game_resumeでフィルタ、行=再開した場面、値=総ユーザー数・イベント数。
5. 共有：shareでフィルタ、行=共有方法、値=総ユーザー数・イベント数。
6. 流入：ファネルの内訳へ「セッションの参照元／メディア」。少ない流入は個別行動の推測を避けてまとめる。共有リンクのUTMと通常リンクの比較条件を揃える。

期間・母数・率・同意による欠測をCSV等へ保存する。イベント件数だけで「何人が完走した」と言わない。既存保存からの再開、複数回プレイ、別端末、Cookie削除、SNSのreferrer欠落を制約として記事へ残す。[計測設計](GA4-EVENT-DESIGN.md)の定義を使用する。
