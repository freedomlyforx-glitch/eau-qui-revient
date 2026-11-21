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

/* ---------- brume : elle se teinte vers le soleil et s'allège en altitude ---------- */
const FOGU = { sun: { value: new THREE.Vector3(0, 1, 0) }, col: { value: new THREE.Color(0, 0, 0) } };
THREE.ShaderChunk.fog_pars_fragment = [
  '#ifdef USE_FOG', '\tuniform vec3 fogColor;', '\tvarying float vFogDepth;',
  '\t#ifdef FOG_EXP2', '\t\tuniform float fogDensity;', '\t#else', '\t\tuniform float fogNear;', '\t\tuniform float fogFar;', '\t#endif',
  '\t#ifdef SOFT_FOG', '\t\tuniform vec3 uFogSun; uniform vec3 uFogSunCol;', '\t#endif', '#endif'].join('\n');
THREE.ShaderChunk.fog_fragment = [
  '#ifdef USE_FOG',
  '\t#ifdef FOG_EXP2', '\t\tfloat fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );', '\t#else', '\t\tfloat fogFactor = smoothstep( fogNear, fogFar, vFogDepth );', '\t#endif',
  '\tvec3 fogCol = fogColor;',
  '\t#ifdef SOFT_FOG',
  '\t\tfloat fogS = max( dot( normalize( vSoftW - cameraPosition ), uFogSun ), 0.0 );',
  '\t\tfogCol += uFogSunCol * ( pow( fogS, 8.0 ) * 0.85 + fogS * fogS * 0.15 );',
  '\t\tfogFactor *= mix( 1.0, 0.5, smoothstep( 6.0, 70.0, vSoftW.y ) );',
  '\t#endif',
  '\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );',
  '#endif'].join('\n');

