/* =========================================================
   Les jukebox du quartier : six versions d'un même air.
   Ils sont tous reliés entre eux (un seul disque joue pour tout le
   lotissement : on le lance dans une maison, on peut l'arrêter depuis
   une autre), et des haut-parleurs le diffusent dehors.
   ========================================================= */
const TRACKS = [
  { code: 'A1', titre: 'Piscine à minuit', sous: 'l’air tel qu’on s’en souvient', f: 'musique/1.mp3', dur: 194.35, col: '#ff8fc8' },
  { code: 'A2', titre: 'Sous la surface', sous: 'le même air, entendu sous l’eau', f: 'musique/2.mp3', dur: 194.85, col: '#7fe8d8' },
  { code: 'A3', titre: 'La longue marée', sous: 'il revient, plus lentement', f: 'musique/3.mp3', dur: 359.55, col: '#b9a2ff' },
  { code: 'B1', titre: 'Néons sur le lagon', sous: 'plus vif, plus lumineux', f: 'musique/4.mp3', dur: 263.13, col: '#ffc48f' },
  { code: 'B2', titre: 'Cassette retrouvée', sous: 'la copie usée d’un été', f: 'musique/5.mp3', dur: 243.12, col: '#8fd0ff' },
  { code: 'B3', titre: 'Le ciel qui fond', sous: 'presque rien, et pourtant le même', f: 'musique/6.mp3', dur: 184.76, col: '#ffe98a' }
];
const JUKE = { boxes: [], spk: [], cur: 0, t0: 0, from: '', menu: false, at: null, el: null, src: null, fade: null, an: null, abuf: null, lp: null, pan: null, g: null, verb: null, bus: null,
  lvl: 0, on: 0, hit: 0, blocked: false, syncT: 0, swT: 0, inside: false, err: 0 };
