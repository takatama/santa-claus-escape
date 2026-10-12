# PRプレビューの配信確認

2026-10-12。mainへのマージ、本番の再公開、GAアカウントの操作は行わない。

## 確認方法

Cloudflare Pagesのデプロイ成功を確認し、そのデプロイの固定URLを使用する。`CF_PAGES=1`、該当ブランチ名、`CF_PAGES_URL` を同じ値にしたローカルビルドを用意し、`node scripts/check-deployed.mjs <固定プレビューURL>` で照合する。これはPagesのビルド・配信の確認であり、本番やスマホ実機を検証したという意味ではない。

- 全配信対象の本文を照合。テキストはCRLF/LFだけを正規化、音声・画像はバイト一致。
- CSP、Permissions-Policy、Referrer-Policy、nosniffをビルドと比較。
- 原本WAV/PNG、制作記録、非公開参照、テスト、制作スクリプトはHTTP 404。
- AACの最初の32バイトをRangeで要求し、ステータス・audio/mp4・本文を検査。206ならContent-Rangeと32バイト一致、200なら全ファイル一致と記録する。200を部分取得の成功と記録しない。
- Twitterbot / facebookexternalhit / Line風のUser-AgentでOGP画像のHTTP 200・image/png・1200×630を検査。本物のSNSカードの表示やキャッシュを確認したものではない。
- Chromiumで実プレビューの通しプレイ・保存・音声・読返し等を検査する。試験名と結果を記録し、APIの代替・通信失敗の模擬と実利用を区別する。

## 最終結果

P3実装 `9f9a2e4` の固定プレビュー：[61951d9b](https://61951d9b.santa-claus-escape.pages.dev/)。配信165ファイル（テキスト69、バイナリ96）一致、非公開104パス404、四つのセキュリティヘッダー一致。三種類のクローラー風UAでOGP画像の200・image/png・1200×630を確認。プレビューはnoindex付き。計測設定はID空・未承認で、通常の開始操作でもGoogleへのリクエストはゼロ。

実プレビューのChromiumは9件成功（1.6分）：通常の三箱→紙→枝→辞退・呼び直し→全問誤答→救出／紙0枚の早期経路と保存・再開／原音の救出導入／大団円の七画面サイズと読返し／GA未設定の通信ゼロ／完了・再開のイベント重複抑止／OGP取得／共有の成功・取消し・コピー・手動退避と保存不変。GAタグとOS共有APIは試験用に代替した検査を含み、実GA到達や本物のOS共有UIは未確認。

Range要求はAACが200で全30,000バイトを返した。既存本番のWAVも200で全175,024バイト、OGG二本も前後とも200（1,802,834 / 2,051,040バイト）。[Pagesの公式説明](https://developers.cloudflare.com/pages/configuration/serving-pages/)にもRangeへ200を返す挙動の記載がある。ローカル検査の206をCloudflareの206対応へ読み替えない。紹介画像・全本文の一致と再生を確認しており、このためにWorkers/Functionsを追加しない。AAC代替BGM二本は実プレビューでHTMLAudio再生が進み、paused=false・errorなしをChromiumで確認。iOS Safari実機は、200応答とAAC代替の組合せも重点確認する。

以後のプライバシー補正ではGA Cookieのドメインをゲームのhostnameに限定し、取消しがGA名のCookieだけを削除して進行保存と他のCookieを維持することをChromium3件で再確認する。最新デプロイの本文照合をPRへ記録する。各PRの最新CIはGitHubのChecksを正とする。以前の失敗やローカルの一部成功を全体成功へ読み替えない。

P0最新HEAD `99cfac4` は全116件、P1最新HEAD `0f451c1` は全118件のLinux Chromium検査成功。P2/P3の全体結果は最新PRのChecksへ記録する。単体はP3で104件中102成功・非公開原本照合2スキップ、設計モデル2592経路、原音・派生ハッシュ、build/公開/Pages検査成功。

本人の残りの確認は[公開確認表](RELEASE-CHECKLIST.md)。[性能比較](performance/COMPARISON.md)はP1時点の同条件実測で、今回のCloudflare全ファイル照合とは測定目的が異なる。
