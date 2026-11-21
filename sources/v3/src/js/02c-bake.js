/* =========================================================
   Atelier de matières : les grandes surfaces (sable, herbe, roche,
   dalles, crépi, bardage, tuiles, bois, bitume) sont peintes par la
   carte graphique au chargement, avec leur relief et leur brillance.
   Chaque matière se répète sans raccord visible.
   ========================================================= */
const BK = { list: [], scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), size: Q.tex || 512 };
BK.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); BK.quad.frustumCulled = false; BK.scene.add(BK.quad);
const BK_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BK_LIB = [
  'varying vec2 vUv;',
  'float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
  'vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }',
  // bruit de valeur périodique : se raccorde tout seul d'un bord à l'autre
  'float pn(vec2 p, vec2 per){ vec2 i = floor(p), f = fract(p); f = f*f*f*(f*(f*6.0-15.0)+10.0); vec2 i0 = mod(i, per), i1 = mod(i + 1.0, per); return mix(mix(h12(i0), h12(vec2(i1.x, i0.y)), f.x), mix(h12(vec2(i0.x, i1.y)), h12(i1), f.x), f.y); }',
  'float fbm(vec2 uv, vec2 per, int oct){ float a = 0.5, s = 0.0, n = 0.0; for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * pn(uv * per + float(i) * 17.3, per); n += a; a *= 0.5; per *= 2.0; } return s / n; }',
  'vec3 vor(vec2 p, vec2 per){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), c = mod(i + g, per), r = g + h22(c) - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = h12(c + 7.31); } else if (d < d2) { d2 = d; } } return vec3(sqrt(d1), sqrt(d2), id); }',
  'float sat(float x){ return clamp(x, 0.0, 1.0); }'
].join('\n');
const G = (hex) => { const c = C(hex); return 'vec3(' + c.r.toFixed(4) + ',' + c.g.toFixed(4) + ',' + c.b.toFixed(4) + ')'; };
function bkRender(mat, rt) { BK.quad.material = mat; renderer.setRenderTarget(rt); renderer.render(BK.scene, BK.cam); renderer.setRenderTarget(null); }
function bkTarget(size, srgb) {
  const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  if (srgb && isWebGL2) rt.texture.encoding = THREE.sRGBEncoding;
  rt.texture.anisotropy = maxAniso; return rt;
}
const bkCopy = new THREE.ShaderMaterial({ uniforms: { tF: { value: null } }, vertexShader: BK_VERT, fragmentShader: 'uniform sampler2D tF; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tF, vUv).rgb, 1.0); }', depthTest: false, depthWrite: false });
// relief : la hauteur (canal alpha du premier passage) devient une carte de normales ; l'alpha final porte la brillance
const bkNorm = new THREE.ShaderMaterial({
  uniforms: { tF: { value: null }, uPx: { value: 1 / 512 }, uAmp: { value: 0.01 }, uR: { value: new THREE.Vector4(1, 1, 0, 1) } }, vertexShader: BK_VERT, depthTest: false, depthWrite: false,
  fragmentShader: [
    'uniform sampler2D tF; uniform float uPx, uAmp; uniform vec4 uR; varying vec2 vUv;',
    'float H(float x, float y){ return texture2D(tF, vUv + vec2(x, y) * uPx).a; }',
    'void main(){ float dx = (H(1.0,-1.0) + 2.0*H(1.0,0.0) + H(1.0,1.0)) - (H(-1.0,-1.0) + 2.0*H(-1.0,0.0) + H(-1.0,1.0)), dy = (H(-1.0,1.0) + 2.0*H(0.0,1.0) + H(1.0,1.0)) - (H(-1.0,-1.0) + 2.0*H(0.0,-1.0) + H(1.0,-1.0));',
    '  vec3 n = normalize(vec3(-vec2(dx, dy) / (8.0 * uPx) * uAmp, 1.0)); float h = H(0.0, 0.0);',
    '  gl_FragColor = vec4(n * 0.5 + 0.5, mix(uR.x, uR.y, smoothstep(uR.z, uR.w, h))); }'
  ].join('\n')
});
// body : code GLSL qui définit « vec4 tx(vec2 uv) » (couleur linéaire, hauteur de 0 à 1)
// o : { size, amp (relief en fraction du motif), rough [r0, r1, h0, h1], repeat [u, v], r (brillance de la matière) }
function bakeTex(name, body, o) {
  o = o || {};
  // les grandes surfaces vues de près ont droit à la pleine finesse, les autres à 512 points au plus
  const size = o.size || (o.big ? BK.size : Math.min(BK.size, 512));
  const F = new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  const m = new THREE.ShaderMaterial({ vertexShader: BK_VERT, fragmentShader: BK_LIB + '\n' + body + '\nvoid main(){ gl_FragColor = tx(vUv); }', depthTest: false, depthWrite: false });
  bkRender(m, F); m.dispose();
  const A = bkTarget(size, true), N = bkTarget(size, false);
  bkCopy.uniforms.tF.value = F.texture; bkRender(bkCopy, A);
  const r = o.rough || [1, 1, 0, 1];
  bkNorm.uniforms.tF.value = F.texture; bkNorm.uniforms.uPx.value = 1 / size; bkNorm.uniforms.uAmp.value = o.amp === undefined ? 0.004 : o.amp; bkNorm.uniforms.uR.value.set(r[0], r[1], r[2], r[3]); bkRender(bkNorm, N);
  F.dispose();
  const rp = o.repeat || [1, 1]; A.texture.repeat.set(rp[0], rp[1]); N.texture.repeat.set(rp[0], rp[1]);
  A.texture.userData.n = N.texture; A.texture.userData.ns = o.ns === undefined ? 1 : o.ns; if (o.r !== undefined) A.texture.userData.r = o.r;
  BK.list.push({ name, map: A.texture, n: N.texture });
  return A.texture;
}
// texture brute sur quatre canaux (bruits pour le ciel, l'écume, les variations de teinte)
function bakeRaw(name, body, size) {
  const rt = bkTarget(size || 256, false);
  const m = new THREE.ShaderMaterial({ vertexShader: BK_VERT, fragmentShader: BK_LIB + '\n' + body + '\nvoid main(){ gl_FragColor = tx(vUv); }', depthTest: false, depthWrite: false });
  bkRender(m, rt); m.dispose(); BK.list.push({ name, map: rt.texture, raw: true });
  return rt.texture;
}

