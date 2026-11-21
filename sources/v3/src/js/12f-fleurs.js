/* =========================================================
   Détails des pelouses : massifs de fleurs et arroseurs automatiques
   ========================================================= */
{
  const free = (x, z) => {
    if (x < MAP.x0 + 3 || x > MAP.x1 - 3 || z > MAP.z1 - 4) return false;
    const q = Math.hypot((x - HILL.cx) / HILL.rx, (z - HILL.cz) / HILL.rz);
    if (q < 0.58) return !(x > RF.x0 - 2.5 && x < RF.x1 + 3.6 && z > -24.6 && z < RF.z1 + 5.4) && !(x > -144.5 && x < -123.5 && z < -23);
    if (q < 1.06 || z < 15.5) return false;
    if (z > ROAD.z0 - 2.2 && z < ROAD.z1 + 2.2 && x > ROAD.x0 - 1 && x < ROAD.x1 + 1) return false;
    if (Math.abs(x) < 17.5 && z < ROAD.z0) return false;
    if (x > RAMP.x0 - 6 && x < RAMP.x1 + 2 && Math.abs(z - RAMP.z) < 8) return false;
    for (const r of RESERVED) if (x > r.x0 - 1 && x < r.x1 + 1 && z > r.z0 - 1 && z < r.z1 + 1) return false;
    for (const p of pools) { if (p.blob) { if (blobEdge(p, x, z) > -0.95) return false; } else if (x > p.x0 - 5 && x < p.x1 + 5 && z > p.z0 - 5 && z < p.z1 + 5) return false; }
    for (const h of houses) { const dx = x - h.x, dz = z - h.z; if (dx * dx + dz * dz < 18 * 18) return false; }
    for (const t of TRAMPS) if (Math.hypot(x - t.d.x, z - t.d.z) < 2.6) return false;
    return true;
  };
  const heads = [], stems = [], cols = ['#ff8fcf', '#ffe27a', '#c9b6f4', '#ffffff', '#ff9f8f', '#7ff0ff', '#ffb3d4'];
  let tries = 0;
  const NF = Q.balls >= 3000 ? 5200 : Q.balls >= 1500 ? 2800 : 1400, NT = Q.balls >= 3000 ? 3200 : Q.balls >= 1500 ? 1600 : 700;
  while (heads.length < NF && tries < 1600) {
    tries++;
    const cx = rr(MAP.x0, MAP.x1), cz = rr(MAP.z0, MAP.z1);
    if (!free(cx, cz)) continue;
    const n = (rr(24, 60)) | 0, rad = rr(1.4, 3.6), c0 = cols[(R() * cols.length) | 0], c1 = cols[(R() * cols.length) | 0];
    for (let i = 0; i < n; i++) {
      const a = rr(0, Math.PI * 2), r = Math.sqrt(R()) * rad, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!free(x, z)) continue;
      const h = rr(0.28, 0.55), s = rr(0.1, 0.17);
      stems.push(M4(x, TH(x, z) + h / 2, z, rr(-0.15, 0.15), 0, rr(-0.15, 0.15), 1, h, 1));
      heads.push([M4(x, TH(x, z) + h, z, 0, rr(0, 6), 0, s, s * 0.55, s), R() < 0.6 ? c0 : c1]);
    }
  }
  const stemIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.01, 1, 4, 1, true), std({ color: C('#5aae7a'), roughness: 0.8 }), stems.length);
  stems.forEach((m, i) => stemIM.setMatrixAt(i, m));
  const headIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), std({ color: C('#ffffff'), roughness: 0.6, emissive: C('#ffffff'), emissiveIntensity: 0.08 }), heads.length);
  heads.forEach(([m, c], i) => { headIM.setMatrixAt(i, m); headIM.setColorAt(i, C(c)); });
  for (const im of [stemIM, headIM]) { im.receiveShadow = true; im.frustumCulled = false; world.add(im); }
  // touffes d'herbe haute
  const tuft = mergeList([0, 2.1, 4.2].map((a) => [new THREE.ConeGeometry(0.035, 0.5, 4), M4(Math.sin(a) * 0.05, 0.25, Math.cos(a) * 0.05, Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25)]));
  const tufts = []; tries = 0;
  while (tufts.length < NT && tries < 4000) { tries++; const x = rr(MAP.x0, MAP.x1), z = rr(MAP.z0, MAP.z1); if (!free(x, z)) continue; const s = rr(0.6, 1.3); tufts.push([M4(x, TH(x, z), z, 0, rr(0, 6), 0, s, s * rr(0.8, 1.3), s), R()]); }
  const tuftIM = new THREE.InstancedMesh(tuft, std({ color: C('#ffffff'), roughness: 0.9 }), tufts.length);
  tufts.forEach(([m, r], i) => { tuftIM.setMatrixAt(i, m); tuftIM.setColorAt(i, C(r < 0.5 ? '#6fbf8a' : r < 0.85 ? '#8fd39a' : '#b9e2a0')); });
  tuftIM.receiveShadow = true; tuftIM.frustumCulled = false; world.add(tuftIM);
}
/* arroseurs : un jet d'eau qui balaie la pelouse devant quelques maisons */
const SPRINKLERS = [];
[0, 2, 4].forEach((hi, k) => {
  const h = houses[hi]; if (!h) return;
  const [x, z] = h.toW(h.ox - h.gs * 3.2, Math.min(4.2, h.L.front - 2.4));
  B.add(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 10), MAT.black, M4(x, 0.06, z), false, true);
  B.add(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), MAT.chrome, M4(x, 0.16, z), false, true);
  SPRINKLERS.push({ x, z, ph: k * 1.3, base: h.rot, t: 0 });
});
function updateSprinklers(dt) {
  const cam = camera.position, t = clockU.value;
  for (const s of SPRINKLERS) {
    if (Math.abs(cam.x - s.x) > 45 || Math.abs(cam.z - s.z) > 45) continue;
    s.t -= dt; if (s.t > 0) continue;
    s.t = 0.035;
    const a = s.base + Math.sin(t * 0.7 + s.ph) * 1.2, sp = rnd(3.2, 4.4);
    spawnDrop(s.x, 0.2, s.z, Math.sin(a) * sp + rnd(-0.2, 0.2), rnd(3.6, 4.6), Math.cos(a) * sp + rnd(-0.2, 0.2), rnd(0.018, 0.03), 1.4);
  }
}
