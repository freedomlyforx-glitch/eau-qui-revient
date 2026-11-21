/* =========================================================
   Objets destructibles : meubles, transats, boîtes aux lettres, flamants…
   Tous solides (on ne passe plus au travers), on peut monter dessus,
   et quelques balles suffisent à les casser. Ils reviennent ensuite.
   ========================================================= */
const DESTR = { pieces: [], groups: new Map(), built: false, tick: 0 };
const DKIND = {
  bois: { col: '#d9b48f', n: 1 }, tissu: { col: '#ffb3d4', n: 1 }, ecran: { col: '#efd9c9', n: 0.8 }, plante: { col: '#6fbf8f', n: 1.2 },
  metal: { col: '#e9e2f5', n: 0.8 }, carton: { col: '#d9b48f', n: 1 }, plastique: { col: '#ff86bd', n: 1 }, verre: { col: '#d9f3ff', n: 0.6 }, lampe: { col: '#ffd9b8', n: 0.7 }
};
// o : { parts: [[géométrie, matériau, matrice]], x, y, z (centre), hx, hy, hz, ang, hp, kind, color, top (dessus praticable), springy, owner, col (false = pas d'obstacle), colBox, onBreak, onRestore }
function destrAdd(o) {
  const ang = o.ang || 0;
  const yo = YOFF; // meuble posé en hauteur (villa sur le promontoire)
  if (yo) { YOFF = 0; o.y += yo; if (o.top !== undefined) o.top += yo; if (o.colBox) { if (o.colBox.y0 !== undefined) o.colBox.y0 += yo; if (o.colBox.y1 !== undefined) o.colBox.y1 += yo; } o.parts = o.parts.map(([g, m, mx]) => [g, m, new THREE.Matrix4().makeTranslation(0, yo, 0).multiply(mx)]); }
  const p = { id: DESTR.pieces.length, o, alive: true, hp: o.hp || 4, maxHp: o.hp || 4, tDead: 0, ranges: [], owner: o.owner === undefined ? -1 : o.owner,
    x: o.x, y: o.y, z: o.z, hx: o.hx, hy: o.hy, hz: o.hz, c: Math.cos(ang), s: Math.sin(ang), ang, kind: o.kind || 'bois', color: C(o.color || (DKIND[o.kind] || DKIND.bois).col), rad: Math.hypot(o.hx, o.hy, o.hz) };
  if (o.col !== false) {
    const cb = o.colBox || {};
    const y0 = cb.y0 !== undefined ? cb.y0 : o.y - o.hy - 0.3, y1 = cb.y1 !== undefined ? cb.y1 : (o.top !== undefined ? o.top : o.y + o.hy);
    p.col = cb.r ? addCircle(o.x, o.z, cb.r, y0, y1, W_PLAYER | W_BALL | W_SHEEP, 'meuble') : addBox(o.x, o.z, cb.hx || o.hx, cb.hz || o.hz, ang, y0, y1, W_PLAYER | W_BALL | W_SHEEP, 'meuble');
  }
  if (o.top !== undefined) p.floor = addFloorOBB(o.x, o.z, (o.topHx || o.hx) * 0.92, (o.topHz || o.hz) * 0.92, ang, o.top, { springy: !!o.springy, meuble: true });
  DESTR.pieces.push(p);
  YOFF = yo;
  return p;
}
// regroupe toutes les pièces par matériau et par quartier de carte : très peu d'appels de dessin
function buildDestr(parent) {
  for (const p of DESTR.pieces) {
    for (const [geo, mat0, m4] of p.o.parts) {
      const g = prepGeo(geo, m4); let mat = mat0;
      if (mat.userData.bake && VCMAT) {
        const n = g.attributes.position.count, c = mat.color, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        mat = mat.userData.shiny ? VCMAT_SHINY : VCMAT;
      }
      const key = mat.uuid + '_' + Math.floor((p.x + 200) / CELL) + '_' + Math.floor((p.z + 200) / CELL);
      let grp = DESTR.groups.get(key);
      if (!grp) DESTR.groups.set(key, grp = { mat, list: [], mesh: null, orig: null, dirty: false });
      grp.list.push([g, p]);
    }
    p.o.parts = null;
  }
  for (const grp of DESTR.groups.values()) {
    const merged = mergeGeos(grp.list.map((e) => e[0]));
    let off = 0;
    for (const [g, p] of grp.list) { const n = g.attributes.position.count; p.ranges.push([grp, off, n]); off += n; g.dispose(); }
    grp.list = null;
    merged.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const mesh = new THREE.Mesh(merged, grp.mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    parent.add(mesh); grp.mesh = mesh; grp.orig = merged.attributes.position.array.slice();
  }
  DESTR.built = true;
}
function setPieceVisible(p, on) {
  for (const [grp, off, n] of p.ranges) {
    const a = grp.mesh.geometry.attributes.position.array;
    if (on) a.set(grp.orig.subarray(off * 3, (off + n) * 3), off * 3);
    else for (let i = off; i < off + n; i++) { a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z; }
    grp.dirty = true;
  }
}
function rayDestr(o, d, best, res) {
  const pcs = DESTR.pieces;
  for (let i = 0; i < pcs.length; i++) {
    const p = pcs[i]; if (!p.alive) continue;
    const cx = p.x - o.x, cy = p.y - o.y, cz = p.z - o.z, tc = cx * d.x + cy * d.y + cz * d.z;
    if (tc < -p.rad || tc > best + p.rad) continue;
    const ex = cx - d.x * tc, ey = cy - d.y * tc, ez = cz - d.z * tc;
    if (ex * ex + ey * ey + ez * ez > p.rad * p.rad) continue;
    const t = rayOBB(o, d, p, best);
    if (t < best) { best = t; res.t = t; res.kind = 'meuble'; res.meuble = p; res.n.copy(_rn); }
  }
  return best;
}
function hitPiece(p, dmg, dir, pt) {
  if (!p.alive) return;
  p.hp -= dmg;
  const k = p.kind;
  if (k === 'tissu') spawnPuff(pt, C('#fff0f6'), 0.22, 0.5, 0.4, false);
  else if (k === 'plante') { spawnPuff(pt, C('#9fe0b0'), 0.25, 0.5, 0.3, false); }
  else for (let i = 0; i < 3; i++) spawnSpark(pt.x, pt.y, pt.z, rnd(-2, 2), rnd(0, 2.5), rnd(-2, 2), 0.3);
  spawnDebrisBox(pt.x, pt.y, pt.z, 0.05, 0.05, 0.05, p.color, 1, 1000 + p.id, dir, 0.45);
  sHitPiece(k, pt);
  if (p.hp <= 0) breakPiece(p, dir, false, false);
}
function breakPiece(p, dir, quiet, fromNet) {
  if (!p.alive) return;
  p.alive = false; p.tDead = clockU.value;
  setPieceVisible(p, false);
  if (p.col) p.col.on = false;
  if (p.floor) p.floor.off = true;
  if (p.o.onBreak) p.o.onBreak(p);
  const kd = DKIND[p.kind] || DKIND.bois, vol = (p.hx * p.hy * p.hz) * 8;
  const n = Math.round(clamp(vol * 26, 4, quiet ? 6 : 16) * kd.n);
  spawnDebrisBox(p.x, p.y, p.z, p.hx, p.hy, p.hz, p.color, n, 1000 + p.id, dir, clamp(Math.cbrt(vol) * 0.9, 0.35, 1.3));
  if (!quiet) {
    _pp.set(p.x, p.y, p.z);
    if (p.kind === 'ecran') { for (let i = 0; i < 26; i++) spawnSpark(p.x, p.y, p.z, rnd(-4, 4), rnd(0, 5), rnd(-4, 4), rnd(0.4, 0.9)); spawnShards(p.x, p.y, p.z, p.ang, p.hx * 1.4, p.hy * 1.4, dir); spawnPuff(_pp, HDR('#9ff6ff', 1.2), 0.9, 0.5, 0.6, true); flashAt(p.x, p.y, p.z); }
    else if (p.kind === 'verre' || p.kind === 'lampe') { spawnShards(p.x, p.y, p.z, p.ang, p.hx * 2, p.hy * 2, dir); }
    else if (p.kind === 'tissu') { spawnPuff(_pp, C('#fff3f8'), 1.0, 1.0, 0.5, false); spawnDebrisBox(p.x, p.y + p.hy, p.z, p.hx, 0.1, p.hz, C('#fff6fa'), 10, 1000 + p.id, null, 0.3); }
    else if (p.kind === 'plante') { spawnPuff(_pp, C('#a9e8b8'), 0.9, 0.9, 0.4, false); }
    else spawnPuff(_pp, DUST, 0.8 + p.rad * 0.4, 0.8, 0.4, false);
    sBreakPiece(p.kind, p);
  }
  if (!fromNet && NET.on) NET.send('meuble', { i: p.id });
}
function restorePiece(p, quiet) {
  if (p.alive) return;
  p.alive = true; p.hp = p.maxHp;
  setPieceVisible(p, true);
  if (p.col) p.col.on = true;
  if (p.floor) p.floor.off = false;
  if (p.o.onRestore) p.o.onRestore(p);
  removeDebrisOf(1000 + p.id);
  if (!quiet) { for (let i = 0; i < 10; i++) spawnSpark(p.x + rnd(-p.hx, p.hx), p.y + rnd(-p.hy, p.hy), p.z + rnd(-p.hz, p.hz), rnd(-0.6, 0.6), rnd(0.5, 2), rnd(-0.6, 0.6), 0.7); }
}
function updateDestr(dt, players) {
  if (!DESTR.built) return;
  for (const grp of DESTR.groups.values()) if (grp.dirty) { grp.dirty = false; grp.mesh.geometry.attributes.position.needsUpdate = true; }
  DESTR.tick -= dt; if (DESTR.tick > 0) return;
  DESTR.tick = 0.5;
  const now = clockU.value;
  for (const p of DESTR.pieces) {
    if (p.alive || now - p.tDead < 35) continue;
    if (p.owner >= 0 && houses[p.owner] && houses[p.owner].collapsed) continue;
    let near = false; for (const pl of players) if (Math.abs(pl.x - p.x) < p.hx + 1.6 && Math.abs(pl.z - p.z) < p.hz + 1.6 && Math.abs(pl.y - p.y) < 3) near = true;
    if (!near) restorePiece(p);
  }
}