/* ---------- les matières ---------- */
T.noise = bakeRaw('bruit', 'vec4 tx(vec2 uv){ return vec4(fbm(uv, vec2(4.0), 6), fbm(uv + 0.5, vec2(8.0), 5), 1.0 - vor(uv * 6.0, vec2(6.0)).x, fbm(uv + 0.2, vec2(32.0), 4)); }', 256);

// nuages : R = masses bourgeonnantes, G = détail qui ronge les bords, B = grandes zones de ciel clair ou couvert, A = voiles d'altitude
T.cloud = bakeRaw('nuages', `
float wf(vec2 uv, float per){ return 1.0 - vor(uv * per, vec2(per)).x; }
vec4 tx(vec2 uv){
  float p = fbm(uv, vec2(4.0), 6);
  float w = wf(uv, 6.0) * 0.55 + wf(uv + 0.31, 12.0) * 0.3 + wf(uv + 0.67, 24.0) * 0.15;
  float base = sat(p * 0.74 + w * 0.44 - 0.14);
  float det = wf(uv + 0.13, 20.0) * 0.6 + wf(uv + 0.57, 40.0) * 0.4;
  float big = fbm(uv + 0.77, vec2(2.0), 4);
  float cir = fbm(vec2(uv.x + 0.25 * fbm(uv + 0.4, vec2(3.0), 3), uv.y), vec2(3.0, 14.0), 5);
  return vec4(base, det, big, cir); }`, 512);
