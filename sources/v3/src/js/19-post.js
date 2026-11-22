/* =========================================================
   Post-traitement : halo, étalonnage pastel, eau sur l'écran, sous l'eau,
   tourbillon des portes et de l'ordinateur
   ========================================================= */
class LayerPass extends THREE.Pass {
  constructor(sc, cam, mask, clear, near, skip) { super(); this.scene = sc; this.camera = cam; this.mask = mask; this.clearAll = clear; this.near = near; this.skip = skip || null; this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) {
    const old = r.autoClear; r.autoClear = false;
    this.camera.layers.mask = this.mask;
    if (this.camera.near !== this.near) { this.camera.near = this.near; this.camera.updateProjectionMatrix(); }
    r.setRenderTarget(this.renderToScreen ? null : readBuffer);
    if (this.clearAll) r.clear(true, true, false); else r.clearDepth();
    // passe de l'arme : le décor entier est mis de côté le temps du dessin, le moteur n'a plus à le parcourir
    const sk = this.skip; if (sk) sk.visible = false;
    r.render(this.scene, this.camera);
    if (sk) sk.visible = true;
    r.autoClear = old;
  }
}
/* ---------- ombrage des recoins et rayons du soleil : calculés en demi-définition à partir de la profondeur ---------- */
const DEPTH_OK = isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
const FX_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const fxMat = new THREE.ShaderMaterial({
  uniforms: { tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uProj: { value: new THREE.Vector2(1, 1) }, uSunUV: { value: new THREE.Vector2(0.5, 0.5) }, uNear: { value: 0.15 }, uFar: { value: 2000 }, uAoK: { value: 0 }, uRayK: { value: 0 } },
  vertexShader: FX_VERT, depthTest: false, depthWrite: false,
  fragmentShader: [
    'uniform sampler2D tDepth; uniform vec2 uRes, uProj, uSunUV; uniform float uNear, uFar, uAoK, uRayK; varying vec2 vUv;',
    'float vz(float d){ return uNear * uFar / ((uFar - uNear) * d - uFar); }',
    'vec3 vp(vec2 uv){ float z = vz(texture2D(tDepth, uv).x); return vec3((uv * 2.0 - 1.0) * uProj * -z, z); }',
    'float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }',
    'void main(){',
    '  float d0 = texture2D(tDepth, vUv).x, ao = 1.0, ray = 0.0;',
    '  if (uAoK > 0.0 && d0 < 0.99995) {',
    '    vec3 p = vp(vUv); vec2 px = 1.0 / uRes;',
    '    vec3 pr = vp(vUv + vec2(px.x, 0.0)), pl = vp(vUv - vec2(px.x, 0.0)), pu = vp(vUv + vec2(0.0, px.y)), pd = vp(vUv - vec2(0.0, px.y));',
    '    vec3 dx = abs(pr.z - p.z) < abs(p.z - pl.z) ? pr - p : p - pl, dy = abs(pu.z - p.z) < abs(p.z - pd.z) ? pu - p : p - pd;',
    '    vec3 n = normalize(cross(dx, dy));',
    '    float R = 0.9, rs = min(R * 0.5 / (uProj.y * -p.z), 0.11), rnd = ign(gl_FragCoord.xy) * 6.2832, occ = 0.0;',
    '    for (int i = 0; i < 10; i++) { float fi = float(i) + 0.5, a = rnd + fi * 2.39996, r = rs * sqrt(fi / 10.0);',
    '      vec3 v = vp(vUv + vec2(cos(a), sin(a)) * r * vec2(uRes.y / uRes.x, 1.0)) - p; float vv = dot(v, v);',
    '      occ += max(0.0, dot(v, n) - 0.03 + 0.004 * p.z) / (sqrt(vv) + 0.02) * max(0.0, 1.0 - vv / (R * R)); }',
    '    ao = 1.0 - clamp(occ * 0.19, 0.0, 1.0) * uAoK * (1.0 - smoothstep(45.0, 80.0, -p.z));',
    '  }',
    '  if (uRayK > 0.0) {',
    '    vec2 dl = (uSunUV - vUv) / 18.0, c = vUv + dl * ign(gl_FragCoord.xy + 7.0); float w = 1.0, acc = 0.0;',
    '    for (int i = 0; i < 18; i++) { c += dl; float s = step(0.99995, texture2D(tDepth, c).x) * step(0.0, c.x) * step(c.x, 1.0) * step(0.0, c.y) * step(c.y, 1.0); acc += s * w * smoothstep(0.55, 0.0, length((c - uSunUV) * vec2(uRes.x / uRes.y, 1.0))); w *= 0.94; }',
    '    ray = acc / 18.0 * uRayK;',
    '  }',
    '  gl_FragColor = vec4(ao, ray, 0.0, 1.0);',
    '}'].join('\n')
});
const fxComp = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, tFx: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uRayCol: { value: new THREE.Color(1, 0.8, 0.6) } },
  vertexShader: FX_VERT, depthTest: false, depthWrite: false,
  fragmentShader: [
    'uniform sampler2D tDiffuse, tFx, tDepth; uniform vec2 uRes; uniform vec3 uRayCol; varying vec2 vUv;',
    'void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 px = 2.0 / uRes;',
    '  vec2 s = (texture2D(tFx, vUv).rg * 2.0 + texture2D(tFx, vUv + px).rg + texture2D(tFx, vUv - px).rg + texture2D(tFx, vUv + vec2(px.x, -px.y)).rg + texture2D(tFx, vUv + vec2(-px.x, px.y)).rg) / 6.0;',
    '  float ao = texture2D(tDepth, vUv).x > 0.99995 ? 1.0 : s.r;',
    '  gl_FragColor = vec4(c.rgb * ao + uRayCol * s.g, c.a); }'].join('\n')
});
class FxPass extends THREE.Pass {
  constructor() { super(); this.needsSwap = true; this.rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); this.rt.texture.generateMipmaps = false; this.fsq = new THREE.FullScreenQuad(fxMat); }
  setSize(w, h) { const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1); this.rt.setSize(hw, hh); fxMat.uniforms.uRes.value.set(hw, hh); fxComp.uniforms.uRes.value.set(w, h); }
  render(r, writeBuffer, readBuffer) {
    fxMat.uniforms.tDepth.value = readBuffer.depthTexture;
    this.fsq.material = fxMat; r.setRenderTarget(this.rt); this.fsq.render(r);
    fxComp.uniforms.tDiffuse.value = readBuffer.texture; fxComp.uniforms.tFx.value = this.rt.texture; fxComp.uniforms.tDepth.value = readBuffer.depthTexture;
    this.fsq.material = fxComp; r.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.fsq.render(r);
  }
}
// image finale : tons, anticrénelage, netteté, puis les effets d'écran (gouttes, sous l'eau, tourbillon)
// uRetro = 1 redonne le rendu "cassette" d'origine (franges colorées, grain, lignes)
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uWet: { value: 0 }, uFlash: { value: 0 }, uKill: { value: 0 }, uHurt: { value: 0 }, uExposure: { value: 1.05 }, uRes: { value: new THREE.Vector2(1, 1) }, uUnder: { value: 0 }, uWarp: { value: 0 }, uPix: { value: 0 }, uFade: { value: 0 }, uFxaa: { value: 1 }, uSharp: { value: 0.35 }, uRetro: { value: 0 }, tBloom: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse, tBloom; uniform float uTime, uWet, uFlash, uKill, uHurt, uExposure, uUnder, uWarp, uPix, uFade, uFxaa, uSharp, uRetro; uniform vec2 uRes; varying vec2 vUv;',
    'float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'vec3 safe(vec3 c){ return vec3(c.r >= 0.0 && c.r < 6e4 ? c.r : 0.0, c.g >= 0.0 && c.g < 6e4 ? c.g : 0.0, c.b >= 0.0 && c.b < 6e4 ? c.b : 0.0); }',
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
    // courbe filmique qui garde mieux les teintes vives dans les hautes lumières
    'vec3 tm(vec3 c){ c = safe(c) * uExposure; vec3 a = aces(c); float L = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 b = c * (aces(vec3(L)).x / max(L, 1e-4)); return clamp(mix(a, b, 0.55), 0.0, 1.0); }',
    'vec3 bl;',
    'vec3 T(vec2 uv){ return tm(texture2D(tDiffuse, uv).rgb + bl); }',
    'float lu(vec3 c){ return dot(sqrt(c), vec3(0.299, 0.587, 0.114)); }',
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
    '  bl = texture2D(tBloom, uv).rgb;',
    '  vec2 dir = uv - 0.5, px = 1.0 / uRes;',
    '  vec3 col = T(uv);',
    '  if (uFxaa > 0.5) {',
    '    vec3 nw = T(uv + vec2(-px.x, -px.y)), ne = T(uv + vec2(px.x, -px.y)), sw = T(uv + vec2(-px.x, px.y)), se = T(uv + px);',
    '    float lM = lu(col), lNW = lu(nw), lNE = lu(ne), lSW = lu(sw), lSE = lu(se);',
    '    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));',
    '    if (lMax - lMin > 0.045) {',
    '      vec2 d = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));',
    '      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);',
    '      d = clamp(d / (min(abs(d.x), abs(d.y)) + red), -8.0, 8.0) * px;',
    '      vec3 a = 0.5 * (T(uv - d * (1.0 / 6.0)) + T(uv + d * (1.0 / 6.0)));',
    '      vec3 b = a * 0.5 + 0.25 * (T(uv - d * 0.5) + T(uv + d * 0.5)); float lB = lu(b);',
    '      col = (lB < lMin || lB > lMax) ? a : b;',
    '    } else col = clamp(col + (col - (nw + ne + sw + se) * 0.25) * uSharp, 0.0, 1.0);',
    '  }',
    '  float ab = uRetro*0.0012 + uWet*0.004 + uKill*0.008 + uHurt*0.006 + uWarp*0.02;',
    '  if (ab > 0.0003) { col.r = T(uv - dir*ab).r; col.b = T(uv + dir*ab).b; }',
    '  if (uWet > 0.001) { vec2 p3 = 3.0*px;',
    '    vec3 bl = (T(uv + p3) + T(uv - p3) + T(uv + vec2(p3.x, -p3.y)) + T(uv + vec2(-p3.x, p3.y))) * 0.25;',
    '    col = mix(col, bl, uWet*0.55); col += dr.z*uWet*vec3(0.25, 0.32, 0.35); col = mix(col, col*vec3(0.85, 1.0, 1.08), uWet*0.5); }',
    '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  col = mix(vec3(lum), col, mix(1.17, 1.14, uRetro));',
    '  col = mix(col, col*0.97 + vec3(0.012, 0.004, 0.026)*(1.0 - lum), uRetro);',
    '  float v = 1.0 - smoothstep(0.3, 0.95, length(dir*vec2(1.0, 0.8)));',
    '  col *= mix(mix(vec3(0.86, 0.82, 0.9), vec3(0.66, 0.55, 0.8), uRetro), vec3(1.0), v);',
    '  if (uUnder > 0.001) { float shaft = pow(0.5+0.5*sin((vUv.x + vUv.y*0.35)*28.0 + uTime*0.8), 6.0)*smoothstep(0.2, 1.0, vUv.y); vec3 uw = col*vec3(0.42, 0.9, 1.0) + vec3(0.0, 0.08, 0.13) + shaft*vec3(0.25,0.45,0.5)*0.35; col = mix(col, uw*mix(0.75, 1.0, v), uUnder); }',
    '  col = mix(col, col*vec3(0.75, 0.95, 1.15) + vec3(0.0, 0.04, 0.07), uHurt*(1.0 - v)*0.9);',
    '  col = toSRGB(col);',
    '  col = clamp(col, 0.0, 1.0); col = mix(col, col*col*(3.0 - 2.0*col), mix(0.42, 0.35, uRetro));',
    '  col += (h21(vUv*uRes + fract(uTime*13.0)*100.0) - 0.5) * mix(0.012, 0.03, uRetro);',
    '  col *= 1.0 - uRetro * (0.012 - 0.012*sin(vUv.y*uRes.y*1.5708));',
    '  col = mix(col, vec3(1.0, 0.95, 0.98), clamp(uFlash + uWarp*uWarp*0.8, 0.0, 1.0));',
    '  col = mix(col, vec3(0.06, 0.04, 0.1), uFade);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
};
THREE.LuminosityHighPassShader.fragmentShader = THREE.LuminosityHighPassShader.fragmentShader.replace(
  'vec4 texel = texture2D( tDiffuse, vUv );',
  'vec4 texel = texture2D( tDiffuse, vUv ); texel.rgb = vec3(texel.r >= 0.0 && texel.r < 6e4 ? texel.r : 0.0, texel.g >= 0.0 && texel.g < 6e4 ? texel.g : 0.0, texel.b >= 0.0 && texel.b < 6e4 ? texel.b : 0.0);');