const JK = 0.6; // niveau du jukebox par rapport au curseur « musique »
const SILENCE = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABgAAAykAWlpaWlpaWlpaWlpaWlpaWnt7e3t7e3t7e3t7e3t7e3t7nJycnJycnJycnJycnJycnL29vb29vb29vb29vb29vb293t7e3t7e3t7e3t7e3t7e3t7/////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCowAAAAAAAAMpso+sIAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
const jlog = (m) => { if (DEBUG) { (JUKE.log = JUKE.log || []).push(Math.round(performance.now()) + ' ' + m); if (JUKE.log.length > 40) JUKE.log.shift(); } };
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- matériaux partagés ---------- */
const JB_U = { uTime: clockU, uOn: { value: 0 }, uLvl: { value: 0 }, uHit: { value: 0 } };
// tubes néon (couleurs qui coulent + bulles) et rubans de LED (points qui se poursuivent) : uv.y > 1.5 = LED
const JB_NEON = new THREE.ShaderMaterial({
  uniforms: JB_U,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\np = instanceMatrix * p;\n#endif\ngl_Position = projectionMatrix * modelViewMatrix * p; }',
  fragmentShader: [
    'uniform float uTime, uOn, uLvl, uHit; varying vec2 vUv;',
    'vec3 pal(float x){ return 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + x)); }',
    'void main(){',
    '  float u = vUv.x; vec3 col;',
    '  if (vUv.y > 1.5) {',
    '    float n = 72.0, idx = floor(u * n), cell = fract(u * n);',
    '    float dotv = smoothstep(0.46, 0.18, abs(cell - 0.5));',
    '    vec3 c = mix(pal(idx / 18.0 - uTime * 0.35 * uOn), vec3(1.0), 0.2);',
    '    float chase = mix(0.55 + 0.25 * sin(idx * 0.5 + uTime * 1.2), 0.45 + 0.55 * sin(idx * 0.9 - uTime * 9.0), uOn);',
    '    float k = mix(0.5, 1.1 + uLvl * 1.6, uOn) * max(chase, 0.08);',
    '    col = c * (dotv * k * 2.2 + 0.05);',
    '  } else {',
    '    vec3 c = mix(pal(u * 1.4 - uTime * (0.03 + 0.12 * uOn)), vec3(1.0), 0.08);',
    '    float bub = smoothstep(0.7, 1.0, fract(u * 22.0 - uTime * 0.8)) * smoothstep(0.2, 0.5, vUv.y) * uOn;',
    '    float k = mix(0.5 + 0.1 * sin(uTime * 1.3), 1.05 + uLvl * 1.3, uOn);',
    '    col = c * k * (1.0 + bub * 1.4);',
    '  }',
    '  col *= 1.0 - uHit * 0.85 * step(0.5, fract(uTime * 17.0));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
});
// halo coloré au sol devant chaque jukebox
const JB_GLOW = new THREE.ShaderMaterial({
  uniforms: JB_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float uTime, uOn, uLvl; varying vec2 vUv; vec3 pal(float x){ return 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + x)); } void main(){ vec2 q = (vUv - vec2(0.5, 0.9)) * vec2(1.2, 1.0); float r = length(q); float a = pow(max(0.0, 1.0 - r * 1.25), 2.2); float ang = atan(q.y, q.x); vec3 c = pal(ang * 0.16 + uTime * 0.1 * uOn); gl_FragColor = vec4(c * a * mix(0.08, 0.32 + uLvl * 0.5, uOn), 1.0); }'
});
const JB_BODY = phys({ vertexColors: true, roughness: 0.3, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
const JB_GLASS = std({ color: C('#f4f8ff'), transparent: true, opacity: 0.09, roughness: 0.04, metalness: 0.3, envMapIntensity: 1.25, depthWrite: false });
const JB_ATLAS = (() => { const [c, g] = makeCanvas(1024, 1024); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return { c, g, t }; })();
const JB_FACE = std({ map: JB_ATLAS.t, emissiveMap: JB_ATLAS.t, emissive: C('#ffffff'), emissiveIntensity: 0.15, roughness: 0.5, envMapIntensity: 1.25 });
const JB_REC = (() => {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#120d1c'; g.beginPath(); g.arc(128, 128, 127, 0, Math.PI * 2); g.fill();
  for (let r = 40; r < 126; r += 2.2) { g.strokeStyle = 'rgba(255,255,255,' + (0.04 + 0.05 * Math.abs(Math.sin(r * 0.7))) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  const sh = g.createLinearGradient(0, 0, 256, 256); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,220,250,0.18)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
  const lg = g.createRadialGradient(128, 128, 4, 128, 128, 40); lg.addColorStop(0, '#ffe98a'); lg.addColorStop(1, '#ff7fbf');
  g.fillStyle = lg; g.beginPath(); g.arc(128, 128, 38, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2456'; g.font = 'bold 15px "VT323", monospace'; g.textAlign = 'center'; g.fillText('L’EAU QUI', 128, 116); g.fillText('REVIENT', 128, 150);
  g.fillStyle = '#120d1c'; g.beginPath(); g.arc(128, 128, 4, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return std({ map: t, roughness: 0.28, metalness: 0.25, envMapIntensity: 1.5 });
})();
// zones du dessin partagé : petites cartes des titres, grille du haut-parleur, fond de la vitrine, afficheur
const ATL = { cards: [0, 0, 1024, 300], grill: [0, 300, 512, 700], back: [512, 300, 1024, 812], disp: [0, 830, 1024, 960] };
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawJukeAtlas() {
  const g = JB_ATLAS.g;
  // cartes des titres
  { const [x0, y0, x1, y1] = ATL.cards;
    const bg = g.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, '#fff6ea'); bg.addColorStop(1, '#ffe4f0'); g.fillStyle = bg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let i = 0; i < 6; i++) {
      const tr = TRACKS[i], cx = x0 + 14 + (i % 3) * 336, cy = y0 + 14 + Math.floor(i / 3) * 140, w = 324, h = 128;
      g.fillStyle = '#ffffff'; roundRect(g, cx, cy, w, h, 10); g.fill();
      g.fillStyle = tr.col; roundRect(g, cx, cy, 74, h, 10); g.fill(); g.fillRect(cx + 40, cy, 34, h);
      g.fillStyle = '#3a2456'; g.font = '48px "VT323", "Lucida Console", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tr.code, cx + 37, cy + h / 2 + 2);
      g.textAlign = 'left'; g.fillStyle = '#2a1d45'; g.font = '34px "VT323", "Lucida Console", monospace';
      const words = tr.titre.split(' '); let line = '', lines = [];
      for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > w - 96 && line) { lines.push(line); line = wd; } else line = tst; }
      lines.push(line);
      lines.slice(0, 2).forEach((l, k) => g.fillText(l, cx + 86, cy + (lines.length > 1 ? 38 + k * 34 : 50)));
      g.fillStyle = '#9a7fc0'; g.font = 'italic 22px "Cormorant Garamond", Georgia, serif'; g.fillText('l’eau qui revient', cx + 86, cy + 108);
      g.strokeStyle = 'rgba(58,36,86,0.18)'; g.lineWidth = 2; roundRect(g, cx, cy, w, h, 10); g.stroke();
    }
  }
  // grille du haut-parleur : tissu prune, barreaux chromés, médaillon
  { const [x0, y0, x1, y1] = ATL.grill, w = x1 - x0, h = y1 - y0;
    const fb = g.createRadialGradient(x0 + w / 2, y0 + h / 2, 20, x0 + w / 2, y0 + h / 2, w * 0.7); fb.addColorStop(0, '#5a3a7a'); fb.addColorStop(1, '#241638');
    g.fillStyle = fb; g.fillRect(x0, y0, w, h);
    g.strokeStyle = 'rgba(255,190,230,0.07)'; g.lineWidth = 1; for (let k = -h; k < w; k += 6) { g.beginPath(); g.moveTo(x0 + k, y0); g.lineTo(x0 + k + h, y1); g.stroke(); }
    for (let k = 0; k < 13; k++) { const bx = x0 + 22 + k * ((w - 44) / 12); const cg = g.createLinearGradient(bx - 7, 0, bx + 7, 0); cg.addColorStop(0, '#8f86a8'); cg.addColorStop(0.45, '#ffffff'); cg.addColorStop(1, '#6f6688'); g.fillStyle = cg; g.fillRect(bx - 6, y0 + 10, 12, h - 20); }
    const mx = x0 + w / 2, my = y0 + h / 2;
    const mg = g.createRadialGradient(mx - 20, my - 20, 10, mx, my, 90); mg.addColorStop(0, '#ffe2f2'); mg.addColorStop(0.6, '#ff8fc8'); mg.addColorStop(1, '#c95f9f');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, 86, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.beginPath(); g.arc(mx, my, 86, 0, Math.PI * 2); g.stroke();
    // une double croche dessinée
    g.fillStyle = '#3a2456'; g.save(); g.translate(mx - 10, my + 26);
    for (const ox of [-22, 26]) { g.beginPath(); g.ellipse(ox, 0, 17, 12, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(ox + 11, -62, 6, 62); }
    g.beginPath(); g.moveTo(-5, -62); g.lineTo(43, -74); g.lineTo(43, -60); g.lineTo(-5, -48); g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#3a2456'; g.font = '30px "VT323", monospace'; g.textAlign = 'center'; g.fillText('STÉRÉO', mx, my + 62);
  }
  // fond de la vitrine : un coucher de soleil rayé
  { const [x0, y0, x1, y1] = ATL.back, w = x1 - x0, h = y1 - y0;
    const sky = g.createLinearGradient(0, y0, 0, y1); sky.addColorStop(0, '#2a1d6e'); sky.addColorStop(0.45, '#9a4fb8'); sky.addColorStop(0.75, '#ff7fbf'); sky.addColorStop(1, '#ffd2a0');
    g.fillStyle = sky; g.fillRect(x0, y0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.random() * 0.6) + ')'; g.fillRect(x0 + Math.random() * w, y0 + Math.random() * h * 0.4, 2, 2); }
    const sx = x0 + w / 2, sy = y0 + h * 0.74, sr = 120;
    const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#fff3a0'); sg.addColorStop(1, '#ff6fa8');
    g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.clip(); g.fillStyle = sg; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    g.fillStyle = '#ff7fbf'; for (let k = 0; k < 6; k++) g.fillRect(sx - sr, sy + 10 + k * 18, sr * 2, 3 + k * 1.6); g.restore();
    g.strokeStyle = 'rgba(255,140,230,0.7)'; g.lineWidth = 2; const hy = y0 + h * 0.86;
    for (let k = 0; k < 5; k++) { const yy = hy + k * k * 4; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke(); }
    for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(sx + k * 14, hy); g.lineTo(sx + k * 90, y1); g.stroke(); }
  }
  drawJukeDisplay();
}
function drawJukeDisplay() {
  const g = JB_ATLAS.g, [x0, y0, x1, y1] = ATL.disp, w = x1 - x0, h = y1 - y0;
  g.fillStyle = '#140d22'; g.fillRect(x0, y0, w, h);
  for (let y = y0; y < y1; y += 4) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x0, y, w, 1); }
  const tr = JUKE.cur ? TRACKS[JUKE.cur - 1] : null;
  g.font = '92px "VT323", "Lucida Console", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = tr ? '#7dffd8' : '#ff9fcd'; g.shadowColor = g.fillStyle; g.shadowBlur = 18;
  g.fillText(tr ? '♪ ' + tr.code + ' · ' + tr.titre.toUpperCase() : 'CHOISIS UN DISQUE', x0 + w / 2, y0 + h / 2 + 4);
  g.shadowBlur = 0;
  JB_ATLAS.t.needsUpdate = true;
}
drawJukeAtlas();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawJukeAtlas()).catch(() => {});
// recale les coordonnées de texture d'une géométrie (0..1) dans une zone du dessin partagé
function atlasUV(geo, rect, fromPos) {
  const uv = geo.attributes.uv, [x0, y0, x1, y1] = rect;
  let mx = 0, my = 0, sx = 1, sy = 1;
  if (fromPos) { geo.computeBoundingBox(); const b = geo.boundingBox; mx = b.min.x; my = b.min.y; sx = b.max.x - b.min.x || 1; sy = b.max.y - b.min.y || 1; }
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const u = fromPos ? (pos.getX(i) - mx) / sx : uv.getX(i), v = fromPos ? (pos.getY(i) - my) / sy : uv.getY(i);
    uv.setXY(i, (x0 + u * (x1 - x0)) / 1024, 1 - (y0 + (1 - v) * (y1 - y0)) / 1024);
  }
  return geo;
}
function vcol(geo, hex) { const g = geo.index ? geo.toNonIndexed() : geo; const c = C(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function ledUV(geo) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + 2); return geo; }
function archShape(w, y0, yc) { const s = new THREE.Shape(); s.moveTo(-w / 2, y0); s.lineTo(w / 2, y0); s.lineTo(w / 2, yc); s.absarc(0, yc, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, y0); return s; }
function archCurve(r, y0, yc, z) {
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(new V3(-r, y0 + (yc - y0) * i / 10, z));
  for (let i = 1; i < 40; i++) { const a = Math.PI - Math.PI * i / 40; pts.push(new V3(Math.cos(a) * r, yc + Math.sin(a) * r, z)); }
  for (let i = 0; i <= 10; i++) pts.push(new V3(r, yc - (yc - y0) * i / 10, z));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
}
function rectCurve(w, h, r, cx, cy, z) {
  const pts = [], seg = 6, cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  for (const [ox, oy, a0] of cs) for (let i = 0; i <= seg; i++) { const a = a0 + Math.PI / 2 * i / seg; pts.push(new V3(cx + ox + Math.cos(a) * r, cy + oy + Math.sin(a) * r, z)); }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.05);
}