// la lune : mers sombres, hauts plateaux clairs, cratères et leurs rayons
T.moon = bakeRaw('lune', `
float crat(vec2 uv, float per, float keep, float r){ vec3 v = vor(uv * per, vec2(per)); float on = step(keep, v.z), rr = r * (0.55 + 0.6 * fract(v.z * 7.3)); return on * (smoothstep(rr * 1.35, rr, v.x) * 0.5 - smoothstep(rr * 0.92, rr * 0.35, v.x) * 0.62); }
vec4 tx(vec2 uv){
  vec2 p = uv * 2.0 - 1.0;
  float n1 = fbm(uv + 0.21, vec2(3.0), 6), n2 = fbm(uv + 0.37, vec2(7.0), 5), n3 = fbm(uv + 0.11, vec2(28.0), 4);
  float sea = smoothstep(0.47, 0.6, n1 * 0.78 + n2 * 0.22 + 0.11 * (p.y * 0.55 - p.x * 0.5) + 0.03);
  float alb = mix(0.95, 0.5, sea) * (0.88 + 0.24 * n3) * (0.9 + 0.2 * n2);
  alb += crat(uv, 7.0, 0.5, 0.16) * 0.2 + crat(uv + 0.43, 15.0, 0.45, 0.2) * 0.16 + crat(uv + 0.71, 34.0, 0.4, 0.22) * 0.1;
  // un grand cratère à rayons, en bas, et un autre plus petit dans une mer
  vec2 t1 = p - vec2(-0.12, -0.62); float d1 = length(t1), a1 = atan(t1.y, t1.x);
  float ray = pow(fbm(vec2(a1 / 6.2832 + 0.5, 0.3), vec2(14.0, 1.0), 3), 3.0) * 1.5 * smoothstep(0.85, 0.08, d1) * smoothstep(0.03, 0.09, d1);
  alb += ray * 0.3 + smoothstep(0.085, 0.03, d1) * 0.35 - smoothstep(0.035, 0.012, d1) * 0.25;
  vec2 t2 = p - vec2(-0.36, 0.14); float d2 = length(t2);
  alb += smoothstep(0.26, 0.03, d2) * 0.1 + smoothstep(0.06, 0.02, d2) * 0.3;
  alb = clamp(alb, 0.16, 1.0);
  vec3 col = mix(vec3(0.84, 0.88, 1.0), vec3(1.0, 0.97, 0.93), smoothstep(0.5, 0.95, alb)) * alb;
  return vec4(col, 1.0); }`, 512);
T.moon.wrapS = T.moon.wrapT = THREE.ClampToEdgeWrapping;

// toile des manches : armure sergé, un fil dessus, un fil dessous
T.fabric = bakeTex('toile', `vec4 tx(vec2 uv){
  vec2 p = uv * 40.0; float wx = abs(sin(p.x * 3.14159)), wy = abs(sin(p.y * 3.14159));
  float over = step(0.5, fract((floor(p.x) + floor(p.y)) * 0.5));
  float h = mix(wx * (0.55 + 0.45 * wy), wy * (0.55 + 0.45 * wx), over) * 0.8 + fbm(uv, vec2(64.0), 3) * 0.2;
  return vec4(vec3(0.93 + 0.07 * h) * (0.93 + 0.14 * fbm(uv + 0.3, vec2(6.0), 4)), h); }`, { size: 256, amp: 0.007, rough: [1.0, 0.88, 0.0, 1.0], repeat: [1, 3] });

T.asphalt = bakeTex('bitume', `vec4 tx(vec2 uv){
  float n = fbm(uv, vec2(8.0), 5); vec3 v1 = vor(uv * 96.0, vec2(96.0)), v2 = vor(uv * 220.0, vec2(220.0));
  vec3 col = mix(${G('#665e7e')}, ${G('#8a819f')}, n) * (0.8 + 0.4 * v1.z);
  col = mix(col, ${G('#cfc6dc')}, step(0.9, v2.z) * 0.45); col = mix(col, ${G('#3a3348')}, step(v2.z, 0.1) * 0.5);
  float cr = smoothstep(0.014, 0.0, abs(fbm(uv + 0.7, vec2(3.0), 4) - 0.5)) * smoothstep(0.5, 0.66, fbm(uv + 0.13, vec2(2.0), 2));
  col *= 1.0 - cr * 0.6; col = mix(col, ${G('#5a5270')}, smoothstep(0.6, 0.78, fbm(uv + 0.41, vec2(3.0), 3)) * 0.35);
  return vec4(col, 0.5 - (v1.x - 0.4) * 0.3 - (v2.x - 0.4) * 0.22 - cr * 0.5 + (n - 0.5) * 0.15); }`, { repeat: [1 / 6, 1 / 6], amp: 0.0016, big: true });

