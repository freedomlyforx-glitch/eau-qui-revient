/* =========================================================
   Décor fixe : sol, rues, palissade, palmiers, réverbères, ciel
   ========================================================= */
const world = new THREE.Group(); scene.add(world);
const SHOOT = [];            // maillages touchables par les balles (lancer de rayon three)
const B = new Batch('bati');
const BF = new Batch('palmes');
const bushes = [];           // [x, y, z, taille, couleur]
const CROWNS = [];           // têtes de palmiers (balles smiley)
const matCache = {};
var VCMAT = std({ color: C('#ffffff'), vertexColors: true, roughness: 0.62 });
var VCMAT_SHINY = std({ color: C('#ffffff'), vertexColors: true, roughness: 0.3, metalness: 0.15, envMapIntensity: 1.0 });
function bake(m, shiny) { m.userData.bake = true; m.userData.shiny = !!shiny; return m; }
function cached(key, make) { return matCache[key] || (matCache[key] = make()); }
const MAT = {
  foundation: std({ color: C('#b8adc9'), map: T.stucco }),
  trim: std({ color: C('#f7edf4'), roughness: 0.6 }),
  concrete: std({ color: C('#e9dfe9'), map: T.concrete, roughness: 0.9 }),
  concreteFlat: std({ color: C('#e6dce8'), map: T.concrete, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  asphalt: std({ color: C('#ffffff'), map: T.asphalt, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  grass: std({ color: C('#ffffff'), map: T.grass, roughness: 0.95, envMapIntensity: 0.5 }),
  checker: std({ color: C('#e8dde6'), map: T.checker, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  paint: std({ color: C('#fff3c8'), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  paintW: std({ color: C('#fffafc'), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  pole: std({ color: C('#e9e2f5'), metalness: 0.4, roughness: 0.4 }),
  bulb: new THREE.MeshBasicMaterial({ color: HDR('#ffe1c8', 5) }),
  trunk: std({ color: C('#ffffff'), map: T.trunk, roughness: 0.9 }),
  trunkTop: std({ color: C('#a98a7e'), roughness: 0.95 }),
  frond: std({ color: C('#5aae9a'), map: T.frond, alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.75, envMapIntensity: 0.5 }),
  coconut: std({ color: C('#8a6a5a'), roughness: 0.8 }),
  fence: std({ color: C('#fff3f8'), roughness: 0.7 }),
  chrome: std({ color: C('#f4f0ff'), metalness: 1, roughness: 0.12, envMapIntensity: 1.5 }),
  rubber: std({ color: C('#2a2533'), roughness: 0.9 }),
  white: std({ color: C('#fffafc'), roughness: 0.5 }),
  flamingo: std({ color: C('#ff86bd'), roughness: 0.35 }),
  black: std({ color: C('#2b2236'), roughness: 0.6 }),
  gold: std({ color: C('#ffd99a'), metalness: 1, roughness: 0.25 }),
  headlight: new THREE.MeshBasicMaterial({ color: HDR('#fff1dc', 4) }),
  taillight: new THREE.MeshBasicMaterial({ color: HDR('#ff6fae', 3) }),
  amber: new THREE.MeshBasicMaterial({ color: HDR('#ffc070', 3) }),
  signStreet: std({ map: T.signStreet, roughness: 0.4 }),
  signAve: std({ map: T.signAve, roughness: 0.4 }),
  signRoad: std({ map: T.signRoad, roughness: 0.5 }),
  stripes: std({ map: T.stripes, roughness: 0.5 }),
  tvBody: std({ color: C('#efd9c9'), roughness: 0.5 }),
  tvScreen: new THREE.MeshBasicMaterial({ map: T.tv, color: HDR('#ffffff', 2.2) }),
  crt: new THREE.MeshBasicMaterial({ map: T.crt, color: HDR('#ffffff', 1.8) }),
  cushion: std({ color: C('#ffb3d4'), roughness: 0.8 }),
  umbrella: std({ color: C('#a6f0d8'), roughness: 0.7, side: THREE.DoubleSide }),
  glassDark: std({ color: C('#7564a3'), roughness: 0.05, metalness: 0.75, envMapIntensity: 1.4 }),
  wood: std({ color: C('#ffffff'), map: T.wood, roughness: 0.6 }),
  carpet: std({ color: C('#ffffff'), map: T.carpet, roughness: 0.95 }),
  lampShade: new THREE.MeshBasicMaterial({ color: HDR('#ffd9b8', 2.2) })
};
['white', 'black', 'flamingo', 'cushion', 'tvBody', 'trunkTop', 'coconut', 'rubber', 'pole'].forEach((k) => bake(MAT[k], k === 'white' || k === 'flamingo'));
MAT.frond.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.frond, alphaTest: 0.5, side: THREE.DoubleSide });
const PASTELS = ['#f7b4d0', '#a9e3cb', '#cbb6f4', '#ffc6a0', '#ffe68f', '#a9c8f4', '#ffb2a8', '#bfeaa6'];
const ROOFS = ['#ec9087', '#a39acb', '#e48f9f', '#86b9b4', '#f0a27d', '#9d97cf'];
const ACCENTS = ['#6cc6bf', '#f28aa8', '#8f86e0', '#f2b06a', '#73b3e8', '#e48ac8'];
const accentMat = (i) => cached('a' + i, () => bake(std({ color: C(ACCENTS[i % ACCENTS.length]), roughness: 0.5 })));
const colorMat = (h, o) => cached('c' + h + JSON.stringify(o || {}), () => { const m = std(Object.assign({ color: C(h), roughness: 0.7 }, o || {})); return (!o || (!o.side && !o.metalness && !o.emissive)) ? bake(m, o && o.roughness < 0.45) : m; });
const BUSH_COLORS = ['#7fc59a', '#6db892', '#9ad3a0', '#ff9cc8', '#c9a6f2', '#78c2a8'];


/* ---------- la ville : promenade en damier, place de la jetée, avenue ---------- */
MAT.planks = std({ color: C('#ffffff'), map: T.planks, normalMap: T.planksN, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.72 });
MAT.planksDeck = std({ color: C('#ffffff'), map: T.planks, normalMap: T.planksN, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.72, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function flat(x0, x1, z0, z1, y, mat, surf) { const m = new THREE.Mesh(flatG(x1 - x0, z1 - z0), mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; m.userData.surface = surf || 'dur'; world.add(m); SHOOT.push(m); return m; }
function sidewalk(x0, x1, z0, z1, top) { top = top || 0.12; B.add(boxG(x1 - x0, top, z1 - z0), MAT.concrete, M4((x0 + x1) / 2, top / 2, (z0 + z1) / 2), false, true); addFloorRect(x0, x1, z0, z1, top); }
flat(PROM.x0, PROM.x1, PROM.z0 + 1.6, PROM.z1, 0.02, MAT.checker);
B.add(flatG(PROM.x1 - PROM.x0, 1.6), MAT.planksDeck, M4((PROM.x0 + PROM.x1) / 2, 0.022, 0.8), false, true);
flat(-16, 16, PROM.z1, ROAD.z0, 0.02, MAT.checker);
flat(ROAD.x0, ROAD.x1, ROAD.z0, ROAD.z1, 0.021, MAT.asphalt, 'route');
for (let x = ROAD.x0 + 3; x < ROAD.x1 - 2; x += 6) B.add(flatG(3, 0.16), MAT.paint, M4(x, 0.03, (ROAD.z0 + ROAD.z1) / 2), false, true);
for (const [a, b] of [[ROAD.x0, -16], [16, ROAD.x1]]) sidewalk(a, b, ROAD.z0 - 1.6, ROAD.z0);
sidewalk(ROAD.x0, ROAD.x1, ROAD.z1, ROAD.z1 + 1.6);
// chemin pavé de la rampe et parvis de la villa
// nappe posée sur le relief (chemins, pelouses tondues)
function drape(x0, x1, z0, z1, mat, lift, surf) {
  const nx = Math.max(1, Math.round((x1 - x0) / 2)), nz = Math.max(1, Math.round((z1 - z0) / 2)), g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setXYZ(i, x, TH(x, z) + (lift || 0.03), z); uv.setXY(i, x, z); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.surface = surf || 'dur'; world.add(m); return m;
}
// (le chemin dallé de la rampe est peint directement dans le relief : voir 08t-terrain.js)
/* ---------- la digue : mur, garde-corps, escaliers vers le sable ---------- */
{
  const cuts = STAIRS.map((s) => [s - 2.6, s + 2.6]).sort((a, b) => a[0] - b[0]);
  let x = PROM.x0;
  const seg = (a, b) => {
    if (b - a < 0.2) return;
    B.add(boxB(a, b, -3.2, 0.02, -0.5, -0.02), MAT.concrete, null, true, true);
    addBox((a + b) / 2, -0.26, (b - a) / 2, 0.26, 0, -4, -0.06);
    // garde-corps blanc à lisses chromées (on peut l'enjamber d'un saut), ouvert devant la jetée
    for (const [ra, rb] of (a < PIER.x0 && b > PIER.x1 ? [[a, PIER.x0], [PIER.x1, b]] : [[a, b]])) {
      if (rb - ra < 0.5) continue;
      const n = Math.max(1, Math.round((rb - ra) / 2.2));
      for (let i = 0; i <= n; i++) B.add(boxG(0.09, 1.0, 0.09), MAT.white, M4(lerp(ra, rb, i / n), 0.5, -0.2));
      for (const y of [0.55, 0.98]) B.add(boxG(rb - ra, 0.05, 0.05), y > 0.9 ? MAT.chrome : MAT.white, M4((ra + rb) / 2, y, -0.2));
      addBox((ra + rb) / 2, -0.2, (rb - ra) / 2, 0.07, 0, 0.0, 0.95);
    }
  };
  for (const [a, b] of cuts) { seg(x, a); x = b; }
  seg(x, PROM.x1);
  for (const sx of STAIRS) {
    const base = TH(sx, -5.2), n = 7, dz = 5 / n;
    for (let k = 0; k < n; k++) { const top = lerp(0, base, (k + 1) / n) + 0.02; B.add(boxB(sx - 2.5, sx + 2.5, base - 0.4, top, -(k + 1) * dz, -k * dz), MAT.concrete, null, true, true); addFloorRect(sx - 2.5, sx + 2.5, -(k + 1) * dz, -k * dz, top); }
    for (const s of [-1, 1]) { B.add(boxB(sx + s * 2.5 - 0.1, sx + s * 2.5 + 0.1, base - 0.4, 0.02, -5, 0), MAT.concrete, null, true, true); }
  }
}
/* ---------- clôture blanche aux limites du rêve, côté terre ---------- */
{
  const post = (x, z, len, ry) => { const y = TH(x, z); B.add(boxG(len, 1.5, 0.08), MAT.fence, M4(x, y + 0.75, z, 0, ry, 0)); };
  for (let x = MAP.x0 + 2; x < MAP.x1; x += 4) post(x, MAP.z1 - 0.3, 4.05, 0);
  for (let z = 10; z < MAP.z1; z += 4) { post(MAP.x0 + 0.3, z, 4.05, Math.PI / 2); post(MAP.x1 - 0.3, z, 4.05, Math.PI / 2); }
}

/* ---------- palmiers ---------- */
const PALMS = [];
// le palmier dont le tronc passe près d'un point (pour qu'un tir dans le tronc le fasse trembler)
function palmNear(p) { for (const q of PALMS) { if (p.y < q.y0 - 0.2 || p.y > q.ty) continue; const t = (p.y - q.y0) / Math.max(0.1, q.ty - q.y0), ax = lerp(q.x, q.tx, t * t), az = lerp(q.z, q.tz, t * t); if (Math.hypot(p.x - ax, p.z - az) < 0.75) return q; } return null; }
function palm(x, z, h, lean, la, nF, y0) {
  y0 = y0 || 0;
  const pts = [], N = 9;
  for (let i = 0; i <= N; i++) { const t = i / N; const k = lean * t * t * h * 0.22; pts.push(new V3(x + Math.sin(la) * k, y0 + t * h, z + Math.cos(la) * k)); }
  for (let i = 0; i < N; i++) {
    const a = pts[i], c = pts[i + 1], len = a.distanceTo(c);
    const r0 = lerp(0.38, 0.22, i / N), r1 = lerp(0.38, 0.22, (i + 1) / N);
    const g = new THREE.CylinderGeometry(r1, r0, len * 1.03, 10, 1, true); scaleUV(g, 1, len / 1.3);
    const mid = a.clone().add(c).multiplyScalar(0.5), q = new THREE.Quaternion().setFromUnitVectors(UP, c.clone().sub(a).normalize());
    B.add(g, MAT.trunk, new THREE.Matrix4().compose(mid, q, new V3(1, 1, 1)));
  }
  const top = pts[N];
  B.add(new THREE.SphereGeometry(0.42, 10, 8), MAT.trunkTop, M4(top.x, top.y - 0.25, top.z, 0, 0, 0, 1, 1.6, 1));
  for (let i = 0; i < 5; i++) B.add(new THREE.SphereGeometry(0.13, 8, 6), MAT.coconut, M4(top.x + Math.cos(i * 1.3) * 0.32, top.y - 0.45 - (i % 2) * 0.12, top.z + Math.sin(i * 1.3) * 0.32), true, true);
  for (let i = 0; i < nF; i++) {
    const L = rr(3.2, 4.2), droop = rr(1.2, 2.3);
    const g = new THREE.PlaneGeometry(1.5, L, 2, 10);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const px = p.getX(k), l = p.getY(k) + L / 2, t = l / L; p.setXYZ(k, px, -droop * t * t + Math.abs(px) * 0.35, l); }
    g.computeVertexNormals();
    const elev = rr(-0.25, 0.75), az = i / nF * Math.PI * 2 + rr(-0.2, 0.2);
    BF.add(g, MAT.frond, M4(top.x, top.y, top.z, -elev, az, rr(-0.2, 0.2)), true, true, 'feuille');
  }
  addCircle(x, z, 0.4, y0 - 1, y0 + h);
  PALMS.push({ x, z, y0, tx: top.x, ty: top.y, tz: top.z, crown: CROWNS.length });
  CROWNS.push({ x: top.x, y: top.y - 0.4, z: top.z, i: CROWNS.length, cool: 0 });
  return top;
}
PALMS_DEF.forEach(([x, z], i) => palm(x, z, rr(11, 16), rr(0.4, 1.4), rr(0, Math.PI * 2), 12 + (i % 3), Math.max(TH(x, z), -1.6) - 0.1));

/* ---------- réverbères (lumière douce au sol, sans halo plaqué) ---------- */
const coneMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: HDR('#ffd2c6', 1.0) } },
  vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float vy = clamp(vUv.y, 0.0, 1.0); float edge = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0); float a = vy*vy*0.2*smoothstep(0.0,0.6,edge)*smoothstep(0.08,0.4,vy); gl_FragColor = vec4(uColor*a, 1.0); }',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
coneMat.userData.noShoot = true;
const LAMP_LIGHTS = [], LAMP_HEADS = [];
function lamp(x, z, side, alongX, tall) {
  const H = tall ? 8 : 6.2;
  B.add(new THREE.CylinderGeometry(0.07, 0.11, H, 10), MAT.pole, M4(x, H / 2, z));
  const heads = tall ? [-1, 1] : [side];
  for (const sd of heads) {
    const ox = alongX ? 0 : sd * 0.66, oz = alongX ? sd * 0.66 : 0, hx = alongX ? 0 : sd * 1.32, hz = alongX ? sd * 1.32 : 0;
    B.add(boxG(alongX ? 0.07 : 1.4, 0.07, alongX ? 1.4 : 0.07), MAT.pole, M4(x + ox, H - 0.08, z + oz));
    B.add(boxG(alongX ? 0.32 : 0.6, 0.17, alongX ? 0.6 : 0.32), MAT.pole, M4(x + hx, H - 0.18, z + hz));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.3, H - 1.2, 32, 1, true), coneMat);
    cone.position.set(x + hx, H - 0.3 - (H - 1.2) / 2, z + hz); world.add(cone);
    const light = addSoft(x + hx, H - 0.6, z + hz, '#ffcdb8', 2.2, 11);
    LAMP_LIGHTS.push(light);
    LAMP_HEADS.push({ id: LAMP_HEADS.length, x: x + hx, y: H - 0.2, z: z + hz, hx: alongX ? 0.17 : 0.31, hy: 0.13, hz: alongX ? 0.31 : 0.17, c: 1, s: 0, light, cone, alive: true, tDead: 0,
      bm: new THREE.Matrix4().compose(new V3(x + hx, H - 0.28, z + hz), new THREE.Quaternion(), new V3(alongX ? 0.24 : 0.48, 0.04, alongX ? 0.48 : 0.24)) });
  }
  addCircle(x, z, 0.2, -1, H);
}
LAMPS_DEF.forEach((l) => lamp(l.x, l.z, l.side, l.alongX));
// ampoules à part : on peut les faire éclater d'une balle
const bulbIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.bulb, LAMP_HEADS.length);
LAMP_HEADS.forEach((h) => bulbIM.setMatrixAt(h.id, h.bm)); bulbIM.frustumCulled = false; world.add(bulbIM);
const ZM4 = new THREE.Matrix4().makeScale(0, 0, 0);
function rayLamps(o, d, best, res) {
  for (const h of LAMP_HEADS) { if (!h.alive) continue; const t = rayOBB(o, d, h, best); if (t < best) { best = t; res.t = t; res.kind = 'lampe'; res.lamp = h; res.n.copy(_rn); } }
  return best;
}
function breakLamp(h, dir, fromNet) {
  if (!h.alive) return;
  h.alive = false; h.tDead = clockU.value; h.light.on = false; h.cone.visible = false;
  bulbIM.setMatrixAt(h.id, ZM4); bulbIM.instanceMatrix.needsUpdate = true;
  spawnShards(h.x, h.y - 0.1, h.z, 0, 0.45, 0.2, dir);
  for (let i = 0; i < 18; i++) spawnSpark(h.x, h.y - 0.1, h.z, rnd(-3, 3), rnd(-2, 2), rnd(-3, 3), rnd(0.4, 1));
  sGlass(h.x, h.y, h.z); sZap(h);
  if (!fromNet && NET.on) NET.send('lampe', { i: h.id });
}
function updateLamps() {
  const t = clockU.value;
  for (const h of LAMP_HEADS) {
    if (h.alive) continue;
    const dt = t - h.tDead;
    if (dt > 25) { h.alive = true; h.light.on = true; h.cone.visible = true; h.light.flick = 0; bulbIM.setMatrixAt(h.id, h.bm); bulbIM.instanceMatrix.needsUpdate = true; for (let i = 0; i < 8; i++) spawnSpark(h.x, h.y - 0.1, h.z, rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), 0.5); }
  }
}
/* ---------- voitures rétro (alarme quand on leur tire dessus) ---------- */
const CARS = [];
const hazardMat = new THREE.MeshBasicMaterial({ color: HDR('#ffb347', 5) });
function car(x, z, ang, color) {
  const base = M4(x, 0, z, 0, ang, 0);
  const P = (geo, mat, px, py, pz, rx, ry, rz, cast) => B.add(geo, mat, base.clone().multiply(M4(px, py, pz, rx, ry, rz)), cast !== false, true);
  const paint = cached('car' + color, () => std({ color: C(color), roughness: 0.25, metalness: 0.35, envMapIntensity: 1.3 }));
  P(boxG(1.86, 0.6, 4.7), paint, 0, 0.6, 0);
  P(boxG(1.88, 0.08, 4.72), MAT.chrome, 0, 0.72, 0);
  P(boxG(1.54, 0.5, 2.25), paint, 0, 1.15, -0.25);
  P(boxG(1.6, 0.34, 2.12), MAT.glassDark, 0, 1.13, -0.25);
  P(boxG(1.6, 0.07, 2.2), paint, 0, 1.43, -0.25);
  for (const s of [-1, 1]) {
    P(boxG(1.94, 0.18, 0.16), MAT.chrome, 0, 0.36, s * 2.38);
    for (const s2 of [-1, 1]) {
      P(new THREE.CylinderGeometry(0.35, 0.35, 0.26, 18), MAT.rubber, s2 * 0.86, 0.35, s * 1.45, 0, 0, Math.PI / 2);
      P(new THREE.CylinderGeometry(0.21, 0.21, 0.27, 16), MAT.white, s2 * 0.86, 0.35, s * 1.45, 0, 0, Math.PI / 2, false);
      P(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12), MAT.chrome, s2 * 0.86, 0.35, s * 1.45, 0, 0, Math.PI / 2, false);
    }
    P(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14), MAT.headlight, s * 0.6, 0.66, 2.36, Math.PI / 2, 0, 0, false);
    P(boxG(0.32, 0.1, 0.04), MAT.taillight, s * 0.62, 0.7, -2.36, 0, 0, 0, false);
  }
  addBox(x, z, 0.98, 2.4, ang, -1, 1.5);
  addFloorOBB(x, z, 0.9, 2.3, ang, 1.48);
  const fl = new THREE.Group(); fl.visible = false; world.add(fl);
  for (const [px, py, pz] of [[0.86, 0.6, 2.36], [-0.86, 0.6, 2.36], [0.86, 0.66, -2.37], [-0.86, 0.66, -2.37], [0.94, 0.62, 1.9], [-0.94, 0.62, 1.9]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), hazardMat); m.applyMatrix4(base.clone().multiply(M4(px, py, pz))); fl.add(m);
  }
  const lt = addSoft(x, 1.0, z, '#ffb347', 0, 5);
  CARS.push({ id: CARS.length, x, y: 0.78, z, hx: 0.97, hy: 0.78, hz: 2.4, c: Math.cos(ang), s: Math.sin(ang), alarm: 0, beep: 0, hi: false, fl, lt });
}
function rayCars(o, d, best, res) {
  for (const c of CARS) { const t = rayOBB(o, d, c, best); if (t < best) { best = t; res.t = t; res.kind = 'voiture'; res.car = c; res.n.copy(_rn); } }
  return best;
}
function hitCar(c, fromNet) { if (c.alarm <= 0) c.beep = 0; c.alarm = 8; if (!fromNet && NET.on) NET.send('voiture', { i: c.id }); }
function updateCars(dt) {
  for (const c of CARS) {
    if (c.alarm <= 0) continue;
    c.alarm -= dt;
    const on = c.alarm > 0 && (c.alarm * 2.6) % 1 < 0.5;
    c.fl.visible = on; c.lt.k = on ? 2.6 : 0;
    c.beep -= dt; if (c.beep <= 0 && c.alarm > 0) { c.beep = 0.3; c.hi = !c.hi; sAlarm(c, c.hi); }
    if (c.alarm <= 0) { c.fl.visible = false; c.lt.k = 0; }
  }
}
[[-52, 35.3, Math.PI / 2, '#9fe7d2'], [-20, 40.7, -Math.PI / 2, '#ffb0cf'], [38, 35.3, Math.PI / 2, '#a9c8ff'], [66, 40.7, -Math.PI / 2, '#ffe08a']].forEach((c) => car(c[0], c[1], c[2], c[3]));