/* ---------- un jukebox (face avant vers +z local, posé à y = 0) ---------- */
const JW = 0.96, JD = 0.6, JH = 1.2, F0 = JD / 2, FP = F0 + 0.03;
function buildJukebox(x, y, z, ang, colA, owner, room) {
  const body = [], chrome = [], neon = [], face = [];
  // caisse en arche, aux bords arrondis
  const shell = new THREE.ExtrudeGeometry(archShape(JW, 0.06, JH), { depth: JD - 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 40 });
  shell.translate(0, 0, -(JD - 0.08) / 2); body.push(vcol(shell, colA));
  const plate = new THREE.ExtrudeGeometry(archShape(JW - 0.16, 0.1, JH), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 36 });
  plate.translate(0, 0, F0); body.push(vcol(plate, '#2e1f4a'));
  // boutons de sélection, un par disque
  TRACKS.forEach((tr, k) => { const b = new THREE.CylinderGeometry(0.023, 0.023, 0.03, 16).rotateX(Math.PI / 2); b.translate(-0.25 + k * 0.1, 0.68, FP + 0.012); body.push(vcol(b, tr.col)); });
  // pieds, ornement, montants chromés
  for (const sx of [-0.4, 0.4]) for (const sz of [-0.2, 0.2]) chrome.push(prepGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.06, 14), M4(sx, 0.03, sz)));
  chrome.push(prepGeo(new THREE.SphereGeometry(0.05, 16, 10), M4(0, JH + JW / 2 + 0.06, 0)));
  chrome.push(prepGeo(new THREE.ConeGeometry(0.03, 0.09, 12), M4(0, JH + JW / 2 + 0.14, 0)));
  for (const s of [-1, 1]) chrome.push(prepGeo(boxG(0.012, 0.9, 0.05), M4(s * (JW / 2 + 0.04), 0.62, 0)));
  chrome.push(prepGeo(new THREE.TubeGeometry(archCurve(0.3, 1.0, JH, FP + 0.012), 90, 0.012, 6, false)));
  chrome.push(prepGeo(boxG(0.62, 0.022, 0.03), M4(0, 1.0, FP + 0.012)));
  chrome.push(prepGeo(new THREE.TubeGeometry(rectCurve(0.64, 0.5, 0.05, 0, 0.38, FP + 0.008), 60, 0.011, 6, true)));
  chrome.push(prepGeo(new THREE.TubeGeometry(rectCurve(0.7, 0.22, 0.03, 0, 0.83, FP + 0.035), 40, 0.01, 6, true)));
  chrome.push(prepGeo(boxG(0.09, 0.05, 0.02), M4(0.36, 0.68, FP + 0.01))); chrome.push(prepGeo(boxG(0.05, 0.008, 0.024), M4(0.36, 0.68, FP + 0.012)));
  chrome.push(prepGeo(boxG(0.16, 0.014, 0.014), M4(0.2, 1.33, FP + 0.02, 0, 0, -0.65))); chrome.push(prepGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10).rotateX(Math.PI / 2), M4(0.26, 1.38, FP + 0.02)));
  // néons en arche et ruban de LED sur le pourtour
  neon.push(prepGeo(new THREE.TubeGeometry(archCurve(0.345, 1.0, JH, FP + 0.02), 140, 0.016, 8, false)));
  neon.push(prepGeo(new THREE.TubeGeometry(archCurve(0.39, 0.14, JH, FP + 0.022), 200, 0.02, 8, false)));
  neon.push(ledUV(prepGeo(new THREE.TubeGeometry(archCurve(0.445, 0.07, JH, F0 + 0.006), 260, 0.012, 6, false))));
  neon.push(ledUV(prepGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-0.44, 0.075, F0 + 0.01), new V3(0.44, 0.075, F0 + 0.01)]), 30, 0.012, 6, false))));
  // façade dessinée : cartes des titres (inclinées), grille, fond de vitrine, afficheur
  face.push(atlasUV(prepGeo(planeG(0.66, 0.194), M4(0, 0.83, FP + 0.03, -0.28, 0, 0)), ATL.cards));
  face.push(atlasUV(prepGeo(planeG(0.62, 0.48), M4(0, 0.38, FP + 0.003)), ATL.grill));
  { const bg = new THREE.ShapeGeometry(archShape(0.6, 1.0, JH), 30); atlasUV(bg, ATL.back, true); face.push(prepGeo(bg, M4(0, 0, FP + 0.002))); }
  face.push(atlasUV(prepGeo(planeG(0.5, 0.05), M4(0, 0.965, FP + 0.004)), ATL.disp));
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ang; world.add(g);
  const mk = (geos, mat, cast) => { const m = new THREE.Mesh(mergeGeos(geos), mat); geos.forEach((q) => q.dispose()); m.castShadow = !!cast; m.receiveShadow = true; m.matrixAutoUpdate = false; g.add(m); m.updateMatrix(); return m; };
  mk(body.map((q) => prepGeo(q)), JB_BODY, true); mk(chrome, MAT.chrome, true); mk(neon, JB_NEON, false); mk(face, JB_FACE, false);
  const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 48).rotateX(Math.PI / 2), JB_REC); rec.position.set(0, JH, FP + 0.01); g.add(rec);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.6, 1.0, JH), 30), JB_GLASS); glass.position.z = FP + 0.03; glass.renderOrder = 3; g.add(glass);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.6).rotateX(-Math.PI / 2), JB_GLOW); glow.position.set(0, 0.012, 0.75); glow.renderOrder = 2; g.add(glow);
  g.updateMatrixWorld(true);
  const c = Math.cos(ang), s = Math.sin(ang);
  const b = { i: JUKE.boxes.length, g, rec, x, y, z, ang, c, s, owner, room, hx: JW / 2 + 0.05, hy: 0.86, hz: JD / 2 + 0.04, alive: true, hp: 0,
    fx: x + s * 0.95, fz: z + c * 0.95, light: addSoft(x + s * 1.3, y + 0.45, z + c * 1.3, '#ff9fe0', 0.35, 3.6) };
  b.yc = y + 0.86; // centre de la boîte de tir
  b.col = addBox(x, z, b.hx, b.hz, ang, y - 0.3, y + 1.72, W_PLAYER | W_BALL | W_SHEEP, 'meuble');
  b.floor = addFloorOBB(x, z, 0.22, 0.2, ang, y + 1.74, { meuble: true });
  JUKE.boxes.push(b);
  return b;
}
/* ---------- haut-parleurs dehors ---------- */
const SPK = { body: [], chrome: [], cones: [], rings: [] };
const SPK_CONE = (() => { const pts = []; for (let i = 0; i <= 10; i++) { const r = 0.02 + i * 0.017; pts.push(new THREE.Vector2(r, Math.pow(i / 10, 1.6) * 0.06)); } const g = new THREE.LatheGeometry(pts, 32); g.rotateX(Math.PI / 2); return g; })();
function buildSpeaker(x, z, ang, colA, colB) {
  const m = M4(x, 0, z, 0, ang, 0);
  const T2 = (geo, lm) => prepGeo(geo, m.clone().multiply(lm || new THREE.Matrix4()));
  SPK.body.push(vcol(T2(new THREE.CylinderGeometry(0.26, 0.32, 0.08, 20), M4(0, 0.04, 0)), '#f3ecff'));
  SPK.body.push(vcol(T2(new THREE.CylinderGeometry(0.045, 0.055, 2.2, 12), M4(0, 1.1, 0)), '#f3ecff'));
  const cab = M4(0, 2.56, 0, 0.14, 0, 0);
  const rr2 = new THREE.Shape(); { const w = 0.58, h = 0.8, r = 0.09; rr2.moveTo(-w / 2 + r, -h / 2); rr2.lineTo(w / 2 - r, -h / 2); rr2.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); rr2.lineTo(w / 2, h / 2 - r); rr2.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); rr2.lineTo(-w / 2 + r, h / 2); rr2.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); rr2.lineTo(-w / 2, -h / 2 + r); rr2.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); }
  const box = new THREE.ExtrudeGeometry(rr2, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 8 }); box.translate(0, 0, -0.15);
  SPK.body.push(vcol(T2(box, cab), colA));
  const baffle = new THREE.ShapeGeometry(rr2, 8); baffle.scale(0.86, 0.9, 1); SPK.body.push(vcol(T2(baffle, cab.clone().multiply(M4(0, 0, 0.181))), colB));
  SPK.chrome.push(T2(boxG(0.1, 0.16, 0.08), M4(0, 2.18, -0.02)));
  for (const [cy, r] of [[-0.1, 0.205], [0.24, 0.078]]) SPK.chrome.push(T2(new THREE.TorusGeometry(r, 0.014, 8, 40), cab.clone().multiply(M4(0, cy, 0.19))));
  const base = m.clone().multiply(cab);
  SPK.cones.push({ m: base.clone().multiply(M4(0, -0.1, 0.13)), s: 1 }, { m: base.clone().multiply(M4(0, 0.24, 0.16)), s: 0.4 });
  SPK.rings.push(base.clone().multiply(M4(0, -0.1, 0.188)));
  const sp = { x, z, ang, c: Math.cos(ang), s: Math.sin(ang), y: 2.56, hx: 0.33, hy: 0.44, hz: 0.2, ph: JUKE.spk.length * 0.7 };
  sp.cx = x + sp.s * 0.05; sp.cz = z + sp.c * 0.05;
  addCircle(x, z, 0.12, -1, 2.2, W_PLAYER | W_BALL | W_SHEEP, 'poteau');
  addBox(x, z, 0.32, 0.22, ang, 2.1, 3.0, W_PLAYER | W_BALL | W_SHEEP, 'meuble');
  JUKE.spk.push(sp);
  return sp;
}

