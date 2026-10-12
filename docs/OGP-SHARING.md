# OGPと終了後の共有

2026-10-12。表紙で使う既存の森とスノードームだけをHTML/CSSで組み合わせ、1200×630のPNG紹介画像を作成。答えの数字・ひみつの言葉・救出後の絵を使わない。元PNGと既存の生成／出典記録は維持し、紹介画像の構成は `scripts/create-ogp.mjs` と `ogp-provenance.json` に記録。新しい画像生成APIは呼ばない。

`og:title / description / image / url`、type・locale・画像寸法・alt、Twitter Card `summary_large_image` を静的HTMLのheadへ出力する。JavaScriptを実行しないクローラーでも読める。[Open Graphの仕様](https://ogp.me/)に基づく。

正規URLは `SANTA_PUBLIC_URL`（未設定は `https://santa-claus-escape.pages.dev/`）。共有リンクはプレビューURLやその時点のquery/hashを使わず、常に正規URLへ向ける。Googleタグと別にURL設定をビルドへ渡せる。Cloudflareプレビューだけ `og:image` をそのデプロイの `CF_PAGES_URL` へ向けることで、mainを公開する前に画像の取得を確認できる。`og:url` と実際に人へ共有するURLは本番のまま。本番ビルドの画像は本番origin。

## 終了後の共有

completeかつ読み返し中でないときに「友だちに教える」を表示する。Web Share APIをクリックから直接呼び、非対応・失敗時はクリップボードへ。クリップボードも使えなければ、選択可能な読み取り専用URLと「コピーできた」を表示する。LINEの専用API、LIFF、ログインは導入しない。

キャンセル（AbortError）は共有イベントを記録せず、クリップボードへ勝手に切り替えない。native成功はGA4推奨 `share` のmethod=native、コピー成功はcopy、手動完了の確認はmanual_copyを一回送る。二重クリックは処理中フラグで抑止。共有の成否・計測の成否をゲーム状態、保存、救出条件へ反映しない。OSの共有UIを開くことで元からあるvisibilitychange/pagehideの音声停止が起こることはある。

共有APIの成功が示す範囲はOSに依存する。Windowsでは共有画面を開いた時点でPromiseが解決することがあり、相手への配信や実際に読まれたことを保証しない。[Web Share APIの仕様・挙動](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)。ネイティブ共有先のアプリ名・相手・共有メッセージは取得しない。

## 流入を比べる

終了後のリンクは `utm_source=friend`、`utm_medium=game_share`、`utm_campaign=release2026`、`utm_content=native/copy/manual_copy`。共有元の操作方法を比べるもので、ネイティブ共有の選択先をLINE/Xと特定するものではない。

運営者がSNSごとに紹介する場合は、個人名を入れず例として以下を使える（GAのURL許可リストにあるラベルだけ）。

- LINE向け：`https://santa-claus-escape.pages.dev/?utm_source=line&utm_medium=social&utm_campaign=release2026`
- X向け：`https://santa-claus-escape.pages.dev/?utm_source=x&utm_medium=social&utm_campaign=release2026`
- Qiita記事：`https://santa-claus-escape.pages.dev/?utm_source=qiita&utm_medium=referral&utm_campaign=release2026`

GAのセッションの参照元／メディアで比較する。アプリ内ブラウザのreferrer欠落や同意率の違いに注意し、共有API成功を流入人数と同一視しない。[イベント設計](GA4-EVENT-DESIGN.md)。

## 検査と人間の確認

単体102成功・原本照合2スキップ。共有・GA・既存大団円の関連Chromium 9成功、追加レイアウト確認は6成功。ネイティブ成功・取消し・クリップボード拒否はAPIを代替して検査した。保存本文が不変、読返しでは共有ボタンを出さない、七つの縦横サイズで操作が見えることを確認。実OSの共有画面や相手への送信は未実施。

クローラー風User-AgentでローカルPNGのHTTP 200、image/png、1200×630を検査。Cloudflareプレビューの実取得は公開確認に記録する。これは本物のX/LINEがキャッシュして表示した確認ではない。本番公開後、本人がSNSのカード表示を確認する必要がある。