/* ---------- flamants roses ---------- */
function flamingo(x, z, ang) {
  const base = M4(x, 0, z, 0, ang, 0), parts = [];
  const P = (geo, mat, px, py, pz, rx, ry, rz, sx, sy, sz) => parts.push([geo, mat, base.clone().multiply(M4(px, py, pz, rx, ry, rz, sx, sy, sz))]);
  P(new THREE.SphereGeometry(1, 14, 10), MAT.flamingo, 0, 0.72, 0, -0.25, 0, 0, 0.13, 0.12, 0.24);
  const curve = new THREE.CatmullRomCurve3([new V3(0, 0.76, 0.16), new V3(0, 0.95, 0.24), new V3(0, 1.08, 0.12), new V3(0, 1.18, 0.18)]);
  P(new THREE.TubeGeometry(curve, 12, 0.025, 6), MAT.flamingo, 0, 0, 0);
  P(new THREE.SphereGeometry(0.055, 10, 8), MAT.flamingo, 0, 1.2, 0.2);
  P(new THREE.ConeGeometry(0.022, 0.09, 6), MAT.black, 0, 1.17, 0.27, 2.2, 0, 0);
  for (const s of [-1, 1]) P(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 5), MAT.black, s * 0.04, 0.31, 0, 0, 0, s * 0.05);
  destrAdd({ parts, x, y: 0.64, z, hx: 0.16, hy: 0.64, hz: 0.28, ang, kind: 'plastique', hp: 2, color: '#ff86bd', colBox: { r: 0.16 } });
}
[[-48, 46, 1.2], [-47, 47.4, 2.2], [40, 46.5, -1.4], [70, 47, 0.4], [-24, 46, 3.0], [100, 34, 2.0], [-100, 40, 1], [-98.6, 41, 2.4]].forEach((f) => flamingo(f[0], f[1], f[2]));

