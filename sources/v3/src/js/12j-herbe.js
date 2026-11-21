/* =========================================================
   Brins d'herbe : une grille de touffes qui suit le joueur. Chaque
   touffe se place toute seule (hauteur du sol, pelouse ou non, vent)
   dans la carte graphique : rien à recalculer d'une image à l'autre.
   ========================================================= */
const GRASS = { mesh: null, level: -1, mask: null, u: { uGC: { value: new V3() }, uGS: { value: new V3(0.4, 14, 0) }, uGMask: { value: null }, uGH: { value: null }, uGNoise: { value: null }, uGM: { value: new THREE.Vector4() }, uGHr: { value: null } } };
const GRASS_LEVELS = [null, { n: 72, s: 0.42 }, { n: 128, s: 0.33 }, { n: 176, s: 0.29 }];
// carte des pelouses : 1 là où l'herbe pousse, 0 sur le sable, la roche, les sols en dur, les maisons, les bassins
function grassMask() {
  if (GRASS.mask) return GRASS.mask;
  const W = 1024, H = 1024, sx = (MAP.x1 - MAP.x0) / W, sz = (MAP.z1 - MAP.z0) / H, a = new Uint8Array(W * H * (isWebGL2 ? 1 : 4)), nrm = new V3();
  const lots = houses.map((h) => { const cr = Math.cos(h.L.rot), sr = Math.sin(h.L.rot); return { h, cr, sr, dx: h.ox + h.gs * 2.4, fd: h.L.front }; });
  const lawn = (x, z) => {
    const h = TH(x, z), q = Math.hypot((x - HILL.cx) / HILL.rx, (z - HILL.cz) / HILL.rz);
    if (!(z >= 0.7 || (q < 1.0 && h > 0.4))) return 0;
    if (z < 0.7 && h < 0.5) return 0;
    terrainNormal(x, z, nrm); if (1 - nrm.y > 0.2) return 0;
    if (z > -0.5 && z < PROM.z1 + 0.4 && x > PROM.x0 - 0.4 && x < PROM.x1 + 0.4) return 0;
    if (Math.abs(x) < 16.5 && z > PROM.z1 - 1 && z < ROAD.z0 + 0.5) return 0;
    if (x > ROAD.x0 - 0.5 && x < ROAD.x1 + 0.5 && z > ROAD.z0 - 2.1 && z < ROAD.z1 + 2.1) return 0;
    if (x > RAMP.x0 - 6.4 && x < RAMP.x1 + 1.6 && Math.abs(z - RAMP.z) < 3.0) return 0;
    if (x > RF.x0 - 2 && x < RF.x1 + 3.2 && z > -24.4 && z < RF.z1 + 1.2) return 0;
    for (const p of pools) { if (p.blob) { if (blobEdge(p, x, z) > -0.4) return 0; } else if (x > p.x0 - 2.6 && x < p.x1 + 2.6 && z > p.z0 - 2.6 && z < p.z1 + 2.6) return 0; }
    for (const r of RESERVED) if (x > r.x0 - 0.6 && x < r.x1 + 0.6 && z > r.z0 - 0.6 && z < r.z1 + 0.6) return 0;
    for (const L of lots) {
      const dx = x - L.h.x, dz = z - L.h.z; if (dx * dx + dz * dz > 400) continue;
      const lx = dx * L.cr - dz * L.sr, lz = dx * L.sr + dz * L.cr;
      if (Math.abs(lx - L.h.ox) < 6.8 && lz > -10 && lz < 0.45) return 0;                     // la maison
      if (Math.abs(lx - L.h.gx) < 3.55 && lz > -6 && lz < 1.2) return 0;                      // le garage
      if (Math.abs(lx - L.h.gx) < 3.05 && lz > 0.5 && lz < L.fd + 0.3) return 0;              // l'allée du garage
      if (Math.abs(lx - L.dx) < (lz < 1.3 ? 1.3 : 0.9) && lz > 0 && lz < L.fd + 0.3) return 0; // le perron et son allée
    }
    for (const t of TRAMPS) if (Math.hypot(x - t.d.x, z - t.d.z) < 2.3) return 0;
    return 1;
  };
  const st = isWebGL2 ? 1 : 4;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) a[(j * W + i) * st] = lawn(MAP.x0 + (i + 0.5) * sx, MAP.z0 + (j + 0.5) * sz) ? 255 : 0;
  const t = new THREE.DataTexture(a, W, H, isWebGL2 ? THREE.RedFormat : THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  GRASS.u.uGM.value.set(MAP.x0, MAP.z0, 1 / (MAP.x1 - MAP.x0), 1 / (MAP.z1 - MAP.z0));
  return (GRASS.mask = t);
}
const grassExtra = (sh) => {
  Object.assign(sh.uniforms, GRASS.u);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aT; attribute vec2 aCell; uniform vec3 uGC, uGS; uniform sampler2D uGMask, uGH, uGNoise; uniform vec4 uGM, uGHr; varying float vGT; varying vec3 vGTint;')
    .replace('#include <begin_vertex>', [
      'vec2 gCell = floor(uGC.xy / uGS.x) + aCell - uGC.z * 0.5;',
      'float gH1 = fract(sin(dot(gCell, vec2(127.1, 311.7))) * 43758.5453), gH2 = fract(sin(dot(gCell, vec2(269.5, 183.3))) * 43758.5453);',
      'vec2 gW = (gCell + vec2(gH1, gH2)) * uGS.x;',
      'float gMask = texture2D(uGMask, (gW - uGM.xy) * uGM.zw).r;',
      'float gY = texture2D(uGH, (gW - uGHr.xy) * uGHr.zw).r' + (HM.packed ? ' * 32.0 - 13.0' : '') + ';',
      'float gS = smoothstep(0.4, 0.62, gMask) * (1.0 - smoothstep(uGS.y * 0.7, uGS.y, length(gW - uGC.xy))) * (0.65 + 0.7 * gH1);',
      'float gA = gH2 * 6.2832, gc = cos(gA), gs = sin(gA);',
      'vec3 transformed = vec3(position.x * gc - position.z * gs, position.y, position.x * gs + position.z * gc) * gS;',
      'float gWd = sin(uGS.z * 1.6 + gW.x * 0.33 + gW.y * 0.27) * 0.55 + sin(uGS.z * 2.7 + gW.x * 0.9 - gW.y * 0.6) * 0.25;',
      'transformed.xz += vec2(0.1, 0.06) * gWd * aT * aT * gS;',
      'transformed += vec3(gW.x, gY, gW.y);',
      'vGT = aT; vGTint = vec3(0.8 + 0.4 * texture2D(uGNoise, gW * 0.0047).r) * mix(vec3(1.0), vec3(1.14, 1.04, 0.78), smoothstep(0.52, 0.8, texture2D(uGNoise, gW * 0.023 + 0.37).g) * 0.45) * (0.86 + 0.28 * gH2);'
    ].join('\n'));
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vGT; varying vec3 vGTint;')
    .replace('#include <map_fragment>', 'diffuseColor.rgb = mix(vec3(0.04, 0.17, 0.075), vec3(0.33, 0.62, 0.25), vGT * vGT * 0.6 + vGT * 0.4) * vGTint;');
};
grassExtra.key = 'herbe';
const grassMat = std({ color: C('#ffffff'), roughness: 0.82, side: THREE.DoubleSide, envMapIntensity: 1.3 }, grassExtra);
function setGrass(level) {
  if (renderer.capabilities.maxVertexTextures < 3) level = 0;
  if (level === GRASS.level) return; GRASS.level = level;
  if (GRASS.mesh) { world.remove(GRASS.mesh); GRASS.mesh.geometry.dispose(); const k = REFL.hide.indexOf(GRASS.mesh); if (k >= 0) REFL.hide.splice(k, 1); GRASS.mesh = null; }
  const L = GRASS_LEVELS[level]; if (!L) return;
  GRASS.u.uGMask.value = grassMask(); GRASS.u.uGH.value = HM.t; GRASS.u.uGHr.value = HM.r; GRASS.u.uGNoise.value = T.noise;
  // une touffe : cinq brins effilés, un peu couchés, chacun fait de trois triangles
  const pos = [], aT = [], nrm = [], idx = [], r = rng(71);
  for (let b = 0; b < 5; b++) {
    const a = r() * 6.283, ox = (r() - 0.5) * 0.3, oz = (r() - 0.5) * 0.3, h = 0.2 + r() * 0.2, w = 0.022 + r() * 0.014, lean = 0.05 + r() * 0.1, ca = Math.cos(a), sa = Math.sin(a), la = r() * 6.283, base = pos.length / 3;
    const V = (lx, t) => { const bend = lean * t * t; pos.push(ox + ca * lx + Math.cos(la) * bend, h * t, oz + sa * lx + Math.sin(la) * bend); aT.push(t); nrm.push(0, 1, 0); };
    V(-w, 0); V(w, 0); V(-w * 0.75, 0.5); V(w * 0.75, 0.5); V(0, 1);
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const g = new THREE.InstancedBufferGeometry(), N = L.n, cells = new Float32Array(N * N * 2);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { cells[(j * N + i) * 2] = i; cells[(j * N + i) * 2 + 1] = j; }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2)); g.setIndex(idx); g.instanceCount = N * N;
  const m = new THREE.Mesh(g, grassMat); m.frustumCulled = false; m.receiveShadow = true; m.castShadow = false; world.add(m);
  GRASS.mesh = m; GRASS.u.uGS.value.set(L.s, N * L.s * 0.5, 0); GRASS.u.uGC.value.z = N; REFL.hide.push(m);
}
function updateGrass() {
  if (!GRASS.mesh) return;
  const u = GRASS.u; u.uGC.value.x = camera.position.x; u.uGC.value.y = camera.position.z; u.uGS.value.z = clockU.value;
  GRASS.mesh.visible = camera.position.y < 45;
}
setGrass(Q.grass);
