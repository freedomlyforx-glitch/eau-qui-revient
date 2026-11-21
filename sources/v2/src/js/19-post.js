/* =========================================================
   Post-traitement : halo, étalonnage pastel, eau sur l'écran, sous l'eau,
   tourbillon des portes et de l'ordinateur
   ========================================================= */
class LayerPass extends THREE.Pass {
  constructor(sc, cam, mask, clear, near) { super(); this.scene = sc; this.camera = cam; this.mask = mask; this.clearAll = clear; this.near = near; this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) {
    const old = r.autoClear; r.autoClear = false;
    this.camera.layers.mask = this.mask;
    if (this.camera.near !== this.near) { this.camera.near = this.near; this.camera.updateProjectionMatrix(); }
    r.setRenderTarget(this.renderToScreen ? null : readBuffer);
    if (this.clearAll) r.clear(true, true, false); else r.clearDepth();
    r.render(this.scene, this.camera);
    r.autoClear = old;
  }
}
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uWet: { value: 0 }, uFlash: { value: 0 }, uKill: { value: 0 }, uHurt: { value: 0 }, uExposure: { value: 1.05 }, uRes: { value: new THREE.Vector2(1, 1) }, uUnder: { value: 0 }, uWarp: { value: 0 }, uPix: { value: 0 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float uTime, uWet, uFlash, uKill, uHurt, uExposure, uUnder, uWarp, uPix, uFade; uniform vec2 uRes; varying vec2 vUv;',
    'float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'vec3 safe(vec3 c){ return vec3(c.r >= 0.0 && c.r < 6e4 ? c.r : 0.0, c.g >= 0.0 && c.g < 6e4 ? c.g : 0.0, c.b >= 0.0 && c.b < 6e4 ? c.b : 0.0); }',
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
    'vec3 toSRGB(vec3 c){ c = max(c, vec3(0.0)); vec3 lo = c*12.92; vec3 hi = 1.055*pow(c, vec3(1.0/2.4)) - 0.055; return mix(lo, hi, step(vec3(0.0031308), c)); }',
    'vec3 drops(vec2 uv, float t, float amt){',
    '  vec2 asp = vec2(uRes.x/uRes.y, 1.0); vec3 acc = vec3(0.0);',
    '  for (int L = 0; L < 3; L++) { float fl = float(L); float sc = 4.0 + fl*3.0;',
    '    vec2 g = uv*asp*sc + vec2(fl*7.3, 0.0); g.y += t*(0.08 + fl*0.05);',
    '    vec2 id = floor(g); vec2 f = fract(g) - 0.5; float h = h21(id + fl*17.0);',
    '    if (h < amt) { vec2 c = (vec2(h21(id+3.1), h21(id+8.7)) - 0.5)*0.55; float r = 0.16 + 0.16*h21(id+5.9);',
    '      vec2 d = (f - c)*vec2(1.0, 1.25); float l = length(d); float m = 1.0 - smoothstep(r*0.75, r, l);',
    '      acc.xy += d*m*(0.9/sc); acc.z = max(acc.z, m*smoothstep(0.0, r, l)); } }',
    '  return acc; }',
    'void main(){',
    '  vec2 uv = vUv; vec3 dr = vec3(0.0);',
    '  if (uWarp > 0.001) { vec2 c = uv - 0.5; float r = length(c); float a = atan(c.y, c.x) + uWarp*6.0*(1.0 - r)*(1.0 - r); r = r*(1.0 - uWarp*0.55); uv = 0.5 + vec2(cos(a), sin(a))*r; }',
    '  if (uPix > 0.001) { float px = mix(1.0, 90.0, uPix); vec2 g = uRes/px; uv = (floor(uv*g)+0.5)/g; }',
    '  if (uUnder > 0.001) { uv += vec2(sin(uv.y*24.0 + uTime*2.2), cos(uv.x*20.0 + uTime*1.8))*0.0035*uUnder; }',
    '  if (uWet > 0.001) { dr = drops(uv, uTime, uWet*0.42); uv -= dr.xy*1.6; }',
    '  vec2 dir = uv - 0.5;',
    '  float ab = 0.0012 + uWet*0.004 + uKill*0.008 + uHurt*0.006 + uWarp*0.02;',
    '  vec3 col = safe(vec3(texture2D(tDiffuse, uv - dir*ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv + dir*ab).b));',
    '  if (uWet > 0.001) { vec2 px = 3.0/uRes;',
    '    vec3 bl = texture2D(tDiffuse, uv + px).rgb + texture2D(tDiffuse, uv - px).rgb + texture2D(tDiffuse, uv + vec2(px.x, -px.y)).rgb + texture2D(tDiffuse, uv + vec2(-px.x, px.y)).rgb;',
    '    col = mix(col, safe(bl)*0.25, uWet*0.55); col += dr.z*uWet*vec3(0.25, 0.32, 0.35); col = mix(col, col*vec3(0.85, 1.0, 1.08), uWet*0.5); }',
    '  col *= uExposure; col = aces(col);',
    '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  col = mix(vec3(lum), col, 1.14);',
    '  col = col*0.97 + vec3(0.012, 0.004, 0.026)*(1.0 - lum);',
    '  float v = 1.0 - smoothstep(0.3, 0.95, length(dir*vec2(1.0, 0.8)));',
    '  col *= mix(vec3(0.66, 0.55, 0.8), vec3(1.0), v);',
    '  if (uUnder > 0.001) { float shaft = pow(0.5+0.5*sin((vUv.x + vUv.y*0.35)*28.0 + uTime*0.8), 6.0)*smoothstep(0.2, 1.0, vUv.y); vec3 uw = col*vec3(0.42, 0.9, 1.0) + vec3(0.0, 0.08, 0.13) + shaft*vec3(0.25,0.45,0.5)*0.35; col = mix(col, uw*mix(0.75, 1.0, v), uUnder); }',
    '  col = mix(col, col*vec3(0.75, 0.95, 1.15) + vec3(0.0, 0.04, 0.07), uHurt*(1.0 - v)*0.9);',
    '  col = toSRGB(col);',
    '  col = clamp(col, 0.0, 1.0); col = mix(col, col*col*(3.0 - 2.0*col), 0.35);',
    '  col += (h21(vUv*uRes + fract(uTime*13.0)*100.0) - 0.5)*0.03;',
    '  col *= 0.988 + 0.012*sin(vUv.y*uRes.y*1.5708);',
    '  col = mix(col, vec3(1.0, 0.95, 0.98), clamp(uFlash + uWarp*uWarp*0.8, 0.0, 1.0));',
    '  col = mix(col, vec3(0.06, 0.04, 0.1), uFade);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
};
THREE.LuminosityHighPassShader.fragmentShader = THREE.LuminosityHighPassShader.fragmentShader.replace(
  'vec4 texel = texture2D( tDiffuse, vUv );',
  'vec4 texel = texture2D( tDiffuse, vUv ); texel.rgb = vec3(texel.r >= 0.0 && texel.r < 6e4 ? texel.r : 0.0, texel.g >= 0.0 && texel.g < 6e4 ? texel.g : 0.0, texel.b >= 0.0 && texel.b < 6e4 ? texel.b : 0.0);');
