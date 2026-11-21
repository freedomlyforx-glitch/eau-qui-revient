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

/* ---------- sol percé par les piscines ---------- */
{
  const sh = new THREE.Shape();
  sh.moveTo(MAP.x0, -MAP.z1); sh.lineTo(MAP.x1, -MAP.z1); sh.lineTo(MAP.x1, -MAP.z0); sh.lineTo(MAP.x0, -MAP.z0); sh.closePath();
  for (const p of POOLS_DEF) { const h = new THREE.Path(); h.moveTo(p.x0, -p.z1); h.lineTo(p.x0, -p.z0); h.lineTo(p.x1, -p.z0); h.lineTo(p.x1, -p.z1); h.closePath(); sh.holes.push(h); }
  for (const b of LAGOONS_DEF) { const pts = blobPoly(b, 128), h = new THREE.Path(); h.moveTo(pts[0][0], -pts[0][1]); for (let i = 1; i < pts.length; i++) h.lineTo(pts[i][0], -pts[i][1]); h.closePath(); sh.holes.push(h); }
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(g, MAT.grass); ground.receiveShadow = true; ground.userData.surface = 'herbe';
  world.add(ground);
}
/* ---------- rues ---------- */
function roadRect(x0, x1, z0, z1, y) {
  const m = new THREE.Mesh(flatG(x1 - x0, z1 - z0), MAT.asphalt);
  m.position.set((x0 + x1) / 2, y || 0.02, (z0 + z1) / 2); m.receiveShadow = true; m.userData.surface = 'route';
  world.add(m); SHOOT.push(m); return m;
}
roadRect(MAIN.x0, MAIN.x1, MAIN.z0, MAIN.z1);
roadRect(AVE.x0, AVE.x1, AVE.z0, AVE.z1, 0.021);
roadRect(PARK.x0, PARK.x1, PARK.z0, PARK.z1, 0.022);
{
  const bg = new THREE.CircleGeometry(BULB.r, 72); scaleUV(bg, 28, 28); bg.rotateX(-Math.PI / 2);
  const bulb = new THREE.Mesh(bg, MAT.asphalt); bulb.position.set(BULB.x, 0.022, BULB.z); bulb.receiveShadow = true; bulb.userData.surface = 'route';
  world.add(bulb); SHOOT.push(bulb);
}
// marquages
for (let z = -66; z < 90; z += 6) { if (Math.abs(z) < 10) continue; B.add(flatG(0.16, 3), MAT.paint, M4(0, 0.03, z), false, true); }
for (let x = -86; x < 72; x += 6) { if (Math.abs(x) < 10) continue; B.add(flatG(3, 0.16), MAT.paint, M4(x, 0.03, 0), false, true); }
for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) {
  B.add(flatG(0.5, 3), MAT.paintW, M4(k * 1.25, 0.031, s * 9.5 - s * 1.0), false, true);
  B.add(flatG(3, 0.5), MAT.paintW, M4(s * 9.5 - s * 1.0, 0.031, k * 1.25), false, true);
}
for (let z = -42; z <= 26; z += 3.2) for (const x of [80, 92, 101]) { if (x === 92 && Math.abs(z + 6) < 5) continue; B.add(flatG(4.6, 0.12), MAT.paintW, M4(x, 0.032, z), false, true); }
// trottoirs et bordures
function sidewalk(x0, x1, z0, z1, top) {
  top = top || 0.12;
  B.add(boxG(x1 - x0, top, z1 - z0), MAT.concrete, M4((x0 + x1) / 2, top / 2, (z0 + z1) / 2), false, true);
  addFloorRect(x0, x1, z0, z1, top);
}
for (const s of [-1, 1]) {
  sidewalk(s > 0 ? 6 : -8, s > 0 ? 8 : -6, -72, -6); sidewalk(s > 0 ? 6 : -8, s > 0 ? 8 : -6, 6, 92);
  sidewalk(-90, -8, s > 0 ? 6 : -8, s > 0 ? 8 : -6); sidewalk(8, 72, s > 0 ? 6 : -8, s > 0 ? 8 : -6);
  B.add(boxG(0.16, 0.13, 66), MAT.white, M4(s * 6.05, 0.065, -39), false, true);
  B.add(boxG(0.16, 0.13, 86), MAT.white, M4(s * 6.05, 0.065, 49), false, true);
  B.add(boxG(84, 0.13, 0.16), MAT.white, M4(-48, 0.065, s * 6.05), false, true);
  B.add(boxG(66, 0.13, 0.16), MAT.white, M4(39, 0.065, s * 6.05), false, true);
}
{ // rond-point de l'impasse
  const ringG = new THREE.RingGeometry(BULB.r, BULB.r + 2, 72, 1, 1.5 * Math.PI + 0.52, 2 * Math.PI - 1.04);
  const uv = ringG.attributes.uv, p = ringG.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
  ringG.rotateX(-Math.PI / 2);
  B.add(ringG, MAT.concrete, M4(BULB.x, 0.12, BULB.z), false, true);
  addFloorRing(BULB.x, BULB.z, BULB.r, BULB.r + 2, 0.12, 0, 0.52);
  const curb = new THREE.CylinderGeometry(BULB.r, BULB.r, 0.13, 72, 1, true, 0.52, 2 * Math.PI - 1.04);
  curb.scale(-1, 1, 1);
  { const nn = curb.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i)); }
  B.add(scaleUV(curb, 88, 0.13), MAT.white, M4(BULB.x, 0.065, BULB.z), false, true);
  const isl = new THREE.CylinderGeometry(4, 4, 0.16, 48); scaleUV(isl, 8, 8);
  B.add(isl, MAT.grass, M4(BULB.x, 0.08, BULB.z), false, true);
  B.add(scaleUV(new THREE.CylinderGeometry(4.12, 4.12, 0.18, 48, 1, true), 26, 0.2), MAT.white, M4(BULB.x, 0.09, BULB.z), false, true);
  addFloorCircle(BULB.x, BULB.z, 4.1, 0.16);
}
// allée couverte du centre commercial
sidewalk(113, 118, -46, 24, 0.15);
B.add(boxG(0.16, 0.16, 70), MAT.white, M4(113, 0.08, -11), false, true);