T.concrete = bakeTex('beton', `vec4 tx(vec2 uv){
  float n = fbm(uv, vec2(4.0), 5), n2 = fbm(uv + 0.5, vec2(24.0), 4); vec3 v = vor(uv * 70.0, vec2(70.0));
  vec3 col = ${G('#efe5ee')} * (0.84 + 0.22 * n) * (0.94 + 0.12 * n2);
  col = mix(col, ${G('#b9a8c4')}, smoothstep(0.6, 0.8, fbm(uv + 0.21, vec2(3.0), 4)) * 0.25);
  float pore = smoothstep(0.13, 0.04, v.x) * step(0.62, v.z); col *= 1.0 - pore * 0.4;
  vec2 e = min(uv, 1.0 - uv); float joint = smoothstep(0.011, 0.004, min(e.x, e.y)); col *= 1.0 - joint * 0.55;
  float cr = smoothstep(0.008, 0.0, abs(fbm(uv + 0.7, vec2(3.0), 4) - 0.52)) * smoothstep(0.56, 0.7, fbm(uv + 0.13, vec2(2.0), 2)); col *= 1.0 - cr * 0.45;
  return vec4(col, 0.62 + (n2 - 0.5) * 0.3 - pore * 0.5 - joint * 0.6 - cr * 0.4); }`, { repeat: [0.5, 0.5], amp: 0.0022, big: true });

T.siding = bakeTex('bardage', `vec4 tx(vec2 uv){
  float r = uv.y * 10.0, f = fract(r), id = floor(r), ho = h12(vec2(id, 3.0));
  float gr = pn(vec2(uv.x * 6.0 + ho * 10.0, uv.y * 170.0), vec2(6.0, 170.0)), gr2 = pn(vec2(uv.x * 3.0 + ho * 4.0, uv.y * 60.0), vec2(3.0, 60.0));
  vec3 col = vec3(0.9 + 0.07 * gr + 0.03 * gr2) * (0.95 + 0.05 * ho);
  col *= 1.0 - 0.34 * smoothstep(0.84, 1.0, f); col *= 0.97 + 0.03 * fbm(uv, vec2(5.0), 3);
  return vec4(col, (1.0 - f) * 0.9 + (gr - 0.5) * 0.06); }`, { repeat: [0.5, 0.5], amp: 0.0085 });

T.stucco = bakeTex('crepi', `vec4 tx(vec2 uv){
  float n = fbm(uv, vec2(44.0), 5), b = fbm(uv + 0.3, vec2(6.0), 4), t = fbm(uv + 0.6, vec2(14.0), 3);
  vec3 col = vec3(0.9 + 0.08 * n) * (0.94 + 0.08 * b);
  return vec4(col, 0.5 + (n - 0.5) * 0.9 + (t - 0.5) * 0.35 + (b - 0.5) * 0.2); }`, { repeat: [0.5, 0.5], amp: 0.0034 });

T.roof = bakeTex('tuiles', `vec4 tx(vec2 uv){
  vec2 g = uv * 8.0; float row = floor(g.y); g.x += mod(row, 2.0) * 0.5; vec2 f = fract(g); float id = h12(mod(floor(g), 8.0) + 3.1);
  float c = (f.x - 0.5) * 2.0, prof = sqrt(max(0.0, 1.0 - c * c)), lip = smoothstep(0.0, 0.1, f.y);
  float n = fbm(uv, vec2(40.0), 4);
  vec3 col = vec3(0.74 + 0.2 * id) * (0.72 + 0.28 * prof) * (0.6 + 0.4 * lip) * (0.92 + 0.14 * n);
  col = mix(col, vec3(0.5, 0.52, 0.46), smoothstep(0.62, 0.9, fbm(uv + 0.3, vec2(5.0), 4)) * 0.22 * (1.0 - prof * 0.6));
  return vec4(col, prof * 0.62 + (1.0 - f.y) * 0.3 * lip + (n - 0.5) * 0.06); }`, { repeat: [0.55, 0.55], amp: 0.02 });

