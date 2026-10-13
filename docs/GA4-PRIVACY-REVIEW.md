# GA4の子ども利用・プライバシー確認

**今回不採用の参考資料。** 2026-10-13、本人は[GA4を見送る方針](GA4-OFF-DECISION.md)に同意した。本文のGA固有の条件確認は、再検討する場合の記録で、今回の公開前作業ではない。

確認日：2026-10-12 JST。**現時点では適用条件の判断を完了していないため、計測は無効で出荷する。測定IDだけで有効にしない。** 以下は公式資料からの調査と実装方針であり、この作品が各国の法的条件を満たしたという確定ではない。

海外向けにも積極的に公開する意向を確認した。[計測OFFでの公開準備と、有効化前の対応範囲](GA4-PRIVACY-SCOPE.md)に国内・米国・EU/EEA・英国の確認点をまとめる。具体的な対象国と条件判断は未完了。CFの画面案内と現在維持する値は[OFF設定](GA4-CLOUDFLARE-SETTINGS.md)を参照する。

| 公式に確認したこと | この作品への対応・残る判断 |
| --- | --- |
| [Google Analytics規約 §7](https://marketingplatform.google.com/about/analytics/terms/jp/)はPII送信禁止、適切なプライバシーポリシー、GA利用とCookie等の表示、法令上必要な同意を求める | 答え・氏名等を送らず、privacy.htmlと任意の選択を用意。運営者は登録時の日本向け規約・制作等の用途への適合・実際の公開地域も確認する |
| [Googleのデータ保護説明](https://support.google.com/analytics/answer/6004245?hl=ja)はCookie識別子とユーザーの許可／拒否を説明する | 許可前はタグそのものを読まないbasic方式。拒否でも遊べる。許可は取り消せる |
| [Googleの子ども向けサービスの説明](https://support.google.com/policies/answer/9664901?hl=ja)は公開者の法令・Googleポリシーへの責任、子どもの年齢定義の違い、指定ツールが義務を免除しないことを説明 | 子どもも利用することだけでGA4を一律禁止とも、広告を無効にすれば適法とも断定しない。child-directedに当たるか、対象国、Google側の取り扱いを運営者が確認 |
| [FTCのCOPPA説明](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business)は13歳未満向けサイト、永続識別子等、保護者同意等を扱う | 米国向け提供に該当するか、内部運用の解析の例外にこの構成が該当するか未確定。ゲーム内の子どものクリックや「保護者と確認」表示だけを検証可能な保護者同意に置き換えない |
| [GA広告機能のポリシー](https://support.google.com/analytics/answer/2700409?hl=ja)は広告識別子・リマーケティング等の追加条件を説明 | Googleシグナル、広告パーソナライズ、Ads連携を無効。広告目的でデータを使わない |
| [Consent mode](https://developers.google.com/tag-platform/security/guides/consent?hl=ja)には同意とタグ動作の制御がある | 同意の法的取得方法を提供するものではない。高度な同意モードの同意なしpingは使わない |

## 計測の有効化前に運営者が確認すること

1. 想定利用者、子ども向けの該当性、提供地域、適用法とGoogle規約を確認する。必要ならGoogleの正式なサポート／専門家から回答を得て記録する。
2. 必要な保護者同意・年齢の扱いが現在の任意選択だけで足りるか判断する。追加の仕組みが必要なら、このPRの承認フラグを立てず、設計を再検討する。年齢・氏名・身分証をゲームへ勝手に追加しない。
3. privacy.htmlの運営者・問い合わせ・目的・保持・削除手続きが実運用と一致するか確認する。2026-10-13に[一般の相談窓口](CONTACT-FORM.md)を用意し、正式な運営者名・返信先任意・対応完了後30日以内の問い合わせ回答削除をローカルへ反映した。[個別削除の手順](GA4-DELETION-PROCEDURE.md)に従い、GAの対象データを安全に確認する手段は別途整える。フォームと公開IssueにCookieやGA識別子を書かせない。
4. GAアカウントの共有設定を最小化、プロパティでGoogleシグナル・広告機能・Ads連携をオフ、拡張計測をオフ、イベント保持を2か月にする。2026-10-13にこれらと保持リセットOFFの[完了報告](GA4-SETUP-PROGRESS.md)を本人から受けた。Codexが管理画面を直接確認した記録とは区別する。
5. 将来、対象環境の条件と有効化の承認が揃った後に、その環境の `SANTA_GA4_POLICY_APPROVED=true` を設定する。これは適法性や国別・年齢別条件を自動判定する機能ではなく、人間が条件確認済みであることをビルドへ伝えるためのフラグ。現在は評価側も本番側も無効を維持する。

条件未確定のままでもゲーム・圧縮・共有・検査は進められる。無効のままならPVや進行データは得られないため、「公開後すぐ分析できる」はこの手動判断とGA設定の完了が条件となる。

制作済みGemini TTSの利用条件の未解決事項は別であり、GAを無効にしても解決しない。今回はTTSの生成・交換・新しい声の採用を行わない。NOTICEとIssue #3の記録を維持する。


## 公開確認での補足

[Google公式のCSPガイド（広告機能なし）](https://developers.google.com/tag-platform/security/guides/csp)に合わせ、許可後のビルドだけscript/imgのGoogleタグとconnectのGoogle Analytics/Googleドメインを許可する。unsafe-inline/unsafe-evalや広告用DoubleClickドメインを追加しない。未設定・未承認のヘッダーはselfのまま。

日本語利用規約の制作等の用途と第7条も確認した。適用国、child-directedの該当性、保護者同意の方法、問い合わせ／削除手続きの確定は運営者の判断として残る。確認を完了するまで承認フラグを立てない。

Cookieの自動親ドメイン選択を使わず、ゲームのhostnameを `cookie_domain` に指定する。独自のサブドメインへ移した場合も、取消し時に削除するドメインと一致させ、別サイトとの不要な共有を避ける。[GoogleのCookie設定ガイド](https://developers.google.com/tag-platform/security/guides/customize-cookies)。実Googleタグが生成するCookieは検証用プロパティで本人が最終確認する。取消しのブラウザ検査はGA名のCookieだけを消し、ゲーム保存と他のCookieを維持することを確認する。
