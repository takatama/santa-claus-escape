# ダイアル錠の取り付け位置の修正

2026-10-08 JST。ユーザーの指摘により、ふたと本体をまたぐ錠の描写を修正。組み込み image_gen.imagegen の編集で、旧画像を残して snow-investigation-start-v3.png を作成した。ゲームの実装は変更していない。

## 実物の確認

[BURG-WÄCHTER MONEY 5020 C red の公式商品ページ](https://burg.biz/en/collections/cashboxes/products/money-code-5020-red)の正面写真を実ブラウザで確認した。錠プレート・ノブ・三つの数輪は本体前面の上寄りに収まり、プレート上端とふたの継ぎ目の間に赤い本体の余白がある。ふたの前縁と継ぎ目が左右に連続しており、外付け金具は継ぎ目をまたいでいない。

実物の三桁は取り付け位置の参考にのみ使う。ゲームの四桁は維持。機構内部の設計や強度を検証したものではない。

## 画像の修正と目視確認

- 錠全体を本体前面上部へ収めた。数輪・プレート・ネジがふたへかからない。
- 錠の上に赤い本体の余白を残し、ふたの継ぎ目を左右に連続させた。
- 継ぎ目をまたぐ装飾の舌状金具を取り除いた。
- 四つの中央の数字0000、上9・下1を維持。
- 箱全体の雪、文字の断片と茶色い絵の端だけがのぞく初期状態、青い森と金色の光、調べてみるボタンを維持。

v2は錠が本体とふたをまたぐため、取り付け構造の参考としては撤回。v3も初期状態の静止画案であり、開閉・段階的な雪落ち・回転方向はまだ実装していない。

## 編集指示（全文）

Use case: precise-object-edit.
Asset type: corrected concept illustration of the snow-covered red combination-lock chest.
Input image: the existing portrait red box illustration is the exact edit target.

Primary correction: the lock MUST be installed entirely on the UPPER FRONT WALL OF THE BODY, like a real built-in cash-box combination lock. The current image is mechanically wrong because its big gold hasp crosses the seam between lid and body. Correct the construction.

Structural requirements, crucial:
1. A shallow closed lid sits ON TOP of the lower box body. Clearly draw ONE continuous horizontal lid/body separation line across the front, ABOVE the entire lock unit.
2. A small red-painted BODY margin is visible between that seam and the TOP of the lock mounting plate. No part of any lock trim, screw, flourish or number cylinder reaches onto the lid.
3. The complete four-dial antique-brass lock unit is surface mounted or recessed only into that upper body front panel. Keep the FOUR readable cylinders: each shows 9 above, 0 in the middle, 1 below, four center zeros 0000.
4. Remove ALL external hasp tongues, fleur-de-lis tabs or strap-like gold hardware that connect across the seam. Do not merely move the number windows while leaving a big lock plate attached to both parts.
5. The lid can swing upward while the entire lock unit remains fixed on the body. The hidden catch mechanism is inside; do not draw an exterior bridging hasp. Keep the front of the lid plain red/gold with its own uninterrupted rim.

How to fit this edit:
Make the lid's front skirt shallower, raise the continuous lid/body seam to above the lock, and restore the lower red body wall where the OLD seam used to cross the middle of the lock. Keep the overall box silhouette and snow-covered top at essentially the same size and position.
The former horizontal division running through the lock must disappear completely. A viewer should see snow-covered lid on top, one horizontal seam, a thin red body margin, then the WHOLE gold lock on the BODY. Below the lock remains the existing snowy clue plaque, without overlap. A compact simple rectangular gold mounting plate with all fasteners within the body is preferable to a decorative crossing hasp.

Invariants:
Preserve portrait framing, deep blue gold-lit forest, handmade gouache/fibrous paper texture, rich red box and gold corner ornament, existing snow on lid/rims/foot/base, almost completely snowy clue plaque, and button text "調べてみる".
Preserve the clue initial state: a tiny partial black writing stroke and an ambiguous tiny brown painting edge; no readable words, recognizable tanuki face, X or solution digits.
Do not add a fifth dial, a padlock, a second latch, keyhole, extra controls, different clues or characters.
This is ONLY a structural mounting correction. Keep all other artwork as close to the target as possible.

## 生成原本

C:/Users/takat/.codex/generated_images/01a114e0-c603-7121-823b-dc5c1537e7ab/exec-e32a6e7e-1555-456f-a023-84263f58257a.png
