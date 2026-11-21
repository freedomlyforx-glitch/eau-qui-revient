/* =========================================================
   Le front de mer : jetée, baraques foraines, phare, plage,
   fontaine de la place
   ========================================================= */
const DECK = 0.03;                                   // dessus des planches de la jetée
const FRONT = { stands: {}, beam: null, lantern: null, t: 0, jet: 0 };
const cylG = (r0, r1, h, n, open) => new THREE.CylinderGeometry(r0, r1, h, n || 10, 1, !!open);

/* ---------- la jetée ---------- */
(function buildPier() {
  const Q = PIER;
  B.add(boxB(Q.x0, Q.x1, -0.25, DECK, Q.z0, Q.z1 + 0.2), MAT.planks, null, true, true, 'bois');
  B.add(boxB(Q.ex0, Q.ex1, -0.25, DECK, Q.ez0, Q.ez1), MAT.planks, null, true, true, 'bois');
  addFloorRect(Q.x0, Q.x1, Q.z0, Q.z1 + 0.2, DECK, { bois: true });
  addFloorRect(Q.ex0, Q.ex1, Q.ez0, Q.ez1, DECK, { bois: true });
  // pilotis et traverses
  const pile = (x, z) => { const g = TH(x, z) - 0.8, h = -0.25 - g; B.add(cylG(0.26, 0.3, h, 9), MAT.trunk, M4(x, g + h / 2, z), true, true); };
  for (let z = -6; z > Q.z0; z -= 12) { pile(-6.3, z); pile(6.3, z); B.add(boxG(12.9, 0.2, 0.2), MAT.trunk, M4(0, -1.5, z)); B.add(boxG(13.4, 0.16, 0.16), MAT.trunk, M4(0, -0.95, z, 0, 0, 0.09)); }
  for (let x = -24; x <= 24; x += 12) for (let z = -124; z > Q.ez0; z -= 13) pile(x, z);
  for (const x of [-6.3, 6.3]) B.add(boxG(0.3, 0.34, 118), MAT.trunk, M4(x, -0.42, -59));
  // garde-corps
  kitRail(Q.x0 + 0.1, -0.5, Q.x0 + 0.1, Q.z0, DECK); kitRail(Q.x1 - 0.1, -0.5, Q.x1 - 0.1, Q.z0, DECK);
  kitRail(Q.ex0 + 0.1, Q.ez1, Q.x0, Q.ez1, DECK); kitRail(Q.x1, Q.ez1, Q.ex1 - 0.1, Q.ez1, DECK);
  kitRail(Q.ex0 + 0.1, Q.ez1, Q.ex0 + 0.1, Q.ez0, DECK); kitRail(Q.ex1 - 0.1, Q.ez1, Q.ex1 - 0.1, Q.ez0, DECK);
  kitRail(Q.ex0 + 0.1, Q.ez0 + 0.1, Q.ex1 - 0.1, Q.ez0 + 0.1, DECK);
  // mâts à lanterne et guirlandes (une lanterne sur deux se reflète dans la mer : des traînées nettes plutôt qu'un voile)
  const mast = (x, z, h, refl) => { B.add(cylG(0.045, 0.06, h, 8), MAT.white, M4(x, DECK + h / 2, z)); B.add(cylG(0.12, 0.07, 0.1, 10), MAT.gold, M4(x, DECK + h + 0.03, z)); lantern(x, DECK + h + 0.22, z, '#ffd9a0', 0.15, { halo: 2.5, hk: 1.15, glint: refl ? 0.95 : 0, gw: 1.1 }); };
  let k = 0;
  for (let z = -6; z >= -114; z -= 12, k++) {
    mast(-6.6, z, 4.2, k % 2 === 1); mast(6.6, z, 4.2, k % 2 === 0);
    if (k % 2 === 0) addSoft(0, 3.7, z, '#ffd2a0', 2.1, 11.5);
    // lampes sous le tablier, chaudes ou turquoise, et liseré de néon le long des planches
    if (k % 2 === 1) for (const sx of [-1, 1]) { const col = (k + (sx > 0 ? 2 : 0)) % 4 === 1 ? '#ffb86a' : '#6ff2e2'; B.add(boxG(0.16, 0.1, 0.16), MAT.trunk, M4(sx * 5.7, -0.56, z)); lantern(sx * 5.7, -0.72, z, col, 0.11, { halo: 1.5, hk: 0.9, glint: 1.05, gw: 1.5 }); }
    if (k % 2 === 0) { glint(-7.05, -0.1, z, '#ff6fc8', 1.0, 2.2); glint(7.05, -0.1, z, '#6feaff', 1.0, 2.2); }
    bulbString(-6.6, 4.2, z, 6.6, 4.2, z, 9, 0.55, k);
    if (z > -114) { bulbString(-6.6, 4.2, z, -6.6, 4.2, z - 12, 8, 0.4, k + 2); bulbString(6.6, 4.2, z, 6.6, 4.2, z - 12, 8, 0.4, k + 4); }
  }
  for (const [ax, az, bx, bz] of [[-26.5, -118.4, -26.5, -165.6], [26.5, -118.4, 26.5, -165.6], [-26.5, -165.6, 26.5, -165.6]]) {
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 11.8);
    for (let i = 0; i <= n; i++) { const x = lerp(ax, bx, i / n), z = lerp(az, bz, i / n); mast(x, z, 3.6, i % 2 === 0); if (i < n) bulbString(x, 3.6, z, lerp(ax, bx, (i + 1) / n), 3.6, lerp(az, bz, (i + 1) / n), 8, 0.4, i); }
  }
  B.add(boxG(0.05, 0.05, 117.6), neonMat('#ff7fcf'), M4(Q.x0 - 0.03, -0.1, -59.2)); B.add(boxG(0.05, 0.05, 117.6), neonMat('#7ff0ff'), M4(Q.x1 + 0.03, -0.1, -59.2));
  B.add(boxG(54.1, 0.05, 0.05), neonMat('#b98cff'), M4(0, -0.1, Q.ez0 - 0.03));
  // arche d'entrée
  for (const x of [-6.7, 6.7]) B.add(boxG(0.4, 5.4, 0.4), colorMat('#fff7ef'), M4(x, 2.7, -1.2), true, true);
  B.add(boxG(13.8, 1.5, 0.3), colorMat('#2e1f4a'), M4(0, 5.4, -1.2), true, true);
  kitSign('LA JETÉE DES RÊVES', '#ff8fcf', 0, 5.42, -1.03, 0, 11.5, 1.25, 3);
  kitSign('LA JETÉE DES RÊVES', '#7ff0ff', 0, 5.42, -1.37, PI, 11.5, 1.25, 3);
  bulbString(-6.7, 6.3, -1.2, 6.7, 6.3, -1.2, 16, 0, 1);
  addBox(-6.7, -1.2, 0.22, 0.22, 0, 0, 5.4); addBox(6.7, -1.2, 0.22, 0.22, 0, 0, 5.4);
  for (const s of [-1, 1]) { B.add(boxG(13.9, 0.045, 0.045), neonMat('#ff8fcf'), M4(0, 5.4 + s * 0.78, -1.02)); B.add(boxG(13.9, 0.045, 0.045), neonMat('#7ff0ff'), M4(0, 5.4 + s * 0.78, -1.38)); }
  glint(0, 5.4, -1.4, '#7ff0ff', 0.7, 3.2);
  // bancs face au large
  for (const z of [-92, -104]) { bench(-6.1, z, PI / 2); bench(6.1, z, -PI / 2); }
})();

