/* =========================================================
   Joueur : déplacements, nage, trampolines, portes, interactions, vie
   ========================================================= */
const START = { x: 0, z: 9, yaw: 0 };
const P = { pos: new V3(START.x, 0, START.z), vel: new V3(), yaw: 0, pitch: 0, onGround: true, eyeY: 1.62, radius: 0.38, land: 0, roll: 0, shake: 0, fov: 75,
  swim: false, slide: null, underwater: false, hp: 100, dead: false, deadT: 0, regenT: 0, aiming: false, sprinting: false, inPC: false, ui: false, wasInWater: false, strokeT: 0, bubT: 0, mortal: false, warp: 0, lastStep: 0, prevPortal: null };
const keys = {};
let sens = parseFloat(store('sensi')) || 1;
let locked = false, gameState = 'accueil', kills = 0, playTime = 0;
let wet = 0, hurt = 0, killFx = 0, flashFx = 0, timeScale = 1, slowT = 0, hitmarkT = 0, hitmarkKill = false;
function localPlayerPos() { return { x: P.pos.x, y: P.pos.y, z: P.pos.z, local: true, id: NET.selfId, dead: P.dead, inPC: P.inPC }; }
/* ---------- entrées ---------- */
addEventListener('keydown', (e) => {
  if (PCMENU.open) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') pickVersion(1);
    else if (e.code === 'Digit2' || e.code === 'Numpad2') pickVersion(2);
    else if (e.code === 'Digit3' || e.code === 'Numpad3') pickVersion(3);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') pickVersion(document.activeElement === $('vPrincipale') ? 3 : document.activeElement === $('vPremiere') ? 2 : 1);
    else if (e.code === 'Escape' || e.code === 'KeyE') closeVersions(false);
    if (e.code !== 'Tab') e.preventDefault();
    return;
  }
  if (JUKE.menu) {
    const m = /^(Digit|Numpad)([0-9])$/.exec(e.code);
    if (m) { const n = +m[2]; if (n <= TRACKS.length) pickJuke(n); }
    else if (e.code === 'KeyS' || e.code === 'Backspace' || e.code === 'Delete') pickJuke(0);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { const a = document.activeElement; if (a && a.dataset && a.dataset.i) pickJuke(a.dataset.i | 0); else if (a === $('jukeStop')) pickJuke(0); }
    else if (e.code === 'Escape' || e.code === 'KeyE') closeJukeMenu(false);
    if (e.code !== 'Tab') e.preventDefault();
    return;
  }
  if (PC.phase === 'dedans' && e.code === 'KeyX') { exitPC(); return; }
  if (P.ui) { if (e.code === 'Escape') { closeChatInput(); e.preventDefault(); } return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (!$('demande').hidden) { if (e.code === 'KeyO' || e.code === 'KeyY') { answerChat(true); return; } if (e.code === 'KeyN') { answerChat(false); return; } }
  if (gameState !== 'jeu') return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyT') requestChatNearest();
  if (e.code === 'KeyP') togglePhoto();
  if (e.code === 'Escape' && PHOTO.on) togglePhoto();
  if (e.code === 'Enter' && CHAT.peer) { openChatInput(); e.preventDefault(); }
  if (e.code === 'KeyM') { VOL.coupeMusique = !VOL.coupeMusique; saveVolumes(); syncOptions(); }
  if (e.code === 'KeyF') { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); } catch (err) {} }
  if (e.code === 'ArrowUp' || e.code === 'ArrowRight') switchWeapon(WPN.cur + 1);
  if (e.code === 'ArrowDown' || e.code === 'ArrowLeft') switchWeapon(WPN.cur - 1);
  if (e.code >= 'Digit1' && e.code <= 'Digit4') switchWeapon(parseInt(e.code.slice(5), 10) - 1);
  if (e.code === 'Escape' && !locked) pauseGame();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
