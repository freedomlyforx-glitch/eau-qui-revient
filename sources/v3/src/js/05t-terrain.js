/* =========================================================
   Relief : la plage qui descend dans la mer, le promontoire de la villa,
   les collines. Une grille de hauteurs sert à la fois au décor et aux pas.
   ========================================================= */
const SEA = { sea: true, surf: -2.4, low: -2.4, range: 0.55, cx: 0, cz: -90, ripples: [], rippleI: 0, depth: 12, x0: -1e9, x1: 1e9, z0: -1e9, z1: 1e9 };
for (let i = 0; i < 6; i++) SEA.ripples.push(new THREE.Vector4(0, 0, -100, 0));
function terrainRaw(x, z) {
  let h = 0;
  if (z < 0) {
    const d = -z;
    const wall = 1.25 * smooth(PROM.x0 - 12, PROM.x0, x) * (1 - smooth(PROM.x1, PROM.x1 + 12, x));
    const dune = 0.11 * Math.sin(x * 0.21 + z * 0.13) * Math.sin(z * 0.17 - x * 0.05) * smooth(5, 14, d) * (1 - smooth(26, 40, d));
    const beach = -wall - (2.45 - wall) * smooth(0, 48, d) - 9.5 * smooth(38, 150, d) + dune + 0.22 * Math.sin(x * 0.045 + 1) * smooth(10, 40, d);
    h = beach;
    for (const sx of STAIRS) { const k = 1 - smooth(2.4, 3.0, Math.abs(x - sx)); if (k > 0 && d < 5) h = lerp(h, Math.min(0, lerp(0, terrainBeachAt(x, -5, wall), d / 5)), k); }
  } else if (z > 78) h = 16 * smooth(78, 150, z) + 2.2 * Math.sin(x * 0.05) * smooth(84, 120, z);
  // promontoire de la villa, pointe du phare : fondus dans le relief voisin (pas de falaise au ras de l'eau)
  const q = Math.hypot((x - HILL.cx) / HILL.rx, (z - HILL.cz) / HILL.rz);
  h = lerp(h, Math.max(h, HILL.h), 1 - smooth(0.62, 1.0, q));
  const q2 = Math.hypot((x + 147) / 17, (z + 62) / 30);
  h = lerp(h, Math.max(h, 4.4), 1 - smooth(0.45, 1.0, q2));
  // rampe d'accès : une chaussée en pente douce depuis la promenade
  if (x > RAMP.x0 - 4 && x < RAMP.x1 && Math.abs(z - RAMP.z) < RAMP.w + 2.5) { const rh = HILL.h * (1 - smooth(RAMP.x0, RAMP.x1, x)) * (1 - smooth(RAMP.w, RAMP.w + 2.5, Math.abs(z - RAMP.z))); if (rh > 0.001) h = Math.max(h, rh); }
  // rochers qui ferment la baie à l'est, talus à l'ouest
  const q3 = Math.hypot((x - 178) / 26, (z + 34) / 62);
  h = lerp(h, Math.max(h, 7), 1 - smooth(0.4, 1.0, q3));
  h = lerp(h, Math.max(h, 1.2), smooth(-166, -176, x));
  return h;
}
function terrainBeachAt(x, z, wall) { const d = -z; return -wall - (2.45 - wall) * smooth(0, 48, d); }
// grille : pas de 2 m, avec une rangée doublée au pied de la digue (marche franche)
const TG = { x0: -264, z0: -304, nx: 265, nzBase: 233, d: 2 };
TG.zs = []; for (let j = 0; j < TG.nzBase; j++) { const z = TG.z0 + j * TG.d; if (z === 0) TG.zs.push(-0.06); TG.zs.push(z); }
TG.nz = TG.zs.length; TG.jw = TG.zs.indexOf(-0.06);
TG.h = new Float32Array(TG.nx * TG.nz);
for (let j = 0; j < TG.nz; j++) for (let i = 0; i < TG.nx; i++) TG.h[j * TG.nx + i] = terrainRaw(TG.x0 + i * TG.d, TG.zs[j]);
function TH(x, z) {
  const fx = clamp((x - TG.x0) / TG.d, 0, TG.nx - 1.001), i = fx | 0, tx = fx - i;
  let j, tz;
  if (z < -TG.d) { const fz = Math.max(0, (z - TG.z0) / TG.d); j = fz | 0; tz = fz - j; }
  else if (z < -0.06) { j = TG.jw - 1; tz = (z + TG.d) / (TG.d - 0.06); }
  else if (z < 0) { j = TG.jw; tz = (z + 0.06) / 0.06; }
  else { const fz = Math.min(z / TG.d, TG.nz - TG.jw - 2.001); j = TG.jw + 1 + (fz | 0); tz = fz - (fz | 0); }
  const a = j * TG.nx + i, b = a + TG.nx, H = TG.h;
  return lerp(lerp(H[a], H[a + 1], tx), lerp(H[b], H[b + 1], tx), tz);
}
// pente trop raide pour être grimpée à pied (digue, falaises)
function tooSteep(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az); if (d < 1e-4) return false; return (TH(bx, bz) - TH(ax, az)) / d > 1.15; }
// la marée : l'eau revient à la tombée de la nuit
function inSea(x, z) { return z < 8 && TH(x, z) < SEA.surf - 0.02; }
// rayon contre le relief : marche le long du rayon puis affine
function rayTerrain(o, d, maxT) {
  let t0 = 0, y0 = o.y - TH(o.x, o.z); if (y0 < 0) return Infinity;
  const stepLen = 1.2, lim = Math.min(maxT, 500);
  for (let t = stepLen; t <= lim + stepLen; t += stepLen * (t > 60 ? 3 : 1)) {
    const x = o.x + d.x * t, z = o.z + d.z * t, y = o.y + d.y * t - TH(x, z);
    if (y < 0) { let a = t0, b = t; for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (o.y + d.y * m - TH(o.x + d.x * m, o.z + d.z * m) < 0) b = m; else a = m; } return b <= maxT ? b : Infinity; }
    t0 = t; if (d.y > 0 && o.y + d.y * t > 20) return Infinity;
  }
  return Infinity;
}
function terrainNormal(x, z, out) { const e = 0.6; out.set(TH(x - e, z) - TH(x + e, z), 2 * e, TH(x, z - e) - TH(x, z + e)).normalize(); return out; }