/* ---------- une baraque : fond contre le garde-corps, comptoir côté allée ---------- */
function stand(nom, zc, side, titre, c1, c2, signCol) {
  const xb = side * 6.7, xf = side * 3.75, L = 5.2, H = 2.9, mx = (xb + xf) / 2, w = Math.abs(xb - xf);
  // murs en bardage peint (planches horizontales), le reste en bois laqué uni
  const wall = cached('stw' + c1, () => std({ color: C(c1), map: T.siding, roughness: 0.82 })), paleW = cached('stwp', () => std({ color: C('#fff7ef'), map: T.siding, roughness: 0.82 })), pale = colorMat('#fff7ef');
  const aw = cached('aw' + c1 + c2, () => std({ color: C('#ffffff'), map: stripeTex(c1, c2, 10), roughness: 0.8, side: THREE.DoubleSide }));
  // fond et côtés en panneaux qu'on peut démolir au tir (ils se relèvent tout seuls)
  kitWall('z', xb, zc - L / 2, zc + L / 2, DECK, H, [], wall, wall, side, 0.12);
  for (const s of [-1, 1]) kitWall('x', zc + s * L / 2, Math.min(xb, xf), Math.max(xb, xf), DECK, H, [], paleW, paleW, s, 0.12);
  B.add(boxG(0.5, 1.0, L), pale, M4(xf, DECK + 0.5, zc), true, true);
  B.add(boxG(0.62, 0.07, L + 0.1), colorMat(c2), M4(xf, DECK + 1.03, zc), true, true);
  B.add(boxG(w + 0.5, 0.14, L + 0.3), pale, M4(mx, DECK + H + 0.07, zc), true, true);
  B.add(boxG(1.7, 0.05, L + 0.4), aw, M4(xf - side * 0.75, DECK + H - 0.22, zc, 0, 0, -side * 0.34), true, true);
  B.add(boxG(0.1, 1.15, L - 0.2), colorMat('#2e1f4a'), M4(xf + side * 0.12, DECK + H + 0.72, zc));
  kitSign(titre, signCol, xf + side * 0.05, DECK + H + 0.72, zc, -side * PI / 2, L - 0.6, 0.95, 1.7);
  // cadre de néon autour de l'enseigne, liseré sous l'auvent, et le reflet de l'ensemble sur la mer
  { const nm = neonMat(signCol), xs = xf + side * 0.045, yc = DECK + H + 0.72;
    for (const s of [-1, 1]) { B.add(boxG(0.035, 0.035, L - 0.2), nm, M4(xs, yc + s * 0.56, zc)); B.add(boxG(0.035, 1.15, 0.035), nm, M4(xs, yc, zc + s * (L / 2 - 0.1))); }
    B.add(boxG(0.03, 0.03, L + 0.2), nm, M4(xf - side * 0.3, DECK + H + 0.11, zc));
    glint(xf, yc, zc, signCol, 1.1, 2.0); }
  bulbString(xf - side * 0.1, DECK + H + 1.42, zc - L / 2, xf - side * 0.1, DECK + H + 1.42, zc + L / 2, 11, 0, zc | 0);
  addBox(xf, zc, 0.3, L / 2, 0, DECK, 1.08);
  addSoft(mx, 2.35, zc, '#ffe2b0', 1.5, 6.5);
  return (FRONT.stands[nom] = { nom, x: xf, z: zc, side, xb, mx, L, H, ux: xf - side * 0.9 });
}
stand('canards', -20, -1, 'TIR AUX CANARDS', '#a9e3cb', '#ffe68f', '#ffd27a');
stand('boites', -36, -1, 'CHAMBOULE-TOUT', '#ffc6a0', '#f7b4d0', '#ff8fcf');
stand('paniers', -52, -1, 'LES PANIERS', '#a9c8f4', '#ffb2a8', '#7ff0ff');
stand('voyante', -68, -1, 'MADAME MARÉE', '#8f7ad6', '#3d2a6b', '#b98cff');
stand('glaces', -26, 1, 'GLACES', '#f7b4d0', '#fff7ef', '#ff8fcf');
stand('barbe', -44, 1, 'BARBE À PAPA', '#cbb6f4', '#ffd9ec', '#b98cff');
stand('guichet', -62, 1, 'GUICHET DES RECORDS', '#ffe68f', '#a9e3cb', '#ffd27a');

