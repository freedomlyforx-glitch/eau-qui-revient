/* =========================================================
   Ciel synthwave, soleil rayé, montagnes filaires, grille du vide, nuages
   ========================================================= */
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTop: { value: C('#7a86e8') }, uMid: { value: C('#c9a2f2') }, uLow: { value: C('#ffa2cb') }, uHor: { value: FOG_COLOR.clone() }, uBelow: { value: C('#e9b8dc') },
    uSunA: { value: HDR('#ffe36e', 1.45) }, uSunB: { value: HDR('#ff4f9f', 1.35) }, uGlow: { value: HDR('#ffae96', 0.6) },
    uSunDir: { value: SUN_DIR }, uTime: clockU
  },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: [
    'uniform vec3 uTop, uMid, uLow, uHor, uBelow, uSunA, uSunB, uGlow, uSunDir; uniform float uTime; varying vec3 vDir;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
    'vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }',
    'void main(){',
    '  vec3 d = normalize(vDir); float h = d.y;',
    '  vec3 col = mix(uHor, uLow, smoothstep(0.0, 0.11, h));',
    '  col = mix(col, uMid, smoothstep(0.08, 0.34, h));',
    '  col = mix(col, uTop, smoothstep(0.3, 0.9, h));',
    '  col = mix(col, uBelow, smoothstep(0.0, 0.1, -h));',
    '  vec3 sd = normalize(uSunDir); float ca = dot(d, sd);',
    '  col += uGlow*(pow(max(ca,0.0),10.0)*0.55 + pow(max(ca,0.0),220.0)*1.1);',
    '  vec3 rgt = normalize(cross(sd, vec3(0.0,1.0,0.0))); vec3 up = cross(rgt, sd);',
    '  vec2 p = vec2(dot(d,rgt), dot(d,up))/0.125; float r = length(p);',
    '  if (ca > 0.0 && r < 1.0) {',
    '    float y = p.y; vec3 sc = mix(uSunB, uSunA, smoothstep(-1.0, 0.85, y));',
    '    float band = 1.0;',
    '    if (y < 0.2) { float s = (0.2 - y)/1.2; float f = fract((y + uTime*0.015)*7.0); float gap = s*0.6; band = smoothstep(gap, gap+0.05, f); }',
    '    float edge = 1.0 - smoothstep(0.97, 1.0, r);',
    '    col = mix(col, sc, band*edge);',
    '  }',
    '  float ra = acos(clamp(dot(d, -sd), -1.0, 1.0)); float rb = (ra - 0.69)/0.065;',
    '  if (rb > 0.0 && rb < 1.0) { vec3 rc = hue(0.78 - rb*0.78); float a = sin(rb*3.14159)*0.2*smoothstep(-0.01, 0.06, h)*(1.0 - smoothstep(0.3, 0.6, h)); col += rc*a*0.7; }',
    '  if (h > 0.25) { vec2 sp = d.xz/(h+0.3)*240.0; vec2 id = floor(sp); float s = hash(id); if (s > 0.993) { vec2 f = fract(sp)-0.5; float tw = 0.6+0.4*sin(uTime*2.0+s*60.0); col += vec3(1.0,0.92,1.0)*(1.0 - smoothstep(0.0, 0.12, length(f)))*tw*smoothstep(0.3, 0.75, h)*1.3; } }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n'),
  side: THREE.BackSide, depthWrite: false, fog: false
});
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
  mt.renderOrder = -5; scene.add(mt);
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
{ const h = new THREE.Path(); h.moveTo(MAP.x0 + 0.5, -MAP.z1 + 0.5); h.lineTo(MAP.x0 + 0.5, -MAP.z0 - 0.5); h.lineTo(MAP.x1 - 0.5, -MAP.z0 - 0.5); h.lineTo(MAP.x1 - 0.5, -MAP.z1 + 0.5); h.closePath(); gridShape.holes.push(h); }
const gridFloor = new THREE.Mesh(new THREE.ShapeGeometry(gridShape).rotateX(-Math.PI / 2), gridMat);
gridFloor.position.y = -0.06; gridFloor.userData.surface = 'vide'; scene.add(gridFloor); SHOOT.push(gridFloor);
const clouds = [];
for (let i = 0; i < 30; i++) {
  const m = new THREE.SpriteMaterial({ map: T.cloud, color: C(i % 3 ? '#fff0f6' : '#f7e6ff'), transparent: true, depthWrite: false, fog: false, opacity: rr(0.75, 1) });
  const s = new THREE.Sprite(m); const a = rr(0, Math.PI * 2), d = rr(300, 620);
  s.position.set(19 + Math.sin(a) * d, rr(55, 180), -12 + Math.cos(a) * d); const k = rr(90, 190); s.scale.set(k, k * 0.62, 1);
  scene.add(s); clouds.push({ s, sp: rr(0.4, 1.2) });
}
const lowClouds = [];
for (let i = 0; i < 12; i++) {
  const m = new THREE.SpriteMaterial({ map: T.cloud, color: C('#fff4fa'), transparent: true, depthWrite: false, opacity: rr(0.55, 0.8) });
  const s = new THREE.Sprite(m); s.position.set(rr(MAP.x0, MAP.x1), rr(26, 40), rr(MAP.z0, MAP.z1)); const k = rr(12, 22); s.scale.set(k, k * 0.62, 1);
  scene.add(s); lowClouds.push({ s, sp: rr(0.25, 0.6) });
}
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
{ const sc = sun.shadow.camera; sc.left = -48; sc.right = 48; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 300; sc.updateProjectionMatrix(); }
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.045;
scene.add(hemi, sun, sun.target);
const shR = new V3().crossVectors(LIGHT_DIR, UP).normalize(), shU = new V3().crossVectors(shR, LIGHT_DIR).normalize();
function placeSun(x, y, z) {
  const SH_TX = 96 / sun.shadow.mapSize.x, SH_TY = 52 / sun.shadow.mapSize.y;
  const p = new V3(x, y * 0.5, z);
  const a = Math.round(p.dot(shR) / SH_TX) * SH_TX, b = Math.round(p.dot(shU) / SH_TY) * SH_TY, c = p.dot(LIGHT_DIR);
  sun.target.position.copy(shR).multiplyScalar(a).addScaledVector(shU, b).addScaledVector(LIGHT_DIR, c);
  sun.position.copy(sun.target.position).addScaledVector(LIGHT_DIR, 140);
  sun.target.updateMatrixWorld();
}
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMat));
  const envRT = pmrem.fromScene(envScene, 0.015, 0.1, 200);
  scene.environment = envRT.texture;
  pmrem.dispose();
}
