/* =========================================================
   Le Revenant : métaboules d'eau
   ========================================================= */
const MC_RES = Q.mc, MS = 2.25, ISO = 80, SUB = 12;
const monsterU = { uTime: { value: 0 }, uFlash: { value: 0 } };
const rimExtra = (sh) => {
  sh.uniforms.uTime = monsterU.uTime; sh.uniforms.uFlash = monsterU.uFlash;
  sh.fragmentShader = 'uniform float uTime;\nuniform float uFlash;\n' + sh.fragmentShader.replace('#include <output_fragment>', [
    '#include <output_fragment>',
    'float frs = pow(clamp(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.4);',
    'vec3 rimC = mix(vec3(0.5,1.0,1.0), vec3(1.0,0.55,0.95), 0.5 + 0.5*sin(uTime*1.3 + vViewPosition.y*1.5));',
    'gl_FragColor.rgb += rimC*frs*0.95 + vec3(0.7,1.0,1.0)*uFlash;'
  ].join('\n'));
};
rimExtra.key = 'rim';
const waterMatHi = phys({ color: C('#e2fdff'), metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.45, ior: 1.33, attenuationColor: C('#5fd6ff'), attenuationDistance: 0.9, specularIntensity: 1, envMapIntensity: 1.4, clearcoat: 0.5, clearcoatRoughness: 0.05 }, rimExtra);
const waterMatLo = std({ color: C('#5fc8ff'), metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.78, envMapIntensity: 1.8, emissive: C('#1f8fd0'), emissiveIntensity: 0.45 }, rimExtra);
const mc = new THREE.MarchingCubes(MC_RES, Q.trans ? waterMatHi : waterMatLo, false, false, 30000);
mc.isolation = ISO; mc.scale.setScalar(MS); mc.userData.surface = 'monstre';
mc.geometry.boundingSphere = new THREE.Sphere(new V3(0, 0, 0), 1.8); mc.frustumCulled = true;
let MON_HI = Q.trans;
const _frus = new THREE.Frustum(), _pmx = new THREE.Matrix4(), _sph = new THREE.Sphere();
function inView(x, y, z, r) { _pmx.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _frus.setFromProjectionMatrix(_pmx); _sph.center.set(x, y, z); _sph.radius = r; return _frus.intersectsSphere(_sph); }
scene.add(mc);
function setMonsterQuality(hi) { MON_HI = hi; mc.material = hi ? waterMatHi : waterMatLo; }
const eyeMat = new THREE.MeshBasicMaterial({ color: HDR('#fff0fb', 7) });
const eyes = [0, 1].map(() => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), eyeMat); scene.add(e); return e; });
const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 2), new THREE.MeshBasicMaterial({ color: HDR('#ff7ac0', 5) }));
scene.add(heart);
const mLight = new THREE.PointLight(C('#8ff3ff'), 0, 12, 2); scene.add(mLight);
const caustMat = new THREE.MeshBasicMaterial({ map: T.caustic, color: HDR('#9ffcff', 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
const caust1 = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5).rotateX(-Math.PI / 2), caustMat);
const caust2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 5).rotateX(-Math.PI / 2), caustMat);
scene.add(caust1, caust2);
const M = {
  state: 'hunt', pos: new V3(0, 0, -10), vel: new V3(), yaw: Math.PI, hp: 100, form: 1, t: 0, stateT: 0,
  atk: 0, cooldown: 2, jiggle: 0, flash: 0, speed: 2.3, lastSpawn: -1, dripT: 0, trailT: 0, blinkT: 3, blink: 1, balls: [],
  target: null, prog: 1e9, progT: 0, farT: 0, gy: 0, ix: 0, iz: 0, iyaw: 0, kills: 0
};
const _bw = new V3();
function monsterBalls(t, f, atk, jig) {
  const out = M.balls; out.length = 0;
  const rise = 0.35 + 0.65 * Math.min(1, f * 1.2);
  const add = (x, y, z, s) => { if (jig > 0) { const k = out.length; x += Math.sin(t * 37 + k * 1.7) * 0.02 * jig; y += Math.cos(t * 41 + k) * 0.015 * jig; z += Math.sin(t * 29 + k * 2.3) * 0.02 * jig; } out.push(x, 0.06 + (y - 0.06) * rise, z, s * f); };
  for (let i = 0; i < 4; i++) { const a = t * 0.6 + i * Math.PI / 2; add(0.5 + Math.cos(a) * 0.13, 0.11 + Math.sin(t * 2 + i) * 0.012, 0.5 + Math.sin(a) * 0.13, 0.78); }
  const sw = Math.sin(t * 1.1) * 0.025, sw2 = Math.cos(t * 0.9) * 0.02;
  add(0.5 + sw * 0.5, 0.27, 0.5 + sw2 * 0.5, 1.28);
  add(0.5 + sw, 0.43, 0.5 + sw2, 1.18);
  add(0.5 + sw, 0.52, 0.555 + sw2, 0.55);
  const hb = Math.sin(t * 1.7) * 0.012;
  const head = [0.5 + sw * 1.3, 0.665 + hb, 0.53 + sw2];
  add(head[0], head[1], head[2], 0.98);
  for (const sg of [-1, 1]) {
    const s1 = Math.sin(t * 1.6 + (sg > 0 ? 0 : Math.PI)) * 0.05;
    let hy = 0.4 + s1 * 0.5, hz = 0.6 + s1, hx = 0.5 + sg * 0.29;
    if (atk > 0) {
      if (atk < 0.55) { const k = easeInOut(atk / 0.55); hy = lerp(hy, 0.8, k); hz = lerp(hz, 0.46, k); hx = lerp(hx, 0.5 + sg * 0.2, k); }
      else if (atk < 0.8) { const k = easeOut(Math.min(1, (atk - 0.55) / 0.12)); hy = lerp(0.8, 0.34, k); hz = lerp(0.46, 0.82, k); hx = 0.5 + sg * 0.15; }
      else { const k = (atk - 0.8) / 0.2; hy = lerp(0.34, hy, k); hz = lerp(0.82, hz, k); hx = lerp(0.5 + sg * 0.15, hx, k); }
    }
    const shx = 0.5 + sg * 0.14 + sw;
    add(shx, 0.56, 0.5, 0.56); add((shx + hx) / 2, (0.56 + hy) / 2, (0.5 + hz) / 2, 0.42); add(hx, hy, hz, 0.4);
  }
  for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i * 0.25) % 1; const sg = i % 2 ? 1 : -1; add(0.5 + sg * 0.27, lerp(0.37, 0.07, ph * ph), 0.6 + (i > 1 ? 0.03 : -0.02), 0.16 * (1 - ph * 0.5)); }
  return head;
}
function ballWorld(i, target) { const b = M.balls; return mc.localToWorld(target.set(b[i] * 2 - 1, b[i + 1] * 2 - 1, b[i + 2] * 2 - 1)); }
function ballRadius(i) { return 2 * MS * Math.sqrt(Math.max(0, M.balls[i + 3]) / (ISO + SUB)); }
function rayMonster(o, d, best, res) {
  if (M.state === 'dead' || M.form < 0.2) return best;
  for (let i = 0; i < M.balls.length; i += 4) {
    if (M.balls[i + 3] < 0.12) continue;
    const c = ballWorld(i, _bw), r = ballRadius(i) * 1.25;
    const t = raySphere(o, d, c.x, c.y, c.z, r);
    if (t < best) { best = t; res.t = t; res.kind = 'monstre'; res.n.set(-d.x, -d.y, -d.z); }
  }
  return best;
}
function monsterGround(x, z) { const g = groundAt(x, z, 0.5); const p = poolAt(x, z); return p ? Math.max(g, p.surf - 0.45) : g; }
function chooseSpawn(near) {
  const ref = near || { x: 0, z: 0 };
  const cands = [];
  SPAWNS.forEach((s, i) => { if (i === M.lastSpawn) return; const d = Math.hypot(s[0] - ref.x, s[1] - ref.z); if (d > 16 && d < 60 && !refugeInside(s[0], s[1])) cands.push(i); });
  if (!cands.length) SPAWNS.forEach((s, i) => { if (i !== M.lastSpawn) cands.push(i); });
  cands.sort(() => Math.random() - 0.5);
  return cands[0];
}
function respawnMonster(idx, opts) {
  if (idx === undefined) idx = chooseSpawn(M.target || localPlayerPos());
  M.lastSpawn = idx;
  M.pos.set(SPAWNS[idx][0], 0, SPAWNS[idx][1]); M.ix = M.pos.x; M.iz = M.pos.z; M.vel.set(0, 0, 0);
  const tp = M.target || localPlayerPos();
  M.yaw = Math.atan2(tp.x - M.pos.x, tp.z - M.pos.z);
  M.state = 'form'; M.stateT = 0; M.form = 0; M.hp = 100; M.atk = 0; M.cooldown = 1.6; M.progT = 0; M.farT = 0; M.stuck = 0; M.lastX = M.pos.x; M.lastZ = M.pos.z;
  M.speed = 2.3 + Math.min(M.kills, 12) * 0.16;
  const gy = monsterGround(M.pos.x, M.pos.z);
  spawnRing(M.pos.x, gy + 0.04, M.pos.z, 0.2, 4, 1.6);
  const pl = poolAt(M.pos.x, M.pos.z); if (pl) spawnRipple(pl, M.pos.x, M.pos.z, 2.2);
  sForm();
  if (!(opts && opts.quiet)) showStatut(true);
  if (NET.on && NET.isHost()) NET.send('monstreNe', { i: idx });
}
function hitMonster(p, dir, dmg, killer) {
  const formed = M.state === 'hunt';
  for (let i = 0; i < 8; i++) spawnDrop(p.x, p.y, p.z, -dir.x * rnd(1, 3) + rnd(-1.5, 1.5), rnd(0.5, 3.5), -dir.z * rnd(1, 3) + rnd(-1.5, 1.5), rnd(0.025, 0.06), 1.6);
  spawnPuff(p, MIST, 0.5, 0.45, 0.3, true);
  sSplash(0.45, rnd(0.9, 1.3), p);
  if (!formed) return false;
  M.jiggle = Math.min(1.2, M.jiggle + 0.35); M.flash = 0.6;
  if (NET.on && !NET.isHost()) { NET.send('monstreHit', { d: dmg }, NET.hostId()); return true; }
  M.hp -= dmg;
  if (M.hp <= 0) killMonster(killer || NET.selfId, true);
  return true;
}
function killMonster(killerId, local, data) {
  if (M.state === 'dead') return;
  mc.updateMatrixWorld();
  for (let i = 0; i < M.balls.length; i += 4) {
    if (M.balls[i + 3] < 0.1) continue;
    const c = ballWorld(i, _v3).clone(); const n = Math.round(9 + M.balls[i + 3] * 12);
    for (let k = 0; k < n; k++) { _v1.set(c.x - M.pos.x, 0, c.z - M.pos.z).normalize(); spawnDrop(c.x + rnd(-0.2, 0.2), c.y + rnd(-0.2, 0.2), c.z + rnd(-0.2, 0.2), _v1.x * rnd(1, 6) + rnd(-2.5, 2.5), rnd(1, 7.5), _v1.z * rnd(1, 6) + rnd(-2.5, 2.5), rnd(0.03, 0.09), 3); }
    if (i % 16 === 0) spawnPuff(c, MIST, 0.9, 0.8, 0.6, true);
  }
  const gy = monsterGround(M.pos.x, M.pos.z);
  for (let i = 0; i < 4; i++) spawnRing(M.pos.x, gy + 0.04, M.pos.z, 0.3, 3 + i * 1.6, 1.0 + i * 0.35);
  spawnPuddle(M.pos.x, gy, M.pos.z, 1.9, 9);
  const pl = poolAt(M.pos.x, M.pos.z); if (pl) spawnRipple(pl, M.pos.x, M.pos.z, 3);
  M.state = 'dead'; M.stateT = 0; M.form = 0; M.kills++;
  sKill();
  const mine = killerId === NET.selfId;
  const phrase = data && data.p !== undefined ? data.p : nextPhrase();
  if (mine) { onKill(); setTimeout(() => showPhrase(phrase), 350); }
  else { const n = NET.nameOf(killerId); addFeed(n + ' a dissous le Revenant'); if (dist2D(camera.position, M.pos) < 30) setTimeout(() => showPhrase(phrase), 350); }
  if (NET.on && NET.isHost() && local !== 'net') NET.send('monstreMort', { k: killerId, p: phrase });
}
function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function hurtPlayerFromMonster() {
  if (typeof hurtPlayer === 'function') hurtPlayer(M.pos, 34, 'monstre');
}
function pickTarget2(players) {
  let best = null, bd = 1e9, anyRefuge = null;
  for (const p of players) {
    if (p.dead || p.inPC) continue;
    if (refugeDoor.locked && refugeInside(p.x, p.z, p.y)) { anyRefuge = p; continue; }
    const d = Math.hypot(p.x - M.pos.x, p.z - M.pos.z) + (p.y > 6 ? 40 : 0);
    if (d < bd) { bd = d; best = p; }
  }
  return best || anyRefuge;
}
function updateMonster(dt, authority, players) {
  M.t += dt; M.stateT += dt;
  monsterU.uTime.value += dt;
  M.jiggle = damp(M.jiggle, 0, 5, dt); M.flash = damp(M.flash, 0, 10, dt); monsterU.uFlash.value = M.flash * 0.9;
  if (authority) {
    M.target = pickTarget2(players);
    if (M.state === 'dead') { if (M.stateT > 1.7 && monsterAllowed()) { respawnMonster(); toast('La marée monte… le Revenant sort de la mer'); } }
    else if (!monsterAllowed()) { const gy = monsterGround(M.pos.x, M.pos.z); for (let i = 0; i < 40; i++) spawnDrop(M.pos.x + rnd(-0.6, 0.6), gy + rnd(0.2, 2.4), M.pos.z + rnd(-0.6, 0.6), rnd(-1, 1), rnd(-2, 0.5), rnd(-1, 1), rnd(0.03, 0.07), 1.5); spawnPuddle(M.pos.x, gy, M.pos.z, 1.6, 6); M.state = 'dead'; M.stateT = 0; M.form = 0; }
  } else {
    M.pos.x = damp(M.pos.x, M.ix, 8, dt); M.pos.z = damp(M.pos.z, M.iz, 8, dt);
    let dy = M.iyaw - M.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; M.yaw += dy * Math.min(1, dt * 8);
  }
  if (M.state === 'dead') { mc.visible = false; eyes.forEach((e) => (e.visible = false)); heart.visible = false; mLight.intensity = 0; caustMat.opacity = 0; return; }
  const gy = monsterGround(M.pos.x, M.pos.z); M.gy = gy;
  if (M.state === 'form') {
    M.form = easeOut(Math.min(1, M.stateT / 2.4));
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, r = rnd(3, 7), tau = rnd(0.55, 0.95);
      const sx = M.pos.x + Math.cos(a) * r, sz = M.pos.z + Math.sin(a) * r, sy = gy + 0.05;
      const tx = M.pos.x + rnd(-0.3, 0.3), ty = gy + rnd(0.8, 2.6), tz = M.pos.z + rnd(-0.3, 0.3);
      if (M.stateT < 2.0) spawnDrop(sx, sy, sz, (tx - sx) / tau, (ty - sy) / tau + 0.5 * 17 * tau, (tz - sz) / tau, rnd(0.03, 0.06), tau, 1);
    }
    if (M.stateT >= 2.4) { M.state = 'hunt'; M.form = 1; showStatut(false); spawnRing(M.pos.x, gy + 0.04, M.pos.z, 0.3, 2.5, 0.8); }
  }
  const tgt = M.target || players[0] || { x: 0, y: 0, z: 0 };
  let dist = Math.hypot(tgt.x - M.pos.x, tgt.z - M.pos.z);
  let goalX = tgt.x, goalZ = tgt.z;
  const prowl = refugeDoor.locked && refugeInside(tgt.x, tgt.z, tgt.y);
  if (prowl) { goalX = RF.x1 + 3.2 + Math.sin(M.t * 0.3) * 1.5; goalZ = -1 + Math.sin(M.t * 0.5) * 2.5; dist = Math.hypot(goalX - M.pos.x, goalZ - M.pos.z) + 3; }
  if (authority) {
    const ty = Math.atan2(goalX - M.pos.x, goalZ - M.pos.z);
    let dy = ty - M.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    M.yaw += dy * Math.min(1, dt * 3);
    if (M.state === 'hunt') {
      const gd = Math.hypot(goalX - M.pos.x, goalZ - M.pos.z);
      let sp = gd > (prowl ? 0.8 : 2.6) ? M.speed : 0; if (M.atk > 0) sp *= 0.25;
      const nx = (goalX - M.pos.x) / (gd || 1), nz = (goalZ - M.pos.z) / (gd || 1), side = Math.sin(M.t * 0.7) * 0.5;
      M.vel.x = damp(M.vel.x, (nx - nz * side) * sp, 3, dt); M.vel.z = damp(M.vel.z, (nz + nx * side) * sp, 3, dt);
      M.pos.x += M.vel.x * dt; M.pos.z += M.vel.z * dt;
      collide(M.pos, 0.9, gy, 2.4, W_MONSTER);
      M.pos.x = clamp(M.pos.x, BOUNDS.x0 + 1, BOUNDS.x1 - 1); M.pos.z = clamp(M.pos.z, BOUNDS.z0 + 1, BOUNDS.z1 - 1);
      // coincé derrière une maison, ou trop loin : il se dissout et revient plus près
      M.progT += dt;
      if (M.progT >= 1) {
        const moved = Math.hypot(M.pos.x - (M.lastX || 0), M.pos.z - (M.lastZ || 0));
        M.lastX = M.pos.x; M.lastZ = M.pos.z; M.progT = 0;
        M.stuck = (gd > 3.5 && M.atk <= 0 && moved < 0.5) ? (M.stuck || 0) + 1 : 0;
      }
      M.farT = dist > 85 ? M.farT + dt : 0;
      if (!prowl && M.target && (M.stuck >= 5 || M.farT > 10)) { meltAndReturn(); return; }
      M.cooldown -= dt;
      const los = !segBlocked(M.pos.x, M.pos.z, tgt.x, tgt.z, gy + 1.2, W_MONSTER);
      if (M.atk <= 0 && M.cooldown <= 0 && dist < 3.3 && !prowl && los && Math.abs(tgt.y - gy) < 2.5) { M.atk = 0.0001; sAttack(M.pos); }
    }
  }
  if (M.atk > 0) {
    const prev = M.atk; M.atk += dt / 1.1;
    if (prev < 0.62 && M.atk >= 0.62) {
      const fx = M.pos.x + Math.sin(M.yaw) * 1.6, fz = M.pos.z + Math.cos(M.yaw) * 1.6;
      for (let i = 0; i < 30; i++) spawnDrop(fx + rnd(-0.5, 0.5), gy + rnd(0.3, 1.2), fz + rnd(-0.5, 0.5), rnd(-3, 3), rnd(1, 5), rnd(-3, 3), rnd(0.03, 0.07), 2);
      spawnRing(fx, gy + 0.04, fz, 0.2, 2.6, 0.9);
      if (authority) {
        for (const p of players) {
          const d2 = Math.hypot(p.x - M.pos.x, p.z - M.pos.z);
          if (d2 < 3.9 && !p.dead && !p.inPC && Math.abs(p.y - gy) < 2.5 && !segBlocked(M.pos.x, M.pos.z, p.x, p.z, gy + 1.2, W_MONSTER)) {
            if (p.local) hurtPlayerFromMonster(); else NET.send('eclabousse', { x: M.pos.x, z: M.pos.z }, p.id);
          }
        }
      }
      sSplash(0.6, 0.7, M.pos);
    }
    if (M.atk >= 1) { M.atk = 0; M.cooldown = 2.3; }
  }
  if (M.state === 'hunt') {
    M.dripT -= dt; if (M.dripT <= 0) { M.dripT = rnd(0.15, 0.4); const s = Math.random() < 0.5 ? -1 : 1; _v1.set((0.5 + s * 0.29) * 2 - 1, 0.4 * 2 - 1 - 0.1, 0.6 * 2 - 1); mc.localToWorld(_v1); spawnDrop(_v1.x, _v1.y, _v1.z, rnd(-0.2, 0.2), -0.5, rnd(-0.2, 0.2), rnd(0.025, 0.045), 2); }
    M.trailT -= dt; if (M.trailT <= 0 && Math.hypot(M.vel.x, M.vel.z) > 0.6) { M.trailT = 0.7; spawnPuddle(M.pos.x + rnd(-0.3, 0.3), groundAt(M.pos.x, M.pos.z, 0.5), M.pos.z + rnd(-0.3, 0.3), rnd(0.5, 0.9), 5); }
  }
  // corps
  mc.visible = true;
  mc.position.set(M.pos.x, gy + MS * 0.94 - 0.08, M.pos.z); mc.rotation.y = M.yaw; mc.updateMatrixWorld();
  const f = M.form * (0.74 + 0.26 * Math.max(0, M.hp) / 100);
  const head = monsterBalls(M.t, f, M.atk, M.jiggle + (M.state === 'form' ? 0.6 : 0));
  const camD = Math.hypot(camera.position.x - M.pos.x, camera.position.z - M.pos.z);
  const seen = inView(M.pos.x, gy + 2, M.pos.z, 4.2);
  mc.material = MON_HI && camD < 32 ? waterMatHi : waterMatLo;
  M.mcT = (M.mcT || 0) - dt;
  // sa surface est recalculée à chaque image de près sur ordinateur ; sur les réglages légers, une image sur deux,
  // et jamais la même image que les ombres, pour que la charge reste régulière
  const nSh = PRESETS[qualiteNom].shadowEvery || 1, leger = nSh > 1;
  if (seen && ((!leger && camD < 22) || camD < 3.5 || (M.mcT <= 0 && (!leger || camD >= 45 || (shadowTick + 1) % nSh !== 0)))) {
    M.mcT = camD < 45 ? 0.03 : 1 / 15;
    mc.reset();
    const bb = M.balls;
    for (let i = 0; i < bb.length; i += 4) if (bb[i + 3] > 0.02) mc.addBall(bb[i], bb[i + 1], bb[i + 2], bb[i + 3], SUB);
    mc.update();
  }
  M.blinkT -= dt; if (M.blinkT <= 0) { M.blinkT = rnd(2.5, 6); M.blink = 0; }
  M.blink = damp(M.blink, 1, 14, dt);
  const showEyes = M.form > 0.85, hy = head[1];
  [-1, 1].forEach((s, i) => {
    const e = eyes[i]; e.visible = showEyes;
    _v1.set((head[0] + s * 0.045) * 2 - 1, (0.06 + (hy + 0.012 - 0.06) * (0.35 + 0.65 * Math.min(1, f * 1.2))) * 2 - 1, (head[2] + 0.092) * 2 - 1);
    mc.localToWorld(_v1); e.position.copy(_v1); e.scale.set(1, Math.max(0.1, M.blink), 1);
  });
  heart.visible = M.form > 0.5;
  _v1.set(0, (0.06 + (0.47 - 0.06) * (0.35 + 0.65 * Math.min(1, f * 1.2))) * 2 - 1, 0.53 * 2 - 1); mc.localToWorld(_v1);
  heart.position.copy(_v1); const hb2 = 1 + Math.pow(Math.max(0, Math.sin(M.t * 4.2)), 8) * 0.35; heart.scale.setScalar(hb2 * Math.max(0.3, f));
  mLight.position.set(M.pos.x, gy + 1.8, M.pos.z); mLight.intensity = 1.8 * M.form;
  caust1.position.set(M.pos.x, gy + 0.035, M.pos.z); caust2.position.set(M.pos.x, gy + 0.04, M.pos.z);
  caust1.rotation.y = M.t * 0.12; caust2.rotation.y = -M.t * 0.18; caust2.scale.setScalar(1 + Math.sin(M.t * 1.3) * 0.1);
  caustMat.opacity = 0.75 * M.form;
}
// le Revenant ne sort que quand l'eau revient : à la nuit tombée (réglable)
const REV = { mode: store('revenant') || 'nuit' };
function monsterAllowed() { return REV.mode === 'toujours' || (REV.mode === 'nuit' && NIGHT.value > 0.6); }
function meltAndReturn() {
  const gy = monsterGround(M.pos.x, M.pos.z);
  for (let i = 0; i < 40; i++) spawnDrop(M.pos.x + rnd(-0.6, 0.6), gy + rnd(0.2, 2.4), M.pos.z + rnd(-0.6, 0.6), rnd(-1, 1), rnd(-2, 0.5), rnd(-1, 1), rnd(0.03, 0.07), 1.5);
  spawnPuddle(M.pos.x, gy, M.pos.z, 1.6, 6);
  respawnMonster(chooseSpawn(M.target), { quiet: true });
}
