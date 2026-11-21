/* =========================================================
   Kit de construction : murs percés, garde-corps, enseignes néon,
   guirlandes d'ampoules (et leurs reflets sur l'eau)
   ========================================================= */
const kitGlass = std({ color: C('#d9f3ff'), map: T.glass, transparent: true, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
const stuccoFor = (col) => cached('st' + col, () => std({ color: C(col), map: T.stucco, roughness: 0.85 }));
// ajoute un objet libre au monde en respectant la hauteur de construction courante
function wadd(m, surf) { m.position.y += YOFF; world.add(m); if (surf) { m.userData.surface = surf; SHOOT.push(m); } return m; }
/* ---------- murs et vitres cassables : tout ce que bâtit kitWall peut être démoli au tir, puis se répare ---------- */
const KW = { walls: [], panes: [], grp: new Map(), glassIM: null, tick: 0 };
const KW_HP = 12, KW_SEG = 1.7, _qI = new THREE.Quaternion();
// habillage en coordonnées du monde : une boîte étirée garde une texture à la bonne échelle
const kwWorldUV = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', '#ifdef USE_UV\n{ vec3 wn = abs( inverseTransformDirection( transformedNormal, viewMatrix ) ); vec2 wuv = wn.y > 0.6 ? vSoftW.xz : ( wn.x > wn.z ? vSoftW.zy : vSoftW.xy ); vUv = ( uvTransform * vec3( wuv, 1.0 ) ).xy; }\n#endif\n#include <fog_vertex>'); };
kwWorldUV.key = 'wuv';
function kwBox(mat, x, y, z, sx, sy, sz) {
  let g = KW.grp.get(mat); if (!g) { g = { mat, list: [], im: null }; KW.grp.set(mat, g); }
  const h = { g, i: g.list.length, m: new THREE.Matrix4().compose(new V3(x, y + YOFF, z), _qI, new V3(sx, sy, sz)) }; g.list.push(h); return h;
}
function kwPane(axis, fixed, uc, yc, w, h) {
  const X = axis === 'x', p = { id: KW.panes.length, x: X ? uc : fixed, y: yc + YOFF, z: X ? fixed : uc, hx: X ? w / 2 : 0.03, hy: h / 2, hz: X ? 0.03 : w / 2, c: 1, s: 0, ang: X ? 0 : Math.PI / 2, w, h, alive: true, tDead: 0, i: KW.panes.length };
  p.m = new THREE.Matrix4().compose(new V3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(UP, p.ang), new V3(w, h, 1));
  p.col = X ? addBox(uc, fixed, w / 2, 0.06, 0, yc - h / 2, yc + h / 2) : addBox(fixed, uc, 0.06, w / 2, 0, yc - h / 2, yc + h / 2);
  KW.panes.push(p); return p;
}
// mur le long de x (axis 'x', z fixe) ou de z (axis 'z', x fixe) ; trous : [{ c, w, y0, y1, glass }]
function kitWall(axis, fixed, a, b, base, H, holes, matOut, matIn, outSign, th) {
  th = th || 0.2; const q = th / 4, X = axis === 'x';
  // un pan de mur, découpé en tronçons d'environ 1,7 m qui tombent un par un
  const mk = (u0, u1, y0, y1) => {
    const out = []; if (u1 - u0 < 0.01 || y1 - y0 < 0.01) return out;
    const n = Math.max(1, Math.ceil((u1 - u0) / KW_SEG - 0.01));
    for (let k = 0; k < n; k++) {
      const s0 = lerp(u0, u1, k / n), s1 = lerp(u0, u1, (k + 1) / n), uc = (s0 + s1) / 2, len = s1 - s0, yc = base + (y0 + y1) / 2, hh = y1 - y0;
      const px = X ? uc : fixed, pz = X ? fixed : uc, ox = X ? 0 : outSign * q, oz = X ? outSign * q : 0;
      const w = { id: KW.walls.length, x: px, y: yc + YOFF, z: pz, hx: X ? len / 2 : th / 2, hy: hh / 2, hz: X ? th / 2 : len / 2, c: 1, s: 0, alive: true, hp: KW_HP, tDead: 0, color: matOut.color, parts: [], u0: s0, u1: s1 };
      w.parts.push(kwBox(matOut, px + ox, yc, pz + oz, X ? len : th / 2, hh, X ? th / 2 : len), kwBox(matIn, px - ox, yc, pz - oz, X ? len : th / 2, hh, X ? th / 2 : len));
      w.col = X ? addBox(uc, fixed, len / 2, th / 2, 0, base + y0 - (y0 === 0 ? 0.5 : 0), base + y1) : addBox(fixed, uc, th / 2, len / 2, 0, base + y0 - (y0 === 0 ? 0.5 : 0), base + y1);
      KW.walls.push(w); out.push(w);
    }
    return out;
  };
  const trim = (w, y, hh, dep) => w.parts.push(X ? kwBox(MAT.trim, (w.u0 + w.u1) / 2, y, fixed, w.u1 - w.u0 + 0.02, hh, dep) : kwBox(MAT.trim, fixed, y, (w.u0 + w.u1) / 2, dep, hh, w.u1 - w.u0 + 0.02));
  let u = a;
  for (const ho of (holes || []).slice().sort((p, r) => p.c - r.c)) {
    const h0 = ho.c - ho.w / 2, h1 = ho.c + ho.w / 2, y0 = ho.y0 || 0;
    mk(u, h0, 0, H); const below = mk(h0, h1, 0, y0), above = mk(h0, h1, ho.y1, H);
    if (ho.glass) {
      for (const w of above) trim(w, base + ho.y1 + 0.035, 0.07, th + 0.06);
      for (const w of below) trim(w, base + y0 + 0.02, 0.07, th + 0.1);
      // une vitre par travée, des montants fins entre les travées des grandes baies
      const nm = Math.floor(ho.w / 1.7), pw = ho.w / (nm + 1), yc = base + (y0 + ho.y1) / 2, ph = ho.y1 - y0;
      for (let i = 0; i <= nm; i++) kwPane(axis, fixed, h0 + pw * (i + 0.5), yc, pw, ph);
      for (let i = 1; i <= nm; i++) {
        const uu = h0 + pw * i, hd = X ? kwBox(MAT.trim, uu, yc, fixed, 0.05, ph, 0.07) : kwBox(MAT.trim, fixed, yc, uu, 0.07, ph, 0.05);
        const own = above.find((w) => uu >= w.u0 - 0.01 && uu <= w.u1 + 0.01); if (own) own.parts.push(hd);
      }
    }
    u = h1;
  }
  mk(u, b, 0, H);
}
function buildKit() {
  const unit = new THREE.BoxGeometry(1, 1, 1);
  for (const g of KW.grp.values()) {
    const m = g.mat.map ? cached('kw' + g.mat.uuid, () => std({ color: g.mat.color.clone(), map: g.mat.map, normalMap: g.mat.normalMap || null, roughness: g.mat.roughness, metalness: g.mat.metalness, envMapIntensity: g.mat.envMapIntensity }, kwWorldUV)) : g.mat;
    if (g.mat.map && g.mat.normalMap) m.normalScale.copy(g.mat.normalScale);
    g.im = new THREE.InstancedMesh(unit, m, g.list.length); g.list.forEach((h) => g.im.setMatrixAt(h.i, h.m));
    g.im.castShadow = true; g.im.receiveShadow = true; g.im.frustumCulled = false; world.add(g.im);
  }
  if (KW.panes.length) {
    KW.glassIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), kitGlass, KW.panes.length); KW.panes.forEach((p) => KW.glassIM.setMatrixAt(p.i, p.m));
    KW.glassIM.frustumCulled = false; KW.glassIM.renderOrder = 3; world.add(KW.glassIM);
  }
}
function kwShow(w, on) { for (const h of w.parts) { h.g.im.setMatrixAt(h.i, on ? h.m : ZERO4); h.g.im.instanceMatrix.needsUpdate = true; } w.col.on = on; }
function kwDestroy(w, fromNet, dir) {
  if (!w || !w.alive) return;
  w.alive = false; w.tDead = clockU.value; kwShow(w, false);
  spawnDebrisBox(w.x, w.y, w.z, w.hx, w.hy, w.hz, w.color, Math.round(clamp(w.hx * w.hy * w.hz * 60 + 3, 3, 9)), 5000 + w.id, dir);
  spawnPuff(_pp.set(w.x, w.y, w.z), DUST, 1.2, 1.1, 0.5, false); sCrumble(w.x, w.y, w.z, 0.8);
  if (!fromNet && NET.on) NET.send('casse', { k: w.id });
}
function kwDamage(w, dmg, dir) { if (!w.alive) return; w.hp -= dmg; if (w.hp <= 0) kwDestroy(w, false, dir); }
function kwPaneSet(p, on) { p.alive = on; KW.glassIM.setMatrixAt(p.i, on ? p.m : ZERO4); KW.glassIM.instanceMatrix.needsUpdate = true; p.col.on = on; if (!on) p.tDead = clockU.value; }
function kwBreakPane(p, fromNet, dir) {
  if (!p || !p.alive) return;
  kwPaneSet(p, false); spawnShards(p.x, p.y, p.z, p.ang, p.w, p.h, dir); sGlass(p.x, p.y, p.z);
  if (!fromNet && NET.on) NET.send('vitre', { g: p.id, m: 2 });
}
// les murs se relèvent au bout de 30 s, les vitres au bout de 25 s (jamais sur quelqu'un)
function updateKit(dt, players) {
  KW.tick -= dt; if (KW.tick > 0) return; KW.tick = 0.5;
  const now = clockU.value;
  for (const w of KW.walls) {
    if (w.alive || now - w.tDead < 30) continue;
    let block = false; for (const pl of players) if (Math.abs(pl.x - w.x) < w.hx + 0.6 && Math.abs(pl.z - w.z) < w.hz + 0.6 && pl.y < w.y + w.hy && pl.y + 1.8 > w.y - w.hy) block = true;
    if (!block) { w.alive = true; w.hp = KW_HP; kwShow(w, true); removeDebrisOf(5000 + w.id); }
  }
  for (const p of KW.panes) if (!p.alive && now - p.tDead > 25) kwPaneSet(p, true);
}
function rayKit(o, d, best, res) {
  for (const w of KW.walls) {
    if (!w.alive) continue;
    const cx = w.x - o.x, cy = w.y - o.y, cz = w.z - o.z, tc = cx * d.x + cy * d.y + cz * d.z;
    if (tc < -3 || tc > best + 3) continue;
    const t = rayOBB(o, d, w, best);
    if (t < best) { best = t; res.t = t; res.kind = 'kmur'; res.kw = w; res.n.copy(_rn); }
  }
  for (const p of KW.panes) {
    if (!p.alive) continue;
    const t = rayOBB(o, d, p, best);
    if (t < best) { best = t; res.t = t; res.kind = 'kvitre'; res.kw = p; res.n.copy(_rn); }
  }
  return best;
}
// garde-corps : poteaux, deux lisses, obstacle bas (on peut sauter par-dessus)
function kitRail(ax, az, bx, bz, y, mat, h) {
  h = h || 1.0; const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az) - Math.PI / 2, n = Math.max(1, Math.round(len / 2.2));
  for (let i = 0; i <= n; i++) B.add(boxG(0.09, h, 0.09), mat || MAT.white, M4(lerp(ax, bx, i / n), y + h / 2, lerp(az, bz, i / n)));
  for (const yy of [h * 0.55, h - 0.03]) B.add(boxG(len, 0.05, 0.05), yy > h * 0.8 ? MAT.chrome : (mat || MAT.white), M4((ax + bx) / 2, y + yy, (az + bz) / 2, 0, ang, 0));
  addBox((ax + bx) / 2, (az + bz) / 2, len / 2, 0.07, ang, y, y + h - 0.05);
}
// enseigne néon : texte lumineux posé sur un mur (ry = orientation de la face)
const SIGNS = [];
function kitSign(text, color, x, y, z, ry, w, h, k) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: neonTex(text, color, 512, Math.round(512 * h / w)), color: HDR('#ffffff', k || 2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; wadd(m); SIGNS.push(m); return m;
}
// marches droites : n marches qui montent de y0 à y1 en avançant de (dx, dz) par marche
function kitSteps(x, z, dx, dz, w, y0, y1, n, mat) {
  const ux = Math.abs(dx) > 0 ? 1 : 0, dep = Math.hypot(dx, dz);
  for (let k = 0; k < n; k++) {
    const top = lerp(y0, y1, (k + 1) / n), cx = x + dx * (k + 0.5), cz = z + dz * (k + 0.5);
    B.add(boxG(ux ? dep : w, top - y0 + 0.02, ux ? w : dep), mat, M4(cx, y0 + (top - y0) / 2, cz), true, true);
    addFloorRect(cx - (ux ? dep : w) / 2, cx + (ux ? dep : w) / 2, cz - (ux ? w : dep) / 2, cz + (ux ? w : dep) / 2, top);
  }
}
/* ---------- ampoules : une seule maille pour toutes les guirlandes ---------- */
const BULBS = { list: [], wires: [], mesh: null, glint: null, dyn: [] };
const BULB_COLS = ['#ffd27a', '#ff8fcf', '#7ff0ff', '#b98cff', '#a3f3dc', '#ffb07a'].map(C);
function bulb(x, y, z, ci, s) { BULBS.list.push({ x, y: y + YOFF, z, c: typeof ci === 'number' ? BULB_COLS[((Math.floor(ci) % BULB_COLS.length) + BULB_COLS.length) % BULB_COLS.length] : C(ci), s: s || 0.07 }); return BULBS.list.length - 1; }
function bulbString(ax, ay, az, bx, by, bz, n, sag, c0) {
  let px = ax, py = ay, pz = az;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(ax, bx, t), y = lerp(ay, by, t) - sag * 4 * t * (1 - t), z = lerp(az, bz, t);
    if (i > 0) BULBS.wires.push(px, py + YOFF, pz, x, y + YOFF, z);
    if (i > 0 && i < n) bulb(x, y - 0.06, z, (c0 || 0) + i);
    px = x; py = y; pz = z;
  }
}
function buildBulbs() {
  const L = BULBS.list, n = L.length; if (!n) return;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: clockU, uNight: NIGHT, uFogColor: FOG.color, uFogDensity: FOG.density },
    vertexShader: 'uniform float uTime, uNight; varying vec3 vC; varying vec3 vW; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; float ph = fract(dot(instanceMatrix[3].xyz, vec3(0.37, 0.61, 0.13))) * 60.0; float tw = 0.78 + 0.22 * sin(uTime * 2.6 + ph); vC = instanceColor * tw * (1.5 + 2.4 * uNight); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: FOG_GLSL_PARS + ' varying vec3 vC; varying vec3 vW; void main(){ vec3 col = vC; ' + FOG_GLSL + ' gl_FragColor = vec4(col, 1.0); }'
  });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, n);
  L.forEach((b, i) => { im.setMatrixAt(i, M4(b.x, b.y, b.z, 0, 0, 0, b.s, b.s, b.s)); im.setColorAt(i, b.c); });
  im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(im); BULBS.mesh = im;
  if (BULBS.wires.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(BULBS.wires, 3)); const ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C('#3a2f52') })); ln.frustumCulled = false; world.add(ln); }
  // reflets des lumières sur la mer : une traînée par ampoule, placée là où l'œil la verrait dans un miroir
  const G = L.map((b, i) => i).filter((i) => (L[i].z < 3 || L[i].glint) && L[i].y > -1.5 && !L[i].noGlint);
  if (!G.length) return;
  const g = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1);
  g.index = base.index; g.setAttribute('position', base.attributes.position);
  const ap = new Float32Array(G.length * 3), ac = new Float32Array(G.length * 3);
  G.forEach((bi, k) => { const b = L[bi]; ap.set([b.x, b.y, b.z], k * 3); ac.set([b.c.r, b.c.g, b.c.b], k * 3); b.gi = k; });
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(ap, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aCol', new THREE.InstancedBufferAttribute(ac, 3));
  g.instanceCount = G.length;
  const gm = new THREE.ShaderMaterial({
    uniforms: { uTime: clockU, uNight: NIGHT, uSeaY: terrainU.uSeaY, uHM: { value: HM.t }, uHMr: { value: HM.r } },
    vertexShader: [
      'attribute vec3 aPos; attribute vec3 aCol; uniform float uSeaY, uTime; uniform sampler2D uHM; uniform vec4 uHMr; varying vec2 vQ; varying vec3 vC; varying float vK;',
      'void main(){',
      '  float hL = aPos.y - uSeaY, hC = cameraPosition.y - uSeaY;',
      '  float tt = hC / max(hC + hL, 0.001);',
      '  vec2 pm = mix(cameraPosition.xz, aPos.xz, tt);',
      '  float th = texture2D(uHM, (pm - uHMr.xy) * uHMr.zw).r' + (HM.packed ? ' * 32.0 - 13.0' : '') + ';',
      '  vK = step(0.05, hL) * step(0.05, hC) * smoothstep(0.0, 0.25, uSeaY - th);',
      '  vec2 dir = normalize(pm - cameraPosition.xz + vec2(1e-4)); vec2 side = vec2(-dir.y, dir.x);',
      '  float dC = length(pm - cameraPosition.xz);',
      '  float len = clamp((hL * 1.6 + 1.2) * (0.5 + dC * 0.03), 0.8, 46.0), wid = 0.12 + dC * 0.0075;',
      '  vec2 xz = pm + side * position.x * wid * 2.0 + dir * position.y * len;',
      '  vQ = position.xy; vC = aCol; vK *= 1.0 - smoothstep(260.0, 420.0, dC);',
      '  gl_Position = projectionMatrix * viewMatrix * vec4(xz.x, uSeaY + 0.24, xz.y, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: 'uniform float uTime, uNight; varying vec2 vQ; varying vec3 vC; varying float vK; void main(){ float a = exp(-vQ.x * vQ.x * 22.0) * (1.0 - 4.0 * vQ.y * vQ.y); float sh = 0.55 + 0.45 * sin(vQ.y * 46.0 + uTime * 5.0 + vC.r * 20.0) * sin(vQ.y * 17.0 - uTime * 3.1); gl_FragColor = vec4(vC * a * sh * vK * (0.07 + 0.4 * uNight), 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const gl = new THREE.Mesh(g, gm); gl.frustumCulled = false; gl.renderOrder = 4; world.add(gl); BULBS.glint = gl;
}
// déplace une ampoule (grande roue, manèges) : met aussi à jour son reflet
const _bm4 = new THREE.Matrix4();
function moveBulb(i, x, y, z) {
  const b = BULBS.list[i]; b.x = x; b.y = y; b.z = z;
  if (BULBS.mesh) { _bm4.makeScale(b.s, b.s, b.s).setPosition(x, y, z); BULBS.mesh.setMatrixAt(i, _bm4); }
  if (BULBS.glint && b.gi !== undefined) { const a = BULBS.glint.geometry.attributes.aPos; a.setXYZ(b.gi, x, y, z); a.needsUpdate = true; }
}