/* ---------- décors des baraques ---------- */
(function dressStands() {
  const S = FRONT.stands;
  // glaces : un cornet géant sur le toit, des bacs sur le comptoir
  { const s = S.glaces, y = DECK + s.H + 0.14;
    B.add(new THREE.ConeGeometry(0.55, 1.5, 14).rotateX(PI), colorMat('#f2c48a'), M4(s.mx, y + 0.75, s.z - 1.7), true, true);
    [['#ff9fc0', 0, 1.75], ['#a3f3dc', 0.12, 2.35], ['#fff3c4', -0.05, 2.85]].forEach(([c, o, h], i) => B.add(new THREE.SphereGeometry(0.5 - i * 0.07, 14, 10), colorMat(c, { roughness: 0.4 }), M4(s.mx + o, y + h, s.z - 1.7), true, true));
    PASTELS.slice(0, 6).forEach((c, i) => B.add(cylG(0.17, 0.15, 0.1, 12), colorMat(c, { roughness: 0.35 }), M4(s.x, DECK + 1.12, s.z - 1.5 + i * 0.6))); }
  // barbe à papa : des nuages roses sur leurs bâtons
  { const s = S.barbe;
    for (let i = 0; i < 5; i++) { const z = s.z - 1.6 + i * 0.8, c = ['#ffb7dc', '#c9b6ff', '#aee9ff'][i % 3];
      B.add(cylG(0.012, 0.012, 0.6, 6), MAT.white, M4(s.x, DECK + 1.36, z));
      B.add(new THREE.SphereGeometry(0.2, 10, 8), colorMat(c, { roughness: 1 }), M4(s.x, DECK + 1.72, z, 0, 0, 0, 1, 1.25, 1)); }
    B.add(cylG(0.5, 0.42, 0.5, 16), MAT.chrome, M4(s.mx + 0.4, DECK + 0.85, s.z)); B.add(new THREE.SphereGeometry(0.42, 12, 10), colorMat('#ffb7dc', { roughness: 1 }), M4(s.mx + 0.4, DECK + 1.3, s.z, 0, 0, 0, 1, 0.7, 1)); }
  // guichet : le tableau des records
  { const s = S.guichet; FRONT.board = { x: s.xb - 0.09, y: DECK + 1.75, z: s.z }; }
  // voyante : tentures, silhouette et boule de cristal
  { const s = S.voyante, drape = colorMat('#4a2f8a', { roughness: 0.95 });
    for (const dz of [-2.2, 2.2]) B.add(boxG(0.08, 2.0, 0.7), drape, M4(s.x + 0.32, DECK + 1.9, s.z + dz));
    B.add(new THREE.ConeGeometry(0.55, 1.5, 12), colorMat('#6b4bc0'), M4(s.mx - 0.5, DECK + 0.75, s.z), true, true);
    B.add(new THREE.SphereGeometry(0.26, 14, 10), colorMat('#f3d9c4'), M4(s.mx - 0.5, DECK + 1.72, s.z));
    B.add(new THREE.SphereGeometry(0.3, 14, 10), colorMat('#ff8fcf'), M4(s.mx - 0.5, DECK + 1.92, s.z, 0, 0, 0, 1.05, 0.62, 1.05));
    B.add(cylG(0.2, 0.26, 0.12, 14), MAT.gold, M4(s.x, DECK + 1.12, s.z));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), new THREE.MeshBasicMaterial({ color: HDR('#b98cff', 0.8) }));
    ball.position.set(s.x, DECK + 1.42, s.z); world.add(ball); FRONT.crystal = ball;
    FRONT.crystalL = addSoft(s.x, DECK + 1.5, s.z, '#b98cff', 1.6, 5); }
})();

