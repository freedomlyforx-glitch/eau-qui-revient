/* =========================================================
   Le relief et la mer : sable mouillé qui brille, écume au bord,
   reflets du couchant, marée qui remonte la nuit
   ========================================================= */
const T_LITE = renderer.capabilities.maxTextures < 16 || /[?&]lite=1/.test(location.search);      // très vieux matériel : on se passe des couches roche et dallage
const terrainU = { uSeaY: { value: SEA.surf }, uTime: clockU, uNight: NIGHT,
  uBlobC: { value: new THREE.Vector2(9999, 9999) }, uBlobA: { value: new THREE.Vector2(1, 1) }, uK1: { value: new V3() }, uK2: { value: new V3() }, uRect: { value: new THREE.Vector4(1, 0, 1, 0) },
  uGrassT: { value: TB.grass }, uGrassN: { value: TB.grass.userData.n }, uRockT: { value: TB.rock }, uRockN: { value: TB.rock.userData.n }, uPaveT: { value: T.concrete }, uPaveN: { value: T.concrete.userData.n }, uNoise: { value: T.noise },
  // le chemin dallé de la rampe est peint dans le relief lui-même : plus de nappe posée dessus, donc plus de trous
  uRamp: { value: new THREE.Vector4(RAMP.x0 - 6, RAMP.x1 + 1.2, RAMP.z, 2.6) },
  // grands sols plats déjà couverts par un dallage : le relief ne s'y dessine pas (aucun scintillement possible)
  uPav: { value: [new THREE.Vector4(PROM.x0 + 0.25, PROM.x1 - 0.25, 0.25, PROM.z1 - 0.25), new THREE.Vector4(-15.75, 15.75, PROM.z1 - 0.5, ROAD.z0 + 0.25), new THREE.Vector4(ROAD.x0 + 0.25, ROAD.x1 - 0.25, ROAD.z0 - 1.35, ROAD.z1 + 1.35)] } };
{
  const b = LAGOONS_DEF[0]; if (b) { terrainU.uBlobC.value.set(b.cx, b.cz); terrainU.uBlobA.value.set(b.ax, b.az); terrainU.uK1.value.set(b.k[0], b.k[1], b.k[2]); terrainU.uK2.value.set(b.k[3], b.k[4], b.k[5]); }
  const r = POOLS_DEF[0]; if (r) terrainU.uRect.value.set(r.x0, r.x1, r.z0, r.z1);
}
const terrainExtra = (sh) => {
  Object.assign(sh.uniforms, terrainU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aW; varying vec3 vW3;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW3 = aW;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vW3; uniform sampler2D uGrassT, uGrassN, uRockT, uRockN, uPaveT, uPaveN, uNoise; uniform float uSeaY, uTime, uNight; uniform vec2 uBlobC, uBlobA; uniform vec3 uK1, uK2; uniform vec4 uRect, uRamp; uniform vec4 uPav[3];\n' + CAUSTIC_FN)
    .replace('#include <map_fragment>', [
      '{ vec2 q = (vSoftW.xz - uBlobC) / uBlobA; float th = atan(q.y, q.x); float f = 1.0 + uK1.x*sin(2.0*th+uK1.y) + uK1.z*sin(3.0*th+uK2.x) + uK2.y*sin(5.0*th+uK2.z); if (length(q) < f) discard; }',
      'if (vSoftW.x > uRect.x && vSoftW.x < uRect.y && vSoftW.z > uRect.z && vSoftW.z < uRect.w && vSoftW.y > 2.0) discard;',
      'for (int i = 0; i < 3; i++) { vec4 pv = uPav[i]; if (vSoftW.y < 0.06 && vSoftW.x > pv.x && vSoftW.x < pv.y && vSoftW.z > pv.z && vSoftW.z < pv.w) discard; }',
      'vec2 wp = vSoftW.xz;',
      // grandes variations de teinte : elles cassent la répétition des motifs
      'vec4 tNz = texture2D(uNoise, wp * 0.0047); float tM = tNz.r, tM2 = texture2D(uNoise, wp * 0.023 + 0.37).g;',
      'float tGw = smoothstep(0.32, 0.68, vW3.r + (tM2 - 0.5) * 0.55 * step(0.02, vW3.r) * step(vW3.r, 0.98));',
      'float tRw = smoothstep(0.3, 0.7, vW3.g + (tNz.b - 0.5) * 0.5 * step(0.02, vW3.g));',
      'float tPx = min(wp.x - uRamp.x, uRamp.y - wp.x), tPz = uRamp.w - abs(wp.y - uRamp.z), tPe = min(tPx, tPz), tPw = smoothstep(0.0, 0.1, tPe);',
      'vec3 tC = mix(texture2D(map, wp * 0.23).rgb, texture2D(map, wp * 0.061 + 0.31).rgb, 0.3 + 0.3 * tM2) * (0.66 + 0.2 * tM);',
      'vec3 tN = texture2D(normalMap, wp * 0.23).xyz * 2.0 - 1.0; float tRo = 0.95;',
      'if (tGw > 0.003) { vec3 g = mix(texture2D(uGrassT, wp * 0.2).rgb, texture2D(uGrassT, wp * 0.047 + 0.17).rgb, 0.4) * (0.8 + 0.4 * tM); g = mix(g, g * vec3(1.14, 1.04, 0.78), smoothstep(0.52, 0.8, tM2) * 0.45);',
      '  tC = mix(tC, g, tGw); tN = mix(tN, texture2D(uGrassN, wp * 0.2).xyz * 2.0 - 1.0, tGw); tRo = mix(tRo, 0.9, tGw); }',
      T_LITE ? 'if (tRw > 0.003) { tC = mix(tC, mix(vec3(0.60, 0.50, 0.70), vec3(0.86, 0.66, 0.66), tNz.g) * (0.8 + 0.4 * tM), tRw); tRo = mix(tRo, 0.8, tRw); }' : [
        'if (tRw > 0.003) { vec3 an = abs(inverseTransformDirection(normalize(vNormal), viewMatrix)); vec2 ru = (an.y > 0.72 ? wp : (an.x > an.z ? vSoftW.zy : vSoftW.xy)) * 0.13;',
        '  tC = mix(tC, texture2D(uRockT, ru).rgb * (0.85 + 0.3 * tM), tRw); tN = mix(tN, texture2D(uRockN, ru).xyz * 2.0 - 1.0, tRw); tRo = mix(tRo, 0.8, tRw); }'].join('\n'),
      T_LITE ? 'if (tPw > 0.003) { tC = mix(tC, vec3(0.80, 0.74, 0.82) * (0.9 + 0.2 * tNz.a), tPw); tRo = mix(tRo, 0.85, tPw); }' : [
        'if (tPw > 0.003) { vec4 pn = texture2D(uPaveN, wp * 0.5); vec3 pc = texture2D(uPaveT, wp * 0.5).rgb * vec3(0.9, 0.86, 0.91) * mix(0.7, 1.0, smoothstep(0.1, 0.3, tPe));',
        '  tC = mix(tC, pc, tPw); tN = mix(tN, pn.xyz * 2.0 - 1.0, tPw); tRo = mix(tRo, 0.88 * pn.a, tPw); }'].join('\n'),
      'diffuseColor.rgb = tC;',
      'float tWet = (1.0 - smoothstep(uSeaY + 0.03, uSeaY + 0.5, vSoftW.y)) * (1.0 - tGw) * (1.0 - tRw * 0.6) * (1.0 - tPw);',
      'diffuseColor.rgb *= mix(1.0, 0.56, tWet);'
    ].join('\n'))
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(tRo, 0.14, tWet * smoothstep(uSeaY - 0.5, uSeaY - 0.05, vSoftW.y));')
    .replace('#include <normal_fragment_maps>', 'normal = perturbNormal2Arb( - vViewPosition, normal, normalize( vec3( tN.xy * (1.0 - 0.8 * tWet), tN.z ) ), faceDirection );')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += caustF(vSoftW.xz, uTime) * vec3(0.45,0.95,1.0) * 0.22 * (1.0 - uNight * 0.7) * smoothstep(uSeaY - 0.05, uSeaY - 0.7, vSoftW.y) * (1.0 - smoothstep(uSeaY - 5.0, uSeaY - 11.0, vSoftW.y));');
};
terrainExtra.key = 'relief2';
const terrainMat = std({ color: C('#ffffff'), map: TB.sand, normalMap: TB.sand.userData.n, roughness: 1, envMapIntensity: 1.25 }, terrainExtra);
{
  const nx = TG.nx, nz = TG.nz, n = nx * nz, pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), aw = new Float32Array(n * 3), idx = [];
  const nrm = new V3();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = TG.x0 + i * TG.d, z = TG.zs[j], h = TG.h[k];
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; uv[k * 2] = x; uv[k * 2 + 1] = z;
    terrainNormal(x, z, nrm);
    const slope = 1 - nrm.y, hillQ = Math.hypot((x - HILL.cx) / HILL.rx, (z - HILL.cz) / HILL.rz);
    let grass = z >= 0 ? 1 : 0;
    if (hillQ < 1.02 && h > 0.2) grass = 1;
    if (z < 0 && x < PROM.x0 && h > -0.6) grass = Math.max(grass, smooth(-0.6, 0.2, h));
    if (z < 0 && x > PROM.x1 && h > -0.6) grass = Math.max(grass, smooth(-0.6, 0.2, h));
    let rock = smooth(0.16, 0.34, slope) * (h > -2.2 ? 1 : 0.4);
    if (grass > 0.5 && h > 0.9) rock = 0;                      // les talus de la colline et de la rampe restent en herbe
    if (z > -0.5 && z < 0.5 && x > PROM.x0 && x < PROM.x1) rock = 0;
    if (Math.hypot((x + 147) / 17, (z + 62) / 30) < 1 && h > -1.5) rock = Math.max(rock, 0.75);
    if (Math.hypot((x - 178) / 26, (z + 34) / 62) < 1 && h > -1.8) rock = Math.max(rock, 0.8);
    aw[k * 3] = grass; aw[k * 3 + 1] = clamp(rock, 0, 1); aw[k * 3 + 2] = 0;
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aW', new THREE.BufferAttribute(aw, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, terrainMat); m.receiveShadow = true; m.userData.surface = 'herbe'; m.frustumCulled = false; world.add(m);
}
/* ---------- la mer ---------- */
const HM = (() => {
  const w = 265, h = 233, x0 = -264, z0 = -304, d = 2;
  let t;
  if (isWebGL2) { const a = new Uint16Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a[j * w + i] = THREE.DataUtils.toHalfFloat(TH(x0 + i * d, z0 + j * d)); t = new THREE.DataTexture(a, w, h, THREE.RedFormat, THREE.HalfFloatType); }
  else { const a = new Uint8Array(w * h * 4); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = clamp((TH(x0 + i * d, z0 + j * d) + 13) / 32, 0, 1) * 255; a[(j * w + i) * 4] = v; a[(j * w + i) * 4 + 3] = 255; } t = new THREE.DataTexture(a, w, h, THREE.RGBAFormat, THREE.UnsignedByteType); }
  t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return { t, r: new THREE.Vector4(x0, z0, 1 / ((w - 1) * d), 1 / ((h - 1) * d)), packed: !isWebGL2 };
})();
const WAVE_GLSL = 'float wv(vec2 p, float t){ return sin(dot(p, vec2(0.05, 0.12)) + t*0.9)*0.5 + sin(dot(p, vec2(-0.14, 0.08)) + t*1.25)*0.3 + sin(dot(p, vec2(0.22, 0.2)) - t*1.7)*0.2; }\nvec2 wvG(vec2 p, float t){ return vec2(0.05, 0.12)*cos(dot(p, vec2(0.05, 0.12)) + t*0.9)*0.5 + vec2(-0.14, 0.08)*cos(dot(p, vec2(-0.14, 0.08)) + t*1.25)*0.3 + vec2(0.22, 0.2)*cos(dot(p, vec2(0.22, 0.2)) - t*1.7)*0.2; }';
const seaMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({
    uTime: clockU, uSeaY: terrainU.uSeaY, uNight: NIGHT, uHM: { value: HM.t }, uHMr: { value: HM.r }, uAmp: { value: 0.17 },
    uSunDir: { value: SKY_SUN }, uSunCol: { value: HDR('#ffd0a8', 5.5) }, uMoonDir: { value: LIGHT_DIR }, uMoonCol: { value: HDR('#cfd8ff', 2.2) },
    uRip: { value: SEA.ripples }, uC: { value: new THREE.Vector2(SEA.cx, SEA.cz) }, uFW: { value: new V3() },
    uFogColor: FOG.color, uFogDensity: FOG.density, uFogSun: FOGU.sun, uFogSunCol: FOGU.col,
    uWN: { value: T.waterN }, uRefl: { value: null }, uReflM: { value: new THREE.Matrix4() }, uReflOn: { value: 0 }
  }, SKYU),
  vertexShader: [
    'uniform float uTime, uAmp; varying vec3 vW;', WAVE_GLSL,
    'void main(){ vec4 w = modelMatrix * vec4(position, 1.0); float k = 1.0 - smoothstep(180.0, 560.0, length(w.xz - cameraPosition.xz)); w.y += wv(w.xz, uTime) * uAmp * k; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }'
  ].join('\n'),
  fragmentShader: [
    'uniform float uTime, uSeaY, uNight, uAmp, uReflOn, uFogDensity; uniform sampler2D uHM, uWN, uRefl; uniform mat4 uReflM; uniform vec4 uHMr; uniform vec3 uSunDir, uSunCol, uMoonDir, uMoonCol, uFW, uFogColor, uFogSun, uFogSunCol; uniform vec4 uRip[6]; uniform vec2 uC;',
    'varying vec3 vW;', SKY_GLSL, WAVE_GLSL,
    'float terrH(vec2 p){ float v = texture2D(uHM, (p - uHMr.xy) * uHMr.zw).r; return ' + (HM.packed ? 'v * 32.0 - 13.0' : 'v') + '; }',
    'void main(){',
    '  vec2 p = vW.xz; float t = uTime; vec3 Vd = cameraPosition - vW; float dist = length(Vd); vec3 V = Vd / dist;',
    '  float depth = uSeaY - terrH(p);',
    '  if (depth < -0.35) discard;',
    '  float near = 1.0 - smoothstep(50.0, 380.0, dist);',
    // houle large (calculée) + trois couches de vaguelettes (carte de relief qui défile) ; l'eau se calme tout au bord
    '  vec2 g = wvG(p, t) * uAmp * 2.2;',
    '  vec2 a1 = texture2D(uWN, p * 0.041 + vec2(t * 0.011, t * 0.007)).xy - 0.5, a2 = texture2D(uWN, p * 0.117 + vec2(-t * 0.019, t * 0.015)).xy - 0.5, a3 = texture2D(uWN, p * 0.39 + vec2(t * 0.027, -t * 0.036)).xy - 0.5;',
    '  g -= (a1 * 0.5 + a2 * 0.36 * near + a3 * 0.26 * near) * mix(0.45, 1.0, smoothstep(0.0, 1.6, depth));',
    '  float sp = texture2D(uNoise, p * 0.31 + t * 0.02).a;',
    '  float foamR = 0.0;',
    '  for (int i = 0; i < 6; i++) { vec4 r = uRip[i]; float age = t - r.z; if (age > 0.0 && age < 4.0) { vec2 dv = p - uC - r.xy; float d = length(dv); float w = sin((d - age*2.4)*5.0) * exp(-abs(d - age*2.4)*1.1) * (1.0 - age/4.0) * r.w; g += dv / max(d, 0.01) * w * 0.3; foamR += max(w, 0.0) * 0.35; } }',
    '  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));',
    '  bool below = cameraPosition.y < vW.y;',
    '  if (below) N = -N;',
    '  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
    '  vec3 Rv = reflect(-V, N); Rv.y = abs(Rv.y) + 0.02; Rv = normalize(Rv);',
    '  vec3 sd = normalize(uSunDir), md = normalize(uMoonDir); float sunVis = smoothstep(-0.07, 0.02, sd.y);',
    '  vec3 ld = mix(sd, md, step(0.5, uNight));',
    '  vec3 refl = skyAt(Rv, ld);',
    // reflet du décor (jetée, grande roue, lampions…) : image miroir rendue à part, troublée par les vagues
    '  if (uReflOn > 0.5) { vec4 rc = uReflM * vec4(vW.x, uSeaY, vW.z, 1.0); vec2 ruv = rc.xy / rc.w + N.xz * 0.07 * clamp(14.0 / dist, 0.1, 1.0); vec3 pr = texture2D(uRefl, clamp(ruv, 0.002, 0.998)).rgb; refl = mix(refl, pr, mix(0.5, 0.86, clamp(40.0 / dist, 0.0, 1.0))); }',
    '  float dk = 1.0 - exp(-max(depth, 0.0) * 0.42);',
    '  vec3 shallow = mix(vec3(0.20, 0.80, 0.78), vec3(0.04, 0.17, 0.30), uNight), deep = mix(vec3(0.04, 0.20, 0.46), vec3(0.012, 0.022, 0.09), uNight);',
    '  vec3 body = mix(shallow, deep, dk);',
    '  body += vec3(0.10, 0.50, 0.44) * pow(max(dot(-V, sd), 0.0), 3.0) * 0.3 * sunVis * (1.0 - uNight);',
    '  vec3 col = mix(body, refl, fres * 0.92);',
    '  float ca = max(dot(Rv, sd), 0.0);',
    '  float spk = smoothstep(0.42, 0.85, sp), spk2 = smoothstep(0.56, 0.7, texture2D(uNoise, p * 0.9 - t * 0.05).a);',
    '  col += uSunCol * (pow(ca, 380.0) * 6.0 * (0.25 + spk) + pow(ca, 40.0) * 0.14) * sunVis;',
    '  float cm = max(dot(Rv, md), 0.0);',
    '  col += uMoonCol * (pow(cm, 520.0) * 1.5 * (0.06 + spk2) + pow(cm, 60.0) * 0.04) * uNight;',
    '  col += uFW * (0.25 + 0.75 * sp) * (0.3 + 0.7 * fres);',
    // écume : la frange du rivage avance et recule, des traînées la suivent
    '  float fn = texture2D(uNoise, p * 0.085 + vec2(t * 0.012, -t * 0.008)).b, fn2 = texture2D(uNoise, p * 0.33 - t * 0.02).a;',
    '  float sw = sin(t*0.7 + p.x*0.11) * 0.07 + sin(t*1.1 - p.x*0.05) * 0.04;',
    '  float edge = smoothstep(0.5, 0.0, depth + sw + (fn - 0.5) * 0.3);',
    '  float lines = pow(max(0.0, sin(depth*5.5 + t*1.2 + fn*3.2)), 6.0) * smoothstep(1.7, 0.15, depth) * smoothstep(0.0, 0.1, depth);',
    '  float foam = clamp(edge + lines*0.6 + foamR, 0.0, 1.0) * smoothstep(0.2, 0.55, fn2 + edge * 0.6);',
    '  vec3 foamCol = mix(vec3(1.0, 0.96, 0.97), vec3(0.42, 0.45, 0.72), uNight * 0.8) + uGlow * 0.25 * sunVis;',
    '  col = mix(col, foamCol, foam * 0.92);',
    '  float alpha = mix(smoothstep(0.0, 0.3, depth) * 0.5 + dk * 0.46, 1.0, fres);',
    '  alpha = max(alpha, foam * 0.95) * smoothstep(-0.06, 0.02, depth + sw * 0.6);',
    '  if (below) { col = mix(vec3(0.20, 0.72, 0.80), skyGrad(vec3(0.0, 0.6, 0.0)), 0.35) * (0.6 + 0.6*sp) * (1.0 - uNight * 0.75); alpha = 0.82; }',
    // au loin, la mer redevient la grille du rêve
    '  float far = smoothstep(380.0, 900.0, dist);',
    '  if (far > 0.001) { vec2 gq = p / 24.0; vec2 gf = abs(fract(gq - 0.5) - 0.5) / fwidth(gq); float gl = 1.0 - min(min(gf.x, gf.y), 1.0); col += vec3(1.0, 0.5, 0.82) * gl * far * 0.5; }',
    '  float fogF = 1.0 - exp(-uFogDensity*uFogDensity*dist*dist); float fs = max(dot(-V, uFogSun), 0.0);',
    '  col = mix(col, uFogColor + uFogSunCol * (pow(fs, 8.0) * 0.85 + fs * fs * 0.15), clamp(fogF, 0.0, 1.0));',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n'),
  transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true }
});
const sea = (() => {
  // maille serrée près du rivage, de plus en plus lâche vers le large
  const coords = [0], n0 = 58; let step = 4, v = 0;
  for (let i = 1; i <= n0; i++) { v += 4; coords.push(v); }
  for (let i = 0; i < 16; i++) { step *= 1.36; v += step; coords.push(v); }
  const all = coords.slice(1).reverse().map((c) => -c).concat(coords), N = all.length;
  const pos = new Float32Array(N * N * 3), idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = (j * N + i) * 3; pos[k] = all[i]; pos[k + 1] = 0; pos[k + 2] = all[j] - 96; }
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, seaMat); m.frustumCulled = false; m.renderOrder = 1; m.userData.surface = 'eau'; m.position.y = SEA.surf; world.add(m);
  return m;
})();
// bouées : la limite de la baignade
const buoys = new THREE.Group(); world.add(buoys);
{
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 14, 10), std({ color: C('#ffffff'), roughness: 0.35, emissive: C('#ff5f9f'), emissiveIntensity: 0.35 }), 26);
  for (let i = 0; i < 26; i++) { im.setMatrixAt(i, M4(-175 + i * 14, 0.1, -188)); im.setColorAt(i, C(i % 2 ? '#ff7fb0' : '#fff5fa')); }
  im.frustumCulled = false; buoys.add(im);
}
// l'eau revient : la mer monte à la tombée de la nuit, se retire au petit matin
function updateSea(dt) {
  SEA.surf = SEA.low + SEA.range * smooth(0.15, 1, NIGHT.value);
  terrainU.uSeaY.value = SEA.surf; sea.position.y = SEA.surf; buoys.position.y = SEA.surf + Math.sin(clockU.value * 0.9) * 0.06;
  const fw = seaMat.uniforms.uFW.value; fw.multiplyScalar(Math.exp(-dt * 2.2));
}

