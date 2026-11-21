/* =========================================================
   Petits jeux du front de mer : tickets, records, baraques,
   jeux de la promenade, pêche, coquillages, photo, sieste
   ========================================================= */
const ACT = { list: [], cur: null, near: null, hint: '', tickets: +store('tickets') || 0, best: storeJSON('records', {}), fade: 0, sleep: 0, slept: true, t: 0, bj: 0, bv: 0, hs: '', ht: '', day: 0, lastT: 0 };
const PHOTO = { on: false, snap: false };
const rec = (id) => (ACT.best[id] ? ' · record ' + ACT.best[id] : '');
const near2 = (a, r) => { const dx = P.pos.x - a.x, dz = P.pos.z - a.z; return dx * dx + dz * dz < r * r; };

function drawTickets(pulse) { const el = $('nbTickets'); if (!el) return; el.textContent = ACT.tickets; if (pulse) { const b = $('tickets'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); } }
function addTickets(n) { if (!n) return; ACT.tickets = Math.max(0, ACT.tickets + n); store('tickets', String(ACT.tickets)); drawTickets(true); drawBoard(); }
function sayPhrase(txt, hold) { PHR.text = txt; PHR.n = 0; PHR.acc = 0; PHR.hold = hold || 4.5; PHR.on = true; $('phrase').classList.add('montre'); }
function jeuDraw(score, time) {
  const s = String(score), t = time === null ? '' : Math.max(0, Math.ceil(time)) + ' s';
  if (ACT.hs !== s) { ACT.hs = s; $('miniScore').textContent = s; }
  if (ACT.ht !== t) { ACT.ht = t; $('miniTemps').textContent = t; }
}
function startAct(a, dur) {
  if (ACT.cur) finishAct(ACT.cur, true);
  ACT.cur = a; a.t = dur; a.score = 0; ACT.hs = ACT.ht = '';
  $('miniNom').textContent = a.nom; $('miniAide').textContent = a.aide ? (typeof a.aide === 'function' ? a.aide() : a.aide) : ''; $('mini').hidden = false; jeuDraw(0, dur || null); sJukeOpen();
}
function finishAct(a, quiet) {
  if (ACT.cur === a) ACT.cur = null; $('mini').hidden = true;
  const s = a.score | 0, tk = a.gain ? a.gain(s) : s, isRec = s > (ACT.best[a.id] || 0);
  if (isRec) { ACT.best[a.id] = s; store('records', ACT.best); }
  addTickets(tk);
  if (a.stop) a.stop();
  if (quiet && !s) return;
  toast(a.nom + ' : ' + s + ' ' + (a.unit || 'points') + (isRec ? ' · nouveau record !' : '') + (tk ? ' · +' + tk + ' tickets' : ''));
  if (isRec && s > 0) { spawnConfetti(P.pos.x, P.pos.y + 2.2, P.pos.z, 40, 0.8); sConfetti(P.pos.x, P.pos.y + 2, P.pos.z); if (NET.on) NET.send('score', { jeu: a.nom, s }); }
}

/* ---------- le tableau des records du guichet ---------- */
const BOARD = { c: null, g: null, t: null };
function drawBoard() {
  if (!BOARD.g) return; const g = BOARD.g;
  g.fillStyle = '#1d1436'; g.fillRect(0, 0, 512, 288); g.strokeStyle = '#ff8fcf'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 272);
  g.textAlign = 'center'; g.fillStyle = '#ffd27a'; g.font = '34px VT323, monospace'; g.fillText('TES RECORDS', 256, 46);
  g.font = '27px VT323, monospace'; g.textAlign = 'left';
  ACT.list.filter((a) => a.unit).forEach((a, i) => { const y = 84 + i * 31; g.fillStyle = '#a3f3dc'; g.fillText(a.nom, 34, y); g.textAlign = 'right'; g.fillStyle = '#fff5fa'; g.fillText(String(ACT.best[a.id] || '—'), 478, y); g.textAlign = 'left'; });
  g.fillStyle = '#ff8fcf'; g.textAlign = 'center'; g.fillText('TICKETS : ' + ACT.tickets, 256, 268);
  BOARD.t.needsUpdate = true;
}
(function buildBoard() {
  const [c, g] = makeCanvas(512, 288); BOARD.c = c; BOARD.g = g; BOARD.t = tex(c, { srgb: true });
  const b = FRONT.board, m = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.85), new THREE.MeshBasicMaterial({ map: BOARD.t, color: HDR('#ffffff', 1.15) }));
  m.position.set(b.x - 0.02, b.y, b.z); m.rotation.y = -PI / 2; world.add(m);
})();

