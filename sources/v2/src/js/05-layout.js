/* =========================================================
   Plan du lotissement (mètres ; x vers l'est, z vers le sud)
   ========================================================= */
const MAP = { x0: -110, x1: 148, z0: -124, z1: 100 };
const BOUNDS = { x0: MAP.x0 + 0.8, x1: MAP.x1 - 0.8, z0: MAP.z0 + 0.8, z1: MAP.z1 - 0.8 };
const BULB = { x: 0, z: -86, r: 14 };
const MAIN = { x0: -6, x1: 6, z0: -74, z1: 92 };        // rue Las Palmas
const AVE = { z0: -6, z1: 6, x0: -92, x1: 74 };         // avenue Sunset
const PARK = { x0: 74, x1: 113, z0: -46, z1: 30 };      // parking du centre commercial
const MALL = { x0: 118, x1: 140, z0: -44, z1: 22 };
const SHOPS = [
  { id: 'bowling', z0: -44, z1: -14, x1: 140, h: 8, door: -29, col: '#c7b3ff', nom: 'BOWLING ÉTOILE' },
  { id: 'disques', z0: -12, z1: 4, x1: 136, h: 6.5, door: -4, col: '#ffc2dc', nom: 'DISQUAIRE' },
  { id: 'video', z0: 6, z1: 22, x1: 136, h: 6.5, door: 14, col: '#b9f1e2', nom: 'VIDÉO CLUB' }
];
const REFUGE = { x0: -106, x1: -96, z0: -6, z1: 6, h: 3.1 };
const PI = Math.PI;
const HOUSE_LOTS = [];
for (const z of [-60, -36, 36, 60]) { HOUSE_LOTS.push({ x: 16, z, rot: -PI / 2, front: 8 }); HOUSE_LOTS.push({ x: -16, z, rot: PI / 2, front: 8 }); }
for (const x of [-60, -36, 36, 60]) { HOUSE_LOTS.push({ x, z: 16, rot: PI, front: 8 }); HOUSE_LOTS.push({ x, z: -16, rot: 0, front: 8 }); }
for (const a of [PI, PI + 1.05, PI - 1.05]) {
  const r = 21, dx = Math.sin(a), dz = Math.cos(a);
  HOUSE_LOTS.push({ x: BULB.x + dx * r, z: BULB.z + dz * r, rot: Math.atan2(-dx, -dz), front: r - 16 });
}
HOUSE_LOTS.forEach((L, i) => { L.gs = (i % 3 === 1) ? -1 : 1; });
const POOLS_DEF = [
  { id: 'municipale', x0: -98, x1: -80, z0: 30, z1: 44, depth: 2.2, plongeoir: true },
  { id: 'canal-ne', x0: 28, x1: 32, z0: -68, z1: -30, depth: 1.5 },
  { id: 'se', x0: 32, x1: 44, z0: 30, z1: 38, depth: 1.8 },
  { id: 'canal-so', x0: -32, x1: -28, z0: 28, z1: 66, depth: 1.5 },
  { id: 'no', x0: -44, x1: -32, z0: -38, z1: -30, depth: 1.8 }
];
const CLOUDS_DEF = [
  { x: -88, z: -42, top: 12, r: 4.6 },
  { x: 40, z: -48, top: 22, r: 5.2 }
];
const TRAMPS_DEF = [
  { x: 17, z: -17, y: 0 }, { x: -17, z: 17, y: 0 }, { x: -88, z: -42, y: 0 }, { x: -80, z: -62, y: 0 },
  { x: -92, z: 60, y: 0 }, { x: 98, z: -40, y: 0.03 }, { x: 38.5, z: -50, y: 22 }
];
const PORTALS_DEF = [
  { x: 17, y: 0, z: 20, a: 0.6 },
  { x: -86.4, y: 12, z: -44.2, a: 0.4 },
  { x: 42.6, y: 22, z: -45.6, a: -0.5 },
  { x: 129, y: 8.4, z: -30, a: PI / 2 },
  { x: 2.5, y: 0.16, z: -86, a: PI / 2 },
  { x: -84, y: 0, z: 60, a: 2.2 }
];
const SHEEP_ZONES = [
  { x0: -103, x1: -75, z0: -70, z1: -16, n: 5 },
  { x0: -103, x1: -75, z0: 50, z1: 72, n: 3 },
  { x0: -24, x1: -10, z0: -24, z1: -10, n: 2 },
  { x0: 10, x1: 24, z0: 10, z1: 24, n: 2 },
  { x0: 10, x1: 24, z0: -24, z1: -10, n: 1 },
  { x0: -24, x1: -10, z0: 10, z1: 24, n: 1 }
];
const SPAWNS = [
  [0, 30], [0, -30], [0, -80], [30, 0], [-30, 0], [56, 0], [90, -10], [100, 18], [-88, -28], [-88, 62],
  [30, -50], [38, 34], [-30, 48], [-38, -34], [-89, 37], [-17, -17], [17, 17], [0, 80], [84, -40], [56, 34],
  [-56, -34], [56, -34], [-56, 34], [0, 50], [0, -55], [-70, 0]
];

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
  { id: 'lagon-est', nom: 'LAGON DES FLAMANTS', cx: 82, cz: 63, ax: 25, az: 15.5, depth: 3.4, rim: 0.36, k: [0.1, 0.6, 0.08, 2.1, 0.035, 4.0], tower: -2.35, beach: [[0.2, 0.9], [2.6, 3.3]], cascade: 1.2 },
  { id: 'lagon-nord', nom: 'LAGON DU NÉON', cx: 84, cz: -86, ax: 23, az: 17, depth: 3.6, rim: 0.36, k: [0.08, 2.4, 0.1, 0.4, 0.04, 1.3], tower: 2.2, beach: [[-1.0, -0.3], [3.6, 4.3]], cascade: -1.6 },
  { id: 'lagon-ouest', nom: 'LAGON DES PALMES', cx: -71, cz: -100, ax: 24, az: 13, depth: 3.2, rim: 0.36, k: [0.09, 1.2, 0.07, 3.0, 0.04, 0.5], tower: -0.9, beach: [[1.2, 2.0], [3.9, 4.6]], cascade: 2.6 },
  { id: 'lagon-couchant', nom: 'LAGON DU COUCHANT', cx: -60, cz: 84, ax: 19, az: 9.5, depth: 2.8, rim: 0.36, k: [0.12, 0.3, 0.06, 1.9, 0.03, 2.2], tower: null, beach: [[-2.1, -1.1]], cascade: 0.4 }
];
SPAWNS.push([54, 52], [108, 78], [62, -70], [106, -104], [-44, -96], [-96, -86], [-38, 76]);
const PALMS_DEF = [];
for (const z of [-70, -48, -24, 24, 48, 72, 88]) { PALMS_DEF.push([9.4, z]); PALMS_DEF.push([-9.4, z]); }
for (const x of [-86, -72, -48, -24, 24, 48, 70]) { PALMS_DEF.push([x, 9.4]); PALMS_DEF.push([x, -9.4]); }
PALMS_DEF.push([-100, -60], [-78, -30], [-100, -22], [-76, 66], [-104, 48], [-74, 22], [44, -60], [46, 40], [-50, 44], [-50, -44],
  [78, -44], [78, 28], [108, -44], [108, 28], [94, -6], [-100, 10], [-100, -10], [22, -78], [-22, -78], [30, 90], [-30, 90]);
const LAMPS_DEF = [];
[[-48, 1], [-24, -1], [24, 1], [48, -1], [72, 1], [88, -1], [-66, -1]].forEach(([z, s]) => LAMPS_DEF.push({ x: s * 7.4, z, side: -s }));
[[-80, 1], [-48, -1], [-24, 1], [24, -1], [48, 1], [66, -1]].forEach(([x, s]) => LAMPS_DEF.push({ x, z: s * 7.4, side: -s, alongX: true }));
const PARK_LAMPS = [[84, -30], [84, 14], [104, -30], [104, 14]];
