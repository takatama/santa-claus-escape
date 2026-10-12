# GA4設定の進捗と公開の前提

2026-10-13 JST。運営者：高玉 広和 / Hirokazu Takatama。以下の管理設定は、画面を操作したユーザーの完了報告に基づく。Codexが管理画面へログインして確認・変更した記録ではない。

## 設定済みとして確認したこと

2026-10-13、本人がGAのアカウント詳細の表示を確認し、「Data Processing Terms for this account were accepted on February 11, 2025」と報告した。表示されたGoogle側のアカウント名は`cloudflare`。その後、本番・評価の両プロパティがこのアカウント配下にあるか確認し、本人から「両方cloudflare」と報告を受けた。両プロパティとDPA承諾済みアカウントの対応は本人報告に基づき確認完了とする。Cloudflare PagesのDPAや、子ども向け計測の条件確認まで完了したとは扱わない。Codexによる管理画面の直接確認ではない。

MANAGE DPA DETAILSで開いたGoogle Marketing PlatformのDPA管理画面は、Legal entitiesとContactsが未登録、組織へのリンクなしとの本人報告。再承諾は案内せず、次はContactsの追加画面と必要な項目・役割を確認する。個人運営を架空の会社や組織として登録しない。DPOやEEA代表の役割を、任命・該当性の確認なしに選ばない。メールアドレス・住所等の具体値は、この文書やチャットで提出させない。計測OFFを維持する。

その後、本人がRolesの選択肢をPrimary contact / DPO / EEA representativeと報告し、Primary contactのみを選ぶよう案内した。Mailing addressは必須との報告。Googleの画面内で郵便を受け取れる本人の住所を入力するよう案内し、本人から「入力して保存した」と完了報告を受けた。保存後一覧についてもPrimary contactの「表示あり」と本人が回答した。DPA連絡先の登録と役割表示の本人確認まで完了。住所・メール等の具体値は保存しない。Legal entitiesや組織リンクが追加されたとは扱わず、次はLegal entitiesの入力項目を読み取り、個人運営に合う登録方法を判断する。ゲームの公開ページ・GA計測設定は変更しない。

Legal entitiesの追加画面は「Entity names / Enter one or more legal entities for your organization」と本人が報告した。確認したGoogle公式のData Processing Terms説明は会社・組織の登録名称として説明しており、この欄に個人の趣味運営者の氏名を登録する手順は確認できなかった。個人名が禁止されているとも、必ず登録可能とも判断しない。今回は保存を見送り、本人から「もどった」と報告を受けた。Legal entitiesは未設定・適用方法の確認事項として残す。Primary contactの登録完了とDPAの全項目の完了を区別する。組織の新設・リンクや規約の再承諾を追加の必須作業として案内しない。

| 設定 | 本番用 | 評価用 |
| --- | --- | --- |
| イベントデータの保持 | 2か月 | 2か月 |
| 新しいアクティビティでユーザーデータをリセット | OFF | OFF |
| Googleシグナル | OFF | OFF |
| 広告パーソナライズ | 許可0 / 307地域 | 許可0 / 307地域 |
| 拡張計測 | OFF | OFF |
| Google広告とのリンク | なし | なし |

本番用プロパティ（測定ID `G-MHGWR7DQGB`）のカスタム定義について、本人が `box_color`、`hint_step`、`paper_count`、`resume_phase`、`method` の5つがあり、すべてScopeがEventと報告した。一覧の列名はDimension name / description / scope / user property/parameter / last changedであり、Event parameterという独立した列名ではなかった。本人が `box_color` 行のuser property/parameterの値を `box_color` と確認し、全件を指示どおり設定済みと報告した。評価用プロパティ（測定ID `G-B2YBCVGPDD`）も同じ5つをScope Eventで設定済みか確認し、本人から「評価用も設定済」と報告を受けた。本番・評価の5定義はこの本人報告に基づき確認完了とする。Codexによる管理画面の直接確認ではない。重複作成や計測の有効化は行わない。