T.checker = bakeTex('dalles', `vec4 tx(vec2 uv){
  vec2 g = uv * 4.0, f = fract(g), id = floor(g); float ck = mod(id.x + id.y, 2.0);
  vec3 col = mix(${G('#fff6fa')}, ${G('#ffc6dc')}, ck);
  vec3 v = vor(uv * 46.0, vec2(46.0)); float chip = smoothstep(0.34, 0.27, v.x) * step(0.42, v.z);
  vec3 cc = v.z < 0.58 ? ${G('#ff9fc8')} : v.z < 0.74 ? ${G('#a3f3dc')} : v.z < 0.9 ? ${G('#cbb6f4')} : vec3(1.0);
  col = mix(col, cc, chip * (0.34 + 0.2 * ck)); col *= 0.94 + 0.1 * h12(mod(id, 4.0) + 5.0); col *= 0.96 + 0.06 * fbm(uv, vec2(9.0), 4);
  vec2 e = min(f, 1.0 - f); float m = min(e.x, e.y), gr = smoothstep(0.02, 0.008, m);
  col = mix(col, ${G('#cdb9c9')}, gr);
  return vec4(col, smoothstep(0.004, 0.05, m) * 0.85 + 0.1 + (fbm(uv, vec2(64.0), 3) - 0.5) * 0.03); }`, { repeat: [0.5, 0.5], amp: 0.0018, rough: [1.0, 0.34, 0.3, 0.8], r: 0.8, big: true });

T.poolTile = bakeTex('mosaique', `vec4 tx(vec2 uv){
  vec2 g = uv * 8.0, f = fract(g), id = mod(floor(g), 8.0); float v = h12(id + 1.3), v2 = h12(id + 8.1);
  vec3 col = mix(${G('#2f9fd6')}, ${G('#56c4e8')}, v); col = mix(col, ${G('#7fe0ee')}, step(0.86, v2) * 0.7);
  vec2 e = min(f, 1.0 - f); float m = min(e.x, e.y), gr = smoothstep(0.07, 0.045, m);
  col *= 0.94 + 0.08 * fbm(uv, vec2(40.0), 3); col = mix(col, ${G('#e9fbff')}, gr);
  return vec4(col, smoothstep(0.04, 0.16, m) * 0.8 + 0.1); }`, { repeat: [0.8, 0.8], amp: 0.004, rough: [1.0, 0.5, 0.3, 0.8], r: 0.5 });

T.wood = bakeTex('parquet', `vec4 tx(vec2 uv){
  float r = uv.y * 8.0, id = floor(r), fy = fract(r); float xr = uv.x * 3.0 + h12(vec2(id, 1.7)) * 3.0, pid = mod(floor(xr), 3.0) + id * 3.0, fx = fract(xr);
  float tone = h12(vec2(pid, 9.1)); float wp = (fbm(uv + tone, vec2(3.0, 12.0), 3) - 0.5) * 7.0;
  float gr = pn(vec2(uv.x * 5.0 + tone * 7.0, uv.y * 104.0 + wp), vec2(5.0, 104.0)); gr = smoothstep(0.15, 0.85, gr);
  vec3 col = mix(${G('#b17d60')}, ${G('#deb192')}, tone) * (0.84 + 0.22 * gr);
  float gap = max(smoothstep(0.04, 0.012, min(fy, 1.0 - fy)), smoothstep(0.013, 0.004, min(fx, 1.0 - fx)));
  col *= 1.0 - gap * 0.62;
  return vec4(col, 0.72 + (gr - 0.5) * 0.1 - gap * 0.7); }`, { repeat: [0.45, 0.45], amp: 0.0028, rough: [1.0, 0.62, 0.2, 0.6], r: 0.62 });

