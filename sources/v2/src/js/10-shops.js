/* =========================================================
   Centre commercial : bowling, disquaire, vidéo club
   ========================================================= */
const shopGlass = [];
const shopGlassMat = std({ color: C('#eaf7ff'), transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0.25, envMapIntensity: 1.7, side: THREE.DoubleSide, depthWrite: false });
const SGIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), shopGlassMat, 40); SGIM.count = 0; SGIM.frustumCulled = false; SGIM.renderOrder = 3; world.add(SGIM);
const SLIDERS = [], PINS = [], SPINNERS = [];
const FX = MALL.x0; // façade
function shopPane(z0, z1, y0, y1) {
  const w = z1 - z0, h = y1 - y0, zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
  const m = M4(FX, yc, zc, 0, -Math.PI / 2, 0, w, h, 1);
  const g = { id: shopGlass.length, im: SGIM, i: SGIM.count++, alive: true, mat: m, tDead: 0, w, h, x: FX, y: yc, z: zc, ang: -Math.PI / 2, shop: true };
  SGIM.setMatrixAt(g.i, m);
  g.col = addBox(FX, zc, 0.06, w / 2, 0, y0, y1);
  shopGlass.push(g);
  B.add(boxG(0.12, 0.12, w), MAT.chrome, M4(FX, y1 + 0.06, zc)); B.add(boxG(0.12, 0.1, w), MAT.chrome, M4(FX, y0 - 0.05, zc));
}
const stuccoFor = (col) => cached('st' + col, () => std({ color: C(col), map: T.stucco, roughness: 0.85 }));
for (const s of SHOPS) {
  const z0 = s.z0, z1 = s.z1, x1 = s.x1, h = s.h, wm = stuccoFor(s.col), L = z1 - z0, D = x1 - FX;
  // dalle, murs, toit
  B.add(boxG(D, 0.15, L), MAT.concrete, M4(FX + D / 2, 0.075, (z0 + z1) / 2), false, true);
  addFloorRect(FX, x1, z0, z1, 0.15);
  B.add(boxG(0.3, h, L + 0.3), wm, M4(x1, h / 2, (z0 + z1) / 2)); addBox(x1, (z0 + z1) / 2, 0.15, L / 2 + 0.15, 0, -1, h + 0.4);
  for (const zz of [z0, z1]) { B.add(boxG(D, h, 0.3), wm, M4(FX + D / 2, h / 2, zz)); addBox(FX + D / 2, zz, D / 2, 0.15, 0, -1, h + 0.4); }
  B.add(boxG(D + 0.6, 0.4, L + 0.6), wm, M4(FX + D / 2, h + 0.2, (z0 + z1) / 2));
  B.add(boxG(D + 0.4, 0.02, L + 0.2), cached('plafond', () => std({ color: C('#2e2350'), roughness: 0.9 })), M4(FX + D / 2, h - 0.01, (z0 + z1) / 2), false, false);
  addFloorRect(FX - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3, h + 0.4, { roof: true });
  const si = SHOPS.indexOf(s);
  for (const zz of [z0 - 0.15, z1 + 0.15]) { if (zz < z0 && si > 0) continue; if (zz > z1 && si === 1) continue; B.add(boxG(D + 0.6, 0.6, 0.15), wm, M4(FX + D / 2, h + 0.7, zz)); addBox(FX + D / 2, zz, D / 2 + 0.3, 0.08, 0, h + 0.4, h + 1.0); }
  B.add(boxG(0.15, 0.6, L + 0.6), wm, M4(x1 + 0.15, h + 0.7, (z0 + z1) / 2)); B.add(boxG(0.15, 0.6, L + 0.6), wm, M4(FX - 0.15, h + 0.7, (z0 + z1) / 2));
  addBox(x1 + 0.15, (z0 + z1) / 2, 0.08, L / 2 + 0.3, 0, h + 0.4, h + 1.0); addBox(FX - 0.15, (z0 + z1) / 2, 0.08, L / 2 + 0.3, 0, h + 0.4, h + 1.0);
  // façade : bandeau, piliers, vitrines, porte coulissante
  B.add(boxG(0.3, h - 3.2, L + 0.3), wm, M4(FX, 3.2 + (h - 3.2) / 2, (z0 + z1) / 2)); addBox(FX, (z0 + z1) / 2, 0.15, L / 2 + 0.15, 0, 3.15, h + 0.4);
  const dz0 = s.door - 1.25, dz1 = s.door + 1.25;
  const pil = [z0, dz0, dz1, z1];
  for (const pz of pil) { B.add(boxG(0.4, 3.2, 0.4), wm, M4(FX, 1.6, pz)); addBox(FX, pz, 0.2, 0.2, 0, -1, 3.2); }
  const runs = [[z0 + 0.2, dz0 - 0.2], [dz1 + 0.2, z1 - 0.2]];
  for (const [a, b2] of runs) { const n = Math.max(1, Math.round((b2 - a) / 3.2)); for (let k = 0; k < n; k++) shopPane(a + (b2 - a) * k / n + 0.04, a + (b2 - a) * (k + 1) / n - 0.04, 0.35, 3.05); }
  B.add(boxG(0.3, 0.2, 2.5), MAT.chrome, M4(FX, 3.1, s.door));
  const sl = { x: FX, z: s.door, open: 0, panes: [] };
  for (const sg of [-1, 1]) {
    const pane = new THREE.Group();
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.85), shopGlassMat); gl.rotation.y = -Math.PI / 2; gl.position.y = 1.58; pane.add(gl);
    const fr = new THREE.Mesh(mergeList([[boxB(-0.04, 0.04, 0.15, 3.0, -0.6, -0.54)], [boxB(-0.04, 0.04, 0.15, 3.0, 0.54, 0.6)], [boxB(-0.04, 0.04, 0.15, 0.25, -0.6, 0.6)], [boxB(-0.04, 0.04, 2.9, 3.0, -0.6, 0.6)]]), MAT.chrome); pane.add(fr);
    pane.position.set(FX + 0.05 * sg, 0, s.door + sg * 0.6); world.add(pane); sl.panes.push([pane, sg]);
  }
  sl.col = addBox(FX, s.door, 0.08, 1.2, 0, 0, 3.0);
  SLIDERS.push(sl);
  // auvent
  B.add(boxG(5.0, 0.22, L + 0.4), MAT.white, M4(FX - 2.5, 3.9, (z0 + z1) / 2)); addFloorRect(FX - 5.0, FX - 0.15, z0 - 0.2, z1 + 0.2, 4.01);
  addBox(FX - 5.0, (z0 + z1) / 2, 0.06, L / 2 + 0.2, 0, 3.79, 4.01).step = true;
  B.add(boxG(5.0, 0.04, L + 0.4), cached('soffite', () => std({ color: C('#ffe6f2'), roughness: 0.6 })), M4(FX - 2.5, 3.78, (z0 + z1) / 2), false, false);
  for (let zz = z0 + 1; zz <= z1 - 0.5; zz += 7.5) { B.add(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 10), MAT.white, M4(FX - 4.6, 1.9, zz)); addCircle(FX - 4.6, zz, 0.14, -1, 3.8); addSoft(FX - 2.4, 3.5, zz + 3, s.id === 'bowling' ? '#ff9fe0' : '#ffd0b0', 1.4, 6); }
  // enseigne néon
  const sw = Math.min(L - 2, 16), sh = Math.min(2.4, h - 4.3);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: neonTex(s.nom, s.id === 'bowling' ? '#ff5fd0' : s.id === 'disques' ? '#5ff7ff' : '#fff05f', 1024, 160, 'bold 96px "Brush Script MT","Segoe Script","Comic Sans MS",cursive'), color: HDR('#ffffff', 2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  neon.position.set(FX - 0.2, 4.15 + sh / 2, (z0 + z1) / 2); neon.rotation.y = -Math.PI / 2; world.add(neon);
  s.neon = neon;
  addSoft(FX - 2, 5.5, (z0 + z1) / 2, s.id === 'bowling' ? '#ff6fd8' : s.id === 'disques' ? '#6ff7ff' : '#fff27a', 1.6, 9, { flick: 0.08 });
  addZone((p) => (p.x > FX + 0.3 && p.x < x1 && p.z > z0 && p.z < z1 && p.y < h) ? 1 : 0, { fog: 0.0016, bloom: 0.9, expo: 1.0 });
}
// on passe d'un toit à l'autre : une dalle comble l'espace entre les boutiques, l'auvent devient continu
for (let i = 0; i < SHOPS.length - 1; i++) {
  const a = SHOPS[i], c = SHOPS[i + 1], hl = Math.min(a.h, c.h), xr = Math.min(a.x1, c.x1), za = a.z1 + (a.h > c.h ? 0.15 : 0.3), zb = c.z0 - 0.3, wm = stuccoFor(c.col);
  B.add(boxG(xr - FX + 0.6, 0.4, zb - za), wm, M4((FX - 0.3 + xr + 0.3) / 2, hl + 0.2, (za + zb) / 2));
  addFloorRect(FX - 0.3, xr + 0.3, za, zb, hl + 0.4);
  B.add(boxG(0.15, 0.6, zb - za), wm, M4(xr + 0.15, hl + 0.7, (za + zb) / 2)); B.add(boxG(0.15, 0.6, zb - za), wm, M4(FX - 0.15, hl + 0.7, (za + zb) / 2));
  addBox(xr + 0.15, (za + zb) / 2, 0.08, (zb - za) / 2, 0, hl + 0.4, hl + 1.0); addBox(FX - 0.15, (za + zb) / 2, 0.08, (zb - za) / 2, 0, hl + 0.4, hl + 1.0);
  const g0 = a.z1 + 0.2, g1 = c.z0 - 0.2;
  B.add(boxG(5.0, 0.22, g1 - g0), MAT.white, M4(FX - 2.5, 3.9, (g0 + g1) / 2)); B.add(boxG(5.0, 0.04, g1 - g0), cached('soffite', () => std({ color: C('#ffe6f2'), roughness: 0.6 })), M4(FX - 2.5, 3.78, (g0 + g1) / 2), false, false);
  addFloorRect(FX - 5.0, FX - 0.15, g0, g1, 4.01);
  B.add(boxG(0.3, hl + 0.4 - 3.2, g1 - g0), wm, M4(FX, 3.2 + (hl + 0.4 - 3.2) / 2, (g0 + g1) / 2)); addBox(FX, (g0 + g1) / 2, 0.15, (g1 - g0) / 2, 0, 3.15, hl + 0.4);
}
/* ---------- bowling ---------- */
{
  const s = SHOPS[0];
  const laneMat = std({ color: C('#ffffff'), map: T.lane, roughness: 0.16, envMapIntensity: 1.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const floorOff = (map, col) => std({ color: C(col || '#ffffff'), map, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  B.add(flatG(6, s.z1 - s.z0 - 0.3), cached('cosmic', () => floorOff(T.cosmic)), M4(FX + 3.15, 0.155, (s.z0 + s.z1) / 2), false, true);
  B.add(flatG(s.x1 - FX - 6.6, s.z1 - s.z0 - 0.3), cached('fondPistes', () => floorOff(null, '#2b2148')), M4((FX + 6.3 + s.x1) / 2, 0.155, (s.z0 + s.z1) / 2), false, true);
  const laneBody = cached('corpsPiste', () => std({ color: C('#e8c7a6'), roughness: 0.3 }));
  const gutter = cached('gouttiere', () => std({ color: C('#1c1530'), roughness: 0.35, metalness: 0.3 }));
  const capping = cached('separation', () => std({ color: C('#b9a2ff'), roughness: 0.3, metalness: 0.2 }));
  for (let k = 0; k <= 6; k++) B.add(boxG(14, 0.07, 0.2), capping, M4(131.2, 0.19, -39.35 - 0.85 + 1.7 * k), false, true);
  for (let k = 0; k < 6; k++) {
    const zc = -39.35 + 1.7 * k;
    const lg = new THREE.PlaneGeometry(1.06, 14); lg.rotateX(-Math.PI / 2); lg.rotateY(Math.PI / 2);
    B.add(boxG(14, 0.03, 1.06), laneBody, M4(131.2, 0.17, zc), false, true);
    B.add(lg, laneMat, M4(131.2, 0.186, zc), false, true);
    for (const sg of [-1, 1]) B.add(boxG(14, 0.01, 0.22), gutter, M4(131.2, 0.16, zc + sg * 0.64), false, true);
    // quilles
    const order = [[0, 0], [1, -0.5], [1, 0.5], [2, -1], [2, 0], [2, 1], [3, -1.5], [3, -0.5], [3, 0.5], [3, 1.5]];
    for (const [r, c] of order) PINS.push({ x0: 136.2 + r * 0.27, z0: zc + c * 0.3, x: 0, z: 0, fall: 0, dir: 0, t: 0, down: false, k });
    // retour des boules
    if (k % 2 === 0) {
      B.add(boxG(1.4, 0.7, 0.45), cached('retour', () => std({ color: C('#7b5cff'), roughness: 0.4 })), M4(122.2, 0.5, zc + 0.85));
      for (let b = 0; b < 3; b++) B.add(new THREE.SphereGeometry(0.11, 14, 10), cached('boule' + b, () => std({ color: C(['#ff5fa8', '#5ff7ff', '#ffe27a'][b]), roughness: 0.15, metalness: 0.2 })), M4(121.8 + b * 0.25, 0.95, zc + 0.85));
      addBox(122.2, zc + 0.85, 0.7, 0.23, 0, 0, 0.9);
    }
    // écrans des scores
    if (k % 2 === 0) { destrAdd({ parts: [[boxG(0.6, 0.5, 0.7), MAT.tvBody, M4(124.2, 3.2, zc + 0.85)], [planeG(0.56, 0.42).rotateY(-Math.PI / 2), MAT.crt, M4(123.89, 3.2, zc + 0.85)]], x: 124.2, y: 3.2, z: zc + 0.85, hx: 0.31, hy: 0.26, hz: 0.36, kind: 'ecran', hp: 3, color: '#efd9c9', col: false }); B.add(boxG(0.05, 1.3, 0.05), MAT.pole, M4(124.2, 4.1, zc + 0.85)); }
    // néons au plafond
    B.add(boxG(14, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: HDR(k % 2 ? '#5ff7ff' : '#ff5fd0', 3.5) }), M4(131.2, s.h - 0.5, zc), false, false);
  }
  // cache des quilles et étoiles
  B.add(boxG(0.4, 2.2, 11), cached('cache', () => std({ color: C('#231a4a'), roughness: 0.9 })), M4(138.6, 2.6, -34.25));
  for (let i = 0; i < 9; i++) B.add(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: HDR(['#ff5fd0', '#5ff7ff', '#fff05f'][i % 3], 3) }), M4(138.35, 2.2 + (i % 3) * 0.5, -39 + i * 1.2), false, false);
  addBox(138.6, -34.25, 0.25, 5.5, 0, 1.5, 3.7);
  // sièges et comptoir à chaussures
  for (let k = 0; k < 5; k++) destrAdd({ parts: [[boxG(0.7, 0.45, 0.7), accentMat(k), M4(119.6, 0.38, -39 + k * 2.2)], [boxG(0.7, 0.5, 0.12), accentMat(k), M4(119.3, 0.75, -39 + k * 2.2, 0, Math.PI / 2, 0)], [new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), MAT.chrome, M4(119.6, 0.08, -39 + k * 2.2)]],
    x: 119.6, y: 0.5, z: -39 + k * 2.2, hx: 0.36, hy: 0.5, hz: 0.36, kind: 'tissu', hp: 3, color: ACCENTS[k % ACCENTS.length], top: 0.61 });
  destrAdd({ parts: [[boxG(5, 1.1, 0.8), cached('comptoir', () => std({ color: C('#ff9fcd'), roughness: 0.4 })), M4(123, 0.7, -17)], [boxG(5.1, 0.06, 0.9), MAT.white, M4(123, 1.28, -17)]], x: 123, y: 0.65, z: -17, hx: 2.55, hy: 0.65, hz: 0.45, kind: 'bois', hp: 10, color: '#ff9fcd', top: 1.31 });
  const shoes = [[boxG(4.6, 1.8, 0.4), MAT.wood, M4(123, 1.0, -14.9)]];
  for (let i = 0; i < 18; i++) shoes.push([boxG(0.3, 0.14, 0.18), accentMat(i), M4(121 + (i % 6) * 0.7, 0.4 + Math.floor(i / 6) * 0.6, -15.2)]);
  destrAdd({ parts: shoes, x: 123, y: 1.0, z: -15.0, hx: 2.3, hy: 0.9, hz: 0.32, kind: 'bois', hp: 8, color: '#d9b48f', top: 1.9 });
  addSoft(126, 5, -34, '#ff6fd8', 2.2, 12); addSoft(132, 5, -34, '#6ff7ff', 2.2, 12); addSoft(122, 3, -18, '#ffd0b0', 1.6, 7);
  // quille géante sur le toit
  const prof = [[0, 0], [0.55, 0], [0.75, 0.6], [0.9, 1.6], [0.7, 2.6], [0.38, 3.4], [0.42, 4.0], [0.5, 4.6], [0.35, 5.2], [0, 5.4]].map(([r, y]) => new THREE.Vector2(r, y));
  const giant = new THREE.LatheGeometry(prof, 24);
  B.add(giant, MAT.white, M4(130, s.h + 0.4, -22));
  B.add(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 24, 1, true), new THREE.MeshBasicMaterial({ color: HDR('#ff4f8f', 2.5), side: THREE.DoubleSide }), M4(130, s.h + 0.4 + 3.75, -22), false, false);
  addCircle(130, -22, 0.9, s.h, s.h + 6);
}
const pinGeo = new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.06, 0.07], [0.06, 0.13], [0.035, 0.24], [0.026, 0.29], [0.04, 0.34], [0.03, 0.38], [0, 0.39]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
const pinIM = new THREE.InstancedMesh(pinGeo, std({ color: C('#fffafc'), roughness: 0.3, envMapIntensity: 1.2 }), PINS.length);
pinIM.castShadow = true; pinIM.frustumCulled = false; world.add(pinIM);
function pinMatrix(p) {
  _q.setFromAxisAngle(_pp.set(Math.sin(p.dir), 0, Math.cos(p.dir)).cross(UP).normalize(), -p.fall);
  return _m.compose(_ss.set(p.x0 + p.x, p.x0 > 136 ? 0.186 : 0.16, p.z0 + p.z), _q, _sc3.set(1, 1, 1));
}
PINS.forEach((p, i) => pinIM.setMatrixAt(i, pinMatrix(p)));
function knockPin(p, dir) {
  if (p.down) return;
  p.down = true; p.t = clockU.value; p.dir = Math.atan2(dir.x, dir.z) + rnd(-0.5, 0.5); p.vel = rnd(2.5, 4);
  sPin(p.x0, p.z0);
  for (const q of PINS) if (q !== p && !q.down && q.k === p.k && Math.hypot(q.x0 - p.x0, q.z0 - p.z0) < 0.45 && Math.random() < 0.75) setTimeout(() => knockPin(q, dir), 60 + Math.random() * 120);
}
function updatePins(dt) {
  let any = false;
  PINS.forEach((p, i) => {
    if (p.down) {
      if (p.fall < 1.5) { p.fall = Math.min(1.5, p.fall + dt * 6); p.x += Math.sin(p.dir) * p.vel * dt * 0.25; p.z += Math.cos(p.dir) * p.vel * dt * 0.25; any = true; pinIM.setMatrixAt(i, pinMatrix(p)); }
      if (clockU.value - p.t > 12) { p.down = false; p.fall = 0; p.x = 0; p.z = 0; any = true; pinIM.setMatrixAt(i, pinMatrix(p)); }
    }
  });
  if (any) pinIM.instanceMatrix.needsUpdate = true;
}
/* ---------- disquaire ---------- */
{
  const s = SHOPS[1];
  B.add(flatG(17.6, s.z1 - s.z0 - 0.3), MAT.checker, M4(FX + 9, 0.156, (s.z0 + s.z1) / 2), false, true);
  const sleeveMat = std({ map: T.sleeves, roughness: 0.6, side: THREE.DoubleSide });
  const sleeve = (i) => { const g = new THREE.PlaneGeometry(0.31, 0.31); const u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 2; const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.25, v0 + uv.getY(k) * 0.5); return g; };
  for (const bz of [-8, -3.5, 1]) {
    const parts = [[boxG(5, 0.8, 1.0), MAT.wood, M4(127, 0.55, bz)]];
    for (let i = 0; i < 26; i++) parts.push([sleeve((i * 3 + bz * 7) & 7), sleeveMat, M4(124.8 + i * 0.17, 1.1, bz + rnd(-0.12, 0.12), -0.35, Math.PI / 2, 0)]);
    destrAdd({ parts, x: 127, y: 0.65, z: bz, hx: 2.5, hy: 0.65, hz: 0.5, kind: 'bois', hp: 7, color: '#d9b48f', top: 0.95 });
  }
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) B.add(sleeve((r * 5 + i) & 7).scale(1.4, 1.4, 1), sleeveMat, M4(s.x1 - 0.17, 1.4 + r * 0.6, s.z0 + 1.2 + i * 1.2, 0, -Math.PI / 2, 0), false, false);
  // vitrine des baladeurs
  {
    const parts = [[boxG(1.0, 1.0, 4.0), MAT.white, M4(120.6, 0.65, -8)], [boxG(1.0, 0.5, 4.0), shopGlassMat, M4(120.6, 1.4, -8)]];
    for (let i = 0; i < 6; i++) {
      parts.push([boxG(0.14, 0.09, 0.2), cached('wk' + i, () => std({ color: C(['#ffe27a', '#7ff0ff', '#ff7fbf', '#b98cff', '#a3f3dc', '#ffd2b4'][i]), roughness: 0.35 })), M4(120.6, 1.22, -9.6 + i * 0.6)]);
      parts.push([new THREE.TorusGeometry(0.09, 0.012, 6, 16, Math.PI), MAT.black, M4(120.75, 1.25, -9.6 + i * 0.6, 0, Math.PI / 2, 0)]);
    }
    destrAdd({ parts, x: 120.6, y: 0.83, z: -8, hx: 0.5, hy: 0.83, hz: 2.0, kind: 'verre', hp: 5, color: '#e9f6ff', top: 1.65 });
  }
  // comptoir et platine
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), MAT.black); plat.position.set(133.5, 1.27, 1.0); world.add(plat); SPINNERS.push([plat, 3.5]);
  destrAdd({ parts: [[boxG(1.0, 1.1, 3.4), cached('comptoir2', () => std({ color: C('#7ff0ff'), roughness: 0.4 })), M4(133.5, 0.7, 1.6)], [boxG(0.45, 0.06, 0.45), MAT.wood, M4(133.5, 1.24, 1.0)]],
    x: 133.5, y: 0.65, z: 1.6, hx: 0.5, hy: 0.65, hz: 1.7, kind: 'bois', hp: 10, color: '#7ff0ff', top: 1.27, onBreak: () => { plat.visible = false; }, onRestore: () => { plat.visible = true; } });
  addSoft(124, 4.5, -4, '#ff9fe0', 1.8, 10); addSoft(131, 4.5, -4, '#ffd8b0', 1.6, 9);
  // vinyle géant qui tourne sur le toit
  const vg = new THREE.Group(); vg.position.set(128, s.h + 0.4 + 3.2, -4); world.add(vg);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.18, 48), std({ color: C('#1d1530'), roughness: 0.2, metalness: 0.3, envMapIntensity: 1.6 })); disc.rotation.z = Math.PI / 2; vg.add(disc);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 32), new THREE.MeshBasicMaterial({ color: HDR('#ff7fbf', 1.6) })); lab.rotation.z = Math.PI / 2; vg.add(lab);
  B.add(boxG(0.3, 3.4, 0.3), MAT.pole, M4(128, s.h + 0.4 + 1.6, -4));
  SPINNERS.push([vg, 0.6, 'x']);
}
/* ---------- vidéo club ---------- */
{
  const s = SHOPS[2];
  B.add(flatG(17.6, s.z1 - s.z0 - 0.3), cached('moquetteVideo', () => std({ color: C('#ffffff'), map: T.carpet, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), M4(FX + 9, 0.155, (s.z0 + s.z1) / 2), false, true);
  const n = 420, vhsIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.19, 0.03), std({ map: T.vhs, roughness: 0.5 }), n);
  let vi = 0; const cols = ['#ff5fa8', '#5f9bff', '#ffe27a', '#a3f3dc', '#b98cff', '#ff8f5f', '#2a1d45', '#ffffff'];
  for (const rz of [9.5, 13.2, 16.9]) {
    const mine = [];
    for (let sh = 0; sh < 4; sh++) for (let i = 0; i < 34 && vi < n; i++) for (const sd of [-1, 1]) { if (vi >= n) break; const m = M4(124.3 + i * 0.22 + rnd(-0.02, 0.02), 0.45 + sh * 0.45, rz + sd * 0.29, 0, sd > 0 ? 0 : Math.PI, 0); vhsIM.setMatrixAt(vi, m); vhsIM.setColorAt(vi, C(cols[(vi * 7 + sh) % cols.length])); mine.push([vi, m]); vi++; }
    destrAdd({ parts: [[boxG(8, 2.0, 0.5), MAT.wood, M4(128, 1.15, rz)]], x: 128, y: 1.15, z: rz, hx: 4.0, hy: 1.0, hz: 0.33, kind: 'bois', hp: 9, color: '#d9b48f', top: 2.15,
      onBreak: () => { for (const [k] of mine) vhsIM.setMatrixAt(k, ZM4); vhsIM.instanceMatrix.needsUpdate = true; spawnDebrisBox(128, 1.2, rz, 3.8, 0.8, 0.3, C('#ff7fbf'), 14, -1, null, 0.4); },
      onRestore: () => { for (const [k, m] of mine) vhsIM.setMatrixAt(k, m); vhsIM.instanceMatrix.needsUpdate = true; } });
  }
  vhsIM.count = vi; vhsIM.castShadow = true; world.add(vhsIM);
  // mur de télés
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const zc = 10.5 + c * 1.6, yc = 1.3 + r * 1.0; destrAdd({ parts: [[boxG(0.7, 0.85, 1.3), MAT.tvBody, M4(135.4, yc, zc)], [planeG(1.05, 0.72).rotateY(-Math.PI / 2), MAT.crt, M4(135.04, yc, zc)]], x: 135.4, y: yc, z: zc, hx: 0.36, hy: 0.43, hz: 0.66, kind: 'ecran', hp: 3, color: '#efd9c9', colBox: { y0: yc - 0.43, y1: yc + 0.43 } }); }
  B.add(boxG(0.7, 0.7, 4.6), MAT.wood, M4(135.4, 0.51, 12.1)); addBox(135.4, 12.1, 0.4, 2.4, 0, 0, 0.86);
  // comptoir, affiches
  destrAdd({ parts: [[boxG(1.0, 1.1, 3.4), cached('comptoir3', () => std({ color: C('#ffe27a'), roughness: 0.4 })), M4(121, 0.7, 19.6)], [boxG(0.4, 0.3, 0.3), MAT.black, M4(121, 1.4, 19.0)], [boxG(0.3, 0.03, 0.2), colorMat('#d9d4dc'), M4(121, 1.27, 20.2)]], x: 121, y: 0.75, z: 19.6, hx: 0.5, hy: 0.75, hz: 1.7, kind: 'bois', hp: 10, color: '#ffe27a', top: 1.25 });
  const films = [['NUIT DE NÉON', 'un film rêvé', '#ff5fa8', '#2a1d45', '#ffe27a'], ['PISCINE ÉTERNELLE', 'plongez', '#5ff7ff', '#3a2456', '#ff7fbf'], ['LES MOUTONS', 'arc-en-ciel', '#a3f3dc', '#5a4bd8', '#fff05f'], ['RETOUR À', 'LAS PALMAS', '#ffd2b4', '#7b5cff', '#ff5fa8']];
  films.forEach((f, i) => B.add(planeG(1.0, 1.5).rotateY(-Math.PI / 2), std({ map: posterTex(f[0], f[1], f[2], f[3], f[4]), roughness: 0.6 }), M4(s.x1 - 0.17, 2.4, 7.4 + i * 1.3), false, false));
  const loc = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), new THREE.MeshBasicMaterial({ map: neonTex('LOCATION 24 H', '#ff5fd0', 512, 100, 'bold 64px "VT323","Lucida Console",monospace'), color: HDR('#ffffff', 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  loc.position.set(121, 3.4, 21.8); loc.rotation.y = Math.PI; world.add(loc);
  addSoft(124, 4.5, 14, '#b98cff', 1.8, 10); addSoft(131, 4.5, 14, '#7ff0ff', 1.8, 10);
  // cassette vidéo géante
  B.add(boxG(5.2, 3.0, 0.9), MAT.black, M4(128, s.h + 0.4 + 1.6, 14));
  B.add(boxG(3.4, 1.2, 0.92), MAT.white, M4(128, s.h + 0.4 + 1.9, 14));
  for (const sx of [-0.8, 0.8]) B.add(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 20), MAT.black, M4(128 + sx, s.h + 0.4 + 1.9, 14, Math.PI / 2, 0, 0));
}
function updateShops(dt, players) {
  for (const sl of SLIDERS) {
    let near = false; for (const p of players) if (Math.abs(p.x - sl.x) < 3.2 && Math.abs(p.z - sl.z) < 2.4 && p.y < 3) near = true;
    const prev = sl.open; sl.open = damp(sl.open, near ? 1 : 0, 5, dt);
    for (const [pane, sg] of sl.panes) pane.position.z = sl.z + sg * (0.6 + sl.open * 1.15);
    sl.col.on = sl.open < 0.7;
    if (prev < 0.1 && sl.open >= 0.1 && near) sSlide(sl.x, sl.z);
  }
  for (const [o, sp, ax] of SPINNERS) { if (ax === 'x') o.rotation.y += dt * sp; else o.rotation.y += dt * sp; }
  updatePins(dt);
}
function rayShops(o, d, best, res) {
  for (const g of shopGlass) {
    if (!g.alive) continue;
    const t = rayOBB(o, d, { x: g.x, y: g.y, z: g.z, hx: 0.03, hy: g.h / 2, hz: g.w / 2, c: 1, s: 0 }, best);
    if (t < best) { best = t; res.t = t; res.kind = 'vitre'; res.glass = g; res.n.copy(_rn); }
  }
  for (let i = 0; i < PINS.length; i++) {
    const p = PINS[i]; if (p.down) continue;
    const t = raySphere(o, d, p.x0 + p.x, 0.38, p.z0 + p.z, 0.09);
    if (t < best) { best = t; res.t = t; res.kind = 'quille'; res.pin = p; res.n.set(-d.x, 0, -d.z).normalize(); }
  }
  return best;
}
