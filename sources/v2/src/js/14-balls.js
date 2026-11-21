/* =========================================================
   Balles smiley qui tombent des palmiers et s'entassent
   ========================================================= */
const NB = Q.balls, BR = 0.16;
const ballMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(BR, 14, 10), std({ color: C('#ffffff'), map: T.smiley, roughness: 0.35, envMapIntensity: 0.9 }), NB);
ballMesh.castShadow = true; ballMesh.receiveShadow = true; ballMesh.frustumCulled = false; ballMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(ballMesh);
const BALL_COLS = ['#ffe25f', '#ff8fc8', '#8ff0d6', '#b9a2ff', '#ffb98a', '#8fd0ff', '#fff6a0'].map(C);
const BP = new Float32Array(NB * 3), BV = new Float32Array(NB * 3), BQ = [];
const BSLEEP = new Uint8Array(NB), BON = new Uint8Array(NB), BST = new Float32Array(NB), BAGE = new Float32Array(NB);
for (let i = 0; i < NB; i++) { BQ.push(new THREE.Quaternion()); ballMesh.setMatrixAt(i, ZERO); ballMesh.setColorAt(i, BALL_COLS[i % BALL_COLS.length]); }
ballMesh.count = 0;
let ballNext = 0, ballCount = 0, ballsDirty = false, ballPop = 0;
function spawnBall(x, y, z, vx, vy, vz) {
  // on recycle de préférence une balle endormie loin du joueur
  let i = ballNext;
  if (ballCount >= NB) {
    let tries = 0;
    while (tries < 40) { const k = (ballNext + tries * 37) % NB; const dx = BP[k * 3] - camera.position.x, dz = BP[k * 3 + 2] - camera.position.z; if (BSLEEP[k] && dx * dx + dz * dz > 900) { i = k; break; } tries++; }
  } else ballCount++;
  ballNext = (ballNext + 1) % NB;
  if (i + 1 > ballMesh.count) ballMesh.count = i + 1;
  BP[i * 3] = x; BP[i * 3 + 1] = y; BP[i * 3 + 2] = z; BV[i * 3] = vx; BV[i * 3 + 1] = vy; BV[i * 3 + 2] = vz;
  BON[i] = 1; BSLEEP[i] = 0; BST[i] = 0; BAGE[i] = 0; BQ[i].setFromEuler(_e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)));
  ballMesh.setColorAt(i, BALL_COLS[(Math.random() * BALL_COLS.length) | 0]); ballMesh.instanceColor.needsUpdate = true;
  return i;
}
function shakePalm(ci, n, seed, fromNet) {
  const c = CROWNS[ci]; if (!c) return;
  const r = seed !== undefined ? rng(seed) : Math.random;
  for (let k = 0; k < n; k++) { const a = r() * Math.PI * 2, d = 0.3 + r() * 1.2; spawnBall(c.x + Math.cos(a) * d, c.y - 0.3 - r() * 0.6, c.z + Math.sin(a) * d, Math.cos(a) * (0.5 + r()), r() * 1.5, Math.sin(a) * (0.5 + r())); }
  if (!fromNet && NET.on) NET.send('palme', { i: ci, n, s: seed });
  if (performance.now() - ballPop > 90) { ballPop = performance.now(); sBoop(c.x, c.y, c.z); }
}
function wakeBall(i) { BSLEEP[i] = 0; BST[i] = 0; }
function pushBall(i, vx, vy, vz) { wakeBall(i); BV[i * 3] += vx; BV[i * 3 + 1] += vy; BV[i * 3 + 2] += vz; }
// grille de hachage spatial
const HSZ = 16384, hHead = new Int32Array(HSZ), hNext = new Int32Array(NB), CS = BR * 2.05;
function hcell(x, y, z) { return ((Math.floor(x / CS) * 73856093) ^ (Math.floor(y / CS) * 19349663) ^ (Math.floor(z / CS) * 83492791)) & (HSZ - 1); }
const _bp = { x: 0, z: 0 };
function updateBalls(dt, pushers) {
  if (ballCount === 0) return;
  hHead.fill(-1);
  for (let i = 0; i < NB; i++) { if (!BON[i]) continue; const h = hcell(BP[i * 3], BP[i * 3 + 1], BP[i * 3 + 2]); hNext[i] = hHead[h]; hHead[h] = i; }
  const D2 = (BR * 2) * (BR * 2);
  for (let i = 0; i < NB; i++) {
    if (!BON[i]) continue;
    const k = i * 3;
    // joueurs et monstre poussent les balles
    for (const p of pushers) {
      const dx = BP[k] - p.x, dz = BP[k + 2] - p.z, dy = BP[k + 1] - (p.y + 0.6);
      const r = p.r + BR; if (Math.abs(dy) > 1.2) continue;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 1e-6) { const d = Math.sqrt(d2); const push = (r - d); if (BSLEEP[i]) wakeBall(i); BV[k] += dx / d * push * 14 + (p.vx || 0) * 0.15; BV[k + 2] += dz / d * push * 14 + (p.vz || 0) * 0.15; BV[k + 1] += push * 3; }
    }
    if (BSLEEP[i]) continue;
    BAGE[i] += dt;
    let vx = BV[k], vy = BV[k + 1] - 17 * dt, vz = BV[k + 2];
    let x = BP[k] + vx * dt, y = BP[k + 1] + vy * dt, z = BP[k + 2] + vz * dt;
    // eau : flottaison
    const wl = waterLevelAt(x, z);
    if (y < wl) { vy += (wl - y) * 50 * dt - vy * 4 * dt; vx *= 1 - 1.5 * dt; vz *= 1 - 1.5 * dt; vx += Math.sin(clockU.value * 0.7 + i) * 0.15 * dt; }
    // contacts entre balles
    const cx = Math.floor(x / CS), cy = Math.floor(y / CS), cz = Math.floor(z / CS);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      let j = hHead[(((cx + a) * 73856093) ^ ((cy + b) * 19349663) ^ ((cz + c) * 83492791)) & (HSZ - 1)];
      while (j >= 0) {
        if (j !== i) {
          const jk = j * 3, dx = x - BP[jk], dy = y - BP[jk + 1], dz = z - BP[jk + 2], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < D2 && d2 > 1e-8) {
            const d = Math.sqrt(d2), pen = BR * 2 - d, nx = dx / d, ny = dy / d, nz = dz / d;
            const share = BSLEEP[j] ? 1 : 0.5;
            x += nx * pen * share; y += ny * pen * share; z += nz * pen * share;
            const vn = vx * nx + vy * ny + vz * nz;
            if (vn < 0) { vx -= vn * nx * 1.2; vy -= vn * ny * 1.2; vz -= vn * nz * 1.2; }
            if (BSLEEP[j] && -vn > 2.5) { wakeBall(j); BV[jk] -= nx * 0.6; BV[jk + 2] -= nz * 0.6; }
          }
        }
        j = hNext[j];
      }
    }
    // sol
    const gy = groundAt(x, z, y) + BR;
    if (y < gy) { y = gy; if (vy < -1.2) { vy = -vy * 0.55; if (Math.random() < 0.08 && performance.now() - ballPop > 70) { ballPop = performance.now(); sBoop(x, y, z, 0.35); } } else vy = 0; vx *= 1 - 2.2 * dt; vz *= 1 - 2.2 * dt; }
    // murs
    _bp.x = x; _bp.z = z;
    if (collide(_bp, BR, y - BR, BR * 2, W_BALL)) { const vn = vx * _hitN.x + vz * _hitN.z; if (vn < 0) { vx -= vn * _hitN.x * 1.5; vz -= vn * _hitN.z * 1.5; } }
    x = _bp.x; z = _bp.z;
    if (x < BOUNDS.x0) x = BOUNDS.x0; if (x > BOUNDS.x1) x = BOUNDS.x1; if (z < BOUNDS.z0) z = BOUNDS.z0; if (z > BOUNDS.z1) z = BOUNDS.z1;
    vx = (x - BP[k]) / dt * 0.5 + vx * 0.5; vz = (z - BP[k + 2]) / dt * 0.5 + vz * 0.5;
    const speed2 = vx * vx + vy * vy + vz * vz;
    if (speed2 > 400) { const s = 20 / Math.sqrt(speed2); vx *= s; vy *= s; vz *= s; }
    // roulement
    const hs = Math.hypot(vx, vz);
    if (hs > 0.02) { _v1.set(vz, 0, -vx).normalize(); _q2.setFromAxisAngle(_v1, hs * dt / BR); BQ[i].premultiply(_q2); }
    BP[k] = x; BP[k + 1] = y; BP[k + 2] = z; BV[k] = vx; BV[k + 1] = vy; BV[k + 2] = vz;
    if (speed2 < 0.04 && BAGE[i] > 0.4) { BST[i] += dt; if (BST[i] > 0.35) { BSLEEP[i] = 1; BV[k] = BV[k + 1] = BV[k + 2] = 0; } } else BST[i] = 0;
    _m4.compose(_v2.set(x, y, z), BQ[i], _sc.set(1, 1, 1)); ballMesh.setMatrixAt(i, _m4); ballsDirty = true;
  }
  if (ballsDirty) { ballMesh.instanceMatrix.needsUpdate = true; ballsDirty = false; }
}
function rayBalls(o, d, best, res) {
  if (ballCount === 0) return best;
  for (let i = 0; i < NB; i++) {
    if (!BON[i]) continue;
    const k = i * 3, cx = BP[k] - o.x, cy = BP[k + 1] - o.y, cz = BP[k + 2] - o.z;
    const tc = cx * d.x + cy * d.y + cz * d.z; if (tc < 0 || tc > best) continue;
    const e2 = cx * cx + cy * cy + cz * cz - tc * tc; if (e2 > BR * BR) continue;
    const t = tc - Math.sqrt(BR * BR - e2);
    if (t < best) { best = t; res.t = t; res.kind = 'balle'; res.ball = i; res.n.set(-d.x, -d.y, -d.z); }
  }
  return best;
}
function hitBall(i, dir, power) {
  pushBall(i, dir.x * power, Math.abs(dir.y) * power * 0.5 + 1.5, dir.z * power);
  // les voisines frémissent aussi
  const k = i * 3;
  for (let j = 0; j < NB; j++) { if (!BON[j] || j === i) continue; const jk = j * 3; const dx = BP[jk] - BP[k], dy = BP[jk + 1] - BP[k + 1], dz = BP[jk + 2] - BP[k + 2]; if (dx * dx + dy * dy + dz * dz < 0.36) pushBall(j, dx * 3, 1, dz * 3); }
  if (performance.now() - ballPop > 60) { ballPop = performance.now(); sBoop(BP[k], BP[k + 1], BP[k + 2], 0.6); }
}
