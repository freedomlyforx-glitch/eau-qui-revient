/* =========================================================
   Monde physique : obstacles, sols, piscines, rayons
   ========================================================= */
const W_PLAYER = 1, W_MONSTER = 2, W_BALL = 4, W_SHEEP = 8, W_ALL = 15;
const GCELL = 8;
const colliders = [];
const colGrid = new Map();
function gkey(ix, iz) { return ix * 4096 + iz; }
function gridAdd(grid, obj, x0, z0, x1, z1) {
  const a = Math.floor(x0 / GCELL), b = Math.floor(x1 / GCELL), c = Math.floor(z0 / GCELL), d = Math.floor(z1 / GCELL);
  for (let ix = a; ix <= b; ix++) for (let iz = c; iz <= d; iz++) { const k = gkey(ix, iz); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(obj); }
}
let colStamp = 1, YOFF = 0; // YOFF : hauteur ajoutée à tout ce qui est posé (pour bâtir sur le promontoire)
function addBox(cx, cz, hx, hz, ang, y0, y1, who, tag) {
  const c = Math.cos(ang || 0), s = Math.sin(ang || 0);
  const col = { t: 'b', x: cx, z: cz, hx, hz, c, s, y0: y0 === undefined ? -50 : y0 + YOFF, y1: y1 === undefined ? 50 : y1 + YOFF, who: who || W_ALL, on: true, tag: tag || null, st: 0 };
  const ex = Math.abs(hx * c) + Math.abs(hz * s), ez = Math.abs(hx * s) + Math.abs(hz * c);
  colliders.push(col); gridAdd(colGrid, col, cx - ex, cz - ez, cx + ex, cz + ez);
  return col;
}
function addCircle(x, z, r, y0, y1, who, tag) {
  const col = { t: 'c', x, z, r, y0: y0 === undefined ? -50 : y0 + YOFF, y1: y1 === undefined ? 50 : y1 + YOFF, who: who || W_ALL, on: true, tag: tag || null, st: 0 };
  colliders.push(col); gridAdd(colGrid, col, x - r, z - r, x + r, z + r);
  return col;
}
function forCols(x, z, r, fn) {
  colStamp++;
  const a = Math.floor((x - r) / GCELL), b = Math.floor((x + r) / GCELL), c = Math.floor((z - r) / GCELL), d = Math.floor((z + r) / GCELL);
  for (let ix = a; ix <= b; ix++) for (let iz = c; iz <= d; iz++) {
    const l = colGrid.get(gkey(ix, iz)); if (!l) continue;
    for (let i = 0; i < l.length; i++) { const col = l[i]; if (col.st === colStamp) continue; col.st = colStamp; fn(col); }
  }
}
// repousse un cercle (pos.x, pos.z) hors des obstacles ; renvoie true en cas de contact
let _hit = false, _hitN = { x: 0, z: 0 };
function collide(pos, radius, feet, height, who) {
  _hit = false;
  for (let it = 0; it < 2; it++) forCols(pos.x, pos.z, radius + 2, (c) => {
    if (!c.on || !(c.who & who)) return;
    if (feet >= c.y1 || feet + height <= c.y0) return;
    if (c.step && c.y1 <= feet + 0.42) return;
    const dx = pos.x - c.x, dz = pos.z - c.z;
    if (c.t === 'c') {
      const d2 = dx * dx + dz * dz, r2 = c.r + radius;
      if (d2 < r2 * r2) { const d = Math.sqrt(d2) || 1e-4; const k = (r2 - d) / d; pos.x += dx * k; pos.z += dz * k; _hit = true; _hitN.x = dx / d; _hitN.z = dz / d; }
      return;
    }
    const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
    if (Math.abs(lx) > c.hx + radius || Math.abs(lz) > c.hz + radius) return;
    const qx = clamp(lx, -c.hx, c.hx), qz = clamp(lz, -c.hz, c.hz);
    const ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
    let nx, nz;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); if (d >= radius) return; const k = (radius - d) / d; nx = ex * k; nz = ez * k; }
    else { const px = c.hx - Math.abs(lx) + radius, pz = c.hz - Math.abs(lz) + radius; if (px < pz) { nx = Math.sign(lx || 1) * px; nz = 0; } else { nx = 0; nz = Math.sign(lz || 1) * pz; } }
    const wx = nx * c.c + nz * c.s, wz = -nx * c.s + nz * c.c;
    pos.x += wx; pos.z += wz; _hit = true;
    const wl = Math.hypot(wx, wz) || 1; _hitN.x = wx / wl; _hitN.z = wz / wl;
  });
  return _hit;
}
// un segment horizontal à la hauteur y traverse-t-il un obstacle ?
function segBlocked(ax, az, bx, bz, y, who) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  const n = Math.max(1, Math.ceil(L / 3));
  let blocked = false;
  for (let k = 0; k <= n && !blocked; k++) {
    const px = ax + dx * k / n, pz = az + dz * k / n;
    forCols(px, pz, 2, (c) => {
      if (blocked || !c.on || !(c.who & (who || W_ALL))) return;
      if (y < c.y0 || y > c.y1) return;
      if (segHitsCol(ax, az, bx, bz, c)) blocked = true;
    });
  }
  return blocked;
}
function segHitsCol(ax, az, bx, bz, c) {
  if (c.t === 'c') {
    const dx = bx - ax, dz = bz - az, fx = ax - c.x, fz = az - c.z;
    const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - c.r * c.r;
    if (cc < 0) return false;
    const disc = b * b - 4 * a * cc; if (disc < 0) return false;
    const t = (-b - Math.sqrt(disc)) / (2 * a); return t > 0 && t < 1;
  }
  const tl = (x, z) => { const dx = x - c.x, dz = z - c.z; return [dx * c.c - dz * c.s, dx * c.s + dz * c.c]; };
  const A = tl(ax, az), Bq = tl(bx, bz);
  if (Math.abs(A[0]) <= c.hx && Math.abs(A[1]) <= c.hz) return false; // départ à l'intérieur : on ignore
  if (Math.abs(Bq[0]) <= c.hx && Math.abs(Bq[1]) <= c.hz) return false;
  let t0 = 0, t1 = 1;
  const d = [Bq[0] - A[0], Bq[1] - A[1]], h = [c.hx, c.hz];
  for (let i = 0; i < 2; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (Math.abs(A[i]) > h[i]) return false; continue; }
    let ta = (-h[i] - A[i]) / d[i], tb = (h[i] - A[i]) / d[i]; if (ta > tb) { const t = ta; ta = tb; tb = t; }
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
  }
  return true;
}

