/* =========================================================
   Armes : mitraillette, fusil à rafale, fusil de précision, pistolet laser
   ========================================================= */
const WEAPONS = [
  { id: 'smg', nom: 'BRISE-RÊVE', auto: true, rate: 0.072, mag: 45, reload: 1.6, dmg: { m: 4.2, p: 1, s: 1, j: 7 }, spread: [0.013, 0.0018], kick: [0.011, 0.0055], tracer: 0.02, shell: 1, fov: 56 },
  { id: 'fusil', nom: 'CASSETTE', auto: true, rate: 0.25, mag: 20, reload: 2.0, dmg: { m: 11, p: 3.5, s: 2.5, j: 20 }, spread: [0.009, 0.0012], kick: [0.03, 0.015], tracer: 0.032, shell: 1.4, fov: 52 },
  { id: 'sniper', nom: 'LONGUE-VUE', auto: false, rate: 1.15, mag: 5, reload: 2.6, dmg: { m: 55, p: 14, s: 5, j: 100 }, spread: [0.035, 0.0], kick: [0.07, 0.045], tracer: 0.06, shell: 2, fov: 17, scope: true, pierce: 3 },
  { id: 'laser', nom: 'RAYON NÉON', beam: true, dps: { m: 42, p: 13, s: 7, j: 55 }, drain: 21, regen: 32, fov: 58 }
];
WEAPONS.forEach((w) => { w.ammo = w.mag || 0; w.energy = 100; w.over = 0; });
const gunRoot = new THREE.Group(); camera.add(gunRoot);
const GM = {
  metal: std({ color: C('#353049'), metalness: 0.5, roughness: 0.38, envMapIntensity: 0.9 }),
  poly: std({ color: C('#2e293f'), roughness: 0.6, envMapIntensity: 0.9 }),
  lilac: std({ color: C('#c8b0ff'), metalness: 0.35, roughness: 0.35, envMapIntensity: 1.1 }),
  mint: std({ color: C('#9ff0d8'), metalness: 0.3, roughness: 0.35, envMapIntensity: 1.1 }),
  sky: std({ color: C('#b8d8ff'), metalness: 0.4, roughness: 0.3, envMapIntensity: 1.2 }),
  white: std({ color: C('#fff6fb'), metalness: 0.1, roughness: 0.3, envMapIntensity: 1.1 }),
  pink: std({ color: C('#ff9fcb'), metalness: 0.2, roughness: 0.4 }),
  chrome: std({ color: C('#f4f0ff'), metalness: 1, roughness: 0.15, envMapIntensity: 1.5 }),
  neon: new THREE.MeshBasicMaterial({ color: HDR('#ff8fd0', 3.5) }),
  neon2: new THREE.MeshBasicMaterial({ color: HDR('#8ff6ff', 3) }),
  lens: new THREE.MeshBasicMaterial({ color: HDR('#ff8fd0', 1.6) }),
  glove: std({ color: C('#f6b2cf'), roughness: 0.75, envMapIntensity: 0.8 }),
  sleeve: std({ color: C('#a092e6'), roughness: 0.9, envMapIntensity: 0.7 }),
  cuff: std({ color: C('#fff1f7'), roughness: 0.9 }),
  glass: new THREE.MeshBasicMaterial({ color: C('#c9fff6'), transparent: true, opacity: 0.14, depthWrite: false }),
  reticle: new THREE.MeshBasicMaterial({ map: T.reticle, color: HDR('#ff6fb8', 4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  display: new THREE.MeshBasicMaterial({ map: T.ammo, color: HDR('#ffffff', 1.6), transparent: true }),
  coil: new THREE.MeshBasicMaterial({ color: HDR('#ff7fe0', 4) }),
  crystal: new THREE.MeshBasicMaterial({ color: HDR('#bffcff', 6) }),
  tube: new THREE.MeshBasicMaterial({ color: HDR('#ff8fd0', 2.5), transparent: true, opacity: 0.85 })
};
const flashMat = new THREE.MeshBasicMaterial({ map: T.flash, color: HDR('#ffd9e8', 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function capsuleBetween(parent, a, b, r, mat) { const dir = new V3().subVectors(b, a), len = dir.length(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, dir.normalize()); parent.add(m); return m; }
function makeArms(g, leftZ, leftY, rightZ) {
  capsuleBetween(g, new V3(0.03, -0.14, rightZ + 0.07), new V3(0.15, -0.36, 0.6), 0.046, GM.sleeve);
  capsuleBetween(g, new V3(0.02, -0.13, rightZ + 0.05), new V3(0.04, -0.17, rightZ + 0.14), 0.05, GM.cuff);
  const hr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.085, 0.085), GM.glove); hr.position.set(0.008, -0.1, rightZ); hr.rotation.x = -0.3; g.add(hr);
  capsuleBetween(g, new V3(-0.02, leftY - 0.035, leftZ + 0.03), new V3(-0.26, -0.36, 0.08), 0.048, GM.sleeve);
  capsuleBetween(g, new V3(-0.025, leftY - 0.025, leftZ + 0.02), new V3(-0.07, leftY - 0.075, leftZ + 0.09), 0.052, GM.cuff);
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.085), GM.glove); hl.position.set(-0.012, leftY, leftZ); g.add(hl);
}
function gp(g, geo, mat, x, y, z, rx, ry, rz) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
function addFlash(g, z, size) {
  const flash = new THREE.Group(); flash.position.set(0, 0.004, z); g.add(flash);
  const s = size || 1;
  const a = new THREE.Mesh(new THREE.PlaneGeometry(0.22 * s, 0.22 * s), flashMat); a.position.z = -0.03; flash.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * s, 0.32 * s), flashMat); b.rotation.x = Math.PI / 2; b.position.z = -0.1 * s; flash.add(b);
  const c = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * s, 0.32 * s), flashMat); c.rotation.set(Math.PI / 2, Math.PI / 2, 0); c.position.z = -0.1 * s; flash.add(c);
  flash.visible = false; return flash;
}
function buildModels() {
  const models = [];
  { // BRISE-RÊVE
    const g = new THREE.Group();
    gp(g, new THREE.BoxGeometry(0.066, 0.086, 0.36), GM.metal, 0, 0, 0);
    gp(g, new THREE.BoxGeometry(0.034, 0.01, 0.3), GM.poly, 0, 0.048, -0.02);
    gp(g, new THREE.BoxGeometry(0.06, 0.072, 0.2), GM.lilac, 0, -0.004, -0.27);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) gp(g, new THREE.BoxGeometry(0.004, 0.022, 0.03), GM.poly, s * 0.031, 0.006, -0.33 + i * 0.04);
    gp(g, new THREE.CylinderGeometry(0.011, 0.011, 0.14, 12), GM.metal, 0, 0.004, -0.43, Math.PI / 2);
    gp(g, new THREE.CylinderGeometry(0.02, 0.02, 0.065, 14), GM.poly, 0, 0.004, -0.52, Math.PI / 2);
    gp(g, new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14), GM.pink, 0, 0.004, -0.49, Math.PI / 2);
    const mag = gp(g, new THREE.BoxGeometry(0.038, 0.19, 0.075), GM.poly, 0, -0.13, -0.09, 0.12);
    gp(mag, new THREE.BoxGeometry(0.044, 0.02, 0.085), GM.pink, 0, -0.095, 0);
    gp(g, new THREE.BoxGeometry(0.04, 0.125, 0.05), GM.poly, 0, -0.098, 0.1, -0.3);
    gp(g, new THREE.BoxGeometry(0.009, 0.009, 0.08), GM.metal, 0, -0.065, 0.045);
    gp(g, new THREE.BoxGeometry(0.036, 0.052, 0.21), GM.lilac, 0, -0.006, 0.28);
    gp(g, new THREE.BoxGeometry(0.046, 0.115, 0.032), GM.poly, 0, -0.022, 0.39);
    gp(g, new THREE.CylinderGeometry(0.017, 0.015, 0.1, 12), GM.poly, 0, -0.085, -0.28);
    gp(g, new THREE.BoxGeometry(0.044, 0.042, 0.08), GM.metal, 0, 0.074, -0.04);
    gp(g, new THREE.BoxGeometry(0.072, 0.01, 0.062), GM.lilac, 0, 0.099, -0.05);
    for (const s of [-1, 1]) gp(g, new THREE.BoxGeometry(0.006, 0.068, 0.062), GM.metal, s * 0.038, 0.137, -0.05);
    gp(g, new THREE.BoxGeometry(0.082, 0.007, 0.062), GM.metal, 0, 0.174, -0.05);
    gp(g, new THREE.PlaneGeometry(0.07, 0.066), GM.glass, 0, 0.137, -0.05);
    gp(g, new THREE.PlaneGeometry(0.03, 0.03), GM.reticle, 0, 0.137, -0.051);
    const nl = gp(g, new THREE.BoxGeometry(0.003, 0.007, 0.22), GM.neon, -0.0345, -0.016, -0.03);
    const nr = gp(g, new THREE.BoxGeometry(0.003, 0.007, 0.22), GM.neon2, 0.0345, -0.016, -0.03);
    gp(g, new THREE.PlaneGeometry(0.06, 0.03), GM.display, -0.0345, 0.012, 0.11, 0, -Math.PI / 2, 0);
    makeArms(g, -0.28, -0.105, 0.1);
    models.push({ g, muzzleZ: -0.56, eject: new V3(0.036, 0.016, -0.02), mag, magHome: mag.position.clone(), neon: [nl, nr], flash: addFlash(g, -0.56), adsY: -0.137, sightZ: -0.05 });
  }
  { // CASSETTE
    const g = new THREE.Group();
    gp(g, new THREE.BoxGeometry(0.072, 0.1, 0.42), GM.mint, 0, 0, 0);
    gp(g, new THREE.BoxGeometry(0.074, 0.03, 0.42), GM.metal, 0, 0.058, 0);
    gp(g, new THREE.BoxGeometry(0.066, 0.08, 0.26), GM.poly, 0, -0.008, -0.32);
    gp(g, new THREE.CylinderGeometry(0.014, 0.014, 0.26, 12), GM.metal, 0, 0.01, -0.55, Math.PI / 2);
    gp(g, new THREE.BoxGeometry(0.05, 0.05, 0.09), GM.metal, 0, 0.01, -0.7);
    for (let i = 0; i < 3; i++) gp(g, new THREE.BoxGeometry(0.052, 0.008, 0.012), GM.pink, 0, 0.037, -0.67 + i * 0.03);
    const mag = gp(g, new THREE.BoxGeometry(0.044, 0.17, 0.085), GM.poly, 0, -0.13, -0.08, 0.28);
    gp(mag, new THREE.BoxGeometry(0.046, 0.08, 0.087), GM.poly, 0, -0.1, -0.03, 0.25);
    // la cassette sur le côté
    const cas = new THREE.Group(); cas.position.set(-0.038, 0.0, 0.02); cas.rotation.y = -Math.PI / 2; g.add(cas);
    gp(cas, new THREE.BoxGeometry(0.12, 0.07, 0.008), GM.white, 0, 0, 0);
    gp(cas, new THREE.BoxGeometry(0.08, 0.026, 0.009), GM.pink, 0, 0.012, 0.001);
    for (const sx of [-0.024, 0.024]) gp(cas, new THREE.CylinderGeometry(0.01, 0.01, 0.01, 10), GM.poly, sx, -0.012, 0.002, Math.PI / 2);
    gp(g, new THREE.BoxGeometry(0.045, 0.13, 0.05), GM.poly, 0, -0.1, 0.12, -0.3);
    gp(g, new THREE.BoxGeometry(0.05, 0.08, 0.24), GM.mint, 0, -0.01, 0.32);
    gp(g, new THREE.BoxGeometry(0.056, 0.12, 0.04), GM.poly, 0, -0.03, 0.45);
    gp(g, new THREE.BoxGeometry(0.012, 0.03, 0.012), GM.metal, 0, 0.088, -0.3);
    gp(g, new THREE.BoxGeometry(0.03, 0.022, 0.012), GM.metal, 0, 0.083, 0.12);
    const nl = gp(g, new THREE.BoxGeometry(0.003, 0.008, 0.3), GM.neon2, 0.037, -0.02, -0.05);
    const nr = gp(g, new THREE.BoxGeometry(0.003, 0.008, 0.3), GM.neon, -0.037, -0.035, -0.05);
    gp(g, new THREE.PlaneGeometry(0.06, 0.03), GM.display, 0.0375, 0.025, 0.14, 0, Math.PI / 2, 0);
    makeArms(g, -0.33, -0.1, 0.12);
    models.push({ g, muzzleZ: -0.76, eject: new V3(0.04, 0.02, -0.04), mag, magHome: mag.position.clone(), neon: [nl, nr], flash: addFlash(g, -0.76, 1.3), adsY: -0.098, sightZ: 0.12 });
  }
  { // LONGUE-VUE
    const g = new THREE.Group();
    gp(g, new THREE.BoxGeometry(0.07, 0.09, 0.36), GM.sky, 0, 0, 0);
    gp(g, new THREE.CylinderGeometry(0.016, 0.018, 0.72, 14), GM.chrome, 0, 0.01, -0.54, Math.PI / 2);
    gp(g, new THREE.CylinderGeometry(0.028, 0.028, 0.08, 14), GM.metal, 0, 0.01, -0.92, Math.PI / 2);
    gp(g, new THREE.BoxGeometry(0.06, 0.06, 0.3), GM.white, 0, -0.01, -0.3);
    // lunette
    gp(g, new THREE.CylinderGeometry(0.028, 0.028, 0.3, 16), GM.metal, 0, 0.1, -0.06, Math.PI / 2);
    gp(g, new THREE.CylinderGeometry(0.038, 0.03, 0.07, 16), GM.metal, 0, 0.1, -0.24, Math.PI / 2);
    gp(g, new THREE.CylinderGeometry(0.034, 0.028, 0.05, 16), GM.metal, 0, 0.1, 0.11, Math.PI / 2);
    gp(g, new THREE.CircleGeometry(0.034, 20), GM.lens, 0, 0.1, -0.276, 0, Math.PI, 0);
    gp(g, new THREE.CircleGeometry(0.026, 20), GM.lens, 0, 0.1, 0.137, 0, 0, 0);
    for (const z of [-0.12, 0.02]) gp(g, new THREE.BoxGeometry(0.03, 0.06, 0.02), GM.metal, 0, 0.065, z);
    gp(g, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), GM.pink, 0.032, 0.1, -0.06, 0, 0, Math.PI / 2);
    const mag = gp(g, new THREE.BoxGeometry(0.04, 0.08, 0.08), GM.poly, 0, -0.08, -0.04);
    gp(g, new THREE.BoxGeometry(0.045, 0.13, 0.05), GM.poly, 0, -0.1, 0.13, -0.3);
    gp(g, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), GM.chrome, 0.05, 0.02, 0.06, 0, 0, Math.PI / 2);
    gp(g, new THREE.SphereGeometry(0.014, 8, 6), GM.pink, 0.078, 0.02, 0.06);
    gp(g, new THREE.BoxGeometry(0.03, 0.1, 0.3), GM.sky, 0, -0.03, 0.34);
    gp(g, new THREE.BoxGeometry(0.05, 0.14, 0.04), GM.white, 0, -0.05, 0.5);
    const nl = gp(g, new THREE.BoxGeometry(0.003, 0.006, 0.5), GM.neon, -0.019, 0.01, -0.5);
    const nr = gp(g, new THREE.BoxGeometry(0.003, 0.006, 0.5), GM.neon2, 0.019, 0.01, -0.5);
    gp(g, new THREE.PlaneGeometry(0.06, 0.03), GM.display, 0.0355, -0.015, 0.1, 0, Math.PI / 2, 0);
    makeArms(g, -0.34, -0.06, 0.13);
    models.push({ g, muzzleZ: -0.97, eject: new V3(0.04, 0.03, 0.0), mag, magHome: mag.position.clone(), neon: [nl, nr], flash: addFlash(g, -0.97, 1.6), adsY: -0.1, sightZ: 0.1 });
  }
  { // RAYON NÉON
    const g = new THREE.Group();
    gp(g, new THREE.SphereGeometry(0.06, 16, 12).scale(0.9, 0.8, 1.6), GM.white, 0, 0, -0.06);
    gp(g, new THREE.CylinderGeometry(0.03, 0.045, 0.2, 16), GM.pink, 0, 0.0, -0.22, Math.PI / 2);
    const coils = [];
    for (let i = 0; i < 4; i++) coils.push(gp(g, new THREE.TorusGeometry(0.045 - i * 0.004, 0.008, 8, 20), GM.coil.clone(), 0, 0, -0.16 - i * 0.045));
    const crystal = gp(g, new THREE.OctahedronGeometry(0.03, 0), GM.crystal, 0, 0, -0.36);
    gp(g, new THREE.CylinderGeometry(0.012, 0.012, 0.18, 10), GM.tube, 0, 0.055, -0.02, Math.PI / 2);
    gp(g, new THREE.CylinderGeometry(0.018, 0.018, 0.2, 10, 1, true), GM.glass, 0, 0.055, -0.02, Math.PI / 2);
    gp(g, new THREE.SphereGeometry(0.03, 12, 8), GM.chrome, 0, 0.0, 0.09);
    gp(g, new THREE.BoxGeometry(0.04, 0.13, 0.05), GM.lilac, 0, -0.09, 0.06, -0.35);
    gp(g, new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI), GM.chrome, 0, -0.06, 0.0, 0, Math.PI / 2, Math.PI);
    for (const s of [-1, 1]) gp(g, new THREE.BoxGeometry(0.008, 0.04, 0.12), GM.sky, s * 0.05, 0.0, -0.05, 0, s * 0.2, 0);
    makeArms(g, -0.17, -0.06, 0.06);
    models.push({ g, muzzleZ: -0.38, eject: null, mag: null, neon: [], flash: null, coils, crystal, adsY: -0.06, sightZ: 0.0 });
  }
  models.forEach((m, i) => { m.g.visible = i === 0; gunRoot.add(m.g); m.muzzle = new THREE.Object3D(); m.muzzle.position.set(0, 0.004, m.muzzleZ); m.g.add(m.muzzle); if (m.eject) { m.ej = new THREE.Object3D(); m.ej.position.copy(m.eject); m.g.add(m.ej); } });
  return models;
}
const MODELS = buildModels();
MODELS.forEach((m) => { if (m.flash) m.flash.name = 'eclair'; if (m.crystal) m.crystal.name = 'cristal'; });
// version « monde » de chaque arme (portée par les autres joueurs) : mêmes pièces, sans les bras, avec la brume
const WORLD_GUN_MATS = new Map();
function worldMat(m) {
  if (!m || m === flashMat) return m;
  let w = WORLD_GUN_MATS.get(m);
  if (!w) { w = m.clone(); w.fog = true; if (m.onBeforeCompile) { w.onBeforeCompile = m.onBeforeCompile; w.customProgramCacheKey = m.customProgramCacheKey; } WORLD_GUN_MATS.set(m, w); }
  return w;
}
const WORLD_GUNS = MODELS.map((m) => {
  const g = m.g.clone(true), drop = [];
  g.traverse((o) => { if (o.isMesh && (o.material === GM.glove || o.material === GM.sleeve || o.material === GM.cuff)) drop.push(o); });
  drop.forEach((o) => o.parent.remove(o));
  g.traverse((o) => { o.layers.set(0); if (o.isMesh) { o.material = worldMat(o.material); o.castShadow = o.material !== flashMat; } });
  g.visible = true; g.position.set(0, 0, 0); g.rotation.set(0, 0, 0);
  const fl = g.getObjectByName('eclair'); if (fl) fl.visible = false;
  return g;
});
function makeWorldGuns() { return WORLD_GUNS.map((t) => { const g = t.clone(true); g.userData.flash = g.getObjectByName('eclair'); g.userData.crystal = g.getObjectByName('cristal'); return g; }); }
gunRoot.traverse((o) => { o.layers.set(1); if (o.material && o.material.isMeshStandardMaterial) o.material.fog = false; });
const muzzleLight = new THREE.PointLight(C('#ffc4d8'), 0, 10, 2); scene.add(muzzleLight);
[hemi, sun, mLight, muzzleLight].forEach((l) => l.layers.enableAll());
function setGlove(col) { GM.glove.color.copy(C(col)); GM.sleeve.color.copy(C(col)).lerp(C('#a092e6'), 0.5); }
/* ---------- rayon laser ---------- */
const beamMat = new THREE.ShaderMaterial({
  uniforms: { uTime: clockU, uLen: { value: 10 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uTime; uniform float uLen; varying vec2 vUv; void main(){ float x = vUv.y*uLen; float s = 0.5+0.5*sin(x*6.0 - uTime*40.0); float s2 = 0.5+0.5*sin(vUv.x*6.2832*2.0 + x*3.0 - uTime*20.0); vec3 a = vec3(1.0,0.35,0.85), b = vec3(0.35,1.0,1.0); vec3 c = mix(a, b, 0.5+0.5*sin(x*0.8 - uTime*6.0)); float e = 1.0 - abs(vUv.x - 0.5)*2.0; gl_FragColor = vec4(c*(1.2+2.4*s*s2), 1.0); }',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const beamCoreMat = new THREE.MeshBasicMaterial({ color: HDR('#ffffff', 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
function makeBeam() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), beamMat); g.add(outer);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), beamCoreMat); g.add(core);
  const end = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.flash, color: HDR('#ffd0f0', 4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(end);
  g.visible = false; scene.add(g);
  return { g, outer, core, end, len: 1 };
}
const myBeam = makeBeam();
function placeBeam(b, from, to, w) {
  const len = from.distanceTo(to); b.len = len;
  b.g.position.copy(from); b.g.lookAt(to);
  const wob = 1 + Math.sin(clockU.value * 40) * 0.15;
  b.outer.scale.set(0.05 * w * wob, 0.05 * w * wob, len); b.core.scale.set(0.012 * w, 0.012 * w, len);
  b.end.position.set(0, 0, len); b.end.scale.setScalar(0.9 * w * wob);
  beamMat.uniforms.uLen.value = len;
  b.g.visible = true;
}
/* ---------- état de l'arme ---------- */
const WPN = { cur: 0, cd: 0, reloading: false, rt: 0, ads: 0, heat: 0, kz: 0, krx: 0, kry: 0, krz: 0, swx: 0, swy: 0, bob: 0, flashT: 0, recoilAcc: 0, rStage: 0, sw: 0, swTo: -1, firing: false, beamOn: false, beamTick: 0, beamEnd: new V3(), sprintK: 0, semiReady: true, boltT: 0 };
function curW() { return WEAPONS[WPN.cur]; }
function drawAmmo() {
  const w = curW(), g = ammoCanvas[1]; g.clearRect(0, 0, 96, 48);
  g.fillStyle = 'rgba(20,10,40,0.85)'; g.fillRect(0, 0, 96, 48);
  const val = w.beam ? Math.round(w.energy) : w.ammo, low = w.beam ? w.energy < 25 : w.ammo <= Math.ceil(w.mag * 0.22);
  g.fillStyle = low ? '#ffb0a0' : '#a8fff0'; g.font = 'bold 34px "Lucida Console","Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(val).padStart(2, '0'), 48, 26); T.ammo.needsUpdate = true;
  const m = MODELS[WPN.cur];
  const f = Math.max(0.001, w.beam ? w.energy / 100 : w.ammo / w.mag);
  m.neon.forEach((n) => { n.scale.z = f; });
  $('ammo').textContent = w.beam ? Math.round(w.energy) + ' %' : w.ammo;
  $('ammoMax').textContent = w.beam ? '' : '/ ∞';
  $('armes').classList.toggle('vide', low);
  $('energie').hidden = !w.beam; if (w.beam) $('energieBarre').style.transform = 'scaleX(' + (w.energy / 100).toFixed(3) + ')';
}
function drawSlots() {
  $('emplacements').innerHTML = WEAPONS.map((w, i) => '<span class="' + (i === WPN.cur ? 'actif' : '') + '">' + (i + 1) + '</span>').join('');
  $('armeNom').textContent = curW().nom;
}
function switchWeapon(i) {
  i = ((i % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
  if (i === WPN.cur && WPN.swTo < 0) return;
  WPN.swTo = i; WPN.sw = Math.max(WPN.sw, 0.001); WPN.reloading = false; $('recharge').style.opacity = '0';
  if (WPN.beamOn) { laserStop(false); WPN.beamOn = false; myBeam.g.visible = false; }
  sSwitch();
}
function startReload() {
  const w = curW(); if (w.beam || WPN.reloading || w.ammo === w.mag || WPN.swTo >= 0) return;
  WPN.reloading = true; WPN.rt = 0; WPN.rStage = 0; $('recharge').style.opacity = '1';
}
/* ---------- lancer de rayon ---------- */
const ray = new THREE.Raycaster();
const RES = { t: 0, kind: null, n: new V3(), point: new V3(), obj: null, panel: null, glass: null, door: null, sheep: -1, ball: -1, pin: null, crown: -1, peer: null, surface: '' };
function visibleDeep(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function insideMap(p) { return p.x > MAP.x0 && p.x < MAP.x1 && p.z > MAP.z0 && p.z < MAP.z1; }
function rayCrowns(o, d, best, res) { for (const c of CROWNS) { const t = raySphere(o, d, c.x, c.y, c.z, 1.7); if (t < best) { best = t; res.t = t; res.kind = 'palmier'; res.crown = c.i; res.n.set(-d.x, -d.y, -d.z); } } return best; }
function traceShot(o, d, maxT, opts) {
  const res = RES; res.t = maxT; res.kind = null; res.obj = null; res.surface = '';
  ray.set(o, d); ray.far = maxT; ray.near = 0; ray.camera = camera;
  const hits = ray.intersectObjects(SHOOT, false);
  for (const h of hits) {
    if (!visibleDeep(h.object)) continue;
    if (h.object === gridFloor && insideMap(h.point)) continue;
    if (opts && opts.ignoreWater && h.object.userData.surface === 'eau') continue;
    res.t = h.distance; res.kind = 'statique'; res.obj = h.object; res.surface = h.object.userData.surface || 'dur';
    if (h.face) res.n.copy(h.face.normal).transformDirection(h.object.matrixWorld); else res.n.set(0, 1, 0);
    if (res.n.dot(d) > 0) res.n.negate();
    break;
  }
  let best = res.t;
  // le sol est testé directement (plan à hauteur zéro, hors piscines)
  if (d.y < -1e-4) {
    const tg = -o.y / d.y;
    if (tg > 0 && tg < best) { const gx = o.x + d.x * tg, gz = o.z + d.z * tg; if (insideMap({ x: gx, z: gz }) && !poolAt(gx, gz)) { best = tg; res.t = tg; res.kind = 'statique'; res.obj = null; res.surface = onRoadXZ(gx, gz) ? 'route' : 'herbe'; res.n.set(0, 1, 0); } }
  }
  best = rayHouses(o, d, best, res);
  best = rayShops(o, d, best, res);
  best = rayDestr(o, d, best, res);
  best = rayLamps(o, d, best, res);
  best = rayCars(o, d, best, res);
  best = rayBigBalls(o, d, best, res);
  best = rayJuke(o, d, best, res);
  best = rayMonster(o, d, best, res);
  best = raySheep(o, d, best, res);
  if (!(opts && opts.noBalls)) best = rayBalls(o, d, best, res);
  if (res.kind === 'statique' && res.surface === 'feuille' || !res.kind || res.t > 6) best = rayCrowns(o, d, best, res);
  best = rayPlayers(o, d, best, res);
  res.point.copy(o).addScaledVector(d, res.t);
  return res;
}
function impactWorld(p, n, surf) {
  if (surf === 'eau') {
    const pl = poolAt(p.x, p.z); if (pl) spawnRipple(pl, p.x, p.z, 1);
    for (let i = 0; i < 9; i++) spawnDrop(p.x, p.y + 0.02, p.z, rnd(-1.2, 1.2), rnd(2.5, 5), rnd(-1.2, 1.2), rnd(0.02, 0.045), 1.5);
    spawnPuff(p, MIST, 0.6, 0.5, 0.6, true); spawnRing(p.x, p.y + 0.01, p.z, 0.05, 0.8, 0.8);
    sSplash(0.35, 1.2, p); return;
  }
  if (surf === 'sable') { spawnPuff(p, C('#f6dcc8'), 0.4, 0.7, 0.4, false); for (let i = 0; i < 4; i++) spawnSpark(p.x, p.y, p.z, rnd(-1, 1), rnd(1, 2.5), rnd(-1, 1), 0.3); return; }
  if (surf === 'buisson') { spawnPuff(p, C('#a9e8b8'), 0.4, 0.7, 0.3, false); spawnDebrisBox(p.x, p.y, p.z, 0.1, 0.1, 0.1, C('#7fc59a'), 3, -1, null, 0.25); sRustle(p); return; }
  if (surf === 'verre-renforce') { for (let i = 0; i < 5; i++) spawnSpark(p.x, p.y, p.z, n.x * 3 + rnd(-2, 2), rnd(-1, 2), n.z * 3 + rnd(-2, 2), 0.3); sTink(p); return; }
  for (let i = 0; i < 7; i++) { _v1.copy(n).multiplyScalar(rnd(2, 5)); _v1.x += rnd(-2.5, 2.5); _v1.y += rnd(-1, 3); _v1.z += rnd(-2.5, 2.5); spawnSpark(p.x, p.y, p.z, _v1.x, _v1.y, _v1.z, rnd(0.25, 0.6)); }
  _v2.copy(p).addScaledVector(n, 0.08);
  spawnPuff(_v2, surf === 'herbe' ? C('#cfeedd') : surf === 'vide' ? HDR('#ff9fdc', 0.6) : surf === 'nuage' ? C('#ffffff') : DUST, 0.35, 0.6, 0.4, surf === 'vide');
  if (surf !== 'feuille' && surf !== 'vide' && surf !== 'nuage') spawnHole(p, n);
}
// applique les dégâts d'un impact ; k = facteur (1 par balle, dt pour le laser)
function applyHit(res, d, w, k, isBeam) {
  const dm = w.beam ? w.dps : w.dmg, p = res.point;
  switch (res.kind) {
    case 'monstre': if (hitMonster(p, d, dm.m * k)) hitmark(false); break;
    case 'panneau': damagePanel(res.panel, dm.p * k, d); impactWorld(p, res.n, 'dur'); break;
    case 'vitre': breakGlass(res.glass, false, d); break;
    case 'porte': damageDoor(res.door, dm.p * k, d); impactWorld(p, res.n, 'dur'); break;
    case 'mouton': hitSheep(res.sheep, dm.s * k, d); hitmark(false); break;
    case 'balle': hitBall(res.ball, d, isBeam ? 4 : 6 + dm.p); break;
    case 'quille': knockPin(res.pin, d); break;
    case 'meuble': hitPiece(res.meuble, dm.p * k * 1.15, d, p); break;
    case 'lampe': breakLamp(res.lamp, d); break;
    case 'voiture': impactWorld(p, res.n, 'dur'); if (!isBeam || Math.random() < 0.15) sClang(p); hitCar(res.car); break;
    case 'juke': if (!isBeam || Math.random() < k * 6) hitJuke(res.jb, p, res.n); break;
    case 'grosseBalle': hitBigBall(res.bb, d, isBeam ? 9 * k : w.id === 'sniper' ? 11 : w.id === 'fusil' ? 3.6 : 1.5); break;
    case 'palmier': { const c = CROWNS[res.crown]; if (clockU.value - c.cool > (isBeam ? 0.12 : 0.05)) { c.cool = clockU.value; shakePalm(res.crown, w.id === 'sniper' ? 14 : w.id === 'fusil' ? 6 : 3, (Math.random() * 1e9) | 0); } for (let i = 0; i < 3; i++) spawnSpark(p.x, p.y, p.z, rnd(-2, 2), rnd(-1, 2), rnd(-2, 2), 0.4); break; }
    case 'joueur': if (NET.on && NET.rule === 'bagarre') { NET.send('touche', { d: dm.j * k, w: w.id }, res.peer); hitmark(false); spawnPuff(p, C('#ffc0e0'), 0.4, 0.4, 0.4, false); } break;
    case 'statique': {
      impactWorld(p, res.n, res.surface);
      if (res.surface === 'dur' && !isBeam) { const q = palmNear(p); if (q && clockU.value - CROWNS[q.crown].cool > 0.08) { CROWNS[q.crown].cool = clockU.value; shakePalm(q.crown, w.id === 'sniper' ? 8 : 2, (Math.random() * 1e9) | 0); } }
      if (res.surface === 'feuille') { let bi = -1, bd = 16; for (const c of CROWNS) { const dd = (c.x - p.x) ** 2 + (c.y - p.y) ** 2 + (c.z - p.z) ** 2; if (dd < bd) { bd = dd; bi = c.i; } } if (bi >= 0 && clockU.value - CROWNS[bi].cool > 0.05) { CROWNS[bi].cool = clockU.value; shakePalm(bi, w.id === 'sniper' ? 14 : 3, (Math.random() * 1e9) | 0); } }
      break;
    }
  }
}
const _dir = new V3(), _org = new V3(), _mz = new V3();
function shoot() {
  const w = curW();
  w.ammo--; drawAmmo();
  const moving = Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 5);
  const spread = lerp(w.spread[0], w.spread[1], WPN.ads) + moving * lerp(0.02, 0.006, WPN.ads) + WPN.heat * lerp(0.016, 0.004, WPN.ads) + (P.onGround || P.swim ? 0 : 0.03);
  camera.getWorldPosition(_org);
  _dir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
  _v1.set(1, 0, 0).applyQuaternion(camera.quaternion); _v2.set(0, 1, 0).applyQuaternion(camera.quaternion);
  _dir.addScaledVector(_v1, Math.cos(a) * r).addScaledVector(_v2, Math.sin(a) * r).normalize();
  let o = _org.clone(), remaining = 280, pierce = w.pierce || 0, end = null;
  for (let it = 0; it <= pierce; it++) {
    const res = traceShot(o, _dir, remaining, { ignoreWater: P.underwater });
    if (!res.kind) { end = o.clone().addScaledVector(_dir, remaining); break; }
    applyHit(res, _dir, w, 1, false);
    end = res.point.clone();
    if (it < pierce && (res.kind === 'vitre' || res.kind === 'mouton' || res.kind === 'balle' || res.kind === 'quille' || res.kind === 'meuble' || res.kind === 'lampe')) { o = res.point.clone().addScaledVector(_dir, 0.05); remaining -= res.t + 0.05; continue; }
    break;
  }
  const m = MODELS[WPN.cur];
  m.muzzle.getWorldPosition(_mz);
  spawnTracer(_mz, end, w.id === 'sniper' ? HDR('#ffb8f0', 6) : null, w.tracer, w.id === 'sniper' ? 700 : 420);
  muzzleLight.position.copy(_mz); muzzleLight.intensity = w.id === 'sniper' ? 9 : 5;
  WPN.flashT = w.id === 'sniper' ? 0.07 : 0.045; m.flash.visible = true; m.flash.rotation.z = Math.random() * Math.PI; const fs = rnd(0.75, 1.25); m.flash.scale.set(fs, fs, rnd(0.8, 1.3));
  if (m.ej) { m.ej.getWorldPosition(_v3); _v1.set(1, 0, 0).applyQuaternion(camera.quaternion); _v2.set(0, 1, 0).applyQuaternion(camera.quaternion); spawnShell(_v3, _v1.clone().multiplyScalar(rnd(2.2, 3.2)).addScaledVector(_v2, rnd(1.6, 2.4)).add(P.vel), w.shell); }
  const kick = lerp(w.kick[0], w.kick[1], WPN.ads) * (1 + WPN.heat * 0.4);
  P.pitch = Math.min(1.45, P.pitch + kick); WPN.recoilAcc += kick;
  P.yaw += rnd(-1, 1) * lerp(0.004, 0.0018, WPN.ads) * (w.id === 'sniper' ? 3 : 1);
  WPN.kz += lerp(0.045, 0.022, WPN.ads) * (w.id === 'smg' ? 1 : 1.8); WPN.krx += lerp(0.06, 0.02, WPN.ads) * (w.id === 'smg' ? 1 : 2); WPN.krz += rnd(-0.03, 0.03); WPN.kry += rnd(-0.01, 0.01);
  WPN.heat = Math.min(1, WPN.heat + (w.id === 'smg' ? 0.08 : 0.2));
  P.shake = Math.min(1, P.shake + (w.id === 'sniper' ? 0.6 : w.id === 'fusil' ? 0.25 : 0.12));
  sGun(w.id);
  if (w.id === 'sniper') { WPN.boltT = 0.35; sBolt(0.35); }
  if (NET.on) NET.send('tir', { a: [_mz.x, _mz.y, _mz.z].map((v) => Math.round(v * 100) / 100), b: [end.x, end.y, end.z].map((v) => Math.round(v * 100) / 100), w: WPN.cur });
}
function updateBeam(dt) {
  const w = curW();
  const want = WPN.firing && w.beam && w.over <= 0 && w.energy > 0 && WPN.swTo < 0 && !P.sprinting && !P.dead;
  if (want && !WPN.beamOn) { WPN.beamOn = true; laserStart(); }
  if (!want && WPN.beamOn) { WPN.beamOn = false; laserStop(false); myBeam.g.visible = false; }
  if (w.beam) {
    if (WPN.beamOn) { w.energy -= w.drain * dt; if (w.energy <= 0) { w.energy = 0; w.over = 1.3; WPN.beamOn = false; laserStop(true); myBeam.g.visible = false; } }
    else { w.over = Math.max(0, w.over - dt); if (w.over <= 0) w.energy = Math.min(100, w.energy + w.regen * dt); }
    drawAmmo();
    const m = MODELS[3];
    m.coils.forEach((c, i) => { c.material.color.setHSL((clockU.value * 0.6 + i * 0.12) % 1, 1, 0.6).multiplyScalar(WPN.beamOn ? 5 : 2.2); c.rotation.z += dt * (WPN.beamOn ? 12 : 1.5); });
    m.crystal.rotation.y += dt * (WPN.beamOn ? 15 : 2); m.crystal.scale.setScalar(WPN.beamOn ? 1.3 + Math.sin(clockU.value * 50) * 0.2 : 1);
  }
  if (!WPN.beamOn) return;
  laserPitch(1 - w.energy / 100);
  camera.getWorldPosition(_org); _dir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  WPN.beamTick -= dt;
  if (WPN.beamTick <= 0) {
    const tick = 1 / 24; WPN.beamTick += tick;
    const res = traceShot(_org, _dir, 70, { ignoreWater: P.underwater });
    WPN.beamEnd.copy(res.kind ? res.point : _org.clone().addScaledVector(_dir, 70));
    if (res.kind) {
      applyHit(res, _dir, w, tick, true);
      for (let i = 0; i < 3; i++) spawnSpark(res.point.x, res.point.y, res.point.z, rnd(-3, 3), rnd(0, 4), rnd(-3, 3), rnd(0.2, 0.5));
      if (Math.random() < 0.25 && res.kind === 'statique') spawnHole(res.point, res.n, 1.6);
    }
    if (NET.on) NET.send('laser', { a: [_org.x, _org.y - 0.2, _org.z].map((v) => Math.round(v * 100) / 100), b: [WPN.beamEnd.x, WPN.beamEnd.y, WPN.beamEnd.z].map((v) => Math.round(v * 100) / 100) });
  }
  MODELS[3].muzzle.getWorldPosition(_mz);
  placeBeam(myBeam, _mz, WPN.beamEnd, 1);
  muzzleLight.position.copy(_mz); muzzleLight.color.setHSL((clockU.value * 0.8) % 1, 1, 0.7); muzzleLight.intensity = 4;
  WPN.krz = Math.sin(clockU.value * 60) * 0.004; WPN.kz = 0.008 + Math.sin(clockU.value * 47) * 0.003;
  P.shake = Math.max(P.shake, 0.08);
}
function updateWeapon(dt, mv) {
  const w = curW();
  // changement d'arme
  if (WPN.swTo >= 0) {
    WPN.sw += dt / 0.2;
    if (WPN.sw >= 1 && WPN.cur !== WPN.swTo) { MODELS[WPN.cur].g.visible = false; WPN.cur = WPN.swTo; MODELS[WPN.cur].g.visible = true; drawAmmo(); drawSlots(); }
    if (WPN.sw >= 2) { WPN.sw = 0; WPN.swTo = -1; }
  }
  const swK = WPN.swTo >= 0 ? (WPN.sw < 1 ? easeInOut(WPN.sw) : 1 - easeInOut(WPN.sw - 1)) : 0;
  const scoped = w.scope && WPN.ads > 0.8;
  WPN.ads = damp(WPN.ads, P.aiming && !WPN.reloading && !mv.sprint && WPN.swTo < 0 && !P.dead ? 1 : 0, w.scope ? 9 : 12, dt);
  $('lunette').style.opacity = scoped ? String(clamp((WPN.ads - 0.8) * 6, 0, 1)) : '0';
  WPN.cd -= dt; WPN.boltT = Math.max(0, WPN.boltT - dt);
  if (!WPN.firing) { WPN.heat = damp(WPN.heat, 0, 4, dt); const r = WPN.recoilAcc * Math.min(1, dt * 5); P.pitch -= r; WPN.recoilAcc -= r; WPN.semiReady = true; }
  if (!w.beam && WPN.firing && !WPN.reloading && !mv.sprint && WPN.swTo < 0 && !P.dead && !P.ui) {
    let n = 0;
    while (WPN.cd <= 0 && n < 3 && (w.auto || WPN.semiReady)) {
      if (w.ammo > 0) { shoot(); WPN.cd += w.rate; WPN.semiReady = false; }
      else { sClick(3200, 0.3); WPN.cd = 0.25; startReload(); break; }
      n++;
    }
  }
  if (WPN.cd < -0.1) WPN.cd = 0;
  updateBeam(dt);
  // rechargement
  let rx = 0, rz = 0, py = 0;
  const m = MODELS[WPN.cur];
  if (WPN.reloading) {
    WPN.rt += dt; const t = WPN.rt / w.reload;
    const tilt = Math.sin(Math.min(1, t) * Math.PI);
    rz = tilt * 0.55; rx = tilt * -0.25; py = -tilt * 0.06;
    if (m.mag) {
      if (t < 0.22) m.mag.position.copy(m.magHome);
      else if (t < 0.45) { m.mag.position.set(m.magHome.x, m.magHome.y - easeInOut((t - 0.22) / 0.23) * 0.35, m.magHome.z); if (WPN.rStage === 0) { WPN.rStage = 1; sClick(1800, 0.35); } }
      else if (t < 0.72) m.mag.position.set(m.magHome.x, m.magHome.y - (1 - easeOut((t - 0.45) / 0.27)) * 0.35, m.magHome.z);
      else { m.mag.position.copy(m.magHome); if (WPN.rStage === 1) { WPN.rStage = 2; sClick(2400, 0.45); w.ammo = w.mag; drawAmmo(); } }
    }
    if (t > 0.82 && WPN.rStage === 2) { WPN.rStage = 3; sClick(1400, 0.4); sClick(2600, 0.3, 0.07); WPN.kz += 0.04; }
    if (t >= 1) { WPN.reloading = false; $('recharge').style.opacity = '0'; if (m.mag) m.mag.position.copy(m.magHome); if (w.ammo < w.mag) { w.ammo = w.mag; drawAmmo(); } }
  }
  WPN.kz = damp(WPN.kz, 0, 16, dt); WPN.krx = damp(WPN.krx, 0, 14, dt); WPN.kry = damp(WPN.kry, 0, 12, dt); WPN.krz = damp(WPN.krz, 0, 10, dt);
  WPN.swx = clamp(damp(WPN.swx, 0, 7, dt), -0.05, 0.05); WPN.swy = clamp(damp(WPN.swy, 0, 7, dt), -0.05, 0.05);
  const a = WPN.ads, b = mv.bobAmt;
  WPN.sprintK = damp(WPN.sprintK, mv.sprint ? 1 : 0, 9, dt);
  const sK = WPN.sprintK;
  const bx = Math.sin(WPN.bob) * 0.012 * b * (1 + sK), by = -Math.abs(Math.cos(WPN.bob)) * 0.012 * b * (1 + sK);
  const swayK = lerp(1, 0.25, a);
  const boltK = WPN.boltT > 0 ? Math.sin((1 - WPN.boltT / 0.35) * Math.PI) : 0;
  const swim = P.swim ? 1 : 0;
  gunRoot.position.set(
    lerp(0.17, 0, a) + bx - WPN.swx * swayK - sK * 0.03,
    lerp(-0.225, m.adsY, a) + by + WPN.swy * swayK + py - P.land * 0.04 - sK * 0.05 + Math.sin(clockU.value * 1.3) * 0.002 * (1 - a) - swK * 0.35 - swim * 0.06 + Math.sin(clockU.value * 2.5) * 0.02 * swim,
    lerp(-0.47, -0.3 - m.sightZ * 0.3, a) + WPN.kz + sK * 0.03
  );
  gunRoot.rotation.set(WPN.krx + rx + sK * -0.35 + WPN.swy * 2 * swayK - swK * 0.6 + boltK * 0.08 + swim * 0.25, lerp(0.035, 0, a) + WPN.kry - WPN.swx * 2 * swayK + sK * 0.55, WPN.krz + rz + bx * 2 + sK * 0.25 + boltK * 0.15);
  gunRoot.visible = !scoped && !P.dead;
  WPN.flashT -= dt; if (WPN.flashT <= 0 && m.flash) m.flash.visible = false;
  if (!WPN.beamOn) muzzleLight.intensity = damp(muzzleLight.intensity, 0, 30, dt);
  return scoped;
}