/* ---------- où sont les jukebox : cinq maisons et le disquaire ---------- */
const JB_COLORS = ['#ff5fa8', '#3fd6b8', '#9a7cff', '#ff9a5f', '#4fb0ff'];
[2, 5, 9, 14, 17].forEach((hi, k) => {
  const h = houses[hi]; if (!h) return;
  const [x, z] = h.toW(h.ox + h.gs * 0.8, -0.56);
  const b = buildJukebox(x, FLOOR_Y, z, h.rot + Math.PI, JB_COLORS[k], h, null);
  b.house = h;
  // un haut-parleur sur la pelouse, tourné vers la rue
  const [sx, sz] = h.toW(h.ox - h.gs * 5.3, Math.min(2.5, h.L.front - 2.2));
  buildSpeaker(sx, sz, h.rot, JB_COLORS[k], '#fff3e8');
});
{ const s = SHOPS[1]; const b = buildJukebox(131.6, 0.15, s.z0 + 0.52, 0, '#ff7fbf', null, s); b.shop = s; }
buildSpeaker(114.6, -12.9, -Math.PI / 2, '#ffc2dc', '#fff3e8');
buildSpeaker(114.6, 4.9, -Math.PI / 2, '#b9f1e2', '#fff3e8');
buildSpeaker(11.4, -11.4, -Math.PI / 4, '#cfbaff', '#fff3e8');
for (const [id, th, col] of [['lagon-est', 0.55, '#ffd2b4'], ['lagon-couchant', -1.6, '#ff9fcd']]) {
  const d = LAGOONS_DEF.find((q) => q.id === id); if (!d) continue;
  const [x, z] = blobPt(d, th, 1, 5.2);
  buildSpeaker(x, z, Math.atan2(d.cx - x, d.cz - z), col, '#fff3e8');
}
{
  const merge = (list, mat) => { const m = new THREE.Mesh(mergeGeos(list), mat); list.forEach((q) => q.dispose()); m.castShadow = true; m.receiveShadow = true; world.add(m); return m; };
  merge(SPK.body, JB_BODY); merge(SPK.chrome, MAT.chrome);
  SPK.coneIM = new THREE.InstancedMesh(SPK_CONE, std({ color: C('#2a1d45'), roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }), SPK.cones.length);
  SPK.cones.forEach((c, i) => SPK.coneIM.setMatrixAt(i, c.m.clone().multiply(M4(0, 0, 0, 0, 0, 0, c.s, c.s, c.s))));
  SPK.coneIM.castShadow = true; SPK.coneIM.frustumCulled = false; world.add(SPK.coneIM);
  SPK.ringIM = new THREE.InstancedMesh(ledUV(new THREE.TorusGeometry(0.228, 0.011, 6, 72)), JB_NEON, SPK.rings.length);
  SPK.rings.forEach((m, i) => SPK.ringIM.setMatrixAt(i, m)); SPK.ringIM.frustumCulled = false; world.add(SPK.ringIM);
}

