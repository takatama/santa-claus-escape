# Cloudflareの設定画面と計測OFFの維持

2026-10-13 JST更新。PR #10 → #12 → #13 → #14の続き。軽量化・OGP・共有はユーザー了承済み。**Production・Previewとも計測OFFを維持し、mainへのマージ・本番公開・管理設定の変更は行わない。**

## 画面確認の範囲

Codexのブラウザでは[Cloudflareダッシュボード](https://dash.cloudflare.com/)のログイン画面まで確認した。ログイン後のプロジェクト画面、保存済み環境変数、Web AnalyticsのスイッチをCodexが直接確認した記録ではない。以下では公式資料による案内と、本人が画面を操作して報告した結果を区別する。

2026-10-13までのユーザー報告：SettingsのBuild設定は本番main・`npm run build`・出力dist・Node 24、Variables and secretsに本番IDと評価IDがあり、`SANTA_GA4_POLICY_APPROVED=false`。MetricsのWeb Analyticsはdisabled。環境選択は画面で見つからなかったため、Production/Previewそれぞれの設定を確認したとは扱わない。管理画面の値はユーザーの報告であり、Codexの直接確認ではない。

同日、本人がCloudflareは通常の自己登録・個別Enterprise契約なし、同プロジェクトのCustom domainsはなしと報告した。最新PreviewのFunctions画面では、開始するには`/functions`を追加する旨の案内が表示された。コードとビルドもFunctions / Workersを使用しない静的構成（`backend:none`）であり、今回はFunctionsを利用していないとして整理する。独自ドメインやFunctions、ログ収集を新設する作業はない。Cloudflare内部の配信情報処理がないという意味ではない。

| 開く場所 | 確認すること | 今回の扱い |
| --- | --- | --- |
| Workers & Pages → `santa-claus-escape` → Settings → Environment variables | ビルド時の変数、Production / Previewの切り替え | 本人からVariables and secretsの値の報告あり。環境選択は見つからず、両環境を個別に確認したとはしない |
| 同プロジェクトのSettings内のビルド・Git設定 | 本番ブランチ`main`、`npm run build`、出力`dist`、Node 24 | 既存設定を確認。WorkersやFunctionsを追加しない |
| 同プロジェクト → Metrics → Web Analytics | クライアント計測用タグの自動挿入 | 本人からdisabledの報告あり。有効化しない |
| 同プロジェクト → Deployments | 環境、ブランチ、コミット、URL | PR #14のPreviewと本番を区別。Retry / Redeployは実行しない |
| 同プロジェクト → Custom domains | 独自ドメインの登録 | 本人からなしの報告あり |
| 最新PreviewのView details → Functions | Functionsの利用 | 本人から開始案内の報告あり。コードとビルドもFunctions未使用 |

ビルド変数の場所は[Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)、Variables and Secrets表記は[Bindings](https://developers.cloudflare.com/pages/functions/bindings/#secrets)を参照。今回の値は静的ファイルのビルドで読むため、Functionsのバインディングを新設する作業ではない。測定IDは公開される識別子であり、APIキーではない。

## 今維持する値

**今すぐ入力する必要はない。** 未設定ならそのままにする。次回の承認されたビルドに備えて明示する場合のOFF設定は次のとおり。

| 変数 | Production | Preview |
| --- | --- | --- |
| `SANTA_GA4_POLICY_APPROVED` | 未設定、または`false` | 未設定、または`false` |
| `SANTA_GA4_ID` | 未設定でよい | 未設定 |
| `SANTA_GA4_TEST_ID` | 未設定 | 未設定でよい |
| `SANTA_GA4_TEST_ORIGIN` | 未設定 | 未設定でよい |
| `SANTA_PUBLIC_URL` | `https://santa-claus-escape.pages.dev/`。未設定でも同じURLを使う | 同じ本番URL。プレビューURLを共有先にしない |
| `NODE_VERSION` | `24` | `24` |

測定IDを以前保存していても、承認フラグが未設定または`false`なら、今回のGA4実装はタグを読み込まない。新しい値を保存しただけでは、既に配信済みの設定は変わらない。稼働済みの計測を止める場合も新しいOFFビルドの配信が必要であり、管理画面の保存だけで停止したと判断しない。

`CF_PAGES`、`CF_PAGES_BRANCH`、`CF_PAGES_URL`はCloudflareの供給値を使う。APIキー、サービスアカウント、Geminiのキーは不要。独自ドメインへの切り替えは今回の作業に含めない。

## GA4以外のCF計測

Cloudflare Web AnalyticsはGA4とは別機能。PagesのMetricsからEnableすると、**次のデプロイでJavaScriptのbeaconが自動挿入される**。[Cloudflare公式の手順](https://developers.cloudflare.com/pages/how-to/web-analytics/)。GA4の承認フラグはこのbeaconを制御しない。計測OFFの方針に合わせ、Web Analyticsや別のタグの導入も行わない。

静的配信のリクエスト処理やエッジ側の統計は、ブラウザに追加するWeb Analyticsとは別。[Cloudflareの説明](https://developers.cloudflare.com/web-analytics/faq/)。GA4を止めても配信のための通信は発生するので、「外部への通信・情報処理が一切ない」と説明しない。

## 配信状態の確認記録

2026-10-12にPR #14の最新HEAD `de550c6` の[固定プレビュー](https://c08364e7.santa-claus-escape.pages.dev/)をHTTP取得した。

- `/analytics-config.js`は`measurementId:""`、`origin:""`、`approved:false`、`debug:true`。`debug:true`だけではタグを読み込まない。
- CSPのscript/connectはselfのみで、Google向け許可はない。
- このプレビューと既存本番のHTMLに、`static.cloudflareinsights.com` / `data-cf-beacon`は検出されなかった。保存済みスイッチや別の注入方法まで確認したものではない。
- GitHubの4本の最新PRはDraftのまま、verify / browser / Cloudflare Pagesは成功。本番ブランチは`231e3de72f2989e3353f3872a63408724d7b03dc`のまま。

将来、承認されたOFFビルドを確認する場合は、`analytics-config.js`の`approved:false`とGoogle向けCSPがないことに加え、ブラウザのNetworkでタグ・計測リクエストが発生しないことを確認する。保存済みの利用者許可があっても、運営者側のOFF設定が優先される。

今回の文書変更後、push前のローカル確認では、計測OFFのビルド、公開対象検査、Pagesのローカル配信検査、6文書の相対リンク35本、`git diff --check`を確認した。Chromiumの既存試験`analytics: production defaults and local gameplay send no Google requests`は1件成功。この確認時点ではGoogleへ実送信する検証、CFの設定保存、新しいデプロイは行っていない。全121件のCI成功は変更前の`de550c6`に対する結果で、この文書変更のCI結果ではない。今回の変更をPR #14のブランチへpushした後のCIとPreviewの確認結果は、PR #14に記録する。

## 将来の有効化は別段階

[プライバシー対応の範囲](GA4-PRIVACY-SCOPE.md)を先に確定する。本番ID`G-MHGWR7DQGB`、評価ID`G-B2YBCVGPDD`、固定評価originの値は[設定ガイド §4](GA4-SETUP-JA.md#4-cloudflare-pagesへの設定)に残すが、現在入力・有効化する指示ではない。

Previewの評価条件と本番の海外・子ども利用の条件は別。環境変数、承認、origin一致、利用者の任意選択が揃うまで送信しない。変数変更の反映には新しいビルドが必要。本番の再デプロイは本番公開に当たる。