/* ---------- sols ---------- */
const STEP = 0.45;
const floors = [];
const floorGrid = new Map();
function addFloorRect(x0, x1, z0, z1, top, extra) { top += YOFF; const f = Object.assign({ t: 'r', x0, x1, z0, z1, top }, extra || {}); floors.push(f); gridAdd(floorGrid, f, x0, z0, x1, z1); return f; }
function addFloorOBB(cx, cz, hx, hz, ang, top, extra) { top += YOFF; const c = Math.cos(ang), s = Math.sin(ang); const f = Object.assign({ t: 'b', x: cx, z: cz, hx, hz, c, s, top }, extra || {}); floors.push(f); const e = Math.abs(hx * c) + Math.abs(hz * s), e2 = Math.abs(hx * s) + Math.abs(hz * c); gridAdd(floorGrid, f, cx - e, cz - e2, cx + e, cz + e2); return f; }
function addFloorCircle(x, z, r, top, extra) { top += YOFF; const f = Object.assign({ t: 'c', x, z, r, top }, extra || {}); floors.push(f); gridAdd(floorGrid, f, x - r, z - r, x + r, z + r); return f; }
function addFloorRing(x, z, r0, r1, top, gapAng, gapHalf, extra) { top += YOFF; const f = Object.assign({ t: 'g', x, z, r0, r1, top, ga: gapAng, gh: gapHalf }, extra || {}); floors.push(f); gridAdd(floorGrid, f, x - r1, z - r1, x + r1, z + r1); return f; }
// toit en croupe (ou à deux pans) : la hauteur dépend de la position
function addFloorHip(cx, cz, hx, hz, ang, y0, H, gable, extra) {
  y0 += YOFF; const c = Math.cos(ang), s = Math.sin(ang);
  const f = Object.assign({ t: 'h', x: cx, z: cz, hx, hz, c, s, y0, H, k: H / (gable ? hz : Math.min(hx, hz)), gable: !!gable, top: y0 + H, ymin: y0 }, extra || {});
  floors.push(f); const e = Math.abs(hx * c) + Math.abs(hz * s), e2 = Math.abs(hx * s) + Math.abs(hz * c); gridAdd(floorGrid, f, cx - e, cz - e2, cx + e, cz + e2); return f;
}
// tronçon de toboggan : gouttière en U entre deux points
function addFloorSeg(ax, ay, az, bx, by, bz, w, extra) {
  ay += YOFF; by += YOFF;
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1e-3;
  const f = Object.assign({ t: 's', ax, ay, az, bx, by, bz, len, ux: dx / len, uz: dz / len, nx: -dz / len, nz: dx / len, w, top: Math.max(ay, by) + 0.4, ymin: Math.min(ay, by), slope: (ay - by) / len }, extra || {});
  floors.push(f); gridAdd(floorGrid, f, Math.min(ax, bx) - w, Math.min(az, bz) - w, Math.max(ax, bx) + w, Math.max(az, bz) + w); return f;
}
function floorTop(f, x, z) {
  if (f.off) return -Infinity;
  if (f.t === 'h') {
    const dx = x - f.x, dz = z - f.z, lx = Math.abs(dx * f.c - dz * f.s), lz = Math.abs(dx * f.s + dz * f.c);
    if (lx > f.hx || lz > f.hz) return -Infinity;
    return f.y0 + Math.min(f.H, f.k * (f.gable ? f.hz - lz : Math.min(f.hx - lx, f.hz - lz)));
  }
  if (f.t === 's') {
    const dx = x - f.ax, dz = z - f.az, al = dx * f.ux + dz * f.uz;
    if (al < -0.08 || al > f.len + 0.08) return -Infinity;
    const lat = dx * f.nx + dz * f.nz; if (Math.abs(lat) > f.w) return -Infinity;
    const q = lat / f.w; return f.ay + (f.by - f.ay) * clamp(al / f.len, 0, 1) + (f.R ? f.R - Math.sqrt(Math.max(0, f.R * f.R - lat * lat)) : 0.3 * q * q);
  }
  return inFloor(f, x, z) ? f.top : -Infinity;
}
function inFloor(f, x, z) {
  if (f.off) return false;
  if (f.t === 'r') return x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1;
  if (f.t === 'c') { const dx = x - f.x, dz = z - f.z; return dx * dx + dz * dz <= f.r * f.r; }
  if (f.t === 'b') { const dx = x - f.x, dz = z - f.z; return Math.abs(dx * f.c - dz * f.s) <= f.hx && Math.abs(dx * f.s + dz * f.c) <= f.hz; }
  if (f.t === 'g') {
    const dx = x - f.x, dz = z - f.z, r = Math.sqrt(dx * dx + dz * dz);
    if (r < f.r0 || r > f.r1) return false;
    let a = Math.atan2(dx, dz) - f.ga; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
    return Math.abs(a) > f.gh;
  }
  return false;
}
/* ---------- piscines ---------- */
const pools = [];
function poolAt(x, z) { for (let i = 0; i < pools.length; i++) { const p = pools[i]; if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && (!p.blob || blobEdge(p, x, z) > 0)) return p; } return inSea(x, z) ? SEA : null; }
// les lagons sont en pente douce depuis le bord, profonds au centre
function poolDepthAt(p, x, z) { if (!p.blob) return p.depth; const e = clamp(blobEdge(p, x, z) / 0.5, 0, 1); return lerp(p.rim, p.depth, e * e * (3 - 2 * e)); }
// garde un point dans le bassin ; renvoie true s'il touchait la paroi
function poolClamp(p, pos, m) {
  if (!p.blob) {
    const hit = pos.x < p.x0 + m || pos.x > p.x1 - m || pos.z < p.z0 + m || pos.z > p.z1 - m;
    pos.x = clamp(pos.x, p.x0 + m, p.x1 - m); pos.z = clamp(pos.z, p.z0 + m, p.z1 - m); return hit;
  }
  const qx = (pos.x - p.cx) / p.ax, qz = (pos.z - p.cz) / p.az, r = Math.hypot(qx, qz), lim = blobF(p, Math.atan2(qz, qx)) - m / Math.min(p.ax, p.az);
  if (r <= lim) return false;
  const k = lim / r; pos.x = p.cx + qx * k * p.ax; pos.z = p.cz + qz * k * p.az; return true;
}
let lastFloor = null;
function groundAt(x, z, feet) {
  if (feet === undefined) feet = 0;
  const p = poolAt(x, z);
  let h = p && !p.sea ? (p.y || 0) - poolDepthAt(p, x, z) : TH(x, z); lastFloor = null;
  const l = floorGrid.get(gkey(Math.floor(x / GCELL), Math.floor(z / GCELL)));
  if (l) for (let i = 0; i < l.length; i++) {
    const f = l[i];
    if (f.t === 'h' || f.t === 's') {
      if (f.off || f.ymin > feet + STEP) continue;
      const tp = floorTop(f, x, z); if (tp > h && tp <= feet + STEP) { h = tp; lastFloor = f; }
      continue;
    }
    if (f.top > h && f.top <= feet + STEP && inFloor(f, x, z)) { h = f.top; lastFloor = f; }
  }
  return h;
}
function waterLevelAt(x, z) { const p = poolAt(x, z); return p ? p.surf : -Infinity; }

