/* =========================================================
   Moutons arc-en-ciel : ils broutent, te regardent d'un air ahuri
   et explosent en confettis
   ========================================================= */
const SHEEP = [];
SHEEP_ZONES.forEach((z, zi) => { for (let k = 0; k < z.n; k++) SHEEP.push({ zi, x: rr(z.x0, z.x1), z: rr(z.z0, z.z1), yaw: rr(0, 6.28), hy: 0, hp: 0, st: 'erre', tx: 0, tz: 0, timer: rr(0, 3), hop: 0, hopV: 0, dead: false, rt: 0, bleat: rr(3, 9), walk: 0, look: 0, grz: 0, px: 0, py: 0, pvx: 0, pvy: 0, scale: 1, ix: 0, iz: 0, iyaw: 0 }); });
const NS = SHEEP.length, PUFFS = 10;
const RAINBOW_W = ['#ff8f9f', '#ffb98a', '#ffe58f', '#a6f0a8', '#8fe0ff', '#b59cff', '#ff9fe0'].map(C);
const sheepWool = std({ color: C('#ffffff'), roughness: 0.95, envMapIntensity: 0.4 });
const imPuff = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), sheepWool, NS * PUFFS);
const imHead = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), std({ color: C('#fff0ea'), roughness: 0.6 }), NS);
const imEar = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), std({ color: C('#ffc7d6'), roughness: 0.6 }), NS * 2);
const imLeg = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.04, 0.42, 6).translate(0, -0.21, 0), std({ color: C('#6a5a86'), roughness: 0.7 }), NS * 4);
const imEye = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), std({ color: C('#ffffff'), roughness: 0.2, envMapIntensity: 1.2 }), NS * 2);
const imPupil = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: C('#1a1424') }), NS * 2);
for (const im of [imPuff, imHead, imEar, imLeg, imEye, imPupil]) { im.castShadow = im !== imPupil; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(im); }
const PUFF_OFF = [[0, 0.66, 0, 0.32], [0.2, 0.64, 0.2, 0.25], [-0.2, 0.64, 0.2, 0.25], [0.2, 0.64, -0.22, 0.25], [-0.2, 0.64, -0.22, 0.25], [0, 0.82, 0.08, 0.24], [0, 0.8, -0.18, 0.23], [0, 0.6, 0.32, 0.22], [0, 0.6, -0.36, 0.2]];
SHEEP.forEach((s, i) => { for (let k = 0; k < PUFFS; k++) imPuff.setColorAt(i * PUFFS + k, RAINBOW_W[(k + i * 2) % RAINBOW_W.length]); pickTarget(s); });
imPuff.instanceColor.needsUpdate = true;
function pickTarget(s) { const z = SHEEP_ZONES[s.zi]; s.tx = rr(z.x0, z.x1); s.tz = rr(z.z0, z.z1); }
const _sm = new THREE.Matrix4(), _sb = new THREE.Matrix4(), _sh = new THREE.Matrix4(), _sv = new V3(), _sq = new THREE.Quaternion();
const SHEEP_IMS = [imPuff, imHead, imEar, imLeg, imEye, imPupil];
function sheepMatrices() {
  // trop loin pour être vus : on ne calcule ni ne dessine rien
  { let near = false; const cx = camera.position.x, cz = camera.position.z; for (let i = 0; i < NS; i++) { const dx = SHEEP[i].x - cx, dz = SHEEP[i].z - cz; if (dx * dx + dz * dz < 175 * 175) { near = true; break; } }
    for (const im of SHEEP_IMS) im.visible = near; if (!near) return; }
  for (let i = 0; i < NS; i++) {
    const s = SHEEP[i];
    const sc = s.dead ? 0 : s.scale * 1.3;
    if (sc <= 0.001) {
      for (let k = 0; k < PUFFS; k++) imPuff.setMatrixAt(i * PUFFS + k, ZERO);
      imHead.setMatrixAt(i, ZERO); for (let k = 0; k < 2; k++) { imEar.setMatrixAt(i * 2 + k, ZERO); imEye.setMatrixAt(i * 2 + k, ZERO); imPupil.setMatrixAt(i * 2 + k, ZERO); } for (let k = 0; k < 4; k++) imLeg.setMatrixAt(i * 4 + k, ZERO);
      continue;
    }
    const gy = s.gy || 0;
    _sb.compose(_sv.set(s.x, gy + s.hop, s.z), _sq.setFromAxisAngle(UP, s.yaw), _ss.set(sc, sc, sc));
    const br = 1 + Math.sin(clockU.value * 2.2 + i) * 0.02;
    for (let k = 0; k < 9; k++) { const o = PUFF_OFF[k]; _sm.compose(_sv.set(o[0], o[1] + (k === 5 ? Math.sin(clockU.value * 2.2 + i) * 0.01 : 0), o[2]), _q.identity(), _ss.set(o[3] * br, o[3] * 0.9 * br, o[3] * br)); imPuff.setMatrixAt(i * PUFFS + k, _sm.premultiply(_sb)); }
    for (let k = 0; k < 4; k++) { const fx = k % 2 ? 0.15 : -0.15, fz = k < 2 ? 0.2 : -0.22; const sw = Math.sin(s.walk + (k === 0 || k === 3 ? 0 : Math.PI)) * 0.5 * Math.min(1, s.spd || 0); _sm.compose(_sv.set(fx, 0.44, fz), _q.setFromAxisAngle(_ss.set(1, 0, 0), sw), _sc3.set(1, 1, 1)); imLeg.setMatrixAt(i * 4 + k, _sm.premultiply(_sb)); }
    // tête : orientation propre (regarde, broute)
    _sh.compose(_sv.set(0, 0.74 - s.grz * 0.32, 0.42 + s.grz * 0.05), _q.setFromEuler(_e.set(s.grz * 0.9 + Math.sin(clockU.value * 1.7 + i) * 0.05 * s.look, s.hy, Math.sin(clockU.value * 1.3 + i) * 0.12 * s.look, 'YXZ')), _ss.set(1, 1, 1)).premultiply(_sb);
    _sm.compose(_sv.set(0, 0, 0.04), _q.identity(), _ss.set(0.19, 0.2, 0.25)); imHead.setMatrixAt(i, _sm.premultiply(_sh));
    _sm.compose(_sv.set(0, 0.16, -0.02), _q.identity(), _ss.set(0.14, 0.11, 0.14)); imPuff.setMatrixAt(i * PUFFS + 9, _sm.premultiply(_sh));
    for (let k = 0; k < 2; k++) {
      const sg = k ? 1 : -1;
      _sm.compose(_sv.set(sg * 0.2, 0.06, -0.03), _q.setFromEuler(_e.set(0, 0, sg * (0.5 + Math.sin(clockU.value * 3 + i) * 0.15))), _ss.set(0.1, 0.035, 0.06)); imEar.setMatrixAt(i * 2 + k, _sm.premultiply(_sh));
      const er = 0.072 + (k ? 0.012 : 0);
      _sm.compose(_sv.set(sg * 0.085, 0.07, 0.2), _q.identity(), _ss.set(er, er, er * 0.8)); imEye.setMatrixAt(i * 2 + k, _sm.premultiply(_sh));
      const pr = er * 0.48;
      _sm.compose(_sv.set(sg * 0.085 + s.px * er * 0.45, 0.07 + s.py * er * 0.45, 0.2 + er * 0.62), _q.identity(), _ss.set(pr, pr, pr * 0.5)); imPupil.setMatrixAt(i * 2 + k, _sm.premultiply(_sh));
    }
  }
  for (const im of SHEEP_IMS) im.instanceMatrix.needsUpdate = true;
}
function updateSheep(dt, authority, players) {
  for (let i = 0; i < NS; i++) {
    const s = SHEEP[i];
    if (s.dead) {
      if (authority) { s.rt -= dt; if (s.rt <= 0) respawnSheep(i, true); }
      continue;
    }
    s.scale = damp(s.scale, 1, 4, dt);
    // joueur le plus proche
    let near = null, nd = 1e9;
    for (const p of players) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < nd) { nd = d; near = p; } }
    if (authority) {
      s.timer -= dt;
      if (near && nd < 13) { s.st = 'regarde'; }
      else if (s.st === 'regarde') { s.st = 'erre'; pickTarget(s); }
      let spd = 0;
      if (s.st === 'erre') {
        const dx = s.tx - s.x, dz = s.tz - s.z, d = Math.hypot(dx, dz);
        if (d < 0.6) { s.st = 'broute'; s.timer = rr(2.5, 6); }
        else { spd = 0.85; let dy = Math.atan2(dx, dz) - s.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; s.yaw += dy * Math.min(1, dt * 2.5); }
      } else if (s.st === 'broute') { if (s.timer <= 0) { s.st = 'erre'; pickTarget(s); } }
      else if (s.st === 'regarde' && near) {
        if (nd < 2.2) { spd = -1.3; } // recule un peu
        let dy = Math.atan2(near.x - s.x, near.z - s.z) - s.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
        if (Math.abs(dy) > 1.1) s.yaw += Math.sign(dy) * Math.min(Math.abs(dy) - 1.1, dt * 1.5);
      }
      s.spd = Math.abs(spd);
      s.x += Math.sin(s.yaw) * spd * dt; s.z += Math.cos(s.yaw) * spd * dt;
      _bp.x = s.x; _bp.z = s.z; collide(_bp, 0.5, 0, 1.0, W_SHEEP); s.x = _bp.x; s.z = _bp.z;
      for (let j = 0; j < NS; j++) { if (j === i || SHEEP[j].dead) continue; const o = SHEEP[j]; const dx = s.x - o.x, dz = s.z - o.z, d = Math.hypot(dx, dz); if (d < 0.9 && d > 0.001) { s.x += dx / d * (0.9 - d) * 0.5; s.z += dz / d * (0.9 - d) * 0.5; } }
      const z = SHEEP_ZONES[s.zi]; s.x = clamp(s.x, z.x0 - 3, z.x1 + 3); s.z = clamp(s.z, z.z0 - 3, z.z1 + 3);
    } else {
      // interpolation vers l'état reçu
      s.x = damp(s.x, s.ix, 8, dt); s.z = damp(s.z, s.iz, 8, dt);
      let dy = s.iyaw - s.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; s.yaw += dy * Math.min(1, dt * 8);
    }
    s.gy = groundAt(s.x, s.z, 0.5);
    s.walk += dt * (s.spd || 0) * 9;
    s.grz = damp(s.grz, s.st === 'broute' ? 1 : 0, 3, dt);
    s.look = damp(s.look, s.st === 'regarde' ? 1 : 0, 4, dt);
    // la tête suit le joueur, les yeux ahuris roulent
    let thy = 0;
    if (near && s.st === 'regarde') { thy = Math.atan2(near.x - s.x, near.z - s.z) - s.yaw; while (thy > Math.PI) thy -= 6.283; while (thy < -Math.PI) thy += 6.283; thy = clamp(thy, -1.2, 1.2); }
    s.hy = damp(s.hy, thy, 6, dt);
    const tpx = near ? clamp(Math.sin(thy - s.hy) * 2 + Math.sin(clockU.value * 5 + i) * 0.2, -1, 1) : Math.sin(clockU.value * 0.9 + i);
    const tpy = near ? clamp((near.y + 1.5 - (s.gy + 0.8)) * 0.15, -1, 1) : -0.3;
    s.pvx += ((tpx - s.px) * 60 - s.pvx * 7) * dt; s.pvy += ((tpy - s.py) * 60 - s.pvy * 7) * dt + (s.hopV > 0 ? 3 * dt : 0);
    s.px = clamp(s.px + s.pvx * dt, -1, 1); s.py = clamp(s.py + s.pvy * dt, -1, 1);
    s.hopV -= 14 * dt; s.hop += s.hopV * dt; if (s.hop < 0) { s.hop = 0; s.hopV = 0; }
    s.bleat -= dt;
    if (s.bleat <= 0) { s.bleat = rr(6, 16); if (near && nd < 25) sBleat(s.x, s.gy + 0.8, s.z, rr(0.9, 1.25)); }
  }
  sheepMatrices();
}
function hitSheep(i, dmg, dir, fromNet) {
  const s = SHEEP[i]; if (s.dead) return;
  s.hopV = 3.2; s.pvx += rnd(-30, 30); s.pvy += 20;
  for (let k = 0; k < 3; k++) spawnPuff(_pp.set(s.x + rnd(-0.3, 0.3), s.gy + 0.8, s.z + rnd(-0.3, 0.3)), RAINBOW_W[(Math.random() * 7) | 0], 0.5, 0.6, 0.6, false);
  if (Math.random() < 0.6) sBleat(s.x, s.gy + 0.8, s.z, rr(1.4, 1.9));
  if (NET.on && !NET.isHost()) { if (!fromNet) NET.send('moutonHit', { i, d: dmg }, NET.hostId()); return; }
  s.hp += dmg;
  if (s.hp >= 5) explodeSheep(i, false);
}
function explodeSheep(i, fromNet) {
  const s = SHEEP[i]; if (s.dead) return;
  s.dead = true; s.rt = 25; s.hp = 0;
  const y = s.gy + 0.7;
  spawnConfetti(s.x, y, s.z, Math.min(220, Math.floor(NCF * 0.4)), 1);
  for (let k = 0; k < 7; k++) spawnPuff(_pp.set(s.x + rnd(-0.4, 0.4), y + rnd(-0.2, 0.4), s.z + rnd(-0.4, 0.4)), RAINBOW_W[k], 1.0, 1.0, 0.5, false);
  spawnRing(s.x, (s.gy || 0) + 0.05, s.z, 0.2, 3.2, 1.0, HDR('#ffd0f0', 1.6));
  sConfetti(s.x, y, s.z);
  if (NET.on && NET.isHost() && !fromNet) NET.send('moutonMort', { i });
}
function respawnSheep(i, broadcast) {
  const s = SHEEP[i], z = SHEEP_ZONES[s.zi];
  s.dead = false; s.hp = 0; s.x = s.ix = rr(z.x0, z.x1); s.z = s.iz = rr(z.z0, z.z1); s.scale = 0.01; s.st = 'erre'; pickTarget(s);
  s.gy = groundAt(s.x, s.z, 0.5);
  for (let k = 0; k < 12; k++) spawnSpark(s.x, s.gy + 0.5, s.z, rnd(-2, 2), rnd(1, 3), rnd(-2, 2), 0.7);
  if (broadcast && NET.on && NET.isHost()) NET.send('moutonNe', { i, x: s.x, z: s.z });
}
function raySheep(o, d, best, res) {
  for (let i = 0; i < NS; i++) {
    const s = SHEEP[i]; if (s.dead) continue;
    const gy = s.gy || 0;
    let t = raySphere(o, d, s.x, gy + 0.66 + s.hop, s.z, 0.45);
    const hx = s.x + Math.sin(s.yaw) * 0.42, hz = s.z + Math.cos(s.yaw) * 0.42;
    t = Math.min(t, raySphere(o, d, hx, gy + 0.78 + s.hop, hz, 0.24));
    if (t < best) { best = t; res.t = t; res.kind = 'mouton'; res.sheep = i; res.n.set(-d.x, -d.y, -d.z); }
  }
  return best;
}