アカウントのデータ共有は、Google products & services、Modeling contributions & business insights、Technical support、Recommendations for your businessの4項目をすべてOFFにして保存済み。同アカウントの他プロパティにも適用されることを説明し、ユーザーからその範囲を含む了承を得た。Googleによるサービスの維持・保護のための処理まで止まる設定ではない。[共有設定の公式説明](https://support.google.com/analytics/answer/1011397?hl=ja)。

CFは承認フラグfalse、Web Analytics disabledとのユーザー報告。Production / Previewを個別に確認した記録とは区別する。ゲームのGA4は無効のまま、mainへのマージ・本番公開・有効化・サブエージェント利用は行わない。

## 公開の前提として確認したこと

- 個人の純粋な趣味として無料公開する。課金・広告・寄付募集・アフィリエイト・仕事の依頼を集める目的を含めないと2026-10-13に本人が回答した。
- 主な対象は「子どもを中心に、幅広い年齢」と2026-10-13に本人が回答した。6〜9歳だけに限定しない。子ども本人がSNSを利用することは前提ではない。
- 米国・EU・英国へ積極的に公開する。EU内の対象国、提供言語、告知方法の詳細は未確定。
- [問い合わせフォーム](CONTACT-FORM.md)は一般相談の非公開窓口として用意済み。ゲーム側へのリンクはPR #14のブランチとPreviewへ反映する。

## この前提で絞れることと、未確定のこと

1. **GA4をOFFに保つ現在の準備**では、GA4のための年齢入力、保護者登録、CMP、国別計測や独自IDを追加しない。問い合わせやCloudflare配信での情報処理は別に説明する。
2. **趣味・無料という事実だけでは、海外のすべての条件が免除されるとは判断しない。** 米国COPPAは商業的なサービス等を対象とするため運営形態が重要だが、Google等の第三者の処理も含めた今回の適用判断は未完了。[FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)。
3. EUの個人・家庭内活動の例外は、単に個人が運営するという意味ではない。公開作品で利用者の情報を処理する場合に例外を使えるかは別途評価する。[欧州委員会の説明](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en)。これは今回の公開構成に例外を自動適用しないという方針で、GDPRの適用を確定した判断ではない。
4. 英国Children's codeの説明では、非営利のゲーム等でも経済的活動と考えられる場合には対象となり得る。無料だから対象外と決めない。[ICOの対象サービス説明](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/services-covered-by-this-code/)。今回の運営の該当性は未確定。古い英国離脱前提の国外適用説明を、現在の確定判断として使用しない。
5. GAの日本向け規約の冒頭には「取引、ビジネス、制作、業務に関連する用途」という制限がある。今回の純粋な趣味制作がその用途にどう位置付けられるかは未確定。趣味を一律禁止とも、制作なら無条件に利用可能とも判断しない。[日本向け規約](https://marketingplatform.google.com/about/analytics/terms/jp/)。

管理設定の完了は有効化の許可ではない。将来有効化する場合の規約・子どもの同意・対象データの安全な特定・国外移転等は[対応範囲](GA4-PRIVACY-SCOPE.md)と[個別削除手順](GA4-DELETION-PROCEDURE.md)に沿って判断を記録する。必要な仕組みの追加や公開範囲の変更は、内容を具体化してからユーザーと決める。

2026-10-13に[利用条件の確認記録](GA4-ELIGIBILITY-DECISIONS.md)を追加した。子ども中心と純粋な非商用の前提を確定し、改正COPPAの内部運用例外にも通知要件があること、同法が適用される場合の連絡先要件、EU/英国の子どもの同意と低リスクに応じた確認を整理した。本人がAnalyticsヘルプの「お問い合わせ」から進むと公開コミュニティへ案内されたため、この経路の投稿は見送る。Googleへの投稿や正式回答の取得を準備作業の必須条件に追加せず、公開資料と実装に基づく同意・削除・海外向け通知の整理を続ける。ゲームと管理設定は変更しない。

同日に[対応範囲](GA4-PRIVACY-SCOPE.md)を具体化した。現在の同意保存に日時・説明の版・本人/保護者の区別がないこと、GA削除のために追加の氏名・身分証を自動収集しないこと、Google/Cloudflareの公開契約と本人の適用契約・ログ確認を区別することを記録した。問い合わせフォームは個人用Googleアカウントと本人が回答し、Workspaceの組織契約等を適用済みとは扱わない。privacy.htmlへ計測OFFでの子ども向け日英の短い説明、問い合わせ情報の確認・訂正・削除と、返信先なしでは個別返信できない案内を追加する。計測の実装・ゲームの動作・管理設定は変更しない。

今回の追加に対する簡易検査としてbuild・公開対象検査・Pages配信検査・文書6本の相対リンク26本・git diff --checkが成功。privacy.htmlの配信本文を照合し、Chromiumで390px・1280px幅の表示と横方向のはみ出しがないこと、Googleへのリクエストがないことを確認した。既存の全体CI成功は351a664に対する結果で、この追加のCI結果ではない。最新HEADに対するCIとPreviewの確認結果はPR #14に記録する。

## プライバシー表示の確認

現在の計測OFF運用について、端末保存、運営者、問い合わせフォーム、回答の用途・30日以内の削除、Cloudflare配信を日英で説明する。短い英語説明の追加は、GA4を有効化する場合の通知や全地域の条件確認が完了したことにはならない。既存ゲームの物語・音声・判定・保存・計測処理は変更しない。

2026-10-13、ユーザーがローカルの`privacy.html`を開き、運営者名・問い合わせ先・対応完了後30日以内の削除方針を確認して「問題なし」と回答した。日英の表示をローカルブラウザで確認し、build・公開対象検査・Pagesのローカル配信検査・文書リンク検査は成功。このHTMLと確認記録はPR #14のブランチとPreviewへの反映対象。計測OFFを継続し、mainへのマージ・本番公開・GA4有効化は行わない。最新コミットに対するCIとPreviewの確認結果はPR #14に記録する。

同日、追加した「こども向けの短い説明」と問い合わせ情報の「確認・訂正・削除」の案内についても、ユーザーがローカルページで確認して「問題なし」と回答した。追加箇所の本人確認を完了として記録し、PR #14とPreviewへ反映する。計測OFF・mainの未マージ・本番未公開を維持する。
