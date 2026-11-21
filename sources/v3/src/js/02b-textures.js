/* =========================================================
   Textures du front de mer : planches, relief (cartes de normales), rayures de stand
   ========================================================= */
// carte de normales tirée d'un dessin en niveaux de gris (clair = haut)
function normalMapFrom(c, strength, repeat) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const [nc, ng] = makeCanvas(w, h), out = ng.createImageData(w, h), o = out.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * strength, dy = (H(x, y - 1) - H(x, y + 1)) * strength, l = Math.hypot(dx, dy, 1), k = (y * w + x) * 4;
    o[k] = (dx / l * 0.5 + 0.5) * 255; o[k + 1] = (-dy / l * 0.5 + 0.5) * 255; o[k + 2] = (1 / l * 0.5 + 0.5) * 255; o[k + 3] = 255;
  }
  ng.putImageData(out, 0, 0);
  return tex(nc, { repeat: repeat || [1, 1], srgb: false });
}
{ // planches de la jetée : bois blanchi par le sel, lames de 20 cm
  const [c, g] = makeCanvas(512, 512), [hc, hg] = makeCanvas(512, 512);
  const cols = ['#e9cdbd', '#dcbcae', '#f0d9cb', '#d6b3a6', '#e6c6c0', '#efd2c2'];
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10; i++) {
    const y = i * 51.2;
    g.fillStyle = cols[(i * 5 + 2) % cols.length]; g.fillRect(0, y, 512, 51.2);
    for (let k = 0; k < 26; k++) { const yy = y + 3 + R() * 45; g.strokeStyle = 'rgba(120,80,90,' + (0.05 + R() * 0.1) + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(170, yy + rr(-3, 3), 340, yy + rr(-3, 3), 512, yy); g.stroke(); hg.strokeStyle = 'rgba(0,0,0,0.12)'; hg.beginPath(); hg.moveTo(0, yy); hg.lineTo(512, yy + rr(-2, 2)); hg.stroke(); }
    const cut = R() * 512;
    g.fillStyle = 'rgba(70,45,70,0.55)'; g.fillRect(0, y, 512, 2.2); g.fillRect(cut, y, 2, 51.2);
    hg.fillStyle = '#000'; hg.fillRect(0, y, 512, 3); hg.fillRect(cut, y, 3, 51.2);
    for (const nx of [cut + 9, cut - 9]) for (const ny of [y + 12, y + 40]) { g.fillStyle = 'rgba(90,70,100,0.6)'; g.beginPath(); g.arc((nx + 512) % 512, ny, 1.8, 0, 7); g.fill(); }
  }
  grain(g, 512, 512, 12);
  T.planks = tex(c, { repeat: [0.5, 0.5] }); T.planksN = normalMapFrom(hc, 2.2, [0.5, 0.5]);
}
{ // rides du sable
  const [hc, hg] = makeCanvas(256, 256), d = hg.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const u = x / 256 * Math.PI * 2, v = y / 256 * Math.PI * 2; const n = 0.5 + 0.25 * Math.sin(v * 9 + Math.sin(u * 2) * 1.6 + Math.sin(u * 5 + v) * 0.5) + 0.12 * Math.sin(u * 23 + v * 17) + (Math.random() - 0.5) * 0.22; const k = (y * 256 + x) * 4; d.data[k] = d.data[k + 1] = d.data[k + 2] = clamp(n, 0, 1) * 255; d.data[k + 3] = 255; }
  hg.putImageData(d, 0, 0);
  T.sandN = normalMapFrom(hc, 1.6, [0.3, 0.3]);
}
// toile rayée des stands et des parasols
function stripeTex(c1, c2, n) { const [c, g] = makeCanvas(256, 64); for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 256 / n, 0, 256 / n + 1, 64); } grain(g, 256, 64, 8); return tex(c); }
