/* =========================================================
   Interface : accueil, préparation, pause, radar, phrases, messages
   ========================================================= */
let DEVICE = store('appareil') || (IS_TOUCH ? 'mobile' : 'pc');
const PROFILE = Object.assign({}, DEFAULT_PROFILE, storeJSON('profil', {}));
if (!PROFILE.nom) PROFILE.nom = ['Rêveur', 'Nuage', 'Néon', 'Palmier', 'Flamant', 'Cassette', 'Vinyle', 'Lagon'][(Math.random() * 8) | 0] + ((Math.random() * 90 + 10) | 0);
const PREP = { monde: 'solo', ouvert: true, regle: 'paisible', mortel: storeJSON('mortel', false), join: null };
/* ---------- messages ---------- */
let toastT = null;
function toast(t) { const el = $('invite'); el.textContent = t; el.classList.add('montre'); interactHint = t; clearTimeout(toastT); toastT = setTimeout(() => { if (interactHint === t) { interactHint = ''; el.classList.remove('montre'); } }, 2600); }
function addFeed(t) { const el = $('fil'); const d = document.createElement('div'); d.textContent = t; el.prepend(d); setTimeout(() => d.remove(), 6200); while (el.children.length > 5) el.lastChild.remove(); }
function showStatut(on) { $('statut').style.opacity = on && gameState === 'jeu' ? '1' : '0'; }
function hitmark(kill) { hitmarkT = kill ? 0.35 : 0.12; hitmarkKill = !!kill; }
function onKill() {
  kills++; $('kills').textContent = kills; hitmark(true); killFx = 1; flashFx = 0.18; slowT = 0.55; if (NET.on) sendProfile();
  // au 10e Revenant dissous, un jetpack apparaît à cet endroit
  if (kills >= 10 && !JET.has && !JET.pick) spawnJetpack(M.pos.x, M.pos.z);
}
/* ---------- phrases quand le Revenant se dissout ---------- */
const PHRASES = [
  'tu es déjà venu ici', 'il revient toujours', 'personne n’habite vraiment ici', 'l’eau se souvient de toi', 'c’était l’été pour toujours', 'réveille-toi',
  'la piscine est restée allumée', 'tout le monde est parti à la plage', 'ce n’est qu’un rêve', 'tu n’as jamais quitté le lotissement', 'le soleil ne se couche jamais ici',
  'il est toujours 19 h 47', 'quelqu’un a oublié la télé allumée', 'les palmiers t’ont vu', 'la porte est restée ouverte', 'le ciel a la couleur d’une cassette usée',
  'les moutons savent quelque chose', 'tu as déjà loué ce film', 'rembobine avant de rendre', 'le bowling ferme jamais', 'tu entends la musique du voisin',
  'ton reflet est parti nager', 'les flamants roses ne clignent pas des yeux', 'la rue n’a pas de fin', 'tes pas sonnent comme de la pluie', 'il pleut dans la piscine, pas ailleurs',
  'ce matin n’est jamais arrivé', 'la face B est plus belle', 'quelqu’un t’appelle depuis la cuisine', 'les nuages se répètent', 'tu as rêvé de ce rêve',
  'la mémoire est une piscine chlorée', 'le téléphone sonne dans une autre maison', 'les murs repoussent quand tu dors', 'c’était mieux en 1987', 'il fait doux pour toujours',
  'le vent sent le monoï', 'ton ombre est en retard', 'tu oublies de respirer sous l’eau', 'les lampadaires murmurent', 'le Revenant t’aime bien, au fond',
  'il voulait juste te faire un câlin', 'l’eau ne meurt jamais, elle attend', 'chaque goutte se souvient du chemin', 'il connaît ton adresse', 'tu as gagné un jour de plus',
  'quelque part, une cassette se rembobine', 'tes chaussures sont encore mouillées', 'la télé diffuse ton enfance', 'le facteur ne passe plus', 'les arroseurs automatiques chantent',
  'le parking est vide depuis 1994', 'le néon grésille ton prénom', 'tu peux rester un peu', 'la sortie est derrière la porte rose', 'il reviendra plus doux',
  'ne te retourne pas, il est déjà là', 'les piscines se parlent la nuit', 'ici, l’été a perdu sa clé', 'la carte postale était vraie', 'tu as le droit de te perdre',
  'c’était un mardi, ou pas', 'la glace à la fraise a fondu en 1989', 'le vidéo club ferme dans cinq minutes', 'le disque saute toujours au même endroit', 'ton baladeur n’a plus de piles',
  'un chien aboie dans une autre dimension', 'le gazon a été tondu par personne', 'la lune est rose ce soir', 'la boîte aux lettres attend ta lettre', 'on t’a gardé une part de gâteau',
  'le jacuzzi est encore chaud', 'tu rêves en 4/3', 'il y a du sable dans ta mémoire', 'personne ne ferme les volets ici', 'les étoiles sont en plastique', 'tu entends la mer, mais il n’y a pas de mer',
  'le temps a fait une pause', 'ta maison d’enfance n’a jamais existé', 'le refuge t’attend', 'il reste de l’eau dans tes oreilles', 'la vague ne se brise jamais',
  'tout est plus calme après', 'le ciel se recharge', 'le monstre aussi fait des rêves', 'tu as oublié quelque chose dans le lotissement', 'les fenêtres repoussent comme des fleurs'
];
const PH_SUJ = ['le lotissement', 'la piscine', 'ton ombre', 'le soleil', 'la télé', 'le bowling', 'le flamant rose', 'la cassette', 'le vidéo club', 'le parking', 'la rue', 'le monstre d’eau', 'ta chambre', 'le néon', 'le mouton arc-en-ciel'];
const PH_VERB = ['se souvient de', 'rêve de', 'attend', 'murmure', 'efface', 'garde', 'rembobine', 'cherche', 'écoute', 'répète'];
const PH_OBJ = ['ton prénom', 'l’été 1986', 'tes pas', 'une chanson oubliée', 'le bruit de l’eau', 'ta voix', 'un après-midi sans fin', 'la couleur du ciel', 'la face B', 'ton reflet', 'les vacances', 'le goût du chlore'];
let phraseBag = [];
function nextPhrase() {
  if (!phraseBag.length) { phraseBag = PHRASES.map((_, i) => i); for (let i = 0; i < 60; i++) phraseBag.push(1000 + ((Math.random() * PH_SUJ.length * PH_VERB.length * PH_OBJ.length) | 0)); phraseBag.sort(() => Math.random() - 0.5); }
  return phraseBag.pop();
}
function phraseText(i) {
  if (i < 1000) return PHRASES[i % PHRASES.length];
  let k = i - 1000; const o = k % PH_OBJ.length; k = Math.floor(k / PH_OBJ.length); const v = k % PH_VERB.length; k = Math.floor(k / PH_VERB.length); const s = k % PH_SUJ.length;
  return PH_SUJ[s] + ' ' + PH_VERB[v] + ' ' + PH_OBJ[o];
}
const PHR = { text: '', n: 0, acc: 0, hold: 0, on: false };
function showPhrase(i) { PHR.text = phraseText(i); PHR.n = 0; PHR.acc = 0; PHR.hold = 2.6; PHR.on = true; $('phrase').classList.add('montre'); }
function updatePhrase(dt) {
  if (!PHR.on) return;
  const el = $('phrase');
  if (PHR.n < PHR.text.length) {
    PHR.acc += dt * 28;
    const prev = PHR.n; PHR.n = Math.min(PHR.text.length, Math.floor(PHR.acc));
    if (PHR.n !== prev) { el.textContent = '> ' + PHR.text.slice(0, PHR.n); const c = document.createElement('span'); c.className = 'curseur'; el.append(c); if (AU.on && PHR.n % 2 === 0) tone(AU.fx, now(), 'square', 1400 + Math.random() * 300, 1400, 0.012, 0.012); }
  } else { PHR.hold -= dt; if (PHR.hold <= 0) { PHR.on = false; el.classList.remove('montre'); } }
}
/* ---------- radar ---------- */
const RAD = { cv: $('radar'), g: null, map: null, scale: 2 };
function buildRadarMap() {
  const s = RAD.scale, W = (MAP.x1 - MAP.x0) * s, H = (MAP.z1 - MAP.z0) * s;
  const [c, g] = makeCanvas(W, H); RAD.map = c;
  const X = (x) => (x - MAP.x0) * s, Z = (z) => (z - MAP.z0) * s;
  g.fillStyle = 'rgba(96,180,230,0.55)'; g.fillRect(0, 0, W, H);
  for (let z = MAP.z0; z < MAP.z1; z += 4) for (let x = MAP.x0; x < MAP.x1; x += 4) { const h = TH(x + 2, z + 2); if (h < SEA.low) continue; g.fillStyle = z < 0 && h < 0.4 ? 'rgba(246,220,200,0.92)' : 'rgba(120,200,160,0.6)'; g.fillRect(X(x), Z(z), 4 * s + 0.6, 4 * s + 0.6); }
  g.fillStyle = 'rgba(200,190,230,0.9)';
  g.fillRect(X(PROM.x0), Z(PROM.z0), (PROM.x1 - PROM.x0) * s, (PROM.z1 - PROM.z0) * s);
  g.fillRect(X(ROAD.x0), Z(ROAD.z0), (ROAD.x1 - ROAD.x0) * s, (ROAD.z1 - ROAD.z0) * s);
  g.fillRect(X(-16), Z(PROM.z1), 32 * s, (ROAD.z0 - PROM.z1) * s);
  g.fillStyle = 'rgba(240,205,185,0.95)';
  g.fillRect(X(PIER.x0), Z(PIER.z0), (PIER.x1 - PIER.x0) * s, (PIER.z1 - PIER.z0) * s); g.fillRect(X(PIER.ex0), Z(PIER.ez0), (PIER.ex1 - PIER.ex0) * s, (PIER.ez1 - PIER.ez0) * s);
  for (const p of pools) {
    if (!p.blob) { g.fillStyle = 'rgba(127,240,255,0.95)'; g.fillRect(X(p.x0), Z(p.z0), (p.x1 - p.x0) * s, (p.z1 - p.z0) * s); continue; }
    g.fillStyle = 'rgba(246,220,200,0.85)'; g.beginPath(); blobPoly(p, 72, 4).forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); g.fill();
    g.fillStyle = 'rgba(110,236,232,0.95)'; g.beginPath(); blobPoly(p, 72).forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); g.fill();
    if (p.towerPos) { g.fillStyle = 'rgba(255,170,215,0.95)'; g.beginPath(); g.arc(X(p.towerPos.x), Z(p.towerPos.z), 2.4 * s, 0, 7); g.fill(); }
  }
  g.fillStyle = 'rgba(255,170,215,0.95)'; for (const r of RESERVED) g.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
  g.fillStyle = 'rgba(255,230,160,0.9)'; for (const t of TRAMPS) { if (t.d.y > 1) continue; g.beginPath(); g.arc(X(t.d.x), Z(t.d.z), 3, 0, 7); g.fill(); }
}
function drawRadar() {
  if (!RAD.g) { RAD.g = RAD.cv.getContext('2d'); buildRadarMap(); }
  const g = RAD.g, W = RAD.cv.width, R = W / 2, m = 1.8; // pixels par mètre
  g.clearRect(0, 0, W, W);
  g.save(); g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.clip();
  g.fillStyle = 'rgba(28,20,48,0.72)'; g.fillRect(0, 0, W, W);
  g.translate(R, R); g.rotate(P.yaw); g.scale(m / RAD.scale, m / RAD.scale);
  g.translate(-(P.pos.x - MAP.x0) * RAD.scale, -(P.pos.z - MAP.z0) * RAD.scale);
  g.globalAlpha = 0.9; g.drawImage(RAD.map, 0, 0); g.globalAlpha = 1;
  const X = (x) => (x - MAP.x0) * RAD.scale, Z = (z) => (z - MAP.z0) * RAD.scale;
  for (const h of houses) {
    g.save(); g.translate(X(h.inside.x), Z(h.inside.z)); g.rotate(-h.rot);
    g.fillStyle = h.collapsed ? 'rgba(255,255,255,0.25)' : 'rgba(255,240,248,0.85)'; g.fillRect(-6.4 * RAD.scale, -4.8 * RAD.scale, 12.8 * RAD.scale, 9.6 * RAD.scale);
    g.restore();
  }
  g.fillStyle = refugeDoor.locked ? '#ff6f9f' : '#a3f3dc'; g.fillRect(X(RF.x0), Z(RF.z0), (RF.x1 - RF.x0) * RAD.scale, (RF.z1 - RF.z0) * RAD.scale);
  g.fillStyle = '#ffffff'; for (const p of PORTALS) { g.beginPath(); g.arc(X(p.x), Z(p.z), 3.2, 0, 7); g.fill(); }
  if (JET.pick) { const pk = JET.pick, r = 7 + Math.sin(clockU.value * 6) * 2; g.fillStyle = '#ffe27a'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr2 = k % 2 ? r * 0.45 : r; g.lineTo(X(pk.x) + Math.sin(a) * rr2, Z(pk.z) - Math.cos(a) * rr2); } g.closePath(); g.fill(); }
  for (let i = 0; i < SHEEP.length; i++) { const s = SHEEP[i]; if (s.dead) continue; g.fillStyle = RAINBOW_W[i % 7].getStyle(); g.beginPath(); g.arc(X(s.x), Z(s.z), 2.6, 0, 7); g.fill(); }
  for (const p of NET.peers.values()) { if (!p.nom || p.inPC) continue; g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(-p.yaw); g.fillStyle = (p.cfg && p.cfg.couleur) || '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill(); g.restore(); }
  g.restore();
  // monstre (au bord si trop loin)
  if (M.state !== 'dead') {
    let dx = (M.pos.x - P.pos.x) * m, dz = (M.pos.z - P.pos.z) * m;
    const c = Math.cos(P.yaw), s = Math.sin(P.yaw);
    let rx = dx * c - dz * s, rz = dx * s + dz * c;
    const d = Math.hypot(rx, rz), lim = R - 10; if (d > lim) { rx *= lim / d; rz *= lim / d; }
    const pulse = 5 + Math.sin(clockU.value * 6) * 2;
    g.fillStyle = 'rgba(143,246,255,0.35)'; g.beginPath(); g.arc(R + rx, R + rz, pulse + 5, 0, 7); g.fill();
    g.fillStyle = '#8ff6ff'; g.beginPath(); g.arc(R + rx, R + rz, pulse, 0, 7); g.fill();
  }
  g.fillStyle = '#ff9fcd'; g.beginPath(); g.moveTo(R, R - 9); g.lineTo(R + 6.5, R + 7); g.lineTo(R, R + 3); g.lineTo(R - 6.5, R + 7); g.closePath(); g.fill();
  // couronne de boussole : graduations tous les trente degrés, les quatre points cardinaux
  g.strokeStyle = 'rgba(255,245,250,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,245,250,0.16)'; g.lineWidth = 1.5; g.beginPath(); g.arc(R, R, R * 0.5, 0, 7); g.stroke();
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  g.strokeStyle = 'rgba(255,245,250,0.5)'; g.lineWidth = 2; g.beginPath();
  for (let k = 0; k < 12; k++) { if (k % 3 === 0) continue; const a = P.yaw + k * Math.PI / 6, sx = Math.sin(a), cx = -Math.cos(a); g.moveTo(R + sx * (R - 3), R + cx * (R - 3)); g.lineTo(R + sx * (R - 13), R + cx * (R - 13)); }
  g.stroke();
  g.font = '26px "VT323",monospace'; g.textAlign = 'center';
  const card = [['N', sy, -cy, 0.95], ['E', cy, sy, 0.6], ['S', -sy, cy, 0.6], ['O', -cy, -sy, 0.6]];
  for (const [t, dx, dz, al] of card) { g.fillStyle = 'rgba(28,20,48,0.55)'; g.beginPath(); g.arc(R + dx * (R - 17), R + dz * (R - 17), 12, 0, 7); g.fill(); g.fillStyle = t === 'N' ? 'rgba(255,170,215,' + al + ')' : 'rgba(255,245,250,' + al + ')'; g.fillText(t, R + dx * (R - 17), R + dz * (R - 17) + 8); }
}
/* ---------- HUD ---------- */
const hudEls = { viseur: $('viseur'), impact: $('impact'), fleche: $('fleche'), chevron: $('chevron'), dist: $('dist'), boss: $('boss'), bossBarre: $('bossBarre'), temps: $('vhsTemps') };
try { $('vhsDate').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(); } catch (e) {}
let lastSec = -1, radarT = 0;
const _head = new V3(), _head2 = new V3();
// l'affichage n'est retouché que lorsqu'une valeur change vraiment : chaque écriture oblige le navigateur à recalculer la page
const _hudLast = new WeakMap();
function hudSet(el, prop, v) { let o = _hudLast.get(el); if (!o) _hudLast.set(el, o = {}); if (o[prop] === v) return; o[prop] = v; if (prop === 'text') el.textContent = v; else if (prop.charCodeAt(0) === 45) el.style.setProperty(prop, v); else el.style[prop] = v; }
function updateHUD(dt) {
  const spread = 10 + WPN.heat * 16 + Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 5) * 12 + (P.onGround ? 0 : 14);
  hudSet(hudEls.viseur, '--ecart', spread.toFixed(1) + 'px');
  hudSet(hudEls.viseur, 'opacity', Math.max(0, 1 - WPN.ads * 1.6).toFixed(2));
  hitmarkT -= dt;
  hudSet(hudEls.impact, 'opacity', hitmarkT > 0 ? Math.min(1, hitmarkT * 8).toFixed(2) : '0');
  hudSet(hudEls.impact, '--c', hitmarkKill ? '#ff8fc8' : '#fff5fa');
  hudSet(hudEls.impact, 'transform', hitmarkKill ? 'scale(1.6)' : 'scale(1)');
  const sec = Math.floor(playTime);
  if (sec !== lastSec) { lastSec = sec; const h = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60, s = sec % 60; hudEls.temps.textContent = [h, mm, s].map((v) => String(v).padStart(2, '0')).join(':'); }
  hudSet(hudEls.bossBarre, 'transform', 'scaleX(' + (M.state === 'dead' ? 0 : M.state === 'form' ? M.form : Math.max(0, M.hp) / 100).toFixed(3) + ')');
  hudSet(hudEls.boss, 'opacity', M.state === 'dead' ? '0' : '1');
  if (M.state !== 'dead') {
    _head.set(M.pos.x, M.gy + 2.2, M.pos.z);
    const d = _head.distanceTo(camera.position);
    const v = _head2.copy(_head).project(camera);
    const behind = v.z > 1;
    let x = v.x, y = v.y; if (behind) { x = -x; y = -y; }
    const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.86;
    if (off) {
      const ang = Math.atan2(y, x), W = innerWidth, H = innerHeight;
      const ex = W / 2 + Math.cos(ang) * (W / 2 - 60), ey = H / 2 - Math.sin(ang) * (H / 2 - 70);
      hudSet(hudEls.fleche, 'transform', 'translate(' + ex.toFixed(0) + 'px,' + ey.toFixed(0) + 'px)');
      hudSet(hudEls.chevron, 'transform', 'rotate(' + (-ang).toFixed(2) + 'rad)');
      hudSet(hudEls.dist, 'text', Math.round(d) + ' m');
      hudSet(hudEls.fleche, 'opacity', '1');
    } else hudSet(hudEls.fleche, 'opacity', '0');
  } else hudSet(hudEls.fleche, 'opacity', '0');
  radarT -= dt; if (radarT <= 0) { radarT = 1 / 15; drawRadar(); }
  updatePhrase(dt);
  updateHint();
}
/* ---------- accueil et préparation ---------- */
function pressed(id, on) { $(id).setAttribute('aria-pressed', on ? 'true' : 'false'); }
function buildPrep() {
  const tp = $('typesPerso'); tp.innerHTML = '';
  TYPES.forEach(([id, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choix'; b.textContent = label; b.setAttribute('aria-pressed', PROFILE.type === id ? 'true' : 'false'); b.addEventListener('click', () => { PROFILE.type = id; saveProfile(); buildPrep(); }); tp.append(b); });
  const cp = $('couleursPerso'); cp.innerHTML = '';
  COULEURS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'puce'; b.style.background = c; b.setAttribute('aria-label', 'Couleur ' + c); b.setAttribute('aria-pressed', PROFILE.couleur === c ? 'true' : 'false'); b.addEventListener('click', () => { PROFILE.couleur = c; saveProfile(); buildPrep(); }); cp.append(b); });
  const te = $('teintsPerso'); te.innerHTML = ''; te.hidden = PROFILE.type !== 'humain';
  TEINTS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'puce'; b.style.background = c; b.setAttribute('aria-label', 'Teint ' + (i + 1)); b.setAttribute('aria-pressed', PROFILE.teint === c ? 'true' : 'false'); b.addEventListener('click', () => { PROFILE.teint = c; saveProfile(); buildPrep(); }); te.append(b); });
  const ac = $('accessoiresPerso'); ac.innerHTML = '';
  ACCESSOIRES.forEach(([id, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'choix'; b.textContent = label; b.setAttribute('aria-pressed', PROFILE.acc === id ? 'true' : 'false'); b.addEventListener('click', () => { PROFILE.acc = id; saveProfile(); buildPrep(); }); ac.append(b); });
  $('pseudo').value = PROFILE.nom; $('langue').value = PROFILE.langue;
  pressed('mSolo', PREP.monde === 'solo'); pressed('mLigne', PREP.monde === 'ligne'); $('blocLigne').hidden = PREP.monde !== 'ligne';
  pressed('sOuvert', PREP.ouvert); pressed('sFerme', !PREP.ouvert); pressed('rPaisible', PREP.regle === 'paisible'); pressed('rBagarre', PREP.regle === 'bagarre');
  pressed('dImmortel', !PREP.mortel); pressed('dMortel', PREP.mortel);
  if (!$('nomServeur').value) $('nomServeur').value = 'Chez ' + PROFILE.nom;
  setPreview(PROFILE); updateResume();
}
function saveProfile() { store('profil', PROFILE); setGlove(PROFILE.couleur); }
function updateResume() {
  let t;
  if (PREP.join) t = 'Tu rejoins "' + PREP.join.nom + '" (' + (PREP.join.regle === 'bagarre' ? 'bagarre' : 'paisible') + ')';
  else if (PREP.monde === 'solo') t = 'Seul, sur ta machine';
  else t = 'Tu crées un serveur ' + (PREP.ouvert ? 'ouvert' : 'fermé') + ', ' + (PREP.regle === 'bagarre' ? 'où l’on peut s’entretuer' : 'paisible');
  $('resume').textContent = t + ' · ' + (PREP.mortel ? 'mortel' : 'immortel') + '.';
  $('entrerTxt').textContent = PREP.join ? 'Rejoindre le rêve' : PREP.monde === 'ligne' ? 'Créer et entrer' : 'Entrer dans le rêve';
}
$('pseudo').addEventListener('input', (e) => { PROFILE.nom = e.target.value.replace(/[<>]/g, '').slice(0, 16) || 'Rêveur'; saveProfile(); clearTimeout(PREVIEW.t); PREVIEW.t = setTimeout(() => setPreview(PROFILE), 300); });
$('langue').addEventListener('change', (e) => { PROFILE.langue = e.target.value; saveProfile(); });
$('mSolo').addEventListener('click', () => { PREP.monde = 'solo'; PREP.join = null; buildPrep(); });
$('mLigne').addEventListener('click', () => { PREP.monde = 'ligne'; buildPrep(); openLobby(); });
$('sOuvert').addEventListener('click', () => { PREP.ouvert = true; PREP.join = null; buildPrep(); });
$('sFerme').addEventListener('click', () => { PREP.ouvert = false; PREP.join = null; buildPrep(); });
$('rPaisible').addEventListener('click', () => { PREP.regle = 'paisible'; PREP.join = null; buildPrep(); });
$('rBagarre').addEventListener('click', () => { PREP.regle = 'bagarre'; PREP.join = null; buildPrep(); });
$('dImmortel').addEventListener('click', () => { PREP.mortel = false; store('mortel', false); buildPrep(); });
$('dMortel').addEventListener('click', () => { PREP.mortel = true; store('mortel', true); buildPrep(); });
$('creerServeur').addEventListener('click', () => { PREP.join = null; PREP.monde = 'ligne'; startGame(); });
$('entrer').addEventListener('click', () => startGame());
$('retourAccueil').addEventListener('click', () => { $('prep').hidden = true; $('ecran').hidden = false; PREVIEW.on = false; });
function chooseDevice(d) {
  DEVICE = d; store('appareil', d);
  document.body.classList.toggle('mobile', d === 'mobile');
  initAudio();
  if (d === 'mobile') { try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => {}); } catch (e) {} if (qualiteNom === 'haute' && IS_TOUCH) applyQuality('moyenne'); }
  $('ecran').hidden = true; $('prep').hidden = false; PREVIEW.on = true; buildPrep();
  if (PREP.join) updateResume();
}
$('choixPC').addEventListener('click', () => chooseDevice('pc'));
$('choixMobile').addEventListener('click', () => chooseDevice('mobile'));
// lien d'invitation : #salon-XXXXXX-b ou -p
{
  const m = /^#salon-([a-z0-9]{4,12})(?:-([bp]))?$/i.exec(location.hash);
  if (m) { PREP.monde = 'ligne'; PREP.join = { sid: m[1].toLowerCase(), nom: 'Serveur privé', regle: m[2] === 'b' ? 'bagarre' : 'paisible', invite: true }; }
}
let started = false;
function startGame() {
  initAudio();
  setGlove(PROFILE.couleur);
  P.mortal = PREP.mortel; P.hp = 100; updateVie();
  if (PREP.join) {
    if (!NET.on || NET.server.sid !== PREP.join.sid) { if (NET.on) leaveServer(); connectServer(PREP.join.sid, { nom: PREP.join.nom, regle: PREP.join.regle, ouvert: !PREP.join.invite }, false); }
  } else if (PREP.monde === 'ligne') {
    if (!NET.on) { const sid = Math.random().toString(36).slice(2, 8); connectServer(sid, { nom: ($('nomServeur').value || 'Serveur').slice(0, 24), regle: PREP.regle, ouvert: PREP.ouvert }, true); if (!PREP.ouvert) { try { history.replaceState(null, '', '#salon-' + sid + '-' + (PREP.regle === 'bagarre' ? 'b' : 'p')); } catch (e) {} } }
  } else if (NET.on) leaveServer();
  if (PREP.monde !== 'ligne' && NET.lobby && !NET.on) closeLobby();
  $('prep').hidden = true; $('ecran').hidden = true; PREVIEW.on = false;
  if (!started) { started = true; P.pos.set(START.x, 0, START.z); P.yaw = START.yaw; P.pitch = 0.02; setTimeout(() => { $('aide').style.opacity = '0'; }, 9000); drawSlots(); drawAmmo(); setTimeout(() => sayPhrase('Le front de mer. La jetée est devant toi, la villa sur la colline. Quand la nuit tombe, l’eau revient.', 5), 1500); }
  if (DEVICE === 'mobile') { $('tactile').hidden = false; $('aide').hidden = true; } else requestLock();
  resumeGame();
}
function resumeGame() {
  gameState = 'jeu'; $('hud').hidden = false; $('pause').hidden = true;
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
}
function pauseGame() {
  if (gameState !== 'jeu') return;
  gameState = 'pause'; WPN.firing = false; P.aiming = false;
  $('pause').hidden = false; syncOptions();
  if (!NET.on && AU.ctx) AU.ctx.suspend();
}
$('reprendre').addEventListener('click', () => { if (DEVICE !== 'mobile') requestLock(); resumeGame(); });
$('quitter').addEventListener('click', () => { if (NET.on) leaveServer(); PREP.join = null; gameState = 'accueil'; $('pause').hidden = true; $('hud').hidden = true; $('tactile').hidden = true; $('ecran').hidden = false; if (AU.ctx) AU.ctx.resume(); });
$('inviter').addEventListener('click', () => {
  const link = inviteLink();
  const done = (ok) => { $('noteInvite').textContent = ok ? 'Lien copié : envoie-le à qui tu veux.' : 'Copie ce lien : ' + link; };
  try { navigator.clipboard.writeText(link).then(() => done(true), () => done(false)); } catch (e) { done(false); }
});
function syncOptions() {
  for (const [id, key] of [['volMusique', 'musique'], ['volArmes', 'armes'], ['volEffets', 'effets']]) { $(id).value = VOL[key]; $(id.replace('vol', 'val')).textContent = Math.round(VOL[key] * 100); }
  $('sensi').value = sens; $('valSensi').textContent = sens.toFixed(2);
  $('coupeMusique').checked = VOL.coupeMusique; $('coupeArmes').checked = VOL.coupeArmes;
  $('qualite').value = qualiteNom; $('revenant').value = REV.mode; $('styleImage').value = imageStyle;
  $('voirIps').checked = IPS.on; $('ips').hidden = !IPS.on;
}
for (const [id, key] of [['volMusique', 'musique'], ['volArmes', 'armes'], ['volEffets', 'effets']]) $(id).addEventListener('input', (e) => { VOL[key] = parseFloat(e.target.value); saveVolumes(); syncOptions(); });
$('coupeMusique').addEventListener('change', (e) => { VOL.coupeMusique = e.target.checked; saveVolumes(); });
$('coupeArmes').addEventListener('change', (e) => { VOL.coupeArmes = e.target.checked; saveVolumes(); });
$('sensi').addEventListener('input', (e) => { sens = parseFloat(e.target.value) || 1; store('sensi', String(sens)); syncOptions(); });
$('qualite').addEventListener('change', (e) => applyQuality(e.target.value));
$('styleImage').addEventListener('change', (e) => applyStyle(e.target.value));
$('revenant').addEventListener('change', (e) => { REV.mode = e.target.value; store('revenant', REV.mode); });
// compteur de fluidité : à activer dans les réglages pour savoir combien d'images par seconde l'appareil affiche vraiment
$('voirIps').addEventListener('change', (e) => { IPS.on = e.target.checked; store('ips', IPS.on ? '1' : '0'); $('ips').hidden = !IPS.on; $('ips').textContent = ''; });
$('voirIps').checked = IPS.on; $('ips').hidden = !IPS.on;
