/* =========================================================
   Jetpack : apparaît là où le Revenant se dissout pour la 10e fois.
   On passe dessus pour l'équiper ; un appui long sur le saut fait voler.
   ========================================================= */
const JET = { has: false, hold: 0, thrust: false, pick: null, fxT: 0, light: null, k: 0 };
const jetMatA = std({ color: C('#ff9fcd'), roughness: 0.3, metalness: 0.25, envMapIntensity: 1.3 });
const jetMatB = std({ color: C('#efe8ff'), roughness: 0.2, metalness: 0.85, envMapIntensity: 1.6 });
const jetMatC = std({ color: C('#7ff0ff'), roughness: 0.35, metalness: 0.2, emissive: C('#3fd8ff'), emissiveIntensity: 0.35 });
const jetFlameMat = new THREE.MeshBasicMaterial({ color: HDR('#ff9fe0', 4), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
function makeJetpack() {
  const g = new THREE.Group(), add = (geo, mat, x, y, z, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rz) m.rotation.z = rz; m.castShadow = true; g.add(m); return m; };
  const flames = [];
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 18), jetMatA, s * 0.14, 0, 0);
    add(new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), jetMatA, s * 0.14, 0.25, 0);
    add(new THREE.CylinderGeometry(0.125, 0.125, 0.04, 18), jetMatC, s * 0.14, 0.12, 0);
    add(new THREE.CylinderGeometry(0.065, 0.1, 0.12, 14), jetMatB, s * 0.14, -0.31, 0);
    add(new THREE.BoxGeometry(0.02, 0.2, 0.13), jetMatC, s * 0.27, -0.16, 0, s * 0.25);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 10).rotateX(Math.PI), jetFlameMat); f.position.set(s * 0.14, -0.58, 0); f.visible = false; g.add(f); flames.push(f);
  }
  add(new THREE.BoxGeometry(0.14, 0.4, 0.09), jetMatB, 0, 0.02, 0.1);
  add(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: HDR('#7dffb8', 3) }), 0, 0.16, 0.15);
  for (const y of [0.16, -0.12]) add(new THREE.TorusGeometry(0.2, 0.018, 6, 18, Math.PI), jetMatB, 0, y, 0.1).rotation.set(0, 0, 0);
  g.userData.flames = flames;
  return g;
}
const jetBeamMat = new THREE.ShaderMaterial({
  uniforms: { uTime: clockU },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y)*(0.35 + 0.25*sin(vUv.y*30.0 - uTime*6.0)); gl_FragColor = vec4(vec3(1.0,0.7,0.95)*a*1.6, 1.0); }',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
function spawnJetpack(x, z) {
  if (JET.pick || JET.has) return;
  const pl = poolAt(x, z), y = pl ? pl.surf + 0.25 : groundAt(x, z, 2);
  const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
  const jp = makeJetpack(); jp.scale.setScalar(1.7); jp.position.y = 1.2; g.add(jp);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7, 20, 1, true), jetBeamMat); beam.position.y = 3.5; g.add(beam);
  const light = addSoft(x, y + 1.4, z, '#ffb0e8', 2.6, 7);
  JET.pick = { g, jp, x, y, z, light, t: 0 };
  for (let i = 0; i < 4; i++) spawnRing(x, y + 0.05, z, 0.3, 3 + i, 1 + i * 0.3, HDR('#ffd0f0', 1.6));
  spawnConfetti(x, y + 1.5, z, 60, 1);
  sJetPickup();
  setTimeout(() => toast('Un jetpack est apparu là où le Revenant s’est dissous : passe dessus !'), 1400);
}
function equipJetpack() {
  const pk = JET.pick; if (!pk) return;
  world.remove(pk.g); pk.light.on = false; JET.pick = null; JET.has = true;
  spawnConfetti(pk.x, pk.y + 3.2, pk.z, 50, 0.9); flashFx = 0.3; sJetPickup(); sBoing(8);
  $('jetpack').hidden = false;
  toast(DEVICE === 'mobile' ? 'Jetpack équipé : maintiens SAUT pour t’envoler' : 'Jetpack équipé : maintiens ESPACE pour t’envoler');
  if (NET.on) sendProfile();
}
const _jb = new V3();
function updateJetpack(dt) {
  const pk = JET.pick;
  if (pk) {
    pk.t += dt; pk.jp.rotation.y += dt * 1.6; pk.jp.position.y = 1.2 + Math.sin(pk.t * 2.2) * 0.15;
    if (Math.random() < dt * 5) spawnSpark(pk.x + rnd(-0.6, 0.6), pk.y + rnd(0.4, 2.2), pk.z + rnd(-0.6, 0.6), 0, rnd(0.5, 1.5), 0, 0.8);
    if (!P.dead && Math.hypot(P.pos.x - pk.x, P.pos.z - pk.z) < 1.6 && P.pos.y > pk.y - 2.8 && P.pos.y < pk.y + 1.2) equipJetpack();
  }
  if (!JET.light) JET.light = addSoft(0, -50, 0, '#ff9fe0', 0, 7);
  JET.k = damp(JET.k, JET.thrust && gameState === 'jeu' ? 1 : 0, JET.thrust ? 14 : 8, dt);
  jetSound(JET.k);
  JET.light.k = JET.k * 2.6;
  if (JET.k > 0.05) {
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    _jb.set(P.pos.x + sy * 0.35, P.pos.y + 0.75, P.pos.z + cy * 0.35);
    JET.light.p.set(_jb.x, _jb.y - 0.6, _jb.z);
    JET.fxT -= dt;
    if (JET.fxT <= 0 && JET.thrust) {
      JET.fxT = 1 / 40;
      for (const s of [-1, 1]) {
        const x = _jb.x + cy * s * 0.15, z = _jb.z - sy * s * 0.15;
        spawnPuff(_v3.set(x, _jb.y, z), s > 0 ? HDR('#ff9fe0', 2.2) : HDR('#9ff6ff', 2.0), 0.16, 0.32, -3.5, true);
        if (Math.random() < 0.5) spawnSpark(x, _jb.y - 0.1, z, P.vel.x * 0.5 + rnd(-0.5, 0.5), -rnd(4, 7), P.vel.z * 0.5 + rnd(-0.5, 0.5), rnd(0.2, 0.45));
      }
      const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
      if (P.pos.y - g < 4 && Math.random() < 0.3) spawnPuff(_v3.set(P.pos.x + rnd(-0.5, 0.5), g + 0.1, P.pos.z + rnd(-0.5, 0.5)), DUST, 0.6, 0.7, 0.3, false);
      P.shake = Math.max(P.shake, 0.06);
    }
  }
  $('jetFeu').style.opacity = String(0.25 + JET.k * 0.75);
}