/* ---------- cibles : canards et boîtes ---------- */
const DUCKS = [], CANS = [], DSPAN = 4.6, CAN = { last: -99 };
function raySph(o, d, cx, cy, cz, r) { const ox = cx - o.x, oy = cy - o.y, oz = cz - o.z, b = ox * d.x + oy * d.y + oz * d.z; if (b < 0) return Infinity; const q = ox * ox + oy * oy + oz * oz - b * b; return q > r * r ? Infinity : b - Math.sqrt(r * r - q); }
function rayActs(o, d, best, res) {
  if (o.z > 6 || o.z < -84 || Math.abs(o.x) > 16) return best;
  for (const k of DUCKS) { if (k.down > 0) continue; const p = k.m.position, t = raySph(o, d, p.x, p.y + 0.05, p.z, 0.25); if (t < best) { best = t; res.t = t; res.kind = 'cible'; res.cible = k; res.n.copy(d).negate(); } }
  for (const k of CANS) { if (k.st) continue; const p = k.m.position, t = raySph(o, d, p.x, p.y, p.z, 0.14); if (t < best) { best = t; res.t = t; res.kind = 'cible'; res.cible = k; res.n.copy(d).negate(); } }
  return best;
}
function hitCible(k, d) {
  if (k.duck) { k.down = 1.7; sTink(k.m.position); if (ACT.cur === G_DUCKS) { G_DUCKS.score += k.gold ? 3 : 1; spawnSpark(k.m.position.x, k.m.position.y, k.m.position.z, rnd(-1, 1), 2, rnd(-1, 1), 0.3); } }
  else knockCan(k, d, 1);
}
function knockCan(k, d, f) {
  if (k.st) return; k.st = 1; CAN.last = ACT.t;
  k.v.set(d.x * 3.2 * f + rnd(-0.5, 0.5), 1.8 + rnd(0, 1.4) * f, d.z * 3.2 * f + rnd(-0.8, 0.8)); k.w.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9));
  sClang(k.m.position); if (ACT.cur === G_CANS) G_CANS.score++;
  for (const c of CANS) if (!c.st && c.p === k.p && c.row === k.row + 1 && (c.j === k.j || c.j === k.j - 1)) knockCan(c, d, 0.35);
}
function restackCans() { for (const k of CANS) { k.st = 0; k.m.position.copy(k.home); k.m.rotation.set(0, 0, 0); } }

const G_DUCKS = { id: 'canards', nom: 'TIR AUX CANARDS', unit: 'points', aide: 'tire sur les canards · le rose vaut 3', r: 3.2,
  hint() { return 'jouer au tir aux canards' + rec(this.id); }, gain: (s) => Math.floor(s / 2),
  start() { startAct(this, 30); }, tick(dt) { this.t -= dt; jeuDraw(this.score, this.t); if (this.t <= 0) finishAct(this); } };
const G_CANS = { id: 'boites', nom: 'CHAMBOULE-TOUT', unit: 'boîtes', aide: 'fais tomber toutes les boîtes', r: 3.2,
  hint() { return 'jouer au chamboule-tout' + rec(this.id); }, gain: (s) => Math.floor(s / 2),
  start() { restackCans(); startAct(this, 22); },
  tick(dt) { this.t -= dt; jeuDraw(this.score, this.t); if (CANS.every((k) => k.st) && ACT.t - CAN.last > 0.7) { restackCans(); this.score += 3; sRebuild(this.x - 2, 1.5, this.z); } if (this.t <= 0) finishAct(this); } };
(function buildTargets() {
  const s = FRONT.stands.canards;
  const mk = (body, beak) => { const gs = [vc(new THREE.SphereGeometry(1, 12, 9), M4(0, 0, 0, 0, 0, 0, 0.15, 0.13, 0.2), body), vc(new THREE.SphereGeometry(0.095, 10, 8), M4(0, 0.17, 0.11), body), vc(new THREE.ConeGeometry(0.04, 0.1, 8).rotateX(PI / 2), M4(0, 0.16, 0.24), beak), vc(new THREE.ConeGeometry(0.06, 0.12, 6).rotateX(-PI / 2 - 0.5), M4(0, 0.06, -0.2), body), vc(new THREE.SphereGeometry(0.018, 6, 5), M4(0.07, 0.2, 0.17), '#2e1f4a'), vc(new THREE.SphereGeometry(0.018, 6, 5), M4(-0.07, 0.2, 0.17), '#2e1f4a')]; const g = mergeGeos(gs); gs.forEach((q) => q.dispose()); return g; };
  const g1 = mk('#ffe06a', '#ff9a4a'), g2 = mk('#ff8fcf', '#ffe06a');
  [{ x: s.xb + 0.75, y: DECK + 1.82, dir: 1, sp: 1.15 }, { x: s.xb + 1.5, y: DECK + 1.4, dir: -1, sp: 1.7 }].forEach((r, ri) => {
    for (let i = 0; i < 5; i++) { const gold = i === 2, m = new THREE.Mesh(gold ? g2 : g1, VCMAT); m.position.set(r.x, r.y, s.z); m.rotation.y = r.dir > 0 ? 0 : PI; m.castShadow = true; world.add(m); DUCKS.push({ duck: true, m, dir: r.dir, sp: r.sp, u: i * DSPAN / 5, down: 0, gold, y: r.y }); }
    B.add(boxG(0.05, 0.3, 4.95), colorMat(ri ? '#7fd8e6' : '#a9c8f4'), M4(r.x + 0.2, r.y - 0.27, s.z)); B.add(boxG(0.06, 0.06, 4.95), MAT.white, M4(r.x + 0.2, r.y - 0.1, s.z));
    B.add(boxG(0.3, r.y - DECK - 0.35, 4.95), colorMat('#fff7ef'), M4(r.x + 0.05, DECK + (r.y - DECK - 0.35) / 2, s.z));
  });
  Object.assign(G_DUCKS, { x: s.ux, z: s.z }); ACT.list.push(G_DUCKS);
  // boîtes de conserve
  const c = FRONT.stands.boites, YS = DECK + 1.32, CG = cylG(0.085, 0.085, 0.2, 12), cols = ['#ff8fcf', '#7ff0ff', '#ffe06a'];
  B.add(boxG(0.5, 0.07, 4.7), MAT.white, M4(c.xb + 0.8, YS - 0.035, c.z), true, true); B.add(boxG(0.4, YS - DECK - 0.07, 4.5), colorMat('#ffc6a0'), M4(c.xb + 0.8, DECK + (YS - DECK - 0.07) / 2, c.z), true, true);
  for (const p of [-1.15, 1.15]) for (let row = 0; row < 3; row++) for (let j = 0; j < 3 - row; j++) {
    const m = new THREE.Mesh(CG, colorMat(cols[(row + j) % 3], { roughness: 0.3, metalness: 0.55 })); m.castShadow = true;
    const home = new V3(c.xb + 0.8, YS + 0.1 + row * 0.2, c.z + p + (j - (2 - row) / 2) * 0.19); m.position.copy(home); world.add(m);
    CANS.push({ m, home, p, row, j, st: 0, v: new V3(), w: new V3() });
  }
  CAN.x0 = c.xb + 0.25; CAN.z0 = c.z - 2.4; CAN.z1 = c.z + 2.4;
  Object.assign(G_CANS, { x: c.ux, z: c.z }); ACT.list.push(G_CANS);
})();
function updateTargets(dt) {
  const s = FRONT.stands.canards;
  for (const k of DUCKS) {
    k.u = (k.u + dt * k.sp) % DSPAN; k.m.position.z = s.z - DSPAN / 2 + (k.dir > 0 ? k.u : DSPAN - k.u);
    if (k.down > 0) k.down -= dt;
    const f = k.down > 0 ? Math.min(1, (1.7 - k.down) * 9, k.down * 5) : 0;
    k.m.rotation.z = k.dir * f * 1.5; k.m.position.y = k.y - f * 0.12 + Math.sin(k.u * 5) * 0.015;
  }
  let any = false;
  for (const k of CANS) {
    if (k.st) any = true; if (k.st !== 1) continue;
    k.v.y -= 12 * dt; k.m.position.addScaledVector(k.v, dt); k.m.rotation.x += k.w.x * dt; k.m.rotation.y += k.w.y * dt; k.m.rotation.z += k.w.z * dt;
    const p = k.m.position;
    if (p.x < CAN.x0) { p.x = CAN.x0; k.v.x = Math.abs(k.v.x) * 0.45; }
    if (p.z < CAN.z0) { p.z = CAN.z0; k.v.z = Math.abs(k.v.z) * 0.5; } if (p.z > CAN.z1) { p.z = CAN.z1; k.v.z = -Math.abs(k.v.z) * 0.5; }
    if (p.y < DECK + 0.09) { p.y = DECK + 0.09; if (Math.abs(k.v.y) > 1.5) { k.v.y = -k.v.y * 0.35; k.v.x *= 0.6; k.v.z *= 0.6; sTink(p); } else { k.st = 2; k.m.rotation.set(PI / 2, 0, k.m.rotation.z); } }
  }
  if (any && ACT.cur !== G_CANS && ACT.t - CAN.last > 5) restackCans();
}