function bench(x, z, a) {
  const base = M4(x, 0, z, 0, a, 0), parts = [];
  const P = (geo, mat, px, py, pz, rx) => parts.push([geo, mat, base.clone().multiply(M4(px, py, pz, rx || 0))]);
  for (let i = 0; i < 3; i++) P(boxG(1.8, 0.05, 0.12), accentMat(1), 0, 0.46, -0.16 + i * 0.16);
  for (let i = 0; i < 2; i++) P(boxG(1.8, 0.05, 0.12), accentMat(1), 0, 0.66 + i * 0.16, -0.3, -0.25);
  for (const s of [-1, 1]) P(boxG(0.06, 0.46, 0.5), MAT.pole, s * 0.8, 0.23, -0.05);
  destrAdd({ parts, x, y: 0.45, z, hx: 0.92, hy: 0.46, hz: 0.33, ang: a, kind: 'bois', hp: 5, color: ACCENTS[1], top: 0.49, topHz: 0.24 });
}
// (aucun banc à l'ouest de -66 : c'est le pied de la rampe, le sol y monte)
[-44, -16, 16, 44, 72, 108, 130].forEach((x) => bench(x, 3.4, Math.PI));
[[-10, 22, Math.PI / 2], [10, 26, -Math.PI / 2]].forEach((b) => bench(b[0], b[1], b[2]));