let composer, bloom, finalPass;
function buildComposer() {
  const w = Math.floor(innerWidth * pixelRatio), h = Math.floor(innerHeight * pixelRatio);
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: isWebGL2 ? Q.msaa : 0 });
  rt.texture.generateMipmaps = false;
  composer = new THREE.EffectComposer(renderer, rt);
  composer.addPass(new LayerPass(scene, camera, 1, true, 0.15));
  composer.addPass(new LayerPass(scene, camera, 2, false, 0.02));
  bloom = new THREE.UnrealBloomPass(new THREE.Vector2(Math.round(w / 2), Math.round(h / 2)), 0.5, 0.55, 0.97);
  const bs = bloom.setSize.bind(bloom); bloom.setSize = (bw, bh) => bs(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));
  composer.addPass(bloom);
  finalPass = new THREE.ShaderPass(FinalShader);
  composer.addPass(finalPass);
  finalPass.uniforms.uRes.value.set(w, h);
}
buildComposer();
function resize() {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const w = Math.floor(innerWidth * pixelRatio), h = Math.floor(innerHeight * pixelRatio);
  composer.setSize(w, h); finalPass.uniforms.uRes.value.set(w, h);
  motes.uniforms.uScale.value = h * 0.5;
}
addEventListener('resize', resize);
function applyQuality(name) {
  qualiteNom = name; store('qualite', name);
  const p = PRESETS[name];
  pixelRatio = Math.min(window.devicePixelRatio || 1, p.pr); resize();
  sun.castShadow = p.shadows; if (sun.shadow.map && sun.shadow.mapSize.x !== p.shadow) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(p.shadow, p.shadow);
  setMonsterQuality(p.trans);
  renderer.shadowMap.needsUpdate = true;
}