/* ---------- les paniers ---------- */
const HOOP = { g: null, off: 0, balls: [], cd: 0, x: 0, y: 0, z: 0 };
const G_HOOP = { id: 'paniers', nom: 'LES PANIERS', unit: 'points', aide: () => (DEVICE === 'mobile' ? 'ACTION' : 'E') + ' : lancer le ballon · vise un peu au-dessus', r: 3.2,
  hint() { return 'jouer aux paniers' + rec(this.id); }, gain: (s) => Math.floor(s / 2), useHint: 'lancer le ballon',
  start() { startAct(this, 35); HOOP.off = 0; },
  use() {
    if (HOOP.cd > 0) return; HOOP.cd = 0.42;
    const b = HOOP.balls.find((q) => !q.on) || HOOP.balls[0]; camera.getWorldDirection(_rv);
    b.on = true; b.life = 3; b.done = false; b.m.visible = true; b.m.position.copy(camera.position).addScaledVector(_rv, 0.5); b.m.position.y -= 0.12;
    b.v.copy(_rv).multiplyScalar(8.5); b.v.y += 2; sClick(500, 0.3);
  },
  tick(dt) { this.t -= dt; jeuDraw(this.score, this.t); if (this.t <= 0) finishAct(this); } };
(function buildHoop() {
  const s = FRONT.stands.paniers, g = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(boxG(0.08, 1.0, 1.4), colorMat('#fff7ef'), 0, 0, 0); add(boxG(0.09, 0.45, 0.06), colorMat('#ff8fcf'), 0.01, -0.2, 0.28); add(boxG(0.09, 0.45, 0.06), colorMat('#ff8fcf'), 0.01, -0.2, -0.28); add(boxG(0.09, 0.06, 0.62), colorMat('#ff8fcf'), 0.01, 0.02, 0);
  add(new THREE.TorusGeometry(0.27, 0.025, 6, 22).rotateX(PI / 2), colorMat('#ff9a4a', { roughness: 0.4 }), 0.4, -0.38, 0);
  add(cylG(0.27, 0.16, 0.36, 12, true), std({ color: C('#ffffff'), transparent: true, opacity: 0.5, side: THREE.DoubleSide, roughness: 1, depthWrite: false }), 0.4, -0.57, 0).castShadow = false;
  g.position.set(s.xb + 0.3, DECK + 2.62, s.z); world.add(g); HOOP.g = g; HOOP.x = s.xb + 0.7; HOOP.y = DECK + 2.24; HOOP.z = s.z; HOOP.wall = s.xb + 0.2;
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), colorMat(['#ffb07a', '#ff8fcf', '#7ff0ff', '#ffe06a'][i], { roughness: 0.55 })); m.visible = false; m.castShadow = true; world.add(m); HOOP.balls.push({ m, v: new V3(), on: false, life: 0, done: false }); }
  for (let i = 0; i < 3; i++) B.add(new THREE.SphereGeometry(0.15, 12, 9), colorMat(['#ffb07a', '#ff8fcf', '#7ff0ff'][i], { roughness: 0.55 }), M4(s.x, DECK + 1.21, s.z - 1.6 + i * 0.36));
  Object.assign(G_HOOP, { x: s.ux, z: s.z }); ACT.list.push(G_HOOP);
})();
function updateHoop(dt) {
  HOOP.cd -= dt;
  const moving = ACT.cur === G_HOOP && G_HOOP.score >= 6;
  HOOP.off = moving ? Math.sin(ACT.t * 1.4) * 1.3 : damp(HOOP.off, 0, 4, dt);
  HOOP.g.position.z = HOOP.z + HOOP.off; const rz = HOOP.z + HOOP.off;
  for (const b of HOOP.balls) {
    if (!b.on) continue; const p = b.m.position, y0 = p.y;
    b.v.y -= 11 * dt; p.addScaledVector(b.v, dt); b.m.rotation.x += dt * 6; b.life -= dt;
    const dr = Math.hypot(p.x - HOOP.x, p.z - rz);
    if (!b.done && b.v.y < 0 && y0 > HOOP.y && p.y <= HOOP.y) {
      if (dr < 0.22) { b.done = true; if (ACT.cur === G_HOOP) G_HOOP.score += moving ? 3 : 2; sPing(); spawnConfetti(HOOP.x, HOOP.y, rz, 10, 0.4); b.v.x *= 0.2; b.v.z *= 0.2; }
      else if (dr < 0.42) { b.v.y = Math.abs(b.v.y) * 0.45; const k = 1.6 / Math.max(0.05, dr); b.v.x += (p.x - HOOP.x) * k; b.v.z += (p.z - rz) * k; p.y = HOOP.y + 0.01; sTink(p); }
    }
    if (p.x < HOOP.wall + 0.15) { p.x = HOOP.wall + 0.15; b.v.x = Math.abs(b.v.x) * 0.5; }
    if (p.y < DECK + 0.15) { p.y = DECK + 0.15; b.v.y = Math.abs(b.v.y) * 0.5; b.v.x *= 0.7; b.v.z *= 0.7; if (b.v.y > 1) sBoop(p.x, p.y, p.z, 0.3); }
    if (b.life <= 0) { b.on = false; b.m.visible = false; }
  }
}

