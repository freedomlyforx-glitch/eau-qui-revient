/* =========================================================
   Maisons destructibles : murs en panneaux, vitres, portes, intérieurs,
   effondrement et reconstruction
   ========================================================= */
const PW = 1.6, PH = 3.2, FLOOR_Y = 0.34, GARAGE_Y = 0.15;
const WIN = { x: 0.6, y0: 0.5, y1: 2.4 }, DOOR = { x: 0.5, y1: 2.25 }, GAR = { y1: 2.5 };
const PANEL_HP = { mur: 14, fenetre: 12, porte: 12, garage: 10 };
const PGEO = {
  mur: { wall: boxB(-0.8, 0.8, 0, PH, -0.1, 0.1) },
  fenetre: {
    wall: mergeList([[boxB(-0.8, 0.8, 0, WIN.y0, -0.1, 0.1)], [boxB(-0.8, 0.8, WIN.y1, PH, -0.1, 0.1)], [boxB(-0.8, -WIN.x, WIN.y0, WIN.y1, -0.1, 0.1)], [boxB(WIN.x, 0.8, WIN.y0, WIN.y1, -0.1, 0.1)]]),
    trim: mergeList([[boxB(-0.7, 0.7, WIN.y1, WIN.y1 + 0.1, 0.1, 0.14)], [boxB(-0.7, -WIN.x, WIN.y0, WIN.y1, 0.1, 0.14)], [boxB(WIN.x, 0.7, WIN.y0, WIN.y1, 0.1, 0.14)], [boxB(-0.74, 0.74, WIN.y0 - 0.08, WIN.y0, 0.08, 0.22)],
      [boxB(-0.7, 0.7, WIN.y1, WIN.y1 + 0.08, -0.14, -0.1)], [boxB(-0.7, -WIN.x, WIN.y0, WIN.y1, -0.14, -0.1)], [boxB(WIN.x, 0.7, WIN.y0, WIN.y1, -0.14, -0.1)]])
  },
  porte: {
    wall: mergeList([[boxB(-0.8, -DOOR.x, 0, DOOR.y1, -0.1, 0.1)], [boxB(DOOR.x, 0.8, 0, DOOR.y1, -0.1, 0.1)], [boxB(-0.8, 0.8, DOOR.y1, PH, -0.1, 0.1)]]),
    trim: mergeList([[boxB(-0.62, 0.62, DOOR.y1, DOOR.y1 + 0.12, 0.1, 0.15)], [boxB(-0.62, -DOOR.x, 0, DOOR.y1, 0.1, 0.15)], [boxB(DOOR.x, 0.62, 0, DOOR.y1, 0.1, 0.15)]])
  },
  garage: { wall: boxB(-0.8, 0.8, GAR.y1, PH, -0.1, 0.1), door: boxB(-0.8, 0.8, 0, GAR.y1, -0.04, 0.04) }
};
const PSUB = { // sous-boîtes locales pour les tirs : [x0,x1,y0,y1,partie]
  mur: [[-0.8, 0.8, 0, PH, 'mur']],
  fenetre: [[-0.8, 0.8, 0, WIN.y0, 'mur'], [-0.8, 0.8, WIN.y1, PH, 'mur'], [-0.8, -WIN.x, WIN.y0, WIN.y1, 'mur'], [WIN.x, 0.8, WIN.y0, WIN.y1, 'mur'], [-WIN.x, WIN.x, WIN.y0, WIN.y1, 'vitre']],
  porte: [[-0.8, -DOOR.x, 0, DOOR.y1, 'mur'], [DOOR.x, 0.8, 0, DOOR.y1, 'mur'], [-0.8, 0.8, DOOR.y1, PH, 'mur']],
  garage: [[-0.8, 0.8, GAR.y1, PH, 'mur'], [-0.8, 0.8, 0, GAR.y1, 'garage']]
};
const wallMat = std({ color: C('#ffffff'), map: T.siding, roughness: 0.9 });
const trimIMMat = std({ color: C('#f7edf4'), roughness: 0.6 });
const gdoorMat = std({ color: C('#efe2ee'), map: T.garage, roughness: 0.55 });
const glassMat = std({ color: C('#d9f3ff'), map: T.glass, transparent: true, roughness: 0.05, metalness: 0.15, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
const panels = [], houses = [], glasses = [], shopGlass = [];
const ZERO4 = new THREE.Matrix4().makeScale(0, 0, 0);
// premier passage : on compte, second passage : on remplit les maillages instanciés
const HOUSE_SPECS = [];
function wallsFor(L) {
  const gs = L.gs, ox = -gs * 3.2, gx = ox + gs * 9.6;
  const walls = [];
  const front = []; for (let k = 0; k < 8; k++) front.push(k === (gs > 0 ? 5 : 2) ? 'porte' : (gs > 0 ? [1, 3] : [4, 6]).includes(k) ? 'fenetre' : 'mur');
  walls.push({ n: [0, 1], mid: [ox, -0.1], len: 12.8, types: front, base: FLOOR_Y, room: 0 });
  walls.push({ n: [0, -1], mid: [ox, -9.5], len: 12.8, types: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [1, 4, 6].includes(k) ? 'fenetre' : 'mur'), base: FLOOR_Y, room: 0 });
  for (const sd of [-1, 1]) {
    const isG = sd === gs; const types = [];
    for (let k = 0; k < 6; k++) {
      // u = (nz, -nx) : côté gauche u=+z (k=0 au fond), côté droit u=-z (k=0 devant)
      const back = sd < 0 ? 0 : 5;
      types.push(isG ? (k === back ? 'fenetre' : 'mur') : ([1, 4].includes(k) ? 'fenetre' : 'mur'));
    }
    walls.push({ n: [sd, 0], mid: [ox + sd * 6.3, -4.8], len: 9.6, types, base: FLOOR_Y, room: 0 });
  }
  const gf = []; for (let k = 0; k < 4; k++) gf.push((gs > 0 ? [0, 1, 2] : [1, 2, 3]).includes(k) ? 'garage' : 'mur');
  walls.push({ n: [0, 1], mid: [gx, 0.7], len: 6.4, types: gf, base: GARAGE_Y, room: 1 });
  walls.push({ n: [0, -1], mid: [gx, -5.5], len: 6.4, types: ['mur', 'mur', 'mur', 'mur'], base: GARAGE_Y, room: 1 });
  walls.push({ n: [gs, 0], mid: [gx + gs * 3.1, -2.4], len: 6.4, types: ['mur', 'fenetre', 'mur', 'mur'], base: GARAGE_Y, room: 1 });
  return { walls, ox, gx };
}
const counts = { mur: 0, fenetre: 0, porte: 0, garage: 0 };
HOUSE_LOTS.forEach((L) => { const s = wallsFor(L); HOUSE_SPECS.push(s); for (const w of s.walls) for (const t of w.types) counts[t]++; });
const IM = {};
for (const t of ['mur', 'fenetre', 'porte', 'garage']) {
  IM[t] = new THREE.InstancedMesh(PGEO[t].wall, wallMat, Math.max(1, counts[t]));
  IM[t].castShadow = true; IM[t].receiveShadow = true; IM[t].count = 0; IM[t].frustumCulled = false; world.add(IM[t]);
}
IM.trimF = new THREE.InstancedMesh(PGEO.fenetre.trim, trimIMMat, Math.max(1, counts.fenetre)); IM.trimF.count = 0;
IM.trimP = new THREE.InstancedMesh(PGEO.porte.trim, trimIMMat, Math.max(1, counts.porte)); IM.trimP.count = 0;
IM.gdoor = new THREE.InstancedMesh(PGEO.garage.door, gdoorMat, Math.max(1, counts.garage)); IM.gdoor.count = 0;
IM.glass = new THREE.InstancedMesh(new THREE.PlaneGeometry(WIN.x * 2, WIN.y1 - WIN.y0), glassMat, counts.fenetre + 40); IM.glass.count = 0;
for (const k of ['trimF', 'trimP', 'gdoor']) { IM[k].castShadow = true; IM[k].receiveShadow = true; IM[k].frustumCulled = false; world.add(IM[k]); }
IM.glass.frustumCulled = false; IM.glass.renderOrder = 3; world.add(IM.glass);
const _m = new THREE.Matrix4(), _sc3 = new V3();

function makeHouse(L, spec, hi) {
  const h = { id: hi, L, x: L.x, z: L.z, rot: L.rot, gs: L.gs, ox: spec.ox, gx: spec.gx, panels: [], dead: 0, collapsed: false, tCol: 0, anim: null, roofY: 0 };
  const cr = Math.cos(L.rot), sr = Math.sin(L.rot);
  h.toW = (lx, lz) => [L.x + lx * cr + lz * sr, L.z - lx * sr + lz * cr];
  h.M = M4(L.x, 0, L.z, 0, L.rot, 0);
  const wallCol = C(PASTELS[hi % PASTELS.length]);
  h.wallCol = wallCol; h.roofCol = ROOFS[(hi * 5 + 2) % ROOFS.length]; h.acc = (hi * 3 + 1) % ACCENTS.length;
  for (const w of spec.walls) {
    const nx = w.n[0], nz = w.n[1], ux = nz, uz = -nx;
    const th = Math.atan2(nx, nz);
    w.types.forEach((type, k) => {
      const off = -w.len / 2 + 0.8 + k * PW;
      const lx = w.mid[0] + ux * off, lz = w.mid[1] + uz * off;
      const [wx, wz] = h.toW(lx, lz);
      const ang = L.rot + th;
      const p = { id: panels.length, h, type, x: wx, y: w.base, z: wz, ang, c: Math.cos(ang), s: Math.sin(ang), hp: PANEL_HP[type], alive: true, tDead: 0, anim: 0, cols: [], glass: -1, room: w.room };
      p.mat = new THREE.Matrix4().compose(new V3(wx, w.base, wz), new THREE.Quaternion().setFromAxisAngle(UP, ang), new V3(1, 1, 1));
      p.wi = IM[type].count++; IM[type].setMatrixAt(p.wi, p.mat); IM[type].setColorAt(p.wi, wallCol);
      if (type === 'fenetre') {
        p.ti = IM.trimF.count++; IM.trimF.setMatrixAt(p.ti, p.mat);
        p.glass = glasses.length;
        const gm = p.mat.clone().multiply(new THREE.Matrix4().makeTranslation(0, (WIN.y0 + WIN.y1) / 2, 0));
        const g = { id: glasses.length, i: IM.glass.count++, panel: p, alive: true, mat: gm, tDead: 0, w: WIN.x * 2, h: WIN.y1 - WIN.y0, x: wx, y: w.base + (WIN.y0 + WIN.y1) / 2, z: wz, ang };
        IM.glass.setMatrixAt(g.i, gm); glasses.push(g);
      }
      if (type === 'porte') { p.ti = IM.trimP.count++; IM.trimP.setMatrixAt(p.ti, p.mat); }
      if (type === 'garage') { p.gi = IM.gdoor.count++; IM.gdoor.setMatrixAt(p.gi, p.mat); }
      // obstacles
      const cx = (lxo) => [wx + lxo * p.c, wz - lxo * p.s];
      const B0 = w.base, add = (lxo, hx, y0, y1, tag) => { const [ax, az] = cx(lxo); const col = addBox(ax, az, hx, 0.13, ang, y0, y1, W_ALL, tag); p.cols.push(col); return col; };
      if (type === 'mur') add(0, 0.8, B0 - 0.4, B0 + PH);
      else if (type === 'fenetre') { add(-0.7, 0.1, B0 - 0.4, B0 + PH); add(0.7, 0.1, B0 - 0.4, B0 + PH); add(0, 0.6, B0 - 0.4, B0 + WIN.y0); add(0, 0.6, B0 + WIN.y1, B0 + PH); p.gcol = add(0, 0.6, B0 + WIN.y0, B0 + WIN.y1, 'vitre'); }
      else if (type === 'porte') { add(-0.65, 0.15, B0 - 0.4, B0 + PH); add(0.65, 0.15, B0 - 0.4, B0 + PH); add(0, 0.8, B0 + DOOR.y1, B0 + PH); }
      else { add(0, 0.8, B0 + GAR.y1, B0 + PH); p.gdcol = add(0, 0.8, B0 - 0.4, B0 + GAR.y1); }
      panels.push(p); h.panels.push(p);
      if (type === 'porte') h.doorPanel = p;
    });
  }
  return h;
}
function furnish(h) {
  const gs = h.gs, ox = h.ox, F = FLOOR_Y;
  const LM = (u, y, w, ry) => h.M.clone().multiply(M4(ox + u * gs, F + y, w, 0, (ry || 0) * gs, 0));
  const S = (geo, mat, u, y, w, ry) => B.add(geo, mat, LM(u, y, w, ry), false, true);
  // un meuble : parties [géo, matériau, u, y, w, ry] + boîte (centre u, y, w ; demi-tailles)
  const piece = (kind, hp, u, yc, w, hx, hy, hz, parts, opts) => {
    const [wx, wz] = h.toW(ox + u * gs, w);
    return destrAdd(Object.assign({ parts: parts.map(([g, m, pu, py, pw, pry]) => [g, m, LM(pu, py, pw, pry)]), x: wx, y: F + yc, z: wz, hx, hy, hz, ang: h.rot, kind, hp, owner: h.id }, opts || {}));
  };
  const acc = accentMat(h.acc), acc2 = accentMat(h.acc + 2);
  S(flatG(12.4, 9.2), MAT.wood, 0, 0.004, -4.8);
  S(flatG(3.6, 2.8), MAT.carpet, -2.6, 0.012, -3.1);
  // canapé
  piece('tissu', 8, -2.6, 0.42, -1.22, 1.32, 0.42, 0.48, [
    [boxG(2.4, 0.42, 0.9), acc, -2.6, 0.21, -1.25], [boxG(2.4, 0.55, 0.22), acc, -2.6, 0.55, -0.85],
    [boxG(0.22, 0.6, 0.9), acc, -3.8, 0.3, -1.25], [boxG(0.22, 0.6, 0.9), acc, -1.4, 0.3, -1.25],
    [boxG(0.5, 0.35, 0.18), MAT.cushion, -3.2, 0.6, -1.0, -0.1], [boxG(0.5, 0.35, 0.18), MAT.cushion, -2.0, 0.6, -1.0, 0.1]
  ], { top: F + 0.43, topHz: 0.42, color: ACCENTS[h.acc % ACCENTS.length] });
  // table basse
  const legs = (mat, u, w, a, b, hgt) => { const l = []; for (const sa of [-a, a]) for (const sb of [-b, b]) l.push([boxG(0.05, hgt, 0.05), mat, u + sa, hgt / 2, w + sb]); return l; };
  piece('bois', 4, -2.6, 0.225, -3.0, 0.62, 0.225, 0.32, [[boxG(1.2, 0.06, 0.6), MAT.wood, -2.6, 0.42, -3.0]].concat(legs(MAT.wood, -2.6, -3.0, 0.5, 0.22, 0.4)), { top: F + 0.45 });
  // meuble télé et télé cathodique
  piece('bois', 5, -2.6, 0.25, -5.1, 0.8, 0.25, 0.23, [[boxG(1.6, 0.5, 0.45), MAT.wood, -2.6, 0.25, -5.1], [boxG(0.4, 0.06, 0.3), MAT.black, -2.2, 0.53, -5.05]], { top: F + 0.5 });
  piece('ecran', 4, -2.6, 0.81, -5.1, 0.4, 0.31, 0.3, [[boxG(0.8, 0.62, 0.6), MAT.tvBody, -2.6, 0.81, -5.1], [planeG(0.6, 0.45), MAT.crt, -2.6, 0.83, -4.795],
    [new THREE.CylinderGeometry(0.006, 0.006, 0.45, 4), MAT.black, -2.72, 1.3, -5.15, 0], [new THREE.CylinderGeometry(0.006, 0.006, 0.45, 4), MAT.black, -2.48, 1.3, -5.15, 0]], { top: F + 1.12, color: '#efd9c9' });
  // lampadaire, plante
  piece('lampe', 2, -5.4, 0.85, -1.0, 0.3, 0.85, 0.3, [[new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), MAT.pole, -5.4, 0.75, -1.0], [new THREE.CylinderGeometry(0.2, 0.3, 0.32, 14, 1, true), MAT.lampShade, -5.4, 1.6, -1.0], [new THREE.CylinderGeometry(0.18, 0.2, 0.03, 14), MAT.pole, -5.4, 0.015, -1.0]], { colBox: { r: 0.2 }, color: '#ffd9b8' });
  piece('plante', 2, -5.6, 0.6, -5.4, 0.45, 0.6, 0.45, [[new THREE.CylinderGeometry(0.22, 0.17, 0.4, 12), colorMat('#e8a283'), -5.6, 0.2, -5.4], [new THREE.IcosahedronGeometry(0.45, 1), colorMat('#6fbf8f'), -5.6, 0.75, -5.4], [new THREE.IcosahedronGeometry(0.3, 1), colorMat('#7fcf9a'), -5.45, 1.05, -5.3]], { colBox: { r: 0.3 } });
  // salle à manger : table et quatre chaises (avec des pieds cette fois)
  piece('bois', 6, 3.2, 0.385, -4.6, 0.82, 0.385, 0.52, [[boxG(1.6, 0.06, 1.0), MAT.white, 3.2, 0.74, -4.6]].concat(legs(MAT.white, 3.2, -4.6, 0.7, 0.4, 0.72)), { top: F + 0.77 });
  for (const [a, b] of [[-0.45, -0.75], [0.45, -0.75], [-0.45, 0.75], [0.45, 0.75]]) {
    const sb = Math.sign(b);
    piece('bois', 3, 3.2 + a, 0.46, -4.6 + b + sb * 0.01, 0.22, 0.46, 0.23, [[boxG(0.42, 0.05, 0.42), acc2, 3.2 + a, 0.46, -4.6 + b], [boxG(0.42, 0.45, 0.05), acc2, 3.2 + a, 0.7, -4.6 + b + sb * 0.2]].concat(legs(MAT.white, 3.2 + a, -4.6 + b, 0.17, 0.17, 0.44)), { top: F + 0.485, topHz: 0.2 });
  }
  // cuisine : plan de travail, évier, plaques, placards hauts, frigo
  piece('bois', 10, 3.65, 0.47, -9.0, 2.35, 0.47, 0.32, [[boxG(4.7, 0.9, 0.6), MAT.white, 3.65, 0.45, -9.0], [boxG(4.7, 0.05, 0.64), colorMat('#ffd6ba'), 3.65, 0.92, -8.98],
    [boxG(0.6, 0.04, 0.4), MAT.chrome, 4.6, 0.945, -9.0], [new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), MAT.chrome, 4.6, 1.1, -9.2], [boxG(0.6, 0.02, 0.5), MAT.black, 2.6, 0.95, -9.0]].concat([1.6, 2.8, 4.0, 5.2].map((u) => [boxG(0.02, 0.06, 0.02), MAT.chrome, u, 0.78, -8.69])), { top: F + 0.95 });
  S(boxG(1.2, 0.7, 0.35), acc2, 2.3, 1.95, -9.25);
  piece('metal', 9, 0.6, 0.9, -8.9, 0.4, 0.9, 0.35, [[boxG(0.8, 1.8, 0.7), colorMat('#a6f0d8', { roughness: 0.35 }), 0.6, 0.9, -8.9], [boxG(0.04, 0.5, 0.04), MAT.chrome, 0.9, 1.25, -8.53], [boxG(0.04, 0.3, 0.04), MAT.chrome, 0.9, 0.6, -8.53]].concat([0, 1, 2].map((i) => [boxG(0.1, 0.1, 0.02), accentMat(i + 1), 0.4 + i * 0.12, 1.4 - i * 0.15, -8.54])), { top: F + 1.8, color: '#a6f0d8' });
  // chambre : le lit fait rebondir
  piece('tissu', 8, -5.1, 0.3, -7.6, 1.05, 0.3, 0.8, [[boxG(2.1, 0.35, 1.6), MAT.wood, -5.1, 0.18, -7.6], [boxG(2.0, 0.18, 1.5), MAT.white, -5.1, 0.44, -7.6], [boxG(1.4, 0.06, 1.52), acc, -4.8, 0.55, -7.6], [boxG(0.35, 0.14, 0.6), MAT.cushion, -5.9, 0.6, -7.6], [boxG(0.1, 0.9, 1.6), MAT.wood, -6.15, 0.45, -7.6]],
    { top: F + 0.58, springy: true, color: ACCENTS[h.acc % ACCENTS.length] });
  piece('bois', 3, -5.8, 0.38, -9.0, 0.26, 0.38, 0.24, [[boxG(0.5, 0.5, 0.45), MAT.wood, -5.8, 0.25, -9.0], [new THREE.CylinderGeometry(0.1, 0.14, 0.2, 10, 1, true), MAT.lampShade, -5.8, 0.65, -9.0], [new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), MAT.pole, -5.8, 0.52, -9.0]], { top: F + 0.5 });
  // bibliothèque pleine de livres
  const books = [[boxG(1.6, 1.9, 0.35), MAT.wood, -1.6, 0.95, -9.2]];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) books.push([boxG(0.18, 0.32, 0.25), accentMat(i + r), -2.2 + i * 0.22, 0.25 + r * 0.45, -9.1]);
  piece('bois', 7, -1.6, 0.95, -9.2, 0.8, 0.95, 0.2, books, { top: F + 1.9, color: '#d9b48f' });
  // cadres aux murs, horloge
  S(boxG(0.9, 0.65, 0.03), colorMat('#fff6fa'), -2.6, 1.75, -0.32); S(planeG(0.78, 0.53), cached('cadre' + (h.id % 4), () => std({ map: posterTex(['VACANCES', 'MALIBU', 'ÉTÉ 86', 'MAISON'][h.id % 4], 'souvenir', ACCENTS[h.id % 6], '#3a2456', '#ffe27a'), roughness: 0.6 })), -2.6, 1.75, -0.34, Math.PI);
  S(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2), MAT.white, 5.5, 2.2, -9.33); S(boxG(0.02, 0.14, 0.02), MAT.black, 5.5, 2.24, -9.3); S(boxG(0.1, 0.02, 0.02), MAT.black, 5.54, 2.2, -9.3);
  // garage : étagère et cartons
  const gu = (h.gx - ox) * gs, GY = GARAGE_Y - F;
  S(flatG(6.0, 6.0), MAT.concrete, gu, GY + 0.005, -2.4);
  const shelf = [[boxG(2.6, 1.6, 0.4), MAT.pole, gu, GY + 0.8, -5.1]];
  for (let i = 0; i < 5; i++) shelf.push([boxG(0.3, 0.28, 0.3), accentMat(i), gu - 1.0 + i * 0.5, GY + 1.75, -5.1]);
  piece('metal', 7, gu, GY + 0.95, -5.1, 1.3, 0.95, 0.2, shelf, { top: GY + F + 1.9 });
  for (let i = 0; i < 3; i++) piece('carton', 2, gu - 1.6 + i * 0.7, GY + 0.23, -4.4 + (i % 2) * 0.3, 0.3, 0.23, 0.25, [[boxG(0.6, 0.45, 0.5), colorMat('#d9b48f'), gu - 1.6 + i * 0.7, GY + 0.23, -4.4 + (i % 2) * 0.3], [boxG(0.62, 0.04, 0.12), colorMat('#efd7b0'), gu - 1.6 + i * 0.7, GY + 0.46, -4.4 + (i % 2) * 0.3]], { top: GY + F + 0.46, color: '#d9b48f' });
  // lumière intérieure chaude
  const [lx, lz] = h.toW(ox - 1.0 * gs, -4.6);
  h.light = addSoft(lx, F + 2.5, lz, '#ffc49a', 1.9, 8.5);
}
function frontYard(h) {
  const L = h.L, fd = L.front, gs = h.gs;
  const P = (geo, mat, lx, y, lz, ry, cast) => B.add(geo, mat, h.M.clone().multiply(M4(lx, y, lz, 0, ry || 0, 0)), cast !== false, true);
  const dx = h.ox + gs * 2.4;
  P(boxG(h.gx - h.ox > 0 ? 12.92 : 12.92, 0.34, 9.72), MAT.foundation, h.ox, 0.17, -4.8);
  P(boxG(6.5, 0.15, 6.5), MAT.foundation, h.gx, 0.075, -2.4);
  P(boxG(2.0, 0.17, 1.1), MAT.concrete, dx, 0.085, 0.55);
  P(flatG(1.25, fd - 1.1), MAT.concreteFlat, dx, 0.012, 1.1 + (fd - 1.1) / 2, 0, false);
  P(flatG(5.6, fd - 0.8), MAT.concreteFlat, h.gx, 0.011, 0.8 + (fd - 0.8) / 2, 0, false);
  // boîte aux lettres
  const mx = h.gx + gs * 3.55, mz = fd - 0.45, acc = accentMat(h.acc);
  const mw = h.toW(mx, mz), MB = (geo, mat, lx, y, lz) => [geo, mat, h.M.clone().multiply(M4(lx, y, lz))];
  destrAdd({ parts: [MB(boxG(0.08, 1.05, 0.08), MAT.white, mx, 0.52, mz), MB(boxG(0.25, 0.14, 0.5), acc, mx, 1.12, mz), MB(new THREE.CylinderGeometry(0.125, 0.125, 0.5, 14), acc, mx, 1.19, mz), MB(boxG(0.03, 0.22, 0.05), MAT.flamingo, mx + 0.14, 1.28, mz + 0.12)],
    x: mw[0], y: 0.66, z: mw[1], hx: 0.16, hy: 0.66, hz: 0.27, ang: h.rot, kind: 'metal', hp: 3, color: ACCENTS[h.acc % ACCENTS.length], colBox: { r: 0.22 } });
  for (let x = -6.0; x < 6.2; x += 1.05) { const lx = h.ox + x; if (Math.abs(lx - dx) < 1.6) continue; const w = h.toW(lx, 0.75); bushes.push([w[0], 0.25, w[1], rr(0.4, 0.62), BUSH_COLORS[(R() * BUSH_COLORS.length) | 0]]); }
  // sols
  const [bx, bz] = h.toW(h.ox, -4.8); h.bodyFloor = addFloorOBB(bx, bz, 6.4, 4.8, L.rot, FLOOR_Y);
  const [gx2, gz2] = h.toW(h.gx, -2.4); addFloorOBB(gx2, gz2, 3.2, 3.2, L.rot, GARAGE_Y);
  const [px, pz] = h.toW(dx, 0.55); addFloorOBB(px, pz, 1.0, 0.55, L.rot, 0.17);
  h.inside = { x: bx, z: bz, hx: 6.2, hz: 4.6, c: Math.cos(L.rot), s: Math.sin(L.rot) };
  h.insideG = { x: gx2, z: gz2, hx: 3.0, hz: 3.0, c: Math.cos(L.rot), s: Math.sin(L.rot) };
}
function structure(h) {
  // toits, avant-toits, plafonds, poteaux d'angle et auvent du porche : un groupe qui tombe et revient
  const g = new THREE.Group(); world.add(g); h.roof = g;
  const roofMat = cached('r' + h.roofCol, () => std({ color: C(h.roofCol), map: T.roof, roughness: 0.75 }));
  const wcol = cached('wc' + h.id, () => std({ color: h.wallCol, map: T.siding, roughness: 0.9 }));
  const ceil = cached('ceil', () => std({ color: C('#fff1f6'), roughness: 0.9, side: THREE.DoubleSide }));
  const R0 = [], TR = [], CE = [], WC = [];
  const top = FLOOR_Y + PH, gtop = GARAGE_Y + PH, gs = h.gs, dx = h.ox + gs * 2.4;
  R0.push([hipRoofG(12.8 + 1.1, 9.6 + 1.1, 1.95), M4(h.ox, top + 0.1, -4.8)]);
  // cheminée (sur la pente arrière) et antenne
  const chu = h.ox - gs * 3.4, chw = -6.4, chy = top + 0.1 + Math.min(6.95 - 3.4, 5.35 - 1.6) * (1.95 / 5.35);
  TR.push([boxG(0.75, 1.9, 0.75), M4(chu, chy + 0.35, chw)]); R0.push([boxG(0.95, 0.12, 0.95), M4(chu, chy + 1.36, chw)]);
  if (h.id % 2 === 0) { TR.push([new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), M4(h.ox + gs * 1.2, top + 0.1 + 1.95 + 0.6, -4.8)]); TR.push([boxG(1.2, 0.03, 0.03), M4(h.ox + gs * 1.2, top + 0.1 + 1.95 + 1.2, -4.8)]); TR.push([boxG(0.8, 0.03, 0.03), M4(h.ox + gs * 1.2, top + 0.1 + 1.95 + 0.95, -4.8)]); }
  R0.push([hipRoofG(6.4 + 0.9, 6.4 + 0.9, 1.45), M4(h.gx, gtop + 0.1, -2.4)]);
  R0.push([hipRoofG(3.3, 2.15, 0.5), M4(dx, 2.9 + FLOOR_Y - 0.34, 0.85)]);
  TR.push([boxG(12.8 + 1.12, 0.2, 9.6 + 1.12), M4(h.ox, top + 0.02, -4.8)]);
  TR.push([boxG(6.4 + 0.92, 0.18, 6.4 + 0.92), M4(h.gx, gtop + 0.02, -2.4)]);
  TR.push([boxG(3.1, 0.16, 2.0), M4(dx, 2.83, 0.85)]);
  for (const s of [-1, 1]) TR.push([new THREE.CylinderGeometry(0.09, 0.11, 2.75, 10), M4(dx + s * 1.25, 1.375, 1.65)]);
  for (const [cxl, czl] of [[h.ox - 6.3, -0.1], [h.ox + 6.3, -0.1], [h.ox - 6.3, -9.5], [h.ox + 6.3, -9.5]]) TR.push([boxB(-0.16, 0.16, 0, PH, -0.16, 0.16), M4(cxl, FLOOR_Y, czl)]);
  for (const [cxl, czl] of [[h.gx + gs * 3.1, 0.7], [h.gx + gs * 3.1, -5.5], [h.gx - gs * 3.1, 0.7]]) TR.push([boxB(-0.15, 0.15, 0, PH, -0.15, 0.15), M4(cxl, GARAGE_Y, czl)]);
  CE.push([flatG(12.6, 9.4).rotateX(Math.PI), M4(h.ox, top - 0.01, -4.8)]);
  CE.push([flatG(6.2, 6.2).rotateX(Math.PI), M4(h.gx, gtop - 0.01, -2.4)]);
  WC.push([boxB(-0.1, 0.1, 0, PH, 0, 0.8), M4(h.ox + gs * 6.3, GARAGE_Y, 0)]);
  const mk = (list, mat) => { const geo = mergeList(list.map(([gg, m]) => [gg, h.M.clone().multiply(m)])); const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.surface = 'dur'; g.add(mesh); SHOOT.push(mesh); return mesh; };
  mk(R0, roofMat); mk(TR.concat(CE, WC), MAT.trim);
  const [ax, az] = h.toW(dx + 1.25, 1.65), [bx2, bz2] = h.toW(dx - 1.25, 1.65);
  h.postCols = [addCircle(ax, az, 0.16, -1, 2.8), addCircle(bx2, bz2, 0.16, -1, 2.8)];
  // on peut marcher sur les toits (et sur la cheminée)
  const W = (lx, lz) => h.toW(lx, lz);
  const [rx, rz] = W(h.ox, -4.8), [gx3, gz3] = W(h.gx, -2.4), [px3, pz3] = W(dx, 0.85), [cx3, cz3] = W(chu, chw);
  h.roofFloors = [addFloorHip(rx, rz, 6.95, 5.35, h.rot, top + 0.1, 1.95), addFloorHip(gx3, gz3, 3.65, 3.65, h.rot, gtop + 0.1, 1.45), addFloorHip(px3, pz3, 1.65, 1.075, h.rot, 2.9, 0.5), addFloorOBB(cx3, cz3, 0.37, 0.37, h.rot, chy + 1.42)];
  h.roofCols = [addBox(cx3, cz3, 0.38, 0.38, h.rot, chy - 0.6, chy + 1.42)];
}
function doorLeaf(h) {
  const p = h.doorPanel; if (!p) return;
  const pivot = new THREE.Group();
  pivot.position.set(p.x - 0.5 * p.c, p.y, p.z + 0.5 * p.s); pivot.rotation.y = p.ang;
  const leaf = new THREE.Mesh(boxB(0.0, 1.0, 0, DOOR.y1 - 0.02, -0.03, 0.03), accentMat(h.acc));
  leaf.castShadow = true; leaf.receiveShadow = true; pivot.add(leaf);
  world.add(pivot);
  h.door = { pivot, leaf, open: 0, target: 0, alive: true, hp: 10, p, col: addBox(p.x, p.z, 0.5, 0.06, p.ang, p.y - 0.4, p.y + DOOR.y1, W_ALL, 'porte') };
}
HOUSE_LOTS.forEach((L, i) => {
  const h = makeHouse(L, HOUSE_SPECS[i], i);
  frontYard(h); structure(h); furnish(h); doorLeaf(h);
  houses.push(h);
});
for (const k in IM) { IM[k].instanceMatrix.needsUpdate = true; if (IM[k].instanceColor) IM[k].instanceColor.needsUpdate = true; }
// voitures dans les allées
[0, 5, 9, 13].forEach((hi, k) => { const h = houses[hi]; if (!h) return; const fd = h.L.front; const p = h.toW(h.gx, Math.min(4.6, fd - 2.5)); car(p[0], p[1], h.rot + (k % 2 ? Math.PI : 0), ['#9fe7d2', '#ffb0cf', '#a9c8ff', '#ffe08a'][k]); });

