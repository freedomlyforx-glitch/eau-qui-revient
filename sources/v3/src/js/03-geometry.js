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
/* Une matière transparente « à deux faces » est dessinée en deux passes par le moteur, qui recherche en plus son programme à chaque fois.
   En doublant la géométrie (chaque triangle existe aussi retourné), la matière reste à une face : une seule passe. */
function twoSidedIndex(geo) {      // pour les matières sans éclairage : mêmes sommets, triangles retournés ajoutés à l'index
  const g = geo; if (!g.index) { const n = g.attributes.position.count, ix = []; for (let i = 0; i < n; i++) ix.push(i); g.setIndex(ix); }
  const a = Array.from(g.index.array), b = []; for (let i = 0; i < a.length; i += 3) b.push(a[i], a[i + 2], a[i + 1]);
  g.setIndex(a.concat(b)); return g;
}
function twoSided(geo) {           // pour les matières éclairées : sommets dédoublés, normales inversées au dos
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), out = new THREE.BufferGeometry();
  for (const name in g.attributes) {
    const at = g.attributes[name], n = at.count, sz = at.itemSize, src = at.array, dst = new src.constructor(n * 2 * sz); dst.set(src, 0);
    for (let t = 0; t < n; t += 3) for (let k = 0; k < 3; k++) { const so = (t + (k === 1 ? 2 : k === 2 ? 1 : 0)) * sz, d = (n + t + k) * sz; for (let c = 0; c < sz; c++) dst[d + c] = (name === 'normal' ? -1 : 1) * src[so + c]; }
    out.setAttribute(name, new THREE.BufferAttribute(dst, sz, at.normalized));
  }
  return out;
}
/* Ombres du décor fixe : pour dessiner une ombre, seule la forme compte, pas la matière. Au lieu d'un dessin par matière et par case
   de terrain, toutes les formes d'une même case sont réunies en une seule, qui ne sert qu'à la passe d'ombre (couche 3, invisible ailleurs). */
function mergeShadowCasters(meshes) {
  const groups = new Map();
  for (const m of meshes) {
    const mat = m.material, g = m.geometry;
    if (!m.castShadow || m.customDepthMaterial || Array.isArray(mat) || mat.alphaTest > 0 || mat.transparent || !mat.visible || !g.attributes.position) continue;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere.center, sk = mat.shadowSide !== null ? 's' + mat.shadowSide : 'm' + mat.side;
    const key = (g.boundingSphere.radius > CELL ? 'big' : Math.floor((c.x + 200) / CELL) + '_' + Math.floor((c.z + 200) / CELL)) + '|' + sk;
    if (!groups.has(key)) groups.set(key, { mat, list: [] });
    groups.get(key).list.push(m);
  }
  const mats = {};
  for (const { mat, list } of groups.values()) {
    if (list.length < 2) continue;
    let n = 0; for (const m of list) n += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
    const pos = new Float32Array(n * 3); let o = 0;
    for (const m of list) {
      const p = m.geometry.attributes.position, ix = m.geometry.index, cnt = ix ? ix.count : p.count;
      for (let i = 0; i < cnt; i++) { const k = ix ? ix.getX(i) : i; pos[o++] = p.getX(k); pos[o++] = p.getY(k); pos[o++] = p.getZ(k); }
      m.castShadow = false;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeBoundingSphere();
    const sk = mat.side + '_' + mat.shadowSide, sm = new THREE.Mesh(g, mats[sk] || (mats[sk] = new THREE.MeshBasicMaterial({ side: mat.side, shadowSide: mat.shadowSide })));
    sm.castShadow = true; sm.layers.set(3); sm.matrixAutoUpdate = false; sm.userData.noLampShadow = true; list[0].parent.add(sm);
  }
}
/* Lots d'objets identiques posés une fois pour toutes (panneaux, fleurs, buissons…) : on calcule la sphère qui les contient tous.
   Le moteur n'envoie alors plus le lot à la carte graphique quand il est entièrement hors du champ, ou hors de la zone d'ombre. */
const STATIC_IM = [];
const _fm = new THREE.Matrix4(), _fp = new V3(), _fq = new THREE.Quaternion(), _fs = new V3();
function fitInstanced(im, pad, sphere) {
  const g = im.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  let sph = sphere;
  if (!sph) {
    const r0 = g.boundingSphere.radius + g.boundingSphere.center.length(), box = new THREE.Box3(); let n = 0, rmax = 0;
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, _fm); _fm.decompose(_fp, _fq, _fs); const sc = Math.max(Math.abs(_fs.x), Math.abs(_fs.y), Math.abs(_fs.z)); if (sc < 1e-6) continue; box.expandByPoint(_fp); rmax = Math.max(rmax, sc * r0); n++; }
    if (!n) return;
    sph = new THREE.Sphere(); box.getBoundingSphere(sph); sph.radius += rmax + (pad || 0);
  }
  // une géométrie jumelle (mêmes tampons) porte la grande sphère ; les lancers de rayon gardent l'originale
  const g2 = new THREE.BufferGeometry(); g2.index = g.index; for (const k in g.attributes) g2.setAttribute(k, g.attributes[k]); g2.groups = g.groups; g2.boundingSphere = sph; g2.boundsTree = g.boundsTree;
  const ray0 = im.raycast;
  im.raycast = function (rc, out) { const cur = this.geometry; this.geometry = g; try { ray0.call(this, rc, out); } finally { this.geometry = cur; } };
  im.geometry = g2; im.frustumCulled = true;
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
    if (YOFF) g.translate(0, YOFF, 0);
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