/* ---------- Madame Marée, les glaces, la barbe à papa, le guichet ---------- */
const FORTUNES = [
  ['La marée te rend léger : tes sauts toucheront les nuages un moment.', 'saut'],
  ['Tes jambes se souviennent d’un rêve où tu courais plus vite que la nuit.', 'course'],
  ['Je vois… trois tickets tombés d’une poche qui n’est pas la tienne.', 'tickets'],
  ['Quelqu’un a laissé la lumière allumée pour toi, quelque part sous la surface.'],
  ['L’eau revient toujours. Toi aussi.'],
  ['Tu trouveras ce que tu cherches au bout de la jetée, ou juste après.'],
  ['Méfie-toi des piscines qui n’ont pas d’échelle.'],
  ['Un mouton te veut du bien. Les autres, c’est moins sûr.'],
  ['La cassette que tu as perdue joue encore, dans une maison qui te ressemble.'],
  ['Ce soir, le ciel fondra un peu. Garde un parapluie rose.'],
  ['Tu as déjà vécu cet été. Il était bien, non ?'],
  ['Le Revenant n’est que de l’eau qui se souvient d’avoir eu peur.'],
  ['Descends d’un niveau si tu veux, mais n’oublie pas de remonter.'],
  ['Les flamants savent. Demande-leur gentiment.'],
  ['Ton reflet a pris un jour de congé. Il rentre demain.'],
  ['Il y a une porte dans le lagon. Elle ne s’ouvre que si on ne la cherche pas.'],
  ['Joue Frère Jacques sur le grand piano : quelqu’un t’écoutera.'],
  ['Les coquillages reviennent chaque matin. Compte-les, il y en a douze.'],
];
const GLACES = ['Pistache et fraise : ça va tout de suite mieux.', 'Une boule "ciel qui fond", un peu salée.', 'Vanille-néon. Elle brille dans le noir.', 'Menthe à l’eau de piscine. Étonnamment bon.'];
(function buildKiosks() {
  const S = FRONT.stands; let cd = 0;
  ACT.list.push({ id: 'voyante', nom: 'MADAME MARÉE', x: S.voyante.ux, z: S.voyante.z, r: 2.8,
    hint() { return ACT.tickets ? 'glisser un ticket à Madame Marée' : 'écouter Madame Marée'; },
    start() { if (ACT.t - cd < 4) return; cd = ACT.t; if (ACT.tickets) addTickets(-1);
      const f = FORTUNES[(Math.random() * FORTUNES.length) | 0]; sayPhrase(f[0], 5.5); FRONT.glow = 1; sPortal();
      if (f[1] === 'saut') ACT.bj = 45; else if (f[1] === 'course') ACT.bv = 45; else if (f[1] === 'tickets') addTickets(3); } });
  ACT.list.push({ id: 'glaces', nom: 'GLACES', x: S.glaces.ux, z: S.glaces.z, r: 2.8, hint: () => 'prendre une glace',
    start() { if (ACT.t - cd < 2) return; cd = ACT.t; P.hp = 100; updateVie(); toast(GLACES[(Math.random() * GLACES.length) | 0]); sPing(); } });
  ACT.list.push({ id: 'barbe', nom: 'BARBE À PAPA', x: S.barbe.ux, z: S.barbe.z, r: 2.8, hint: () => 'prendre une barbe à papa',
    start() { if (ACT.t - cd < 2) return; cd = ACT.t; ACT.bj = 40; toast('Barbe à papa : tu te sens léger comme un nuage'); sBoing(5); } });
  ACT.list.push({ id: 'guichet', nom: 'GUICHET', x: S.guichet.ux, z: S.guichet.z, r: 2.8, hint: () => (!JET.has && !JET.pick && ACT.tickets >= 25 ? 'échanger 25 tickets contre le jetpack' : 'tu as ' + ACT.tickets + ' ticket' + (ACT.tickets > 1 ? 's' : '') + (JET.has ? ' · les records sont au tableau' : ' · le jetpack en coûte 25')),
    start() { if (!JET.has && !JET.pick && ACT.tickets >= 25) { addTickets(-25); spawnJetpack(P.pos.x, P.pos.z); equipJetpack(); toast(DEVICE === 'mobile' ? 'Le jetpack est à toi : maintiens SAUT pour voler' : 'Le jetpack est à toi : maintiens Espace pour voler'); } else { drawBoard(); sPing(); } } });
})();