/* ---------- le phare ---------- */
(function buildLighthouse() {
  const x = -147, z = -62, y = TH(x, z) - 0.4, cols = ['#fff7ef', '#ff9fc0'];
  for (let i = 0; i < 5; i++) B.add(cylG(2.4 - (i + 1) * 0.2, 2.4 - i * 0.2, 3.2, 22), colorMat(cols[i % 2]), M4(x, y + 1.6 + i * 3.2, z), true, true);
  B.add(cylG(2.2, 2.2, 0.2, 22), MAT.white, M4(x, y + 16.1, z), true, true);
  B.add(new THREE.TorusGeometry(2.1, 0.04, 6, 30).rotateX(PI / 2), MAT.chrome, M4(x, y + 17.1, z));
  for (let i = 0; i < 10; i++) B.add(cylG(0.03, 0.03, 0.9, 6), MAT.white, M4(x + Math.cos(i * PI / 5) * 2.1, y + 16.65, z + Math.sin(i * PI / 5) * 2.1));
  B.add(cylG(1.15, 1.15, 0.5, 14), colorMat('#2e1f4a'), M4(x, y + 16.4, z));
  B.add(new THREE.ConeGeometry(1.6, 1.5, 16), colorMat('#ff8fb8'), M4(x, y + 19.75, z), true, true);
  B.add(new THREE.SphereGeometry(0.2, 10, 8), MAT.gold, M4(x, y + 20.6, z));
  const glass = new THREE.Mesh(cylG(1.15, 1.15, 2.3, 14, true), kitGlass); glass.position.set(x, y + 17.85, z); world.add(glass);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: HDR('#fff1c0', 2) })); core.position.set(x, y + 17.8, z); world.add(core); FRONT.lantern = core;
  addCircle(x, z, 2.5, y, y + 16); addFloorCircle(x, z, 2.2, y + 16.2);
  const bm = new THREE.MeshBasicMaterial({ color: C('#fff1c0'), vertexColors: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const g = new THREE.Group(); g.position.set(x, y + 17.8, z);
  for (const s of [1, -1]) { const cg = cylG(0.25, 4.2, 95, 18, true).translate(0, -47.5, 0); { const n = cg.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = Math.pow(1 + cg.attributes.position.getY(i) / 95, 1.6); a[i * 3] = a[i * 3 + 1] = a[i * 3 + 2] = k; } cg.setAttribute('color', new THREE.BufferAttribute(a, 3)); } const c = new THREE.Mesh(cg.rotateZ(s * PI / 2), bm); c.rotation.z = -0.035 * s; c.renderOrder = 4; g.add(c); }
  world.add(g); FRONT.beam = g; FRONT.beamMat = bm;
  RESERVED.push({ x0: x - 4, x1: x + 4, z0: z - 4, z1: z + 4 });
})();