/* ---------- son : un seul lecteur pour tout le quartier ---------- */
function jukeInitAudio() {
  if (JUKE.el || !AU.ctx) return;
  const ctx = AU.ctx, el = new Audio();
  el.preload = 'none'; el.loop = false; el.setAttribute('playsinline', '');
  // fin d'un morceau : le jukebox en tire un autre au hasard (aussi quand l'onglet est en arrière-plan)
  el.addEventListener('ended', () => { if (el.src.startsWith('data:')) return; if (!jukeTick()) setTimeout(jukeTick, Math.max(50, (jukeDur() - jukePos()) * 1000 + 60)); });
  JUKE.el = el;
  // déverrouille la lecture pendant le geste qui lance le jeu (nécessaire sur iPhone et iPad)
  el.src = SILENCE;
  try { const pr = el.play(); if (pr && pr.then) pr.then(() => { if (!JUKE.cur) el.pause(); }).catch(() => {}); } catch (e) {}
  try { JUKE.src = ctx.createMediaElementSource(el); } catch (e) { JUKE.src = null; }
  JUKE.fade = ctx.createGain(); JUKE.fade.gain.value = 0;
  JUKE.an = ctx.createAnalyser(); JUKE.an.fftSize = 512; JUKE.abuf = new Float32Array(JUKE.an.fftSize);
  JUKE.lp = ctx.createBiquadFilter(); JUKE.lp.type = 'lowpass'; JUKE.lp.frequency.value = 20000; JUKE.lp.Q.value = 0.5;
  JUKE.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  JUKE.g = ctx.createGain(); JUKE.g.gain.value = 1;
  JUKE.bus = ctx.createGain(); JUKE.bus.gain.value = VOL.coupeMusique ? 0 : VOL.musique * JK;
  JUKE.verb = ctx.createGain(); JUKE.verb.gain.value = 0.05;
  if (JUKE.src) JUKE.src.connect(JUKE.fade);
  JUKE.fade.connect(JUKE.an); JUKE.an.connect(JUKE.lp);
  if (JUKE.pan) { JUKE.lp.connect(JUKE.pan); JUKE.pan.connect(JUKE.g); } else JUKE.lp.connect(JUKE.g);
  JUKE.g.connect(JUKE.bus); JUKE.bus.connect(AU.master); JUKE.g.connect(JUKE.verb); JUKE.verb.connect(AU.reverb);
  el.addEventListener('error', () => { jlog('error ' + el.src.slice(-12)); if (!JUKE.cur || el.src.startsWith('data:')) return; JUKE.err++; toast('Ce disque n’a pas pu être chargé : vérifie ta connexion.'); jukeStop('', true, true); });
  // quelqu'un avait déjà mis un disque avant que le son ne démarre
  if (JUKE.cur) jukeStart(JUKE.cur);
}
function jukeApplyVolume() { if (JUKE.bus && AU.ctx) JUKE.bus.gain.setTargetAtTime(VOL.coupeMusique ? 0 : VOL.musique * JK, AU.ctx.currentTime, 0.2); }
// durées fixes (les mêmes pour tout le monde) : c'est l'horloge commune qui décide quand on change de morceau
function jukeDur() { return JUKE.cur ? TRACKS[JUKE.cur - 1].dur : 200; }
function jukePos() { return JUKE.cur ? Math.max(0, (performance.now() - JUKE.t0) / 1000) : 0; }
// tirage au hasard, mais identique chez tous les rêveurs : même graine, même rang, même morceau précédent
function jukeNext(seed, k, prev) {
  const r = rng((seed | 0) * 7919 + k * 104729 + 13)(), others = [];
  for (let i = 1; i <= TRACKS.length; i++) if (i !== prev) others.push(i);
  return others[Math.min(others.length - 1, Math.floor(r * others.length))];
}
// passe au morceau suivant quand le précédent est fini ; renvoie vrai si on a changé
function jukeTick() {
  if (!JUKE.cur) return false;
  let n = 0;
  while (JUKE.cur && jukePos() >= jukeDur() && n < 50) { JUKE.t0 += jukeDur() * 1000; JUKE.k++; JUKE.cur = jukeNext(JUKE.seed, JUKE.k, JUKE.cur); n++; }
  if (!n) return false;
  jlog('suivant ' + JUKE.cur + ' k ' + JUKE.k);
  drawJukeDisplay(); jukeMenuRefresh();
  if (gameState === 'jeu') toast('Jukebox : au tour de "' + TRACKS[JUKE.cur - 1].titre + '"');
  if (JUKE.el) jukeStart(JUKE.cur);
  return true;
}
function jukeFade(v, tau) { if (!JUKE.fade) return; const t = AU.ctx.currentTime; JUKE.fade.gain.cancelScheduledValues(t); JUKE.fade.gain.setTargetAtTime(v, t, tau); }
function jukeTryPlay() {
  const el = JUKE.el; if (!el || !JUKE.cur) return;
  let pr; try { pr = el.play(); } catch (e) { JUKE.blocked = true; return; }
  if (pr && pr.then) pr.then(() => { JUKE.blocked = false; jukeFade(1, 0.25); }).catch(() => { JUKE.blocked = true; });
  else jukeFade(1, 0.25);
}
function jukeStart(i) {
  const el = JUKE.el; if (!el) return;
  jukeFade(0, 0.05);
  clearTimeout(JUKE.swT);
  jlog('start ' + i);
  JUKE.swT = setTimeout(() => {
    jlog('timer ' + i + ' cur ' + JUKE.cur);
    if (JUKE.cur !== i) return;
    const go = () => { el.removeEventListener('loadedmetadata', go); if (JUKE.cur !== i) return; try { el.currentTime = jukePos(); } catch (e) {} jukeTryPlay(); };
    el.addEventListener('loadedmetadata', go);
    el.preload = 'auto'; el.loop = false; el.src = TRACKS[i - 1].f; el.load();
  }, 160);
}
// i : 1 à 6 ; pos : où en est le disque (secondes) ; from : qui l'a lancé
// seed, k : graine et rang du tirage au hasard des morceaux suivants (partagés en multijoueur)
function jukePlay(i, pos, from, quiet, seed, k) {
  i = i | 0; jlog('play ' + i + ' from ' + from + ' el ' + !!JUKE.el); if (i < 1 || i > TRACKS.length) { jukeStop(from, quiet); return; }
  JUKE.cur = i; JUKE.t0 = performance.now() - Math.max(0, pos || 0) * 1000; JUKE.from = from || '';
  JUKE.seed = seed === undefined ? (Math.random() * 1e9) | 0 : seed | 0; JUKE.k = k | 0;
  setBaseMusic(false); drawJukeDisplay(); jukeMenuRefresh();
  if (!quiet) toast(from && from !== NET.selfId && from !== 'moi' ? NET.nameOf(from) + ' a mis "' + TRACKS[i - 1].titre + '" sur le jukebox' : 'Jukebox : "' + TRACKS[i - 1].titre + '"');
  if (JUKE.el) jukeStart(i);
}
function jukeStop(from, quiet, local) {
  jlog('stop ' + from);
  const was = JUKE.cur;
  JUKE.cur = 0; JUKE.blocked = false; clearTimeout(JUKE.swT);
  setBaseMusic(true); drawJukeDisplay(); jukeMenuRefresh();
  if (JUKE.el) { jukeFade(0, 0.18); const el = JUKE.el; setTimeout(() => { if (!JUKE.cur) try { el.pause(); } catch (e) {} }, 700); }
  if (was && !quiet) toast(from && from !== NET.selfId && from !== 'moi' ? NET.nameOf(from) + ' a arrêté le jukebox' : 'Jukebox arrêté : retour à la musique du lotissement');
}
// choix fait sur place, depuis n'importe quel jukebox : partagé avec les autres rêveurs
function jukeChoose(i) {
  if (i) jukePlay(i, 0, NET.selfId, false); else jukeStop(NET.selfId, false);
  sJukeKey(i);
  if (NET.on) NET.send('juke', { i: i | 0, p: 0, j: JUKE.at ? JUKE.at.i : -1, r: JUKE.seed | 0, k: 0 });
}
function jukeNetState() { return JUKE.cur ? { i: JUKE.cur, p: Math.round(jukePos() * 100) / 100, r: JUKE.seed | 0, k: JUKE.k | 0 } : 0; }
function jukeOnNet(d, from) {
  if (!d) return;
  const i = d.i | 0;
  if (d.s) { jukeFromState(d); return; } // simple mise à l'heure pour quelqu'un qui arrive
  if (i >= 1 && i <= TRACKS.length) jukePlay(i, (+d.p || 0) + 0.12, from, false, d.r | 0, d.k | 0); else jukeStop(from, false);
}
// un rêveur arrive : ceux qui écoutent un disque lui disent lequel, et où on en est
function jukeGreet(id) { if (JUKE.cur && NET.on) NET.send('juke', Object.assign(jukeNetState(), { s: 1 }), id); }
function jukeFromState(s) {
  jlog('state ' + JSON.stringify(s));
  // on ne coupe jamais la musique de quelqu'un à cause d'un état reçu : on ne fait que rejoindre un disque en cours
  if (s && (s.i | 0) >= 1 && (s.i | 0) <= TRACKS.length) { if (JUKE.cur !== (s.i | 0)) jukePlay(s.i | 0, (+s.p || 0) + 0.25, 'net', true, s.r | 0, s.k | 0); else { JUKE.t0 = performance.now() - ((+s.p || 0) + 0.25) * 1000; JUKE.seed = s.r | 0; JUKE.k = s.k | 0; } }
}
// si le navigateur a refusé de lancer la lecture (disque mis par quelqu'un d'autre), le prochain geste la relance
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, () => { if (JUKE.blocked && JUKE.cur) jukeTryPlay(); }, { passive: true });

