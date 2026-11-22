/* =========================================================
   Manèges : la grande roue et le carrousel du bout de la jetée.
   Leur angle suit l'heure du rêve, donc tous les joueurs voient
   la même chose sans rien échanger sur le réseau.
   ========================================================= */
const WHEEL = { x: 0, z: -146, y: 18.4, R: 15, n: 12, ang: 0, w: 2 * PI / 82.5, bulbs: [], drop: 2.86 };
const CARO = { x: -16, z: -130, r: 3.6, n: 8, ang: 0, w: 2 * PI / 13.2, y: 0.33, note: 0, noteT: 0 };
const RIDES = { wheel: WHEEL, caro: CARO };
const vc = (geo, m4, hex) => vcol(prepGeo(geo, m4), hex);
const _rm4 = new THREE.Matrix4(), _rv = new V3(), _rq = new THREE.Quaternion(), _rs = new V3(1, 1, 1), _ry = new V3(0, 1, 0);

(function buildWheel() {
  const W = WHEEL, R = W.R;
  // pieds et moyeu
  for (const sz of [-1.5, 1.5]) for (const sx of [-1, 1]) {
    B.add(boxG(0.4, 19.9, 0.4), colorMat('#fff7ef'), M4(W.x + sx * 3.75, DECK + 9.15, W.z + sz, 0, 0, sx * 0.388), true, true);
    addCircle(W.x + sx * 7.3, W.z + sz, 0.45, 0, 2.2);
    B.add(boxG(1.2, 0.3, 1.2), colorMat('#ff9fc0'), M4(W.x + sx * 7.45, DECK + 0.15, W.z + sz), true, true);
  }
  B.add(cylG(0.55, 0.55, 3.6, 16).rotateX(PI / 2), colorMat('#ff9fc0'), M4(W.x, W.y, W.z), true, true);
  B.add(cylG(1.0, 1.0, 0.2, 20).rotateX(PI / 2), MAT.gold, M4(W.x, W.y, W.z + 1.5));
  // la roue elle-même : une seule maille qui tourne
  const gs = [];
  for (const s of [-1.12, 1.12]) {
    gs.push(vc(new THREE.TorusGeometry(R, 0.14, 6, 84), M4(0, 0, s), '#ff9fc0'), vc(new THREE.TorusGeometry(R * 0.6, 0.08, 6, 60), M4(0, 0, s), '#a9e3cb'), vc(new THREE.TorusGeometry(R * 0.22, 0.07, 6, 30), M4(0, 0, s), '#cbb6f4'));
    for (let i = 0; i < W.n; i++) gs.push(vc(boxG(0.09, R, 0.09), new THREE.Matrix4().makeRotationZ(i * 2 * PI / W.n).multiply(M4(0, R / 2, s)), '#fff7ef'));
  }
  for (let i = 0; i < W.n; i++) { const a = i * 2 * PI / W.n; gs.push(vc(cylG(0.06, 0.06, 2.3, 8).rotateX(PI / 2), M4(Math.sin(a) * R, -Math.cos(a) * R, 0), '#fff7ef')); }
  const wm = new THREE.Mesh(mergeGeos(gs), VCMAT); gs.forEach((g) => g.dispose());
  wm.position.set(W.x, W.y, W.z); wm.castShadow = true; world.add(wm); W.mesh = wm;
  // néons de la roue : jantes et rayons soulignés de lumière (une maille à part, qui tourne avec elle)
  { const ls = [];
    for (const s of [-1.27, 1.27]) {
      ls.push(vc(new THREE.TorusGeometry(R, 0.05, 5, 96), M4(0, 0, s), '#ff8fd0'), vc(new THREE.TorusGeometry(R * 0.6, 0.04, 5, 64), M4(0, 0, s), '#8ff6ff'), vc(new THREE.TorusGeometry(R * 0.22, 0.04, 5, 32), M4(0, 0, s), '#ffd27a'));
      for (let i = 0; i < W.n; i++) ls.push(vc(boxG(0.035, R * 0.76, 0.035), new THREE.Matrix4().makeRotationZ((i + 0.5) * 2 * PI / W.n).multiply(M4(0, R * 0.6, s * 0.93)), i % 2 ? '#c9b0ff' : '#ff9fd8'));
    }
    const nm = new THREE.MeshBasicMaterial({ vertexColors: true }); NEONS.push({ m: nm, c: C('#ffffff'), k: 0.85 });
    const lm = new THREE.Mesh(mergeGeos(ls), nm); ls.forEach((g) => g.dispose()); wm.add(lm); }
  glint(W.x, 8, W.z, '#ff8fd0', 0.45, 3.2); glint(W.x, 19, W.z, '#c9b0ff', 0.45, 3.2); glint(W.x, 31, W.z, '#8ff6ff', 0.4, 3.2);
  // nacelles : toujours droites, une couleur pastel chacune
  const ns = [vc(boxG(0.06, 0.75, 0.06), M4(0, -0.36, 0.72), '#ffffff'), vc(boxG(0.06, 0.75, 0.06), M4(0, -0.36, -0.72), '#ffffff'), vc(boxG(0.06, 0.06, 1.5), M4(0, -0.72, 0), '#ffffff'),
    vc(new THREE.ConeGeometry(1.2, 0.5, 10), M4(0, -0.78, 0), '#b9b9c4'), vc(boxG(1.5, 0.08, 1.5), M4(0, -2.9, 0), '#d8d8e0')];
  for (const [dx, dz] of [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]]) ns.push(vc(boxG(0.05, 1.3, 0.05), M4(dx, -1.67, dz), '#ffffff'));
  for (const s of [-1, 1]) { ns.push(vc(boxG(1.5, 0.62, 0.06), M4(0, -2.58, s * 0.72), '#ffffff')); ns.push(vc(boxG(0.06, 0.62, 1.5), M4(s * 0.72, -2.58, 0), '#ffffff')); }
  const im = new THREE.InstancedMesh(mergeGeos(ns), VCMAT, W.n); ns.forEach((g) => g.dispose());
  for (let i = 0; i < W.n; i++) im.setColorAt(i, C(PASTELS[i % PASTELS.length]));
  im.castShadow = true; im.frustumCulled = false; world.add(im); W.pods = im; STATIC_IM.push([im, 0, new THREE.Sphere(new V3(W.x, W.y, W.z), R + 5)]);
  for (let i = 0; i < 36; i++) W.bulbs.push(bulb(W.x, W.y, W.z + 1.3, i, 0.09));
  for (let i = 0; i < 12; i++) W.bulbs.push(bulb(W.x, W.y, W.z + 1.3, i + 2, 0.08));
  // portique d'embarquement
  for (const sx of [-1, 1]) { B.add(boxG(0.22, 3.4, 0.22), colorMat('#fff7ef'), M4(sx * 2.6, DECK + 1.7, -140.6), true, true); addCircle(sx * 2.6, -140.6, 0.2, 0, 3.4); }
  B.add(boxG(5.6, 0.9, 0.16), colorMat('#2e1f4a'), M4(0, DECK + 3.6, -140.6));
  kitSign('GRANDE ROUE', '#ffd27a', 0, DECK + 3.6, -140.5, 0, 5.2, 0.75, 3);
  addSoft(0, 2.6, -143.5, '#ffd9a0', 1.6, 8);
})();