/* ---------- palissade blanche tout autour du rêve ---------- */
{
  const sh = new THREE.Shape();
  sh.moveTo(-0.045, 0); sh.lineTo(0.045, 0); sh.lineTo(0.045, 0.95); sh.lineTo(0, 1.06); sh.lineTo(-0.045, 0.95); sh.closePath();
  const picket = new THREE.ExtrudeGeometry(sh, { depth: 0.026, bevelEnabled: false }); picket.translate(0, 0, -0.013);
  const runs = [[MAP.x0, MAP.z0, MAP.x0, MAP.z1], [MAP.x1, MAP.z0, MAP.x1, MAP.z1], [MAP.x0, MAP.z0, MAP.x1, MAP.z0], [MAP.x0, MAP.z1, MAP.x1, MAP.z1]];
  const mats = [];
  for (const [x0, z0, x1, z1] of runs) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.2), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const t = i / n; mats.push(M4(lerp(x0, x1, t), 0, lerp(z0, z1, t), 0, ang + Math.PI / 2, 0)); }
    for (const y of [0.32, 0.78]) B.add(boxG(0.06, 0.09, len), MAT.fence, M4((x0 + x1) / 2, y, (z0 + z1) / 2, 0, ang, 0), true, true);
  }
  const fence = new THREE.InstancedMesh(picket, MAT.fence, mats.length);
  mats.forEach((m, i) => fence.setMatrixAt(i, m));
  fence.castShadow = true; fence.receiveShadow = true; fence.userData.surface = 'dur';
  world.add(fence);
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
PALMS_DEF.forEach(([x, z], i) => palm(x, z, rr(11, 16), rr(0.4, 1.4), rr(0, Math.PI * 2), 12 + (i % 3)));
palm(BULB.x, BULB.z, 17, 0.6, 1.2, 14, 0.16);

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
PARK_LAMPS.forEach(([x, z]) => lamp(x, z, 1, false, true));
lamp(BULB.x + Math.sin(2.2) * 15.3, BULB.z + Math.cos(2.2) * 15.3, -1);
lamp(BULB.x + Math.sin(-2.6) * 15.3, BULB.z + Math.cos(-2.6) * 15.3, 1);
lamp(-74, -40, 1); lamp(-74, 40, 1); lamp(-100, -36, 1, true); lamp(-100, 30, -1, true);
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
[[80, -21.2, Math.PI / 2, '#9fe7d2'], [92, 4.4, -Math.PI / 2, '#ffb0cf'], [101, -31.6, Math.PI / 2, '#a9c8ff'], [80, 17.2, -Math.PI / 2, '#ffe08a']].forEach((c) => car(c[0], c[1], c[2], c[3]));

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
[[-12, 48.5, 1.2], [-11, 50, 2.2], [11.5, 13, -1.4], [-12.5, -31, 0.4], [12.4, -22, 3.0], [5, -77.5, 2.0], [-86, 30, 1], [-84.6, 29, 2.4], [40, 12, 0.3]].forEach((f) => flamingo(f[0], f[1], f[2]));

