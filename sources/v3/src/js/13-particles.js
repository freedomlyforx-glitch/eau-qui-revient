/* =========================================================
   Particules : gouttes, étincelles, brumes, ondes, flaques, impacts,
   douilles, traçantes, gravats, éclats de verre, confettis, bulles
   ========================================================= */
const DUST = C('#efe1ee'), DUST_RING = HDR('#fff1f6', 0.9), MIST = HDR('#9feeff', 0.42);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const ZDIR = new V3(0, 0, 1);
const _m4 = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _sc = new V3();
/* gouttes */
const DROPS = IS_TOUCH ? 600 : 1000;
const dropMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std({ color: C('#86e2ff'), roughness: 0.05, metalness: 0.2, emissive: C('#1fb2ff'), emissiveIntensity: 0.5, envMapIntensity: 1.2 }), DROPS);
dropMesh.frustumCulled = false; dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(dropMesh);
const D = { p: new Float32Array(DROPS * 3), v: new Float32Array(DROPS * 3), life: new Float32Array(DROPS), size: new Float32Array(DROPS), kind: new Uint8Array(DROPS), alive: new Uint8Array(DROPS), next: 0 };
for (let i = 0; i < DROPS; i++) dropMesh.setMatrixAt(i, ZERO);
dropMesh.count = 0;
function spawnDrop(x, y, z, vx, vy, vz, size, life, kind) {
  const i = D.next; D.next = (i + 1) % DROPS; if (i + 1 > dropMesh.count) dropMesh.count = i + 1;
  D.p[i * 3] = x; D.p[i * 3 + 1] = y; D.p[i * 3 + 2] = z; D.v[i * 3] = vx; D.v[i * 3 + 1] = vy; D.v[i * 3 + 2] = vz;
  D.size[i] = size; D.life[i] = life; D.kind[i] = kind || 0; D.alive[i] = 1;
}
/* étincelles */
const SPARKS = 360;
const sparkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.018, 0.14), new THREE.MeshBasicMaterial({ color: C('#ffffff') }), SPARKS);
sparkMesh.frustumCulled = false; sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(sparkMesh);
const S = { p: new Float32Array(SPARKS * 3), v: new Float32Array(SPARKS * 3), life: new Float32Array(SPARKS), alive: new Uint8Array(SPARKS), next: 0 };
const SPARK_COLS = ['#ffc6e6', '#c6fbff', '#fff1c0', '#dccbff'].map((h) => HDR(h, 3.2));
for (let i = 0; i < SPARKS; i++) { sparkMesh.setMatrixAt(i, ZERO); sparkMesh.setColorAt(i, SPARK_COLS[i % 4]); }
function spawnSpark(x, y, z, vx, vy, vz, life) {
  const i = S.next; S.next = (i + 1) % SPARKS;
  S.p[i * 3] = x; S.p[i * 3 + 1] = y; S.p[i * 3 + 2] = z; S.v[i * 3] = vx; S.v[i * 3 + 1] = vy; S.v[i * 3 + 2] = vz; S.life[i] = life; S.alive[i] = 1;
}
/* brumes */
const puffs = [];
for (let i = 0; i < 64; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); puffs.push({ s, life: 0, max: 1, v: new V3(), size: 1 }); }
let puffI = 0;
function spawnPuff(p, color, size, life, vy, additive) {
  const o = puffs[puffI]; puffI = (puffI + 1) % puffs.length;
  o.s.position.copy(p); o.s.material.color.copy(color); o.s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  o.s.scale.setScalar(size); o.s.visible = true; o.life = life; o.max = life; o.size = size; o.v.set(rnd(-0.3, 0.3), vy, rnd(-0.3, 0.3)); o.s.material.rotation = rnd(0, 6);
}
/* ondes au sol */
const rings = [];
for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.ring, color: HDR('#c8fbff', 1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); m.visible = false; scene.add(m); rings.push({ m, life: 0, max: 1, r0: 0.2, r1: 2 }); }
let ringI = 0;
const RING_DEF = HDR('#c8fbff', 1.5);
function spawnRing(x, y, z, r0, r1, life, color) { const o = rings[ringI]; ringI = (ringI + 1) % rings.length; o.m.position.set(x, y, z); o.m.visible = true; o.life = life; o.max = life; o.r0 = r0; o.r1 = r1; o.m.material.color.copy(color || RING_DEF); }
/* flaques */
const puddles = [];
for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), std({ color: C('#6fbfe6'), roughness: 0.04, metalness: 0.45, envMapIntensity: 1.0, alphaMap: T.dot, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.visible = false; scene.add(m); puddles.push({ m, life: 0, max: 1 }); }
let puddleI = 0;
function spawnPuddle(x, y, z, r, life) { const o = puddles[puddleI]; puddleI = (puddleI + 1) % puddles.length; o.m.position.set(x, y + 0.008, z); o.m.scale.set(r * rnd(0.8, 1.2), 1, r * rnd(0.8, 1.2)); o.m.rotation.y = rnd(0, 6); o.m.visible = true; o.life = life; o.max = life; }
/* impacts */
const holeMat = new THREE.MeshBasicMaterial({ map: T.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const holes = [];
for (let i = 0; i < 120; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), holeMat); m.visible = false; scene.add(m); holes.push(m); }
let holeI = 0;
function spawnHole(p, n, s) { const m = holes[holeI]; holeI = (holeI + 1) % holes.length; m.position.copy(p).addScaledVector(n, 0.012); m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); m.rotateZ(rnd(0, 6)); const k = (s || 1) * rnd(0.8, 1.3); m.scale.set(k, k, k); m.visible = true; }
/* douilles */
const SHELLS = 80;
const shellMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.024, 8), std({ color: C('#ffd38f'), metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }), SHELLS);
shellMesh.frustumCulled = false; shellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(shellMesh);
const SH = []; for (let i = 0; i < SHELLS; i++) { SH.push({ p: new V3(), v: new V3(), q: new THREE.Quaternion(), w: new V3(), life: 0, bounced: false, s: 1 }); shellMesh.setMatrixAt(i, ZERO); }
let shellI = 0;
function spawnShell(p, v, s) { const o = SH[shellI]; shellI = (shellI + 1) % SHELLS; o.p.copy(p); o.v.copy(v); o.w.set(rnd(-25, 25), rnd(-25, 25), rnd(-25, 25)); o.q.setFromEuler(_e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))); o.life = 2.6; o.bounced = false; o.s = s || 1; }
/* traçantes */
const tracers = [];
for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: HDR('#ffe3f2', 5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); tracers.push({ m, a: new V3(), b: new V3(), t: 0, len: 0, dist: 0, w: 0.02, sp: 420 }); }
let tracerI = 0;
function spawnTracer(a, b, color, width, speed) {
  const tr = tracers[tracerI]; tracerI = (tracerI + 1) % tracers.length;
  tr.a.copy(a); tr.b.copy(b); tr.dist = a.distanceTo(b); tr.len = Math.min(width > 0.03 ? 12 : 5, tr.dist * 0.5); tr.t = 0; tr.m.visible = tr.dist > 1.2; tr.w = width || 0.02; tr.sp = speed || 420;
  tr.m.material.color.copy(color || (Math.random() < 0.5 ? HDR('#ffd6ec', 5) : HDR('#c9fbff', 5)));
}
/* gravats */
const NDEB = Q.debris;
const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std({ color: C('#ffffff'), map: T.stucco, roughness: 0.9 }), NDEB);
debMesh.castShadow = true; debMesh.receiveShadow = true; debMesh.frustumCulled = false; debMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(debMesh);
const DB = []; for (let i = 0; i < NDEB; i++) { DB.push({ p: new V3(), v: new V3(), q: new THREE.Quaternion(), w: new V3(), s: new V3(), on: false, sleep: false, life: 0, owner: -1, sink: 0 }); debMesh.setMatrixAt(i, ZERO); debMesh.setColorAt(i, C('#ffffff')); }
let debI = 0, debDirty = false;
function spawnDebris(x, y, z, ang, color, n, owner, dir, spread) {
  spread = spread || 1;
  for (let k = 0; k < n; k++) {
    const d = DB[debI]; const idx = debI; debI = (debI + 1) % NDEB;
    d.on = true; d.sleep = false; d.life = 45; d.owner = owner; d.sink = 0;
    d.p.set(x + rnd(-0.7, 0.7) * spread, y + rnd(-1.2, 1.2), z + rnd(-0.7, 0.7) * spread);
    d.v.set(rnd(-2, 2), rnd(0.5, 4), rnd(-2, 2)); if (dir) d.v.addScaledVector(dir, rnd(1.5, 4));
    d.w.set(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)); d.q.setFromEuler(_e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)));
    d.s.set(rnd(0.18, 0.5), rnd(0.12, 0.35), rnd(0.08, 0.2));
    debMesh.setColorAt(idx, _c1.copy(color).offsetHSL(0, 0, rnd(-0.06, 0.04)));
  }
  debMesh.instanceColor.needsUpdate = true;
}
const _c1 = new THREE.Color();
// éclats de meubles : tirés dans le volume de l'objet, taille réglable
function spawnDebrisBox(x, y, z, hx, hy, hz, color, n, owner, dir, sk) {
  sk = sk || 1;
  for (let k = 0; k < n; k++) {
    const d = DB[debI]; const idx = debI; debI = (debI + 1) % NDEB;
    d.on = true; d.sleep = false; d.life = 40; d.owner = owner; d.sink = 0;
    d.p.set(x + rnd(-hx, hx), y + rnd(-hy, hy), z + rnd(-hz, hz));
    d.v.set(rnd(-1.6, 1.6), rnd(1, 3.6), rnd(-1.6, 1.6)); if (dir) d.v.addScaledVector(dir, rnd(1, 3));
    d.w.set(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)); d.q.setFromEuler(_e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)));
    d.s.set(rnd(0.08, 0.3) * sk, rnd(0.05, 0.18) * sk, rnd(0.04, 0.12) * sk);
    debMesh.setColorAt(idx, _c1.copy(color).offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.08, 0.05)));
  }
  debMesh.instanceColor.needsUpdate = true;
}
// éclair bref (télé qui grille, etc.)
const FLASHES = [];
function flashAt(x, y, z) { const l = addSoft(x, y, z, '#bff8ff', 4, 6); l.flashT = 0.25; FLASHES.push(l); spawnPuff(_v3.set(x, y, z), HDR('#e8fdff', 3), 0.6, 0.18, 0, true); }
function removeDebrisOf(owner) { for (const d of DB) if (d.on && d.owner === owner) d.sink = 1; }
/* éclats de verre */
const NSH = 260;
const shardMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 3), std({ color: C('#e6fbff'), roughness: 0.02, metalness: 0.6, envMapIntensity: 2.0, emissive: C('#bff6ff'), emissiveIntensity: 0.4, side: THREE.DoubleSide }), NSH);
shardMesh.frustumCulled = false; shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(shardMesh);
const SD = []; for (let i = 0; i < NSH; i++) { SD.push({ p: new V3(), v: new V3(), q: new THREE.Quaternion(), w: new V3(), s: 0.05, life: 0 }); shardMesh.setMatrixAt(i, ZERO); }
let shardI = 0;
function spawnShards(x, y, z, ang, w, h, dir) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const n = Math.min(40, Math.round(w * h * 14));
  for (let k = 0; k < n; k++) {
    const d = SD[shardI]; shardI = (shardI + 1) % NSH;
    const u = rnd(-w / 2, w / 2), vv = rnd(-h / 2, h / 2);
    d.p.set(x + u * c, y + vv, z - u * s);
    d.v.set(rnd(-1.5, 1.5), rnd(-0.5, 2.5), rnd(-1.5, 1.5)); if (dir) d.v.addScaledVector(dir, rnd(1.5, 4.5));
    d.w.set(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14)); d.q.setFromEuler(_e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))); d.s = rnd(0.03, 0.11); d.life = rnd(2.2, 3.6);
  }
  for (let k = 0; k < 10; k++) spawnSpark(x + rnd(-w / 2, w / 2) * c, y + rnd(-h / 2, h / 2), z, rnd(-2, 2), rnd(0, 3), rnd(-2, 2), 0.5);
}
/* confettis */
const NCF = Q.confetti;
const confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.075), new THREE.MeshBasicMaterial({ color: C('#ffffff'), side: THREE.DoubleSide }), NCF);
confMesh.frustumCulled = false; confMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(confMesh);
const CF = []; for (let i = 0; i < NCF; i++) { CF.push({ p: new V3(), v: new V3(), q: new THREE.Quaternion(), w: new V3(), life: 0, rest: false }); confMesh.setMatrixAt(i, ZERO); confMesh.setColorAt(i, C('#ffffff')); }
let confI = 0;
const RAINBOW = ['#ff5f7f', '#ffa95f', '#ffe55f', '#7fff8f', '#5fd8ff', '#8f7fff', '#ff7fe0'].map((h) => HDR(h, 1.4));
function spawnConfetti(x, y, z, n, power) {
  for (let k = 0; k < n; k++) {
    const d = CF[confI]; const idx = confI; confI = (confI + 1) % NCF;
    d.p.set(x + rnd(-0.3, 0.3), y + rnd(-0.2, 0.3), z + rnd(-0.3, 0.3));
    const a = rnd(0, Math.PI * 2), sp = rnd(1, 6) * (power || 1);
    d.v.set(Math.cos(a) * sp, rnd(3, 9) * (power || 1), Math.sin(a) * sp);
    d.w.set(rnd(-12, 12), rnd(-12, 12), rnd(-12, 12)); d.q.setFromEuler(_e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))); d.life = rnd(6, 9); d.rest = false;
    confMesh.setColorAt(idx, RAINBOW[(Math.random() * RAINBOW.length) | 0]);
  }
  confMesh.instanceColor.needsUpdate = true;
}
/* bulles sous l'eau */
const NBU = 80;
const bubMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: HDR('#e8ffff', 1.2), transparent: true, opacity: 0.55, depthWrite: false }), NBU);
bubMesh.frustumCulled = false; bubMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(bubMesh);
const BU = []; for (let i = 0; i < NBU; i++) { BU.push({ p: new V3(), life: 0, s: 0.03, top: 0 }); bubMesh.setMatrixAt(i, ZERO); }
let bubI = 0;
function spawnBubble(x, y, z, s, top) { const b = BU[bubI]; bubI = (bubI + 1) % NBU; b.p.set(x, y, z); b.life = 4; b.s = s; b.top = top; }

