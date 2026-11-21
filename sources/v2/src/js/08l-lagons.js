/* =========================================================
   Lagons : grands bassins de forme libre, plus profonds au centre,
   plage de sable, rochers, palmiers, torches, cascade,
   tour en colimaçon avec deux toboggans, grosses balles qui flottent
   ========================================================= */
{ // sable rosé
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#f6dcc8'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,240,228,0.28)' : 'rgba(222,178,165,0.2)'; g.beginPath(); g.ellipse(R() * 256, R() * 256, 10 + R() * 40, 6 + R() * 20, R() * 3, 0, 7); g.fill(); }
  grain(g, 256, 256, 24);
  for (let i = 0; i < 1100; i++) { g.fillStyle = ['rgba(255,255,255,.55)', 'rgba(190,140,135,.35)', 'rgba(255,180,210,.4)'][i % 3]; g.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
  T.sand = tex(c, { repeat: [0.22, 0.22] });
}
{ // enduit clair du fond
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#e4f7f3'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = R() < 0.5 ? 'rgba(160,225,230,0.22)' : 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(R() * 256, R() * 256, 8 + R() * 36, 6 + R() * 24, R() * 3, 0, 7); g.fill(); }
  grain(g, 256, 256, 16);
  T.lagoonFloor = tex(c, { repeat: [0.18, 0.18] });
}
{ // ballon de plage
  const [c, g] = makeCanvas(512, 256);
  const cols = ['#ff5f8f', '#ffe27a', '#5fd8ff', '#ffffff', '#8fe8a8', '#ff9f5f'];
  for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect(i * 512 / 6, 0, 512 / 6 + 1, 256); }
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 24); g.fillRect(0, 232, 512, 24);
  T.beachBall = tex(c);
}
const sandMat = std({ color: C('#d6bdb2'), map: T.sand, roughness: 0.95, envMapIntensity: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const lagoonFloorMat = std({ color: C('#8fd3d6'), map: T.lagoonFloor, roughness: 0.75 }, causticExtra);
const lagoonWallMat = std({ color: C('#9fd8d6'), map: T.lagoonFloor, roughness: 0.7, side: THREE.DoubleSide }, causticExtra);
const filmMat = new THREE.ShaderMaterial({
  uniforms: { uTime: clockU, uK: { value: 1.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float s = fract(vUv.y*0.55 - uTime*1.7); float st = smoothstep(0.0,0.12,s)*(1.0 - smoothstep(0.35,0.7,s)); float e = 1.0 - abs(vUv.x*2.0 - 1.0); float sp = step(0.93, fract(sin(dot(floor(vec2(vUv.x*14.0, vUv.y*6.0 - uTime*10.0)), vec2(12.9,78.2)))*43758.5)); vec3 c = vec3(0.78,1.0,1.0)*(0.35 + st*0.7 + sp*0.8); gl_FragColor = vec4(c*1.25, (0.16 + st*0.32 + sp*0.3)*smoothstep(0.0, 0.35, e)); }',
  transparent: true, depthWrite: false, side: THREE.DoubleSide
});
filmMat.userData.noShoot = true;
// disque polaire déformé (fond en cuvette, surface de l'eau)
function blobDiscGeo(b, rings, segs, yf) {
  const pos = [b.cx, yf(b.cx, b.cz), b.cz], uv = [b.cx, b.cz], idx = [];
  for (let r = 1; r <= rings; r++) {
    const s = r / rings;
    for (let i = 0; i < segs; i++) { const [x, z] = blobPt(b, i / segs * Math.PI * 2, s); pos.push(x, yf(x, z, s), z); uv.push(x, z); }
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + (i + 1) % segs, 1 + i);
  for (let r = 1; r < rings; r++) for (let i = 0; i < segs; i++) { const a = 1 + (r - 1) * segs + i, b2 = 1 + (r - 1) * segs + (i + 1) % segs, c = 1 + r * segs + i, d = 1 + r * segs + (i + 1) % segs; idx.push(a, b2, c, b2, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// ruban en U le long d'une courbe (toboggan) ; renvoie aussi les échantillons
function channelGeo(samples, R, a0, lift) {
  const pos = [], uv = [], idx = [], J = 14, sdv = new V3(), upv = new V3();
  let len = 0;
  for (let i = 0; i < samples.length; i++) {
    const c = samples[i].p, t = samples[i].t;
    if (i > 0) len += c.distanceTo(samples[i - 1].p);
    const sd = sdv.crossVectors(t, UP).normalize(), up = upv.crossVectors(sd, t).normalize();
    for (let j = 0; j <= J; j++) {
      const al = -a0 + 2 * a0 * j / J;
      pos.push(c.x + sd.x * Math.sin(al) * R + up.x * (R - Math.cos(al) * R + lift), c.y + sd.y * Math.sin(al) * R + up.y * (R - Math.cos(al) * R + lift), c.z + sd.z * Math.sin(al) * R + up.z * (R - Math.cos(al) * R + lift));
      uv.push(j / J, len);
    }
  }
  for (let i = 0; i < samples.length - 1; i++) for (let j = 0; j < J; j++) { const a = i * (J + 1) + j, b = a + 1, c = a + J + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// rochers : un icosaèdre cabossé, en instances
const rockGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1), pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), n = 1 + 0.2 * Math.sin(x * 3.1 + y * 1.7) * Math.cos(z * 2.3) + 0.12 * Math.sin(z * 5.3 - x * 2.1); pa.setXYZ(i, x * n, y * n, z * n); }
  g.computeVertexNormals(); return g;
})();
const ROCKS = [], ROCK_COLS = ['#b9a3d6', '#d9a891', '#c6b9cf', '#d39ab0', '#a9bccf'];
const TORCHES = [], SLIDES = [], CASCADES = [], LAGOONS = [];
const BIGB = [];
const torchFlameMat = new THREE.MeshBasicMaterial({ color: HDR('#ffb070', 4.5) });
function buildLagoon(def, li) {
  const p = Object.assign({}, def, { blob: true, lagoon: true, surf: -0.13, ripples: [], rippleI: 0, hw: def.ax, hl: def.az,
    x0: def.cx - def.ax * 1.32, x1: def.cx + def.ax * 1.32, z0: def.cz - def.az * 1.32, z1: def.cz + def.az * 1.32 });
  for (let i = 0; i < 6; i++) p.ripples.push(new THREE.Vector4(0, 0, -100, 0));
  const b = p, TAU = Math.PI * 2;
  const inArc = (th, arcs) => { for (const [a, c] of arcs) { let t = th; while (t < a) t += TAU; while (t > a + TAU) t -= TAU; if (t <= c) return true; } return false; };
  const beachW = (th) => { let w = 0; for (const [a, c] of p.beach) { const m = (a + c) / 2, hw = (c - a) / 2 + 0.35; let d = th - m; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; w = Math.max(w, clamp(1 - Math.abs(d) / hw, 0, 1)); } return w * w * (3 - 2 * w); };
  // fond en cuvette et paroi courte
  B.add(blobDiscGeo(b, 18, 112, (x, z) => -poolDepthAt(p, x, z)), lagoonFloorMat, M4(), false, true);
  {
    const N = 160, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const [x, z] = blobPt(b, i / N * TAU, 1); pos.push(x, 0.02, z, x, -p.rim - 0.06, z); uv.push(i * 0.5, 0, i * 0.5, 0.4); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    B.add(g, lagoonWallMat, M4(), false, true);
  }
  // plage : plus large aux endroits sans rochers
  {
    const N = 144, sh = new THREE.Shape(), hole = new THREE.Path();
    for (let i = 0; i < N; i++) { const th = i / N * TAU, [x, z] = blobPt(b, th, 1, 3.2 + 4.2 * beachW(th)); if (i === 0) sh.moveTo(x, -z); else sh.lineTo(x, -z); }
    sh.closePath();
    for (let i = 0; i < N; i++) { const [x, z] = blobPt(b, i / N * TAU, 1, -0.05); if (i === 0) hole.moveTo(x, -z); else hole.lineTo(x, -z); }
    hole.closePath(); sh.holes.push(hole);
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
    B.add(g, sandMat, M4(0, 0.012, 0), false, true, 'sable');
  }
  // rochers sur le bord, sauf sur les plages
  {
    let per = 0; const poly = blobPoly(b, 200); for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; per += Math.hypot(q[0] - poly[i][0], q[1] - poly[i][1]); }
    const N = Math.round(per / 0.8);
    for (let i = 0; i < N; i++) {
      const th = i / N * TAU + rr(-0.01, 0.01);
      if (inArc(th, p.beach)) continue;
      const s = rr(0.42, 0.95), [x, z] = blobPt(b, th, 1, rr(0.0, 0.45)), sy = s * rr(0.45, 0.72), y = s * rr(0.02, 0.18);
      ROCKS.push([li, M4(x, y, z, rr(-0.3, 0.3), rr(0, 6), rr(-0.3, 0.3), s * rr(0.95, 1.3), sy, s * rr(0.8, 1.1)), ROCK_COLS[(R() * ROCK_COLS.length) | 0]]);
      const top = y + sy * 0.9;
      if (top > 0.55) addCircle(x, z, s * 0.75, -1, top, W_ALL);
      addFloorCircle(x, z, s * 0.72, top);
      if (R() < 0.35) { const s2 = rr(0.25, 0.5), [x2, z2] = blobPt(b, th + rr(-0.02, 0.02), 1, rr(0.9, 1.6)); ROCKS.push([li, M4(x2, s2 * 0.1, z2, 0, rr(0, 6), 0, s2 * 1.2, s2 * 0.55, s2), ROCK_COLS[(R() * ROCK_COLS.length) | 0]]); addFloorCircle(x2, z2, s2 * 0.8, s2 * 0.55); }
    }
  }
  // lumières au fond
  for (let i = 0; i < 7; i++) {
    const th = i / 7 * TAU + 0.3, [x, z] = blobPt(b, th, 0.72), y = -poolDepthAt(p, x, z), m = i % 2 ? poolLightMat2 : poolLightMat;
    B.add(new THREE.SphereGeometry(0.24, 14, 8, 0, TAU, 0, Math.PI / 2), m, M4(x, y - 0.06, z), false, false, 'eau');
    addSoft(x, y + 0.5, z, i % 2 ? '#ff9fe0' : '#7ff6ff', 3.0, 7);
  }
  addSoft(p.cx, 1.4, p.cz, '#8ff6ff', 1.1, Math.max(p.ax, p.az) * 0.8);
  // surface de l'eau
  p.mat = waterMaterial(p);
  const wm = new THREE.Mesh(blobDiscGeo(b, 6, 128, () => 0), p.mat);
  wm.position.y = p.surf; wm.renderOrder = 2; wm.userData.surface = 'eau'; wm.userData.pool = p;
  world.add(wm); SHOOT.push(wm); p.mesh = wm;
  pools.push(p); LAGOONS.push(p);
  // palmiers penchés vers l'eau
  const towerTh = p.tower;
  for (let i = 0; i < 9; i++) {
    const th = i / 9 * TAU + 0.35 + li;
    let d = th - (towerTh === null ? 99 : towerTh); while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; if (towerTh !== null && Math.abs(d) < 0.55) continue;
    const [x, z] = blobPt(b, th, 1, rr(2.2, 4.2) + 2.5 * beachW(th));
    if (x < MAP.x0 + 3 || x > MAP.x1 - 3 || z < MAP.z0 + 3 || z > MAP.z1 - 3) continue;
    if (Math.abs(d) < 0.4 && p.cascade !== undefined) { let dc = th - p.cascade; while (dc > Math.PI) dc -= TAU; while (dc < -Math.PI) dc += TAU; if (Math.abs(dc) < 0.3) continue; }
    palm(x, z, rr(10, 15), rr(0.9, 1.6), Math.atan2(p.cx - x, p.cz - z) + rr(-0.3, 0.3), 12 + (i % 3));
  }
  // transats, parasols et torches sur les plages
  p.beach.forEach(([a, c], k) => {
    const m = (a + c) / 2;
    for (let j = -1; j <= 1; j++) {
      const th = m + j * 0.13, [x, z] = blobPt(b, th, 1, 4.6), ang = Math.atan2(p.cx - x, p.cz - z);
      transat(x, 0.01, z, ang, ['#ffb3d4', '#a6f0d8', '#ffe08a'][(j + 1 + k) % 3]);
    }
    { const [x, z] = blobPt(b, m + 0.065, 1, 6.6); parasol(x, 0.01, z, ['#ffb3d4', '#a6f0d8', '#c9b6f4'][(k + li) % 3]); }
    for (const e of [a - 0.06, c + 0.06]) { const [x, z] = blobPt(b, e, 1, 2.4); torch(x, z); }
  });
  if (p.tower !== null) buildTower(p, li);
  buildCascade(p, li);
  // grosses balles et bouées
  for (let i = 0; i < 3; i++) { const [x, z] = blobPt(b, i * 2.1 + li, rr(0.25, 0.55)); addBigBall('ballon', x, z, [0.85, 1.1, 1.35][i], p); }
  for (let i = 0; i < 2; i++) { const [x, z] = blobPt(b, i * 3.0 + 1.0 + li, rr(0.3, 0.6)); addBigBall('bouee', x, z, rr(0.95, 1.15), p); }
  return p;
}
function torch(x, z) {
  const fi = TORCHES.length;
  const light = addSoft(x, 2.2, z, '#ffa060', 1.6, 6, { flick: 0.35 });
  const t = { x, z, light, on: true, ph: Math.random() * 10 };
  TORCHES.push(t);
  destrAdd({ parts: [[new THREE.CylinderGeometry(0.045, 0.06, 1.9, 7), colorMat('#c9a27e'), M4(x, 0.95, z)], [new THREE.CylinderGeometry(0.14, 0.06, 0.24, 8, 1, true), colorMat('#8a6a5a', { side: THREE.DoubleSide }), M4(x, 1.98, z)],
    [new THREE.TorusGeometry(0.05, 0.012, 5, 10), MAT.black, M4(x, 1.2, z, Math.PI / 2)], [new THREE.TorusGeometry(0.05, 0.012, 5, 10), MAT.black, M4(x, 1.6, z, Math.PI / 2)]],
    x, y: 1.05, z, hx: 0.16, hy: 1.05, hz: 0.16, kind: 'bois', hp: 2, color: '#c9a27e', colBox: { r: 0.09 },
    onBreak: () => { t.on = false; light.on = false; }, onRestore: () => { t.on = true; light.on = true; } });
  t.fi = fi;
}
function buildTower(p, li) {
  const H = 6.6, NS = 22, DA = 0.349, RISE = H / 22.5;
  const [tx, tz] = blobPt(p, p.tower, 1, 6.6);
  const D = new V3(p.cx - tx, 0, p.cz - tz).normalize(), N = new V3(-D.z, 0, D.x);
  const aIn = Math.atan2(D.x, D.z);
  const a0 = aIn + Math.PI - (NS - 3.5) * DA, gapC = aIn + Math.PI, gapH = 3 * DA + 0.06;
  const pole = colorMat('#fff6fa'), stepMat = colorMat(['#ffb3d4', '#a6f0d8', '#c9b6f4'][li % 3]);
  B.add(new THREE.CylinderGeometry(0.36, 0.42, H + 1.2, 18), pole, M4(tx, (H + 1.2) / 2, tz));
  addCircle(tx, tz, 0.42, -1, H + 1.2);
  // escalier en colimaçon
  for (let i = 0; i < NS; i++) {
    const a = a0 + i * DA, h = (i + 1) * RISE;
    B.add(boxG(0.62, 0.1, 1.62), stepMat, M4(tx + Math.sin(a) * 1.25, h - 0.05, tz + Math.cos(a) * 1.25, 0, a, 0));
    addFloorRing(tx, tz, 0.4, 2.08, h, a + Math.PI, Math.PI - DA * 0.5 - 0.02);
    if (i % 2 === 0) B.add(new THREE.CylinderGeometry(0.02, 0.02, 0.95, 5), MAT.chrome, M4(tx + Math.sin(a) * 2.02, h + 0.47, tz + Math.cos(a) * 2.02));
    for (const da of [-0.5, 0, 0.5]) { const ar = a + da * DA; addCircle(tx + Math.sin(ar) * 2.06, tz + Math.cos(ar) * 2.06, 0.1, h - 0.35, h + 1.15); }
  }
  { const pts = []; for (let i = 0; i <= 60; i++) { const a = a0 + (i / 60) * (NS - 1) * DA, h = (1 + (i / 60) * (NS - 1)) * RISE + 0.95; pts.push(new V3(tx + Math.sin(a) * 2.02, h, tz + Math.cos(a) * 2.02)); } B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.03, 6), MAT.chrome, M4()); }
  // plateforme avec une ouverture au-dessus des dernières marches
  const plat = new THREE.CylinderGeometry(2.32, 2.32, 0.16, 40, 1, false, gapC + gapH, Math.PI * 2 - 2 * gapH);
  B.add(plat, stepMat, M4(tx, H - 0.08, tz));
  addFloorRing(tx, tz, 0.4, 2.32, H, gapC, gapH);
  // garde-corps (sauf l'escalier et le départ des toboggans)
  const sA = [aIn - 0.42, aIn + 0.42];
  const opening = (a) => { const d1 = Math.atan2(Math.sin(a - gapC), Math.cos(a - gapC)); if (Math.abs(d1) < gapH + 0.05) return true; for (const s of sA) if (Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s))) < 0.3) return true; return false; };
  const rail = [];
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2; if (opening(a)) { if (rail.length > 1) B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail.slice()), rail.length * 2, 0.035, 6), MAT.chrome, M4()); rail.length = 0; continue; }
    const x = tx + Math.sin(a) * 2.25, z = tz + Math.cos(a) * 2.25;
    rail.push(new V3(x, H + 1.0, z));
    if (i % 2 === 0) B.add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5), MAT.chrome, M4(x, H + 0.5, z));
    addCircle(x, z, 0.1, H - 0.3, H + 1.2);
  }
  if (rail.length > 1) B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), rail.length * 2, 0.035, 6), MAT.chrome, M4());
  // enseigne néon au sommet
  { const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.62), new THREE.MeshBasicMaterial({ map: neonTex(p.nom, ['#7ff0ff', '#ff6fd0', '#ffe27a'][li % 3], 1024, 150, 'bold 82px "VT323","Lucida Console",monospace'), color: HDR('#ffffff', 2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    sg.position.set(tx, H + 1.85, tz); sg.rotation.y = Math.atan2(N.x, N.z) + Math.PI / 2; world.add(sg); }
  addSoft(tx, H + 1.5, tz, '#ffd0f0', 1.5, 7);
  // deux toboggans : le serpent (sinueux) et la fusée (tremplin au bout)
  const P = (d, n, y) => new V3(tx + D.x * d + N.x * n, y, tz + D.z * d + N.z * n);
  const startOf = (a) => new V3(tx + Math.sin(a) * 2.18, H, tz + Math.cos(a) * 2.18);
  const defs = [
    { pts: [startOf(sA[1]), P(3.6, -2.4, H - 0.55), P(6.0, -4.2, H - 1.6), P(9.0, -4.0, H - 2.9), P(11.6, -1.8, H - 4.1), P(13.8, 0.6, H - 5.2), P(16.0, 1.6, 0.55)], col: '#ff8fcf', nom: 'serpent' },
    { pts: [startOf(sA[0]), P(4.2, 2.6, H - 1.3), P(7.6, 4.4, H - 3.3), P(10.6, 5.4, H - 5.1), P(12.8, 5.7, 0.62), P(14.3, 5.8, 1.0)], col: '#7ff0ff', nom: 'fusee' }
  ];
  const films = [];
  for (const sd of defs) {
    const curve = new THREE.CatmullRomCurve3(sd.pts, false, 'centripetal');
    const L = curve.getLength(), n = Math.max(12, Math.ceil(L / 0.4));
    const samples = [];
    for (let i = 0; i <= n; i++) { const u = i / n; samples.push({ p: curve.getPointAt(u), t: curve.getTangentAt(u).normalize() }); }
    const mat = cached('tob' + sd.col, () => std({ color: C(sd.col), roughness: 0.22, metalness: 0.05, envMapIntensity: 1.3, side: THREE.DoubleSide }));
    B.add(channelGeo(samples, 0.78, 1.95, 0), mat, M4(), true, true);
    films.push(channelGeo(samples, 0.74, 0.95, 0.03));
    for (let i = 0; i < n; i++) { const a = samples[i].p, c = samples[i + 1].p; addFloorSeg(a.x, a.y, a.z, c.x, c.y, c.z, 0.7, { slide: true, R: 0.78, tob: SLIDES.length }); }
    // piliers
    for (let i = 3; i < n; i += 6) {
      const c = samples[i].p; if (c.y < 1.6) continue;
      const pl = poolAt(c.x, c.z), base = pl ? -poolDepthAt(pl, c.x, c.z) : 0, hgt = c.y - 0.05 - base;
      B.add(new THREE.CylinderGeometry(0.09, 0.11, hgt, 8), pole, M4(c.x, base + hgt / 2, c.z));
      addCircle(c.x, c.z, 0.12, base - 1, c.y - 0.5);
    }
    const end = samples[n];
    SLIDES.push({ nom: sd.nom, end: end.p.clone(), dir: end.t.clone(), pool: p, start: samples[0].p.clone() });
  }
  const fm = new THREE.Mesh(mergeGeos(films.map((g) => { const ng = g.toNonIndexed(); g.dispose(); return ng; })), filmMat); fm.renderOrder = 4; world.add(fm);
  p.towerPos = { x: tx, z: tz, H };
}
function buildCascade(p, li) {
  const th = p.cascade, [ex, ez] = blobPt(p, th, 1, 0), D = new V3(p.cx - ex, 0, p.cz - ez).normalize(), N = new V3(-D.z, 0, D.x);
  const at = (d, n, y) => [ex + D.x * d + N.x * n, y, ez + D.z * d + N.z * n];
  // tas de gros rochers
  const big = [[-2.4, 0, 1.6, 1.7], [-2.2, -1.6, 1.3, 1.3], [-2.3, 1.7, 1.2, 1.2], [-3.4, 0.2, 2.2, 1.6], [-1.3, -1.0, 0.8, 1.0], [-1.3, 1.1, 0.9, 1.0], [-3.0, -1.5, 1.6, 1.1], [-3.1, 1.6, 1.7, 1.1]];
  for (const [d, n, h, s] of big) {
    const [x, y, z] = at(d, n, h * 0.45);
    ROCKS.push([li, M4(x, y, z, rr(-0.2, 0.2), rr(0, 6), rr(-0.2, 0.2), s * 1.2, h * 0.75, s), ROCK_COLS[(li + (d * 7 | 0)) % ROCK_COLS.length]]);
    addCircle(x, z, s * 0.95, -1, y + h * 0.6, W_ALL); addFloorCircle(x, z, s * 0.9, y + h * 0.66);
  }
  // nappe d'eau qui tombe dans le lagon
  const pts = [new V3(...at(-3.1, 0, 2.45)), new V3(...at(-2.3, 0, 2.3)), new V3(...at(-1.3, 0, 1.25)), new V3(...at(-0.2, 0, 0.25)), new V3(...at(0.6, 0, -0.12))];
  const curve = new THREE.CatmullRomCurve3(pts), samples = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, c = curve.getPointAt(u), t = curve.getTangentAt(u); samples.push({ p: c, t }); }
  const pos = [], uv = [], idx = [];
  samples.forEach((s, i) => { for (const k of [-1, 1]) { pos.push(s.p.x + N.x * k * 1.15, s.p.y, s.p.z + N.z * k * 1.15); uv.push(k < 0 ? 0 : 1, i * 0.22); } });
  for (let i = 0; i < samples.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const sheet = new THREE.Mesh(g, filmMat); sheet.renderOrder = 4; world.add(sheet);
  const foot = new V3(...at(0.75, 0, p.surf));
  CASCADES.push({ p, foot, N: N.clone(), t: 0 });
  addSoft(foot.x, 0.6, foot.z, '#bff8ff', 1.4, 5);
}
/* ---------- grosses balles et bouées ---------- */
function addBigBall(kind, x, z, s, pool) {
  const bouee = kind === 'bouee';
  BIGB.push({ kind, p: new V3(x, pool.surf + 0.2, z), v: new V3(), r: bouee ? 1.0 * s : s, rv: bouee ? 0.3 * s : s, s, q: new THREE.Quaternion(), yaw: rr(0, 6), ph: rr(0, 10), pool, idx: 0 });
}
LAGOONS_DEF.forEach(buildLagoon);
// un paquet de rochers par lagon ; les tirs ne testent les rochers que si le rayon passe près du lagon
const rockMat = std({ color: C('#ffffff'), roughness: 0.88, envMapIntensity: 0.6 });
LAGOONS.forEach((p, li) => {
  const mine = ROCKS.filter((r) => r[0] === li);
  const im = new THREE.InstancedMesh(rockGeo, rockMat, mine.length);
  mine.forEach(([, m, c], i) => { im.setMatrixAt(i, m); im.setColorAt(i, C(c)); });
  im.castShadow = true; im.receiveShadow = true; im.userData.surface = 'dur';
  const bs = new THREE.Sphere(new V3(p.cx, 0, p.cz), Math.max(p.ax, p.az) * 1.35 + 8);
  im.geometry = rockGeo; im.frustumCulled = false;
  im.raycast = function (rc, out) { if (!rc.ray.intersectsSphere(bs)) return; THREE.InstancedMesh.prototype.raycast.call(this, rc, out); };
  world.add(im); SHOOT.push(im);
});
const flameIM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.42, 8), torchFlameMat, TORCHES.length); flameIM.frustumCulled = false; world.add(flameIM);
const BB_BALLS = BIGB.filter((b) => b.kind === 'ballon'), BB_RINGS = BIGB.filter((b) => b.kind === 'bouee');
const ballIM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), std({ color: C('#ffffff'), map: T.beachBall, roughness: 0.3, envMapIntensity: 1.1 }), BB_BALLS.length);
const ringIM = new THREE.InstancedMesh(new THREE.TorusGeometry(0.7, 0.3, 14, 30).rotateX(Math.PI / 2), std({ color: C('#ffffff'), roughness: 0.32, envMapIntensity: 1.0 }), BB_RINGS.length);
BB_BALLS.forEach((b, i) => (b.idx = i)); BB_RINGS.forEach((b, i) => { b.idx = i; ringIM.setColorAt(i, C(['#ff8fcf', '#7ff0ff', '#ffe27a', '#c9b6f4', '#a6f0d8', '#ffb38a'][i % 6])); });
for (const im of [ballIM, ringIM]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(im); }
const _bq = new THREE.Quaternion(), _bm = new THREE.Matrix4(), _bs = new V3(), _ba = new V3();
function rayBigBalls(o, d, best, res) {
  for (const b of BIGB) { const t = raySphere(o, d, b.p.x, b.p.y, b.p.z, b.kind === 'bouee' ? b.r * 0.85 : b.r); if (t < best) { best = t; res.t = t; res.kind = 'grosseBalle'; res.bb = b; res.n.set(o.x + d.x * t - b.p.x, o.y + d.y * t - b.p.y, o.z + d.z * t - b.p.z).normalize(); } }
  return best;
}
function hitBigBall(b, dir, power) {
  b.v.x += dir.x * power; b.v.z += dir.z * power; b.v.y += Math.abs(dir.y) * power * 0.3 + power * 0.25;
  if (Math.random() < 0.6) sBoop(b.p.x, b.p.y, b.p.z, 0.7);
  if (b.p.y - b.rv < b.pool.surf + 0.1) for (let i = 0; i < 4; i++) spawnDrop(b.p.x + rnd(-0.5, 0.5), b.pool.surf + 0.05, b.p.z + rnd(-0.5, 0.5), rnd(-1.5, 1.5), rnd(1.5, 3.5), rnd(-1.5, 1.5), rnd(0.03, 0.06), 1.2);
}
// le joueur pousse les balles, et rebondit dessus quand il leur tombe dessus
function bigBallsPlayer(jump) {
  for (const b of BIGB) {
    const dx = b.p.x - P.pos.x, dz = b.p.z - P.pos.z, d = Math.hypot(dx, dz), top = b.p.y + b.rv;
    if (d < b.r * 0.82 && P.vel.y < 0 && P.pos.y > b.p.y + b.rv * 0.35 && P.pos.y < top + 0.35) {
      P.pos.y = top; P.vel.y = (b.kind === 'bouee' ? 7.5 : 9.5) + (jump ? 3.5 : 0); P.onGround = false;
      b.v.y -= 2.4; sBoing(P.vel.y); spawnRing(b.p.x, b.pool.surf + 0.02, b.p.z, b.r * 0.6, b.r * 2.2, 0.7, HDR('#ffd0f0', 1.2));
      continue;
    }
    const minD = b.r + P.radius;
    if (d < minD && d > 1e-3 && P.pos.y < top - 0.15 && P.pos.y + 1.7 > b.p.y - b.rv) {
      const nx = dx / d, nz = dz / d, rel = Math.max(0, P.vel.x * nx + P.vel.z * nz);
      b.v.x += nx * (rel * 0.9 + 1.2); b.v.z += nz * (rel * 0.9 + 1.2); b.v.y += 0.4;
      const push = minD - d; P.pos.x -= nx * push * 0.55; P.pos.z -= nz * push * 0.55; b.p.x += nx * push * 0.45; b.p.z += nz * push * 0.45;
      if (rel > 2 && Math.random() < 0.3) sBoop(b.p.x, b.p.y, b.p.z, 0.5);
    }
  }
}
function updateBigBalls(dt, pushers) {
  dt = Math.min(dt, 1 / 30);
  const t = clockU.value;
  for (const b of BIGB) {
    b.v.y -= 11 * dt;
    const pl = poolAt(b.p.x, b.p.z);
    if (pl) {
      const sub = clamp((pl.surf - (b.p.y - b.rv)) / (2 * b.rv), 0, 1);
      if (sub > 0) {
        b.v.y += 11 * dt * sub * (b.kind === 'bouee' ? 2.6 : 2.3);
        const dm = 1 - Math.min(1, dt * (0.5 + 1.6 * sub)); b.v.x *= dm; b.v.z *= dm; b.v.y *= 1 - Math.min(1, dt * 2.6 * sub);
        b.v.x += Math.sin(t * 0.1 + b.ph) * 0.1 * dt; b.v.z += Math.cos(t * 0.13 + b.ph * 2) * 0.1 * dt;
        if (Math.hypot(b.v.x, b.v.z) > 2.2 && Math.random() < dt * 5) spawnRipple(pl, b.p.x, b.p.z, 0.6);
      }
    }
    const ox = b.p.x, oz = b.p.z;
    b.p.addScaledVector(b.v, dt);
    // dans l'eau, la balle rebondit contre le bord
    if (pl && b.p.y - b.rv < 0.25 && !poolAt(b.p.x, b.p.z)) { b.p.x = ox; b.p.z = oz; poolClamp(pl, b.p, b.r * 0.7); b.v.x *= -0.45; b.v.z *= -0.45; }
    const gy = groundAt(b.p.x, b.p.z, b.p.y);
    if (b.p.y - b.rv < gy) { b.p.y = gy + b.rv; if (b.v.y < 0) b.v.y = b.v.y < -2.5 ? -b.v.y * 0.6 : 0; const f = 1 - Math.min(1, dt * 1.2); b.v.x *= f; b.v.z *= f; }
    if (collide(b.p, b.r * 0.9, b.p.y - b.rv, b.rv * 2, W_BALL)) { const vn = b.v.x * _hitN.x + b.v.z * _hitN.z; if (vn < 0) { b.v.x -= 1.6 * vn * _hitN.x; b.v.z -= 1.6 * vn * _hitN.z; } }
    b.p.x = clamp(b.p.x, BOUNDS.x0 + b.r, BOUNDS.x1 - b.r); b.p.z = clamp(b.p.z, BOUNDS.z0 + b.r, BOUNDS.z1 - b.r);
    const sp = Math.hypot(b.v.x, b.v.z);
    if (b.kind === 'ballon') { if (sp > 0.01) { _ba.set(b.v.z, 0, -b.v.x).normalize(); _bq.setFromAxisAngle(_ba, sp * dt / b.r); b.q.premultiply(_bq); } }
    else b.yaw += dt * (0.08 + sp * 0.25);
  }
  for (let i = 0; i < BIGB.length; i++) for (let j = i + 1; j < BIGB.length; j++) {
    const a = BIGB[i], c = BIGB[j], dx = c.p.x - a.p.x, dy = c.p.y - a.p.y, dz = c.p.z - a.p.z, d = Math.hypot(dx, dy, dz), m = a.r + c.r;
    if (d >= m || d < 1e-4) continue;
    const nx = dx / d, ny = dy / d, nz = dz / d, push = (m - d) / 2;
    a.p.x -= nx * push; a.p.y -= ny * push; a.p.z -= nz * push; c.p.x += nx * push; c.p.y += ny * push; c.p.z += nz * push;
    const rv = (c.v.x - a.v.x) * nx + (c.v.y - a.v.y) * ny + (c.v.z - a.v.z) * nz;
    if (rv < 0) { const j2 = -rv * 0.9; a.v.x -= nx * j2; a.v.y -= ny * j2; a.v.z -= nz * j2; c.v.x += nx * j2; c.v.y += ny * j2; c.v.z += nz * j2; }
  }
  if (pushers) for (const pu of pushers) {
    if (pu.local) continue;
    for (const b of BIGB) { const dx = b.p.x - pu.x, dz = b.p.z - pu.z, d = Math.hypot(dx, dz), m = b.r + (pu.r || 0.42); if (d < m && d > 1e-3 && pu.y < b.p.y + b.rv - 0.15 && pu.y + 1.7 > b.p.y - b.rv) { b.v.x += dx / d * 2 * dt * 30; b.v.z += dz / d * 2 * dt * 30; b.p.x += dx / d * (m - d) * 0.5; b.p.z += dz / d * (m - d) * 0.5; } }
  }
  for (const b of BIGB) {
    if (b.kind === 'ballon') { _bm.compose(b.p, b.q, _bs.set(b.r, b.r, b.r)); ballIM.setMatrixAt(b.idx, _bm); }
    else { _bq.setFromAxisAngle(UP, b.yaw); _bm.compose(b.p, _bq, _bs.set(b.s, b.s, b.s)); ringIM.setMatrixAt(b.idx, _bm); }
  }
  ballIM.instanceMatrix.needsUpdate = true; ringIM.instanceMatrix.needsUpdate = true;
}
let lagoonSnd = null;
function updateLagoons(dt) {
  const t = clockU.value, cam = camera.position;
  for (let i = 0; i < TORCHES.length; i++) {
    const tc = TORCHES[i];
    if (!tc.on) { flameIM.setMatrixAt(i, ZM4); continue; }
    const fl = 0.85 + 0.25 * Math.sin(t * 13 + tc.ph) * Math.sin(t * 7.7 + tc.ph * 2);
    _bm.compose(_bs.set(tc.x + Math.sin(t * 5 + tc.ph) * 0.02, 2.24 + fl * 0.06, tc.z), _bq.setFromAxisAngle(UP, t * 2 + tc.ph), _ba.set(1, fl, 1)); flameIM.setMatrixAt(i, _bm);
  }
  flameIM.instanceMatrix.needsUpdate = true;
  let near = 1e9;
  for (const c of CASCADES) {
    const d = Math.hypot(cam.x - c.foot.x, cam.z - c.foot.z); near = Math.min(near, d);
    if (d > 70) continue;
    c.t -= dt;
    if (c.t <= 0) { c.t = 0.12; const k = rnd(-1, 1); spawnPuff(_v3.set(c.foot.x + c.N.x * k, c.foot.y + 0.15, c.foot.z + c.N.z * k), C('#f2ffff'), rnd(0.4, 0.7), 0.9, 0.5, false); if (Math.random() < 0.4) spawnRipple(c.p, c.foot.x, c.foot.z, 0.8); }
    if (Math.random() < dt * 12) spawnDrop(c.foot.x + c.N.x * rnd(-1, 1), c.foot.y + 0.1, c.foot.z + c.N.z * rnd(-1, 1), rnd(-1, 1), rnd(1.5, 3.5), rnd(-1, 1), rnd(0.03, 0.06), 1.0);
  }
  for (const s of SLIDES) {
    if (Math.hypot(cam.x - s.end.x, cam.z - s.end.z) > 60) continue;
    if (Math.random() < dt * 8) spawnDrop(s.end.x + rnd(-0.3, 0.3), s.end.y + 0.1, s.end.z + rnd(-0.3, 0.3), s.dir.x * rnd(1.5, 3) + rnd(-0.4, 0.4), rnd(0.2, 1.2), s.dir.z * rnd(1.5, 3) + rnd(-0.4, 0.4), rnd(0.025, 0.05), 1.0);
  }
  // bruit doux de la cascade la plus proche
  if (AU.on) {
    if (!lagoonSnd) {
      const ctx = AU.ctx, src = ctx.createBufferSource(); src.buffer = AU.noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(AU.fx); src.start(); lagoonSnd = g;
    }
    lagoonSnd.gain.setTargetAtTime(0.16 * clamp(1 - near / 28, 0, 1) * (P.underwater ? 0.3 : 1), AU.ctx.currentTime, 0.3);
  }
}