/* ---------- reflets du décor dans la mer : la scène est rendue une seconde fois, à l'envers, vue de sous la surface ---------- */
const REFL = { rt: null, cam: new THREE.PerspectiveCamera(), plane: new THREE.Plane(), clip: new THREE.Vector4(), q: new THREE.Vector4(), hide: [] };
REFL.cam.layers.mask = 1;
const _rA = new V3(), _rB = new V3(), _rU = new V3();
function reflSize() {
  const k = PRESETS[qualiteNom].refl;
  if (!k) { if (REFL.rt) { REFL.rt.dispose(); REFL.rt = null; } seaMat.uniforms.uReflOn.value = 0; return; }
  const w = Math.max(64, Math.floor(innerWidth * pixelRatio * k)), h = Math.max(64, Math.floor(innerHeight * pixelRatio * k));
  if (!REFL.rt) { REFL.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); REFL.rt.texture.generateMipmaps = false; }
  else REFL.rt.setSize(w, h);
  seaMat.uniforms.uRefl.value = REFL.rt.texture;
}
function renderReflection() {
  const su = seaMat.uniforms, h = SEA.surf, rc = REFL.cam;
  // inutile sous l'eau, loin dans les terres, ou quand la mer est dans le dos
  if (!REFL.rt || camera.position.y <= h + 0.1 || camera.position.z > 64 || (typeof P !== 'undefined' && P.underwater)) { su.uReflOn.value = 0; return; }
  camera.updateMatrixWorld();
  _rA.setFromMatrixPosition(camera.matrixWorld); _rB.set(0, 0, -1).transformDirection(camera.matrixWorld).add(_rA); _rU.set(0, 1, 0).transformDirection(camera.matrixWorld);
  rc.position.set(_rA.x, 2 * h - _rA.y, _rA.z); rc.up.set(_rU.x, -_rU.y, _rU.z); rc.lookAt(_rB.x, 2 * h - _rB.y, _rB.z);
  rc.fov = camera.fov; rc.aspect = camera.aspect; rc.near = 0.15; rc.far = camera.far; rc.updateProjectionMatrix();
  rc.updateMatrixWorld(); rc.matrixWorldInverse.copy(rc.matrixWorld).invert();
  su.uReflM.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
  // plan de coupe oblique à la surface : rien de ce qui est sous l'eau n'entre dans le reflet
  REFL.plane.setFromNormalAndCoplanarPoint(UP, _rA.set(0, h - 0.02, 0)).applyMatrix4(rc.matrixWorldInverse);
  const pm = rc.projectionMatrix.elements, cp = REFL.clip.set(REFL.plane.normal.x, REFL.plane.normal.y, REFL.plane.normal.z, REFL.plane.constant), q = REFL.q;
  q.set((Math.sign(cp.x) + pm[8]) / pm[0], (Math.sign(cp.y) + pm[9]) / pm[5], -1.0, (1.0 + pm[10]) / pm[14]);
  cp.multiplyScalar(2.0 / cp.dot(q));
  pm[2] = cp.x; pm[6] = cp.y; pm[10] = cp.z + 1.0 - 0.003; pm[14] = cp.w;
  const old = renderer.getRenderTarget(), auto = renderer.autoClear;
  sea.visible = false; for (const o of REFL.hide) o.visible = false;
  renderer.autoClear = true; renderer.setRenderTarget(REFL.rt); renderer.render(scene, rc);
  renderer.setRenderTarget(old); renderer.autoClear = auto;
  sea.visible = true; for (const o of REFL.hide) o.visible = true;
  su.uReflOn.value = 1;
}
