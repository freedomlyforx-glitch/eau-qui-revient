/* =========================================================
   Commandes tactiles : manette virtuelle, regard au doigt, boutons
   ========================================================= */
const TOUCH = { jump: false, dive: false, stick: null, look: new Map() };
{
  const zm = $('zoneMarche'), zv = $('zoneVue'), pad = $('manette'), knob = $('manetteBouton');
  zm.addEventListener('pointerdown', (e) => {
    if (TOUCH.stick) return;
    TOUCH.stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
    pad.style.left = e.clientX + 'px'; pad.style.top = e.clientY + 'px'; pad.style.opacity = '1';
    zm.setPointerCapture(e.pointerId); e.preventDefault();
  });
  zm.addEventListener('pointermove', (e) => {
    const s = TOUCH.stick; if (!s || s.id !== e.pointerId) return;
    let dx = (e.clientX - s.x) / 55, dy = (e.clientY - s.y) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    MOVE.x = dx; MOVE.y = dy; knob.style.transform = 'translate(' + (dx * 40) + 'px,' + (dy * 40) + 'px)';
  });
  const endStick = (e) => { const s = TOUCH.stick; if (!s || s.id !== e.pointerId) return; TOUCH.stick = null; MOVE.x = 0; MOVE.y = 0; knob.style.transform = ''; pad.style.opacity = '0'; };
  zm.addEventListener('pointerup', endStick); zm.addEventListener('pointercancel', endStick);
  zv.addEventListener('pointerdown', (e) => { TOUCH.look.set(e.pointerId, { x: e.clientX, y: e.clientY }); zv.setPointerCapture(e.pointerId); e.preventDefault(); });
  zv.addEventListener('pointermove', (e) => {
    const l = TOUCH.look.get(e.pointerId); if (!l || gameState !== 'jeu' || P.inPC) return;
    const dx = e.clientX - l.x, dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY;
    look(dx * 1.9, dy * 1.9);
  });
  const endLook = (e) => TOUCH.look.delete(e.pointerId);
  zv.addEventListener('pointerup', endLook); zv.addEventListener('pointercancel', endLook);
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('actif'); on(); }); const up = (e) => { b.classList.remove('actif'); if (off) off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); };
  hold('tTir', () => { WPN.firing = true; }, () => { WPN.firing = false; });
  hold('tSaut', () => { TOUCH.jump = true; }, () => { TOUCH.jump = false; });
  hold('tPlonge', () => { TOUCH.dive = true; }, () => { TOUCH.dive = false; });
  $('tViser').addEventListener('pointerdown', (e) => { e.preventDefault(); P.aiming = !P.aiming; $('tViser').classList.toggle('actif', P.aiming); });
  $('tArme').addEventListener('pointerdown', (e) => { e.preventDefault(); switchWeapon(WPN.cur + 1); });
  $('tRecharge').addEventListener('pointerdown', (e) => { e.preventDefault(); startReload(); });
  $('tAction').addEventListener('pointerdown', (e) => { e.preventDefault(); interact(); });
  $('tPause').addEventListener('pointerdown', (e) => { e.preventDefault(); pauseGame(); });
  // le clavier de la tablette ne s'ouvre que sur un vrai « clic » : on agit au clic, pas à l'appui
  $('tDiscute').addEventListener('pointerdown', (e) => { e.stopPropagation(); $('tDiscute').classList.add('actif'); });
  $('tDiscute').addEventListener('pointerup', () => $('tDiscute').classList.remove('actif'));
  $('tDiscute').addEventListener('click', (e) => { e.preventDefault(); if (CHAT.pending) { answerChat(true); return; } if (CHAT.peer) { P.ui = true; WPN.firing = false; const m = $('message'); m.focus(); try { m.setSelectionRange(m.value.length, m.value.length); } catch (err) {} return; } requestChatNearest(); });
  $('message').addEventListener('blur', () => { if (DEVICE === 'mobile') P.ui = false; });
}
