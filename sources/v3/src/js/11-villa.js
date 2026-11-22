/* =========================================================
   La villa-refuge, sur le promontoire : grandes baies face à la mer,
   terrasse, piscine à débordement, toit-terrasse. On peut la verrouiller.
   Dedans : l'ordinateur qui fait redescendre dans les niveaux précédents.
   ========================================================= */
const RF = REFUGE, RFH = RF.h;
const PC_POS = new V3(-142.5, RFB + 1.16, 1.36), PC_DIR = new V3(0, 0, -1);
const BED = { x: -123.2, z: -9.6 };
const refugeOut = stuccoFor('#fff6ee'), refugeIn = std({ color: C('#ffffff'), map: T.panel, roughness: 0.75 }), refugeMint = stuccoFor('#bff3df');
const aquaMat = new THREE.ShaderMaterial({
  uniforms: { uTime: clockU },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform float uTime; varying vec2 vUv;',
    'float fish(vec2 uv, vec2 c, float s, float dir){ vec2 q = (uv - c) / s; q.x *= dir; float body = smoothstep(1.0, 0.8, length(q * vec2(1.0, 2.2))); float tail = smoothstep(0.5, 0.3, abs(q.y) * 1.4 + (q.x + 1.25) * 1.2) * step(-1.6, q.x) * step(q.x, -0.7); return max(body, tail); }',
    'void main(){ vec2 uv = vUv; float t = uTime; vec3 col = mix(vec3(0.05, 0.25, 0.5), vec3(0.2, 0.85, 0.9), uv.y) * 1.3;',
    '  col += vec3(0.5, 0.9, 1.0) * pow(0.5 + 0.5 * sin(uv.x * 30.0 + sin(uv.y * 9.0 + t) * 2.0 + t * 0.7), 8.0) * 0.25;',
    '  for (int i = 0; i < 6; i++) { float fi = float(i); float sp = 0.05 + 0.03 * fract(fi * 0.37); float dir = mod(fi, 2.0) < 1.0 ? 1.0 : -1.0; float x = fract(fi * 0.23 + t * sp * dir); float y = 0.2 + 0.11 * fi + 0.04 * sin(t * 0.8 + fi * 2.0); vec3 fc = 0.6 + 0.4 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + fi * 0.19)); col = mix(col, fc * 2.2, fish(vec2(uv.x * 2.4, uv.y), vec2(x * 2.4, y), 0.07 + 0.02 * fract(fi * 0.6), dir)); }',
    '  for (int i = 0; i < 5; i++) { float fi = float(i); vec2 b = vec2(0.12 + 0.19 * fi + 0.01 * sin(t * 3.0 + fi), fract(t * (0.12 + 0.03 * fi) + fi * 0.3)); col += vec3(1.0) * smoothstep(0.012, 0.004, length((uv - b) * vec2(2.4, 1.0))) * 0.8; }',
    '  col *= 0.9 + 0.1 * smoothstep(0.0, 0.06, uv.y); gl_FragColor = vec4(col, 1.0); }'
  ].join('\n')
});
const lavaMat = new THREE.ShaderMaterial({
  uniforms: { uTime: clockU, uA: { value: HDR('#ff5fb0', 1.6) }, uB: { value: HDR('#ffd06f', 2.6) } },
  vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float uTime; uniform vec3 uA, uB; varying vec2 vUv; varying vec3 vP; void main(){ float t = uTime * 0.35; float v = 0.0; for (int i = 0; i < 4; i++) { float fi = float(i); vec2 c = vec2(0.5 + 0.25 * sin(t * (0.7 + fi * 0.3) + fi * 2.1), fract(t * (0.11 + fi * 0.05) + fi * 0.37)); vec2 d = (vec2(vUv.x, vUv.y) - c) * vec2(1.0, 2.6); v += 0.018 / dot(d, d); } float m = smoothstep(0.9, 1.25, v); gl_FragColor = vec4(mix(uA * 0.55, uB, m), 0.92); }',
  transparent: true, side: THREE.DoubleSide
});
let refugeDoor = null;
YOFF = HILL.h;
{
  const F = 0.3, H = RFH, x0 = RF.x0, x1 = RF.x1, z0 = RF.z0, z1 = RF.z1;
  const win = (c, w, y0, y1) => ({ c, w, y0, y1, glass: true });
  // dalle, sols, plafond, toit-terrasse
  B.add(boxB(x0 - 0.3, x1 + 0.3, -0.6, F, z0 - 0.3, z1 + 0.3), MAT.foundation); addFloorRect(x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3, F);
  B.add(flatG(16, 16), MAT.wood, M4(-138, F + 0.004, -6), false, true);
  B.add(flatG(10, 7), MAT.checker, M4(-125, F + 0.004, -1.5), false, true);
  B.add(flatG(10, 9), MAT.carpet, M4(-125, F + 0.004, -9.5), false, true);
  const roofY = F + H;
  B.add(boxB(x0 - 1.4, x1 + 1.4, roofY, roofY + 0.28, z0 - 2.4, z1 + 0.3), MAT.white); addFloorRect(x0 - 1.4, x1 + 1.4, z0 - 2.4, z1 + 0.3, roofY + 0.28);
  B.add(boxB(x0 - 1.46, x1 + 1.46, roofY + 0.06, roofY + 0.2, z0 - 2.46, z1 + 0.36), MAT.chrome, null, false, true);
  B.add(flatG(x1 - x0 - 0.4, z1 - z0 - 0.4).rotateX(Math.PI), cached('villaPlafond', () => std({ color: C('#ffe9d6'), roughness: 0.9 })), M4((x0 + x1) / 2, roofY - 0.005, (z0 + z1) / 2), false, true);
  B.add(flatG(x1 - x0 + 2.4, z1 - z0 + 2.3), MAT.planksDeck, M4((x0 + x1) / 2, roofY + 0.285, (z0 + z1) / 2 - 1.05), false, true);
  // murs : baies vitrées plein sud (côté mer), fenêtres ailleurs
  kitWall('x', z0, x0, x1, F, H, [win(-140.4, 10, 0.12, 3.05), { c: -133.4, w: 1.4, y0: 0, y1: 2.3 }, win(-131.2, 1.6, 0.12, 3.05), win(-125, 7, 0.12, 3.05)], refugeOut, refugeIn, -1, 0.24);
  kitWall('x', z1, x0, x1, F, H, [win(-138.4, 2.2, 1.0, 2.4), win(-125, 3, 1.1, 2.3)], refugeMint, refugeIn, 1, 0.24);
  kitWall('z', x0, z0 + 0.12, z1 - 0.12, F, H, [win(-6, 3.4, 0.5, 2.9)], refugeOut, refugeIn, -1, 0.24);
  kitWall('z', x1, z0 + 0.12, z1 - 0.12, F, H, [{ c: -1, w: 1.2, y0: 0, y1: 2.25 }, win(-9.5, 3, 0.9, 2.4)], refugeMint, refugeIn, 1, 0.24);
  kitWall('x', -5, -130, x1 - 0.12, F, H, [{ c: -128.6, w: 1.1, y0: 0, y1: 2.2 }], refugeIn, refugeIn, 1, 0.16);
  kitWall('z', -130, z0 + 0.12, -5, F, H, [], refugeIn, refugeIn, 1, 0.16);
  // brise-soleil en lattes de bois devant la chambre, auvent de l'entrée
  for (let i = 0; i < 9; i++) B.add(boxG(0.08, H - 0.2, 0.3), MAT.wood, M4(-121.2 - i * 0.42, F + H / 2, z0 - 0.9));
  B.add(boxB(x1, x1 + 2.2, 2.75, 2.87, -2.6, 0.6), MAT.white); for (const s of [-2.4, 0.4]) { B.add(new THREE.CylinderGeometry(0.05, 0.05, 2.75, 10), MAT.chrome, M4(x1 + 2.05, 1.37, s)); addCircle(x1 + 2.05, s, 0.08, 0, 2.8); }
  B.add(boxB(x1, x1 + 2.4, 0, F, -3, 1), MAT.concrete); addFloorRect(x1, x1 + 2.4, -3, 1, F);
  kitSign('refuge', '#ff6fb8', x1 + 0.16, F + 2.72, -1, Math.PI / 2, 2.4, 0.58, 2.8);
  addSoft(x1 + 1.6, 2.5, -1, '#ff8fcf', 1.5, 5.5);
  // escalier extérieur vers le toit-terrasse, garde-corps du toit
  kitSteps(-129.4, 3.05, 0.66, 0, 1.3, 0, roofY + 0.28, 13, MAT.concrete);
  B.add(boxB(-120.9, -119.2, roofY + 0.1, roofY + 0.28, 2.3, 3.7), MAT.white); addFloorRect(-120.9, -119.2, 2.3, 3.7, roofY + 0.28);
  const ry = roofY + 0.28;
  kitRail(x0 - 1.3, z0 - 2.3, x1 + 1.3, z0 - 2.3, ry); kitRail(x0 - 1.3, z0 - 2.3, x0 - 1.3, z1 + 0.2, ry); kitRail(x1 + 1.3, z0 - 2.3, x1 + 1.3, z1 + 0.2, ry); kitRail(x0 - 1.3, z1 + 0.2, -122, z1 + 0.2, ry);
  for (let i = 0; i < 4; i++) bulbString(x0 - 1 + i * 7, ry + 2.3, z0 - 2.1, x0 + 6 + i * 7, ry + 2.3, z0 - 2.1, 9, 0.5, i);
  for (const px of [x0 - 1, x0 + 6, x0 + 13, x0 + 20, x0 + 27]) B.add(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), MAT.pole, M4(px, ry + 1.15, z0 - 2.1));
  transat(-140, ry, -9, 0.3); transat(-137.4, ry, -9.4, 0.1); parasol(-138.8, ry, -11.4, '#ffb3d4');
  // longue-vue du toit
  B.add(new THREE.CylinderGeometry(0.05, 0.07, 1.3, 10), MAT.chrome, M4(-126, ry + 0.65, z0 - 1.6)); B.add(new THREE.CylinderGeometry(0.09, 0.12, 0.7, 14).rotateX(Math.PI / 2), colorMat('#ff8fcf', { roughness: 0.4 }), M4(-126, ry + 1.4, z0 - 1.7, -0.12)); addCircle(-126, z0 - 1.6, 0.2, ry, ry + 1.5);
  // terrasse en planches jusqu'à la piscine
  B.add(boxB(x0 - 0.3, x1 + 0.3, -0.4, F, -23.8, z0 - 0.3), MAT.planks); addFloorRect(x0 - 0.3, x1 + 0.3, -23.8, z0 - 0.3, F);
  transat(-144, F, -19, 0.2); transat(-141.6, F, -19.2, -0.1); parasol(-142.8, F, -21.2, '#a6f0d8');
  transat(-124, 0, -30, 1.4); parasol(-123, 0, -32.2, '#ffe08a');
  for (let i = 0; i < 3; i++) bulbString(x0 + i * 8.7, F + 3.1, -23.6, x0 + (i + 1) * 8.7, F + 3.1, -23.6, 10, 0.7, i + 2);
  for (let i = 0; i <= 3; i++) { B.add(new THREE.CylinderGeometry(0.04, 0.05, 3.1, 8), MAT.white, M4(x0 + i * 8.7, F + 1.55, -23.6)); addCircle(x0 + i * 8.7, -23.6, 0.08, F, F + 3.1); }
  /* ---- intérieur ---- */
  const P = (geo, mat, x, y, z, ry2) => B.add(geo, mat, M4(x, F + y, z, 0, ry2 || 0, 0), false, true);
  const piece = (x, y, z, hx, hy, hz, ang, kind, color, parts, o) => destrAdd(Object.assign({ parts: parts.map(([g, m, lx, ly, lz, r2]) => [g, m, M4(x, F + y, z, 0, ang, 0).multiply(M4(lx || 0, ly || 0, lz || 0, 0, r2 || 0, 0))]), x, y: F + y, z, hx, hy, hz, ang, kind, color, hp: 5 }, o || {}));
  const velvet = colorMat('#d9774f', { roughness: 0.95 }), mustard = colorMat('#e8b54a', { roughness: 0.9 }), beige = colorMat('#ece0c8', { roughness: 0.6 }), mint = colorMat('#a6f0d8', { roughness: 0.4 }), pinkk = colorMat('#ff8fcf', { roughness: 0.45 }), lilac = colorMat('#b9a2ff', { roughness: 0.6 });
  // salon : tapis rond, canapé d'angle en velours, table basse
  P(new THREE.CylinderGeometry(2.7, 2.7, 0.03, 48), cached('shag', () => std({ map: T.shag, roughness: 1 })), -139, 0.015, -7.4);
  piece(-142.6, 0.3, -7.4, 0.5, 0.3, 1.9, 0, 'tissu', '#d9774f', [[boxG(1.0, 0.44, 3.8), velvet, 0, -0.08], [boxG(0.26, 0.62, 3.8), velvet, -0.4, 0.25], [boxG(0.5, 0.14, 0.6), mustard, 0.05, 0.2, -1.2, 0.2], [boxG(0.5, 0.14, 0.6), pinkk, 0.05, 0.2, 1.1, -0.15]], { top: F + 0.46, topHx: 0.42 });
  piece(-139.6, 0.3, -4.2, 1.5, 0.3, 0.5, 0, 'tissu', '#d9774f', [[boxG(3.0, 0.44, 1.0), velvet, 0, -0.08], [boxG(3.0, 0.62, 0.26), velvet, 0, 0.25, 0.4], [boxG(0.6, 0.14, 0.5), lilac, 0.8, 0.2, -0.05, 0.1]], { top: F + 0.46, topHz: 0.42 });
  piece(-139.2, 0.22, -7.6, 0.75, 0.22, 0.75, 0, 'verre', '#d9f3ff', [[new THREE.CylinderGeometry(0.75, 0.75, 0.04, 28), cached('verreTable', () => std({ color: C('#d9f3ff'), roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55, envMapIntensity: 1.6 })), 0, 0.2], [new THREE.CylinderGeometry(0.06, 0.3, 0.4, 14), MAT.gold, 0, -0.02]], { colBox: { r: 0.75 }, top: F + 0.44 });
  // télé et console contre le mur ouest, tournées vers le canapé
  piece(-145.2, 0.7, -11.3, 0.4, 0.7, 0.7, 0, 'ecran', '#efd9c9', [[boxG(0.6, 0.5, 1.3), MAT.wood, 0, -0.45], [boxG(0.75, 0.85, 1.05), MAT.tvBody, 0.02, 0.22], [planeG(0.82, 0.6).rotateY(Math.PI / 2), MAT.crt, 0.4, 0.25], [boxG(0.32, 0.08, 0.42), colorMat('#d9d4dc'), 0.1, -0.16, -0.42]], { hp: 6 });
  // bureau de l'ordinateur, contre le mur nord
  P(boxG(1.7, 0.05, 0.8), MAT.wood, -142.5, 0.75, 1.42); for (const a of [-0.8, 0.8]) for (const b of [-0.35, 0.35]) P(boxG(0.05, 0.75, 0.05), MAT.wood, -142.5 + a, 0.375, 1.42 + b);
  P(boxG(0.6, 0.16, 0.5), beige, -142.5, 0.86, 1.56); P(boxG(0.5, 0.42, 0.48), beige, -142.5, 1.15, 1.6); P(boxG(0.42, 0.34, 0.04), MAT.black, -142.5, 1.16, 1.375);
  P(boxG(0.46, 0.025, 0.18), beige, -142.5, 0.79, 1.14); P(boxG(0.08, 0.04, 0.05), beige, -142.05, 0.79, 1.14); P(boxG(0.12, 0.1, 0.1), pinkk, -143.1, 0.82, 1.2);
  P(boxG(0.45, 0.06, 0.45), pinkk, -142.5, 0.48, 0.55); P(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), MAT.pole, -142.5, 0.23, 0.55); P(boxG(0.4, 0.45, 0.06), pinkk, -142.5, 0.75, 0.3);
  addBox(-142.5, 1.42, 0.88, 0.42, 0, F, F + 1.0);
  // aquarium encastré dans la cloison de la chambre, côté salon
  P(boxG(0.3, 0.9, 2.8), MAT.wood, -130.25, 0.45, -9.5); P(boxG(0.34, 1.1, 2.9), MAT.black, -130.25, 1.45, -9.5);
  { const a = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.98), aquaMat); a.position.set(-130.43, F + 1.45, -9.5); a.rotation.y = -Math.PI / 2; wadd(a); }
  addBox(-130.3, -9.5, 0.2, 1.45, 0, F, F + 2.0); addSoft(-131.6, F + 1.5, -9.5, '#5fe8ff', 1.5, 4.5);
  // lampes à lave, plantes, étagère à disques
  for (const [lx, lz, a, b] of [[-145.3, -1.2, '#ff5fb0', '#ffd06f'], [-131, -13.2, '#7b5cff', '#7ff0ff']]) {
    P(new THREE.CylinderGeometry(0.12, 0.17, 0.22, 14), MAT.gold, lx, 0.11, lz); P(new THREE.CylinderGeometry(0.05, 0.11, 0.1, 14), MAT.gold, lx, 0.77, lz);
    const m = lavaMat.clone(); m.uniforms.uTime = clockU; m.uniforms.uA.value = HDR(a, 1.6); m.uniforms.uB.value = HDR(b, 2.6);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.125, 0.5, 18, 1, true), m); l.position.set(lx, F + 0.47, lz); wadd(l);
    addSoft(lx, F + 0.6, lz, a, 1.1, 3.6, { flick: 0.1 }); addCircle(lx, lz, 0.18, F, F + 0.8);
  }
  for (const [px, pz] of [[-145.2, -13.2], [-131, 1.2], [-121, -4.3]]) { P(new THREE.CylinderGeometry(0.26, 0.2, 0.45, 12), colorMat('#ffffff'), px, 0.22, pz); addCircle(px, pz, 0.34, F, F + 1.2); for (let i = 0; i < 8; i++) P(new THREE.SphereGeometry(0.32, 8, 6).scale(1, 0.22, 0.6), colorMat('#4fae7f'), px + Math.cos(i * 0.8) * 0.32, 0.75 + i * 0.09, pz + Math.sin(i * 0.8) * 0.32, i * 0.8); }
  P(boxG(1.8, 1.7, 0.4), MAT.wood, -146 + 8.2, 0.85, 1.6); addBox(-137.8, 1.6, 0.92, 0.24, 0, F, F + 1.7);
  for (let i = 0; i < 24; i++) P(boxG(0.035, 0.31, 0.3), accentMat(i), -138.55 + (i % 12) * 0.13, 0.52 + Math.floor(i / 12) * 0.62, 1.56);
  kitSign('doux foyer', '#7ff0ff', -139.5, F + 2.75, 1.84, Math.PI, 2.2, 0.6, 2.4);
  // affiches
  [['1986', 'été sans fin', '#ff7fbf', '#3a2456', '#ffe27a', -133.2], ['RÊVE', 'ne te réveille pas', '#7ff0ff', '#5a4bd8', '#ff7fbf', -131.6]].forEach((pp) => B.add(planeG(0.9, 1.35).rotateY(Math.PI), std({ map: posterTex(pp[0], pp[1], pp[2], pp[3], pp[4]), roughness: 0.6 }), M4(pp[5], F + 1.75, 1.85), false, false));
  // cuisine : plan de travail menthe, frigo, îlot et tabourets
  P(boxG(5.2, 0.9, 0.62), mint, -125.6, 0.45, 1.5); P(boxG(5.2, 0.05, 0.66), colorMat('#fff6fa'), -125.6, 0.925, 1.48); addBox(-125.6, 1.5, 2.6, 0.34, 0, F, F + 0.95);
  P(boxG(0.85, 1.8, 0.72), mint, -121.0, 0.9, 1.44); addBox(-121.0, 1.44, 0.44, 0.38, 0, F, F + 1.8); for (let i = 0; i < 5; i++) P(boxG(0.06, 0.06, 0.02), accentMat(i), -121.2 + i * 0.1, 1.2 + (i % 2) * 0.15, 1.07);
  piece(-125.8, 0.47, -1.6, 1.1, 0.47, 0.45, 0, 'bois', '#d9b48f', [[boxG(2.2, 0.06, 0.9), colorMat('#fff6fa'), 0, 0.44], [boxG(2.0, 0.84, 0.7), pinkk, 0, -0.02]], { top: F + 0.96 });
  for (const sx of [-126.6, -125.0]) piece(sx, 0.36, -2.6, 0.2, 0.36, 0.2, 0, 'metal', '#e9e2f5', [[new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), mustard, 0, 0.33], [new THREE.CylinderGeometry(0.03, 0.03, 0.66, 8), MAT.chrome, 0, 0], [new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16), MAT.chrome, 0, -0.34]], { colBox: { r: 0.2 }, top: F + 0.72 });
  // chambre : grand lit moelleux (on rebondit dessus), chevets, penderie
  piece(BED.x, 0.3, BED.z, 1.1, 0.3, 1.0, 0, 'tissu', '#ffb3d4', [[boxG(2.2, 0.36, 2.0), colorMat('#fff6fa'), 0, -0.1], [boxG(2.0, 0.16, 1.9), pinkk, -0.08, 0.14], [boxG(0.5, 0.16, 0.7), colorMat('#ffffff'), 0.72, 0.26, -0.45], [boxG(0.5, 0.16, 0.7), colorMat('#ffffff'), 0.72, 0.26, 0.45], [boxG(0.14, 1.0, 2.1), lilac, 1.06, 0.2]], { top: F + 0.56, springy: true, hp: 8 });
  for (const s of [-1, 1]) { piece(-120.6, 0.28, BED.z + s * 1.45, 0.25, 0.28, 0.25, 0, 'bois', '#d9b48f', [[boxG(0.5, 0.56, 0.5), MAT.wood]]); P(new THREE.CylinderGeometry(0.11, 0.15, 0.24, 12), MAT.lampShade, -120.6, 0.78, BED.z + s * 1.45); addSoft(-120.9, F + 0.9, BED.z + s * 1.45, '#ffcfa0', 1.0, 3.6); }
  // la penderie est contre la cloison, loin de la porte de la chambre (qui est à x = -128,6)
  P(boxG(2.4, 2.2, 0.6), lilac, -124.2, 1.1, -5.5); addBox(-124.2, -5.5, 1.2, 0.32, 0, F, F + 2.2); for (const s of [-0.6, 0.6]) P(boxG(0.04, 0.3, 0.04), MAT.gold, -124.2 + s * 0.1, 1.1, -5.83);
  kitSign('bonne nuit', '#b98cff', -120.16, F + 2.6, BED.z, -Math.PI / 2, 1.8, 0.5, 2.2);
  // guirlande du salon, lumières d'ambiance
  bulbString(-145.6, F + 3.0, -13.6, -130.4, F + 3.0, -13.6, 16, 0.3, 1);
  addSoft(-139, F + 2.6, -6.5, '#ffb98a', 2.6, 9); addSoft(-125.5, F + 2.6, -1.2, '#fff0d8', 2.0, 6.5); addSoft(-125, F + 2.4, -9.5, '#ffc2e6', 1.5, 6); addSoft(-142.5, F + 1.6, 0.6, '#7dffb8', 0.9, 3);
  addSoft(-133, F + 2.6, -19, '#ffd2a0', 1.2, 9);
  addZone((p) => (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1 && p.y > HILL.h && p.y < HILL.h + 4) ? 1 : 0, { fog: 0.0012, bloom: 0.6, expo: 1.5 });
}
YOFF = 0;
// écran de l'ordinateur
const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.28), new THREE.MeshBasicMaterial({ map: T.pcScreen, color: HDR('#ffffff', 1.6) }));
pcScreen.position.copy(PC_POS); pcScreen.rotation.y = Math.PI; world.add(pcScreen);
// portes verrouillables : l'entrée (côté rampe) et la porte de la terrasse
refugeDoor = (() => {
  const mk = (x, z, ry, sw) => {
    const pivot = new THREE.Group(); pivot.position.set(x, RFB, z); pivot.rotation.y = ry;
    const leaf = new THREE.Mesh(boxB(0, 1.2, 0, 2.25, -0.035, 0.035), colorMat('#ff8fcf', { roughness: 0.45 })); leaf.castShadow = true; pivot.add(leaf);
    const wn = new THREE.Mesh(twoSided(new THREE.CircleGeometry(0.17, 20)), kitGlass); wn.position.set(0.6, 1.6, 0.04); pivot.add(wn);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), MAT.gold); knob.position.set(1.05, 1.0, 0.06); pivot.add(knob);
    const lockLight = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: HDR('#7dffb8', 3) })); lockLight.position.set(1.05, 1.2, 0.06); pivot.add(lockLight);
    const l2 = lockLight.clone(); l2.position.z = -0.06; pivot.add(l2);
    world.add(pivot);
    return { pivot, lockLight, l2, ry, sw, open: 0, cx: x + Math.cos(ry) * 0.6, cz: z - Math.sin(ry) * 0.6, col: null };
  };
  const d0 = mk(RF.x1, -0.4, Math.PI / 2, 1), d1 = mk(-134.1, RF.z0, 0, -1);
  d0.col = addBox(RF.x1, -1, 0.1, 0.6, 0, RFB - 0.4, RFB + 2.25, W_ALL, 'porte-refuge');
  d1.col = addBox(-133.4, RF.z0, 0.7, 0.1, 0, RFB - 0.4, RFB + 2.25, W_ALL, 'porte-refuge');
  return { doors: [d0, d1], locked: false, lockLight: d0.lockLight, col: d0.col, open: 0, pivot: d0.pivot };
})();
function refugeInside(x, z, y) { return x > RF.x0 + 0.15 && x < RF.x1 - 0.15 && z > RF.z0 + 0.15 && z < RF.z1 - 0.15 && (y === undefined || (y > HILL.h - 0.6 && y < HILL.h + 3.9)); }
function nearRefugeDoor() { if (Math.abs(P.pos.y - RFB) > 2) return false; for (const d of refugeDoor.doors) if (Math.hypot(P.pos.x - d.cx, P.pos.z - d.cz) < 2.4) return true; return false; }
function nearBed() { return refugeInside(P.pos.x, P.pos.z, P.pos.y) && Math.hypot(P.pos.x - BED.x, P.pos.z - BED.z) < 2.3; }
function toggleRefugeLock(fromNet) {
  refugeDoor.locked = !refugeDoor.locked;
  const c = refugeDoor.locked ? HDR('#ff5f7f', 3) : HDR('#7dffb8', 3);
  for (const d of refugeDoor.doors) { d.lockLight.material.color.copy(c); d.l2.material.color.copy(c); }
  sLock(refugeDoor.locked);
  if (!fromNet && NET.on) NET.send('refuge', { l: refugeDoor.locked ? 1 : 0 });
  return refugeDoor.locked;
}
function updateRefuge(dt, players) {
  for (const d of refugeDoor.doors) {
    let near = false;
    if (!refugeDoor.locked) for (const p of players) { const dx = p.x - d.cx, dz = p.z - d.cz; if (dx * dx + dz * dz < 2.6 * 2.6 && Math.abs(p.y - RFB) < 2.5) near = true; }
    const prev = d.open; d.open = damp(d.open, near ? 1.45 : 0, 6, dt);
    d.pivot.rotation.y = d.ry + d.open * d.sw;
    d.col.on = d.open < 0.5;
    if (prev < 0.15 && d.open >= 0.15) sDoor(d.cx, d.cz);
  }
  refugeDoor.open = refugeDoor.doors[0].open;
}
