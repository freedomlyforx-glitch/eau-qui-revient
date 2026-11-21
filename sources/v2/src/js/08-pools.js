/* =========================================================
   Piscines : bassins carrelés, eau, lumières au fond, plongeoir
   ========================================================= */
const CAUSTIC_FN = 'float caustF(vec2 p, float t){ vec2 q = p*1.6; float c = 0.0; for(int i=0;i<3;i++){ float fi = float(i); q += vec2(sin(q.y*1.3+t*0.9+fi), cos(q.x*1.1-t*0.7+fi*1.7))*0.55; c += abs(sin(q.x+q.y)); } c /= 3.0; return pow(1.0-c, 6.0)*2.6; }';
const causticExtra = (sh) => {
  sh.uniforms.uTime = clockU;
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\n' + CAUSTIC_FN)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += caustF(vSoftW.xz, uTime) * vec3(0.45,0.95,1.0) * 0.32 * (1.0 - smoothstep(-0.25, -0.02, vSoftW.y));');
};
causticExtra.key = 'caust';
const poolTileMat = std({ color: C('#ffffff'), map: T.poolTile, roughness: 0.25, envMapIntensity: 0.8 }, causticExtra);
const poolLightMat = new THREE.MeshBasicMaterial({ color: HDR('#b8fbff', 5) });
const poolLightMat2 = new THREE.MeshBasicMaterial({ color: HDR('#ffc2ec', 5) });
const copingMat = std({ color: C('#fbf3f7'), map: T.concrete, roughness: 0.55 });
function waterMaterial(p) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: clockU, uHalf: { value: new THREE.Vector2(p.hw, p.hl) }, uCenter: { value: new V3(p.cx, p.surf, p.cz) },
      uSky: { value: C('#ffc2d6') }, uSkyTop: { value: C('#a9a4f2') }, uSunDir: { value: SUN_DIR }, uSunCol: { value: HDR('#ffe0c0', 6) },
      uRip: { value: p.ripples }, uFogColor: FOG.color, uFogDensity: FOG.density, uTint: { value: p.tint || new V3(0.12, 0.55, 0.78) },
      uAx: { value: new THREE.Vector2(p.ax || 1, p.az || 1) }, uK1: { value: new V3(...(p.k ? [p.k[0], p.k[1], p.k[2]] : [0, 0, 0])) }, uK2: { value: new V3(...(p.k ? [p.k[3], p.k[4], p.k[5]] : [0, 0, 0])) }
    },
    defines: p.blob ? { BLOB: 1 } : {},
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: [
      'uniform float uTime; uniform vec2 uHalf, uAx; uniform vec3 uCenter, uSky, uSkyTop, uSunDir, uSunCol, uTint, uK1, uK2; uniform vec4 uRip[6];',
      FOG_GLSL_PARS, 'varying vec3 vW;', CAUSTIC_FN,
      'float hsh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*43758.5453); }',
      'float vno(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), f.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'void main(){',
      '  vec2 lp = vW.xz - uCenter.xz; vec2 wp = vW.xz;',
      '  vec2 n2 = vec2(cos(wp.x*1.7 + uTime*1.3), sin(wp.y*1.9 - uTime*1.1))*0.05;',
      '  n2 += vec2(cos((wp.x + wp.y)*3.3 - uTime*2.1), sin((wp.x - wp.y)*2.9 + uTime*1.7))*0.03;',
      '  n2 += (vec2(vno(wp*3.5 + uTime*0.55), vno(wp*3.5 - uTime*0.45 + 7.0)) - 0.5)*0.11;',
      '  for(int i=0;i<6;i++){ vec4 r = uRip[i]; float age = uTime - r.z; if(age > 0.0 && age < 3.0){ vec2 d = lp - r.xy; float dist = length(d); float wave = sin(dist*14.0 - age*12.0)*exp(-dist*0.7)*exp(-age*1.3)*r.w; float front = 1.0 - smoothstep(age*1.6, age*1.6+0.3, dist); n2 += d/(dist+0.001)*wave*0.35*front; } }',
      '  vec3 N = normalize(vec3(-n2.x, 1.0, -n2.y));',
      '  vec3 V = normalize(vW - cameraPosition);',
      '#ifdef BLOB',
      '  vec2 bq = lp / uAx; float bth = atan(bq.y, bq.x); float bf = 1.0 + uK1.x*sin(2.0*bth + uK1.y) + uK1.z*sin(3.0*bth + uK2.x) + uK2.y*sin(5.0*bth + uK2.z);',
      '  float edge = (bf - length(bq))*min(uAx.x, uAx.y);',
      '#else',
      '  vec2 e = uHalf - abs(lp); float edge = min(e.x, e.y);',
      '#endif',
      '  vec3 col; float a;',
      '  if (cameraPosition.y > uCenter.y) {',
      '    float cosV = clamp(dot(-V, N), 0.0, 1.0);',
      '    float fres = 0.04 + 0.96*pow(1.0 - cosV, 5.0);',
      '    vec3 Rf = reflect(V, N); float ry = clamp(Rf.y, 0.0, 1.0);',
      '    vec3 refl = mix(uSky*0.8, uSkyTop*0.85, smoothstep(0.0, 0.55, ry));',
      '    refl = mix(refl, vec3(0.36, 0.3, 0.5), (1.0 - smoothstep(0.015, 0.14, ry))*0.6);',
      '    float sd = max(dot(Rf, normalize(uSunDir)), 0.0);',
      '    float spec = pow(sd, 240.0);',
      '    float glit = step(0.975, hsh(floor(wp*22.0) + floor(uTime*7.0)))*pow(sd, 6.0);',
      '    vec3 body = vec3(0.03, 0.5, 0.74)*(0.85 + 0.35*vno(wp*1.3 + uTime*0.2));',
      '    body += vec3(0.55, 1.0, 1.0)*caustF(wp*0.9, uTime)*0.11;',
      '#ifdef BLOB',
      '    body = mix(vec3(0.18, 0.86, 0.84)*(0.9 + 0.3*vno(wp*0.8 - uTime*0.1)) + vec3(0.6, 1.0, 0.95)*caustF(wp*0.7, uTime)*0.2, body*vec3(0.85, 0.95, 1.05), smoothstep(0.4, 6.0, edge));',
      '#endif',
      '    col = mix(body, refl, fres*0.62) + uSunCol*(spec + glit*0.18);',
      '    float foam = (1.0 - smoothstep(0.0, 0.22, edge))*(0.55 + 0.45*sin(edge*55.0 - uTime*3.0));',
      '    col += vec3(0.9, 1.0, 1.0)*foam*0.32;',
      '#ifdef BLOB',
      '    a = clamp(mix(0.74, 0.9, fres) + spec + foam*0.3, 0.0, 0.96);',
      '#else',
      '    a = clamp(mix(0.6, 0.86, fres) + spec + foam*0.3, 0.0, 0.95);',
      '#endif',
      '  } else {',
      '    float c = max(dot(-V, vec3(0.0,1.0,0.0)), 0.0);',
      '    float win = smoothstep(0.62, 0.72, c);',
      '    col = mix(vec3(0.25,0.7,0.85), uSky*1.15, win) + vec3(0.6,1.0,1.0)*pow(max(dot(N, vec3(0.0,1.0,0.0)),0.0),40.0)*0.2;',
      '    a = mix(0.92, 0.55, win);',
      '  }',
      FOG_GLSL,
      '  gl_FragColor = vec4(col, a);',
      '}'
    ].join('\n'),
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
}
// transat et parasol : solides, praticables, cassables
function transat(x, y, z, a, cushion) {
  const base = M4(x, y, z, 0, a, 0), parts = [];
  const P = (geo, mat, px, py, pz, rx) => parts.push([geo, mat, base.clone().multiply(M4(px, py, pz, rx || 0))]);
  const cm = cushion ? colorMat(cushion) : MAT.cushion;
  P(boxG(0.72, 0.28, 1.95), MAT.white, 0, 0.24, 0); P(boxG(0.68, 0.09, 1.25), cm, 0, 0.42, 0.32); P(boxG(0.68, 0.09, 0.75), cm, 0, 0.62, -0.62, -0.7);
  for (const sx of [-0.3, 0.3]) for (const sz of [-0.85, 0.85]) P(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), MAT.chrome, sx, 0.06, sz);
  return destrAdd({ parts, x, y: y + 0.4, z, hx: 0.38, hy: 0.4, hz: 1.0, ang: a, kind: 'plastique', hp: 4, color: cushion || '#ffb3d4', top: y + 0.47, topHz: 0.95 });
}
function parasol(x, y, z, col) {
  return destrAdd({ parts: [[new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), MAT.white, M4(x, y + 1.2, z)], [new THREE.ConeGeometry(1.6, 0.55, 12, 1, true), colorMat(col, { side: THREE.DoubleSide }), M4(x, y + 2.35, z)], [new THREE.SphereGeometry(0.07, 8, 6), MAT.white, M4(x, y + 2.64, z)]],
    x, y: y + 2.3, z, hx: 1.45, hy: 0.36, hz: 1.45, kind: 'tissu', hp: 3, color: col, colBox: { r: 0.1, y0: y - 1, y1: y + 2.6 } });
}
const DIVES = [];
function updateDives(dt) { for (const d of DIVES) { d.v += (-d.dip * 160 - d.v * 9) * dt; d.dip += d.v * dt; d.piv.rotation.x = d.dip; } }
function spawnRipple(p, x, z, amp) { const r = p.ripples[p.rippleI]; r.set(x - p.cx, z - p.cz, clockU.value, amp); p.rippleI = (p.rippleI + 1) % p.ripples.length; }
function buildPool(def, idx) {
  const p = Object.assign({}, def);
  p.cx = (p.x0 + p.x1) / 2; p.cz = (p.z0 + p.z1) / 2; p.hw = (p.x1 - p.x0) / 2; p.hl = (p.z1 - p.z0) / 2;
  p.surf = -0.13; p.ripples = []; for (let i = 0; i < 6; i++) p.ripples.push(new THREE.Vector4(0, 0, -100, 0)); p.rippleI = 0;
  if (p.plongeoir) p.tint = new V3(0.1, 0.48, 0.8);
  const W = p.x1 - p.x0, L = p.z1 - p.z0, Dp = p.depth;
  // fond et parois
  B.add(flatG(W, L), poolTileMat, M4(p.cx, -Dp, p.cz), false, true);
  const wall = (w, h, x, z, ry) => { const g = new THREE.PlaneGeometry(w, h); scaleUV(g, w, h); B.add(g, poolTileMat, M4(x, -Dp / 2, z, 0, ry, 0), false, true); };
  wall(W, Dp, p.cx, p.z0, 0); wall(W, Dp, p.cx, p.z1, Math.PI); wall(L, Dp, p.x0, p.cz, Math.PI / 2); wall(L, Dp, p.x1, p.cz, -Math.PI / 2);
  // margelle
  const cw = 0.42;
  B.add(boxG(W + cw * 2, 0.12, cw), copingMat, M4(p.cx, 0.0, p.z0 - cw / 2));
  B.add(boxG(W + cw * 2, 0.12, cw), copingMat, M4(p.cx, 0.0, p.z1 + cw / 2));
  B.add(boxG(cw, 0.12, L), copingMat, M4(p.x0 - cw / 2, 0.0, p.cz));
  B.add(boxG(cw, 0.12, L), copingMat, M4(p.x1 + cw / 2, 0.0, p.cz));
  // plage en damier
  const deck = p.plongeoir ? 4 : 2.2;
  const dk = (w, d, x, z) => B.add(flatG(w, d), MAT.checker, M4(x, 0.012, z), false, true);
  dk(W + deck * 2, deck - cw, p.cx, p.z0 - cw - (deck - cw) / 2); dk(W + deck * 2, deck - cw, p.cx, p.z1 + cw + (deck - cw) / 2);
  dk(deck - cw, L + cw * 2, p.x0 - cw - (deck - cw) / 2, p.cz); dk(deck - cw, L + cw * 2, p.x1 + cw + (deck - cw) / 2, p.cz);
  // lumières au fond
  const nL = Math.max(2, Math.round(Math.max(W, L) / 6));
  const along = L > W;
  for (let i = 0; i < nL; i++) {
    const t = (i + 0.5) / nL, mat = (i % 2 && p.plongeoir) ? poolLightMat2 : poolLightMat;
    for (const s of [-1, 1]) {
      const lx = along ? (s < 0 ? p.x0 + 0.02 : p.x1 - 0.02) : lerp(p.x0, p.x1, t), lz = along ? lerp(p.z0, p.z1, t) : (s < 0 ? p.z0 + 0.02 : p.z1 - 0.02);
      const ry = along ? (s < 0 ? Math.PI / 2 : -Math.PI / 2) : (s < 0 ? 0 : Math.PI);
      const disc = new THREE.CircleGeometry(0.16, 20);
      B.add(disc, mat, M4(lx, -Dp * 0.55, lz, 0, ry, 0), false, false, 'eau');
      B.add(new THREE.RingGeometry(0.16, 0.21, 20), MAT.chrome, M4(lx, -Dp * 0.55, lz, 0, ry, 0), false, false);
    }
    const sx = along ? p.cx : lerp(p.x0, p.x1, t), sz = along ? lerp(p.z0, p.z1, t) : p.cz;
    addSoft(sx, -Dp * 0.5, sz, mat === poolLightMat2 ? '#ff9fe0' : '#7ff6ff', 3.2, Math.max(4.5, Math.min(W, L) * 0.9 + 1));
  }
  addSoft(p.cx, 1.2, p.cz, '#8ff6ff', 0.9, Math.max(W, L) * 0.6 + 2);
  // échelle
  const lz0 = along ? p.z1 - 1.2 : p.z0 + 0.0, lx0 = along ? p.x1 : p.x0 + 1.2;
  for (const s of [-0.28, 0.28]) {
    const path = along
      ? new THREE.CatmullRomCurve3([new V3(lx0 - 0.4, -1.2, lz0 + s), new V3(lx0 - 0.1, -0.2, lz0 + s), new V3(lx0 + 0.05, 0.75, lz0 + s), new V3(lx0 + 0.35, 0.55, lz0 + s), new V3(lx0 + 0.45, 0.05, lz0 + s)])
      : new THREE.CatmullRomCurve3([new V3(lx0 + s, -1.2, lz0 + 0.4), new V3(lx0 + s, -0.2, lz0 + 0.1), new V3(lx0 + s, 0.75, lz0 - 0.05), new V3(lx0 + s, 0.55, lz0 - 0.35), new V3(lx0 + s, 0.05, lz0 - 0.45)]);
    B.add(new THREE.TubeGeometry(path, 24, 0.035, 8), MAT.chrome, M4(), true, true);
  }
  for (let k = 0; k < 3; k++) B.add(along ? boxG(0.1, 0.03, 0.56) : boxG(0.56, 0.03, 0.1), MAT.chrome, along ? M4(lx0 - 0.25 - k * 0.05, -0.35 - k * 0.32, lz0) : M4(lx0, -0.35 - k * 0.32, lz0 + 0.25 + k * 0.05), false, true);
  // surface de l'eau
  p.mat = waterMaterial(p);
  const wm = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), p.mat);
  wm.position.set(p.cx, p.surf, p.cz); wm.renderOrder = 2; wm.userData.surface = 'eau'; wm.userData.pool = p;
  world.add(wm); SHOOT.push(wm); p.mesh = wm;
  // transats et parasols
  const lounger = (x, z, a) => transat(x, 0, z, a);
  const umb = (x, z, col) => parasol(x, 0, z, col);
  if (p.plongeoir) {
    for (let i = 0; i < 4; i++) lounger(p.x1 + 2.6, p.z0 + 2 + i * 3.2, 0);
    umb(p.x1 + 2.6, p.z0 + 3.6, '#ffb3d4'); umb(p.x1 + 2.6, p.z0 + 10, '#a6f0d8');
    for (let i = 0; i < 3; i++) lounger(p.x0 - 2.6, p.z0 + 3 + i * 3.4, 0);
    // plongeoir
    const bx = p.cx, bz0 = p.z0 - 1.6;
    B.add(boxG(0.9, 0.7, 0.9), MAT.white, M4(bx, 0.35, bz0 - 0.2));
    B.add(boxG(0.9, 0.35, 0.5), MAT.white, M4(bx, 0.175, bz0 - 0.9)); addFloorOBB(bx, bz0 - 0.9, 0.45, 0.25, 0, 0.35);
    addBox(bx, bz0 - 0.2, 0.45, 0.45, 0, -1, 0.7).step = true;
    addFloorOBB(bx, bz0 - 0.2, 0.45, 0.45, 0, 0.7);
    // la planche est articulée côté socle : elle plie quand on atterrit et renvoie en l'air
    const piv = new THREE.Group(); piv.position.set(bx, 0.82, bz0 - 0.4); world.add(piv);
    const plank = new THREE.Mesh(boxB(-0.28, 0.28, 0, 0.08, 0, 3.6), colorMat('#7ff0ff', { roughness: 0.4 })); plank.castShadow = true; plank.receiveShadow = true; plank.userData.surface = 'dur'; piv.add(plank); SHOOT.push(plank);
    const dive = { piv, dip: 0, v: 0 };
    DIVES.push(dive);
    addFloorOBB(bx, bz0 + 1.4, 0.3, 1.8, 0, 0.92, { springy: true, board: dive });
    // au-dessus de la plage on ne traverse plus la planche
    addBox(bx, bz0 + 0.8, 0.3, 1.2, 0, 0.55, 0.92).step = true;
    // chaise du maître-nageur
    const lx = p.x1 + 1.6, lz = p.z1 - 1;
    for (const sx of [-0.35, 0.35]) for (const sz of [-0.35, 0.35]) B.add(boxG(0.07, 2.2, 0.07), MAT.white, M4(lx + sx, 1.1, lz + sz));
    B.add(boxG(0.8, 0.08, 0.8), colorMat('#ff86bd'), M4(lx, 2.2, lz)); B.add(boxG(0.8, 0.6, 0.08), colorMat('#ff86bd'), M4(lx + 0.0, 2.5, lz + 0.38));
    addBox(lx, lz, 0.45, 0.45, 0, -1, 2.3);
    umb(lx, lz, '#ffe08a');
  } else {
    lounger(p.x1 + 1.2, p.cz - 1.2, 0); lounger(p.x1 + 1.2, p.cz + 1.4, 0);
    if (W > 6) umb(p.x0 - 1.2, p.cz, '#a6f0d8');
  }
  pools.push(p);
  return p;
}
POOLS_DEF.forEach(buildPool);
