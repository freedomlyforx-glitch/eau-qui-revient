/* =========================================================
   Ombre portée par la lampe la plus proche du joueur, la nuit
   (réglages « Haute » et « Ultra »). La scène est vue d'en haut depuis
   la lampe ; les lumières douces comparent ensuite la distance de chaque
   point à celle du premier obstacle : derrière un obstacle, pas de lumière.
   ========================================================= */
const LSH = { cur: null, k: 0, rt: null, cam: null, mat: null, tick: 0 };
function initLampShadow() {
  if (!LSH_ON) return;
  LSH.rt = new THREE.WebGLRenderTarget(1024, 1024, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  LSH.rt.depthTexture = new THREE.DepthTexture(1024, 1024); LSH.rt.depthTexture.minFilter = LSH.rt.depthTexture.magFilter = THREE.NearestFilter;
  LSH.cam = new THREE.PerspectiveCamera(118, 1, LSHU.par.value.x, LSHU.par.value.y); LSH.cam.layers.set(2);
  LSH.mat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  LSHU.tex.value = LSH.rt.depthTexture;
  // tout le décor opaque peut faire de l'ombre ; le verre, l'eau, les lueurs et le relief n'en font pas
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.noLampShadow || (o.layers.mask & 1) === 0) return;      // (l'arme tenue en main n'est pas dans le décor)
    const m = o.material; if (!m || Array.isArray(m) || m.transparent || m.depthWrite === false || m.isShaderMaterial || m.visible === false) return;
    o.layers.enable(2);
  });
}
function updateLampShadow(dt) {
  if (!LSH.rt) return;
  const par = LSHU.par.value, want = PRESETS[qualiteNom].lampSh ? smooth(0.3, 0.8, NIGHT.value) : 0;
  let best = null, bd = 24;
  if (want > 0) for (const l of softLights) { if (!l.sh || !l.on || l.slot < 0) continue; const d = l.p.distanceTo(camera.position) - (l === LSH.cur ? 2.5 : 0); if (d < bd) { bd = d; best = l; } }
  // changement de lampe : l'ombre s'efface, passe à la nouvelle lampe, puis revient
  if (best !== LSH.cur) { LSH.k = Math.max(0, LSH.k - dt * 5); if (LSH.k === 0) { LSH.cur = best; LSH.tick = 0; } }
  else if (best) LSH.k = Math.min(1, LSH.k + dt * 4);
  const L = LSH.cur;
  if (!L || LSH.k <= 0 || L.slot < 0 || want <= 0) { par.z = 0; par.w = -1; return; }
  if (LSH.tick++ % 2 === 0) {
    const c = LSH.cam, sm = renderer.shadowMap;
    c.position.copy(L.p); c.up.set(0, 0, -1); c.lookAt(L.p.x, L.p.y - 1, L.p.z); c.updateMatrixWorld(); c.matrixWorldInverse.copy(c.matrixWorld).invert();
    LSHU.mat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 1, 0, 0, 0, 0, 1).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
    const old = renderer.getRenderTarget(), om = scene.overrideMaterial, auto = renderer.autoClear, nu = sm.needsUpdate;
    sm.needsUpdate = false; scene.overrideMaterial = LSH.mat; renderer.autoClear = true;
    renderer.setRenderTarget(LSH.rt); renderer.render(scene, c);
    renderer.setRenderTarget(old); scene.overrideMaterial = om; renderer.autoClear = auto; sm.needsUpdate = nu;
  }
  par.z = LSH.k * want; par.w = L.slot;
}