/* ---------- où est-on par rapport à la musique ---------- */
function jukeHouseLive(b) { return b.house ? !b.house.collapsed : true; }
function jukeInside(x, y, z) {
  for (const b of JUKE.boxes) {
    if (b.house) { if (!b.house.collapsed && y < FLOOR_Y + 3.4 && houseAt(x, z, true) === b.house) return b; }
    else if (b.shop) { const s = b.shop; if (x > FX + 0.2 && x < s.x1 - 0.15 && z > s.z0 + 0.15 && z < s.z1 - 0.15 && y < s.h) return b; }
  }
  return null;
}
function otherBuilding(x, y, z) {
  const h = houseAt(x, z, true); if (h && !h.collapsed && y < 4) return true;
  for (const s of SHOPS) if (x > FX && x < s.x1 && z > s.z0 && z < s.z1 && y < s.h) return true;
  return refugeInside(x, z, y);
}
const _jr = new V3();
function updateJukeAudio(dt) {
  if (!JUKE.g || !AU.ctx) return;
  const t = AU.ctx.currentTime, cp = camera.position;
  // niveau sonore réel du disque, pour faire danser les lumières
  if (JUKE.cur && JUKE.src) {
    JUKE.an.getFloatTimeDomainData(JUKE.abuf); let s = 0; for (let i = 0; i < JUKE.abuf.length; i += 2) s += JUKE.abuf[i] * JUKE.abuf[i];
    const rms = Math.sqrt(s / (JUKE.abuf.length / 2));
    // niveau relatif au passage le plus fort récent : les lumières suivent les temps forts, même dans les versions douces
    JUKE.peak = Math.max(rms, (JUKE.peak || 0.05) * Math.exp(-dt * 0.25), 0.02);
    const k = clamp(Math.pow(rms / JUKE.peak, 2.2), 0, 1);
    JUKE.lvl = damp(JUKE.lvl, k, k > JUKE.lvl ? 22 : 7, dt);
  }
  else JUKE.lvl = damp(JUKE.lvl, 0, 4, dt);
  if (!JUKE.cur) return;
  let lvl = 1, lp = 20000, pan = 0, verb = 0.05;
  const inB = jukeInside(cp.x, cp.y, cp.z);
  JUKE.inside = !!inB;
  if (!inB) {
    // dehors : un peu moins fort, sauf près d'un haut-parleur ou d'une maison où joue un jukebox
    _jr.set(1, 0, 0).applyQuaternion(camera.quaternion);
    let prox = 0, px = 0;
    for (const s of JUKE.spk) { const dx = s.x - cp.x, dz = s.z - cp.z, dy = (s.y - cp.y) * 0.6, d = Math.sqrt(dx * dx + dz * dz + dy * dy); const f = 1 - sstep(2.5, 30, d); if (f > prox) { prox = f; px = (dx * _jr.x + dz * _jr.z) / Math.max(1, d); } }
    for (const b of JUKE.boxes) { if (!jukeHouseLive(b)) continue; const dx = b.x - cp.x, dz = b.z - cp.z, d = Math.max(0, Math.sqrt(dx * dx + dz * dz) - (b.house ? 6.5 : 9)); const f = 0.8 * (1 - sstep(0, 20, d)); if (f > prox) { prox = f; px = (dx * _jr.x + dz * _jr.z) / Math.max(1, Math.sqrt(dx * dx + dz * dz)); } }
    lvl = 0.52 + 0.36 * prox; lp = 2400 + 13000 * prox * prox; pan = clamp(px * prox * 0.55, -0.6, 0.6); verb = 0.24 - 0.12 * prox;
    if (otherBuilding(cp.x, cp.y, cp.z)) { lvl *= 0.8; lp = Math.min(lp, 1250); verb *= 0.5; }
  }
  JUKE.g.gain.setTargetAtTime(lvl, t, 0.25);
  JUKE.lp.frequency.setTargetAtTime(lp, t, 0.25);
  if (JUKE.pan) JUKE.pan.pan.setTargetAtTime(pan, t, 0.3);
  JUKE.verb.gain.setTargetAtTime(verb, t, 0.3);
  // garde tous les rêveurs calés sur le même moment du disque
  JUKE.syncT -= dt;
  if (JUKE.syncT <= 0 && JUKE.el && !JUKE.el.paused && JUKE.el.readyState >= 3 && !JUKE.el.seeking && !JUKE.el.src.startsWith('data:')) {
    JUKE.syncT = 2;
    const want = jukePos(), cur = JUKE.el.currentTime, dur = jukeDur();
    if (want < dur - 1 && Math.abs(cur - want) > 0.9) try { JUKE.el.currentTime = want; } catch (e) {}
  }
}
/* ---------- animation : disque qui tourne, néons, LED, haut-parleurs qui pompent ---------- */
const _jm = new THREE.Matrix4(), _js = new THREE.Matrix4();
function updateJukebox(dt) {
  jukeTick();
  const on = JUKE.cur ? 1 : 0;
  JUKE.on = damp(JUKE.on, on, on ? 3 : 1.5, dt);
  JUKE.hit = Math.max(0, JUKE.hit - dt * 2.5);
  JB_U.uOn.value = JUKE.on; JB_U.uLvl.value = JUKE.lvl; JB_U.uHit.value = JUKE.hit;
  JB_FACE.emissiveIntensity = 0.14 + JUKE.on * (0.14 + JUKE.lvl * 0.2);
  const cp = camera.position, t = clockU.value;
  for (const b of JUKE.boxes) {
    const live = jukeHouseLive(b);
    if (b.g.visible !== live) {
      b.g.visible = live; b.col.on = live; b.floor.off = !live; b.light.on = live;
      if (!live) { spawnDebrisBox(b.x, b.y + 0.8, b.z, 0.45, 0.8, 0.3, C(JB_COLORS[b.i % JB_COLORS.length]), 14, -1, null, 0.5); for (let k = 0; k < 20; k++) spawnSpark(b.x, b.y + 1.2, b.z, rnd(-4, 4), rnd(1, 5), rnd(-4, 4), rnd(0.4, 0.9)); }
    }
    if (!live) continue;
    const far = Math.abs(cp.x - b.x) > 50 || Math.abs(cp.z - b.z) > 50;
    if (!far) b.rec.rotation.z -= dt * 3.5 * JUKE.on;
    b.light.k = 0.35 + JUKE.on * (0.45 + JUKE.lvl * 0.9);
    if (JUKE.on > 0.05) b.light.c.setHSL((t * 0.06 + b.i * 0.17) % 1, 0.85, 0.72); else b.light.c.set('#ff9fe0');
  }
  // haut-parleurs : les membranes battent avec la musique
  if (JUKE.on > 0.01 || SPK.pumped) {
    SPK.pumped = JUKE.on > 0.01;
    for (let i = 0; i < SPK.cones.length; i++) {
      const c = SPK.cones[i], kick = JUKE.lvl * JUKE.on * (c.s > 0.5 ? 1 : 0.5);
      _js.makeScale(c.s * (1 + kick * 0.05), c.s * (1 + kick * 0.05), c.s * (1 + kick * 1.4));
      _jm.copy(c.m).multiply(_js); SPK.coneIM.setMatrixAt(i, _jm);
    }
    SPK.coneIM.instanceMatrix.needsUpdate = true;
  }
}
/* ---------- tirs : ça étincelle et le diamant saute ---------- */
function rayJuke(o, d, best, res) {
  for (const b of JUKE.boxes) {
    if (!b.g.visible) continue;
    const cx = b.x - o.x, cy = b.yc - o.y, cz = b.z - o.z, tc = cx * d.x + cy * d.y + cz * d.z;
    if (tc < -1.2 || tc > best + 1.2) continue;
    const bb = { x: b.x, y: b.yc, z: b.z, hx: b.hx, hy: b.hy, hz: b.hz, c: b.c, s: b.s };
    const tt = rayOBB(o, d, bb, best); if (tt < best) { best = tt; res.t = tt; res.kind = 'juke'; res.jb = b; res.n.copy(_rn); }
  }
  for (const s of JUKE.spk) {
    const cx = s.x - o.x, cy = s.y - o.y, cz = s.z - o.z, tc = cx * d.x + cy * d.y + cz * d.z;
    if (tc < -1 || tc > best + 1) continue;
    const tt = rayOBB(o, d, s, best); if (tt < best) { best = tt; res.t = tt; res.kind = 'juke'; res.jb = s; res.n.copy(_rn); }
  }
  return best;
}
function hitJuke(b, p, n) {
  for (let i = 0; i < 8; i++) spawnSpark(p.x, p.y, p.z, n.x * 3 + rnd(-2.5, 2.5), rnd(0, 3.5), n.z * 3 + rnd(-2.5, 2.5), rnd(0.3, 0.7));
  sClang(p);
  if (b.g) { // le jukebox lui-même : les lumières vacillent, le disque saute
    JUKE.hit = 1; sScratch(p);
    if (JUKE.cur && JUKE.fade && AU.ctx) { const t = AU.ctx.currentTime; JUKE.fade.gain.cancelScheduledValues(t); JUKE.fade.gain.setValueAtTime(0.25, t); JUKE.fade.gain.setTargetAtTime(1, t + 0.12, 0.08); }
  } else if (JUKE.cur) sScratch(p);
}