document.addEventListener('mousemove', (e) => {
  if (gameState !== 'jeu' || DEVICE === 'mobile' || P.inPC) return;
  if (!locked && !DEBUG) return;
  look(e.movementX || 0, e.movementY || 0);
});
function look(mx, my) {
  if (Math.abs(mx) > 400 || Math.abs(my) > 400) return;
  const w = curW(); const scoped = w.scope && WPN.ads > 0.8;
  const k = 0.0022 * sens * (1 - WPN.ads * 0.35) * (scoped ? 0.3 : 1);
  P.yaw -= mx * k; P.pitch = clamp(P.pitch - my * k, -1.45, 1.45);
  WPN.swx += mx * 0.00009; WPN.swy += my * 0.00009;
}
document.addEventListener('mousedown', (e) => { if (gameState !== 'jeu' || DEVICE === 'mobile' || P.inPC) return; if (!locked && !DEBUG) return; if (e.button === 0) { if (PHOTO.on) { PHOTO.snap = true; return; } WPN.firing = true; } if (e.button === 2) P.aiming = true; });
document.addEventListener('mouseup', (e) => { if (e.button === 0) WPN.firing = false; if (e.button === 2) P.aiming = false; });
document.addEventListener('wheel', (e) => { if (gameState !== 'jeu' || !locked) return; switchWeapon(WPN.cur + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && gameState === 'jeu' && DEVICE !== 'mobile' && !P.ui && !P.inPC && !CHAT.wantUnlock) pauseGame();
  CHAT.wantUnlock = false;
});
addEventListener('blur', () => { WPN.firing = false; P.aiming = false; for (const k in keys) keys[k] = false; });
function requestLock() { if (DEVICE === 'mobile') return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
/* ---------- interactions ---------- */
let interactHint = '';
function nearPC() { return refugeInside(P.pos.x, P.pos.z, P.pos.y) && P.pos.distanceTo(_v1.set(PC_POS.x, P.pos.y, PC_POS.z)) < 2.0; }
function interact() {
  if (P.ride) { leaveRide(); return; }
  if (nearPC()) { openVersions(); return; }
  const jb = nearJukebox(); if (jb) { openJukeMenu(jb); return; }
  if (nearBed()) { sleepInBed(); return; }
  if (actInteract()) return;
  if (nearRefugeDoor()) { const l = toggleRefugeLock(); toast(l ? 'Portes du refuge verrouillées : le Revenant ne peut plus entrer' : 'Portes du refuge déverrouillées'); }
}
function updateHint() {
  let h = '';
  if (P.ride) h = (DEVICE === 'mobile' ? 'ACTION' : 'E') + ' : descendre';
  else if (nearPC()) h = (DEVICE === 'mobile' ? 'ACTION' : 'E') + ' : allumer l’ordinateur et descendre dans un niveau du rêve';
  else if (nearJukebox()) h = (DEVICE === 'mobile' ? 'ACTION' : 'E') + (JUKE.cur ? ' : jukebox · en ce moment "' + TRACKS[JUKE.cur - 1].titre + '"' : ' : choisir un disque sur le jukebox');
  else if (nearBed()) h = (DEVICE === 'mobile' ? 'ACTION' : 'E') + (NIGHT.value > 0.5 ? ' : dormir jusqu’au retour du soleil' : ' : dormir jusqu’à la nuit');
  else if (actHint()) h = (DEVICE === 'mobile' ? 'ACTION' : 'E') + ' : ' + actHint();
  else if (nearRefugeDoor()) h = (DEVICE === 'mobile' ? 'ACTION' : 'E') + (refugeDoor.locked ? ' : déverrouiller les portes' : ' : verrouiller les portes du refuge');
  else { const n = nearestPeer(6); if (n && !CHAT.peer && !CHAT.pending) h = (DEVICE === 'mobile' ? 'PARLER' : 'T') + ' : proposer de discuter à ' + n.nom; }
  if (h !== interactHint) { interactHint = h; const el = $('invite'); el.textContent = h; el.classList.toggle('montre', !!h); }
  if (DEVICE === 'mobile') { $('tAction').hidden = !(P.ride || nearPC() || nearRefugeDoor() || nearJukebox() || nearBed() || actHint()); const td = $('tDiscute'), tdTxt = CHAT.pending ? 'OUI' : CHAT.peer ? 'ÉCRIRE' : 'PARLER'; td.hidden = !CHAT.peer && !CHAT.pending && !nearestPeer(6); if (td.textContent !== tdTxt) td.textContent = tdTxt; td.classList.toggle('ouvert', !!CHAT.peer); $('tPlonge').hidden = !P.swim; }
}
/* ---------- dégâts et mort ---------- */
function hurtPlayer(from, dmg, src) {
  if (P.dead || P.inPC) return;
  wet = 1; hurt = 1;
  _v1.set(P.pos.x - from.x, 0, P.pos.z - from.z); if (_v1.lengthSq() < 1e-6) _v1.set(0, 0, 1); _v1.normalize();
  if (src === 'monstre') {
    P.vel.x += _v1.x * 9; P.vel.z += _v1.z * 9; P.vel.y = 3.6; P.onGround = false;
    const head = camera.position;
    for (let i = 0; i < 26; i++) spawnDrop(head.x - _v1.x * 1.4 + rnd(-0.6, 0.6), head.y + rnd(-0.6, 0.3), head.z - _v1.z * 1.4 + rnd(-0.6, 0.6), rnd(-2.5, 2.5), rnd(0, 3), rnd(-2.5, 2.5), rnd(0.03, 0.06), 1.5);
  } else { P.vel.x += _v1.x * 2; P.vel.z += _v1.z * 2; wet = 0.3; }
  P.shake = 1; sHurt();
  if (P.mortal) { P.hp -= dmg; P.regenT = 5; updateVie(); if (P.hp <= 0) die(src); }
}
function die(src) {
  P.dead = true; P.deadT = 0; P.hp = 0; WPN.firing = false; P.aiming = false;
  $('mort').classList.add('montre'); $('mortTxt').textContent = 'Tu te reformes dans le refuge…';
  if (NET.on) NET.send('mort', { par: src === 'joueur' ? NET.lastHitBy : 'monstre' });
}
function respawnPlayer() {
  P.dead = false; P.hp = 100; updateVie(); $('mort').classList.remove('montre');
  P.pos.set(-136, RFB, -7); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0; P.slide = null; P.ride = null;
  wet = 0.4; flashFx = 0.3;
}
function shakeAt(x, z, k) { const d = Math.hypot(P.pos.x - x, P.pos.z - z); P.shake = Math.max(P.shake, k * clamp(1 - d / 40, 0, 1)); }
function updateVie() { $('vie').hidden = !P.mortal; $('vieBarre').style.transform = 'scaleX(' + clamp(P.hp / 100, 0, 1).toFixed(3) + ')'; }
/* ---------- portes lumineuses ---------- */
function checkPortals(prevX, prevZ) {
  for (const p of PORTALS) {
    if (p.cool > 0) continue;
    if (P.pos.y < p.y - 0.4 || P.pos.y > p.y + 1.6) continue;
    const a = portalLocal(p, prevX, prevZ), b = portalLocal(p, P.pos.x, P.pos.z);
    if (Math.abs(b[0]) < 0.55 && Math.abs(a[0]) < 0.75 && Math.sign(a[1]) !== Math.sign(b[1]) && Math.abs(b[1]) < 1) { teleport(p, b[1] > 0 ? 1 : -1); return; }
  }
}
function teleport(from, side) {
  const others = PORTALS.filter((q) => q !== from);
  const to = others[(Math.random() * others.length) | 0];
  const nx = Math.sin(to.a) * side, nz = Math.cos(to.a) * side;
  P.pos.set(to.x + nx * 1.4, to.y + 0.05, to.z + nz * 1.4); P.slide = null;
  P.yaw += (to.a - from.a);
  const hs = Math.hypot(P.vel.x, P.vel.z); P.vel.set(-Math.sin(P.yaw) * hs, 0, -Math.cos(P.yaw) * hs);
  to.cool = 1.2; from.cool = 1.2;
  P.warp = 1; sPortal(); flashFx = 0.25;
  for (let i = 0; i < 30; i++) spawnSpark(to.x + nx, to.y + 1.2, to.z + nz, rnd(-3, 3), rnd(-1, 3), rnd(-3, 3), 0.8);
}
/* ---------- mise à jour du déplacement ---------- */
const MOVE = { x: 0, y: 0 };  // manette tactile
function updatePlayer(dt) {
  if (P.dead) {
    P.deadT += dt; P.vel.multiplyScalar(0.9);
    camera.position.set(P.pos.x, P.pos.y + lerp(1.62, 0.5, Math.min(1, P.deadT)), P.pos.z);
    camera.rotation.set(P.pitch * (1 - Math.min(1, P.deadT)) - Math.min(1, P.deadT) * 0.6, P.yaw, Math.min(1, P.deadT) * 0.6);
    if (P.deadT > 3) respawnPlayer();
    return { sprint: false, moving: false, bobAmt: 0 };
  }
  if (P.ride) return updateRide(dt);
  if (P.mortal && P.hp < 100) { P.regenT -= dt; if (P.regenT <= 0) { P.hp = Math.min(100, P.hp + 14 * dt); updateVie(); } }
  const typing = P.ui;
  let fwd = typing ? 0 : (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  let str = typing ? 0 : (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (DEVICE === 'mobile') { fwd = -MOVE.y; str = MOVE.x; }
  const sprintKey = DEVICE === 'mobile' ? Math.hypot(MOVE.x, MOVE.y) > 0.92 : (keys.ShiftLeft || keys.ShiftRight);
  const pl = poolAt(P.pos.x, P.pos.z), surf = pl ? pl.surf : -99;
  const feet = P.pos.y;
  P.swim = !!pl && feet < surf - 0.95;
  const sprint = !P.swim && sprintKey && fwd > 0 && !WPN.firing && WPN.ads < 0.3 && !WPN.reloading;
  P.sprinting = sprint;
  let speed = P.swim ? (sprintKey ? 4.4 : 3.2) : sprint ? 8.6 : 5.4; speed *= lerp(1, 0.55, WPN.ads) * (P.bv || 1);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str;
  const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const jump = !typing && (keys.Space || TOUCH.jump);
  const dive = !typing && (keys.KeyC || keys.ControlLeft || TOUCH.dive);
  const prevX = P.pos.x, prevZ = P.pos.z, prevVy = P.vel.y, prevFeet = P.pos.y;
  // jetpack : un appui long sur le saut fait décoller
  JET.hold = jump ? JET.hold + dt : 0;
  const jetting = JET.has && jump && JET.hold > 0.2;
  JET.thrust = jetting && !P.swim;
  if (P.swim) {
    const acc = 3.5;
    P.vel.x = damp(P.vel.x, wx * speed, acc, dt); P.vel.z = damp(P.vel.z, wz * speed, acc, dt);
    const floatFeet = surf + 0.42 - 1.62;
    if (dive) P.vel.y -= 11 * dt; else if (jump) P.vel.y += 10 * dt; else P.vel.y += (floatFeet - feet) * 7 * dt;
    // regarder vers le haut ou le bas fait aussi nager dans cette direction
    if (fwd > 0 && Math.abs(P.pitch) > 0.35) P.vel.y += Math.sin(P.pitch) * 6 * dt * fwd;
    P.vel.y *= 1 - Math.min(1, 2.6 * dt);
    P.strokeT -= dt; if (wl > 0.2 && P.strokeT <= 0) { P.strokeT = 0.75; sNage(); if (!P.underwater && pl) spawnRipple(pl, P.pos.x, P.pos.z, 0.5); }
    if (jetting && JET.hold > 0.35) P.vel.y = Math.max(P.vel.y, 7.5);
  } else if (P.slide) {
    // toboggan : on file le long de la gouttière, le pouce ne fait que se décaler
    const sg = P.slide;
    let along = P.vel.x * sg.ux + P.vel.z * sg.uz;
    along = clamp(along + (13 * sg.slope / Math.sqrt(1 + sg.slope * sg.slope) + 0.8) * dt, 2.5, 17);
    const lat = (P.pos.x - sg.ax) * sg.nx + (P.pos.z - sg.az) * sg.nz;
    const vl = damp(P.vel.x * sg.nx + P.vel.z * sg.nz, str * 2 - lat * 5, 6, dt);
    P.vel.x = sg.ux * along + sg.nx * vl; P.vel.z = sg.uz * along + sg.nz * vl;
    P.vel.y = -along * sg.slope;
    P.roll = damp(P.roll, -vl * 0.05, 6, dt);
    if (jump && JET.hold < 0.05) { P.vel.y += 6.1; P.onGround = false; P.slide = null; }
  } else {
    const acc = P.onGround ? 11 : jetting ? 5.5 : JET.has ? 3.4 : 2.5;
    const spd = jetting ? (sprintKey ? 16 : 10.5) : speed;
    P.vel.x = damp(P.vel.x, wx * spd, acc, dt); P.vel.z = damp(P.vel.z, wz * spd, acc, dt);
    if (jump && P.onGround && (!JET.has || JET.hold < 0.05)) { P.vel.y = lastFloor && lastFloor.springy ? 9.5 : 6.1 * (P.bj || 1); P.onGround = false; if (lastFloor && lastFloor.springy) sBoing(3); if (lastFloor && lastFloor.board) lastFloor.board.v += 2.2; }
    if (jetting) { P.vel.y = Math.min(P.vel.y + (P.pos.y > 74 ? 8 : 38) * dt, P.pos.y > 80 ? 0.5 : 12); P.onGround = false; }
    P.vel.y -= (pl && feet < surf ? 6 : 19) * dt;
    if (pl && feet < surf) P.vel.y *= 1 - Math.min(1, 3 * dt);
  }
  P.pos.addScaledVector(P.vel, dt);
  // bords de piscine : on ne traverse pas les parois sous le niveau de la plage
  if (pl && !pl.sea && P.pos.y < (pl.y || 0) + (pl.blob ? -0.42 : -0.05)) {
    const hitWall = poolClamp(pl, P.pos, P.radius);
    if (hitWall && P.swim && P.pos.y + 1.62 > surf - 0.1 && (jump || fwd > 0) && P.vel.y < 4) { P.vel.y = 7.6; sNage(); }
  } else if (!pl && prevX !== undefined) {
    const prevPool = poolAt(prevX, prevZ);
    if (prevPool && !prevPool.sea && P.pos.y < (prevPool.y || 0) + (prevPool.blob ? -0.42 : -0.05)) poolClamp(prevPool, P.pos, P.radius);
  }
  // atterrissage d'abord : à grande vitesse, on peut passer sous le dessus d'une plateforme en une seule image
  if (P.vel.y <= 0) { const gPre = groundAt(P.pos.x, P.pos.z, Math.max(P.pos.y, prevFeet)); if (P.pos.y < gPre && prevFeet >= gPre - 0.05) P.pos.y = gPre; }
  collide(P.pos, P.radius, P.pos.y + 0.01, 1.74, W_PLAYER);
  // digue et falaises : trop raide pour grimper à pied
  if (!(pl && !pl.sea) && !jetting && P.pos.y <= TH(prevX, prevZ) + 0.3 && tooSteep(prevX, prevZ, P.pos.x, P.pos.z)) { P.pos.x = prevX; P.pos.z = prevZ; }
  bigBallsPlayer(jump);
  // moutons, monstre, autres joueurs : on se pousse
  for (const s of SHEEP) { if (s.dead) continue; const dx = P.pos.x - s.x, dz = P.pos.z - s.z, d = Math.hypot(dx, dz); if (d < 0.85 && d > 0.001 && Math.abs(P.pos.y - (s.gy || 0)) < 1.2) { P.pos.x = s.x + dx / d * 0.85; P.pos.z = s.z + dz / d * 0.85; } }
  if (M.state !== 'dead' && M.form > 0.5) { const dx = P.pos.x - M.pos.x, dz = P.pos.z - M.pos.z, d = Math.hypot(dx, dz); if (d < 1.2 && d > 0.001 && Math.abs(P.pos.y - M.gy) < 2) { P.pos.x = M.pos.x + dx / d * 1.2; P.pos.z = M.pos.z + dz / d * 1.2; } }
  P.pos.x = clamp(P.pos.x, BOUNDS.x0, BOUNDS.x1); P.pos.z = clamp(P.pos.z, BOUNDS.z0, BOUNDS.z1);
  let gy = groundAt(P.pos.x, P.pos.z, P.pos.y + (P.slide ? 0.5 : 0));
  const fl = lastFloor;
  // collé au toboggan dans les courbes
  if (P.slide && fl && fl.slide && P.pos.y > gy && P.pos.y - gy < 0.6 && P.vel.y <= 0.5) P.pos.y = gy;
  if (P.pos.y <= gy) {
    if (fl && fl.board && P.vel.y < -2.5) {
      P.vel.y = Math.min(14.5, -P.vel.y * (jump ? 0.85 : 0.5) + (jump ? 5 : 0.6)); P.pos.y = gy; P.onGround = false;
      fl.board.v += Math.min(4, 1.2 + P.vel.y * 0.25); sBoing(P.vel.y * 0.7);
    } else if (fl && fl.tramp !== undefined && P.vel.y < -0.5) {
      const tr = TRAMPS[fl.tramp]; tr.dip = Math.min(1, -P.vel.y / 14);
      P.vel.y = clamp(-P.vel.y * 0.9 + 7 + (jump ? 3 : 0), 13, 23); P.pos.y = gy; P.onGround = false;
      sBoing(P.vel.y); spawnRing(tr.d.x, tr.top + 0.02, tr.d.z, 0.4, 2.4, 0.6, HDR('#ffd0f0', 1.4));
    } else {
      if (!P.onGround && P.vel.y < -4 && !P.swim) { P.land = Math.min(1, -P.vel.y / 12); sLand(); }
      P.pos.y = gy; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true;
    }
  } else if (P.pos.y - gy > 0.05) P.onGround = false;
  else if (P.vel.y <= 0) { P.pos.y = gy; P.onGround = true; }
  const wasSlide = !!P.slide;
  P.slide = P.onGround && fl && fl.slide ? fl : null;
  if (P.slide && !wasSlide) sWhee();
  slideSound(P.slide ? Math.hypot(P.vel.x, P.vel.z) : 0);
  // entrée dans l'eau
  const inWater = !!pl && P.pos.y < surf - 0.1;
  if (inWater && !P.wasInWater) {
    const power = clamp(-prevVy / 10, 0.2, 1.5);
    sPlouf(power, P.pos);
    for (let i = 0; i < 26 * power + 8; i++) spawnDrop(P.pos.x + rnd(-0.5, 0.5), surf + 0.05, P.pos.z + rnd(-0.5, 0.5), rnd(-2, 2), rnd(2, 6) * power + 1, rnd(-2, 2), rnd(0.03, 0.07), 1.6);
    spawnRing(P.pos.x, surf + 0.01, P.pos.z, 0.2, 2.6 * power + 0.6, 1.0); spawnRipple(pl, P.pos.x, P.pos.z, 1.6 * power + 0.4);
    if (power > 0.6) wet = Math.max(wet, 0.6);
  }
  if (!inWater && P.wasInWater) { wet = Math.max(wet, 0.55); }
  P.wasInWater = inWater;
  checkPortals(prevX, prevZ);
  const hs = Math.hypot(P.vel.x, P.vel.z);
  const moving = P.onGround && hs > 0.5;
  if (moving) {
    WPN.bob += dt * hs * 1.25;
    const ph = Math.floor(WPN.bob / Math.PI);
    if (ph !== P.lastStep && !P.slide) { P.lastStep = ph; sStep(fl ? (fl.tramp !== undefined ? 'nuage' : fl.nuage ? 'nuage' : fl.bois || (fl.top >= 0.3 && fl.top < 0.4) ? 'bois' : 'dur') : (onRoadXZ(P.pos.x, P.pos.z) ? 'route' : P.pos.z > 0 && P.pos.z < PROM.z1 && P.pos.x > PROM.x0 && P.pos.x < PROM.x1 ? 'dur' : 'herbe')); }
  }
  P.eyeY = damp(P.eyeY, P.pos.y + 1.62, 18, dt);
  P.land = damp(P.land, 0, 7, dt);
  const bobAmt = (moving ? Math.min(1, hs / 5) : 0) * (reduceMotion ? 0.3 : 1) * lerp(1, 0.25, WPN.ads);
  P.roll = damp(P.roll, -(P.vel.x * cy - P.vel.z * sy) * 0.004, 8, dt);
  const shake = reduceMotion ? 0 : P.shake;
  const swimBob = P.swim ? Math.sin(clockU.value * 2.2) * 0.05 : 0;
  camera.position.set(P.pos.x, P.eyeY + Math.sin(WPN.bob * 2) * 0.04 * bobAmt - P.land * 0.12 + swimBob, P.pos.z);
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * 0.01 * shake, P.yaw + (Math.random() - 0.5) * 0.01 * shake, P.roll + (Math.random() - 0.5) * 0.02 * shake + (P.swim ? Math.sin(clockU.value * 1.6) * 0.03 : 0));
  P.shake = damp(P.shake, 0, 9, dt);
  // sous l'eau ?
  const under = !!pl && camera.position.y < surf;
  if (under !== P.underwater) { P.underwater = under; setUnderwater(under); }
  if (under) { P.bubT -= dt; if (P.bubT <= 0) { P.bubT = rnd(0.3, 0.9); for (let i = 0; i < 3; i++) spawnBubble(camera.position.x + rnd(-0.2, 0.2), camera.position.y - 0.2, camera.position.z + rnd(-0.2, 0.2), rnd(0.01, 0.03), surf); if (Math.random() < 0.5) sBulle(); } }
  const w = curW();
  const scoped = w.scope && WPN.ads > 0.8;
  const targetFov = scoped ? w.fov : lerp(sprint ? 80 : 75, w.scope ? 50 : w.fov, WPN.ads);
  P.fov = damp(P.fov, targetFov, scoped ? 14 : 10, dt);
  if (Math.abs(camera.fov - P.fov) > 0.01) { camera.fov = P.fov; camera.updateProjectionMatrix(); }
  P.warp = damp(P.warp, 0, 3.2, dt);
  return { sprint, moving, bobAmt };
}
function onRoadXZ(x, z) { return x > ROAD.x0 && x < ROAD.x1 && z > ROAD.z0 && z < ROAD.z1; }