T.panel = bakeTex('lambris', `vec4 tx(vec2 uv){
  float r = uv.x * 8.0, id = floor(r), fx = fract(r), tone = h12(vec2(id, 4.4));
  float wp = (fbm(uv + tone, vec2(10.0, 3.0), 3) - 0.5) * 6.0;
  float gr = pn(vec2(uv.x * 112.0 + wp, uv.y * 4.0 + tone * 9.0), vec2(112.0, 4.0)); gr = smoothstep(0.1, 0.9, gr);
  vec3 col = mix(${G('#8c5a40')}, ${G('#a86e4e')}, tone) * (0.8 + 0.28 * gr);
  float gap = smoothstep(0.05, 0.015, min(fx, 1.0 - fx)); col *= 1.0 - gap * 0.6;
  return vec4(col, 0.7 + (gr - 0.5) * 0.14 - gap * 0.7); }`, { repeat: [0.5, 0.5], amp: 0.004 });

T.planks = bakeTex('planches', `vec4 tx(vec2 uv){
  float r = uv.y * 10.0, id = floor(r), fy = fract(r); float xr = uv.x + h12(vec2(id, 2.9)), fx = fract(xr), tone = h12(vec2(id + floor(xr) * 3.0, 6.2));
  float wp = (fbm(uv + tone, vec2(3.0, 10.0), 3) - 0.5) * 5.0;
  float gr = pn(vec2(uv.x * 4.0 + tone * 5.0, uv.y * 150.0 + wp), vec2(4.0, 150.0)), gr2 = pn(vec2(uv.x * 9.0, uv.y * 330.0), vec2(9.0, 330.0));
  vec3 col = mix(${G('#d3ad9f')}, ${G('#f0d9cb')}, tone) * (0.8 + 0.2 * smoothstep(0.1, 0.9, gr)) * (0.93 + 0.1 * gr2);
  col = mix(col, ${G('#b9a9b4')}, smoothstep(0.5, 0.8, fbm(uv + 0.2, vec2(4.0), 4)) * 0.4);
  float gap = max(smoothstep(0.07, 0.03, min(fy, 1.0 - fy)), smoothstep(0.006, 0.002, min(fx, 1.0 - fx)));
  float nail = 0.0; for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) nail = max(nail, smoothstep(0.011, 0.007, length(vec2((fx - (i == 0 ? 0.03 : 0.97)) , (fy - (j == 0 ? 0.26 : 0.74)) * 0.1))));
  col *= 1.0 - gap * 0.72; col = mix(col, ${G('#6f6072')}, nail);
  return vec4(col, 0.72 + (gr - 0.5) * 0.22 + (gr2 - 0.5) * 0.08 - gap * 0.72 - nail * 0.12); }`, { repeat: [0.5, 0.5], amp: 0.0052, big: true });
T.planksN = T.planks.userData.n;

T.trunk = bakeTex('tronc', `vec4 tx(vec2 uv){
  float r = uv.y * 16.0, f = fract(r), id = floor(r); float fib = pn(vec2(uv.x * 48.0, uv.y * 6.0 + h12(vec2(id, 1.0)) * 5.0), vec2(48.0, 6.0));
  float ring = smoothstep(0.0, 0.2, f) * (1.0 - smoothstep(0.7, 1.0, f) * 0.6);
  vec3 col = mix(${G('#8a6460')}, ${G('#d3ad9d')}, ring * (0.55 + 0.45 * fib)) * (0.9 + 0.2 * h12(vec2(id, 7.0)));
  return vec4(col, ring * 0.8 + fib * 0.2); }`, { repeat: [2, 1], amp: 0.03, size: 256 });

