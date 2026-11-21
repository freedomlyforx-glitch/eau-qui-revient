/* =========================================================
   Plan du front de mer (mètres ; x vers l'est, z négatif = vers le large :
   le soleil se couche sur la mer, au bout de la jetée)
   ========================================================= */
const PI = Math.PI;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const MAP = { x0: -176, x1: 176, z0: -196, z1: 92 };
const BOUNDS = { x0: MAP.x0 + 0.8, x1: MAP.x1 - 0.8, z0: MAP.z0 + 0.8, z1: MAP.z1 - 0.8 };
const PROM = { x0: -66, x1: 150, z0: 0, z1: 14 };                 // la promenade, derrière la digue
const PIER = { x0: -7, x1: 7, z0: -118, z1: 0, ex0: -27, ex1: 27, ez0: -166, ez1: -118 }; // la jetée et sa plateforme
const ROAD = { x0: -80, x1: 86, z0: 34, z1: 42 };                  // avenue de l'Océan
const HILL = { cx: -130, cz: -16, rx: 42, rz: 36, h: 7 };          // promontoire de la villa
const RAMP = { x0: -104, x1: -66, z: 4, w: 4.5 };                  // rampe qui monte à la villa
const STAIRS = [-60, -24, 24, 60, 100, 136];                       // escaliers de la digue vers la plage
const REFUGE = { x0: -146, x1: -120, z0: -14, z1: 2, h: 3.4, y: HILL.h };
const RFB = HILL.h + 0.3;   // sol de la villa
const SHOPS = [];
const RESERVED = [];   // emprises des bâtiments et des attractions (pas de fleurs, repères du radar)
const HOUSE_LOTS = [-58, -32, 30, 56, 82].map((x, i) => ({ x, z: 52, rot: PI, front: 8, gs: i % 3 === 1 ? -1 : 1 }));
const POOLS_DEF = [{ id: 'villa', x0: -141, x1: -127, z0: -34, z1: -26, depth: 1.8, y: HILL.h }];
const CLOUDS_DEF = [{ x: -128, z: 52, top: 12, r: 4.6 }, { x: 46, z: -70, top: 15, r: 5 }];
const TRAMPS_DEF = [{ x: -116, z: 46, y: 0 }, { x: 44, z: 7, y: 0 }, { x: 4, z: -80, y: 0 }, { x: -128, z: 52, y: 12 }];
const PORTALS_DEF = [
  { x: 18, y: 0, z: 9, a: 0.6 }, { x: -112, y: HILL.h, z: -30, a: 0.9 }, { x: 0, y: 0, z: -160, a: 0 },
  { x: 120, y: 0, z: 26, a: PI / 2 }, { x: -128.8, y: 12, z: 49.6, a: 0.4 }, { x: 47, y: 15, z: -67.6, a: -0.5 }
];
const SHEEP_ZONES = [{ x0: -152, x1: -104, z0: 34, z1: 74, n: 6 }, { x0: 96, x1: 144, z0: 70, z1: 86, n: 3 }];
// le Revenant sort de la mer : il se reforme au bord de l'eau
const SPAWNS = [];
for (let x = -70; x <= 140; x += 21) SPAWNS.push([x, -38]);
SPAWNS.push([-40, 22], [40, 22], [100, 22], [0, 48], [-90, 40], [60, 70], [-20, 70], [120, 80]);

/* ---------- lagons : ellipses déformées, plus profondes au centre ---------- */
function blobF(b, th) { const k = b.k; return 1 + k[0] * Math.sin(2 * th + k[1]) + k[2] * Math.sin(3 * th + k[3]) + k[4] * Math.sin(5 * th + k[5]); }
function blobEdge(b, x, z) { const qx = (x - b.cx) / b.ax, qz = (z - b.cz) / b.az; return 1 - Math.hypot(qx, qz) / blobF(b, Math.atan2(qz, qx)); }
function blobPt(b, th, s, grow) {
  const f = blobF(b, th) * (s === undefined ? 1 : s);
  let x = Math.cos(th) * b.ax * f, z = Math.sin(th) * b.az * f;
  if (grow) { const l = Math.hypot(x, z) || 1; x += x / l * grow; z += z / l * grow; }
  return [b.cx + x, b.cz + z];
}
function blobPoly(b, n, grow) { const pts = []; for (let i = 0; i < n; i++) pts.push(blobPt(b, i / n * Math.PI * 2, 1, grow)); return pts; }
const LAGOONS_DEF = [
  { id: 'lagon-est', nom: 'AQUAPARC DES FLAMANTS', cx: 122, cz: 58, ax: 24, az: 14.5, depth: 3.4, rim: 0.36, k: [0.1, 0.6, 0.08, 2.1, 0.035, 4.0], tower: 1.0, beach: [[2.6, 3.4], [4.4, 5.2]], cascade: -0.5 }
];
const PALMS_DEF = [];
for (let x = -76; x <= 146; x += 13.5) { if (Math.abs(x) < 12) continue; PALMS_DEF.push([x, 12.6]); }
for (let x = -70; x <= 80; x += 18) { PALMS_DEF.push([x, 32.6]); PALMS_DEF.push([x + 9, 43.4]); }
PALMS_DEF.push([-52, -9], [-38, -14], [38, -8], [52, -16], [86, -10], [118, -14], [-138, 46], [-112, 60], [-150, 66], [104, 30], [146, 40], [96, 76], [140, 78], [-96, 22], [-90, 60]);
const LAMPS_DEF = [];
for (let x = -56; x <= 140; x += 28) { if (Math.abs(x) < 10) continue; LAMPS_DEF.push({ x, z: 1.5, side: 1, alongX: true }); }
for (let x = -62; x <= 74; x += 34) LAMPS_DEF.push({ x, z: 33.2, side: 1, alongX: true });
const PARK_LAMPS = [];