// buissons : le long de l'avenue, autour de la place, au pied des collines
for (let i = 0; i < 40; i++) { const x = rr(ROAD.x0, ROAD.x1); if (Math.abs(x) < 18) continue; bushes.push([x, 0.5, rr(30.4, 31.6), rr(0.5, 0.9), BUSH_COLORS[(R() * BUSH_COLORS.length) | 0]]); }
for (let i = 0; i < 60; i++) { const x = rr(MAP.x0 + 4, MAP.x1 - 4), z = rr(84, 90); bushes.push([x, TH(x, z) + 0.4, z, rr(0.7, 1.4), BUSH_COLORS[(R() * BUSH_COLORS.length) | 0]]); }
for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; bushes.push([Math.cos(a) * 2.6, 0.35, 24 + Math.sin(a) * 2.6, rr(0.4, 0.6), i % 2 ? '#ff9cc8' : '#c9a6f2']); }
/* ---------- zones d'ambiance ---------- */
addZone((p) => p.y > 11 ? clamp((p.y - 11) / 5, 0, 1) : 0, { fog: 0.0024, bloom: 0.7, expo: 1.08 });
addZone((p) => p.z < -60 ? clamp((-60 - p.z) / 30, 0, 1) : 0, { fog: 0.0036, bloom: 0.68, expo: 1.0 });

