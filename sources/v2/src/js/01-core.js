/* =========================================================
   Noyau : outils, qualité, rendu, scène, lumières douces
   ========================================================= */
const $ = (id) => document.getElementById(id);
const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261101);
const rr = (a, b) => a + (b - a) * R();
const rnd = (a, b) => a + (b - a) * Math.random();
const C = (h) => new THREE.Color(h);
const HDR = (h, k) => new THREE.Color(h).multiplyScalar(k);
const DEBUG = location.hostname === 'jeu.test';
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const IS_TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
const noteEl = $('note');
function store(k, v) { try { if (v === undefined) return localStorage.getItem('eqr-' + k); localStorage.setItem('eqr-' + k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { return null; } }
function storeJSON(k, def) { try { const s = store(k); return s ? JSON.parse(s) : def; } catch (e) { return def; } }

if (!window.THREE || !THREE.EffectComposer || !THREE.MarchingCubes) {
  noteEl.textContent = "Le moteur 3D n'a pas pu se charger. Vérifie la connexion puis recharge la page.";
  throw new Error('three manquant');
}
THREE.ColorManagement.legacyMode = false;

/* ---------- qualité ---------- */
const PRESETS = {
  haute: { pr: 1.25, shadow: 2048, trans: true, mc: 30, balls: 3000, debris: 500, msaa: 2, soft: 10, confetti: 800, shadows: true, shadowEvery: 1 },
  moyenne: { pr: 1.0, shadow: 1024, trans: false, mc: 26, balls: 1500, debris: 320, msaa: 0, soft: 6, confetti: 450, shadows: true, shadowEvery: 2 },
  basse: { pr: 0.75, shadow: 1024, trans: false, mc: 22, balls: 700, debris: 200, msaa: 0, soft: 4, confetti: 260, shadows: false, shadowEvery: 2 }
};
let qualiteNom = store('qualite') || (IS_TOUCH ? 'moyenne' : 'haute');
if (!PRESETS[qualiteNom]) qualiteNom = 'haute';
const Q = Object.assign({}, PRESETS[qualiteNom]);

/* ---------- rendu ---------- */
const canvas = $('jeu');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
} catch (e) {
  noteEl.textContent = "Ce navigateur n'arrive pas à afficher la 3D (WebGL). Essaie avec Chrome, Edge, Safari ou Firefox à jour.";
  throw e;
}
const isWebGL2 = renderer.capabilities.isWebGL2;
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.pr);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const FOG_COLOR = C('#ffc6c8');
const FOG = { color: { value: FOG_COLOR }, density: { value: 0.0062 } };
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0062);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.15, 2000);
camera.rotation.order = 'YXZ';
scene.add(camera);
const SUN_AZ = 0.38, SUN_EL = 0.16;
const SUN_DIR = new V3(Math.sin(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), -Math.cos(SUN_AZ) * Math.cos(SUN_EL)).normalize();
// la lumière vient d'un peu plus haut que le disque du soleil : des ombres franches au sol
const LIGHT_EL = 0.52, LIGHT_DIR = new V3(Math.sin(SUN_AZ) * Math.cos(LIGHT_EL), Math.sin(LIGHT_EL), -Math.cos(SUN_AZ) * Math.cos(LIGHT_EL)).normalize();
const clockU = { value: 0 };

/* ---------- lumières douces (éclairage local bon marché, sans ombre) ---------- */
const SOFT_N = Q.soft, SOFT_GAIN = 0.62;
const SOFT = { pos: { value: [] }, col: { value: [] } };
for (let i = 0; i < SOFT_N; i++) { SOFT.pos.value.push(new THREE.Vector4(0, -999, 0, 0.01)); SOFT.col.value.push(new THREE.Color(0, 0, 0)); }
const softLights = [];
function addSoft(x, y, z, color, intensity, radius, opts) {
  const l = { p: new V3(x, y, z), c: C(color), k: intensity, r: radius, on: true, flick: (opts && opts.flick) || 0, ph: Math.random() * 10, base: intensity };
  softLights.push(l); return l;
}
const _softTmp = [];
function updateSoftLights(cam) {
  _softTmp.length = 0;
  for (const l of softLights) { if (!l.on || l.k <= 0) continue; const d = l.p.distanceTo(cam) - l.r * 1.2; _softTmp.push([d, l]); }
  _softTmp.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < SOFT_N; i++) {
    const e = _softTmp[i];
    if (e) {
      const l = e[1]; let k = l.k;
      if (l.flick) k *= 1 - l.flick * (0.5 + 0.5 * Math.sin(clockU.value * 13 + l.ph) * Math.sin(clockU.value * 7.3 + l.ph * 2));
      // fondu doux pour les lumières qui entrent ou sortent de la sélection
      const fade = i >= SOFT_N - 2 ? 0.5 : 1;
      SOFT.pos.value[i].set(l.p.x, l.p.y, l.p.z, l.r);
      SOFT.col.value[i].copy(l.c).multiplyScalar(k * fade * SOFT_GAIN);
    } else { SOFT.pos.value[i].set(0, -999, 0, 0.01); SOFT.col.value[i].setRGB(0, 0, 0); }
  }
}
const SOFT_VERT_PARS = 'varying vec3 vSoftW;';
const SOFT_VERT = 'vec4 sw4 = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\nsw4 = instanceMatrix * sw4;\n#endif\nvSoftW = ( modelMatrix * sw4 ).xyz;';
const SOFT_FRAG_PARS = 'varying vec3 vSoftW; uniform vec4 uSoftPos[' + SOFT_N + ']; uniform vec3 uSoftCol[' + SOFT_N + '];';
const SOFT_FRAG = [
  '{',
  '  vec3 swN = normalize( inverseTransformDirection( normal, viewMatrix ) );',
  '  for ( int i = 0; i < ' + SOFT_N + '; i ++ ) {',
  '    vec4 pr = uSoftPos[ i ];',
  '    vec3 L = pr.xyz - vSoftW; float d = length( L );',
  '    float att = clamp( 1.0 - d / pr.w, 0.0, 1.0 ); att *= att;',
  '    float nd = max( dot( swN, L / max( d, 0.001 ) ), 0.0 ) * 0.88 + 0.12;',
  '    reflectedLight.directDiffuse += diffuseColor.rgb * uSoftCol[ i ] * att * nd;',
  '  }',
  '}'
].join('\n');
function softPatch(shader, extra) {
  shader.uniforms.uSoftPos = SOFT.pos; shader.uniforms.uSoftCol = SOFT.col;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + SOFT_VERT_PARS).replace('#include <project_vertex>', '#include <project_vertex>\n' + SOFT_VERT);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + SOFT_FRAG_PARS).replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + SOFT_FRAG);
  if (extra) extra(shader);
}
function std(o, extra) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0, envMapIntensity: 0.7 }, o));
  m.onBeforeCompile = (sh) => softPatch(sh, extra);
  if (extra) m.customProgramCacheKey = () => 'x' + extra.key;
  return m;
}
function phys(o, extra) {
  const m = new THREE.MeshPhysicalMaterial(o);
  m.onBeforeCompile = (sh) => softPatch(sh, extra);
  if (extra) m.customProgramCacheKey = () => 'p' + extra.key;
  return m;
}

/* ---------- ambiances par zone : brume, halo, exposition ---------- */
const ZONE_DEF = { fog: 0.0048, bloom: 0.55, expo: 1.0 };
const ZONES = [];
function addZone(test, v) { ZONES.push({ test, v }); }
const zoneCur = Object.assign({}, ZONE_DEF);