/* ---------- jeux de la promenade : dalles lumineuses ---------- */
function pad(geo, x, z, hex, y) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C(hex).multiplyScalar(0.3), polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 })); m.position.set(x, y || 0.045, z); m.userData.c = C(hex); m.userData.k = 0; world.add(m); return m; }
function padLit(m, k) { m.userData.k = k; }
function padFade(m, dt) { const u = m.userData; u.k = Math.max(0, u.k - dt * 2.6); m.material.color.copy(u.c).multiplyScalar(0.3 + u.k * 1.9); }
function totem(x, z, text, col) {
  B.add(boxG(0.16, 2.5, 0.16), MAT.white, M4(x, 1.25, z), true, true); B.add(boxG(2.7, 0.62, 0.1), colorMat('#2e1f4a'), M4(x, 2.8, z), true, true); addCircle(x, z, 0.14, 0, 2.5);
  kitSign(text, col, x, 2.8, z + 0.07, 0, 2.5, 0.5, 2.6); kitSign(text, col, x, 2.8, z - 0.07, PI, 2.5, 0.5, 2.6);
}
function fleche(x, z, nom) {
  B.add(boxG(0.16, 2.5, 0.16), MAT.white, M4(x, 1.25, z), true, true); B.add(boxG(4.0, 0.62, 0.1), colorMat('#2e1f4a'), M4(x, 2.8, z), true, true); addCircle(x, z, 0.14, 0, 2.5);
  kitSign('← ' + nom, '#a3f3dc', x, 2.8, z + 0.07, 0, 3.8, 0.5, 2.6); kitSign(nom + ' →', '#a3f3dc', x, 2.8, z - 0.07, PI, 3.8, 0.5, 2.6);
}
function base(x, z, w, d) { const m = new THREE.Mesh(flatG(w, d), new THREE.MeshBasicMaterial({ color: C('#241a3e'), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.position.set(x, 0.035, z); world.add(m); }

const SIMON = { id: 'simon', nom: 'PISTE SIMON', unit: 'manches', aide: 'regarde la suite, puis marche sur les dalles dans le même ordre', x: -30, z: 8, r: 4.6, tiles: [], seq: [], st: '', k: 0, w: 0, last: -1, air: false,
  notes: [60, 64, 67, 72], gain: (s) => s * 2,
  hint() { return 'jouer à la piste Simon' + rec(this.id); },
  start() { startAct(this, 0); this.seq = [(Math.random() * 4) | 0]; this.st = 'montre'; this.k = 0; this.w = 1.0; },
  at() { if (P.pos.y > 0.3) return -1; for (let i = 0; i < 4; i++) { const t = this.tiles[i]; if (Math.abs(P.pos.x - t.position.x) < 0.95 && Math.abs(P.pos.z - t.position.z) < 0.95) return i; } return -1; },
  beep(i) { padLit(this.tiles[i], 1); if (AU.on) tone(AU.fx, now(), 'triangle', midi(this.notes[i]), midi(this.notes[i]), 0.4, 0.2, 0.005); },
  tick(dt) {
    jeuDraw(this.seq.length, null); this.w -= dt;
    const cur = this.at();
    if (this.st === 'montre') {
      if (this.w <= 0) { if (this.k < this.seq.length) { this.beep(this.seq[this.k++]); this.w = Math.max(0.3, 0.62 - this.seq.length * 0.025); } else { this.st = 'joue'; this.k = 0; this.w = 7; this.last = cur; } }
    } else if (this.st === 'joue') {
      if (cur !== this.last) { this.last = cur; if (cur >= 0) {
        this.beep(cur);
        if (cur === this.seq[this.k]) { this.k++; this.w = 7; if (this.k === this.seq.length) { this.score = this.seq.length; this.seq.push((Math.random() * 4) | 0); this.st = 'montre'; this.k = 0; this.w = 1.1; sPing(); } }
        else { sZap(P.pos); finishAct(this); return; }
      } }
      if (this.w <= 0) { sZap(P.pos); finishAct(this); }
    }
  } };
const FLAQ = { id: 'flaques', nom: 'TAPE-FLAQUE', unit: 'flaques', aide: 'saute dans la flaque qui s’allume', x: 70, z: 8, r: 5, pads: [], cur: -1, w: 0, gain: (s) => s,
  hint() { return 'jouer à tape-flaque' + rec(this.id); },
  start() { startAct(this, 30); this.cur = -1; this.w = 0; },
  tick(dt) {
    this.t -= dt; this.w -= dt; jeuDraw(this.score, this.t);
    if (this.w <= 0) { let n; do n = (Math.random() * 9) | 0; while (n === this.cur); this.cur = n; this.w = Math.max(1.0, 2.3 - this.score * 0.07); }
    const p = this.pads[this.cur]; padLit(p, 1);
    if (P.pos.y < 0.3 && Math.hypot(P.pos.x - p.position.x, P.pos.z - p.position.z) < 0.9) {
      this.score++; this.w = 0; padLit(p, 0.4); sSplash(0.9, rnd(0.8, 1.3), P.pos); spawnRing(p.position.x, 0.06, p.position.z, 0.2, 1.5, 0.6, HDR('#bff8ff', 1.4));
      for (let i = 0; i < 14; i++) { const a = rnd(0, PI * 2), s = rnd(1, 3); spawnDrop(p.position.x, 0.1, p.position.z, Math.cos(a) * s, rnd(2, 4.5), Math.sin(a) * s, rnd(0.04, 0.08), 0.8); }
    }
    if (this.t <= 0) finishAct(this);
  } };
const PIANO = { keys: [], last: -1, hist: [], done: false, x0: 26.2, z0: 8.1, notes: [60, 62, 64, 65, 67, 69, 71, 72] };
(function buildPads() {
  const cols = ['#ff8fcf', '#7ff0ff', '#ffd27a', '#a3f3dc'];
  base(-30, 8, 4.8, 4.8);
  [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]].forEach(([dx, dz], i) => SIMON.tiles.push(pad(flatG(2.0, 2.0), -30 + dx, 8 + dz, cols[i])));
  totem(-30, 11.6, 'PISTE SIMON', '#ff8fcf'); ACT.list.push(SIMON);
  base(70, 8, 6.6, 6.6);
  for (let i = 0; i < 9; i++) FLAQ.pads.push(pad(new THREE.CircleGeometry(0.82, 24).rotateX(-PI / 2), 70 + (i % 3 - 1) * 2.1, 8 + (Math.floor(i / 3) - 1) * 2.1, '#7ff0ff'));
  totem(70, 12.4, 'TAPE-FLAQUE', '#7ff0ff'); ACT.list.push(FLAQ);
  base(30, 9.5, 8.0, 3.2);
  for (let i = 0; i < 8; i++) { const m = pad(flatG(0.88, 2.8), PIANO.x0 + 0.475 + i * 0.95, 9.5, PASTELS[i]); m.userData.c = C('#fff5fa'); m.userData.tint = C(PASTELS[i]); PIANO.keys.push(m); }
  totem(30, 12.2, 'PIANO GÉANT', '#ffd27a');
  fleche(-18.5, 12.7, 'VILLA-REFUGE'); fleche(-63, 9.8, 'VILLA-REFUGE');
})();
function updatePads(dt) {
  for (const m of SIMON.tiles) padFade(m, dt);
  for (const m of FLAQ.pads) padFade(m, dt);
  let k = -1;
  if (P.pos.y < 0.3 && P.pos.z > PIANO.z0 && P.pos.z < PIANO.z0 + 2.8) { const i = Math.floor((P.pos.x - PIANO.x0) / 0.95); if (i >= 0 && i < 8) k = i; }
  if (k !== PIANO.last) { PIANO.last = k; if (k >= 0) {
    PIANO.keys[k].userData.k = 1; if (AU.on) { const f = midi(PIANO.notes[k]), t = now(); tone(AU.fx, t, 'triangle', f, f, 0.55, 0.2, 0.004); tone(AU.fx, t, 'sine', f * 2, f * 2, 0.3, 0.06, 0.004); }
    PIANO.hist.push(k); if (PIANO.hist.length > 8) PIANO.hist.shift();
    if (!PIANO.done && PIANO.hist.join('') === '01200120') { PIANO.done = true; addTickets(8); toast('Frère Jacques ! Le piano te remercie : +8 tickets'); spawnConfetti(30, 2.5, 9.5, 70, 1); sConfetti(30, 2, 9.5); }
  } }
  for (const m of PIANO.keys) { const u = m.userData; u.k = Math.max(0, u.k - dt * 2.2); m.material.color.copy(u.c).multiplyScalar(0.5).lerp(u.tint, u.k).multiplyScalar(1 + u.k * 1.2); }
}

/* ---------- la pêche au bout de la jetée ---------- */
const CATCH = [['une sardine pastel', 1, 30], ['un poisson-lune qui bâille', 2, 18], ['une étoile de mer rose', 2, 16], ['un canard en plastique égaré', 2, 12], ['une botte… avec un crabe dedans', 1, 12], ['une vieille cassette pleine d’algues', 3, 10], ['un coquillage qui chante', 4, 7], ['une méduse néon (elle te sourit)', 5, 5], ['un morceau de rêve encore tiède', 8, 3], ['la clé d’une piscine qui n’existe pas', 10, 2]];
const FISH = { id: 'peche', nom: 'PÊCHE À LA LIGNE', x: 25.3, z: -140, r: 2.6, st: '', w: 0, bob: null, line: null, bx: 0, bz: 0,
  hint() { return 'lancer la ligne' + (ACT.best.carnet ? ' · carnet ' + bits(ACT.best.carnet) + '/' + CATCH.length : ''); },
  get useHint() { return this.st === 'touche' ? 'ferrer !' : 'remonter la ligne'; },
  start() { ACT.cur = this; this.st = 'attente'; this.w = rnd(2.5, 7.5); this.bx = 27 + rnd(5, 9); this.bz = this.z + rnd(-3.5, 3.5); this.bob.visible = this.line.visible = true; sSplash(0.5, 0.8, { x: this.bx, y: SEA.surf, z: this.bz }); spawnRipple(SEA, this.bx, this.bz, 0.5); toast('La ligne est à l’eau… attends que ça morde'); },
  end(msg) { ACT.cur = null; this.st = ''; this.bob.visible = this.line.visible = false; if (msg) toast(msg); },
  use() {
    if (this.st !== 'touche') return this.end(this.st === 'attente' ? 'Trop tôt : le poisson s’est enfui' : '');
    const night = NIGHT.value > 0.5; let tot = 0; for (const c of CATCH) tot += c[1] >= 4 && night ? c[2] * 2.5 : c[2];
    let r = Math.random() * tot, i = 0; for (; i < CATCH.length - 1; i++) { r -= CATCH[i][1] >= 4 && night ? CATCH[i][2] * 2.5 : CATCH[i][2]; if (r <= 0) break; }
    const c = CATCH[i], neu = !((ACT.best.carnet | 0) & (1 << i)); ACT.best.carnet = (ACT.best.carnet | 0) | (1 << i); store('records', ACT.best);
    addTickets(c[1]); sPlouf(0.4, { x: this.bx, y: SEA.surf, z: this.bz }); if (c[1] >= 4 || neu) { spawnConfetti(P.pos.x, P.pos.y + 2.2, P.pos.z, 30, 0.7); sConfetti(P.pos.x, P.pos.y + 2, P.pos.z); }
    this.end('Tu remontes ' + c[0] + ' · +' + c[1] + ' ticket' + (c[1] > 1 ? 's' : '') + (neu ? ' · nouvelle prise, carnet ' + bits(ACT.best.carnet) + '/' + CATCH.length : ''));
  },
  tick(dt) {
    this.w -= dt; const dip = this.st === 'touche' ? 0.22 + Math.sin(ACT.t * 30) * 0.05 : Math.sin(ACT.t * 2.2) * 0.03;
    this.bob.position.set(this.bx, SEA.surf + 0.05 - dip, this.bz);
    camera.getWorldDirection(_rv); const a = this.line.geometry.attributes.position;
    a.setXYZ(0, camera.position.x + _rv.x * 0.7 + _rv.z * 0.3, camera.position.y - 0.25, camera.position.z + _rv.z * 0.7 - _rv.x * 0.3); a.setXYZ(1, this.bx, SEA.surf + 0.1 - dip, this.bz); a.needsUpdate = true;
    if (this.st === 'attente' && this.w <= 0) { this.st = 'touche'; this.w = 1.1; spawnRipple(SEA, this.bx, this.bz, 1); sSplash(1, 1.2, { x: this.bx, y: SEA.surf, z: this.bz }); sPing(); }
    else if (this.st === 'touche' && this.w <= 0) this.end('Trop tard… il a recraché l’hameçon');
  } };
function bits(n) { let c = 0; for (; n; n >>= 1) c += n & 1; return c; }
(function buildFishing() {
  FISH.bob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9), new THREE.MeshBasicMaterial({ color: HDR('#ff8fcf', 1.3) })); FISH.bob.visible = false; world.add(FISH.bob);
  FISH.line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), new THREE.LineBasicMaterial({ color: C('#ffffff'), transparent: true, opacity: 0.7 })); FISH.line.frustumCulled = false; FISH.line.visible = false; world.add(FISH.line);
  totem(23.2, -136.4, 'PÊCHE À LA LIGNE', '#7ff0ff');
  B.add(cylG(0.4, 0.36, 0.8, 12), colorMat('#a9c8f4'), M4(25.9, DECK + 0.4, -137.4), true, true); addCircle(25.9, -137.4, 0.42, 0, 0.9);
  for (let i = 0; i < 3; i++) B.add(cylG(0.012, 0.02, 2.6, 6), MAT.trunk, M4(25.9 + (i - 1) * 0.12, DECK + 1.7, -137.4, 0.12 * (i - 1), 0, 0.1));
  ACT.list.push(FISH);
})();

