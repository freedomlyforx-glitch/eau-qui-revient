/* =========================================================
   Nuages en volume (réglages « Haute » et « Ultra »).
   Le plafond de nuages est parcouru rayon par rayon dans une petite image
   à part, puis posé sur le ciel. Les reflets (mer, piscines, chromes) et
   les réglages plus légers gardent les nuages peints, de même forme.
   ========================================================= */
const VCL = { level: 0, rt: null, rt2: null, fsq: null, fsq2: null, k: 0.32, steps: 34 };
const volMat = new THREE.ShaderMaterial({
  uniforms: {
    uCamR: { value: new V3() }, uCamU: { value: new V3() }, uCamF: { value: new V3() }, uCamPos: { value: new V3() }, uLd: { value: new V3(0, 1, 0) }, uSteps: { value: 20 },
    uCov: SKYU.uCov, uCloudT: SKYU.uCloudT, uCloud: SKYU.uCloud, uCloudLit: SKYU.uCloudLit, uCloudDark: SKYU.uCloudDark, uCloudRim: SKYU.uCloudRim, uGlow: SKYU.uGlow, uLow: SKYU.uLow, uHor: SKYU.uHor
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  depthTest: false, depthWrite: false,
  fragmentShader: [
    'uniform vec3 uCamR, uCamU, uCamF, uCamPos, uLd, uCloudLit, uCloudDark, uCloudRim, uGlow, uLow, uHor; uniform float uSteps, uCov, uCloudT; uniform sampler2D uCloud; varying vec2 vUv;',
    'const float Y0 = 250.0, Y1 = 650.0, SC = 0.000244;',     // la couche (mètres au-dessus de la mer) et l'échelle de la carte des nuages
    'float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }',
    // épaisseur du nuage au-dessus d'un point : la même carte que le plafond peint, pour que le ciel et son reflet se ressemblent
    'float cover(vec2 q){ return texture2D(uCloud, q).r + (texture2D(uCloud, q * 0.23 + vec2(0.37 - uCloudT * 0.35, 0.11)).b - 0.5) * 0.55 - uCov; }',
    'void main(){',
    '  vec3 d = normalize(uCamF + (vUv.x * 2.0 - 1.0) * uCamR + (vUv.y * 2.0 - 1.0) * uCamU);',
    '  if (d.y < 0.02) { gl_FragColor = vec4(0.0); return; }',
    '  float t0 = max((Y0 - uCamPos.y) / d.y, 0.0), t1 = min((Y1 - uCamPos.y) / d.y, 11000.0);',
    '  if (t1 <= t0) { gl_FragColor = vec4(0.0); return; }',
    '  float dt = (t1 - t0) / uSteps, t = t0 + dt * ign(gl_FragCoord.xy), T = 1.0, tm = 0.0, wsum = 0.0;',
    '  vec2 wind = vec2(uCloudT, uCloudT * 0.38), lq = uLd.xz * 70.0 * SC; float lh = uLd.y * 70.0 / (Y1 - Y0);',
    '  float ca = max(dot(d, uLd), 0.0); vec3 sum = vec3(0.0);',
    '  for (int i = 0; i < 52; i++) {',
    '    if (float(i) >= uSteps || T < 0.03) break;',
    '    vec3 p = uCamPos + d * t; vec2 q = p.xz * SC + wind; float c = cover(q);',
    '    if (c > 0.0) {',
    '      float hf = (p.y - Y0) / (Y1 - Y0), top = c * 3.3;',
    // un cumulus : base plate, sommet bombé d'autant plus haut que le nuage est épais, bords rongés par le détail
    '      float dn = clamp((top - hf) * 7.0, 0.0, 1.0) * smoothstep(0.0, 0.07, hf);',
    '      if (dn > 0.0) {',
    '        float det = texture2D(uCloud, q * 3.1 + vec2(hf * 0.21 - uCloudT * 1.3, uCloudT * 0.6)).g * 0.68 + texture2D(uCloud, q * 8.3 + vec2(-hf * 0.37, uCloudT * 2.1)).g * 0.32;',
    '        dn = clamp(dn - (1.0 - det) * 0.62 * (1.0 - dn * 0.55), 0.0, 1.0);',
    '        if (dn > 0.004) {',
    // éclairage : y a-t-il du nuage entre ce point et l'astre ? Un relevé décalé vers lui suffit, avec la hauteur dans le nuage
    '          float sh = clamp((cover(q + lq) * 3.3 - (hf + lh)) * 2.4, 0.0, 1.0);',
    '          float lit = (1.0 - sh * 0.9) * mix(1.0, 0.3 + 0.7 * clamp(hf / max(top, 0.08), 0.0, 1.0), smoothstep(0.0, 0.45, uLd.y));',
    '          vec3 cs = mix(uCloudDark, uCloudLit, lit);',
    '          cs = mix(cs, uCloudRim, clamp(pow(ca, 6.0) * (1.0 - dn) * 1.3 + lit * lit * (1.0 - dn) * 0.45, 0.0, 1.0));',
    '          float a = 1.0 - exp(-dn * dt * 0.045);',
    '          sum += T * a * cs; tm += T * a * t; wsum += T * a; T *= 1.0 - a;',
    '        }',
    '      }',
    '    }',
    '    t += dt;',
    '  }',
    '  float al = 1.0 - T;',
    '  if (al < 0.003) { gl_FragColor = vec4(0.0); return; }',
    '  sum += uGlow * pow(ca, 5.0) * al * 0.7;',
    // au loin, les nuages prennent la teinte de la brume puis s'effacent : le banc de cumulus de l'horizon prend le relais
    '  float dist = tm / max(wsum, 1e-4), hz = 1.0 - exp(-pow(dist / 5200.0, 2.0));',
    '  sum = mix(sum, mix(uLow, uHor, 0.55) * 1.1 * al, hz * 0.75);',
    '  float fade = (1.0 - smoothstep(6500.0, 10500.0, dist)) * smoothstep(0.02, 0.07, d.y);',
    '  gl_FragColor = vec4(sum, al) * fade;',
    '}'
  ].join('\n')
});
// second passage : une moyenne sur neuf points voisins efface le tramage du parcours (il est conçu pour ça)
const volBlur = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, uPx: { value: new THREE.Vector2(1, 1) } }, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D tA; uniform vec2 uPx; varying vec2 vUv; void main(){ vec4 s = vec4(0.0); for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += texture2D(tA, vUv + vec2(float(i), float(j)) * uPx); gl_FragColor = s / 9.0; }'
});
function volSize() {
  const lv = VCL.level;
  if (!lv) { if (VCL.rt) { VCL.rt.dispose(); VCL.rt2.dispose(); VCL.rt = VCL.rt2 = null; } skyMat.uniforms.uVolOn.value = 0; return; }
  VCL.k = lv >= 2 ? 0.45 : 0.32; VCL.steps = lv >= 2 ? 48 : 34;
  const w = Math.max(64, Math.floor(innerWidth * pixelRatio * VCL.k)), h = Math.max(64, Math.floor(innerHeight * pixelRatio * VCL.k));
  const mk = () => { const r = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }); r.texture.generateMipmaps = false; return r; };
  if (!VCL.rt) { VCL.rt = mk(); VCL.rt2 = mk(); } else { VCL.rt.setSize(w, h); VCL.rt2.setSize(w, h); }
  if (!VCL.fsq) { VCL.fsq = new THREE.FullScreenQuad(volMat); VCL.fsq2 = new THREE.FullScreenQuad(volBlur); }
  volBlur.uniforms.tA.value = VCL.rt.texture; volBlur.uniforms.uPx.value.set(1 / w, 1 / h);
  skyMat.uniforms.uVolT.value = VCL.rt2.texture;
}
function setVolClouds(level) { VCL.level = isWebGL2 ? (level || 0) : 0; volSize(); }
const _vF = new V3();
function renderVolClouds() {
  const su = skyMat.uniforms;
  if (!VCL.rt || (typeof P !== 'undefined' && P.underwater)) { su.uVolOn.value = 0; return; }
  const u = volMat.uniforms, e = camera.matrixWorld.elements, th = Math.tan(camera.fov * Math.PI / 360);
  u.uCamR.value.set(e[0], e[1], e[2]).multiplyScalar(th * camera.aspect); u.uCamU.value.set(e[4], e[5], e[6]).multiplyScalar(th); u.uCamF.value.set(-e[8], -e[9], -e[10]);
  u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld); u.uLd.value.copy(NIGHT.value > 0.5 ? LIGHT_DIR : SKY_SUN).normalize(); u.uSteps.value = VCL.steps;
  // inutile de calculer si on regarde franchement vers le bas
  if (u.uCamF.value.y + th < 0.0) { su.uVolOn.value = 0; return; }
  const old = renderer.getRenderTarget();
  renderer.setRenderTarget(VCL.rt); VCL.fsq.render(renderer); renderer.setRenderTarget(VCL.rt2); VCL.fsq2.render(renderer); renderer.setRenderTarget(old);
  su.uVolOn.value = 1; su.uVolPx.value.x = 1 / Math.floor(innerWidth * pixelRatio); su.uVolPx.value.y = 1 / Math.floor(innerHeight * pixelRatio);
}
