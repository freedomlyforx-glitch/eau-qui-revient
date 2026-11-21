/* =========================================================
   Feux d'artifice : un seul nuage de points animé par la carte
   graphique. Spectacle à la tombée de la nuit, et à la demande
   depuis le mortier du bout de la jetée.
   ========================================================= */
const FW = { N: 6000, i: 0, q: [], t: 0, show: 0, next: 0, was: 0, dirty: false, D: 1.6 };
const FWCOLS = ['#ff8fcf', '#7ff0ff', '#ffd27a', '#b98cff', '#a3f3dc', '#ffb07a', '#fff5fa'].map((h) => HDR(h, 2.6));
(function buildFireworks() {
  const N = FW.N, g = new THREE.BufferGeometry(), mk = (n, fill) => { const a = new THREE.BufferAttribute(new Float32Array(N * n).fill(fill || 0), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aP0', FW.p0 = mk(3)); g.setAttribute('aV', FW.v = mk(3)); g.setAttribute('aT', FW.tt = mk(3, -1000)); g.setAttribute('aC', FW.c = mk(3));
  FW.mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 700 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'uniform float uTime, uPx; attribute vec3 aP0, aV, aT, aC; varying vec3 vC; varying float vA;',
      'void main() {',
      '  float age = uTime - aT.x, k = clamp(age / max(aT.y, 0.001), 0.0, 1.0);',
      '  vec3 p = aP0 + aV * (1.0 - exp(-' + FW.D.toFixed(1) + ' * age)) / ' + FW.D.toFixed(1) + '; p.y -= 2.0 * age * age;',
      '  vA = (age < 0.0 || age > aT.y) ? 0.0 : (1.0 - k * k * k) * (0.7 + 0.3 * sin(age * 38.0 + aP0.x * 13.0 + aV.y));',
      '  vC = aC; vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = vA > 0.0 ? max(2.0, aT.z * 1.5 * uPx / max(1.0, -mv.z)) : 0.0;',
      '}'].join('\n'),
    fragmentShader: 'varying vec3 vC; varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; if (r > 1.0 || vA <= 0.0) discard; float f = (1.0 - r); gl_FragColor = vec4(vC * vA * f * f * 1.6, 1.0); }',
  });
  FW.pts = new THREE.Points(g, FW.mat); FW.pts.frustumCulled = false; FW.pts.renderOrder = 6; world.add(FW.pts);
})();
function fwEmit(x, y, z, vx, vy, vz, t0, life, size, c) {
  const i = FW.i; FW.i = (i + 1) % FW.N; FW.dirty = true;
  FW.p0.setXYZ(i, x, y, z); FW.v.setXYZ(i, vx, vy, vz); FW.tt.setXYZ(i, t0, life, size); FW.c.setXYZ(i, c.r, c.g, c.b);
}
function fwLaunch(x, y0, z, h, delay, type) {
  const D = FW.D, tau = rnd(1.1, 1.5), vy = (h + 2 * tau * tau) / ((1 - Math.exp(-D * tau)) / D), t0 = FW.t + (delay || 0), c = FWCOLS[(Math.random() * FWCOLS.length) | 0];
  fwEmit(x, y0, z, 0, vy, 0, t0, tau, 1.3, FWCOLS[2]);
  for (let j = 1; j < 10; j++) { const tj = tau * j / 10; fwEmit(x, y0 + vy * (1 - Math.exp(-D * tj)) / D - 2 * tj * tj, z, rnd(-0.6, 0.6), -1.5, rnd(-0.6, 0.6), t0 + tj, 0.7, 0.8, FWCOLS[2]); }
  FW.q.push({ t: t0 + tau, x, y: y0 + h, z, type: type === undefined ? (Math.random() * 5) | 0 : type, c });
}
function fwSalvo(n) { for (let i = 0; i < n; i++) fwLaunch(rnd(-55, 55), SEA.surf, rnd(-205, -172), rnd(50, 82), i * rnd(0.25, 0.5)); }
const _fa = new V3(), _fb = new V3(), _fd = new V3();
function fwBurst(b) {
  const t = FW.t, c = b.c, c2 = FWCOLS[(Math.random() * FWCOLS.length) | 0];
  const ball = (n, s0, s1, col, l0, l1, size) => { for (let i = 0; i < n; i++) { _fd.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)); if (_fd.lengthSq() > 1 || _fd.lengthSq() < 0.01) { i--; continue; } _fd.normalize().multiplyScalar(rnd(s0, s1)); fwEmit(b.x, b.y, b.z, _fd.x, _fd.y, _fd.z, t, rnd(l0, l1), size, col); } };
  if (b.type === 0) ball(240, 40, 50, c, 1.5, 2.2, 1.5);
  else if (b.type === 1) {
    _fa.set(rnd(-0.4, 0.4), 1, rnd(-0.4, 0.4)).normalize(); _fb.set(1, 0, 0).cross(_fa).normalize(); _fd.crossVectors(_fa, _fb);
    for (let i = 0; i < 150; i++) { const a = i / 150 * PI * 2, s = 48; fwEmit(b.x, b.y, b.z, (_fb.x * Math.cos(a) + _fd.x * Math.sin(a)) * s, (_fb.y * Math.cos(a) + _fd.y * Math.sin(a)) * s, (_fb.z * Math.cos(a) + _fd.z * Math.sin(a)) * s, t, rnd(1.5, 1.9), 1.6, c); }
    ball(60, 10, 18, c2, 1.0, 1.5, 1.3);
  } else if (b.type === 2) { ball(150, 44, 52, c, 1.6, 2.1, 1.5); ball(90, 20, 26, c2, 1.3, 1.8, 1.4); }
  else if (b.type === 3) ball(220, 18, 40, FWCOLS[2], 2.6, 3.6, 1.3);
  else for (let i = 0; i < 170; i++) { const a = i / 170 * PI * 2, s = 3.0 * rnd(0.96, 1.04), hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); fwEmit(b.x, b.y, b.z, hx * s, hy * s, rnd(-1, 1), t, rnd(1.7, 2.1), 1.6, FWCOLS[0]); }
  const fw = seaMat.uniforms.uFW.value; fw.x += c.r * 0.22; fw.y += c.g * 0.22; fw.z += c.b * 0.22;
  if (AU.on) { const d = camera.position.distanceTo(_fa.set(b.x, b.y, b.z)), v = clamp(70 / d, 0.12, 0.9), tt = now() + d / 340;
    noiseHit(AU.fx, tt, 1.2, 'lowpass', 520, 45, v); tone(AU.fx, tt, 'sine', 90, 38, 0.5, v * 0.7); noiseHit(AU.fx, tt + 0.3, 0.8, 'highpass', 3800, 2600, v * 0.16); }
}
function updateFireworks(dt) {
  FW.t += dt;
  // spectacle du soir
  const n = NIGHT.value;
  if (FW.was < 0.92 && n >= 0.92 && gameState === 'jeu') { FW.show = 42; FW.next = 1.5; toast('La nuit tombe : le feu d’artifice commence au large'); }
  FW.was = n;
  if (FW.show > 0) { FW.show -= dt; FW.next -= dt; if (FW.next <= 0) { FW.next = FW.show < 7 ? rnd(0.12, 0.3) : rnd(0.5, 1.3); fwLaunch(rnd(-70, 70), SEA.surf, rnd(-210, -172), rnd(50, 84), 0); } }
  for (let i = FW.q.length - 1; i >= 0; i--) if (FW.q[i].t <= FW.t) { fwBurst(FW.q[i]); FW.q.splice(i, 1); }
  if (FW.dirty) { FW.dirty = false; FW.p0.needsUpdate = FW.v.needsUpdate = FW.tt.needsUpdate = FW.c.needsUpdate = true; }
  FW.mat.uniforms.uTime.value = FW.t; FW.mat.uniforms.uPx.value = renderer.domElement.height / (2 * Math.tan(camera.fov * PI / 360));
}