/* ---------- état des panneaux ---------- */
function panelLocal(p, o) { const dx = o.x - p.x, dz = o.z - p.z; return [dx * p.c - dz * p.s, o.y - p.y, dx * p.s + dz * p.c]; }
function houseAt(x, z, inclGarage) {
  for (const h of houses) {
    for (const r of inclGarage ? [h.inside, h.insideG] : [h.inside]) {
      const dx = x - r.x, dz = z - r.z;
      if (Math.abs(dx * r.c - dz * r.s) <= r.hx && Math.abs(dx * r.s + dz * r.c) <= r.hz) return h;
    }
  }
  return null;
}
function setPanelVisible(p, s) {
  const m = s >= 1 ? p.mat : s <= 0 ? ZERO4 : _m.copy(p.mat).multiply(new THREE.Matrix4().makeScale(1, s, 1));
  IM[p.type].setMatrixAt(p.wi, m); IM[p.type].instanceMatrix.needsUpdate = true;
  if (p.ti !== undefined) { const im = p.type === 'fenetre' ? IM.trimF : IM.trimP; im.setMatrixAt(p.ti, m); im.instanceMatrix.needsUpdate = true; }
  if (p.gi !== undefined) { IM.gdoor.setMatrixAt(p.gi, m); IM.gdoor.instanceMatrix.needsUpdate = true; }
}
function setGlass(g, alive) {
  const im = g.im || IM.glass;
  g.alive = alive; im.setMatrixAt(g.i, alive ? g.mat : ZERO4); im.instanceMatrix.needsUpdate = true;
  if (g.col) g.col.on = alive;
  if (g.panel && g.panel.gcol) g.panel.gcol.on = alive && g.panel.alive;
  if (!alive) g.tDead = clockU.value;
}
function breakGlass(g, fromNet, dir) {
  if (!g.alive) return;
  setGlass(g, false);
  spawnShards(g.x, g.y, g.z, g.ang, g.w, g.h, dir);
  sGlass(g.x, g.y, g.z);
  if (!fromNet && NET.on) NET.send('vitre', { g: g.id, m: g.im ? 1 : 0 });
}
function destroyPanel(p, fromNet, dir, quiet) {
  if (!p.alive) return;
  p.alive = false; p.tDead = clockU.value; p.anim = 0;
  setPanelVisible(p, 0);
  p.cols.forEach((c) => (c.on = false));
  if (p.glass >= 0 && glasses[p.glass].alive) breakGlass(glasses[p.glass], true, dir);
  if (p.type === 'porte' && p.h.door) { p.h.door.pivot.visible = false; p.h.door.col.on = false; p.h.door.alive = false; }
  const col = p.h.wallCol;
  const cy = p.y + PH / 2;
  spawnDebris(p.x, cy, p.z, p.ang, col, quiet ? 5 : 10, p.h.id, dir);
  spawnPuff(_pp.set(p.x, cy, p.z), DUST, 1.4, 1.2, 0.5, false);
  if (!quiet) sCrumble(p.x, cy, p.z, 1);
  p.h.dead++;
  if (!fromNet && NET.on) NET.send('casse', { p: p.id });
  if (!p.h.collapsed && p.h.dead >= Math.ceil(p.h.panels.length * 0.42)) collapseHouse(p.h);
}
function damagePanel(p, dmg, dir) {
  if (!p.alive) return;
  p.hp -= dmg;
  if (p.hp <= 0) destroyPanel(p, false, dir);
}
function collapseHouse(h) {
  if (h.collapsed) return;
  h.collapsed = true; h.tCol = clockU.value; h.anim = { k: 'chute', t: 0 };
  h.panels.forEach((p, i) => { if (p.alive) setTimeout(() => destroyPanel(p, true, null, true), 120 + Math.random() * 700); });
  if (h.light) h.light.k = 0.6;
  h.postCols.forEach((c) => (c.on = false));
  h.roofFloors.forEach((f) => (f.off = true)); h.roofCols.forEach((c) => (c.on = false));
  setTimeout(() => { for (const p of DESTR.pieces) if (p.owner === h.id && p.alive) breakPiece(p, null, true, true); }, 500);
  const [cx, cz] = h.toW(h.ox, -4.8);
  setTimeout(() => {
    for (let i = 0; i < 4; i++) spawnRing(cx, 0.2, cz, 1, 9 + i * 3, 1.4 + i * 0.3, DUST_RING);
    for (let i = 0; i < 10; i++) spawnPuff(_pp.set(cx + rnd(-6, 6), rnd(0.5, 3), cz + rnd(-5, 5)), DUST, 3.2, 2.2, 0.6, false);
    spawnDebris(cx, 3.6, cz, h.rot, C(h.roofCol), 22, h.id, null, 5.5);
    sCrumble(cx, 2, cz, 2.2);
    shakeAt(cx, cz, 1.2);
  }, 650);
}
function rebuildPanel(p, delay) {
  p.alive = true; p.hp = PANEL_HP[p.type]; p.anim = clockU.value + (delay || 0);
  setPanelVisible(p, 0.001);
  p.cols.forEach((c) => (c.on = true));
  if (p.glass >= 0) { const g = glasses[p.glass]; g.pending = true; }
  if (p.type === 'porte' && p.h.door) { const d = p.h.door; d.pivot.visible = true; d.alive = true; d.hp = 10; d.col.on = d.open < 0.5; }
  p.h.dead = Math.max(0, p.h.dead - 1);
  removeDebrisOf(p.h.id, p);
}
function rebuildHouse(h) {
  h.collapsed = false; h.anim = { k: 'retour', t: 0 }; h.roof.visible = true; h.roof.position.y = 16; h.roof.rotation.set(0, 0, 0);
  h.panels.forEach((p, i) => { if (!p.alive) rebuildPanel(p, 0.05 * i); });
  h.dead = 0; if (h.light) h.light.k = 1.9;
  h.postCols.forEach((c) => (c.on = true));
  for (const p of DESTR.pieces) if (p.owner === h.id && !p.alive) restorePiece(p, true);
  removeDebrisOf(h.id);
  sRebuild(h.x, 2, h.z);
}
let houseTick = 0;
function updateHouses(dt, players) {
  const now = clockU.value;
  // animations de panneaux qui repoussent
  for (const p of panels) {
    if (p.anim && p.alive) {
      const t = (now - p.anim) / 0.7;
      if (t >= 1) { setPanelVisible(p, 1); p.anim = 0; if (p.glass >= 0 && glasses[p.glass].pending) { glasses[p.glass].pending = false; setGlass(glasses[p.glass], true); } }
      else if (t > 0) { setPanelVisible(p, easeOut(t)); if (Math.random() < 0.3) spawnSpark(p.x + rnd(-0.8, 0.8), p.y + PH * easeOut(t), p.z + rnd(-0.8, 0.8), rnd(-0.5, 0.5), rnd(0.5, 2), rnd(-0.5, 0.5), 0.6); }
    }
  }
  for (const h of houses) {
    if (h.anim) {
      h.anim.t += dt;
      if (h.anim.k === 'chute') {
        const t = Math.min(1, h.anim.t / 1.1);
        h.roof.position.y = -PH * easeInOut(t) * 0.95; h.roof.rotation.z = 0.05 * Math.sin(t * 3);
        if (t >= 1) { h.roof.visible = false; h.anim = null; }
      } else if (h.anim.k === 'retour') {
        const t = Math.min(1, h.anim.t / 2.6);
        h.roof.position.y = 16 * (1 - easeOut(t)); h.roof.rotation.y = 0;
        if (Math.random() < 0.5) spawnSpark(h.x + rnd(-6, 6), h.roof.position.y + 4, h.z + rnd(-6, 6), 0, -1, 0, 0.8);
        if (t >= 1) { h.roof.position.y = 0; h.anim = null; h.roofFloors.forEach((f) => (f.off = false)); h.roofCols.forEach((c) => (c.on = true)); }
      }
    }
    // porte d'entrée automatique
    const d = h.door;
    if (d && d.alive) {
      let near = false;
      for (const pl of players) { const dx = pl.x - d.p.x, dz = pl.z - d.p.z; if (dx * dx + dz * dz < 2.6 * 2.6 && Math.abs(pl.y - d.p.y) < 2) near = true; }
      d.target = near ? 1.35 : 0;
      const prev = d.open; d.open = damp(d.open, d.target, 6, dt);
      d.pivot.rotation.y = d.p.ang + d.open;
      d.col.on = d.open < 0.5;
      if (prev < 0.15 && d.open >= 0.15 && near) sDoor(d.p.x, d.p.z);
    }
  }
  houseTick -= dt;
  if (houseTick > 0) return;
  houseTick = 0.5;
  for (const p of panels) {
    if (!p.alive && !p.h.collapsed && now - p.tDead > 30) {
      let block = false; for (const pl of players) if (Math.hypot(pl.x - p.x, pl.z - p.z) < 1.4) block = true;
      if (!block) rebuildPanel(p);
    }
  }
  for (const g of glasses) if (!g.alive && !g.pending && g.panel.alive && now - g.tDead > 25) setGlass(g, true);
  for (const g of shopGlass) if (!g.alive && now - g.tDead > 25) setGlass(g, true);
  for (const h of houses) {
    if (h.collapsed && !h.anim && now - h.tCol > 40) {
      let inside = false; for (const pl of players) if (houseAt(pl.x, pl.z, true) === h) inside = true;
      if (!inside) rebuildHouse(h);
    }
  }
}
// tir : renvoie le panneau, la vitre ou la porte touché(e)
const _lo = new V3(), _ld = new V3();
function rayHouses(o, d, maxT, res) {
  let best = maxT;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (!p.alive) continue;
    const cx = p.x - o.x, cz = p.z - o.z, cy = p.y + PH / 2 - o.y;
    const tc = cx * d.x + cy * d.y + cz * d.z;
    if (tc < -2 || tc > best + 2) continue;
    const ex = cx - d.x * tc, ey = cy - d.y * tc, ez = cz - d.z * tc;
    if (ex * ex + ey * ey + ez * ez > 4.5) continue;
    const subs = PSUB[p.type];
    for (const s of subs) {
      if (s[4] === 'vitre' && !(p.glass >= 0 && glasses[p.glass].alive)) continue;
      const lx = (s[0] + s[1]) / 2, hx = (s[1] - s[0]) / 2;
      const box = { x: p.x + lx * p.c, y: p.y + (s[2] + s[3]) / 2, z: p.z - lx * p.s, hx, hy: (s[3] - s[2]) / 2, hz: s[4] === 'vitre' ? 0.03 : s[4] === 'garage' ? 0.05 : 0.11, c: p.c, s: p.s };
      const t = rayOBB(o, d, box, best);
      if (t < best) { best = t; res.t = t; res.kind = s[4] === 'vitre' ? 'vitre' : 'panneau'; res.panel = p; res.glass = s[4] === 'vitre' ? glasses[p.glass] : null; res.n.copy(_rn); }
    }
  }
  for (const h of houses) {
    const dd = h.door; if (!dd || !dd.alive) continue;
    const a = dd.p.ang + dd.open, c = Math.cos(a), s = Math.sin(a);
    const box = { x: dd.pivot.position.x + 0.5 * c, y: dd.p.y + DOOR.y1 / 2, z: dd.pivot.position.z - 0.5 * s, hx: 0.5, hy: DOOR.y1 / 2, hz: 0.04, c, s };
    const t = rayOBB(o, d, box, best);
    if (t < best) { best = t; res.t = t; res.kind = 'porte'; res.door = dd; res.house = h; res.n.copy(_rn); }
  }
  return best;
}
function damageDoor(dd, dmg, dir) {
  dd.hp -= dmg;
  if (dd.hp <= 0 && dd.alive) { dd.alive = false; dd.pivot.visible = false; dd.col.on = false; spawnDebris(dd.p.x, dd.p.y + 1, dd.p.z, dd.p.ang, C(ACCENTS[dd.p.h.acc]), 6, dd.p.h.id, dir); sCrumble(dd.p.x, 1, dd.p.z, 0.6); }
}
