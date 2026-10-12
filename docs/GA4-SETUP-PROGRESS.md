# GA4設定の進捗と公開の前提

2026-10-13 JST。運営者：高玉 広和 / Hirokazu Takatama。以下の管理設定は、画面を操作したユーザーの完了報告に基づく。Codexが管理画面へログインして確認・変更した記録ではない。

## 設定済みとして確認したこと

| 設定 | 本番用 | 評価用 |
| --- | --- | --- |
| イベントデータの保持 | 2か月 | 2か月 |
| 新しいアクティビティでユーザーデータをリセット | OFF | OFF |
| Googleシグナル | OFF | OFF |
| 広告パーソナライズ | 許可0 / 307地域 | 許可0 / 307地域 |
| 拡張計測 | OFF | OFF |
| Google広告とのリンク | なし | なし |

アカウントのデータ共有は、Google products & services、Modeling contributions & business insights、Technical support、Recommendations for your businessの4項目をすべてOFFにして保存済み。同アカウントの他プロパティにも適用されることを説明し、ユーザーからその範囲を含む了承を得た。Googleによるサービスの維持・保護のための処理まで止まる設定ではない。[共有設定の公式説明](https://support.google.com/analytics/answer/1011397?hl=ja)。

CFは承認フラグfalse、Web Analytics disabledとのユーザー報告。Production / Previewを個別に確認した記録とは区別する。ゲームのGA4は無効のまま、mainへのマージ・本番公開・有効化・サブエージェント利用は行わない。

## 公開の前提として確認したこと

- 個人の趣味として無料公開する。
- 子どもが遊ぶことを想定する。子ども本人がSNSを利用することは前提ではない。
- 米国・EU・英国へ積極的に公開する。EU内の対象国、提供言語、告知方法の詳細は未確定。
- [問い合わせフォーム](CONTACT-FORM.md)は一般相談の非公開窓口として用意済み。ゲーム側へのリンクはPR #14のブランチとPreviewへ反映する。

## この前提で絞れることと、未確定のこと

1. **GA4をOFFに保つ現在の準備**では、GA4のための年齢入力、保護者登録、CMP、国別計測や独自IDを追加しない。問い合わせやCloudflare配信での情報処理は別に説明する。
2. **趣味・無料という事実だけでは、海外のすべての条件が免除されるとは判断しない。** 米国COPPAは商業的なサービス等を対象とするため運営形態が重要だが、Google等の第三者の処理も含めた今回の適用判断は未完了。[FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)。
3. EUの個人・家庭内活動の例外は、単に個人が運営するという意味ではない。公開作品で利用者の情報を処理する場合に例外を使えるかは別途評価する。[欧州委員会の説明](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en)。これは今回の公開構成に例外を自動適用しないという方針で、GDPRの適用を確定した判断ではない。
4. 英国Children's codeの説明では、非営利のゲーム等でも経済的活動と考えられる場合には対象となり得る。無料だから対象外と決めない。[ICOの対象サービス説明](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/)。今回の運営の該当性は未確定。古い英国離脱前提の国外適用説明を、現在の確定判断として使用しない。
5. GAの日本向け規約の冒頭には「取引、ビジネス、制作、業務に関連する用途」という制限がある。今回の純粋な趣味制作がその用途にどう位置付けられるかは未確定。趣味を一律禁止とも、制作なら無条件に利用可能とも判断しない。[日本向け規約](https://marketingplatform.google.com/about/analytics/terms/jp/)。

管理設定の完了は有効化の許可ではない。将来有効化する場合の規約・子どもの同意・対象データの安全な特定・国外移転等は[対応範囲](GA4-PRIVACY-SCOPE.md)と[個別削除手順](GA4-DELETION-PROCEDURE.md)に沿って判断を記録する。必要な仕組みの追加や公開範囲の変更は、内容を具体化してからユーザーと決める。

## プライバシー表示の確認

現在の計測OFF運用について、端末保存、運営者、問い合わせフォーム、回答の用途・30日以内の削除、Cloudflare配信を日英で説明する。短い英語説明の追加は、GA4を有効化する場合の通知や全地域の条件確認が完了したことにはならない。既存ゲームの物語・音声・判定・保存・計測処理は変更しない。

2026-10-13、ユーザーがローカルの`privacy.html`を開き、運営者名・問い合わせ先・対応完了後30日以内の削除方針を確認して「問題なし」と回答した。日英の表示をローカルブラウザで確認し、build・公開対象検査・Pagesのローカル配信検査・文書リンク検査は成功。このHTMLと確認記録はPR #14のブランチとPreviewへの反映対象。計測OFFを継続し、mainへのマージ・本番公開・GA4有効化は行わない。最新コミットに対するCIとPreviewの確認結果はPR #14に記録する。