let composer, bloom, finalPass, fxPass;
function buildComposer() {
  const w = Math.floor(innerWidth * pixelRatio), h = Math.floor(innerHeight * pixelRatio);
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
  rt.texture.generateMipmaps = false;
  if (DEPTH_OK) rt.depthTexture = new THREE.DepthTexture(w, h);
  composer = new THREE.EffectComposer(renderer, rt);
  // la copie interne partagerait la même texture de profondeur : il en faut une vraie pour chaque tampon
  if (DEPTH_OK) composer.renderTarget2.depthTexture = new THREE.DepthTexture(w, h);
  composer.addPass(new LayerPass(scene, camera, 1, true, 0.15));
  fxPass = new FxPass(); fxPass.enabled = false; composer.addPass(fxPass);
  composer.addPass(new LayerPass(scene, camera, 2, false, 0.02, world));
  bloom = new THREE.UnrealBloomPass(new THREE.Vector2(Math.round(w / 2), Math.round(h / 2)), 0.5, 0.55, 0.97);
  const bs = bloom.setSize.bind(bloom); bloom.setSize = (bw, bh) => bs(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));
  // le halo n'est plus recollé sur l'image par une passe plein écran : la dernière passe le lit directement
  bloom.render = function (r, writeBuffer, readBuffer) {
    r.getClearColor(this._oldClearColor); this.oldClearAlpha = r.getClearAlpha();
    const oldAuto = r.autoClear; r.autoClear = false; r.setClearColor(this.clearColor, 0);
    this.highPassUniforms.tDiffuse.value = readBuffer.texture; this.highPassUniforms.luminosityThreshold.value = this.threshold;
    this.fsQuad.material = this.materialHighPassFilter; r.setRenderTarget(this.renderTargetBright); r.clear(); this.fsQuad.render(r);
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const m = this.separableBlurMaterials[i]; this.fsQuad.material = m;
      m.uniforms.colorTexture.value = input.texture; m.uniforms.direction.value = THREE.UnrealBloomPass.BlurDirectionX;
      r.setRenderTarget(this.renderTargetsHorizontal[i]); r.clear(); this.fsQuad.render(r);
      m.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture; m.uniforms.direction.value = THREE.UnrealBloomPass.BlurDirectionY;
      r.setRenderTarget(this.renderTargetsVertical[i]); r.clear(); this.fsQuad.render(r);
      input = this.renderTargetsVertical[i];
    }
    this.fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength; this.compositeMaterial.uniforms.bloomRadius.value = this.radius; this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;
    r.setRenderTarget(this.renderTargetsHorizontal[0]); r.clear(); this.fsQuad.render(r);
    finalPass.uniforms.tBloom.value = this.renderTargetsHorizontal[0].texture;
    r.setClearColor(this._oldClearColor, this.oldClearAlpha); r.autoClear = oldAuto;
  };
  composer.addPass(bloom);
  finalPass = new THREE.ShaderPass(FinalShader);
  composer.addPass(finalPass);
  finalPass.uniforms.uRes.value.set(w, h); fxPass.setSize(w, h);
}
buildComposer();
/* ordre de dessin des objets opaques : d'abord ceux qui partagent le même programme de la carte graphique, puis la même matière.
   Chaque changement de programme oblige à renvoyer toutes les lumières : moins il y en a, moins le téléphone travaille. */
{
  let epoch = 1; const props = renderer.properties;
  const pid = (m) => { if (m._pe !== epoch) { const p = props.get(m).currentProgram; m._pid = p ? p.id : 0; m._pe = epoch; } return m._pid; };
  renderer.setOpaqueSort((a, b) => {
    if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
    if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
    const ma = a.material, mb = b.material;
    if (ma !== mb) { const pa = pid(ma), pb = pid(mb); if (pa !== pb) return pa - pb; if (ma.id !== mb.id) return ma.id - mb.id; }
    if (a.z !== b.z) return a.z - b.z;
    return a.id - b.id;
  });
  setInterval(() => { epoch++; }, 2000);
}
// style d'image : "net" (par défaut) ou "cassette" (le rendu d'origine, franges et grain)
let imageStyle = store('style') === 'cassette' ? 'cassette' : 'net';
function applyStyle(name) { imageStyle = name === 'cassette' ? 'cassette' : 'net'; store('style', imageStyle); finalPass.uniforms.uRetro.value = imageStyle === 'cassette' ? 1 : 0; }
function resize() {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const w = Math.floor(innerWidth * pixelRatio), h = Math.floor(innerHeight * pixelRatio);
  composer.setSize(w, h); finalPass.uniforms.uRes.value.set(w, h);
  motes.uniforms.uScale.value = h * 0.5; if (coastLights) coastLights.uniforms.uH.value = h;
  reflSize(); volSize();
}
addEventListener('resize', resize);
// rayons du soleil et ombrage des recoins : réglés à chaque image selon la qualité, l'heure et la direction du regard
const _sunP = new V3(), _fwd = new V3();
function updateFx() {
  const q = PRESETS[qualiteNom], u = fxMat.uniforms, f = finalPass.uniforms;
  f.uFxaa.value = q.fxaa; f.uSharp.value = q.fxaa ? (pixelRatio < 1.3 ? 0.4 : 0.28) : 0;
  let ray = 0;
  // rayons du soleil le jour ; la nuit, ceux de la lune, plus discrets et bleutés
  const moon = NIGHT.value > 0.6, astre = moon ? LIGHT_DIR : SKY_SUN;
  if (DEPTH_OK && q.rays && (moon || SKY_SUN.y > -0.03) && !P.underwater) {
    camera.getWorldDirection(_fwd); const face = _fwd.dot(astre);
    if (face > 0.15) { _sunP.copy(astre).multiplyScalar(900).add(camera.position).project(camera); u.uSunUV.value.set(_sunP.x * 0.5 + 0.5, _sunP.y * 0.5 + 0.5);
      const k = moon ? smooth(0.6, 1, NIGHT.value) * 0.13 : smooth(-0.03, 0.04, SKY_SUN.y) * (1 - smooth(0.3, 0.6, NIGHT.value)) * 0.24;
      ray = smooth(0.15, 0.5, face) * k * (1 - smooth(0.85, 1.25, Math.max(Math.abs(_sunP.x), Math.abs(_sunP.y)))); }
  }
  const ao = DEPTH_OK && q.ao ? 0.9 : 0;
  fxPass.enabled = ao > 0 || ray > 0.004;
  u.uAoK.value = ao; u.uRayK.value = ray; u.uNear.value = 0.15; u.uFar.value = camera.far;
  const t = Math.tan(camera.fov * Math.PI / 360); u.uProj.value.set(t * camera.aspect, t);
  if (moon) fxComp.uniforms.uRayCol.value.setRGB(0.5, 0.56, 0.95); else fxComp.uniforms.uRayCol.value.copy(SKYU.uGlow.value).multiplyScalar(0.9);
}
function applyQuality(name, auto) {
  qualiteNom = name; if (!auto) store('qualite', name);
  const p = PRESETS[name];
  pixelRatio = Math.min(window.devicePixelRatio || 1, p.pr, IS_TOUCH ? Math.max(1, pixelRatio) : 9); resize();
  sun.castShadow = p.shadows; if (sun.shadow.map && sun.shadow.mapSize.x !== p.shadow) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(p.shadow, p.shadow);
  setShadowArea(p.shW);
  { const st = shadowType(name); if (renderer.shadowMap.type !== st) { renderer.shadowMap.type = st; scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) m.needsUpdate = true; }); } }
  setMonsterQuality(p.trans);
  if (typeof setGrass === 'function') setGrass(p.grass);
  setVolClouds(p.vol);
  renderer.shadowMap.needsUpdate = true;
}
applyStyle(imageStyle);
reflSize(); setVolClouds(Q.vol);