/* ---------- coquillages : douze par jour sur la plage ---------- */
const COQ = { list: [], im: null, n: 12, got: 0 };
(function buildShells() {
  const gs = [vc(new THREE.SphereGeometry(1, 10, 6, 0, PI * 2, 0, PI / 2), M4(0, 0, 0, 0, 0, 0, 0.16, 0.09, 0.14), '#ffffff'), vc(new THREE.SphereGeometry(0.03, 6, 5), M4(0, 0.03, -0.13), '#d8d8e0')];
  const im = new THREE.InstancedMesh(mergeGeos(gs), std({ color: C('#ffffff'), vertexColors: true, roughness: 0.25, emissive: C('#ff9fcd'), emissiveIntensity: 0.35 }), COQ.n); gs.forEach((g) => g.dispose());
  im.frustumCulled = false; world.add(im); COQ.im = im;
})();
function placeShells() {
  const r = rng(977 + ACT.day * 131); COQ.list.length = 0; COQ.got = 0;
  let guard = 0;
  while (COQ.list.length < COQ.n && guard++ < 400) {
    const x = -78 + r() * 222, z = -4 - r() * 24, y = TH(x, z);
    if (Math.abs(x) < 10 || y < SEA.low + 0.35 || y > -0.6) continue;
    const i = COQ.list.length; COQ.list.push({ x, y, z, on: true });
    _rq.setFromAxisAngle(_ry, r() * 6.28); _rm4.compose(_rv.set(x, y + 0.01, z), _rq, _rs); COQ.im.setMatrixAt(i, _rm4); COQ.im.setColorAt(i, C(PASTELS[i % PASTELS.length]));
  }
  COQ.im.count = COQ.list.length; COQ.im.instanceMatrix.needsUpdate = true; if (COQ.im.instanceColor) COQ.im.instanceColor.needsUpdate = true;
}
function updateShells() {
  if (P.pos.z > 0 || P.pos.z < -32 || P.pos.y > 0) return;
  for (let i = 0; i < COQ.list.length; i++) { const s = COQ.list[i]; if (!s.on) continue; const dx = P.pos.x - s.x, dz = P.pos.z - s.z; if (dx * dx + dz * dz > 0.8) continue;
    s.on = false; COQ.got++; _rm4.makeScale(0, 0, 0); COQ.im.setMatrixAt(i, _rm4); COQ.im.instanceMatrix.needsUpdate = true; sTink(P.pos); addTickets(1);
    if (COQ.got === COQ.list.length) { addTickets(10); toast('Les douze coquillages ! +10 tickets · ils reviendront demain matin'); spawnConfetti(P.pos.x, P.pos.y + 2, P.pos.z, 60, 1); sConfetti(P.pos.x, P.pos.y + 2, P.pos.z); }
    else toast('Coquillage ' + COQ.got + '/' + COQ.list.length + ' · +1 ticket'); }
}

