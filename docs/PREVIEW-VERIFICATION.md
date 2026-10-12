# PRプレビューの配信確認

2026-10-12。mainへのマージ、本番の再公開、GAアカウントの操作は行わない。

## 確認方法

Cloudflare Pagesのデプロイ成功を確認し、そのデプロイの固定URLを使用する。`CF_PAGES=1`、該当ブランチ名、`CF_PAGES_URL` を同じ値にしたローカルビルドを用意し、`node scripts/check-deployed.mjs <固定プレビューURL>` で照合する。これはPagesのビルド・配信の確認であり、本番やスマホ実機を検証したという意味ではない。

- 全配信対象の本文を照合。テキストはCRLF/LFだけを正規化、音声・画像はバイト一致。
- CSP、Permissions-Policy、Referrer-Policy、nosniffをビルドと比較。
- 原本WAV/PNG、制作記録、非公開参照、テスト、制作スクリプトはHTTP 404。
- AACの最初の32バイトをRangeで取得し、HTTP 206・audio/mp4・Content-Rangeと本文を検査。
- Twitterbot / facebookexternalhit / Line風のUser-AgentでOGP画像のHTTP 200・image/png・1200×630を検査。本物のSNSカードの表示やキャッシュを確認したものではない。
- Chromiumで実プレビューの通しプレイ・保存・音声・読返し等を検査する。試験名と結果を記録し、APIの代替・通信失敗の模擬と実利用を区別する。

## 最終結果

最終HEADをデプロイした後、この欄へ固定URL・照合数・実ブラウザ結果を追記する。各PRの最新CIはGitHubのChecksを正とする。以前の失敗やローカルの一部成功を全体成功へ読み替えない。

本人の残りの確認は[公開確認表](RELEASE-CHECKLIST.md)。[性能比較](performance/COMPARISON.md)はP1時点の同条件実測で、今回のCloudflare全ファイル照合とは測定目的が異なる。
