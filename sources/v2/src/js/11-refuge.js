/* =========================================================
   La maison refuge : verrouillable, indestructible, intérieur années 80
   ========================================================= */
const RF = REFUGE, RFB = 0.34, RFH = RF.h;
const refugeOut = std({ color: C('#bff3df'), map: T.stucco, roughness: 0.85 });
const refugeIn = std({ color: C('#ffffff'), map: T.panel, roughness: 0.75 });
const refugeGlass = std({ color: C('#d9f3ff'), map: T.glass, transparent: true, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
// mur percé d'ouvertures, le long de x (axis 'x') ou de z (axis 'z')
function refugeWall(axis, fixed, a, b, holes, outSign) {
  const T0 = 0.12, T1 = 0.08; // épaisseurs extérieure / lambris
  const piece = (u0, u1, y0, y1) => {
    if (u1 - u0 < 0.01 || y1 - y0 < 0.01) return;
    const uc = (u0 + u1) / 2, len = u1 - u0, yc = RFB + (y0 + y1) / 2, hh = y1 - y0;
    const fo = fixed + outSign * (T1 / 2 + 0.0) , fi = fixed - outSign * (T0 / 2);
    if (axis === 'x') { B.add(boxG(len, hh, T0), refugeOut, M4(uc, yc, fixed + outSign * 0.04)); B.add(boxG(len, hh, T1), refugeIn, M4(uc, yc, fixed - outSign * 0.06)); }
    else { B.add(boxG(T0, hh, len), refugeOut, M4(fixed + outSign * 0.04, yc, uc)); B.add(boxG(T1, hh, len), refugeIn, M4(fixed - outSign * 0.06, yc, uc)); }
  };
  const col = (u0, u1, y0, y1) => { const uc = (u0 + u1) / 2, h = (u1 - u0) / 2; if (axis === 'x') addBox(uc, fixed, h, 0.12, 0, RFB + y0 - (y0 === 0 ? 0.5 : 0), RFB + y1); else addBox(fixed, uc, 0.12, h, 0, RFB + y0 - (y0 === 0 ? 0.5 : 0), RFB + y1); };
  let u = a;
  holes.sort((p, q) => p.c - q.c);
  for (const ho of holes) {
    const h0 = ho.c - ho.w / 2, h1 = ho.c + ho.w / 2;
    piece(u, h0, 0, RFH); col(u, h0, 0, RFH);
    piece(h0, h1, 0, ho.y0); if (ho.y0 > 0) col(h0, h1, 0, ho.y0);
    piece(h0, h1, ho.y1, RFH); col(h0, h1, ho.y1, RFH);
    if (ho.glass) {
      const gy = RFB + (ho.y0 + ho.y1) / 2, gh = ho.y1 - ho.y0;
      const g = new THREE.Mesh(new THREE.PlaneGeometry(ho.w, gh), refugeGlass);
      if (axis === 'x') { g.position.set(ho.c, gy, fixed); } else { g.position.set(fixed, gy, ho.c); g.rotation.y = Math.PI / 2; }
      g.renderOrder = 3; world.add(g); g.userData.surface = 'verre-renforce'; SHOOT.push(g);
      col(h0, h1, ho.y0, ho.y1);
      // cadre blanc
      if (axis === 'x') { B.add(boxG(ho.w + 0.16, 0.08, 0.26), MAT.trim, M4(ho.c, RFB + ho.y1 + 0.04, fixed)); B.add(boxG(ho.w + 0.24, 0.08, 0.34), MAT.trim, M4(ho.c, RFB + ho.y0 - 0.04, fixed)); }
      else { B.add(boxG(0.26, 0.08, ho.w + 0.16), MAT.trim, M4(fixed, RFB + ho.y1 + 0.04, ho.c)); B.add(boxG(0.34, 0.08, ho.w + 0.24), MAT.trim, M4(fixed, RFB + ho.y0 - 0.04, ho.c)); }
    }
    u = h1;
  }
  piece(u, b, 0, RFH); col(u, b, 0, RFH);
}
const winH = { y0: 0.9, y1: 2.25, glass: true };
refugeWall('z', RF.x1 - 0.1, RF.z0, RF.z1, [{ c: 0, w: 1.1, y0: 0, y1: 2.25 }, Object.assign({ c: -3.4, w: 1.6 }, winH), Object.assign({ c: 3.4, w: 1.6 }, winH)], 1);
refugeWall('z', RF.x0 + 0.1, RF.z0, RF.z1, [Object.assign({ c: -2.6, w: 1.4 }, winH), Object.assign({ c: 2.6, w: 1.4 }, winH)], -1);
refugeWall('x', RF.z0 + 0.1, RF.x0 + 0.2, RF.x1 - 0.2, [Object.assign({ c: -101, w: 1.6 }, winH)], -1);
refugeWall('x', RF.z1 - 0.1, RF.x0 + 0.2, RF.x1 - 0.2, [Object.assign({ c: -101, w: 1.6 }, winH)], 1);
{
  const cx = (RF.x0 + RF.x1) / 2, cz = (RF.z0 + RF.z1) / 2, W = RF.x1 - RF.x0, Dz = RF.z1 - RF.z0;
  B.add(boxG(W + 0.2, RFB, Dz + 0.2), MAT.foundation, M4(cx, RFB / 2, cz));
  addFloorRect(RF.x0, RF.x1, RF.z0, RF.z1, RFB);
  B.add(flatG(W - 0.4, Dz - 0.4), MAT.wood, M4(cx, RFB + 0.004, cz), false, true);
  const top = RFB + RFH;
  const roofG = gableRoofG(Dz + 1.2, W + 1.2, 2.3);
  B.add(roofG, cached('refugeToit', () => std({ color: C('#f39ac0'), map: T.roof, roughness: 0.7 })), M4(cx, top, cz, 0, Math.PI / 2, 0));
  for (const sz of [RF.z0 + 0.02, RF.z1 - 0.02]) { const ge = gableEndG(W, 2.3); B.add(ge, refugeOut, M4(cx, top, sz, 0, sz < cz ? Math.PI : 0, 0), true, true); B.add(gableEndG(W - 0.3, 2.15), refugeIn, M4(cx, top, sz + (sz < cz ? 0.15 : -0.15), 0, sz < cz ? 0 : Math.PI, 0), false, true); }
  B.add(boxG(W - 0.2, 0.04, Dz - 0.2), cached('refugePlafond', () => std({ color: C('#ffe9d6'), roughness: 0.9 })), M4(cx, top - 0.02, cz), false, true);
  B.add(boxG(W + 0.3, 0.16, Dz + 0.3), MAT.trim, M4(cx, top, cz));
  // porche
  B.add(boxG(1.8, 0.25, 4.2), MAT.wood, M4(RF.x1 + 0.9, 0.125, 0)); addFloorRect(RF.x1, RF.x1 + 1.8, -2.1, 2.1, 0.25);
  for (const s of [-1, 1]) { B.add(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 10), MAT.trim, M4(RF.x1 + 1.6, 1.55, s * 1.9)); addCircle(RF.x1 + 1.6, s * 1.9, 0.12, -1, 2.85); }
  B.add(boxG(2.2, 0.14, 4.6), MAT.trim, M4(RF.x1 + 1.0, 2.9, 0)); addFloorRect(RF.x1 - 0.1, RF.x1 + 2.1, -2.3, 2.3, 2.97);
  // toit à deux pans praticable
  addFloorHip(cx, cz, (Dz + 1.2) / 2, (W + 1.2) / 2, Math.PI / 2, top, 2.3, true);
  // enseigne néon
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), new THREE.MeshBasicMaterial({ map: neonTex('refuge', '#ff6fb8', 512, 124), color: HDR('#ffffff', 2.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sign.position.set(RF.x1 + 0.02, RFB + 2.75, 0); sign.rotation.y = Math.PI / 2; world.add(sign);
  addSoft(RF.x1 + 1.6, 2.4, 0, '#ff8fcf', 1.4, 5);
  // allée, boîte aux lettres en cœur
  B.add(flatG(4, 1.4), MAT.concreteFlat, M4(RF.x1 + 3.8, 0.012, 0), false, true);
  for (let i = 0; i < 8; i++) bushes.push([RF.x1 + 0.6, 0.25, (i < 4 ? -5.4 + i * 0.75 : 2.6 + (i - 4) * 0.75), rr(0.4, 0.55), i % 2 ? '#ff9cc8' : '#c9a6f2']);
}
/* ---------- intérieur ---------- */
const PC_POS = new V3(RF.x0 + 0.955, RFB + 1.16, -4.3);
{
  const F = RFB;
  const P = (geo, mat, x, y, z, ry, cast) => B.add(geo, mat, M4(x, F + y, z, 0, ry || 0, 0), false, true);
  const velvet = colorMat('#d9774f', { roughness: 0.95 }), mustard = colorMat('#e8b54a', { roughness: 0.9 }), beige = colorMat('#ece0c8', { roughness: 0.6 }), mint = colorMat('#a6f0d8', { roughness: 0.4 }), pinkk = colorMat('#ff8fcf', { roughness: 0.45 });
  P(new THREE.CylinderGeometry(2.0, 2.0, 0.03, 40), cached('shag', () => std({ map: T.shag, roughness: 1 })), -100.6, 0.015, 0.4, 0, false);
  // canapé en velours et plaid
  P(boxG(0.9, 0.42, 2.6), velvet, -104.6, 0.21, 0.4); P(boxG(0.25, 0.6, 2.6), velvet, -105.05, 0.55, 0.4);
  P(boxG(0.9, 0.6, 0.25), velvet, -104.6, 0.3, -0.95); P(boxG(0.9, 0.6, 0.25), velvet, -104.6, 0.3, 1.75);
  P(boxG(0.7, 0.06, 1.1), mustard, -104.4, 0.46, 0.9, 0.1);
  addBox(-104.7, 0.4, 0.5, 1.48, 0, 0, F + 0.44); addFloorOBB(-104.6, 0.4, 0.42, 1.2, 0, F + 0.44);
  for (const z of [-0.2, 1.0]) P(boxG(0.18, 0.4, 0.5), pinkk, -104.9, 0.65, z);
  // télé, console, magnétoscope : contre le mur est, entre la porte et la fenêtre, tournée vers le canapé (la porte reste dégagée)
  {
    const tvx = -96.85, tvz = -1.95, ry = 0.3, cr = Math.cos(ry), sr = Math.sin(ry);
    const TV = (geo, mat, lx, y, lz) => B.add(geo, mat, M4(tvx + lx * cr + lz * sr, F + y, tvz - lx * sr + lz * cr, 0, ry, 0), false, true);
    TV(boxG(0.6, 0.5, 1.3), MAT.wood, 0, 0.25, 0); TV(boxG(0.75, 0.85, 1.05), MAT.tvBody, -0.02, 0.92, 0); TV(planeG(0.82, 0.6).rotateY(-Math.PI / 2), MAT.crt, -0.4, 0.95, 0);
    TV(boxG(0.32, 0.08, 0.42), colorMat('#d9d4dc'), -0.1, 0.54, -0.42); TV(boxG(0.36, 0.06, 0.4), MAT.black, -0.05, 0.53, 0.45);
    addBox(tvx, tvz, 0.42, 0.7, ry, 0, 1.4); addFloorOBB(tvx, tvz, 0.3, 0.6, ry, F + 1.35);
  }
  P(boxG(0.12, 0.03, 0.2), colorMat('#5a5468'), -99.6, 0.03, -0.9, 0.4); P(boxG(0.12, 0.03, 0.2), colorMat('#5a5468'), -99.9, 0.03, -0.1, -0.3);
  // pouf poire
  P(new THREE.SphereGeometry(0.55, 16, 12).scale(1, 0.6, 1), colorMat('#9b6cff', { roughness: 0.6 }), -99.6, 0.33, -2.6); addCircle(-99.6, -2.6, 0.5, 0, F + 0.6); addFloorCircle(-99.6, -2.6, 0.4, F + 0.6, { springy: true });
  // table basse et cube coloré
  P(boxG(1.0, 0.05, 0.6), MAT.wood, -101.6, 0.42, 0.4); addBox(-101.6, 0.4, 0.5, 0.3, 0, 0, F + 0.45); addFloorOBB(-101.6, 0.4, 0.48, 0.28, 0, F + 0.45); for (const a of [-0.42, 0.42]) for (const b of [-0.24, 0.24]) P(boxG(0.04, 0.4, 0.04), MAT.wood, -101.6 + a, 0.2, 0.4 + b);
  ['#ff4f5f', '#4f8fff', '#ffe24f', '#4fdf7f', '#ff9f3f', '#ffffff'].forEach((c, i) => P(boxG(0.035, 0.035, 0.035), colorMat(c), -101.5 + (i % 3) * 0.036, 0.465 + Math.floor(i / 3) * 0.036, 0.3));
  // bureau de l'ordinateur rétro
  P(boxG(0.8, 0.05, 1.7), MAT.wood, RF.x0 + 0.85, 0.75, -4.3); for (const a of [-0.35, 0.35]) for (const b of [-0.8, 0.8]) P(boxG(0.05, 0.75, 0.05), MAT.wood, RF.x0 + 0.85 + a, 0.375, -4.3 + b);
  P(boxG(0.5, 0.16, 0.6), beige, RF.x0 + 0.7, 0.86, -4.3); P(boxG(0.48, 0.42, 0.5), beige, RF.x0 + 0.68, 1.15, -4.3);
  P(boxG(0.04, 0.34, 0.42), MAT.black, RF.x0 + 0.93, 1.16, -4.3);
  P(boxG(0.18, 0.025, 0.46), beige, RF.x0 + 1.15, 0.79, -4.3); P(boxG(0.05, 0.04, 0.08), beige, RF.x0 + 1.15, 0.79, -3.85);
  P(boxG(0.1, 0.1, 0.12), colorMat('#ff8fcf'), RF.x0 + 1.0, 0.82, -3.7);
  P(boxG(0.45, 0.06, 0.45), pinkk, RF.x0 + 1.65, 0.48, -4.3); P(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), MAT.pole, RF.x0 + 1.65, 0.23, -4.3); P(boxG(0.06, 0.45, 0.4), pinkk, RF.x0 + 1.9, 0.75, -4.3);
  addBox(RF.x0 + 0.85, -4.3, 0.42, 0.88, 0, 0, 1.0);
  // cuisine mentholée
  P(boxG(2.6, 0.9, 0.6), mint, -100.4, 0.45, RF.z1 - 0.45); P(boxG(2.6, 0.05, 0.64), colorMat('#fff6fa'), -100.4, 0.92, RF.z1 - 0.43);
  P(boxG(0.8, 1.7, 0.7), mint, -98.3, 0.85, RF.z1 - 0.5); for (let i = 0; i < 5; i++) P(boxG(0.06, 0.06, 0.02), accentMat(i), -98.5 + i * 0.1, 1.2 + (i % 2) * 0.15, RF.z1 - 0.86, 0, false);
  addBox(-99.8, RF.z1 - 0.5, 1.75, 0.4, 0, 0, 1.8);
  // radiocassette, étagère à cassettes, tourne-disque
  P(boxG(0.4, 1.6, 1.6), MAT.wood, RF.x0 + 0.42, 0.8, 3.6); addBox(RF.x0 + 0.42, 3.6, 0.22, 0.8, 0, 0, 1.6);
  for (let i = 0; i < 14; i++) P(boxG(0.1, 0.07, 0.11), accentMat(i), RF.x0 + 0.45, 1.0 + Math.floor(i / 7) * 0.35, 3.0 + (i % 7) * 0.17, 0, false);
  P(boxG(0.25, 0.3, 0.7), colorMat('#3a3348', { metalness: 0.4, roughness: 0.3 }), RF.x0 + 0.45, 1.75, 3.6);
  for (const s of [-0.22, 0.22]) P(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16).rotateZ(Math.PI / 2), MAT.chrome, RF.x0 + 0.59, 1.75, 3.6 + s, 0, false);
  // lampe à lave, plante, téléphone, affiches
  P(new THREE.CylinderGeometry(0.12, 0.16, 0.2, 14), MAT.gold, -97.0, 0.1, -4.9); P(new THREE.CylinderGeometry(0.1, 0.13, 0.45, 16, 1, true), new THREE.MeshBasicMaterial({ color: HDR('#ff5fb0', 1.4), transparent: true, opacity: 0.85, side: THREE.DoubleSide }), -97.0, 0.42, -4.9, 0, false);
  P(new THREE.CylinderGeometry(0.25, 0.2, 0.45, 12), colorMat('#ffffff'), -97.2, 0.22, 5.0); addCircle(-97.2, 5.0, 0.35, 0, F + 1.1); for (let i = 0; i < 7; i++) P(new THREE.SphereGeometry(0.28, 8, 6).scale(1, 0.25, 0.6), colorMat('#4fae7f'), -97.2 + Math.cos(i) * 0.3, 0.75 + i * 0.07, 5.0 + Math.sin(i) * 0.3, i, false);
  P(boxG(0.4, 0.6, 0.4), MAT.wood, -104.8, 0.3, 4.6); addBox(-104.8, 4.6, 0.22, 0.22, 0, 0, F + 0.7); P(boxG(0.2, 0.08, 0.26), pinkk, -104.8, 0.64, 4.6); P(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 6).rotateX(Math.PI / 2), pinkk, -104.8, 0.72, 4.6, 0, false);
  const posters = [['1986', 'été sans fin', '#ff7fbf', '#3a2456', '#ffe27a'], ['RÊVE', 'ne te réveille pas', '#7ff0ff', '#5a4bd8', '#ff7fbf']];
  posters.forEach((pp, i) => B.add(planeG(0.9, 1.35), std({ map: posterTex(pp[0], pp[1], pp[2], pp[3], pp[4]), roughness: 0.6 }), M4(-102.6 + i * 3.2, F + 1.75, RF.z0 + 0.22), false, false));
  const homeSign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.55), new THREE.MeshBasicMaterial({ map: neonTex('doux foyer', '#7ff0ff', 512, 140), color: HDR('#ffffff', 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  homeSign.position.set(RF.x0 + 0.22, F + 2.35, 0.4); homeSign.rotation.y = Math.PI / 2; world.add(homeSign);
  // guirlande lumineuse
  for (let i = 0; i < 26; i++) { const t = i / 25; const x = lerp(RF.x0 + 0.4, RF.x1 - 0.4, t), z = (i % 2 ? 1 : -1) * 0.1 + Math.sin(t * Math.PI * 3) * 4.5; P(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: HDR(['#ffd27a', '#ff8fcf', '#7ff0ff'][i % 3], 4) }), x, RFH - 0.15 - Math.abs(Math.sin(t * 12)) * 0.12, z, 0, false); }
  addSoft(-101.5, F + 2.4, 0, '#ffb98a', 2.4, 7); addSoft(-104.5, F + 1.6, -4.0, '#7dffb8', 0.9, 3); addSoft(-97.2, F + 1.0, -4.9, '#ff6fb8', 1.2, 4, { flick: 0.15 });
  addZone((p) => (p.x > RF.x0 && p.x < RF.x1 && p.z > RF.z0 && p.z < RF.z1 && p.y < 4) ? 1 : 0, { fog: 0.0012, bloom: 0.7, expo: 1.0 });
}
// écran de l'ordinateur
const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshBasicMaterial({ map: T.pcScreen, color: HDR('#ffffff', 1.6) }));
pcScreen.position.set(RF.x0 + 0.955, RFB + 1.16, -4.3); pcScreen.rotation.y = Math.PI / 2; world.add(pcScreen);
// bulles de la lampe à lave
const lava = [];
for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04 + i * 0.01, 10, 8), new THREE.MeshBasicMaterial({ color: HDR('#ffd06f', 2.5) })); world.add(b); lava.push(b); }
// porte verrouillable
const refugeDoor = (() => {
  const pivot = new THREE.Group(); pivot.position.set(RF.x1 - 0.1, RFB, 0.55); pivot.rotation.y = Math.PI / 2;
  const leaf = new THREE.Mesh(boxB(0, 1.1, 0, 2.23, -0.035, 0.035), colorMat('#ff8fcf', { roughness: 0.45 })); leaf.castShadow = true; pivot.add(leaf);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), refugeGlass); win.position.set(0.55, 1.6, 0.04); pivot.add(win);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), MAT.gold); knob.position.set(0.95, 1.0, 0.06); pivot.add(knob);
  const lockLight = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: HDR('#7dffb8', 3) })); lockLight.position.set(0.95, 1.2, -0.06); pivot.add(lockLight);
  world.add(pivot);
  return { pivot, leaf, lockLight, open: 0, locked: false, col: addBox(RF.x1 - 0.1, 0, 0.08, 0.55, 0, RFB - 0.4, RFB + 2.25, W_ALL, 'porte-refuge') };
})();
function refugeInside(x, z, y) { return x > RF.x0 + 0.15 && x < RF.x1 - 0.15 && z > RF.z0 + 0.15 && z < RF.z1 - 0.15 && (y === undefined || y < 4); }
function toggleRefugeLock(fromNet) {
  refugeDoor.locked = !refugeDoor.locked;
  refugeDoor.lockLight.material.color.copy(refugeDoor.locked ? HDR('#ff5f7f', 3) : HDR('#7dffb8', 3));
  sLock(refugeDoor.locked);
  if (!fromNet && NET.on) NET.send('refuge', { l: refugeDoor.locked ? 1 : 0 });
  return refugeDoor.locked;
}
function updateRefuge(dt, players) {
  const d = refugeDoor;
  let near = false;
  if (!d.locked) for (const p of players) { const dx = p.x - (RF.x1 - 0.1), dz = p.z; if (dx * dx + dz * dz < 2.6 * 2.6 && p.y < 3) near = true; }
  const prev = d.open; d.open = damp(d.open, near ? 1.4 : 0, 6, dt);
  d.pivot.rotation.y = Math.PI / 2 + d.open;
  d.col.on = d.open < 0.5;
  if (prev < 0.15 && d.open >= 0.15) sDoor(RF.x1, 0);
  const t = clockU.value;
  lava.forEach((b, i) => b.position.set(-97.0 + Math.sin(t * 0.7 + i) * 0.03, RFB + 0.3 + (Math.sin(t * 0.35 + i * 2.1) * 0.5 + 0.5) * 0.28, -4.9 + Math.cos(t * 0.6 + i) * 0.03));
}
