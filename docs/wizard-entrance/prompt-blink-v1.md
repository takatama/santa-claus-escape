# 目と口を閉じた全身の追加

組み込み image_gen、透過背景。編集入力は既存の wizard-whole-v2.png。承認済みの全身と手は上書きせず、新しい wizard-blink-v1.png / .webp を追加。新画像の左上の全身だけを使い、手は元の素材を引き続き使用します。

```text
Use case: precise-object-edit / identity-preserve. Edit the attached production sprite atlas. Make ONE minimal change: in the TOP-LEFT full-body girl, close BOTH eyes gently in a cheerful relaxed blink. Her mouth is already closed: KEEP it closed with the same small sweet smile. Keep the exact face identity, short natural neck hidden in the high cape collar, head angle, pose, hat, hair, costume, star brooch, staff, sleeves, skirt, boots, lighting, texture, transparent silhouette, scale and placement. Hat, face, neck, body and boots remain ONE continuous drawing, never separate parts. The TOP-RIGHT smiling girl and BOTTOM detached hand must remain unchanged. Do NOT add a hand to the empty top-left sleeve; the game draws the already approved hand independently. Preserve the atlas layout and 1285x1224 canvas dimensions as closely as possible: the complete top-left figure occupies x=0..641 y=0..759. Do not recenter, enlarge, resize, invent a new pose, elongate neck, redraw costume, change the hat or clip the staff. Only change the two eyelids in the top-left girl. Keep genuine transparent background. No labels, text, grids, checkerboards or new elements. The output will supply a new WHOLE-BODY eyes-closed mouth-closed sprite, so body registration and unchanged silhouette matter.
```

生成結果は1285×1224。既存と同じ全身描画枠に登録し、首・顔・帽子の個別の切り貼りはしません。手の target[1]=.405、サイズ、支点、白い袖を除くclipも変更していません。目と口を閉じる期間は手振り中の1.19〜1.35秒、1.73〜1.89秒です。
