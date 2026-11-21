/* =========================================================
   Textures dessinées sur canevas
   ========================================================= */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function grain(g, w, h, amp) {
  const d = g.getImageData(0, 0, w, h); const a = d.data;
  for (let i = 0; i < a.length; i += 4) { const n = (Math.random() - 0.5) * amp; a[i] += n; a[i + 1] += n; a[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function tex(c, o) {
  o = o || {};
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const rp = o.repeat || [1, 1]; t.repeat.set(rp[0], rp[1]);
  if (o.srgb !== false) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = maxAniso;
  return t;
}
const T = {};
{ // asphalte lavande
  const [c, g] = makeCanvas(512, 512);
  g.fillStyle = '#7b7391'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = R() < 0.5 ? 'rgba(175,165,195,0.07)' : 'rgba(50,40,70,0.08)'; g.beginPath(); g.ellipse(R() * 512, R() * 512, 15 + R() * 70, 8 + R() * 40, R() * 3, 0, Math.PI * 2); g.fill(); }
  grain(g, 512, 512, 34);
  for (let i = 0; i < 2600; i++) { g.fillStyle = R() < 0.5 ? 'rgba(235,225,245,.35)' : 'rgba(40,30,55,.35)'; g.fillRect(R() * 512, R() * 512, 1.5, 1.5); }
  g.strokeStyle = 'rgba(45,35,60,.4)'; g.lineWidth = 1.3;
  for (let i = 0; i < 5; i++) { let x = R() * 512, y = R() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += (R() - 0.5) * 28; y += (R() - 0.5) * 28; g.lineTo(x, y); } g.stroke(); }
  T.asphalt = tex(c, { repeat: [1 / 6, 1 / 6] });
}
{ // gazon avec bandes de tonte
  const [c, g] = makeCanvas(512, 512);
  g.fillStyle = '#8ad4a3'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 9000; i++) {
    const x = R() * 512, y = R() * 512, l = 3 + R() * 6, t = R();
    g.strokeStyle = t < 0.33 ? 'rgba(70,150,115,.35)' : t < 0.66 ? 'rgba(175,238,190,.35)' : 'rgba(120,205,175,.3)';
    g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 2, y - l); g.stroke();
  }
  grain(g, 512, 512, 16);
  T.grass = tex(c, { repeat: [1 / 5, 1 / 5] });
}
{ // béton clair
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#efe5ee'; g.fillRect(0, 0, 256, 256); grain(g, 256, 256, 16);
  for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(150,130,160,.16)'; g.fillRect(R() * 256, R() * 256, 2, 2); }
  g.strokeStyle = 'rgba(120,100,135,.5)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
  T.concrete = tex(c, { repeat: [0.5, 0.5] });
}
{ // bardage horizontal
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 10; i++) {
    const y = i * 25.6, gr = g.createLinearGradient(0, y, 0, y + 25.6);
    gr.addColorStop(0, 'rgba(0,0,0,0.16)'); gr.addColorStop(0.15, 'rgba(255,255,255,0)'); gr.addColorStop(0.9, 'rgba(0,0,0,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0.1)');
    g.fillStyle = gr; g.fillRect(0, y, 256, 25.6);
  }
  grain(g, 256, 256, 8);
  T.siding = tex(c, { repeat: [0.5, 0.5] });
}
{ // crépi
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(R() * 256, R() * 256, 4 + R() * 18, 0, 7); g.fill(); }
  grain(g, 256, 256, 22);
  T.stucco = tex(c, { repeat: [0.5, 0.5] });
}
{ // tuiles canal
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#d9d0d4'; g.fillRect(0, 0, 256, 256);
  const cols = 8, rows = 8, cw = 256 / cols, rh = 256 / rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k <= cols; k++) {
    const x = k * cw + (r % 2) * cw / 2 - cw / 2, y = r * rh;
    const gr = g.createLinearGradient(x, 0, x + cw, 0);
    gr.addColorStop(0, '#9b9196'); gr.addColorStop(0.35, '#ffffff'); gr.addColorStop(0.6, '#efe8eb'); gr.addColorStop(1, '#8e8489');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x + 2, y + rh); g.lineTo(x + 2, y + 4); g.quadraticCurveTo(x + cw / 2, y - 3, x + cw - 2, y + 4); g.lineTo(x + cw - 2, y + rh); g.closePath(); g.fill();
    g.fillStyle = 'rgba(60,40,60,.22)'; g.fillRect(x, y + rh - 3, cw, 3);
  }
  grain(g, 256, 256, 12);
  T.roof = tex(c, { repeat: [0.55, 0.55] });
}
{ // porte de garage sectionnelle (répétable)
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#fbf7fa'; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 4; r++) { const y = r * 64; g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(0, y, 256, 3); for (let k = 0; k < 2; k++) { const x = k * 128; g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 12, y + 10, 104, 46); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 12, y + 10, 104, 2); } }
  grain(g, 256, 256, 6);
  T.garage = tex(c);
}
{ // vitre avec croisillons
  const [c, g] = makeCanvas(128, 128);
  g.clearRect(0, 0, 128, 128);
  const gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,250,252,1)'; g.fillRect(61, 0, 6, 128); g.fillRect(0, 70, 128, 6);
  g.strokeStyle = 'rgba(255,250,252,1)'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122);
  T.glass = tex(c, { srgb: true }); T.glass.wrapS = T.glass.wrapT = THREE.ClampToEdgeWrapping;
}
{ // damier pastel
  const [c, g] = makeCanvas(256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#ffc6dc' : '#fff6fa'; g.fillRect(x * 64, y * 64, 64, 64); }
  grain(g, 256, 256, 8);
  T.checker = tex(c, { repeat: [0.5, 0.5] });
}
{ // carrelage de piscine
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#e9fbff'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 0.85 + R() * 0.15; g.fillStyle = 'rgba(' + (60 * v | 0) + ',' + (175 * v | 0) + ',' + (225 * v | 0) + ',1)'; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28); }
  grain(g, 256, 256, 10);
  T.poolTile = tex(c, { repeat: [0.8, 0.8] });
}
{ // parquet
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#c99a7f'; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) { let x = -R() * 120; while (x < 256) { const w = 80 + R() * 90; const v = 0.85 + R() * 0.2; g.fillStyle = 'rgba(' + (205 * v | 0) + ',' + (155 * v | 0) + ',' + (130 * v | 0) + ',1)'; g.fillRect(x + 1, r * 32 + 1, w - 2, 30); x += w; } }
  for (let i = 0; i < 400; i++) { g.strokeStyle = 'rgba(120,70,60,.12)'; g.beginPath(); const y = R() * 256, x = R() * 256; g.moveTo(x, y); g.lineTo(x + 20 + R() * 30, y + (R() - 0.5) * 2); g.stroke(); }
  grain(g, 256, 256, 10);
  T.wood = tex(c, { repeat: [0.45, 0.45] });
}
{ // moquette années 80
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#5d3f7a'; g.fillRect(0, 0, 256, 256);
  const cols = ['#ff7fbf', '#7ff0ff', '#ffe27a', '#b98cff'];
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = cols[i % 4]; g.lineWidth = 3; const x = R() * 256, y = R() * 256, t = R();
    g.beginPath(); if (t < 0.33) { g.arc(x, y, 6 + R() * 8, 0, 7); } else if (t < 0.66) { g.moveTo(x, y); g.lineTo(x + 18, y - 10); g.lineTo(x + 30, y + 4); } else { g.rect(x, y, 10, 10); }
    g.stroke();
  }
  grain(g, 256, 256, 18);
  T.carpet = tex(c, { repeat: [0.5, 0.5] });
}
{ // lambris du refuge
  const [c, g] = makeCanvas(256, 256);
  for (let i = 0; i < 8; i++) { const v = 0.9 + R() * 0.15; g.fillStyle = 'rgba(' + (150 * v | 0) + ',' + (98 * v | 0) + ',' + (70 * v | 0) + ',1)'; g.fillRect(i * 32, 0, 32, 256); g.fillStyle = 'rgba(60,30,20,.45)'; g.fillRect(i * 32, 0, 2, 256); }
  for (let i = 0; i < 300; i++) { g.strokeStyle = 'rgba(90,50,35,.18)'; g.beginPath(); const x = R() * 256; g.moveTo(x, R() * 256); g.lineTo(x + (R() - 0.5) * 3, R() * 256); g.stroke(); }
  grain(g, 256, 256, 10);
  T.panel = tex(c, { repeat: [0.5, 0.5] });
}
{ // tapis à poils longs
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#e09a5c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) { const t = R(); g.fillStyle = t < 0.3 ? 'rgba(255,200,140,.5)' : t < 0.6 ? 'rgba(160,90,50,.4)' : 'rgba(240,150,90,.5)'; g.fillRect(R() * 256, R() * 256, 2, 3); }
  T.shag = tex(c, { repeat: [0.6, 0.6] });
}
{ // piste de bowling
  const [c, g] = makeCanvas(128, 512);
  for (let i = 0; i < 16; i++) { const v = 0.92 + R() * 0.12; g.fillStyle = 'rgba(' + (238 * v | 0) + ',' + (200 * v | 0) + ',' + (160 * v | 0) + ',1)'; g.fillRect(i * 8, 0, 8, 512); g.fillStyle = 'rgba(120,70,40,.25)'; g.fillRect(i * 8, 0, 1, 512); }
  g.fillStyle = '#ff5fa8';
  for (let k = 0; k < 7; k++) { const x = 10 + k * 18, y = 150 + Math.abs(k - 3) * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.lineTo(x + 5, y + 16); g.fill(); }
  for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(10 + k * 18, 420, 3, 0, 7); g.fill(); }
  grain(g, 128, 512, 6);
  T.lane = tex(c);
}
{ // moquette cosmique du bowling
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#231a4a'; g.fillRect(0, 0, 256, 256);
  const cols = ['#ff5fd0', '#5ff7ff', '#fff05f', '#9a7cff', '#7cff9a'];
  for (let i = 0; i < 70; i++) {
    g.fillStyle = cols[i % 5]; g.strokeStyle = cols[(i + 2) % 5]; g.lineWidth = 2; const x = R() * 256, y = R() * 256, t = R();
    if (t < 0.3) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = k % 2 ? 4 : 10; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
    else if (t < 0.6) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.stroke(); g.beginPath(); g.ellipse(x, y, 13, 3, 0.4, 0, 7); g.stroke(); }
    else { g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) g.lineTo(x + k * 7, y + (k % 2 ? -7 : 7)); g.stroke(); }
  }
  T.cosmic = tex(c, { repeat: [0.35, 0.35] });
}
{ // point doux
  const [c, g] = makeCanvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  T.dot = tex(c, { srgb: false });
}
{ // nuage
  const [c, g] = makeCanvas(256, 160);
  for (let i = 0; i < 28; i++) {
    const x = 40 + R() * 176, y = 88 + R() * 30 - Math.sin((x - 40) / 176 * Math.PI) * 38, r = 16 + R() * 32;
    const gr = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,242,250,0.78)'); gr.addColorStop(1, 'rgba(235,205,245,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(0, 40, 0, 150); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(175,145,215,0.55)');
  g.fillStyle = sh; g.fillRect(0, 0, 256, 160);
  T.cloud = tex(c);
}
{ // étoile du flash
  const [c, g] = makeCanvas(128, 128);
  g.translate(64, 64);
  for (let i = 0; i < 7; i++) { g.rotate(Math.PI * 2 / 7); const gr = g.createLinearGradient(0, 0, 62, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -5); g.lineTo(56 + R() * 7, 0); g.lineTo(0, 5); g.fill(); }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill();
  T.flash = tex(c, { srgb: false });
}
{ // impact de balle
  const [c, g] = makeCanvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(45,28,66,1)'); gr.addColorStop(0.25, 'rgba(70,45,92,.95)'); gr.addColorStop(0.42, 'rgba(130,95,150,.45)'); gr.addColorStop(1, 'rgba(130,95,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  T.hole = tex(c);
}
{ // onde circulaire
  const [c, g] = makeCanvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 30, 64, 64, 63);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(0.85, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  T.ring = tex(c, { srgb: false });
}
{ // reflets d'eau
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 80; i++) {
    g.strokeStyle = 'rgba(120,255,250,' + (0.12 + R() * 0.25).toFixed(2) + ')'; g.lineWidth = 1 + R() * 2.5;
    const x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + (R() - 0.5) * 80, y + (R() - 0.5) * 80, x + (R() - 0.5) * 80, y + (R() - 0.5) * 80, x + (R() - 0.5) * 120, y + (R() - 0.5) * 120); g.stroke();
  }
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  T.caustic = tex(c, { srgb: false });
}
{ // palme : folioles fines, nervure claire, pointes plus sombres (dessin deux fois plus fin qu'avant)
  const [c, g] = makeCanvas(256, 1024);
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  g.lineWidth = 12; g.beginPath(); g.moveTo(128, 1024); g.lineTo(128, 16); g.stroke();
  for (let i = 0; i < 56; i++) {
    const y = 1004 - i * 17.7, t = i / 56, len = 118 * Math.sin(Math.min(1, t * 1.12) * Math.PI * 0.94) + 12;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128, y - 5); g.quadraticCurveTo(128 + s * len * 0.5, y - 22, 128 + s * len, y + 30 + t * 20); g.quadraticCurveTo(128 + s * len * 0.45, y + 2, 128, y + 8); g.closePath(); g.fill(); }
  }
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 56; i++) { const y = 1004 - i * 17.7; g.fillStyle = 'rgba(0,0,0,' + (0.06 + R() * 0.2).toFixed(3) + ')'; g.fillRect(0, y - 12, 256, 9); }
  const sh = g.createLinearGradient(0, 0, 256, 0); sh.addColorStop(0, 'rgba(0,0,0,0.32)'); sh.addColorStop(0.42, 'rgba(0,0,0,0)'); sh.addColorStop(0.58, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.32)');
  g.fillStyle = sh; g.fillRect(0, 0, 256, 1024);
  g.fillStyle = 'rgba(255,246,200,0.5)'; g.fillRect(124, 0, 8, 1024);
  g.globalCompositeOperation = 'source-over';
  T.frond = tex(c, { srgb: false }); T.frond.wrapS = T.frond.wrapT = THREE.ClampToEdgeWrapping;
}
{ // tronc de palmier
  const [c, g] = makeCanvas(64, 128);
  g.fillStyle = '#c8a69b'; g.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 8) { g.fillStyle = 'rgba(90,60,72,.35)'; g.fillRect(0, y, 64, 2); g.fillStyle = 'rgba(255,240,240,.15)'; g.fillRect(0, y + 2, 64, 1); }
  grain(g, 64, 128, 20);
  T.trunk = tex(c, { repeat: [2, 1] });
}
{ // réticule holographique
  const [c, g] = makeCanvas(128, 128);
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 42, 0, 7); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 6, 0, 7); g.fill();
  for (let a = 0; a < 4; a++) { g.save(); g.translate(64, 64); g.rotate(a * Math.PI / 2); g.fillRect(-2.5, -60, 5, 12); g.restore(); }
  T.reticle = tex(c, { srgb: false });
}
{ // rayures de barrière
  const [c, g] = makeCanvas(256, 64);
  g.fillStyle = '#fff6fa'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#ff8fc4';
  for (let x = -64; x < 320; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill(); }
  T.stripes = tex(c);
}
{ // balle smiley (teintée ensuite)
  const [c, g] = makeCanvas(256, 128);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128);
  for (const cx of [64, 192]) {
    g.fillStyle = '#3a2a3a';
    g.beginPath(); g.ellipse(cx - 12, 50, 5, 9, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx + 12, 50, 5, 9, 0, 0, 7); g.fill();
    g.strokeStyle = '#3a2a3a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(cx, 64, 22, 0.35, Math.PI - 0.35); g.stroke();
    g.fillStyle = 'rgba(255,120,150,.45)'; g.beginPath(); g.arc(cx - 26, 72, 6, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 26, 72, 6, 0, 7); g.fill();
  }
  T.smiley = tex(c); T.smiley.wrapT = THREE.ClampToEdgeWrapping;
}
{ // tranche de cassette vidéo
  const [c, g] = makeCanvas(64, 256);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 64, 30); g.fillRect(0, 226, 64, 30);
  g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(8, 60, 48, 130);
  g.fillStyle = 'rgba(40,20,60,.6)'; for (let i = 0; i < 6; i++) g.fillRect(14, 70 + i * 19, 36 - (i % 3) * 7, 7);
  T.vhs = tex(c);
}
{ // pochettes de vinyle (atlas 4 × 2)
  const [c, g] = makeCanvas(512, 256);
  const pal = [['#ff7fbf', '#2a1d45'], ['#7ff0ff', '#3a2456'], ['#ffe27a', '#ff5fa8'], ['#b98cff', '#ffd2b4'], ['#2a1d45', '#ff9fcd'], ['#a3f3dc', '#7b5cff'], ['#ffd2b4', '#3a7cff'], ['#fff6fa', '#ff6f8f']];
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 128, y = Math.floor(i / 4) * 128, p = pal[i];
    g.fillStyle = p[0]; g.fillRect(x, y, 128, 128);
    g.fillStyle = p[1];
    if (i % 4 === 0) { for (let k = 0; k < 6; k++) g.fillRect(x, y + 70 + k * 9, 128, 4); g.beginPath(); g.arc(x + 64, y + 62, 30, Math.PI, 0); g.fill(); }
    else if (i % 4 === 1) { g.beginPath(); g.moveTo(x + 64, y + 18); g.lineTo(x + 112, y + 104); g.lineTo(x + 16, y + 104); g.fill(); }
    else if (i % 4 === 2) { for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + 64, y + 64, 50 - k * 10, 0, 7); g.lineWidth = 4; g.strokeStyle = k % 2 ? p[1] : '#ffffff'; g.stroke(); } }
    else { g.lineWidth = 3; g.strokeStyle = p[1]; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(x, y + 128 - k * 14); g.lineTo(x + 128, y + 90 - k * 14); g.stroke(); } }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x + 10, y + 10, 50, 6);
  }
  T.sleeves = tex(c); T.sleeves.wrapS = T.sleeves.wrapT = THREE.ClampToEdgeWrapping;
}
function neonTex(text, color, w, h, font) {
  const [c, g] = makeCanvas(w, h);
  g.clearRect(0, 0, w, h);
  const ff = '"Brush Script MT","Segoe Script","Comic Sans MS",cursive'; let fs = Math.floor(h * 0.62);
  g.font = font || ('bold ' + fs + 'px ' + ff);
  // un texte trop long est réduit pour tenir dans l'enseigne
  if (!font) { const mw = g.measureText(text).width; if (mw > w * 0.9) { fs = Math.floor(fs * w * 0.9 / mw); g.font = 'bold ' + fs + 'px ' + ff; } }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = h * 0.18; g.lineWidth = h * 0.07; g.strokeStyle = color; g.lineJoin = 'round';
  g.strokeText(text, w / 2, h / 2);
  g.shadowBlur = h * 0.05; g.strokeStyle = '#ffffff'; g.lineWidth = h * 0.025; g.strokeText(text, w / 2, h / 2);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function posterTex(title, sub, c1, c2, c3) {
  const [c, g] = makeCanvas(256, 384);
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
  g.fillStyle = c3; g.beginPath(); g.arc(128, 210, 70, Math.PI, 0); g.fill();
  g.fillStyle = c1; for (let i = 0; i < 5; i++) g.fillRect(58, 160 + i * 11, 140, 4);
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 240 + i * i * 2.2); g.lineTo(256, 240 + i * i * 2.2); g.stroke(); }
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(128, 240); g.lineTo(128 + i * 60, 384); g.stroke(); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 30px "Arial Black", Arial, sans-serif'; g.fillText(title, 128, 60);
  g.font = '16px Arial, sans-serif'; g.fillText(sub, 128, 90);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function textTex(w, h, bg, fg, lines, size, border) {
  const [c, g] = makeCanvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold ' + size + 'px "Helvetica Neue", Arial, sans-serif';
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
T.signStreet = textTex(512, 96, '#2f8d72', '#ffffff', ['LAS PALMAS'], 62, true);
T.signAve = textTex(512, 96, '#2f8d72', '#ffffff', ['AV. SUNSET'], 62, true);
T.signRoad = textTex(512, 160, '#fff6fa', '#e05a9a', ['ROUTE', 'BARRÉE'], 62, true);
// écrans animés partagés
const tvCanvas = makeCanvas(96, 72); T.tv = tex(tvCanvas[0]);
const crtCanvas = makeCanvas(160, 120); T.crt = tex(crtCanvas[0]);
const pcCanvas = makeCanvas(256, 192); T.pcScreen = tex(pcCanvas[0]);
const ammoCanvas = makeCanvas(96, 48); T.ammo = tex(ammoCanvas[0]);
function drawCRT(t) {
  const g = crtCanvas[1], w = 160, h = 120;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a4bd8'); gr.addColorStop(0.55, '#ff7fbf'); gr.addColorStop(1, '#2a1d45');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(w / 2, h * 0.55, 26, Math.PI, 0); g.fill();
  g.fillStyle = '#ff7fbf'; for (let i = 0; i < 4; i++) g.fillRect(w / 2 - 28, h * 0.55 - 6 - i * 6, 56, 2);
  g.strokeStyle = '#7ff0ff'; g.lineWidth = 1;
  for (let i = 0; i < 8; i++) { const y = h * 0.56 + Math.pow((i + (t * 2) % 1) / 8, 2) * h * 0.44; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(w / 2, h * 0.56); g.lineTo(w / 2 + i * 22, h); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
  if (Math.random() < 0.04) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, Math.random() * h, w, 3); }
  T.crt.needsUpdate = true;
}
function drawPC(t, text) {
  const g = pcCanvas[1], w = 256, h = 192;
  g.fillStyle = '#10241c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7dffb8'; g.font = '16px "Lucida Console","Courier New",monospace'; g.textBaseline = 'top';
  const lines = text || ['LAS PALMAS OS v1.0', '', 'C:\\> DIR JEUX', '  EAU.EXE   1re version', '', 'C:\\> EAU.EXE', 'Appuie sur E pour', 'te connecter'];
  lines.forEach((l, i) => g.fillText(l, 12, 10 + i * 20));
  if (Math.floor(t * 2) % 2) g.fillRect(12 + 8 * 10, 10 + 7 * 20 + 2, 9, 14);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  T.pcScreen.needsUpdate = true;
}
drawCRT(0); drawPC(0);