placeShells();

/* ---------- photo et sieste ---------- */
function togglePhoto() { PHOTO.on = !PHOTO.on; document.body.classList.toggle('photo', PHOTO.on); if (PHOTO.on) { WPN.firing = false; P.aiming = false; } }
function photoCapture() {
  PHOTO.snap = false;
  try { renderer.domElement.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'front-de-mer-' + Date.now() + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, 'image/png'); } catch (e) { /* tant pis */ }
  flashFx = 1; sClick(2600, 0.5); sClick(1800, 0.4, 0.07);
}
function sleepInBed() { if (ACT.sleep > 0) return; ACT.sleep = 2.6; ACT.slept = false; ACT.fade = 1; }

/* ---------- le mortier à feux d'artifice ---------- */
(function buildMortar() {
  const x = -10, z = -163.4;
  B.add(boxG(1.2, 0.3, 0.9), colorMat('#2e1f4a'), M4(x, DECK + 0.15, z), true, true);
  for (let i = 0; i < 3; i++) B.add(cylG(0.13, 0.15, 0.8, 10), colorMat(PASTELS[i * 2], { roughness: 0.4 }), M4(x - 0.35 + i * 0.35, DECK + 0.62, z, -0.25, 0, (i - 1) * 0.12), true, true);
  totem(-12.6, -162.6, 'FEU D’ARTIFICE', '#ffd27a');
  ACT.list.push({ id: 'mortier', nom: 'FEU D’ARTIFICE', x, z: z + 1.3, r: 2.4, cd: 0,
    hint() { return ACT.tickets >= 3 ? 'tirer un feu d’artifice (3 tickets)' : 'il faut 3 tickets pour tirer un feu d’artifice'; },
    start() { if (ACT.tickets < 3 || ACT.t - this.cd < 1.5) { if (ACT.tickets < 3) sZap(P.pos); return; } this.cd = ACT.t; addTickets(-3); fwSalvo(5); if (NET.on) NET.send('score', { fw: 5 }); } });
})();

