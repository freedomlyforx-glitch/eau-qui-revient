/* =========================================================
   L'ordinateur rétro du refuge : aspiré dans la première version du jeu,
   puis recraché
   ========================================================= */
const PC = { phase: null, t: 0, from: new V3(), fromYaw: 0, fromPitch: 0, frame: null };
const PC_FRONT = new V3(PC_POS.x + 0.42, PC_POS.y, PC_POS.z);
/* ---------- l'ordinateur propose de choisir une version du jeu ---------- */
const PCMENU = { open: false };
function openVersions() {
  if (PCMENU.open || PC.phase) return;
  PCMENU.open = true; PCMENU.t = performance.now(); P.ui = true; WPN.firing = false; P.aiming = false;
  for (const k in keys) keys[k] = false;
  $('choixVersion').hidden = false;
  $('versionsPied').textContent = DEVICE === 'mobile' ? 'Touche une version · touche à côté pour fermer' : 'Clique sur une version, ou appuie sur 1 ou 2 · Échap pour fermer';
  if (document.pointerLockElement) { CHAT.wantUnlock = true; document.exitPointerLock(); }
  sPing();
  setTimeout(() => { try { $('vPremiere').focus({ preventScroll: true }); } catch (e) {} }, 60);
}
function closeVersions(relock) {
  if (!PCMENU.open) return;
  PCMENU.open = false; P.ui = false; $('choixVersion').hidden = true;
  if (relock && DEVICE !== 'mobile') requestLock(); else if (DEVICE !== 'mobile') toast('Clique pour reprendre la visée');
}
function pickVersion(n) {
  if (!PCMENU.open) return;
  if (n === 1) { closeVersions(true); toast('Tu restes dans la version principale'); return; }
  closeVersions(false); enterPC();
}
// le toucher qui ouvre le menu ne doit pas choisir une version par la même occasion
const pcFresh = () => performance.now() - (PCMENU.t || 0) < 450;
$('vPrincipale').addEventListener('click', () => { if (!pcFresh()) pickVersion(1); });
$('vPremiere').addEventListener('click', () => { if (!pcFresh()) pickVersion(2); });
$('choixVersion').addEventListener('pointerdown', (e) => { if (e.target === $('choixVersion') && !pcFresh()) closeVersions(DEVICE !== 'mobile'); });
$('pcSortir').addEventListener('click', () => exitPC());
function enterPC() {
  if (PC.phase) return;
  PC.phase = 'aspire'; PC.t = 0; P.inPC = true; WPN.firing = false; P.aiming = false;
  if (WPN.beamOn) { WPN.beamOn = false; laserStop(false); myBeam.g.visible = false; }
  PC.from.copy(camera.position); PC.fromYaw = P.yaw; PC.fromPitch = P.pitch;
  sAbsorb(); $('invite').classList.remove('montre');
  if (NET.on) NET.send('pc', { on: 1 });
}
function showPCFrame() {
  const wrap = $('pc'); wrap.innerHTML = '';
  const fr = document.createElement('iframe'); fr.src = 'v1.html?pc=1' + (DEVICE === 'mobile' ? '&tactile=1' : ''); fr.title = 'L’eau qui revient, première version'; fr.allow = 'fullscreen; autoplay';
  wrap.append(fr);
  $('pcBandeau').hidden = false;
  wrap.hidden = false; wrap.classList.remove('eteint'); wrap.classList.add('allume');
  PC.frame = fr;
  if (document.pointerLockElement) { CHAT.wantUnlock = true; document.exitPointerLock(); }
  if (AU.ctx) AU.ctx.suspend();
  setTimeout(() => { try { fr.focus(); } catch (e) {} }, 600);
}
addEventListener('message', (e) => { if (PC.frame && e.source === PC.frame.contentWindow && e.data && e.data.type === 'quitter-pc') exitPC(); });
function exitPC() {
  if (PC.phase !== 'dedans') return;
  PC.phase = 'sortie';
  $('pcBandeau').hidden = true;
  const wrap = $('pc'); wrap.classList.remove('allume'); wrap.classList.add('eteint');
  if (AU.ctx) AU.ctx.resume();
  setTimeout(() => {
    wrap.hidden = true; wrap.innerHTML = ''; PC.frame = null;
    PC.phase = 'ejecte'; PC.t = 0; sEject(); flashFx = 0.5;
    if (NET.on) NET.send('pc', { on: 2 });
    P.pos.set(PC_POS.x + 2.6, RFB, PC_POS.z + 0.6); P.vel.set(0, 0, 0); P.yaw = Math.PI / 2 + 0.9; P.pitch = 0;
  }, 450);
}
const _pcLook = new V3();
function updatePC(dt) {
  PC.t += dt;
  const fu = finalPass.uniforms;
  if (PC.phase === 'aspire') {
    const k = Math.min(1, PC.t / 1.7), e = easeInOut(k);
    camera.position.lerpVectors(PC.from, PC_FRONT, e);
    camera.lookAt(_pcLook.copy(PC_POS));
    camera.rotation.z += e * e * 2.5;
    camera.fov = lerp(75, 26, e); camera.updateProjectionMatrix();
    fu.uWarp.value = e * 0.9; fu.uPix.value = Math.max(0, (e - 0.55) / 0.45) * 0.8;
    if (Math.random() < 0.6) spawnSpark(camera.position.x + rnd(-0.4, 0.4), camera.position.y + rnd(-0.4, 0.4), camera.position.z + rnd(-0.4, 0.4), (PC_POS.x - camera.position.x) * 4, (PC_POS.y - camera.position.y) * 4, (PC_POS.z - camera.position.z) * 4, 0.3);
    if (k >= 1) { PC.phase = 'dedans'; fu.uWarp.value = 0; fu.uPix.value = 0; flashFx = 1; showPCFrame(); }
    return;
  }
  if (PC.phase === 'ejecte') {
    const k = Math.min(1, PC.t / 1.5), e = easeOut(k);
    // trajectoire en cloche, avec une pirouette
    const x = lerp(PC_FRONT.x, P.pos.x, e), z = lerp(PC_FRONT.z, P.pos.z, e);
    const y = lerp(PC_POS.y, P.pos.y + 1.62, e) + Math.sin(k * Math.PI) * 1.1 - (k > 0.85 ? Math.sin((k - 0.85) / 0.15 * Math.PI) * 0.25 : 0);
    camera.position.set(x, y, z);
    camera.rotation.set(lerp(-0.4, 0, e) + Math.sin(k * Math.PI) * 0.3, P.yaw + (1 - e) * Math.PI, (1 - e) * Math.PI * 2.2);
    camera.fov = lerp(28, 75, e); camera.updateProjectionMatrix();
    fu.uWarp.value = (1 - e) * 0.7;
    if (Math.random() < 0.5) spawnSpark(PC_POS.x + 0.1, PC_POS.y, PC_POS.z, rnd(1, 4), rnd(-1, 2), rnd(-2, 2), 0.5);
    if (k >= 1) { PC.phase = null; P.inPC = false; fu.uWarp.value = 0; P.shake = 0.6; P.land = 0.8; sLand(); if (NET.on) NET.send('pc', { on: 0 }); toast(DEVICE === 'mobile' ? 'Te revoilà dans le lotissement' : 'Clique pour reprendre la visée'); }
  }
}
canvas.addEventListener('click', () => { if (gameState === 'jeu' && !locked && DEVICE !== 'mobile' && !P.ui && !PC.phase) requestLock(); });