/* ---------- qualité ---------- */
// ao : ombrage des recoins · refl : reflets du décor dans la mer (taille relative) · rays : rayons du soleil
// grass : brins d'herbe (0 = aucun) · tex : finesse des matières · shW : largeur de la zone d'ombres portées
// vol : nuages calculés en volume (0 = nuages peints) · lampSh : ombres portées par la lampe la plus proche, la nuit
const PRESETS = {
  ultra: { pr: 2.0, shadow: 4096, shW: 150, trans: true, mc: 30, balls: 3000, debris: 500, soft: 10, confetti: 800, shadows: true, shadowEvery: 1, tex: 1024, ao: 1, refl: 0.75, rays: 1, grass: 3, fxaa: 1, vol: 2, lampSh: 1 },
  haute: { pr: 1.5, shadow: 2048, shW: 110, trans: true, mc: 30, balls: 3000, debris: 500, soft: 10, confetti: 800, shadows: true, shadowEvery: 1, tex: 1024, ao: 1, refl: 0.5, rays: 1, grass: 2, fxaa: 1, vol: 1, lampSh: 1 },
  moyenne: { pr: 1.5, shadow: 2048, shW: 96, trans: false, mc: 26, balls: 1500, debris: 320, soft: 6, confetti: 450, shadows: true, shadowEvery: 2, tex: 512, ao: 0, refl: 0, rays: 0, grass: 1, fxaa: 1, vol: 0, lampSh: 0 },
  basse: { pr: 1.0, shadow: 1024, shW: 96, trans: false, mc: 22, balls: 700, debris: 200, soft: 4, confetti: 260, shadows: false, shadowEvery: 2, tex: 256, ao: 0, refl: 0, rays: 0, grass: 0, fxaa: 0, vol: 0, lampSh: 0 }
};
const QUAL_ORDER = ['basse', 'moyenne', 'haute', 'ultra'];
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
// sur téléphone on démarre un cran plus bas : la définition remonte toute seule si l'appareil suit
let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.pr, IS_TOUCH ? 1.25 : 9);
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
  const l = { p: new V3(x, y + (typeof YOFF === 'number' ? YOFF : 0), z), c: C(color), k: intensity, r: radius, on: true, flick: (opts && opts.flick) || 0, ph: Math.random() * 10, base: intensity };
  softLights.push(l); return l;
}
const _softTmp = [];
function updateSoftLights(cam) {
  _softTmp.length = 0;
  for (const l of softLights) { if (!l.on || l.k <= 0) continue; const d = l.p.distanceTo(cam) - l.r * 1.2; _softTmp.push([d, l]); }
  _softTmp.sort((a, b) => a[0] - b[0]);
  for (const l of softLights) l.slot = -1;
  for (let i = 0; i < SOFT_N; i++) {
    const e = _softTmp[i];
    if (e) {
      const l = e[1]; let k = l.k; l.slot = i;
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
// sols mouillés (la nuit, à marée haute) et ombre portée par la lampe la plus proche du joueur
const WETU = { value: 0 };
const LSH_ON = !!Q.lampSh && isWebGL2;
const LSHU = { tex: { value: null }, mat: { value: new THREE.Matrix4() }, par: { value: new THREE.Vector4(0.35, 16, 0, -1) } };
const SOFT_FRAG_PARS = 'varying vec3 vSoftW; uniform vec4 uSoftPos[' + SOFT_N + ']; uniform vec3 uSoftCol[' + SOFT_N + ']; uniform float uWetK;' + (LSH_ON ? ' uniform sampler2D uLsT; uniform mat4 uLsM; uniform vec4 uLsP;' : '');
const SOFT_FRAG = [
  '{',
  '  vec3 swN = normalize( inverseTransformDirection( normal, viewMatrix ) );',
  '  for ( int i = 0; i < ' + SOFT_N + '; i ++ ) {',
  '    vec4 pr = uSoftPos[ i ];',
  '    vec3 L = pr.xyz - vSoftW; float d = length( L );',
  '    float att = clamp( 1.0 - d / pr.w, 0.0, 1.0 ); att *= att;',
  '    if ( att <= 0.0 ) continue;',
  LSH_ON ? [
    // ombre de la lampe la plus proche : on compare la distance à la lampe avec celle du premier obstacle vu d'en haut
    '    if ( uLsP.z > 0.0 && abs( float( i ) - uLsP.w ) < 0.5 ) { vec4 lp = uLsM * vec4( vSoftW, 1.0 );',
    '      if ( lp.w > 0.4 ) { vec2 lc = lp.xy / lp.w; if ( lc.x > 0.01 && lc.x < 0.99 && lc.y > 0.01 && lc.y < 0.99 ) { float lit = 0.0, lim = lp.w - 0.07 - 0.012 * lp.w - 0.3 * ( 1.0 - abs( swN.y ) );',
    '        for ( int k = 0; k < 4; k ++ ) { vec2 o = vec2( k == 0 || k == 3 ? - 1.0 : 1.0, k < 2 ? - 1.0 : 1.0 ) * 0.0014; float zs = texture2D( uLsT, lc + o ).x; lit += step( lim, uLsP.x * uLsP.y / ( uLsP.y - zs * ( uLsP.y - uLsP.x ) ) ); }',
    '        float edge = smoothstep( 0.5, 0.42, max( abs( lc.x - 0.5 ), abs( lc.y - 0.5 ) ) ); att *= mix( 1.0, lit * 0.25, uLsP.z * edge ); } } }'].join('\n') : '',
  '    float nd = max( dot( swN, L / max( d, 0.001 ) ), 0.0 ) * 0.88 + 0.12;',
  '    reflectedLight.directDiffuse += diffuseColor.rgb * uSoftCol[ i ] * att * nd;',
  // reflet de la lampe sur les matières lisses ou mouillées
  '    float gl = 1.0 - material.roughness; if ( gl > 0.22 ) { vec3 Hs = normalize( normalize( ( viewMatrix * vec4( L, 0.0 ) ).xyz ) + geometry.viewDir ); float nh = max( dot( geometry.normal, Hs ), 0.0 );',
  '      reflectedLight.directSpecular += uSoftCol[ i ] * att * pow( nh, 10.0 + 320.0 * gl * gl * gl ) * gl * gl * ( 0.25 + 2.4 * gl ) * step( 0.0, dot( swN, L ) ); }',
  '  }',
  '}'
].join('\n');
function softPatch(shader, extra) {
  shader.uniforms.uSoftPos = SOFT.pos; shader.uniforms.uSoftCol = SOFT.col; shader.uniforms.uFogSun = FOGU.sun; shader.uniforms.uFogSunCol = FOGU.col;
  shader.uniforms.uWetK = WETU; if (LSH_ON) { shader.uniforms.uLsT = LSHU.tex; shader.uniforms.uLsM = LSHU.mat; shader.uniforms.uLsP = LSHU.par; }
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + SOFT_VERT_PARS).replace('#include <project_vertex>', '#include <project_vertex>\n' + SOFT_VERT);
  // la carte de relief porte aussi la brillance dans son canal alpha (matières de l'atelier)
  shader.fragmentShader = '#define SOFT_FOG\n' + shader.fragmentShader.replace('#include <common>', '#include <common>\n' + SOFT_FRAG_PARS).replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + SOFT_FRAG)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n#ifdef USE_NORMALMAP\n\troughnessFactor *= texture2D( normalMap, vUv ).a;\n#endif')
    // sols mouillés : les surfaces à plat deviennent luisantes (matières créées avec « wet »)
    .replace('#include <lights_physical_fragment>', '#ifdef SOFT_WET\n\troughnessFactor *= mix( 1.0, 0.36, uWetK * smoothstep( 0.75, 0.97, inverseTransformDirection( normal, viewMatrix ).y ) );\n#endif\n#include <lights_physical_fragment>');
  if (extra) extra(shader);
}
function std(o, extra) {
  const wet = o && o.wet; if (wet) { o = Object.assign({}, o); delete o.wet; }
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0, envMapIntensity: 0.7 }, o));
  if (wet) m.defines = Object.assign(m.defines || {}, { SOFT_WET: '' });
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