/* ---------- la plage ---------- */
(function buildBeach() {
  const ok = (x) => Math.abs(x) > 13;
  let i = 0;
  for (let x = -72; x <= 142; x += 14, i++) if (ok(x)) {
    const z = -9.5 + (i % 2) * 1.2; parasol(x, TH(x, z), z, PASTELS[i % PASTELS.length]);
    transat(x - 1.3, TH(x - 1.3, z - 0.4), z - 0.4, PI + 0.1, PASTELS[(i + 2) % 8]); transat(x + 1.3, TH(x + 1.3, z - 0.4), z - 0.4, PI - 0.1, PASTELS[(i + 5) % 8]);
  }
  for (let x = -64; x <= 136; x += 25, i++) if (ok(x)) { const z = -18.5; parasol(x, TH(x, z), z, PASTELS[(i + 3) % PASTELS.length]); transat(x + 1.4, TH(x + 1.4, z), z, PI, PASTELS[(i + 1) % 8]); }
  // planches de surf plantées contre la digue
  [[-50, 3], [-46, 2], [18, 4], [40, 3], [88, 2], [118, 3]].forEach(([x0, n], k) => { for (let j = 0; j < n; j++) { const x = x0 + j * 0.75, y = TH(x, -1.1);
    B.add(new THREE.SphereGeometry(1, 12, 10), colorMat(PASTELS[(k * 2 + j) % PASTELS.length], { roughness: 0.3 }), M4(x, y + 1.15, -0.75, -0.2, 0, 0, 0.27, 1.2, 0.045), true, true);
    B.add(boxG(0.05, 1.9, 0.012), MAT.white, M4(x, y + 1.15, -0.795, -0.2)); } });
  // poste de secours
  { const x = -38, z = -23, y = TH(x, z);
    for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) B.add(boxG(0.14, 2.6, 0.14), MAT.white, M4(x + dx, y + 1.1, z + dz), true, true);
    B.add(boxG(3.2, 0.14, 3.2), MAT.planks, M4(x, y + 2.4, z), true, true); addFloorRect(x - 1.6, x + 1.6, z - 1.6, z + 1.6, y + 2.47, { bois: true });
    B.add(boxG(2.2, 1.9, 1.6), colorMat('#ff9fc0'), M4(x, y + 3.42, z + 0.7), true, true); addBox(x, z + 0.7, 1.1, 0.8, 0, y + 2.4, y + 4.4);
    B.add(boxG(2.8, 0.12, 2.6), colorMat('#fff7ef'), M4(x, y + 4.5, z + 0.5, 0.12), true, true);
    kitSteps(x - 1.15, z - 1.6, 0, -0.42, 1.0, y - 0.3, y + 2.47, 7, MAT.planks);
    kitSign('SECOURS', '#7ff0ff', x, y + 4.0, z - 0.12, PI, 2, 0.5, 2.4); }
  // filet de volley
  { const x = 52, z = -24, y = TH(x, z);
    for (const s of [-1, 1]) B.add(cylG(0.05, 0.05, 2.7, 8), MAT.white, M4(x + s * 4.2, y + 1.3, z), true, true);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.95), std({ color: C('#ffffff'), transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
    net.position.set(x, y + 2.05, z); world.add(net); B.add(boxG(8.4, 0.05, 0.03), colorMat('#ff8fcf'), M4(x, y + 2.53, z)); }
})();

