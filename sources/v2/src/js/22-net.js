/* =========================================================
   Multijoueur pair à pair (WebRTC) : salon public, serveurs ouverts ou fermés
   ========================================================= */
const APP_ID = 'eau-qui-revient-lotissement-2026';
const TEST_LOCAL = /[?&]test-local/.test(location.search);
const ACTIONS = ['profil', 'pos', 'etat', 'tir', 'laser', 'casse', 'vitre', 'palme', 'moutonHit', 'moutonMort', 'moutonNe', 'moutons', 'monstre', 'monstreHit', 'monstreMort', 'monstreNe', 'eclabousse', 'touche', 'mort', 'refuge', 'chatDem', 'chatRep', 'chatMsg', 'chatFin', 'plein', 'pc', 'meuble', 'lampe', 'voiture', 'juke'];
const BC_SELF = 'bc' + Math.random().toString(36).slice(2, 9);
function joinTransport(roomId) {
  if (TEST_LOCAL || !window.Trystero) return bcJoin(roomId);
  const room = Trystero.joinRoom({ appId: APP_ID }, roomId);
  const api = { self: Trystero.selfId, onJoin: null, onLeave: null, onMsg: null, acts: {} };
  const reg = (name) => { const a = room.makeAction(name); a.onMessage = (data, meta) => { try { api.onMsg && api.onMsg(name, data, meta && meta.peerId); } catch (e) { console.warn(e); } }; api.acts[name] = a; };
  (roomId === 'salon' ? ['annonce'] : ACTIONS).forEach(reg);
  room.onPeerJoin = (id) => api.onJoin && api.onJoin(id);
  room.onPeerLeave = (id) => api.onLeave && api.onLeave(id);
  api.send = (name, data, to) => { const a = api.acts[name]; if (!a) return; try { const r = a.send(data, to ? { target: to } : undefined); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
  api.leave = () => { try { room.leave(); } catch (e) {} };
  return api;
}
function bcJoin(roomId) {
  const self = BC_SELF, ch = new BroadcastChannel('eqr-' + roomId), peers = new Set();
  const api = { self, onJoin: null, onLeave: null, onMsg: null };
  ch.onmessage = (e) => {
    const m = e.data; if (!m || m.from === self || (m.to && m.to !== self)) return;
    if (m.t === '__hello') { if (!peers.has(m.from)) { peers.add(m.from); api.onJoin && api.onJoin(m.from); } if (!m.ack) ch.postMessage({ t: '__hello', from: self, ack: true, to: m.from }); return; }
    if (m.t === '__bye') { if (peers.delete(m.from)) api.onLeave && api.onLeave(m.from); return; }
    if (!peers.has(m.from)) { peers.add(m.from); api.onJoin && api.onJoin(m.from); }
    try { api.onMsg && api.onMsg(m.t, m.d, m.from); } catch (err) { console.warn(err); }
  };
  setTimeout(() => ch.postMessage({ t: '__hello', from: self }), 30);
  api.send = (t, d, to) => ch.postMessage({ t, d, from: self, to });
  api.leave = () => { try { ch.postMessage({ t: '__bye', from: self }); ch.close(); } catch (e) {} };
  addEventListener('beforeunload', api.leave);
  return api;
}
const NET = {
  on: false, selfId: 'moi', rule: 'paisible', server: null, room: null, lobby: null, peers: new Map(), servers: new Map(), lastHitBy: null, posT: 0, worldT: 0, annT: 0,
  isHost() { if (!this.on) return true; let m = this.selfId; for (const id of this.peers.keys()) if (id < m) m = id; return m === this.selfId; },
  hostId() { let m = this.selfId; for (const id of this.peers.keys()) if (id < m) m = id; return m; },
  nameOf(id) { if (id === this.selfId) return PROFILE.nom || 'Toi'; if (id === 'monstre') return 'le Revenant'; const p = this.peers.get(id); return p && p.nom ? p.nom : 'Un rêveur'; },
  send(type, data, to) { if (this.room) this.room.send(type, data, to); }
};
function openLobby() {
  if (NET.lobby) return;
  try { NET.lobby = joinTransport('salon'); } catch (e) { $('etatReseau').textContent = 'Le réseau n’est pas disponible dans ce navigateur.'; return; }
  NET.selfId = NET.lobby.self;
  NET.lobby.onMsg = (t, d, from) => {
    if (t !== 'annonce' || !d || typeof d.sid !== 'string') return;
    NET.servers.set(d.sid, { sid: d.sid, nom: String(d.nom || 'Serveur').slice(0, 24), regle: d.regle === 'bagarre' ? 'bagarre' : 'paisible', n: d.n | 0, max: d.max | 0 || 8, t: performance.now() });
    renderServers();
  };
  $('etatReseau').textContent = 'Connexion au salon des rêveurs…';
  setTimeout(() => { if (NET.lobby) $('etatReseau').textContent = NET.servers.size ? '' : 'Aucun serveur ouvert pour l’instant : crée le tien, ou attends qu’il en apparaisse un.'; renderServers(); }, 4000);
}
function closeLobby() { if (NET.lobby && !(NET.server && NET.server.ouvert)) { NET.lobby.leave(); NET.lobby = null; } }
function renderServers() {
  const el = $('listeServeurs'); if (!el) return;
  const now2 = performance.now();
  for (const [k, s] of NET.servers) if (now2 - s.t > 9000) NET.servers.delete(k);
  if (!NET.servers.size) { el.innerHTML = '<p class="vide">Aucun serveur ouvert visible pour le moment.</p>'; return; }
  el.innerHTML = '';
  for (const s of NET.servers.values()) {
    const row = document.createElement('div'); row.className = 'serveur';
    const info = document.createElement('div'); const b = document.createElement('b'); b.textContent = s.nom; const sp = document.createElement('span'); sp.textContent = (s.regle === 'bagarre' ? 'Bagarre' : 'Paisible') + ' · ' + s.n + ' / ' + s.max + ' rêveurs';
    info.append(b, sp);
    const btn = document.createElement('button'); btn.className = 'bouton petit'; btn.type = 'button'; btn.textContent = 'Rejoindre'; btn.disabled = s.n >= s.max;
    btn.addEventListener('click', () => { PREP.join = s; updateResume(); startGame(); });
    row.append(info, btn); el.append(row);
  }
}
function connectServer(sid, meta, host) {
  NET.server = Object.assign({ sid, nom: 'Serveur', regle: 'paisible', ouvert: true, max: 8 }, meta || {});
  NET.rule = NET.server.regle;
  try { NET.room = joinTransport('srv-' + sid); } catch (e) { toast('Impossible de rejoindre le réseau depuis ce navigateur. Tu joues seul.'); NET.server = null; return; }
  NET.selfId = NET.room.self; NET.on = true;
  NET.room.onJoin = (id) => onPeerJoin(id);
  NET.room.onLeave = (id) => onPeerLeave(id);
  NET.room.onMsg = onNetMsg;
  if (host && NET.server.ouvert) openLobby();
  sendProfile();
  updatePlayersCount();
  $('pauseServeur').textContent = NET.server.nom + ' · ' + (NET.rule === 'bagarre' ? 'bagarre' : 'paisible');
  $('inviter').hidden = false;
}
function leaveServer() {
  if (NET.room) NET.room.leave(); if (NET.lobby) NET.lobby.leave();
  NET.room = null; NET.lobby = null; NET.on = false; NET.server = null; NET.selfId = 'moi';
  for (const p of NET.peers.values()) removePeerAvatar(p);
  NET.peers.clear(); updatePlayersCount(); $('inviter').hidden = true;
}
function inviteLink() { return location.origin + location.pathname + '#salon-' + NET.server.sid + '-' + (NET.rule === 'bagarre' ? 'b' : 'p'); }
function sendProfile(to) { NET.send('profil', { nom: PROFILE.nom, type: PROFILE.type, couleur: PROFILE.couleur, teint: PROFILE.teint, acc: PROFILE.acc, langue: PROFILE.langue, kills, srv: NET.server && NET.isHost() ? { nom: NET.server.nom, regle: NET.rule, ouvert: NET.server.ouvert } : undefined }, to); }
function onPeerJoin(id) {
  if (!NET.peers.has(id)) NET.peers.set(id, { id, nom: '', buf: [], x: 0, y: -50, z: 0, yaw: 0, pitch: 0, flags: 0, w: 0, av: null, beam: null, beamT: 0, kills: 0, seen: performance.now() });
  sendProfile(id);
  jukeGreet(id);
  if (NET.isHost()) {
    if (NET.peers.size + 1 > (NET.server.max || 8)) { NET.send('plein', {}, id); return; }
    sendWorldState(id);
  }
  updatePlayersCount();
}
function onPeerLeave(id) {
  const p = NET.peers.get(id); if (!p) return;
  removePeerAvatar(p); NET.peers.delete(id);
  if (p.nom) addFeed(p.nom + ' s’est réveillé');
  if (CHAT.peer === id) closeChat(true);
  updatePlayersCount();
}
function updatePlayersCount() { const el = $('nbJoueurs'); if (!NET.on) { el.hidden = true; return; } el.hidden = false; const n = NET.peers.size + 1; el.textContent = n + (n > 1 ? ' rêveurs ici' : ' rêveur ici'); }
function sendWorldState(to) {
  NET.send('etat', {
    srv: { nom: NET.server.nom, regle: NET.rule, ouvert: NET.server.ouvert },
    casse: panels.filter((p) => !p.alive).map((p) => p.id),
    vitres: glasses.filter((g) => !g.alive).map((g) => g.id), svitres: shopGlass.filter((g) => !g.alive).map((g) => g.id),
    refuge: refugeDoor.locked ? 1 : 0,
    meubles: DESTR.pieces.filter((p) => !p.alive).map((p) => p.id), lampes: LAMP_HEADS.filter((h) => !h.alive).map((h) => h.id),
    moutons: SHEEP.map((s) => (s.dead ? 1 : 0)),
    mk: M.kills,
    juke: jukeNetState()
  }, to);
}
function removePeerAvatar(p) { if (p.av) { scene.remove(p.av.g); disposeAvatar(p.av); p.av = null; } if (p.beamObj) { scene.remove(p.beamObj.g); p.beamObj = null; } }
function arr(v, n) { return Array.isArray(v) && v.length >= n && v.every((x) => typeof x === 'number' && isFinite(x)); }
function onNetMsg(t, d, from) {
  if (!from || from === NET.selfId) return;
  let p = NET.peers.get(from);
  if (!p) { onPeerJoin(from); p = NET.peers.get(from); }
  p.seen = performance.now();
  switch (t) {
    case 'profil': {
      if (!d) return;
      const cfg = { nom: String(d.nom || 'Rêveur').slice(0, 16), type: TYPES.some((x) => x[0] === d.type) ? d.type : 'chat', couleur: /^#[0-9a-f]{6}$/i.test(d.couleur) ? d.couleur : '#ff9fcd', teint: /^#[0-9a-f]{6}$/i.test(d.teint) ? d.teint : TEINTS[2], acc: ACCESSOIRES.some((x) => x[0] === d.acc) ? d.acc : 'aucun', langue: String(d.langue || 'fr').slice(0, 5) };
      const changed = !p.cfg || JSON.stringify(p.cfg) !== JSON.stringify(cfg);
      const isNew = !p.nom;
      p.cfg = cfg; p.nom = cfg.nom; p.langue = cfg.langue; p.kills = d.kills | 0;
      if (changed) { if (p.av) { scene.remove(p.av.g); disposeAvatar(p.av); } p.av = makeAvatar(cfg, { tag: true }); scene.add(p.av.g); }
      if (isNew) addFeed(p.nom + ' est entré dans le rêve');
      if (d.srv && from === NET.hostId()) { NET.server.nom = String(d.srv.nom || NET.server.nom).slice(0, 24); NET.rule = d.srv.regle === 'bagarre' ? 'bagarre' : 'paisible'; NET.server.regle = NET.rule; $('pauseServeur').textContent = NET.server.nom + ' · ' + (NET.rule === 'bagarre' ? 'bagarre' : 'paisible'); }
      break;
    }
    case 'pos': if (arr(d, 8)) { p.buf.push({ t: performance.now(), x: d[0], y: d[1], z: d[2], yaw: d[3], pitch: d[4], w: d[5], f: d[6], hp: d[7] }); if (p.buf.length > 8) p.buf.shift(); } break;
    case 'etat': {
      if (!d) return;
      if (d.srv) { NET.server.nom = String(d.srv.nom || '').slice(0, 24) || NET.server.nom; NET.rule = d.srv.regle === 'bagarre' ? 'bagarre' : 'paisible'; NET.server.ouvert = !!d.srv.ouvert; }
      (d.casse || []).forEach((i) => { const pp = panels[i]; if (pp && pp.alive) destroyPanel(pp, true, null, true); });
      (d.vitres || []).forEach((i) => { const g = glasses[i]; if (g && g.alive) breakGlass(g, true); });
      (d.svitres || []).forEach((i) => { const g = shopGlass[i]; if (g && g.alive) breakGlass(g, true); });
      if (!!d.refuge !== refugeDoor.locked) toggleRefugeLock(true);
      (d.meubles || []).forEach((i) => { const pp = DESTR.pieces[i]; if (pp && pp.alive) breakPiece(pp, null, true, true); });
      (d.lampes || []).forEach((i) => { const h = LAMP_HEADS[i]; if (h && h.alive) breakLamp(h, null, true); });
      if (Array.isArray(d.moutons)) d.moutons.forEach((dead, i) => { if (SHEEP[i]) SHEEP[i].dead = !!dead; });
      M.kills = d.mk | 0;
      if (from === NET.hostId()) jukeFromState(d.juke);
      break;
    }
    case 'tir': if (d && arr(d.a, 3) && arr(d.b, 3)) { const a = new V3(...d.a), b = new V3(...d.b); spawnTracer(a, b, d.w === 2 ? HDR('#ffb8f0', 6) : null, d.w === 2 ? 0.05 : 0.025, d.w === 2 ? 700 : 420); sGun(['smg', 'fusil', 'sniper'][d.w] || 'smg', a); spawnSpark(b.x, b.y, b.z, rnd(-2, 2), rnd(0, 3), rnd(-2, 2), 0.4); } break;
    case 'laser': if (d && arr(d.a, 3) && arr(d.b, 3)) { p.beam = { a: new V3(...d.a), b: new V3(...d.b) }; p.beamT = 0.25; if (Math.random() < 0.3) sLaserRemote(p.beam.a); } break;
    case 'casse': if (d && panels[d.p]) destroyPanel(panels[d.p], true); break;
    case 'vitre': if (d) { const g = d.m ? shopGlass[d.g] : glasses[d.g]; if (g) breakGlass(g, true); } break;
    case 'palme': if (d && CROWNS[d.i]) shakePalm(d.i, clamp(d.n | 0, 1, 20), d.s | 0, true); break;
    case 'moutonHit': if (NET.isHost() && d && SHEEP[d.i] && !SHEEP[d.i].dead) { SHEEP[d.i].hp += Math.min(10, +d.d || 0); if (SHEEP[d.i].hp >= 5) explodeSheep(d.i, false); } break;
    case 'moutonMort': if (d && SHEEP[d.i]) explodeSheep(d.i, true); break;
    case 'moutonNe': if (d && SHEEP[d.i]) { const s = SHEEP[d.i]; s.dead = false; s.scale = 0.01; s.x = s.ix = +d.x || s.x; s.z = s.iz = +d.z || s.z; for (let k = 0; k < 12; k++) spawnSpark(s.x, 0.5, s.z, rnd(-2, 2), rnd(1, 3), rnd(-2, 2), 0.7); } break;
    case 'moutons': if (!NET.isHost() && Array.isArray(d)) for (let i = 0; i < SHEEP.length; i++) { const s = SHEEP[i], k = i * 4; if (d[k] === undefined) break; s.ix = d[k]; s.iz = d[k + 1]; s.iyaw = d[k + 2]; s.st = ['erre', 'broute', 'regarde'][d[k + 3]] || 'erre'; s.spd = s.st === 'erre' ? 0.85 : 0; } break;
    case 'monstre': if (!NET.isHost() && arr(d, 7)) {
      M.ix = d[0]; M.iz = d[1]; M.iyaw = d[2];
      const st = ['hunt', 'form', 'dead'][d[3]] || 'hunt';
      if (st === 'form' && M.state !== 'form') { M.pos.x = d[0]; M.pos.z = d[1]; M.stateT = 0; M.form = 0; }
      if (st !== 'dead') M.state = st;
      M.hp = d[5];
      if (d[6] > 0 && M.atk <= 0) { M.atk = 0.0001; sAttack(M.pos); }
    } break;
    case 'monstreHit': if (NET.isHost() && d && M.state === 'hunt') { M.hp -= Math.min(120, +d.d || 0); M.jiggle = Math.min(1.2, M.jiggle + 0.35); M.flash = 0.6; if (M.hp <= 0) killMonster(from, true); } break;
    case 'monstreMort': if (d) killMonster(String(d.k), 'net', { p: d.p | 0 }); break;
    case 'monstreNe': if (d && SPAWNS[d.i]) { M.pos.set(SPAWNS[d.i][0], 0, SPAWNS[d.i][1]); M.ix = M.pos.x; M.iz = M.pos.z; M.state = 'form'; M.stateT = 0; M.form = 0; M.hp = 100; sForm(); showStatut(true); } break;
    case 'eclabousse': if (d) hurtPlayer({ x: +d.x || 0, z: +d.z || 0 }, 34, 'monstre'); break;
    case 'touche': if (NET.rule === 'bagarre' && d && !P.dead) { NET.lastHitBy = from; const pp = NET.peers.get(from); hurtPlayer(pp ? { x: pp.x, z: pp.z } : P.pos, Math.min(150, +d.d || 0), 'joueur'); if (!P.mortal && P.hp - (+d.d || 0) <= 0) { /* immortel : simple éclaboussure */ } } break;
    case 'mort': addFeed((d && d.par && d.par !== 'monstre' ? NET.nameOf(d.par) + ' a dissous ' : 'Le Revenant a dissous ') + NET.nameOf(from)); break;
    case 'refuge': if (d && (!!d.l) !== refugeDoor.locked) toggleRefugeLock(true); break;
    case 'meuble': if (d && DESTR.pieces[d.i | 0]) breakPiece(DESTR.pieces[d.i | 0], null, false, true); break;
    case 'lampe': if (d && LAMP_HEADS[d.i | 0]) breakLamp(LAMP_HEADS[d.i | 0], null, true); break;
    case 'voiture': if (d && CARS[d.i | 0]) hitCar(CARS[d.i | 0], true); break;
    case 'juke': jukeOnNet(d, from); break;
    case 'chatDem': onChatRequest(from); break;
    case 'chatRep': onChatReply(from, d && d.ok, d && d.occupe); break;
    case 'chatMsg': onChatMessage(from, d); break;
    case 'chatFin': if (CHAT.peer === from) { addChatLine('sys', NET.nameOf(from) + ' a quitté la discussion.'); setTimeout(() => closeChat(true), 1500); } break;
    case 'plein': toast('Ce serveur est complet. Retour au monde local.'); leaveServer(); break;
    case 'pc': {
      const on = d ? d.on | 0 : 0;
      // 1 : aspiré dans l'ordinateur ; 2 : recraché ; 0 : de retour
      if (on === 1 && !p.inPC) p.pcAnim = { k: 'in', t: 0, x: p.x, y: p.y, z: p.z };
      if (on === 2) p.pcAnim = { k: 'out', t: 0 };
      p.inPC = on === 1;
      break;
    }
  }
}
// animation vue par les autres : le rêveur est aspiré dans l'écran du vieil ordinateur, puis recraché
function animatePeerPC(p, dt) {
  const a = p.pcAnim, g = p.av.g; a.t += dt;
  const sx = PC_POS.x + 0.05, sy = PC_POS.y - 0.5, sz = PC_POS.z;
  if (a.k === 'in') {
    const k = Math.min(1, a.t / 1.6), e = easeInOut(k);
    g.position.set(lerp(a.x, sx, e), lerp(a.y, sy, e) + Math.sin(k * Math.PI) * 0.5, lerp(a.z, sz, e));
    g.rotation.set(0, p.yaw + Math.PI + e * e * 12, e * 0.6); g.scale.setScalar(Math.max(0.02, 1 - e * 0.98));
    if (Math.random() < 0.5) spawnSpark(g.position.x, g.position.y + 0.8 * (1 - e), g.position.z, (sx - g.position.x) * 3, rnd(-0.5, 0.5), (sz - g.position.z) * 3, 0.4);
    if (a.t > 0.02 && a.t - dt <= 0.02) sAbsorbAt(g.position);
    if (k >= 1) { p.pcAnim = null; g.scale.setScalar(1); g.visible = false; }
  } else {
    const k = Math.min(1, a.t / 1.5), e = easeOut(k);
    const tx = p.inPC ? PC_POS.x + 2.6 : p.x, tz = p.inPC ? PC_POS.z + 0.6 : p.z, ty = RFB;
    g.position.set(lerp(sx, tx, e), lerp(sy, ty, e) + Math.sin(k * Math.PI) * 1.2, lerp(sz, tz, e));
    g.rotation.set(Math.sin(k * Math.PI) * 0.5, p.yaw + Math.PI + (1 - e) * Math.PI * 4, (1 - e) * 0.8); g.scale.setScalar(0.05 + e * 0.95);
    if (Math.random() < 0.6) spawnSpark(sx, sy + 0.3, sz, rnd(1, 4), rnd(-1, 2), rnd(-2, 2), 0.5);
    if (a.t > 0.02 && a.t - dt <= 0.02) { sEjectAt(g.position); for (let i = 0; i < 24; i++) spawnSpark(sx + 0.1, sy + 0.4, sz, rnd(0.5, 4), rnd(-1, 3), rnd(-2.5, 2.5), rnd(0.4, 0.9)); flashAt(sx + 0.3, sy + 0.5, sz); }
    if (k >= 1) { p.pcAnim = null; p.pcGrace = performance.now() + 1500; g.rotation.set(0, p.yaw + Math.PI, 0); g.scale.setScalar(1); }
  }
}
function nearestPeer(maxD) {
  let best = null, bd = maxD;
  for (const p of NET.peers.values()) { if (!p.nom || p.inPC || CHAT.blocked.has(p.id)) continue; const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (d < bd && Math.abs(p.y - P.pos.y) < 3) { bd = d; best = p; } }
  return best;
}
function rayPlayers(o, d, best, res) {
  if (!NET.on) return best;
  for (const p of NET.peers.values()) {
    if (!p.av || !p.av.g.visible || p.inPC || (p.flags & 16)) continue;
    for (const [hy, r] of [[0.7, 0.36], [1.15, 0.32], [1.45, 0.3]]) { const t = raySphere(o, d, p.x, p.y + hy, p.z, r); if (t < best) { best = t; res.t = t; res.kind = 'joueur'; res.peer = p.id; res.n.set(-d.x, -d.y, -d.z); } }
  }
  return best;
}
function allPlayers() {
  const list = [localPlayerPos()];
  for (const p of NET.peers.values()) if (p.nom && p.buf.length) list.push({ x: p.x, y: p.y, z: p.z, id: p.id, local: false, dead: !!(p.flags & 16), inPC: !!(p.flags & 8) || p.inPC });
  return list;
}
function updateNet(dt) {
  if (!NET.on) return;
  const wall = performance.now();
  if (wall >= NET.posT) {
    NET.posT = wall + 1000 / 12;
    const f = (WPN.firing ? 1 : 0) | (P.swim ? 2 : 0) | (P.aiming ? 4 : 0) | (P.inPC ? 8 : 0) | (P.dead ? 16 : 0) | (Math.hypot(P.vel.x, P.vel.z) > 0.5 ? 32 : 0) | (P.onGround ? 0 : 64) | (JET.has ? 128 : 0) | (JET.thrust ? 256 : 0);
    NET.send('pos', [P.pos.x, P.pos.y, P.pos.z, P.yaw, P.pitch, WPN.cur, f, Math.round(P.hp)].map((v, i) => i < 5 ? Math.round(v * 100) / 100 : v));
  }
  if (NET.isHost()) {
    if (wall >= NET.worldT) {
      NET.worldT = wall + 100;
      NET.send('monstre', [Math.round(M.pos.x * 100) / 100, Math.round(M.pos.z * 100) / 100, Math.round(M.yaw * 100) / 100, M.state === 'hunt' ? 0 : M.state === 'form' ? 1 : 2, Math.round(M.form * 100) / 100, Math.round(M.hp), M.atk > 0 ? 1 : 0]);
      NET.sheepT = (NET.sheepT || 0) + 1;
      if (NET.sheepT % 2 === 0) { const a = []; for (const s of SHEEP) a.push(Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10, Math.round(s.yaw * 100) / 100, s.st === 'erre' ? 0 : s.st === 'broute' ? 1 : 2); NET.send('moutons', a); }
    }
    if (NET.server.ouvert && NET.lobby) { if (wall >= NET.annT) { NET.annT = wall + 2500; NET.lobby.send('annonce', { sid: NET.server.sid, nom: NET.server.nom, regle: NET.rule, n: NET.peers.size + 1, max: NET.server.max || 8 }); } }
  } else if (NET.server.ouvert && !NET.lobby && NET.isHost()) openLobby();
  // avatars des autres
  const renderT = performance.now() - 130;
  for (const p of NET.peers.values()) {
    if (!p.av || !p.buf.length) continue;
    let a = p.buf[0], b = p.buf[p.buf.length - 1];
    for (let i = 0; i < p.buf.length - 1; i++) if (p.buf[i].t <= renderT && p.buf[i + 1].t >= renderT) { a = p.buf[i]; b = p.buf[i + 1]; break; }
    const k = b.t > a.t ? clamp((renderT - a.t) / (b.t - a.t), 0, 1) : 1;
    const ox = p.x, oz = p.z;
    p.x = lerp(a.x, b.x, k); p.y = lerp(a.y, b.y, k); p.z = lerp(a.z, b.z, k);
    let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
    p.yaw = a.yaw + dy * k; p.pitch = lerp(a.pitch, b.pitch, k); p.flags = b.f; p.w = b.w;
    const spd = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-3);
    p.av.g.visible = ((!(p.flags & 8) || performance.now() < (p.pcGrace || 0)) && !p.inPC) || !!p.pcAnim;
    if (!p.pcAnim) p.av.g.scale.setScalar(1);
    if (!p.pcAnim) { p.av.g.position.set(p.x, p.y, p.z); p.av.g.rotation.y = p.yaw + Math.PI; }
    if (p.flags & 16) { p.av.g.rotation.z = damp(p.av.g.rotation.z, 1.4, 4, dt); } else p.av.g.rotation.z = 0;
    animateAvatar(p.av, dt, { speed: Math.min(6, spd), pitch: p.pitch, swim: !!(p.flags & 2), air: !!(p.flags & 64), firing: !!(p.flags & 1), w: p.w });
    if (p.pcAnim) animatePeerPC(p, dt);
    if (p.av.jet) { p.av.jet.visible = !!(p.flags & 128); const fl = !!(p.flags & 256); for (const f of p.av.jet.userData.flames) { f.visible = fl; if (fl) f.scale.set(1, 0.8 + Math.random() * 0.5, 1); } if (fl && Math.random() < 0.5) spawnPuff(_v3.set(p.x + Math.sin(p.yaw) * 0.3, p.y + 0.2, p.z + Math.cos(p.yaw) * 0.3), HDR('#ff9fe0', 2), 0.15, 0.3, -3, true); }
    if (p.beamT > 0) {
      p.beamT -= dt;
      if (!p.beamObj) p.beamObj = makeBeam();
      placeBeam(p.beamObj, p.beam.a, p.beam.b, 0.8);
    } else if (p.beamObj) p.beamObj.g.visible = false;
  }
}
