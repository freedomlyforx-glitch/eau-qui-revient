/* =========================================================
   Portes lumineuses (téléportation), nuages praticables, trampolines
   ========================================================= */
const PORTALS = [];
const portalGlow = new THREE.MeshBasicMaterial({ color: HDR('#fff0f8', 6), side: THREE.DoubleSide });
const portalSwirl = new THREE.ShaderMaterial({
  uniforms: { uTime: clockU },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ vec2 p = vUv - 0.5; p.y *= 0.5; float r = length(p); float a = atan(p.y, p.x); float s = sin(a*5.0 + r*30.0 - uTime*3.0)*0.5+0.5; vec3 c = mix(vec3(1.0,0.55,0.85), vec3(0.55,1.0,1.0), s); float e = (1.0 - smoothstep(0.0, 0.5, r)); gl_FragColor = vec4(c*(1.5+3.0*e) + vec3(4.0)*pow(e,3.0), 1.0); }',
  side: THREE.DoubleSide
});
PORTALS_DEF.forEach((d, i) => {
  const base = M4(d.x, d.y, d.z, 0, d.a, 0);
  const P = (geo, mat, x, y, z, ry, cast) => B.add(geo, mat, base.clone().multiply(M4(x, y, z, 0, ry || 0, 0)), cast !== false, true);
  P(boxG(0.14, 2.35, 0.2), MAT.white, -0.62, 1.175, 0); P(boxG(0.14, 2.35, 0.2), MAT.white, 0.62, 1.175, 0); P(boxG(1.38, 0.14, 0.2), MAT.white, 0, 2.35, 0);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.28), portalSwirl);
  plane.position.set(d.x, d.y + 1.14, d.z); plane.rotation.y = d.a; world.add(plane);
  P(boxG(1.05, 2.2, 0.05), accentMat(i + 2), -0.55 + Math.cos(1.0) * 0.525, 1.12, Math.sin(1.0) * 0.525, -1.0);
  const c = Math.cos(d.a), s = Math.sin(d.a);
  addBox(d.x - 0.62 * c, d.z + 0.62 * s, 0.08, 0.12, d.a, d.y - 0.5, d.y + 2.4);
  addBox(d.x + 0.62 * c, d.z - 0.62 * s, 0.08, 0.12, d.a, d.y - 0.5, d.y + 2.4);
  const light = addSoft(d.x, d.y + 1.3, d.z, '#ffe6f4', 2.2, 6);
  PORTALS.push({ x: d.x, y: d.y, z: d.z, a: d.a, c, s, light, plane, cool: 0 });
});
// côté local d'un point par rapport à une porte : x le long, z à travers
function portalLocal(p, x, z) { const dx = x - p.x, dz = z - p.z; return [dx * p.c - dz * p.s, dx * p.s + dz * p.c]; }

/* ---------- nuages praticables ---------- */
const CLOUD_PLATS = [];
const cloudMat = std({ color: C('#fff6fb'), roughness: 1, emissive: C('#ffd9ef'), emissiveIntensity: 0.28, envMapIntensity: 0.4 });
CLOUDS_DEF.forEach((d) => {
  const g = new THREE.Group(); g.position.set(d.x, d.top, d.z); world.add(g);
  const r = d.r;
  const parts = [];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2 + rr(-0.2, 0.2), rad = i < 6 ? rr(0, r * 0.45) : rr(r * 0.55, r * 0.95), s = rr(1.3, 2.1);
    parts.push([new THREE.IcosahedronGeometry(1, 2), M4(Math.cos(a) * rad, -0.55 - rr(0, 0.4), Math.sin(a) * rad, 0, 0, 0, s, s * 0.45, s)]);
  }
  for (let i = 0; i < 8; i++) { const s = rr(1.2, 2.0); parts.push([new THREE.IcosahedronGeometry(1, 1), M4(rr(-r * 0.6, r * 0.6), -1.3 - rr(0, 0.6), rr(-r * 0.6, r * 0.6), 0, 0, 0, s, s * 0.6, s)]); }
  const cm = new THREE.Mesh(mergeList(parts), cloudMat); cm.castShadow = true; cm.receiveShadow = true; cm.userData.surface = 'nuage'; g.add(cm); SHOOT.push(cm);
  addFloorCircle(d.x, d.z, r * 0.95, d.top, { nuage: true });
  CLOUD_PLATS.push({ g, d, ph: Math.random() * 6 });
});
/* ---------- trampolines ---------- */
const TRAMPS = [];
const trampMat = std({ color: C('#3b2a5e'), roughness: 0.6, metalness: 0.1 });
const trampRim = std({ color: C('#ff8fcf'), roughness: 0.4 });
TRAMPS_DEF.forEach((d, i) => {
  const R0 = 1.55, top = d.y + 0.75;
  const g = new THREE.Group(); g.position.set(d.x, d.y, d.z); world.add(g);
  const rimMat = i % 2 ? trampRim : cached('rim2', () => std({ color: C('#7ff0ff'), roughness: 0.4 }));
  B.add(new THREE.TorusGeometry(R0, 0.09, 10, 40), rimMat, M4(d.x, d.y + 0.75, d.z, Math.PI / 2, 0, 0));
  const mat = new THREE.Mesh(new THREE.CircleGeometry(R0 - 0.12, 32).rotateX(-Math.PI / 2), trampMat); mat.position.y = 0.72; mat.receiveShadow = true; g.add(mat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.5, R0 - 0.38, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: HDR('#ffe27a', 1.5) })); ring.position.y = 0.725; g.add(ring);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.add(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), MAT.pole, M4(d.x + Math.cos(a) * R0, d.y + 0.375, d.z + Math.sin(a) * R0, 0, 0, 0.05)); }
  addFloorCircle(d.x, d.z, R0 - 0.1, top, { tramp: i });
  addFloorRing(d.x, d.z, R0 - 0.1, R0 + 0.12, d.y + 0.82, 0, 0, { rim: true });
  addCircle(d.x, d.z, R0 + 0.1, d.y - 0.5, d.y + 0.7);
  TRAMPS.push({ d, g, mat, ring, top, dip: 0 });
  SHOOT.push(mat);
});
function updateProps(dt) {
  const t = clockU.value;
  for (const p of PORTALS) { p.light.k = 2.0 + Math.sin(t * 2.3 + p.x) * 0.5; p.cool = Math.max(0, p.cool - dt); }
  for (const c of CLOUD_PLATS) c.g.position.y = c.d.top + Math.sin(t * 0.6 + c.ph) * 0.04;
  for (const tr of TRAMPS) { tr.dip = damp(tr.dip, 0, 9, dt); tr.mat.position.y = 0.72 - tr.dip * 0.35; tr.ring.position.y = tr.mat.position.y + 0.005; }
}
