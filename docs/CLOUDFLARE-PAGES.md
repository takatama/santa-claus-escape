# Cloudflare Pagesでの公開

このゲームは静的サイトです。Workers、Pages Functions、サーバー、DB、APIキーの設定は不要です。2026-10-05、利用者の指定によりPages用成果物まで準備し、Cloudflareへの実公開は利用者が行います。

## GitHub連携

Cloudflareの「Workers & Pages」から **Pages** の作成・既存Gitリポジトリのインポートへ進みます。

| 項目 | 値 |
| --- | --- |
| リポジトリ | `takatama/santa-claus-escape` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | リポジトリ直下（空欄） |
| Environment variable | `NODE_VERSION=24` |

GitHub連携の権限は必要なリポジトリだけに限定できます。`GEMINI_API_KEY`などの秘密情報はCloudflareに設定しません。音声は生成済みファイルを再生します。

ローカルで `npm run build` を実行すると、公開対象だけが `dist/` に生成されます。調査原本、制作スクリプト、生成時の記録、テストは出力されません。手動アップロードの場合はこのフォルダを使用します。

`npm run preview` はこの成果物を `http://127.0.0.1:4174/` で配信します。`npm run check:pages` はファイル一致、ヘッダー、音声Range、非公開パスの404をローカルHTTPで検査します。

`dist/_headers` にCSPなどのヘッダーを同梱し、`LICENSE`、`NOTICE.txt` に素材の条件を記録します。ファイルごとの25MiB上限をビルド時に検査します。BGM二曲のCC BY 4.0クレジットはゲーム内にも表示します。

## 公開後の確認

1. Pagesのデプロイ成功と `pages.dev` URLを確認。
2. 初回の「サンタを助ける」で音声が始まることを確認。
3. 三つの箱・言葉の回答・最後の救出まで進めることを確認。
4. 再読み込みで再開でき、音声停止・ミュート・リセットが動くことを確認。
5. スマホ実機で、声の聞きやすさ・効果音・画面幅を確認。

進行はブラウザのlocalStorageに保存されます。ローカルURL、プレビューURL、本番URLはそれぞれ別の保存先です。

公式資料：[静的HTMLの配信](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)、[Git連携](https://developers.cloudflare.com/pages/configuration/git-integration/)。
