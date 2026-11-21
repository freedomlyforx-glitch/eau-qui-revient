/* =========================================================
   Géométries utilitaires et assemblage par lots (par cellule de carte)
   ========================================================= */
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _pp = new V3(), _ss = new V3();
function M4(x, y, z, rx, ry, rz, sx, sy, sz) {
  _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_pp.set(x || 0, y || 0, z || 0), _q, _ss.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz));
}
function scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
function boxG(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  return g;
}
// boîte définie par ses bornes (pratique pour les panneaux)
function boxB(x0, x1, y0, y1, z0, z1) { const g = boxG(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; }
function flatG(w, d) { const g = new THREE.PlaneGeometry(w, d); scaleUV(g, w, d); g.rotateX(-Math.PI / 2); return g; }
function planeG(w, h) { return new THREE.PlaneGeometry(w, h); }
function hipRoofG(w, d, h) {
  const hw = w / 2, hd = d / 2;
  const A = [-hw, 0, hd], B = [hw, 0, hd], Cc = [hw, 0, -hd], D = [-hw, 0, -hd];
  let tris;
  if (w >= d) {
    const rx = hw - hd, r1 = [-rx, h, 0], r2 = [rx, h, 0];
    tris = [[A, B, r2, 'x'], [A, r2, r1, 'x'], [Cc, D, r1, 'x'], [Cc, r1, r2, 'x'], [B, Cc, r2, 'z'], [D, A, r1, 'z']];
  } else {
    const rz = hd - hw, r1 = [0, h, -rz], r2 = [0, h, rz];
    tris = [[A, B, r2, 'x'], [Cc, D, r1, 'x'], [B, Cc, r1, 'z'], [B, r1, r2, 'z'], [D, A, r2, 'z'], [D, r2, r1, 'z']];
  }
  const pos = [], uv = [];
  const slope = Math.sqrt(h * h + Math.min(hw, hd) * Math.min(hw, hd)) / h;
  for (const t of tris) for (let i = 0; i < 3; i++) { const p = t[i]; pos.push(p[0], p[1], p[2]); uv.push(t[3] === 'x' ? p[0] : p[2], p[1] * slope); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
// toit à deux pans (faîtage selon x) avec pignons
function gableRoofG(w, d, h) {
  const hw = w / 2, hd = d / 2;
  const pos = [], uv = [];
  const sl = Math.sqrt(h * h + hd * hd);
  const quad = (a, b, c, d2, u0, v0, u1, v1) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d2); uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); };
  quad([-hw, 0, hd], [hw, 0, hd], [hw, h, 0], [-hw, h, 0], -hw, 0, hw, sl);
  quad([hw, 0, -hd], [-hw, 0, -hd], [-hw, h, 0], [hw, h, 0], -hw, 0, hw, sl);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function gableEndG(w, h) { // triangle de pignon dans le plan XY
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([-w / 2, 0, w / 2, 0, 0, h], 2));
  g.computeVertexNormals(); return g;
}
function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const hasCol = list.some((g) => g.attributes.color), col = hasCol ? new Float32Array(n * 3).fill(1) : null;
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (col && g.attributes.color) col.set(g.attributes.color.array, o * 3);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}
function prepGeo(geo, m4) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (m4) g.applyMatrix4(m4);
  return g;
}
// fusionne une liste [geo, matrice] en une seule géométrie
function mergeList(items) { const gs = items.map(([g, m]) => prepGeo(g, m)); const out = mergeGeos(gs); gs.forEach((g) => g.dispose()); return out; }
const CELL = 72;
class Batch {
  constructor(name) { this.map = new Map(); this.name = name || 'lot'; }
  add(geo, mat, m4, cast, receive, surface) {
    cast = cast !== false; receive = receive !== false;
    const g = prepGeo(geo, m4);
    if (mat.userData.bake && VCMAT) {
      const n = g.attributes.position.count, c = mat.color, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      mat = mat.userData.shiny ? VCMAT_SHINY : VCMAT;
    }
    g.computeBoundingSphere();
    const bc = g.boundingSphere.center, big = g.boundingSphere.radius > CELL;
    const cell = big ? 'big' : Math.floor((bc.x + 200) / CELL) + '_' + Math.floor((bc.z + 200) / CELL);
    const key = mat.uuid + (cast ? 'c' : '') + (receive ? 'r' : '') + cell + (surface || '');
    if (!this.map.has(key)) this.map.set(key, { mat, cast, receive, surface, list: [] });
    this.map.get(key).list.push(g);
  }
  build(parent, surface, shootList) {
    const out = [];
    for (const { mat, cast, receive, list, surface: s2 } of this.map.values()) {
      const mesh = new THREE.Mesh(mergeGeos(list), mat);
      mesh.castShadow = cast; mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.userData.surface = s2 || surface || 'dur';
      if (mat.userData.depthMat) mesh.customDepthMaterial = mat.userData.depthMat;
      parent.add(mesh); out.push(mesh);
      if (shootList && !mat.userData.noShoot) shootList.push(mesh);
      list.forEach((g) => g.dispose());
    }
    this.map.clear();
    return out;
  }
}