/* ---------- menu de choix ---------- */
function nearJukebox() {
  if (P.dead || P.inPC) return null;
  let best = null, bd = 1.35;
  for (const b of JUKE.boxes) {
    if (!b.g.visible || Math.abs(P.pos.y - b.y) > 1.2) continue;
    const d = Math.hypot(P.pos.x - b.fx, P.pos.z - b.fz); if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function buildJukeMenu() {
  const list = $('jukeListe'); list.innerHTML = '';
  TRACKS.forEach((tr, k) => {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'disque'; bt.dataset.i = String(k + 1); bt.style.setProperty('--c', tr.col);
    const sec = Math.round(tr.dur), m = Math.floor(sec / 60), s = sec % 60;
    bt.innerHTML = '<span class="d-code"></span><span class="d-texte"><b></b><small></small></span><span class="d-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="v-touche"></span>';
    bt.querySelector('.d-code').textContent = tr.code;
    bt.querySelector('b').textContent = tr.titre;
    bt.querySelector('small').textContent = tr.sous + ' · ' + m + ':' + String(s).padStart(2, '0');
    bt.querySelector('.v-touche').textContent = String(k + 1);
    bt.addEventListener('click', () => pickJuke(k + 1, true));
    list.append(bt);
  });
}
buildJukeMenu();
function jukeMenuRefresh() {
  const list = $('jukeListe'); if (!list) return;
  for (const bt of list.children) { const on = (bt.dataset.i | 0) === JUKE.cur; bt.setAttribute('aria-pressed', on ? 'true' : 'false'); bt.classList.toggle('joue', on); }
  $('jukeStop').disabled = !JUKE.cur;
  $('jukeEnCours').textContent = JUKE.cur ? 'En ce moment : "' + TRACKS[JUKE.cur - 1].titre + '"' + (JUKE.from && JUKE.from !== NET.selfId && JUKE.from !== 'net' && JUKE.from !== 'moi' ? ', mis par ' + NET.nameOf(JUKE.from) : '') : 'Aucun disque : c’est la musique du lotissement qui joue.';
}
function openJukeMenu(b) {
  if (JUKE.menu || PCMENU.open || PC.phase) return;
  JUKE.menu = true; JUKE.at = b; JUKE.openT = performance.now(); P.ui = true; WPN.firing = false; P.aiming = false;
  for (const k in keys) keys[k] = false;
  jukeMenuRefresh();
  $('jukeMenu').hidden = false;
  $('jukePied').textContent = DEVICE === 'mobile' ? 'Touche un disque · touche à côté pour fermer' : 'Clique sur un disque, ou appuie sur 1 à 6 · 0 pour arrêter · Échap pour fermer';
  if (document.pointerLockElement) { CHAT.wantUnlock = true; document.exitPointerLock(); }
  sJukeOpen();
  setTimeout(() => { try { const f = $('jukeListe').children[Math.max(0, JUKE.cur - 1)]; if (f) f.focus({ preventScroll: true }); } catch (e) {} }, 60);
}
function closeJukeMenu(relock) {
  if (!JUKE.menu) return;
  JUKE.menu = false; P.ui = false; $('jukeMenu').hidden = true;
  if (relock && DEVICE !== 'mobile') requestLock(); else if (DEVICE !== 'mobile') toast('Clique pour reprendre la visée');
}
// sur écran tactile, le doigt qui vient d'ouvrir le menu ne doit pas choisir un disque par la même occasion
const jukeFresh = () => performance.now() - (JUKE.openT || 0) < 450;
function pickJuke(i, byPointer) { if (!JUKE.menu || (byPointer && jukeFresh())) return; closeJukeMenu(true); jukeChoose(i); }
$('jukeStop').addEventListener('click', () => pickJuke(0, true));
$('jukeMenu').addEventListener('pointerdown', (e) => { if (e.target === $('jukeMenu') && !jukeFresh()) closeJukeMenu(DEVICE !== 'mobile'); });