/* ---------- interaction commune ---------- */
function actInteract() {
  if (PHOTO.on) { PHOTO.snap = true; return true; }
  if (ACT.cur) { if (ACT.cur.use) { ACT.cur.use(); return true; } return false; }
  const k = rideNear(); if (k) { boardRide(k); return true; }
  if (ACT.near) { ACT.near.start(); return true; }
  return false;
}
function actHint() { return ACT.hint; }
function actOnNet(d, from) {
  if (d.fw) { fwSalvo(clamp(d.fw | 0, 1, 8)); return; }
  if (d.jeu) { const p = NET.peers.get(from); toast((p && p.nom ? p.nom : 'Quelqu’un') + ' bat son record · ' + String(d.jeu).slice(0, 24) + ' : ' + (d.s | 0)); }
}
function dreamClock() {
  const pts = [[0, 8], [300, 19.78], [370, 21.2], [590, 30], [660, 32]]; let h = 8;
  for (let i = 0; i < 4; i++) if (TIME.t >= pts[i][0]) h = lerp(pts[i][1], pts[i + 1][1], (TIME.t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]));
  h %= 24; return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
}
function updateActs(dt) {
  ACT.t += dt;
  ACT.ck = (ACT.ck || 0) - dt; if (ACT.ck <= 0) { ACT.ck = 0.5; const el = $('vhsHeure'), s = dreamClock(); if (el && el.textContent !== s) el.textContent = s; }
  // un nouveau jour : les coquillages reviennent
  if (TIME.t < ACT.lastT - 60) { ACT.day++; placeShells(); } ACT.lastT = TIME.t;
  if (ACT.bj > 0) ACT.bj -= dt; if (ACT.bv > 0) ACT.bv -= dt;
  P.bj = ACT.bj > 0 ? 1.55 : 1; P.bv = ACT.bv > 0 ? 1.35 : 1;
  if (ACT.sleep > 0) {
    ACT.sleep -= dt;
    if (!ACT.slept && ACT.sleep < 1.4) { ACT.slept = true; const night = NIGHT.value > 0.5; setTimeOfDay(night ? 24 : TIME.night + 4); P.hp = 100; updateVie(); toast(night ? 'Tu te réveilles avec le soleil : la mer s’est retirée' : 'Tu rouvres les yeux : la nuit est tombée, la marée monte'); }
    if (ACT.sleep <= 0) ACT.fade = 0;
  }
  const onPier = camera.position.z < 10 && camera.position.z > -100 && Math.abs(camera.position.x) < 40;
  if (onPier) { updateTargets(dt); updateHoop(dt); }
  if (camera.position.z > -20 && camera.position.z < 40) updatePads(dt);
  updateShells();
  // activité en cours, activité la plus proche, texte d'aide
  const a = ACT.cur;
  if (a) { if (P.dead || P.ride || !near2(a, a.r + 5) || P.inPC) { if (a.end) a.end(''); else finishAct(a, true); } else a.tick(dt); }
  ACT.near = null;
  if (!ACT.cur && !P.ride && P.pos.y < 1.2) for (const q of ACT.list) if (near2(q, q.r)) { ACT.near = q; break; }
  let h = '';
  if (PHOTO.on) h = 'prendre la photo';
  else if (ACT.cur) h = ACT.cur.useHint || '';
  else if (!P.ride) { const k = rideNear(); h = k === 'roue' ? 'monter dans la grande roue' : k === 'manege' ? 'monter sur le manège' : ACT.near ? ACT.near.hint() : ''; }
  ACT.hint = h;
}
drawBoard(); drawTickets();