(function buildCarousel() {
  const K = CARO, top = 4.3;
  B.add(cylG(5.3, 5.5, 0.3, 36), colorMat('#fff7ef'), M4(K.x, DECK + 0.15, K.z), true, true);
  B.add(new THREE.TorusGeometry(5.35, 0.09, 6, 40).rotateX(PI / 2), MAT.gold, M4(K.x, K.y, K.z));
  addFloorCircle(K.x, K.z, 5.4, K.y, { bois: true }); addCircle(K.x, K.z, 1.0, 0, 4);
  glint(K.x, 4.6, K.z, '#ffd9a0', 0.75, 2.6);
  const gs = [];
  const cone = new THREE.ConeGeometry(5.7, 1.9, 16, 1, true).toNonIndexed(), val = cylG(5.7, 5.7, 0.55, 16, true).toNonIndexed();
  for (const [g, y] of [[cone, top + 0.95], [val, top - 0.27]]) {
    const n = g.attributes.position.count, a = new Float32Array(n * 3), c1 = C('#ff9fc0'), c2 = C('#fff7ef');
    for (let i = 0; i < n; i++) { const c = Math.floor(i / 6) % 2 ? c1 : c2; a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.translate(0, y, 0); gs.push(g);
  }
  gs.push(vc(cylG(0.85, 0.95, top, 12), M4(0, top / 2, 0), '#cbb6f4'), vc(new THREE.SphereGeometry(0.4, 12, 10), M4(0, top + 2.1, 0), '#ffd27a'));
  for (let i = 0; i < 6; i++) gs.push(vc(boxG(0.5, 1.5, 0.04), new THREE.Matrix4().makeRotationY(i * PI / 3).multiply(M4(0, 2.1, 0.93)), '#eaf6ff'));
  for (let i = 0; i < K.n; i++) { const a = i * 2 * PI / K.n; gs.push(vc(cylG(0.03, 0.03, top, 6), M4(Math.cos(a) * K.r, top / 2, Math.sin(a) * K.r), '#ffe9a8')); }
  const cm = new THREE.Mesh(mergeGeos(gs), std({ color: C('#ffffff'), vertexColors: true, roughness: 0.5, side: THREE.DoubleSide })); gs.forEach((g) => g.dispose());
  cm.position.set(K.x, K.y, K.z); cm.castShadow = true; world.add(cm); K.mesh = cm;
  // montures : de petits chevaux-nuages (le nez vers +z dans leur repère)
  const hs = [vc(new THREE.SphereGeometry(1, 12, 9), M4(0, 0, 0, 0, 0, 0, 0.27, 0.27, 0.56), '#ffffff'), vc(cylG(0.11, 0.14, 0.5, 8), M4(0, 0.3, 0.42, 0.6), '#ffffff'),
    vc(new THREE.SphereGeometry(1, 10, 8), M4(0, 0.55, 0.62, 0, 0, 0, 0.15, 0.16, 0.24), '#ffffff'), vc(new THREE.SphereGeometry(0.15, 8, 6), M4(0, 0.12, -0.6), '#b9b9c4'),
    vc(new THREE.ConeGeometry(0.04, 0.14, 6), M4(0.08, 0.74, 0.55), '#b9b9c4'), vc(new THREE.ConeGeometry(0.04, 0.14, 6), M4(-0.08, 0.74, 0.55), '#b9b9c4'), vc(boxG(0.36, 0.05, 0.3), M4(0, 0.27, -0.05), '#8f8fa0')];
  for (const [dx, dz, rx] of [[-0.13, 0.3, 0.35], [0.13, 0.3, 0.35], [-0.13, -0.3, -0.3], [0.13, -0.3, -0.3]]) hs.push(vc(cylG(0.05, 0.04, 0.46, 6), M4(dx, -0.4, dz, rx), '#d8d8e0'));
  const hm = new THREE.InstancedMesh(mergeGeos(hs), VCMAT, K.n); hs.forEach((g) => g.dispose());
  for (let i = 0; i < K.n; i++) hm.setColorAt(i, C(PASTELS[(i * 3) % PASTELS.length]));
  hm.castShadow = true; hm.frustumCulled = false; world.add(hm); K.horses = hm; STATIC_IM.push([hm, 0, new THREE.Sphere(new V3(K.x, 2, K.z), K.r + 4)]);
  for (let i = 0; i < 16; i++) bulb(K.x + Math.cos(i * PI / 8) * 5.75, K.y + top - 0.62, K.z + Math.sin(i * PI / 8) * 5.75, i, 0.075);
  addSoft(K.x + 3, 3.2, K.z + 3, '#ffd9ec', 1.5, 8); addSoft(K.x - 3, 3.2, K.z - 3, '#ffe9a8', 1.5, 8);
})();

// position d'un siège (pieds du passager)
function wheelPivot(i, out) { const a = WHEEL.ang + i * 2 * PI / WHEEL.n; return out.set(WHEEL.x + Math.sin(a) * WHEEL.R, WHEEL.y - Math.cos(a) * WHEEL.R, WHEEL.z); }
function caroSeat(i, out) { const a = CARO.ang + i * 2 * PI / CARO.n; return out.set(CARO.x + Math.cos(a) * CARO.r, CARO.y + 1.05 + Math.sin(CARO.ang * 3 + i * 2.4) * 0.28, CARO.z + Math.sin(a) * CARO.r); }
function rideNear() {
  if (P.pos.y > 1.6 || P.pos.z > -118) return null;
  if (Math.abs(P.pos.x - WHEEL.x) < 3.6 && Math.abs(P.pos.z - WHEEL.z) < 6) return 'roue';
  if (Math.hypot(P.pos.x - CARO.x, P.pos.z - CARO.z) < 6.9) return 'manege';
  return null;
}
function boardRide(k) {
  let best = 0, bd = 1e9;
  if (k === 'roue') { for (let i = 0; i < WHEEL.n; i++) { const d = wheelPivot(i, _rv).y; if (d < bd) { bd = d; best = i; } } }
  else for (let i = 0; i < CARO.n; i++) { const d = caroSeat(i, _rv).distanceTo(P.pos); if (d < bd) { bd = d; best = i; } }
  P.ride = { k, i: best, t: 0 }; P.vel.set(0, 0, 0); P.slide = null; sPing();
  toast(k === 'roue' ? 'La grande roue t’emmène au-dessus de la mer' : 'Accroche-toi, ça tourne');
}
function leaveRide() {
  const r = P.ride; if (!r) return; P.ride = null;
  if (r.k === 'roue') P.pos.set(WHEEL.x + rnd(-1, 1), DECK, WHEEL.z + 4.4); else { const a = Math.atan2(P.pos.z - CARO.z, P.pos.x - CARO.x); P.pos.set(CARO.x + Math.cos(a) * 6.2, DECK, CARO.z + Math.sin(a) * 6.2); }
  P.vel.set(0, 0, 0); P.onGround = true;
}
function updateRide(dt) {
  const r = P.ride; r.t += dt;
  let eye = 1.25;
  if (r.k === 'roue') { wheelPivot(r.i, _rv); _rv.y -= WHEEL.drop; }
  else { caroSeat(r.i, _rv); _rv.y -= 0.55; P.yaw -= CARO.w * dt; eye = 1.45; }
  P.pos.copy(_rv); P.vel.set(0, 0, 0); P.onGround = true; P.swim = false; P.eyeY = _rv.y + eye;
  camera.position.set(_rv.x, P.eyeY, _rv.z); camera.rotation.set(P.pitch, P.yaw, 0);
  if (Math.abs(camera.fov - P.fov) > 0.01) { camera.fov = P.fov; camera.updateProjectionMatrix(); }
  return { sprint: false, moving: false, bobAmt: 0 };
}
const CARO_TUNE = [72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 84, 79, 77, 74, 71, 74, 72, 76, 79, 84, 81, 77, 74, 77, 76, 72, 74, 71, 72, 79, 76, 72];
function updateRides(dt) {
  const W = WHEEL, K = CARO;
  W.ang = TIME.t * W.w; K.ang = TIME.t * K.w;
  W.mesh.rotation.z = W.ang;
  for (let i = 0; i < W.n; i++) { wheelPivot(i, _rv); _rm4.makeTranslation(_rv.x, _rv.y, _rv.z); W.pods.setMatrixAt(i, _rm4); }
  W.pods.instanceMatrix.needsUpdate = true;
  if (BULBS.mesh) {
    for (let i = 0; i < 36; i++) { const a = W.ang + i * 2 * PI / 36; moveBulb(W.bulbs[i], W.x + Math.sin(a) * (W.R + 0.05), W.y - Math.cos(a) * (W.R + 0.05), W.z + 1.3); }
    for (let i = 0; i < 12; i++) { const a = W.ang + (i + 0.5) * 2 * PI / 12; moveBulb(W.bulbs[36 + i], W.x + Math.sin(a) * W.R * 0.6, W.y - Math.cos(a) * W.R * 0.6, W.z + 1.25); }
    BULBS.mesh.instanceMatrix.needsUpdate = true;
  }
  K.mesh.rotation.y = -K.ang;
  for (let i = 0; i < K.n; i++) {
    caroSeat(i, _rv); const a = K.ang + i * 2 * PI / K.n;
    _rq.setFromAxisAngle(_ry, -a); _rm4.compose(_rv, _rq, _rs); K.horses.setMatrixAt(i, _rm4);
  }
  K.horses.instanceMatrix.needsUpdate = true;
  // la boîte à musique du carrousel, seulement quand on est tout près
  const d2 = (camera.position.x - K.x) ** 2 + (camera.position.z - K.z) ** 2;
  if (AU.on && d2 < 900 && !JUKE.cur) {
    K.noteT -= dt;
    if (K.noteT <= 0) { K.noteT += 0.26; if (K.noteT < 0) K.noteT = 0.26; const m = CARO_TUNE[K.note++ % CARO_TUNE.length], t = now(), dst = spot(AU.fx, { x: K.x, y: 2, z: K.z }, 7);
      tone(dst, t, 'triangle', midi(m), midi(m), 0.34, 0.05, 0.005); if (K.note % 4 === 1) tone(dst, t, 'sine', midi(m - 24), midi(m - 24), 0.6, 0.06, 0.01); }
  }
}