// un lot de particules sans rien de vivant n'est ni renvoyé à la carte graphique ni dessiné
function poolLive(mesh, any) { if (any || mesh.visible) mesh.instanceMatrix.needsUpdate = true; mesh.visible = any; }
function anyFlag(a) { for (let i = 0; i < a.length; i++) if (a[i]) return true; return false; }
function anyLife(a) { for (let i = 0; i < a.length; i++) if (a[i].life > 0) return true; return false; }
function updateParticles(dt) {
  for (let i = FLASHES.length - 1; i >= 0; i--) { const l = FLASHES[i]; l.flashT -= dt; l.k = Math.max(0, l.flashT * 16); if (l.flashT <= 0) { l.on = false; FLASHES.splice(i, 1); const j = softLights.indexOf(l); if (j >= 0) softLights.splice(j, 1); } }
  for (let i = 0; i < DROPS; i++) {
    if (!D.alive[i]) continue;
    const k = i * 3;
    D.life[i] -= dt;
    if (D.life[i] <= 0) { D.alive[i] = 0; dropMesh.setMatrixAt(i, ZERO); continue; }
    D.v[k + 1] -= 17 * dt;
    D.p[k] += D.v[k] * dt; D.p[k + 1] += D.v[k + 1] * dt; D.p[k + 2] += D.v[k + 2] * dt;
    if (D.kind[i] === 0) {
      const gy = groundAt(D.p[k], D.p[k + 2], D.p[k + 1] + 0.3);
      const wl = waterLevelAt(D.p[k], D.p[k + 2]);
      const floor = Math.max(gy, wl);
      if (D.p[k + 1] < floor + 0.02) {
        D.alive[i] = 0; dropMesh.setMatrixAt(i, ZERO);
        if (Math.random() < 0.15) spawnRing(D.p[k], floor + 0.03, D.p[k + 2], 0.05, rnd(0.3, 0.7), 0.6);
        continue;
      }
    }
    _v1.set(D.v[k], D.v[k + 1], D.v[k + 2]);
    const sp = _v1.length(); const s = D.size[i] * Math.min(1, D.life[i] * 3 + 0.2);
    if (sp > 0.01) _q2.setFromUnitVectors(UP, _v1.multiplyScalar(1 / sp)); else _q2.identity();
    _sc.set(s, s * Math.min(3.2, 1 + sp * 0.12), s);
    _m4.compose(_v2.set(D.p[k], D.p[k + 1], D.p[k + 2]), _q2, _sc); dropMesh.setMatrixAt(i, _m4);
  }
  poolLive(dropMesh, anyFlag(D.alive));
  for (let i = 0; i < SPARKS; i++) {
    if (!S.alive[i]) continue;
    const k = i * 3; S.life[i] -= dt;
    if (S.life[i] <= 0) { S.alive[i] = 0; sparkMesh.setMatrixAt(i, ZERO); continue; }
    S.v[k + 1] -= 9 * dt; S.v[k] *= 0.985; S.v[k + 2] *= 0.985;
    S.p[k] += S.v[k] * dt; S.p[k + 1] += S.v[k + 1] * dt; S.p[k + 2] += S.v[k + 2] * dt;
    const gy = groundAt(S.p[k], S.p[k + 2], S.p[k + 1] + 0.2); if (S.p[k + 1] < gy) { S.p[k + 1] = gy; S.v[k + 1] *= -0.4; }
    _v1.set(S.v[k], S.v[k + 1], S.v[k + 2]); const sp = _v1.length() || 1;
    _q2.setFromUnitVectors(ZDIR, _v1.multiplyScalar(1 / sp));
    const s = Math.min(1, S.life[i] * 4);
    _sc.set(s, s, s * Math.min(2.5, 0.4 + sp * 0.15));
    _m4.compose(_v2.set(S.p[k], S.p[k + 1], S.p[k + 2]), _q2, _sc); sparkMesh.setMatrixAt(i, _m4);
  }
  poolLive(sparkMesh, anyFlag(S.alive));
  for (const o of puffs) { if (!o.s.visible) continue; o.life -= dt; if (o.life <= 0) { o.s.visible = false; continue; } const t = 1 - o.life / o.max; o.s.position.addScaledVector(o.v, dt); o.s.scale.setScalar(o.size * (1 + t * 1.6)); o.s.material.opacity = (1 - t) * (1 - t) * 0.85; }
  for (const o of rings) { if (!o.m.visible) continue; o.life -= dt; if (o.life <= 0) { o.m.visible = false; continue; } const t = 1 - o.life / o.max; const r = lerp(o.r0, o.r1, easeOut(t)); o.m.scale.set(r * 2, 1, r * 2); o.m.material.opacity = (1 - t) * 0.9; }
  for (const o of puddles) { if (!o.m.visible) continue; o.life -= dt; if (o.life <= 0) { o.m.visible = false; continue; } const t = 1 - o.life / o.max; o.m.material.opacity = Math.min(1, (1 - t) * 3) * 0.5; }
  for (let i = 0; i < SHELLS; i++) {
    const s = SH[i]; if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) { shellMesh.setMatrixAt(i, ZERO); continue; }
    s.v.y -= 14 * dt; s.p.addScaledVector(s.v, dt);
    const gy = groundAt(s.p.x, s.p.z, s.p.y + 0.2) + 0.006;
    if (s.p.y < gy) { s.p.y = gy; if (s.v.y < -0.6) { s.v.y *= -0.38; s.v.x *= 0.6; s.v.z *= 0.6; s.w.multiplyScalar(0.6); if (!s.bounced) { s.bounced = true; sTink(s.p); } } else { s.v.set(0, 0, 0); s.w.multiplyScalar(0.9); } }
    _q2.setFromEuler(_e.set(s.w.x * dt, s.w.y * dt, s.w.z * dt)); s.q.multiply(_q2);
    const sc = Math.min(1, s.life * 2) * s.s;
    _m4.compose(s.p, s.q, _sc.set(sc, sc, sc)); shellMesh.setMatrixAt(i, _m4);
  }
  poolLive(shellMesh, anyLife(SH));
  for (const tr of tracers) {
    if (!tr.m.visible) continue;
    tr.t += dt * tr.sp;
    if (tr.t > tr.dist + tr.len) { tr.m.visible = false; continue; }
    const a = Math.max(0, tr.t - tr.len), b = Math.min(tr.dist, tr.t);
    _v1.subVectors(tr.b, tr.a).normalize();
    tr.m.position.copy(tr.a).addScaledVector(_v1, (a + b) / 2); tr.m.quaternion.setFromUnitVectors(ZDIR, _v1);
    tr.m.scale.set(tr.w, tr.w, Math.max(0.01, b - a));
  }
  // gravats
  let dbAny = false;
  for (let i = 0; i < NDEB; i++) {
    const d = DB[i]; if (!d.on) continue;
    d.life -= dt;
    if (d.sink > 0 || d.life < 0) { d.sink = Math.max(d.sink, 0.001) + dt * 0.8; d.p.y -= dt * 0.6; if (d.sink > 1.6) { d.on = false; debMesh.setMatrixAt(i, ZERO); dbAny = true; continue; } }
    else if (!d.sleep) {
      d.v.y -= 19 * dt; d.p.addScaledVector(d.v, dt);
      const gy = groundAt(d.p.x, d.p.z, d.p.y + 0.3) + d.s.y * 0.5;
      if (d.p.y < gy) { d.p.y = gy; if (d.v.y < -1.5) { d.v.y *= -0.3; d.v.x *= 0.55; d.v.z *= 0.55; d.w.multiplyScalar(0.5); } else { d.v.set(0, 0, 0); d.w.set(0, 0, 0); d.sleep = true; } }
      _q2.setFromEuler(_e.set(d.w.x * dt, d.w.y * dt, d.w.z * dt)); d.q.multiply(_q2);
    } else continue;
    _m4.compose(d.p, d.q, d.s); debMesh.setMatrixAt(i, _m4); dbAny = true;
  }
  if (dbAny || debDirty) { debMesh.instanceMatrix.needsUpdate = true; debDirty = false; }
  { let on = false; for (let i = 0; i < NDEB; i++) if (DB[i].on) { on = true; break; } debMesh.visible = on; }
  for (let i = 0; i < NSH; i++) {
    const d = SD[i]; if (d.life <= 0) continue;
    d.life -= dt;
    if (d.life <= 0) { shardMesh.setMatrixAt(i, ZERO); continue; }
    d.v.y -= 16 * dt; d.p.addScaledVector(d.v, dt);
    const gy = groundAt(d.p.x, d.p.z, d.p.y + 0.3) + 0.01;
    if (d.p.y < gy) { d.p.y = gy; d.v.multiplyScalar(0.3); d.v.y = Math.abs(d.v.y) * 0.3; d.w.multiplyScalar(0.3); }
    _q2.setFromEuler(_e.set(d.w.x * dt, d.w.y * dt, d.w.z * dt)); d.q.multiply(_q2);
    const s = d.s * Math.min(1, d.life * 2);
    _m4.compose(d.p, d.q, _sc.set(s, s, s)); shardMesh.setMatrixAt(i, _m4);
  }
  poolLive(shardMesh, anyLife(SD));
  for (let i = 0; i < NCF; i++) {
    const d = CF[i]; if (d.life <= 0) continue;
    d.life -= dt;
    if (d.life <= 0) { confMesh.setMatrixAt(i, ZERO); continue; }
    if (!d.rest) {
      d.v.y -= 9 * dt; d.v.multiplyScalar(1 - Math.min(1, 2.6 * dt));
      d.v.x += Math.sin(clockU.value * 6 + i) * 0.6 * dt; d.v.z += Math.cos(clockU.value * 5 + i) * 0.6 * dt;
      d.p.addScaledVector(d.v, dt);
      const gy = groundAt(d.p.x, d.p.z, d.p.y + 0.3) + 0.01;
      if (d.p.y < gy) { d.p.y = gy; d.rest = true; d.q.setFromEuler(_e.set(-Math.PI / 2, rnd(0, 6), 0)); }
      else { _q2.setFromEuler(_e.set(d.w.x * dt, d.w.y * dt, d.w.z * dt)); d.q.multiply(_q2); }
    }
    const s = Math.min(1, d.life * 1.5);
    _m4.compose(d.p, d.q, _sc.set(s, s, s)); confMesh.setMatrixAt(i, _m4);
  }
  poolLive(confMesh, anyLife(CF));
  for (let i = 0; i < NBU; i++) {
    const b = BU[i]; if (b.life <= 0) continue;
    b.life -= dt; b.p.y += dt * (0.6 + b.s * 10); b.p.x += Math.sin(clockU.value * 7 + i) * dt * 0.1;
    if (b.p.y > b.top || b.life <= 0) { b.life = 0; bubMesh.setMatrixAt(i, ZERO); continue; }
    _m4.compose(b.p, _q2.identity(), _sc.set(b.s, b.s, b.s)); bubMesh.setMatrixAt(i, _m4);
  }
  poolLive(bubMesh, anyLife(BU));
}