/* ---------- rayons analytiques ---------- */
const _ro = new V3(), _rn = new V3();
// boîte orientée autour de Y : {x,y,z,hx,hy,hz,c,s} ; renvoie la distance ou Infinity (normale dans _rn)
function rayOBB(o, d, b, maxT) {
  const dx = o.x - b.x, dy = o.y - b.y, dz = o.z - b.z;
  const lo = [dx * b.c - dz * b.s, dy, dx * b.s + dz * b.c];
  const ld = [d.x * b.c - d.z * b.s, d.y, d.x * b.s + d.z * b.c];
  const h = [b.hx, b.hy, b.hz];
  let t0 = 0, t1 = maxT === undefined ? 1e9 : maxT, axis = -1, sign = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ld[i]) < 1e-9) { if (Math.abs(lo[i]) > h[i]) return Infinity; continue; }
    let ta = (-h[i] - lo[i]) / ld[i], tb = (h[i] - lo[i]) / ld[i], sg = -1;
    if (ta > tb) { const t = ta; ta = tb; tb = t; sg = 1; }
    if (ta > t0) { t0 = ta; axis = i; sign = sg; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return Infinity;
  }
  if (axis < 0) return Infinity;
  const ln = [0, 0, 0]; ln[axis] = sign;
  _rn.set(ln[0] * b.c + ln[2] * b.s, ln[1], -ln[0] * b.s + ln[2] * b.c);
  return t0;
}
function raySphere(o, d, cx, cy, cz, r) {
  const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : (cc < 0 ? 0.0001 : Infinity);
}
