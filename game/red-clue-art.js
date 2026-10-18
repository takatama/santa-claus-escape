// Red clue geometry from PR A; blue/yellow keep their own clue geometry.
const snowInkRatio=1, SNOW_WIDTH=620, SNOW_HEIGHT=258;
const REVEALS=[{x:18,y:54,w:390,h:136},{x:420,y:12,w:184,h:184},{x:420,y:198,w:184,h:53}];
export function drawInitialSnow(base) {
    base.clearRect(0, 0, SNOW_WIDTH, SNOW_HEIGHT);
    const frost = base.createLinearGradient(0, 0, 40, SNOW_HEIGHT);
    frost.addColorStop(0, '#fff8e7'); frost.addColorStop(.35, '#edf1e9'); frost.addColorStop(1, '#c2d4dd');
    base.save(); base.fillStyle=frost;
    // An irregular snow edge follows the paper rather than making a second
    // rectangular card. All three clue regions remain fully opaque underneath.
    base.beginPath();
    const edge=[
      [18,19],[34,11],[51,18],[67,8],[84,15],[103,5],[124,13],[145,8],[168,19],[194,12],[217,6],[239,15],
      [262,9],[285,17],[310,8],[339,14],[365,6],[390,13],[414,4],[438,9],[468,3],[488,10],[516,4],[538,9],[563,3],[585,9],[599,6],[612,14],
      [610,31],[615,50],[609,71],[615,92],[609,116],[616,139],[610,165],[616,184],[608,207],[614,229],[610,251],
      [599,255],[582,257],[555,253],[533,257],[508,253],[480,257],[453,253],[426,256],[403,249],[377,257],
      [350,247],[326,255],[300,249],[275,257],[249,246],[226,254],[200,246],[177,255],[152,247],[129,255],[105,246],[81,254],[60,246],[42,252],[23,241],
      [12,226],[17,209],[11,188],[15,164],[9,141],[15,118],[10,95],[15,73],[12,53],[18,35],
    ];
    edge.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y)); base.closePath(); base.fill();
    // Guarantee coverage even where a jagged boundary meets a reveal corner.
    for (const r of REVEALS) base.fillRect(r.x,r.y,r.w,r.h);
    // Texture is clipped to the painted snow silhouette; it never makes holes.
    base.beginPath(); edge.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y)); base.closePath(); base.clip();
    for (let i=0;i<23;i++) {
      const x=30+(i*137)%580, y=22+(i*73)%220, rx=45+(i*19)%70, ry=19+(i*11)%32;
      base.save(); base.translate(x,y); base.scale(1,ry/rx);
      const glow=base.createRadialGradient(0,0,2,0,0,rx);
      glow.addColorStop(0,i%3?'rgba(255,254,238,.33)':'rgba(148,175,193,.13)'); glow.addColorStop(1,'rgba(255,255,255,0)');
      base.fillStyle=glow;
      base.fillRect(-rx,-rx,rx*2,rx*2); base.restore();
    }
    let seed = 19116;
    for (let i=0;i<6800;i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; const x=8+seed%610;
      seed = (seed * 1664525 + 1013904223) >>> 0; const y=seed%SNOW_HEIGHT;
      const grain=1.2+i%5;
      base.fillStyle=['rgba(112,148,174,.16)','rgba(255,255,248,.67)','rgba(255,239,211,.26)','rgba(232,237,232,.51)','rgba(255,255,247,.38)'][i%5];
      base.beginPath(); base.moveTo(x-grain,y); base.lineTo(x+grain*.05,y-grain*.7);
      base.lineTo(x+grain,y+grain*.25); base.lineTo(x-grain*.15,y+grain*.8); base.closePath(); base.fill();
    }
    base.restore();
    // Small parchment pockets sit in blank margins, outside all clue regions.
    // Their silhouettes and the two tiny peeks are intentionally ambiguous.
    base.save(); base.globalCompositeOperation='destination-out';
    for (const pocket of [[[83,20],[93,15],[111,20],[104,29],[87,32]],[[168,214],[184,207],[201,213],[192,224],[176,221]],[[300,228],[314,223],[329,229],[322,240],[305,238]]]) {
      base.beginPath(); pocket.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y)); base.closePath(); base.fill();
    }
    base.restore();
    // Tiny ambiguous fragments only: no complete word, face or crossed letter.
    base.clearRect(29, 79, 10, 11);
    const ratio = snowInkRatio, animalScale = Math.min(1, 1 / ratio);
    // Follow a tiny edge of the hind paw when the painting changes size; never the face.
    base.clearRect(512 + 168 * animalScale * .26, 194 - 172 * animalScale * ratio * .10, 8, 7);
  }

export function drawClueInk(ctx,{tanuki}) {
  // Use the same 620 × 258 ink coordinates as the close view so each staged
  // mask covers exactly the same text, picture and last crossed-out character.
  ctx.save();
  const ratio = snowInkRatio;
  const textSize = Math.min(52, 54 / ratio);
  ctx.fillStyle = '#573c29'; ctx.font = `600 ${textSize}px "Yu Mincho", "Hiragino Mincho ProN", serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const [text, baseline] of [['サンタ、イタチ', 93], ['サンタ、ハタチ', 159]]) {
    ctx.save(); ctx.translate(25, baseline); ctx.scale(1, ratio); ctx.fillText(text, 0, 0); ctx.restore();
  }
  const animalScale = Math.min(1, 1 / ratio), animalW = 168 * animalScale, animalH = 172 * animalScale * ratio;
  ctx.drawImage(tanuki, 512 - animalW / 2, 194 - animalH, animalW, animalH);
  const labelSize = Math.min(43, 46 / ratio);
  ctx.font = `600 ${labelSize}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(512, 224); ctx.scale(1, ratio); ctx.fillText('たぬき', 0, 0); ctx.restore();
  const crossX = 512 - ctx.measureText('たぬき').width / 2 + ctx.measureText('た').width / 2;
  const crossW = labelSize * .53, crossH = crossW * ratio;
  ctx.strokeStyle = '#bc3c2b'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(crossX - crossW, 224 - crossH); ctx.lineTo(crossX + crossW, 224 + crossH);
  ctx.moveTo(crossX + crossW, 224 - crossH); ctx.lineTo(crossX - crossW, 224 + crossH); ctx.stroke();
  ctx.restore();
}
