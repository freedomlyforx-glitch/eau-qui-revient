/* =========================================================
   Ciel synthwave, soleil rayé, montagnes filaires, grille du vide, nuages
   ========================================================= */
const NIGHT = { value: 0 };          // 0 = coucher du soleil, 1 = pleine nuit
const SKY_SUN = SUN_DIR.clone();     // le disque du soleil : il s'enfonce dans la mer à la tombée de la nuit
// ciel partagé : le dégradé, la lueur du soleil et une couche de nuages éclairés par le soleil ou la lune.
// La mer s'en sert aussi pour ses reflets : le ciel et son image restent toujours d'accord.
const SKYU = {
  uTop: { value: C('#7a86e8') }, uMid: { value: C('#c9a2f2') }, uLow: { value: C('#ffa2cb') }, uHor: { value: FOG_COLOR.clone() }, uBelow: { value: C('#e9b8dc') },
  uGlow: { value: HDR('#ffae96', 0.6) }, uCloudLit: { value: C('#fff1e4') }, uCloudDark: { value: C('#b79ad6') }, uCov: { value: 0.5 }, uNoise: { value: T.noise }, uCloudT: { value: 0 }
};
const SKY_GLSL = [
  'uniform vec3 uTop, uMid, uLow, uHor, uGlow, uCloudLit, uCloudDark; uniform float uCov, uCloudT; uniform sampler2D uNoise;',
  'vec3 skyGrad(vec3 d){ float h = d.y; vec3 c = mix(uHor, uLow, smoothstep(0.0, 0.11, h)); c = mix(c, uMid, smoothstep(0.08, 0.34, h)); c = mix(c, uTop, smoothstep(0.3, 0.9, h)); return c; }',
  'float cloudN(vec2 q){ return texture2D(uNoise, q).r * 0.6 + texture2D(uNoise, q * 2.3 + vec2(0.31, 0.17) - uCloudT * 0.7).g * 0.3 + texture2D(uNoise, q * 6.1 + 0.5).a * 0.1; }',
  'vec4 skyClouds(vec3 d, vec3 sd){',
  '  float h = d.y; if (h < 0.012) return vec4(0.0);',
  '  vec2 p = d.xz / (h + 0.16), q = p * 0.085 + vec2(uCloudT, uCloudT * 0.38);',
  '  float n = cloudN(q), dens = smoothstep(uCov, uCov + 0.2, n);',
  '  if (dens < 0.002) return vec4(0.0);',
  // éclairage : on regarde s'il y a moins de nuage en direction de l'astre
  '  vec2 sp = sd.xz / (max(sd.y, 0.02) + 0.16); vec2 ld = normalize(sp - p + vec2(1e-4));',
  '  float n2 = cloudN(q + ld * 0.02); float lit = clamp(0.5 + (n - n2) * 5.0, 0.0, 1.0);',
  '  float ca = max(dot(d, sd), 0.0);',
  '  vec3 col = mix(uCloudDark, uCloudLit, lit) + uGlow * pow(ca, 5.0) * (1.4 - dens * 0.7);',
  '  return vec4(col, dens * smoothstep(0.012, 0.15, h) * 0.94); }',
  'vec3 skyAt(vec3 d, vec3 sd){ vec3 c = skyGrad(d); float ca = max(dot(d, sd), 0.0); c += uGlow * (pow(ca, 10.0) * 0.55 + pow(ca, 220.0) * 1.1); vec4 cl = skyClouds(d, sd); return mix(c, cl.rgb, cl.a); }'
].join('\n');
const skyMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({
    uSunA: { value: HDR('#ffe36e', 1.45) }, uSunB: { value: HDR('#ff4f9f', 1.35) },
    uSunDir: { value: SKY_SUN }, uTime: clockU, uNight: NIGHT, uMoonDir: { value: LIGHT_DIR }, uBelow: SKYU.uBelow
  }, SKYU),
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: [
    SKY_GLSL,
    'uniform vec3 uBelow, uSunA, uSunB, uSunDir, uMoonDir; uniform float uTime, uNight; varying vec3 vDir;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
    'vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }',
    'void main(){',
    '  vec3 d = normalize(vDir); float h = d.y;',
    '  vec3 col = skyGrad(d);',
    '  col = mix(col, uBelow, smoothstep(0.0, 0.1, -h));',
    '  vec3 sd = normalize(uSunDir); float ca = dot(d, sd);',
    // voie lactée et étoiles, puis la lune
    '  if (h > 0.03) { vec2 sp = d.xz/(h+0.3)*240.0; vec2 id = floor(sp); float s = hash(id); if (s > mix(0.993, 0.972, uNight)) { vec2 f = fract(sp)-0.5; float tw = 0.6+0.4*sin(uTime*2.0+s*60.0); col += vec3(1.0,0.92,1.0)*(1.0 - smoothstep(0.0, 0.12, length(f)))*tw*smoothstep(mix(0.3, 0.03, uNight), mix(0.75, 0.3, uNight), h)*(1.3 + uNight*1.2); }',
    '    float mw = texture2D(uNoise, d.xz / (h + 0.4) * 0.35 + 0.2).r; col += vec3(0.55, 0.5, 0.9) * smoothstep(0.45, 0.8, mw) * smoothstep(0.1, 0.5, h) * 0.16 * uNight; }',
    '  col += uGlow*(pow(max(ca,0.0),10.0)*0.55 + pow(max(ca,0.0),220.0)*1.1);',
    '  vec3 rgt = normalize(cross(sd, vec3(0.0,1.0,0.0))); vec3 up = cross(rgt, sd);',
    '  vec2 p = vec2(dot(d,rgt), dot(d,up))/0.125; float r = length(p);',
    '  float above = smoothstep(-0.012, 0.004, h);',
    '  if (ca > 0.0 && r < 1.0 && above > 0.0) {',
    '    float y = p.y; vec3 sc = mix(uSunB, uSunA, smoothstep(-1.0, 0.85, y));',
    '    float band = 1.0;',
    '    if (y < 0.2) { float s = (0.2 - y)/1.2; float f = fract((y + uTime*0.015)*7.0); float gap = s*0.6; band = smoothstep(gap, gap+0.05, f); }',
    '    float edge = 1.0 - smoothstep(0.97, 1.0, r);',
    '    col = mix(col, sc, band*edge*above);',
    '  }',
    '  float ra = acos(clamp(dot(d, -sd), -1.0, 1.0)); float rb = (ra - 0.69)/0.065;',
    '  if (rb > 0.0 && rb < 1.0) { vec3 rc = hue(0.78 - rb*0.78); float a = sin(rb*3.14159)*0.2*smoothstep(-0.01, 0.06, h)*(1.0 - smoothstep(0.3, 0.6, h)); col += rc*a*0.7*(1.0 - uNight); }',
    '  vec3 md = normalize(uMoonDir); float cm = dot(d, md);',
    '  { float mr = acos(clamp(cm, -1.0, 1.0)) / 0.085; if (mr < 1.0) { vec3 mrg = normalize(cross(md, vec3(0.0,1.0,0.0))); vec3 mup = cross(mrg, md); vec2 mp = vec2(dot(d, mrg), dot(d, mup)) / 0.085; float cr = 0.0; for (int i = 0; i < 5; i++) { vec2 cc = vec2(hash(vec2(float(i), 1.3)), hash(vec2(float(i), 7.7))) * 1.3 - 0.65; cr += smoothstep(0.24, 0.1, length(mp - cc)) * 0.12; } float mt = texture2D(uNoise, mp * 0.35 + 0.4).g; vec3 mc = mix(vec3(1.0, 0.86, 0.95), vec3(0.86, 0.9, 1.0), mp.y * 0.5 + 0.5) * (1.0 - cr) * (0.85 + 0.3 * mt) * (1.15 - 0.3 * mr * mr); col = mix(col, mc * (0.55 + 1.3 * uNight), (1.0 - smoothstep(0.94, 1.0, mr)) * (0.3 + 0.7 * uNight)); } col += vec3(0.7, 0.75, 1.0) * pow(max(cm, 0.0), 60.0) * 0.22 * uNight; }',
    // les nuages passent devant, sauf au cœur du soleil et de la lune qui percent au travers
    '  vec3 ld = mix(sd, md, step(0.5, uNight));',
    '  vec4 cl = skyClouds(d, ld); cl.a *= 1.0 - 0.75 * smoothstep(0.985, 0.998, max(ca, 0.0)) - 0.6 * smoothstep(0.992, 0.999, max(cm, 0.0)) * uNight;',
    '  col = mix(col, cl.rgb, clamp(cl.a, 0.0, 1.0));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n'),
  side: THREE.BackSide, depthWrite: false, fog: false
});
let mountMat = null;
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
{
  const segX = 240, segY = 7, Rm = 780, H0 = -6;
  const g = new THREE.PlaneGeometry(1, 1, segX, segY);
  const p = g.attributes.position, colors = [];
  const cBase = C('#8a74c6'), cTop = C('#f1a9d6');
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, a = u * Math.PI * 2;
    const n = Math.max(0, Math.sin(a * 3.0 + 1.3) * 0.5 + Math.sin(a * 7.0 + 0.4) * 0.35 + Math.sin(a * 17.0) * 0.18 + Math.sin(a * 31.0 + 2.0) * 0.08 + 0.35);
    const peak = (24 + 62 * n * n) * Math.pow(v, 1.15) + (R() - 0.5) * 3 * v * (1 - v) * 2;
    const rad = Rm - v * 50;
    p.setXYZ(i, 19 + Math.sin(a) * rad, H0 + peak, -12 + Math.cos(a) * rad);
    const c = cBase.clone().lerp(cTop, v); colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mt = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
  mt.renderOrder = -5; scene.add(mt); mountMat = mt.material;
  const wire = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: HDR('#ff9be0', 1.25), wireframe: true, transparent: true, opacity: 0.45, fog: false }));
  wire.renderOrder = -4; scene.add(wire);
}
const FOG_GLSL_PARS = 'uniform vec3 uFogColor; uniform float uFogDensity;';
const FOG_GLSL = 'float fogD = length(vW - cameraPosition); float fogF = 1.0 - exp(-uFogDensity*uFogDensity*fogD*fogD); col = mix(col, uFogColor, clamp(fogF,0.0,1.0));';
const gridMat = new THREE.ShaderMaterial({
  uniforms: { uBase: { value: C('#cdb0e6') }, uLine: { value: HDR('#ff7fcf', 1.3) }, uLine2: { value: HDR('#8ff6ff', 1.6) }, uTime: clockU, uFogColor: FOG.color, uFogDensity: FOG.density },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: [
    'uniform vec3 uBase, uLine, uLine2; uniform float uTime;', FOG_GLSL_PARS, 'varying vec3 vW;',
    'float gl(vec2 p, float s){ vec2 g = p/s; vec2 f = abs(fract(g-0.5)-0.5)/fwidth(g); return 1.0 - min(min(f.x,f.y), 1.0); }',
    'void main(){ float dist = length(vW.xz - cameraPosition.xz); float pulse = 0.8 + 0.2*sin(uTime*0.9 - dist*0.04);',
    '  vec3 col = uBase + uLine*gl(vW.xz, 4.0)*pulse + uLine2*gl(vW.xz, 24.0)*0.9;',
    FOG_GLSL, ' gl_FragColor = vec4(col,1.0); }'
  ].join('\n'),
  extensions: { derivatives: true }
});
// la grille du vide ne passe que hors du lotissement : sinon elle recouvrait l'eau des piscines
const gridShape = new THREE.Shape();
gridShape.moveTo(-2000, -2000); gridShape.lineTo(2000, -2000); gridShape.lineTo(2000, 2000); gridShape.lineTo(-2000, 2000); gridShape.closePath();
{ const h = new THREE.Path(); h.moveTo(-263, -159); h.lineTo(-263, 303); h.lineTo(263, 303); h.lineTo(263, -159); h.closePath(); gridShape.holes.push(h); }
const gridFloor = new THREE.Mesh(new THREE.ShapeGeometry(gridShape).rotateX(-Math.PI / 2), gridMat);
gridFloor.position.y = -13.5; gridFloor.userData.surface = 'vide'; scene.add(gridFloor); SHOOT.push(gridFloor);
const clouds = [], lowClouds = [];   // (les anciens nuages en vignettes ont laissé la place à la couche de nuages du ciel)
const motes = (() => {
  const n = IS_TOUCH ? 400 : 900, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), ph = new Float32Array(n), col = new Float32Array(n * 3);
  const pal = ['#ffd6f0', '#c9f9ff', '#fff3c4', '#e3d1ff'].map(C);
  for (let i = 0; i < n; i++) { pos[i * 3] = rr(MAP.x0, MAP.x1); pos[i * 3 + 1] = rr(0.4, 16); pos[i * 3 + 2] = rr(MAP.z0, MAP.z1); ph[i] = R() * 100; const c = pal[i % 4]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: clockU, uMap: { value: T.dot }, uScale: { value: innerHeight * pixelRatio * 0.5 } },
    vertexShader: 'attribute float aPh; attribute vec3 aCol; uniform float uTime; uniform float uScale; varying vec3 vC; varying float vA; void main(){ vec3 p = position; p.x += sin(uTime*0.21+aPh)*1.2; p.y += sin(uTime*0.37+aPh*1.7)*0.6; p.z += cos(uTime*0.18+aPh)*1.2; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; float tw = 0.5+0.5*sin(uTime*2.3+aPh*3.0); gl_PointSize = (0.09+0.05*tw)*uScale/max(-mv.z, 0.5); vC = aCol*(1.2+1.6*tw); vA = (1.0 - smoothstep(20.0, 80.0, -mv.z)); }',
    fragmentShader: 'uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC*t.a*vA, 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
})();