/* ---------- la fontaine de la place ---------- */
(function buildFountain() {
  const x = 0, z = 24;
  B.add(cylG(4.3, 4.4, 0.42, 40), colorMat('#fff7ef'), M4(x, 0.21, z), true, true);
  B.add(new THREE.TorusGeometry(4.15, 0.16, 8, 44).rotateX(PI / 2), colorMat('#ff9fc0'), M4(x, 0.45, z));
  const w = new THREE.Mesh(new THREE.CircleGeometry(4.0, 40).rotateX(-PI / 2), phys({ color: C('#8fe9ee'), roughness: 0.06, metalness: 0.25, envMapIntensity: 1.8, transparent: true, opacity: 0.92 }));
  w.position.set(x, 0.44, z); world.add(w);
  B.add(cylG(0.42, 0.6, 1.7, 14), colorMat('#fff7ef'), M4(x, 1.25, z), true, true);
  B.add(cylG(1.5, 0.5, 0.36, 22), colorMat('#cbb6f4'), M4(x, 2.2, z), true, true);
  B.add(cylG(0.2, 0.3, 0.9, 12), colorMat('#fff7ef'), M4(x, 2.8, z));
  B.add(new THREE.SphereGeometry(0.42, 16, 12), MAT.chrome, M4(x, 3.55, z), true, true);
  addFloorCircle(x, z, 4.35, 0.42); addCircle(x, z, 0.75, 0, 2.4);
  for (let i = 0; i < 18; i++) bulb(x + Math.cos(i * PI / 9) * 4.35, 0.5, z + Math.sin(i * PI / 9) * 4.35, i, 0.06);
  addSoft(x, 1.6, z, '#9fefff', 1.6, 9);
  RESERVED.push({ x0: -5, x1: 5, z0: 19, z1: 29 });
})();

function updateFront(dt) {
  updateNeons();
  FRONT.t += dt;
  const n = NIGHT.value;
  if (FRONT.beam) { FRONT.beam.rotation.y = FRONT.t * 0.42; FRONT.beam.visible = n > 0.05; FRONT.beamMat.opacity = 0.1 * n; FRONT.lantern.material.color.setScalar(0.6 + 2.6 * n).multiply(_fc); }
  if (FRONT.crystal) { const k = 1 + 0.35 * Math.sin(FRONT.t * 2.3) + (FRONT.glow || 0) * 3; FRONT.crystal.material.color.set('#b98cff').multiplyScalar(k * 0.62); FRONT.crystalL.k = FRONT.crystalL.base * k; FRONT.glow = Math.max(0, (FRONT.glow || 0) - dt * 0.6); }
  // jets de la fontaine quand on est sur la place
  const dx = camera.position.x, dz = camera.position.z - 24;
  if (dx * dx + dz * dz < 2500) {
    FRONT.jet += dt;
    while (FRONT.jet > 0.03) { FRONT.jet -= 0.03; const a = rnd(0, PI * 2), s = rnd(1.1, 1.7); spawnDrop(Math.cos(a) * 0.3, 3.75, 24 + Math.sin(a) * 0.3, Math.cos(a) * s, rnd(2.6, 3.4), Math.sin(a) * s, rnd(0.05, 0.09), 1.1); }
    if (Math.random() < dt * 5) { const a = rnd(0, PI * 2), r = rnd(1.6, 3.4); spawnRing(Math.cos(a) * r, 0.46, 24 + Math.sin(a) * r, 0.1, 0.7, 0.9, _fw); }
  }
}
const _fc = C('#fff1c0'), _fw = HDR('#ffffff', 1.2);
