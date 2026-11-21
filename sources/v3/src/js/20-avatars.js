/* =========================================================
   Personnages : petits animaux et personnages rigolos
   ========================================================= */
const TYPES = [['chat', 'Chat'], ['grenouille', 'Grenouille'], ['lapin', 'Lapin'], ['ours', 'Ours'], ['canard', 'Canard'], ['axolotl', 'Axolotl'], ['robot', 'Robot'], ['humain', 'Humain']];
const COULEURS = ['#ff9fcd', '#cfbaff', '#a3f3dc', '#ffd2b4', '#fff0a0', '#9fd4ff', '#ffb3b3', '#b8f0a0', '#e0e0f0', '#ffcf6f'];
const TEINTS = ['#ffe3d0', '#f7cfae', '#e9b58e', '#d39b70', '#b77d55', '#94603f', '#704630', '#4f3022'];
const ACCESSOIRES = [['aucun', 'Rien'], ['lunettes', 'Lunettes'], ['casquette', 'Casquette'], ['couronne', 'Couronne'], ['casque', 'Casque audio'], ['noeud', 'Nœud']];
const DEFAULT_PROFILE = { nom: '', type: 'chat', couleur: '#ff9fcd', teint: TEINTS[2], acc: 'lunettes', langue: 'fr' };
function nameTag(text, col) {
  const [c, g] = makeCanvas(512, 128);
  g.font = '64px "VT323","Lucida Console",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(500, g.measureText(text).width + 40);
  g.fillStyle = 'rgba(28,20,48,0.62)'; g.fillRect(256 - w / 2, 22, w, 84);
  g.strokeStyle = col || '#ff9fcd'; g.lineWidth = 4; g.strokeRect(256 - w / 2, 22, w, 84);
  g.fillStyle = '#fff5fa'; g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(1.6, 0.4, 1); return s;
}
/* matériaux et formes communs à tous les personnages */
const AVG = {
  torso: new THREE.LatheGeometry([[0.001, 0.56], [0.17, 0.575], [0.245, 0.64], [0.275, 0.76], [0.27, 0.88], [0.245, 1.0], [0.2, 1.1], [0.12, 1.17], [0.001, 1.19]].map(([x, y]) => new THREE.Vector2(x, y)), 32),
  tee: new THREE.LatheGeometry([[0.2, 0.74], [0.283, 0.77], [0.282, 0.88], [0.257, 1.0], [0.212, 1.1], [0.15, 1.16]].map(([x, y]) => new THREE.Vector2(x, y)), 32, 0, Math.PI * 2),
  shorts: new THREE.LatheGeometry([[0.2, 0.52], [0.255, 0.56], [0.28, 0.64], [0.284, 0.76], [0.27, 0.8]].map(([x, y]) => new THREE.Vector2(x, y)), 32),
  head: new THREE.SphereGeometry(0.3, 40, 28),
  limb: new THREE.CapsuleGeometry(0.085, 0.28, 6, 16),
  arm: new THREE.CapsuleGeometry(0.066, 0.25, 6, 14),
  ball: new THREE.SphereGeometry(1, 20, 14),
  ballLo: new THREE.SphereGeometry(1, 12, 8),
  dot: new THREE.CircleGeometry(1, 20)
};
const avMats = new Map();
function avMat(key, mk) { let m = avMats.get(key); if (!m) avMats.set(key, m = mk()); return m; }
function furMat(hex, kind) {
  return avMat('f' + hex + kind, () => {
    const c = C(hex), sh = c.clone().lerp(C('#ffffff'), 0.6);
    if (kind === 'lisse') return phys({ color: c, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: sh, sheenRoughness: 0.4 });
    if (kind === 'metal') return phys({ color: c, roughness: 0.26, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.3 });
    if (kind === 'peau') return phys({ color: c, roughness: 0.55, sheen: 0.35, sheenColor: C('#ffe0d4'), sheenRoughness: 0.5 });
    if (kind === 'tissu') return phys({ color: c, roughness: 0.8, sheen: 0.6, sheenColor: sh, sheenRoughness: 0.7 });
    return phys({ color: c, roughness: 0.66, sheen: 0.85, sheenColor: sh, sheenRoughness: 0.42 });
  });
}
const AVM = {
  dark: std({ color: C('#1c1430'), roughness: 0.25 }),
  white: std({ color: C('#ffffff'), roughness: 0.25 }),
  shine: new THREE.MeshBasicMaterial({ color: HDR('#ffffff', 1.4) }),
  pink: std({ color: C('#ff8fb8'), roughness: 0.5 }),
  blush: new THREE.MeshBasicMaterial({ color: C('#ff8fb8'), transparent: true, opacity: 0.55, depthWrite: false, map: T.dot }),
  sole: std({ color: C('#fbf7ff'), roughness: 0.5 }),
  orange: phys({ color: C('#ffa94f'), roughness: 0.35, clearcoat: 0.6 }),
  chrome: std({ color: C('#f4f0ff'), metalness: 1, roughness: 0.15, envMapIntensity: 1.5 })
};
const IRIS = { chat: '#7fd89a', grenouille: '#ffd36f', lapin: '#ff7fa8', ours: '#8a5a3a', canard: '#3a2456', axolotl: '#2a1d45', humain: null };
const TENUES = ['#fff5fa', '#ffe27a', '#7ff0ff', '#b98cff', '#a3f3dc', '#ff9f8f', '#9fd4ff', '#ffb3d4'];
const HAIRS = ['#5a3a2a', '#e8c070', '#2a1a14', '#c86a3a', '#ff9fcd', '#9a7cff', '#f5f0e6'];
function roundBoxG(w, h, d, r) {
  const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y); s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, h / 2, x, h / 2); s.lineTo(-x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y); s.lineTo(-w / 2, -y); s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 4, curveSegments: 6 }); g.translate(0, 0, -(d - r * 2) / 2); return g;
}
function makeAvatar(cfg, opts) {
  cfg = Object.assign({}, DEFAULT_PROFILE, cfg || {});
  const t = cfg.type, robot = t === 'robot', human = t === 'humain', hsh = Math.abs(hashStr((cfg.nom || 'x') + t));
  const g = new THREE.Group();
  const main = furMat(cfg.couleur, robot ? 'metal' : (t === 'grenouille' || t === 'axolotl') ? 'lisse' : 'poil');
  const light = furMat('#' + C(cfg.couleur).lerp(C('#ffffff'), 0.55).getHexString(), (t === 'grenouille' || t === 'axolotl') ? 'lisse' : 'poil');
  const deep = furMat('#' + C(cfg.couleur).lerp(C('#3a2456'), 0.28).getHexString(), robot ? 'metal' : 'poil');
  const skin = human ? furMat(cfg.teint, 'peau') : main;
  let tenueHex = TENUES[hsh % TENUES.length]; if (C(tenueHex).getHSL({}).l > 0.9 && C(cfg.couleur).getHSL({}).l > 0.85) tenueHex = TENUES[(hsh + 3) % TENUES.length];
  const tenue = furMat(tenueHex, 'tissu');
  const add = (parent, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
  const blob = (parent, mat, x, y, z, sx, sy, sz, lo) => add(parent, lo ? AVG.ballLo : AVG.ball, mat, x, y, z, 0, 0, 0, sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
  const body = new THREE.Group(); g.add(body);
  const extra = { tail: null, ears: [], eyes: [], chest: null };
  /* ---- torse ---- */
  if (robot) {
    add(body, roundBoxG(0.48, 0.52, 0.36, 0.07), main, 0, 0.86, 0);
    add(body, roundBoxG(0.26, 0.16, 0.04, 0.015), AVM.dark, 0, 0.92, 0.17);
    extra.chest = add(body, new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ color: HDR('#7dffb8', 2.2) }), 0, 0.92, 0.193);
    for (const s of [-1, 1]) blob(body, AVM.chrome, s * 0.27, 1.06, 0, 0.075);
    for (let k = 0; k < 3; k++) add(body, new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: HDR(['#ff8fd0', '#ffe27a', '#7ff0ff'][k], 2) }), -0.06 + k * 0.06, 0.74, 0.185);
    add(body, new THREE.CylinderGeometry(0.1, 0.12, 0.1, 18), AVM.chrome, 0, 1.17, 0);
  } else {
    add(body, AVG.torso, main, 0, 0, 0);
    if (human) {
      add(body, AVG.tee, tenue, 0, 0, 0);
      add(body, AVG.shorts, furMat('#7f8fe0', 'tissu'), 0, 0, 0);
      add(body, new THREE.TorusGeometry(0.15, 0.018, 8, 28), tenue, 0, 1.155, 0, Math.PI / 2);
      // petit motif sur le t-shirt : un soleil rayé
      add(body, AVG.dot, furMat('#ff7fbf', 'tissu'), 0, 0.93, 0.272, -0.12, 0, 0, 0.07, 0.07, 1);
      for (let k = 0; k < 2; k++) add(body, new THREE.PlaneGeometry(0.15, 0.012), furMat(tenueHex, 'tissu'), 0, 0.905 - k * 0.024, 0.2735, -0.12);
    } else {
      blob(body, light, 0, 0.8, 0.12, 0.2, 0.25, 0.16);
      // foulard noué autour du cou
      add(body, new THREE.TorusGeometry(0.14, 0.04, 10, 28), tenue, 0, 1.13, 0, Math.PI / 2 + 0.12);
      add(body, new THREE.ConeGeometry(0.09, 0.16, 3), tenue, 0, 1.06, 0.17, 0.25, 0, Math.PI);
      blob(body, tenue, 0, 1.12, 0.165, 0.035);
    }
    add(body, new THREE.CylinderGeometry(0.1, 0.11, 0.1, 18), skin, 0, 1.2, 0);
  }
  /* ---- jambes et pieds ---- */
  const legs = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.12, 0.6, 0); body.add(piv);
    if (robot) { add(piv, new THREE.CylinderGeometry(0.055, 0.055, 0.34, 14), AVM.chrome, 0, -0.22, 0); add(piv, roundBoxG(0.16, 0.1, 0.24, 0.03), main, 0, -0.47, 0.04); }
    else {
      add(piv, AVG.limb, human ? skin : main, 0, -0.25, 0);
      if (human) { add(piv, roundBoxG(0.16, 0.1, 0.27, 0.045), AVM.sole, 0, -0.5, 0.045); add(piv, new THREE.BoxGeometry(0.165, 0.025, 0.12), furMat(tenueHex === '#fff5fa' ? '#ff7fbf' : tenueHex, 'tissu'), 0, -0.47, 0.03); add(piv, new THREE.BoxGeometry(0.17, 0.03, 0.28), furMat('#ff9fcd', 'lisse'), 0, -0.545, 0.045); }
      else if (t === 'canard' || t === 'grenouille' || t === 'axolotl') { const fm = t === 'canard' ? AVM.orange : light; blob(piv, fm, 0, -0.52, 0.07, 0.11, 0.045, 0.17); for (const k of [-1, 0, 1]) blob(piv, fm, k * 0.065, -0.525, 0.2, 0.04, 0.03, 0.05, true); }
      else { blob(piv, light, 0, -0.5, 0.05, 0.1, 0.07, 0.14); for (const k of [-1, 0, 1]) blob(piv, light, k * 0.05, -0.5, 0.17, 0.035, 0.035, 0.035, true); }
    }
    legs.push(piv);
  }
  /* ---- bras et mains ---- */
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.29, 1.08, 0); body.add(piv);
    if (robot) { add(piv, new THREE.CylinderGeometry(0.045, 0.045, 0.28, 12), AVM.chrome, 0, -0.17, 0); blob(piv, main, 0, -0.34, 0, 0.075); }
    else {
      add(piv, AVG.arm, human ? skin : main, 0, -0.17, 0);
      if (human) add(piv, new THREE.CylinderGeometry(0.085, 0.078, 0.13, 16), tenue, 0, -0.05, 0);
      const hm = human ? skin : light;
      blob(piv, hm, 0, -0.34, 0.005, 0.078, 0.075, 0.07); blob(piv, hm, s * -0.05, -0.31, 0.04, 0.03, 0.03, 0.03, true);
    }
    arms.push(piv);
  }
  // l'arme sélectionnée, tenue à deux mains devant le torse (les quatre modèles détaillés, un seul visible)
  const hold = new THREE.Group(); hold.position.set(0.08, 1.0, 0.24); g.add(hold);
  const guns = makeWorldGuns();
  guns.forEach((m, i) => { m.scale.setScalar(0.8); m.rotation.y = Math.PI; m.position.set(0, 0, 0.1); m.visible = i === 0; hold.add(m); });
  const gun = hold;
  /* ---- tête ---- */
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); g.add(head);
  const eye = (x, y, z, ry, rx, r, iris, opt) => {
    const e = new THREE.Group(); e.position.set(x, y, z); e.rotation.set(rx || 0, ry || 0, 0); head.add(e);
    const o = opt || {};
    if (!o.noWhite) blob(e, AVM.white, 0, 0, 0, r, r * 1.12, r * 0.55);
    blob(e, furMat(iris, 'lisse'), 0, -r * 0.05, r * 0.32, r * 0.66, r * 0.74, r * 0.3);
    blob(e, AVM.dark, 0, -r * 0.05, r * 0.45, r * 0.36, r * 0.4, r * 0.2);
    blob(e, AVM.shine, r * 0.24, r * 0.3, r * 0.56, r * 0.16, r * 0.16, r * 0.08, true);
    blob(e, AVM.shine, -r * 0.18, -r * 0.3, r * 0.55, r * 0.07, r * 0.07, r * 0.05, true);
    extra.eyes.push(e); return e;
  };
  const cheeks = () => { for (const s of [-1, 1]) add(head, AVG.dot, AVM.blush, s * 0.19, -0.06, 0.228, 0, s * 0.62, 0, 0.065, 0.05, 1); };
  const smile = (w, y, z) => add(head, new THREE.TorusGeometry(w || 0.05, 0.012, 8, 20, Math.PI), AVM.dark, 0, y || -0.08, z || 0.285, 0.15, 0, Math.PI);
  let eyeY = 0.04, eyeZ = 0.25, eyeX = 0.11;
  if (robot) {
    add(head, roundBoxG(0.54, 0.44, 0.46, 0.09), main, 0, 0.02, 0);
    add(head, roundBoxG(0.44, 0.27, 0.06, 0.025), new THREE.MeshPhysicalMaterial({ color: C('#10241c'), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }), 0, 0.02, 0.215);
    for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * 0.09, 0.05, 0.24); head.add(e); add(e, roundBoxG(0.08, 0.08, 0.02, 0.008), new THREE.MeshBasicMaterial({ color: HDR('#7dffb8', 2.5) }), 0, 0, 0); extra.eyes.push(e); }
    add(head, new THREE.BoxGeometry(0.14, 0.022, 0.01), new THREE.MeshBasicMaterial({ color: HDR('#ff8fd0', 2.5) }), 0, -0.055, 0.248);
    for (const s of [-1, 1]) { add(head, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 18).rotateZ(Math.PI / 2), AVM.chrome, s * 0.285, 0.02, 0); blob(head, new THREE.MeshBasicMaterial({ color: HDR('#ffe27a', 1.6) }), s * 0.312, 0.02, 0, 0.022); }
    add(head, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), AVM.chrome, 0, 0.33, 0); blob(head, new THREE.MeshBasicMaterial({ color: HDR('#ff5f9f', 3) }), 0, 0.45, 0, 0.045);
  } else {
    const hs = t === 'grenouille' ? [1.2, 0.82, 1.0] : t === 'canard' ? [0.95, 1, 0.95] : [1, 0.96, 0.97];
    add(head, AVG.head, skin, 0, 0, 0, 0, 0, 0, hs[0], hs[1], hs[2]);
    if (t === 'grenouille') {
      eyeY = 0.2; eyeZ = 0.1; eyeX = 0.17;
      for (const s of [-1, 1]) { blob(head, main, s * eyeX, eyeY - 0.03, eyeZ - 0.02, 0.11, 0.1, 0.1); eye(s * eyeX, eyeY, eyeZ + 0.06, s * 0.25, -0.2, 0.075, IRIS.grenouille); }
      smile(0.13, -0.08, 0.26); for (const [x, y, z] of [[0.1, 0.12, -0.25], [-0.16, 0.05, -0.24], [0.02, 0.2, -0.2]]) blob(head, deep, x, y, z, 0.04, 0.04, 0.015, true);
      for (const s of [-1, 1]) blob(head, deep, s * 0.05, 0.0, 0.29, 0.012, 0.012, 0.012, true);
    } else {
      for (const s of [-1, 1]) eye(s * eyeX, eyeY, eyeZ, s * 0.38, -0.1, t === 'axolotl' || t === 'canard' ? 0.05 : 0.066, human ? ['#5a3a2a', '#3f7fbf', '#4f8f5f', '#2a1d14'][hsh % 4] : IRIS[t] || '#3a2456', { noWhite: t === 'axolotl' || t === 'canard' });
      cheeks();
    }
    if (t === 'chat') {
      blob(head, light, 0, -0.08, 0.235, 0.11, 0.075, 0.07);
      add(head, new THREE.ConeGeometry(0.03, 0.025, 3), AVM.pink, 0, -0.035, 0.3, Math.PI / 2 + 0.3, 0, Math.PI);
      smile(0.03, -0.085, 0.3); add(head, new THREE.TorusGeometry(0.03, 0.01, 6, 14, Math.PI), AVM.dark, 0.06, -0.085, 0.29, 0.15, 0, Math.PI);
      for (const s of [-1, 1]) {
        const ep = new THREE.Group(); ep.position.set(s * 0.16, 0.22, -0.01); ep.rotation.z = s * -0.32; head.add(ep);
        add(ep, new THREE.ConeGeometry(0.105, 0.21, 20), main, 0, 0.08, 0); add(ep, new THREE.ConeGeometry(0.06, 0.13, 16), AVM.pink, 0, 0.065, 0.035);
        extra.ears.push(ep);
        for (const k of [-1, 1]) add(head, new THREE.CylinderGeometry(0.003, 0.003, 0.17, 4), AVM.white, s * 0.21, -0.06 + k * 0.022, 0.255, 0, 0, Math.PI / 2 + s * k * 0.12);
      }
      for (let k = -1; k <= 1; k++) add(head, AVG.ballLo, deep, k * 0.055, 0.2 - Math.abs(k) * 0.02, 0.208 - Math.abs(k) * 0.012, -0.75, k * 0.25, k * 0.35, 0.018, 0.055, 0.02);
      const tp = new THREE.Group(); tp.position.set(0, 0.68, -0.22); body.add(tp);
      add(tp, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0, 0.04, -0.2), new V3(0, 0.26, -0.3), new V3(0.06, 0.5, -0.24)]), 24, 0.048, 12), main, 0, 0, 0);
      blob(tp, light, 0.06, 0.5, -0.24, 0.05);
      extra.tail = tp;
    } else if (t === 'lapin') {
      for (const s of [-1, 1]) {
        const ep = new THREE.Group(); ep.position.set(s * 0.1, 0.25, -0.02); ep.rotation.set(-0.12, 0, s * -0.14); head.add(ep);
        add(ep, new THREE.CapsuleGeometry(0.062, 0.32, 8, 16), main, 0, 0.2, 0); add(ep, new THREE.CapsuleGeometry(0.032, 0.26, 6, 12), AVM.pink, 0, 0.2, 0.04);
        extra.ears.push(ep);
      }
      blob(head, light, 0, -0.07, 0.24, 0.1, 0.07, 0.07); blob(head, AVM.pink, 0, -0.025, 0.305, 0.028, 0.022, 0.02, true);
      for (const s of [-1, 1]) add(head, new THREE.BoxGeometry(0.03, 0.04, 0.01), AVM.white, s * 0.017, -0.125, 0.3);
      smile(0.035, -0.095, 0.3);
      const tp = new THREE.Group(); tp.position.set(0, 0.66, -0.26); body.add(tp); blob(tp, AVM.white, 0, 0, 0, 0.1, 0.1, 0.1); extra.tail = tp;
    } else if (t === 'ours') {
      for (const s of [-1, 1]) { const ep = new THREE.Group(); ep.position.set(s * 0.22, 0.22, -0.02); head.add(ep); blob(ep, main, 0, 0, 0, 0.1, 0.1, 0.07); blob(ep, light, 0, 0, 0.04, 0.055, 0.055, 0.03); extra.ears.push(ep); }
      blob(head, light, 0, -0.07, 0.235, 0.13, 0.095, 0.09); blob(head, AVM.dark, 0, -0.025, 0.32, 0.04, 0.03, 0.03);
      smile(0.04, -0.11, 0.31);
      const tp = new THREE.Group(); tp.position.set(0, 0.64, -0.26); body.add(tp); blob(tp, main, 0, 0, 0, 0.07); extra.tail = tp;
    } else if (t === 'canard') {
      blob(head, AVM.orange, 0, -0.05, 0.3, 0.12, 0.04, 0.1); blob(head, furMat('#ff9440', 'lisse'), 0, -0.09, 0.29, 0.1, 0.03, 0.085);
      blob(head, deep, 0.03, -0.03, 0.39, 0.012, 0.008, 0.008, true); blob(head, deep, -0.03, -0.03, 0.39, 0.012, 0.008, 0.008, true);
      for (let k = 0; k < 3; k++) add(head, new THREE.ConeGeometry(0.035, 0.14, 10), main, (k - 1) * 0.03, 0.32, -0.02, -0.35 + k * 0.1, 0, (k - 1) * 0.35);
      const tp = new THREE.Group(); tp.position.set(0, 0.72, -0.27); body.add(tp); add(tp, new THREE.ConeGeometry(0.12, 0.22, 16), light, 0, 0, -0.05, -1.2); extra.tail = tp;
    } else if (t === 'axolotl') {
      smile(0.1, -0.06, 0.27);
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const gp = new THREE.Group(); gp.position.set(s * 0.27, 0.1 - k * 0.075, -0.03); gp.rotation.z = -s * (1.15 + (k - 1) * 0.4); head.add(gp);
        add(gp, new THREE.CapsuleGeometry(0.024, 0.15, 6, 10), furMat('#ff7fb0', 'lisse'), 0, 0.1, 0);
        for (let q = 0; q < 3; q++) blob(gp, furMat('#ff9fc8', 'lisse'), 0, 0.05 + q * 0.05, 0.02, 0.02, 0.012, 0.025, true);
        extra.ears.push(gp);
      }
      const tp = new THREE.Group(); tp.position.set(0, 0.6, -0.24); body.add(tp); add(tp, new THREE.ConeGeometry(0.1, 0.44, 16), light, 0, 0, -0.15, -1.75, 0, 0, 0.5, 1, 1); extra.tail = tp;
    } else if (human) {
      // visage : sourcils, nez, oreilles
      for (const s of [-1, 1]) add(head, new THREE.CapsuleGeometry(0.01, 0.05, 4, 8), furMat(HAIRS[(hsh >> 3) % HAIRS.length], 'poil'), s * 0.11, 0.125, 0.255, 0, 0, Math.PI / 2 + s * 0.15);
      blob(head, skin, 0, -0.02, 0.295, 0.03, 0.028, 0.025);
      for (const s of [-1, 1]) blob(head, skin, s * 0.295, 0, 0, 0.045, 0.06, 0.035);
      smile(0.045, -0.1, 0.28);
      // coiffure : quatre styles selon le nom
      const hair = furMat(HAIRS[(hsh >> 3) % HAIRS.length], 'poil'), st = (hsh >> 5) % 4;
      add(head, new THREE.SphereGeometry(0.318, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.02, -0.01, -0.18);
      if (st === 0) { for (let k = -2; k <= 2; k++) blob(head, hair, k * 0.07, 0.2 - Math.abs(k) * 0.02, 0.22, 0.07, 0.05, 0.06, true); }
      else if (st === 1) { add(head, new THREE.SphereGeometry(0.33, 32, 18, Math.PI * 0.7, Math.PI * 1.6, 0, Math.PI * 0.62), hair, 0, -0.02, 0); for (const s of [-1, 1]) blob(head, hair, s * 0.24, -0.08, 0.05, 0.09, 0.14, 0.12); }
      else if (st === 2) { for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr2 = 0.27; blob(head, hair, Math.cos(a) * rr2 * 0.9, 0.2 + Math.sin(k * 1.7) * 0.03, Math.sin(a) * rr2 * 0.9 - 0.02, 0.1, 0.09, 0.1, true); } blob(head, hair, 0, 0.28, 0, 0.16, 0.08, 0.16); }
      else { blob(head, hair, 0, 0.06, -0.33, 0.1, 0.12, 0.1); add(head, new THREE.CapsuleGeometry(0.07, 0.18, 6, 12), hair, 0, -0.12, -0.36, 0.25); add(head, new THREE.TorusGeometry(0.06, 0.018, 8, 18), furMat('#ff7fbf', 'lisse'), 0, 0.0, -0.34, 0.2); }
    }
    // accessoires
    const a = cfg.acc;
    if (a === 'lunettes') { const fr = furMat('#ff5fa8', 'lisse'), lens = new THREE.MeshPhysicalMaterial({ color: C('#2a1d45'), roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.82 }); for (const s of [-1, 1]) { add(head, roundBoxG(0.15, 0.09, 0.02, 0.008), lens, s * eyeX, eyeY, eyeZ + 0.07); add(head, new THREE.TorusGeometry(0.06, 0.009, 6, 20), fr, s * eyeX, eyeY, eyeZ + 0.08, 0, 0, 0, 1.25, 0.8, 1); add(head, new THREE.BoxGeometry(0.012, 0.012, 0.22), fr, s * 0.27, eyeY, eyeZ - 0.06); } add(head, new THREE.BoxGeometry(0.06, 0.012, 0.015), fr, 0, eyeY + 0.02, eyeZ + 0.08); }
    else if (a === 'casquette') { const cm = furMat('#7f9fff', 'tissu'); add(head, new THREE.SphereGeometry(0.315, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), cm, 0, 0.06, 0); add(head, new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24, 1, false, -Math.PI / 2, Math.PI), cm, 0, 0.12, 0.2); blob(head, furMat('#ff7fbf', 'tissu'), 0, 0.37, 0, 0.03, 0.02, 0.03, true); }
    else if (a === 'couronne') { const gm = phys({ color: C('#ffd36f'), metalness: 1, roughness: 0.22, clearcoat: 1, envMapIntensity: 1.5 }); add(head, new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24, 1, true), gm, 0, 0.31, 0); for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2; add(head, new THREE.ConeGeometry(0.035, 0.09, 8), gm, Math.sin(an) * 0.17, 0.39, Math.cos(an) * 0.17); blob(head, new THREE.MeshBasicMaterial({ color: HDR(['#ff7fbf', '#7ff0ff', '#b98cff'][k % 3], 1.6) }), Math.sin(an) * 0.172, 0.31, Math.cos(an) * 0.172, 0.018, 0.018, 0.018, true); } }
    else if (a === 'casque') { const hm = furMat('#ff6f9f', 'lisse'); add(head, new THREE.TorusGeometry(0.325, 0.028, 8, 32, Math.PI), hm, 0, 0.0, -0.02); for (const s of [-1, 1]) { add(head, new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), hm, s * 0.31, 0, 0, 0, 0, Math.PI / 2); add(head, new THREE.CylinderGeometry(0.075, 0.075, 0.07, 20), AVM.dark, s * 0.3, 0, 0, 0, 0, Math.PI / 2); } }
    else if (a === 'noeud') { const bm = furMat('#ff5f8f', 'tissu'); for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(0.07, 0.14, 12), bm, 0.14 + s * 0.07, 0.27, 0, 0, 0, s * Math.PI / 2); blob(head, bm, 0.14, 0.27, 0, 0.035); }
  }
  let tag = null;
  if (opts && opts.tag) { tag = nameTag(cfg.nom || 'Rêveur', cfg.couleur); tag.position.y = 2.15; g.add(tag); }
  const jet = makeJetpack(); jet.position.set(0, 0.92, -0.3); jet.scale.setScalar(0.85); jet.visible = false; body.add(jet);
  const av = { g, head, body, legs, arms, gun, hold, guns, w: 0, tag, walk: 0, cfg, jet, eyes: extra.eyes, ears: extra.ears, tail: extra.tail, chest: extra.chest, ph: (hsh % 1000) / 160, blinkT: 1 + (hsh % 7) * 0.4, blink: 0, t: 0 };
  return av;
}
function animateAvatar(av, dt, st) {
  // st : { speed, pitch, swim, air, firing, w }
  av.t += dt;
  const T0 = av.t + av.ph, spd = st.speed || 0, mv = Math.min(1, spd / 3);
  av.walk += dt * spd * 2.2;
  const sw = Math.sin(av.walk) * mv * 0.7;
  if (st.swim) {
    av.body.rotation.x = damp(av.body.rotation.x, 1.1, 6, dt);
    av.legs[0].rotation.x = Math.sin(T0 * 6) * 0.5; av.legs[1].rotation.x = -Math.sin(T0 * 6) * 0.5;
    av.arms[0].rotation.x = -2.2 + Math.sin(T0 * 3) * 1.2; av.arms[1].rotation.x = -2.2 - Math.sin(T0 * 3) * 1.2;
  } else {
    av.body.rotation.x = damp(av.body.rotation.x, mv * 0.06, 6, dt);
    av.legs[0].rotation.x = st.air ? -0.5 : sw; av.legs[1].rotation.x = st.air ? 0.3 : -sw;
    const aim = -1.45 + (st.pitch || 0) * 0.8;
    av.arms[1].rotation.x = aim + (st.firing ? Math.sin(T0 * 60) * 0.04 : 0); av.arms[0].rotation.x = aim + 0.1;
    // les deux mains se rejoignent sur l'arme (main droite sur la poignée, main gauche sous le canon)
    av.arms[0].rotation.z = 0.7; av.arms[1].rotation.z = -0.64;
  }
  // respiration, petit balancement de la tête au repos
  const br = Math.sin(T0 * 2.1) * (1 - mv);
  av.body.scale.set(1 + br * 0.008, 1 + br * 0.014, 1 + br * 0.008);
  av.head.rotation.x = -(st.pitch || 0) * 0.6 + br * 0.03;
  av.head.rotation.z = Math.sin(T0 * 0.9) * 0.04 * (1 - mv);
  av.head.position.y = 1.42 + br * 0.008 + Math.abs(Math.sin(av.walk)) * 0.015 * mv;
  // clignement des yeux
  av.blinkT -= dt;
  if (av.blinkT <= 0) { av.blink = 0.14; av.blinkT = 2.2 + Math.random() * 3.5; if (Math.random() < 0.2) av.blinkT = 0.25; }
  if (av.blink > 0) av.blink -= dt;
  const ey = av.blink > 0 ? 0.12 : 1;
  for (const e of av.eyes) e.scale.y = ey;
  // queue qui remue, oreilles qui frémissent
  if (av.tail) { av.tail.rotation.y = Math.sin(T0 * (3 + mv * 4)) * (0.25 + mv * 0.3); av.tail.rotation.x = Math.sin(T0 * 1.7) * 0.08; }
  for (let i = 0; i < av.ears.length; i++) { const e = av.ears[i]; if (e.userData.r0 === undefined) e.userData.r0 = e.rotation.x; e.rotation.x = e.userData.r0 + Math.sin(T0 * 2.4 + i) * 0.04 + (Math.sin(T0 * 0.7 + i * 2) > 0.97 ? Math.sin(T0 * 30) * 0.15 : 0); }
  if (av.chest) av.chest.material.color.setRGB(0.4, 1.6 + Math.sin(T0 * 4) * 0.8, 0.9);
  if (av.hold) {
    const w = clamp(st.w | 0, 0, av.guns.length - 1);
    if (w !== av.w) { av.guns[av.w].visible = false; av.guns[w].visible = true; av.w = w; }
    av.hold.visible = !st.swim;
    av.hold.rotation.x = -(st.pitch || 0) * 0.8 + (st.firing && w !== 3 ? (Math.random() - 0.5) * 0.06 : 0);
    av.hold.position.z = 0.24 - (st.firing && w !== 3 ? Math.random() * 0.03 : 0);
    const gm = av.guns[w], fl = gm.userData.flash;
    if (fl) { const on = !!st.firing && Math.random() < 0.55; fl.visible = on; if (on) { fl.rotation.z = Math.random() * 6; fl.scale.setScalar(0.8 + Math.random() * 0.6); } }
    if (gm.userData.crystal) gm.userData.crystal.scale.setScalar(st.firing ? 1.3 + Math.random() * 0.5 : 1);
  }
  av.g.position.y += st.swim ? 0 : Math.abs(Math.sin(av.walk)) * 0.04 * mv;
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
const AVG_SET = new Set(Object.values(AVG));
// libère ce qui appartient à ce personnage seulement (formes communes et armes partagées exclues)
function disposeAvatar(av) {
  const keep = new Set(); if (av.hold) av.hold.traverse((o) => keep.add(o));
  av.g.traverse((o) => { if (keep.has(o)) return; if (o.geometry && !AVG_SET.has(o.geometry)) o.geometry.dispose(); if (o.isSprite && o.material.map) o.material.map.dispose(); });
}

/* ---------- aperçu dans l'écran de préparation ---------- */
const PREVIEW = { renderer: null, scene: null, cam: null, av: null, on: false };
function initPreview() {
  if (PREVIEW.renderer) return;
  const cv = $('apercu');
  try { PREVIEW.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return; }
  PREVIEW.renderer.setPixelRatio(1); PREVIEW.renderer.outputEncoding = THREE.sRGBEncoding;
  PREVIEW.scene = new THREE.Scene();
  PREVIEW.scene.add(new THREE.HemisphereLight(C('#ffe6f6'), C('#9f8fd0'), 1.4));
  const dl = new THREE.DirectionalLight(C('#fff0e0'), 1.6); dl.position.set(2, 3, 3); PREVIEW.scene.add(dl);
  const rim = new THREE.DirectionalLight(C('#8ff6ff'), 1.2); rim.position.set(-3, 2, -2); PREVIEW.scene.add(rim);
  PREVIEW.cam = new THREE.PerspectiveCamera(30, cv.width / cv.height, 0.1, 20); PREVIEW.cam.position.set(0, 1.25, 4.4); PREVIEW.cam.lookAt(0, 1.0, 0);
}
function setPreview(cfg) {
  initPreview(); if (!PREVIEW.scene) return;
  if (PREVIEW.av) { PREVIEW.scene.remove(PREVIEW.av.g); disposeAvatar(PREVIEW.av); }
  PREVIEW.av = makeAvatar(cfg); PREVIEW.scene.add(PREVIEW.av.g);
}
function renderPreview(dt) {
  if (!PREVIEW.on || !PREVIEW.av) return;
  PREVIEW.av.g.rotation.y += dt * 0.6;
  PREVIEW.av.g.position.y = 0;
  animateAvatar(PREVIEW.av, dt, { speed: 0, pitch: 0.25 + Math.sin(clockU.value) * 0.1 });
  PREVIEW.renderer.render(PREVIEW.scene, PREVIEW.cam);
}