/* ---------- soleil, ciel, reflets ---------- */
// contraste fort : peu de lumière d'ambiance, un soleil rasant puissant, les ombres restent mauves
const hemi = new THREE.HemisphereLight(C('#9d8cff'), C('#c06aa0'), 0.055);
const sun = new THREE.DirectionalLight(C('#ffc9a0'), 3.6);
sun.castShadow = Q.shadows; sun.shadow.mapSize.set(Q.shadow, Q.shadow);
// zone couverte par les ombres portées : plus large quand la qualité le permet
let SH_W = Q.shW, SH_H = Q.shW * 0.54;
function setShadowArea(w) { SH_W = w; SH_H = w * 0.54; const sc = sun.shadow.camera; sc.left = -w / 2; sc.right = w / 2; sc.top = SH_H / 2; sc.bottom = -SH_H / 2; sc.near = 1; sc.far = 300; sc.updateProjectionMatrix(); }
setShadowArea(Q.shW);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.045;
scene.add(hemi, sun, sun.target);
const shR = new V3().crossVectors(LIGHT_DIR, UP).normalize(), shU = new V3().crossVectors(shR, LIGHT_DIR).normalize();
function placeSun(x, y, z) {
  const SH_TX = SH_W / sun.shadow.mapSize.x, SH_TY = SH_H / sun.shadow.mapSize.y;
  const p = new V3(x, y * 0.5, z);
  const a = Math.round(p.dot(shR) / SH_TX) * SH_TX, b = Math.round(p.dot(shU) / SH_TY) * SH_TY, c = p.dot(LIGHT_DIR);
  sun.target.position.copy(shR).multiplyScalar(a).addScaledVector(shU, b).addScaledVector(LIGHT_DIR, c);
  sun.position.copy(sun.target.position).addScaledVector(LIGHT_DIR, 140);
  sun.target.updateMatrixWorld();
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMat));
let envRT = pmrem.fromScene(envScene, 0.015, 0.1, 200);
scene.environment = envRT.texture;
function refreshEnv() { const rt = pmrem.fromScene(envScene, 0.015, 0.1, 200); scene.environment = rt.texture; envRT.dispose(); envRT = rt; }
/* ---------- l'heure du rêve : un long coucher de soleil, puis la nuit, puis le soleil hésite et revient ---------- */
const TIME = { t: 215, len: 660, envN: 0, dusk: 300, night: 370, dawn: 590 };
function nightAt(t) { t = ((t % TIME.len) + TIME.len) % TIME.len; if (t < TIME.dusk) return 0; if (t < TIME.night) return smooth(TIME.dusk, TIME.night, t); if (t < TIME.dawn) return 1; return 1 - smooth(TIME.dawn, TIME.len, t); }
const DAYC = { top: C('#5c6cdf'), mid: C('#b18df0'), low: C('#ff9ac2'), hor: C('#ffbdb4'), below: C('#e9b8dc'), fog: C('#f7bcc2'), sun: C('#ffc9a0'), hs: C('#9d8cff'), hg: C('#c06aa0'), glow: HDR('#ffae96', 0.6) };
const NITC = { top: C('#0b0a2c'), mid: C('#251a66'), low: C('#5a3398'), hor: C('#9a4f9f'), below: C('#141034'), fog: C('#2b2058'), sun: C('#8ea0ff'), hs: C('#5a6ae0'), hg: C('#3a2a70'), glow: HDR('#ff8fb8', 0.25) };
const CLD = { dLit: C('#fff4ea'), dDark: C('#b9a0d6'), kLit: C('#ffb49c'), kDark: C('#7558a4'), nLit: C('#5d64a8'), nDark: C('#141335'), moonFog: new THREE.Color(0.1, 0.12, 0.24) };
function applyTime() {
  const n = NIGHT.value, u = skyMat.uniforms;
  u.uTop.value.copy(DAYC.top).lerp(NITC.top, n); u.uMid.value.copy(DAYC.mid).lerp(NITC.mid, n); u.uLow.value.copy(DAYC.low).lerp(NITC.low, n);
  u.uHor.value.copy(DAYC.hor).lerp(NITC.hor, n); u.uBelow.value.copy(DAYC.below).lerp(NITC.below, n);
  // le soleil descend derrière l'horizon pendant le crépuscule
  const el = lerp(SUN_EL, -0.2, smooth(0, 0.8, n));
  SKY_SUN.set(Math.sin(SUN_AZ) * Math.cos(el), Math.sin(el), -Math.cos(SUN_AZ) * Math.cos(el)).normalize();
  u.uGlow.value.copy(DAYC.glow).lerp(NITC.glow, n).multiplyScalar(lerp(1, 0.35, smooth(0.5, 1, n)));
  sun.color.copy(DAYC.sun).lerp(NITC.sun, n); sun.intensity = lerp(2.5, 0.62, n);
  hemi.color.copy(DAYC.hs).lerp(NITC.hs, n); hemi.groundColor.copy(DAYC.hg).lerp(NITC.hg, n); hemi.intensity = lerp(0.055, 0.2, n);
  ZONE_DEF.bloom = lerp(0.24, 0.6, n); ZONE_DEF.fog = lerp(0.0017, 0.0022, n); ZONE_DEF.expo = lerp(0.55, 1.0, n);
  // les montagnes du fond s'assombrissent la nuit : il ne reste que leurs arêtes au néon
  if (mountMat) mountMat.color.setScalar(lerp(1, 0.2, n));
  // nuages : dorés le jour, braise au crépuscule, bleu nuit sous la lune
  const k1 = smooth(0, 0.45, n), k2 = smooth(0.45, 1, n);
  SKYU.uCloudLit.value.copy(CLD.dLit).lerp(CLD.kLit, k1).lerp(CLD.nLit, k2); SKYU.uCloudDark.value.copy(CLD.dDark).lerp(CLD.kDark, k1).lerp(CLD.nDark, k2);
  SKYU.uCloudT.value = clockU.value * 0.0016; SKYU.uCov.value = 0.5 + 0.045 * Math.sin(TIME.t * 0.019);
  // la brume s'éclaire en direction du soleil (ou, plus discrètement, de la lune)
  if (n < 0.5) { FOGU.sun.value.copy(SKY_SUN); FOGU.col.value.copy(u.uGlow.value).multiplyScalar(0.5 * smooth(-0.08, 0.03, SKY_SUN.y)); }
  else { FOGU.sun.value.copy(LIGHT_DIR); FOGU.col.value.copy(CLD.moonFog).multiplyScalar(smooth(0.5, 1, n)); }
  if (Math.abs(n - TIME.envN) > 0.1 || (n !== TIME.envN && (n === 0 || n === 1))) { TIME.envN = n; refreshEnv(); }
}
function setTimeOfDay(t, fromNet) { TIME.t = ((t % TIME.len) + TIME.len) % TIME.len; if (!fromNet && NET.on) NET.send('heure', { t: Math.round(TIME.t) }); }
function updateTime(dt) { TIME.t = (TIME.t + dt) % TIME.len; NIGHT.value = nightAt(TIME.t); applyTime(); }