// terrain : sable ridé par le vent, pelouse, roche (lus par le shader du relief)
const TB = {};
TB.sand = bakeTex('sable', `vec4 tx(vec2 uv){
  float n = fbm(uv, vec2(5.0), 5), f1 = pn(uv * 512.0, vec2(512.0)), f2 = pn(uv * 233.0 + 3.7, vec2(233.0));
  float w = uv.y * 14.0 + (fbm(uv + 0.11, vec2(3.0), 3) - 0.5) * 3.4 + sin(uv.x * 12.5664) * 0.3;
  float rip = pow(0.5 + 0.5 * sin(w * 6.2832), 1.5);
  vec3 col = mix(${G('#dcb9a8')}, ${G('#f3dccb')}, 0.3 + 0.7 * n) * (0.92 + 0.1 * rip) * (0.93 + 0.14 * f1);
  col = mix(col, ${G('#9a7f88')}, step(0.968, h12(floor(uv * 700.0))) * 0.55); col = mix(col, vec3(1.0, 0.97, 0.95), step(0.976, h12(floor(uv * 520.0) + 9.0)) * 0.6);
  return vec4(col, 0.4 + rip * 0.3 * (0.5 + 0.5 * n) + (f1 - 0.5) * 0.09 + (f2 - 0.5) * 0.06); }`, { amp: 0.011, big: true });
TB.sand.repeat.set(0.22, 0.22); TB.sand.userData.n.repeat.set(0.22, 0.22);
TB.grass = bakeTex('herbe', `vec4 tx(vec2 uv){
  float n = fbm(uv, vec2(5.0), 5), n2 = fbm(uv + 0.43, vec2(11.0), 4);
  float b1 = pn(vec2(uv.x + uv.y, uv.y) * vec2(310.0, 70.0), vec2(310.0, 70.0)), b2 = pn(vec2(uv.x - uv.y, uv.y) * vec2(270.0, 90.0) + 5.3, vec2(270.0, 90.0)), b3 = pn(uv * vec2(420.0, 110.0) + 9.1, vec2(420.0, 110.0));
  float bl = max(b1, max(b2 * 0.95, b3 * 0.9));
  vec3 col = mix(${G('#318a58')}, ${G('#69c07f')}, smoothstep(0.25, 0.7, bl)); col = mix(col, ${G('#bdeeb4')}, smoothstep(0.72, 0.95, bl) * 0.8);
  col = mix(col, ${G('#d6e39a')}, smoothstep(0.58, 0.82, n2) * 0.22); col *= 0.8 + 0.34 * n;
  return vec4(col, 0.25 + bl * 0.65 + (n - 0.5) * 0.2); }`, { amp: 0.0075, big: true });
TB.rock = bakeTex('roche', `vec4 tx(vec2 uv){
  float n = fbm(uv, vec2(4.0), 6); vec3 v = vor((uv + (n - 0.5) * 0.16) * 9.0, vec2(9.0)); float crack = smoothstep(0.05, 0.0, v.y - v.x) * smoothstep(0.35, 0.6, fbm(uv + 0.8, vec2(5.0), 3));
  float rd = 1.0 - abs(2.0 * fbm(uv + 0.27, vec2(6.0), 5) - 1.0), f = fbm(uv + 0.6, vec2(48.0), 3);
  vec3 col = mix(${G('#8f76ae')}, ${G('#d9a6b0')}, v.z * 0.35 + n * 0.75) * (0.7 + 0.44 * rd) * (0.9 + 0.16 * f); col *= 1.0 - crack * 0.4;
  return vec4(col, 0.3 + rd * 0.5 + v.z * 0.08 - crack * 0.3 + (f - 0.5) * 0.1); }`, { amp: 0.03 });
// relief de l'eau : vaguelettes à crêtes, lu à plusieurs échelles par la mer et les bassins
TB.water = bakeTex('eau', `vec4 tx(vec2 uv){
  float a = fbm(uv, vec2(4.0), 6), b = fbm(uv + 0.37, vec2(9.0), 5); float h = 0.62 * (1.0 - abs(2.0 * a - 1.0)) + 0.38 * b;
  return vec4(vec3(h), h); }`, { amp: 0.05, size: 512 });
T.waterN = TB.water.userData.n;
bkCopy.dispose(); bkNorm.dispose();