/* ---------- panneaux, barrière, télé sur la pelouse ---------- */
{
  B.add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), MAT.pole, M4(7.6, 1.6, 7.6));
  B.add(boxG(1.7, 0.32, 0.03), MAT.signStreet, M4(7.6, 3.05, 7.6, 0, Math.PI / 2, 0));
  B.add(boxG(1.7, 0.32, 0.03), MAT.signAve, M4(7.6, 2.72, 7.6, 0, 0, 0));
  addCircle(7.6, 7.6, 0.12, -1, 3.3);
  for (const s of [-1, 1]) {
    B.add(boxG(4.6, 0.32, 0.08), MAT.stripes, M4(s * 3.1, 0.95, 91.6));
    B.add(boxG(4.6, 0.32, 0.08), MAT.stripes, M4(s * 3.1, 0.45, 91.6));
    for (const k of [-1, 1]) B.add(boxG(0.1, 1.15, 0.5), MAT.white, M4(s * 3.1 + k * 2.0, 0.57, 91.6));
    B.add(new THREE.SphereGeometry(0.1, 10, 8), MAT.amber, M4(s * 3.1 + 1.8 * s, 1.22, 91.6), false, false);
  }
  B.add(boxG(2.2, 0.8, 0.05), MAT.signRoad, M4(0, 1.75, 91.62));
  for (const k of [-1, 1]) B.add(boxG(0.06, 1.4, 0.06), MAT.white, M4(k * 0.9, 0.7, 91.66));
  addBox(0, 91.6, 6, 0.4, 0, -1, 2.2);
  // télé qui grésille
  const tx = -12.2, tz = 12.5;
  B.add(boxG(0.9, 0.62, 0.6), MAT.white, M4(tx, 0.31, tz)); addBox(tx, tz, 0.45, 0.3, 0, -1, 0.62); addFloorOBB(tx, tz, 0.45, 0.3, 0, 0.62);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.44), MAT.tvScreen);
  scr.position.set(tx + Math.sin(0.5) * 0.305, 0.95, tz + Math.cos(0.5) * 0.305); scr.rotation.y = 0.5; world.add(scr);
  const tvl = addSoft(tx + 0.6, 1.0, tz + 0.9, '#9ff6ff', 1.2, 3.5, { flick: 0.6 });
  destrAdd({ parts: [[boxG(0.82, 0.62, 0.6), MAT.tvBody, M4(tx, 0.93, tz, 0, 0.5, 0)], [new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), MAT.black, M4(tx - 0.1, 1.45, tz, 0, 0, 0.4)], [new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), MAT.black, M4(tx + 0.1, 1.45, tz, 0, 0, -0.4)]],
    x: tx, y: 0.94, z: tz, hx: 0.42, hy: 0.32, hz: 0.32, ang: 0.5, kind: 'ecran', hp: 3, color: '#efd9c9', top: 1.24,
    onBreak: () => { scr.visible = false; tvl.on = false; }, onRestore: () => { scr.visible = true; tvl.on = true; } });
}
/* ---------- parcs : bancs, tables ---------- */
function bench(x, z, a) {
  const base = M4(x, 0, z, 0, a, 0), parts = [];
  const P = (geo, mat, px, py, pz, rx) => parts.push([geo, mat, base.clone().multiply(M4(px, py, pz, rx || 0))]);
  for (let i = 0; i < 3; i++) P(boxG(1.8, 0.05, 0.12), accentMat(1), 0, 0.46, -0.16 + i * 0.16);
  for (let i = 0; i < 2; i++) P(boxG(1.8, 0.05, 0.12), accentMat(1), 0, 0.66 + i * 0.16, -0.3, -0.25);
  for (const s of [-1, 1]) P(boxG(0.06, 0.46, 0.5), MAT.pole, s * 0.8, 0.23, -0.05);
  destrAdd({ parts, x, y: 0.45, z, hx: 0.92, hy: 0.46, hz: 0.33, ang: a, kind: 'bois', hp: 5, color: ACCENTS[1], top: 0.49, topHz: 0.24 });
}
[[-90, -24, 0], [-96, -52, 1.2], [-82, 54, Math.PI], [-102, 66, 2], [86, 26, Math.PI], [104, -44, 0]].forEach((b) => bench(b[0], b[1], b[2]));
// buissons des parcs et des bords
for (let i = 0; i < 46; i++) { const side = R() < 0.5 ? -1 : 1; const z = rr(MAP.z0 + 4, MAP.z1 - 4); bushes.push([side < 0 ? rr(MAP.x0 + 1.5, MAP.x0 + 4) : rr(MAP.x1 - 4, MAP.x1 - 1.5), 0.5, z, rr(0.8, 1.5), BUSH_COLORS[(R() * BUSH_COLORS.length) | 0]]); }
for (let i = 0; i < 30; i++) { const x = rr(MAP.x0 + 4, MAP.x1 - 4); const side = R() < 0.5; bushes.push([x, 0.5, side ? rr(MAP.z0 + 1.5, MAP.z0 + 4) : rr(MAP.z1 - 4, MAP.z1 - 1.5), rr(0.8, 1.5), BUSH_COLORS[(R() * BUSH_COLORS.length) | 0]]); }
for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; bushes.push([BULB.x + Math.cos(a) * 3.2, 0.35, BULB.z + Math.sin(a) * 3.2, rr(0.4, 0.6), i % 2 ? '#ff9cc8' : '#c9a6f2']); }
for (let i = 0; i < 18; i++) { const z = R() < 0.5 ? rr(-70, -16) : rr(48, 72); bushes.push([rr(-104, -76), 0.5, z, rr(0.6, 1.2), BUSH_COLORS[(R() * BUSH_COLORS.length) | 0]]); }

/* ---------- zones d'ambiance ---------- */
addZone((p) => p.x > 72 ? clamp((p.x - 72) / 10, 0, 1) : 0, { fog: 0.0034, bloom: 0.6, expo: 0.92 });
addZone((p) => p.x < -72 ? clamp((-72 - p.x) / 10, 0, 1) : 0, { fog: 0.0042, bloom: 0.55, expo: 1.08 });
addZone((p) => p.z < -70 && Math.abs(p.x) < 48 ? clamp((-70 - p.z) / 12, 0, 1) * clamp((48 - Math.abs(p.x)) / 12, 0, 1) : 0, { fog: 0.0105, bloom: 0.75, expo: 1.06 });
addZone((p) => p.y > 9 ? clamp((p.y - 9) / 4, 0, 1) : 0, { fog: 0.0028, bloom: 0.7, expo: 1.12 });
