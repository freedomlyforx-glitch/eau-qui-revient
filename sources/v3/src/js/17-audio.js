/* =========================================================
   Son : musique de base, jukebox et bruitages (synthétisés en direct)
   ========================================================= */
const VOL = Object.assign({ musique: 0.7, armes: 0.8, effets: 0.85, coupeMusique: false, coupeArmes: false }, storeJSON('volumes', {}));
const AU = { ctx: null, on: false };
function makeImpulse(ctx, dur, decay) {
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}
function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); AU.ctx = ctx;
  const master = ctx.createGain(); master.gain.value = 0.9;
  const under = ctx.createBiquadFilter(); under.type = 'lowpass'; under.frequency.value = 20000; under.Q.value = 0.7;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  master.connect(under); under.connect(comp); comp.connect(ctx.destination);
  const reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(ctx, 3.6, 2.6);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.55; reverb.connect(verbOut); verbOut.connect(master);
  const music = ctx.createGain(), weapons = ctx.createGain(), fx = ctx.createGain();
  music.connect(master); weapons.connect(master); fx.connect(master);
  const musicVerb = ctx.createGain(); musicVerb.gain.value = 0.85; music.connect(musicVerb); musicVerb.connect(reverb);
  const wVerb = ctx.createGain(); wVerb.gain.value = 0.22; weapons.connect(wVerb); wVerb.connect(reverb);
  const fVerb = ctx.createGain(); fVerb.gain.value = 0.25; fx.connect(fVerb); fVerb.connect(reverb);
  const delay = ctx.createDelay(1.5); delay.delayTime.value = (60 / 84) * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.36; delay.connect(fb); fb.connect(delay);
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200; delay.connect(dlp);
  const delayOut = ctx.createGain(); delayOut.gain.value = 0.45; dlp.connect(delayOut); delayOut.connect(music);
  // musique de base (celle de la première version) : son propre bus, qui s'efface quand un jukebox joue
  const base = ctx.createGain(); base.gain.value = MUS.paused ? 0 : BASE_LVL;
  // voilée : un filtre doux et un peu plus de réverbération que le reste
  const baseLP = ctx.createBiquadFilter(); baseLP.type = 'lowpass'; baseLP.frequency.value = 1500; baseLP.Q.value = 0.3;
  base.connect(baseLP); baseLP.connect(music);
  const baseVerb = ctx.createGain(); baseVerb.gain.value = 0.7; baseLP.connect(baseVerb); baseVerb.connect(reverb);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  Object.assign(AU, { master, under, music, weapons, fx, reverb, delay, noise, base, on: true });
  applyVolumes();
  // gargouillis du monstre (spatialisé)
  const pan = ctx.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 4; pan.rolloffFactor = 1.4; pan.maxDistance = 140;
  const mg = ctx.createGain(); mg.gain.value = 0; mg.connect(pan); pan.connect(fx);
  const gsrc = ctx.createBufferSource(); gsrc.buffer = noise; gsrc.loop = true;
  const gbp = ctx.createBiquadFilter(); gbp.type = 'bandpass'; gbp.frequency.value = 500; gbp.Q.value = 6;
  gsrc.connect(gbp); gbp.connect(mg); gsrc.start();
  const drone = ctx.createGain(); drone.gain.value = 0.18; drone.connect(mg);
  for (const f of [110, 111.6, 164.8]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(drone); o.start(); }
  AU.mPan = pan; AU.mGain = mg; AU.mFilter = gbp;
  startMusic();
  jukeInitAudio();
}
function applyVolumes() {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  AU.music.gain.setTargetAtTime(VOL.coupeMusique ? 0 : VOL.musique * 0.32, t, 0.2);
  AU.weapons.gain.setTargetAtTime(VOL.coupeArmes ? 0 : VOL.armes * 0.95, t, 0.05);
  AU.fx.gain.setTargetAtTime(VOL.effets * 0.95, t, 0.05);
  jukeApplyVolume();
}
function saveVolumes() { store('volumes', VOL); applyVolumes(); }
function setUnderwater(on) { if (AU.under) AU.under.frequency.setTargetAtTime(on ? 650 : 20000, AU.ctx.currentTime, 0.08); }
// destination placée dans l'espace (atténuation + panoramique), calculée au départ du son
function spot(bus, pos, ref) {
  if (!pos) return bus;
  const ctx = AU.ctx, dx = pos.x - camera.position.x, dy = (pos.y || 0) - camera.position.y, dz = pos.z - camera.position.z;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz), r = ref || 6;
  const g = ctx.createGain(); g.gain.value = Math.min(1, r / Math.max(r, d)) * (d > 90 ? 0 : 1);
  const right = _v1.set(1, 0, 0).applyQuaternion(camera.quaternion);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = clamp((dx * right.x + dz * right.z) / Math.max(1, d), -1, 1) * 0.8; g.connect(p); p.connect(bus); } else g.connect(bus);
  return g;
}
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function noiseHit(dest, t, dur, type, f0, f1, peak, q) {
  const ctx = AU.ctx, n = ctx.createBufferSource(); n.buffer = AU.noise; n.playbackRate.value = rnd(0.85, 1.15);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); if (q) f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.003, peak, dur);
  n.connect(f); f.connect(g); g.connect(dest); n.start(t, rnd(0, 1.5), dur + 0.05);
}
function tone(dest, t, type, f0, f1, dur, peak, a) {
  const ctx = AU.ctx, o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); env(g, t, a || 0.004, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + (a || 0) + 0.05);
}
const now = () => AU.ctx.currentTime;
/* ---------- armes ---------- */
function sGun(kind, pos) {
  if (!AU.on) return; const t = now(), W = pos ? spot(AU.weapons, pos, 10) : AU.weapons;
  if (kind === 'smg') {
    noiseHit(W, t, 0.13, 'lowpass', 7500, 700, 0.8); noiseHit(W, t, 0.05, 'highpass', 3000, 2000, 0.25);
    tone(W, t, 'sine', 170, 42, 0.11, 0.75); tone(W, t, 'triangle', 1900, 900, 0.025, 0.08);
  } else if (kind === 'fusil') {
    noiseHit(W, t, 0.24, 'lowpass', 5200, 380, 1.0); noiseHit(W, t, 0.08, 'highpass', 2600, 1500, 0.3);
    tone(W, t, 'sine', 120, 34, 0.22, 1.0); tone(W, t + 0.01, 'square', 340, 120, 0.05, 0.06);
  } else if (kind === 'sniper') {
    noiseHit(W, t, 0.5, 'lowpass', 6000, 160, 1.2); noiseHit(W, t, 0.12, 'highpass', 3200, 1200, 0.4);
    tone(W, t, 'sine', 95, 26, 0.5, 1.1);
    noiseHit(AU.reverb, t + 0.02, 1.4, 'lowpass', 1600, 200, 0.5);
    noiseHit(W, t + 0.45, 0.8, 'bandpass', 900, 300, 0.12, 2);
  }
}
function sBolt(dt) { if (!AU.on) return; const t = now() + (dt || 0); noiseHit(AU.weapons, t, 0.05, 'bandpass', 2200, 1500, 0.3, 5); noiseHit(AU.weapons, t + 0.18, 0.05, 'bandpass', 2800, 2000, 0.3, 5); }
function sClick(f, v, dt) { if (!AU.on) return; const t = now() + (dt || 0); noiseHit(AU.weapons, t, 0.035, 'bandpass', f, f * 0.8, v, 4); tone(AU.weapons, t, 'square', f * 0.25, f * 0.2, 0.02, v * 0.15); }
function sSwitch() { if (!AU.on) return; const t = now(); noiseHit(AU.weapons, t, 0.06, 'bandpass', 1800, 1200, 0.18, 3); tone(AU.weapons, t + 0.06, 'sine', 900, 1500, 0.08, 0.05); }
const LASER = { nodes: null };
function laserStart() {
  if (!AU.on || LASER.nodes) return;
  const ctx = AU.ctx, t = now();
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.06);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 6;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
  o1.frequency.value = 220; o2.frequency.value = 222.5; o3.frequency.value = 880;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = 18; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.9; lg2.gain.value = 1400; lfo2.connect(lg2); lg2.connect(f.frequency);
  const og3 = ctx.createGain(); og3.gain.value = 0.25; o3.connect(og3); og3.connect(f);
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(AU.weapons);
  [o1, o2, o3, lfo, lfo2].forEach((o) => o.start(t));
  tone(AU.weapons, t, 'sine', 400, 1600, 0.12, 0.25);
  LASER.nodes = { g, f, o1, o2, o3, lfo, lfo2 };
}
function laserStop(over) {
  if (!LASER.nodes) return;
  const n = LASER.nodes, t = now(); LASER.nodes = null;
  n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(Math.max(0.0002, n.g.gain.value), t); n.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  [n.o1, n.o2, n.o3, n.lfo, n.lfo2].forEach((o) => o.stop(t + 0.15));
  tone(AU.weapons, t, 'sine', over ? 300 : 1200, over ? 80 : 300, over ? 0.5 : 0.15, over ? 0.3 : 0.15);
  if (over) noiseHit(AU.weapons, t, 0.6, 'highpass', 4000, 1500, 0.15);
}
function laserPitch(k) { if (LASER.nodes) { const f = 220 + k * 160; LASER.nodes.o1.frequency.setTargetAtTime(f, now(), 0.05); LASER.nodes.o2.frequency.setTargetAtTime(f * 1.012, now(), 0.05); } }
function sLaserRemote(pos) { if (!AU.on) return; const t = now(); tone(spot(AU.weapons, pos, 8), t, 'sawtooth', 240, 260, 0.12, 0.12, 0.01); }
/* ---------- monde ---------- */
function sTink(pos) { if (!AU.on) return; const t = now(), d = spot(AU.fx, pos, 3); tone(d, t, 'sine', rnd(4000, 5200), rnd(3800, 5000), 0.06, 0.03); tone(d, t + 0.01, 'sine', rnd(6000, 7000), 6000, 0.04, 0.015); }
function sSplash(vol, pitch, pos) {
  if (!AU.on) return; const t = now(), d = spot(AU.fx, pos, 6); pitch = pitch || 1;
  noiseHit(d, t, 0.18, 'bandpass', 2600 * pitch, 500, vol * 0.6, 1.2);
  tone(d, t + rnd(0, 0.03), 'sine', 380 * pitch * rnd(0.85, 1.2), 1250 * pitch, 0.06, vol * 0.32);
}
function sPlouf(power, pos) {
  if (!AU.on) return; const t = now(), d = spot(AU.fx, pos, 8);
  noiseHit(d, t, 0.5 + power * 0.3, 'lowpass', 3000, 300, 0.7 * power + 0.2);
  noiseHit(d, t + 0.05, 0.35, 'bandpass', 1800, 600, 0.35, 1.5);
  for (let i = 0; i < 6 + power * 6; i++) tone(d, t + rnd(0.05, 0.5), 'sine', rnd(300, 700), rnd(900, 1800), 0.06, 0.12);
}
function sNage() { if (!AU.on) return; const t = now(); noiseHit(AU.fx, t, 0.28, 'bandpass', rnd(900, 1300), 500, 0.18, 1.4); tone(AU.fx, t + 0.05, 'sine', rnd(500, 700), rnd(1000, 1300), 0.07, 0.05); }
function sBulle() { if (!AU.on) return; const t = now(); tone(AU.fx, t, 'sine', rnd(500, 900), rnd(1200, 2200), 0.05, 0.05); }
function sKill() {
  if (!AU.on) return; const t = now();
  noiseHit(AU.fx, t, 0.9, 'lowpass', 5000, 250, 1.0); tone(AU.fx, t, 'sine', 90, 28, 0.55, 0.8);
  for (let i = 0; i < 9; i++) tone(AU.fx, t + rnd(0.02, 0.6), 'sine', rnd(300, 600), rnd(900, 1600), 0.07, 0.18);
  [76, 79, 83, 86, 91].forEach((n, i) => { const f = midi(n); tone(AU.reverb, t + 0.12 + i * 0.085, 'sine', f, f, 1.3, 0.16, 0.01); tone(AU.fx, t + 0.12 + i * 0.085, 'triangle', f, f, 0.6, 0.05, 0.01); });
}
function sForm() {
  if (!AU.on) return; const ctx = AU.ctx, t = now();
  const n = ctx.createBufferSource(); n.buffer = AU.noise; n.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2400, t + 2.3);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 2.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  n.connect(f); f.connect(g); g.connect(AU.mPan); n.start(t); n.stop(t + 2.7);
  for (let i = 0; i < 3; i++) tone(AU.reverb, t + 0.4 + i * 0.5, 'sine', 330 * Math.pow(1.26, i), 660 * Math.pow(1.26, i), 0.9, 0.06, 0.3);
}
function sAttack(pos) { if (!AU.on) return; noiseHit(spot(AU.fx, pos, 6), now(), 0.5, 'lowpass', 600, 3000, 0.3); }
function sHurt() { if (!AU.on) return; const t = now(); noiseHit(AU.fx, t, 0.7, 'lowpass', 6000, 400, 1.0); tone(AU.fx, t, 'sine', 70, 35, 0.4, 0.6); for (let i = 0; i < 6; i++) tone(AU.fx, t + rnd(0, 0.4), 'sine', rnd(300, 500), rnd(800, 1400), 0.07, 0.2); }
function sStep(kind) { if (!AU.on) return; const t = now(); const m = { route: [1400, 500, 0.12], herbe: [700, 250, 0.09], bois: [1100, 300, 0.14], nuage: [500, 200, 0.05], dur: [1600, 600, 0.11] }[kind] || [1000, 400, 0.1]; noiseHit(AU.fx, t, 0.07, 'lowpass', m[0], m[1], m[2]); }
function sLand() { if (!AU.on) return; const t = now(); noiseHit(AU.fx, t, 0.14, 'lowpass', 900, 200, 0.25); tone(AU.fx, t, 'sine', 90, 50, 0.1, 0.25); }
function sGlass(x, y, z) {
  if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y, z }, 8);
  noiseHit(d, t, 0.35, 'highpass', 5000, 2500, 0.55); noiseHit(d, t, 0.12, 'bandpass', 3000, 1800, 0.4, 2);
  for (let i = 0; i < 9; i++) tone(d, t + rnd(0, 0.45), 'sine', rnd(2600, 6200), rnd(2400, 6000), rnd(0.05, 0.18), rnd(0.03, 0.09));
}
function sCrumble(x, y, z, size) {
  if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y, z }, 10 * size);
  noiseHit(d, t, 0.5 * size, 'lowpass', 2200, 120, 0.7 * Math.min(1.4, size)); tone(d, t, 'sine', 80, 30, 0.35 * size, 0.6 * Math.min(1.3, size));
  for (let i = 0; i < 5 * size; i++) noiseHit(d, t + rnd(0.05, 0.6 * size), 0.06, 'bandpass', rnd(600, 1500), 300, 0.2, 3);
}
function sRebuild(x, y, z) { if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y, z }, 14); [72, 76, 79, 84, 88, 91].forEach((n, i) => { tone(d, t + i * 0.12, 'sine', midi(n), midi(n), 1.2, 0.08, 0.02); tone(AU.reverb, t + i * 0.12, 'triangle', midi(n + 12), midi(n + 12), 0.8, 0.03, 0.02); }); }
function sDoor(x, z) { if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y: 1, z }, 4); noiseHit(d, t, 0.25, 'bandpass', 500, 300, 0.15, 6); tone(d, t, 'sawtooth', 160, 120, 0.25, 0.02); }
function sSlide(x, z) { if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y: 1, z }, 5); noiseHit(d, t, 0.5, 'bandpass', 900, 1300, 0.08, 2); tone(d, t, 'sine', 880, 880, 0.12, 0.05); tone(d, t + 0.13, 'sine', 1320, 1320, 0.18, 0.05); }
function sPin(x, z) { if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y: 0.5, z }, 8); for (let i = 0; i < 4; i++) { noiseHit(d, t + i * 0.05, 0.08, 'bandpass', rnd(1500, 2600), 900, 0.3, 4); tone(d, t + i * 0.05, 'triangle', rnd(700, 1100), 500, 0.08, 0.12); } }
function sBoop(x, y, z, v) { if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y, z }, 6); tone(d, t, 'sine', rnd(280, 420), rnd(160, 240), 0.12, 0.25 * (v || 1)); tone(d, t + 0.02, 'triangle', rnd(700, 900), 600, 0.06, 0.06 * (v || 1)); }
function sBleat(x, y, z, pitch) {
  if (!AU.on) return; const ctx = AU.ctx, t = now(), d = spot(AU.fx, { x, y, z }, 7);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = 260 * pitch;
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.12, t + 0.12); o.frequency.linearRampToValueAtTime(f0 * 0.95, t + 0.55);
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 16; vg.gain.value = f0 * 0.06; vib.connect(vg); vg.connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 900; f1.Q.value = 5;
  const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2400; f2.Q.value = 7;
  const mix = ctx.createGain(); mix.gain.value = 1.4;
  o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(d);
  o.start(t); vib.start(t); o.stop(t + 0.7); vib.stop(t + 0.7);
}
function sConfetti(x, y, z) {
  if (!AU.on) return; const t = now(), d = spot(AU.fx, { x, y, z }, 10);
  noiseHit(d, t, 0.25, 'highpass', 2500, 1200, 0.6); tone(d, t, 'sine', 180, 60, 0.2, 0.5);
  [72, 76, 79, 84].forEach((n, i) => tone(d, t + 0.1 + i * 0.07, 'square', midi(n), midi(n), 0.14, 0.05, 0.005));
  for (let i = 0; i < 12; i++) noiseHit(d, t + rnd(0.05, 0.5), 0.03, 'highpass', rnd(5000, 8000), 4000, 0.1);
}
function sBoing(v) { if (!AU.on) return; const ctx = AU.ctx, t = now(); const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(420 + v * 15, t + 0.25); const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 22; vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency); const g = ctx.createGain(); env(g, t, 0.01, 0.35, 0.5); o.connect(g); g.connect(AU.fx); o.start(t); vib.start(t); o.stop(t + 0.6); vib.stop(t + 0.6); }
function sPortal() { if (!AU.on) return; const t = now(); noiseHit(AU.fx, t, 0.9, 'bandpass', 300, 5000, 0.5, 2); for (let i = 0; i < 8; i++) tone(AU.reverb, t + i * 0.05, 'sine', midi(79 + i * 2), midi(79 + i * 2), 0.6, 0.05, 0.01); tone(AU.fx, t, 'sine', 1200, 200, 0.6, 0.2); }
function sLock(locked) { if (!AU.on) return; const t = now(); noiseHit(AU.fx, t, 0.06, 'bandpass', 2400, 1800, 0.4, 6); noiseHit(AU.fx, t + 0.08, 0.05, 'bandpass', 3200, 2400, 0.35, 6); tone(AU.fx, t + 0.12, 'sine', locked ? 660 : 990, locked ? 440 : 1320, 0.15, 0.08); }
function sAbsorb() { if (!AU.on) return; const t = now(); tone(AU.fx, t, 'sawtooth', 80, 1600, 1.4, 0.2, 0.05); noiseHit(AU.fx, t, 1.4, 'bandpass', 200, 6000, 0.4, 3); for (let i = 0; i < 10; i++) tone(AU.fx, t + i * 0.12, 'square', midi(60 + i * 3), midi(60 + i * 3), 0.08, 0.05); }
function sEject() { if (!AU.on) return; const t = now(); tone(AU.fx, t, 'sawtooth', 1600, 90, 0.7, 0.2); noiseHit(AU.fx, t, 0.4, 'lowpass', 4000, 300, 0.5); setTimeout(() => sBoing(6), 650); }
function sPing() { if (!AU.on) return; const t = now(); tone(AU.fx, t, 'sine', 1320, 1320, 0.12, 0.08); tone(AU.fx, t + 0.09, 'sine', 1760, 1760, 0.18, 0.07); }
function sStatut(on) { if (!AU.on) return; const t = now(); tone(AU.fx, t, 'triangle', on ? 440 : 660, on ? 660 : 440, 0.25, 0.05); }
/* ---------- objets cassables, voitures, toboggans, jetpack ---------- */
function sHitPiece(kind, pt) {
  if (!AU.on) return; const t = now(), d = spot(AU.fx, pt, 5);
  if (kind === 'tissu') noiseHit(d, t, 0.12, 'lowpass', 900, 200, 0.22);
  else if (kind === 'plante') noiseHit(d, t, 0.18, 'highpass', 3000, 2000, 0.12);
  else if (kind === 'metal') { tone(d, t, 'sine', rnd(850, 1100), rnd(800, 1000), 0.25, 0.06); noiseHit(d, t, 0.05, 'bandpass', 3200, 2500, 0.2, 4); }
  else if (kind === 'ecran' || kind === 'verre' || kind === 'lampe') { tone(d, t, 'sine', rnd(2600, 3400), 2400, 0.08, 0.05); noiseHit(d, t, 0.05, 'highpass', 4000, 3000, 0.15); }
  else if (kind === 'plastique') { tone(d, t, 'triangle', rnd(500, 700), 400, 0.06, 0.12); noiseHit(d, t, 0.04, 'bandpass', 1800, 1200, 0.15, 3); }
  else { noiseHit(d, t, 0.07, 'bandpass', rnd(900, 1400), 500, 0.3, 3); tone(d, t, 'triangle', rnd(220, 320), 160, 0.06, 0.1); }
}
function sBreakPiece(kind, p) {
  if (!AU.on) return; const t = now(), pos = { x: p.x, y: p.y, z: p.z }, d = spot(AU.fx, pos, 9);
  if (kind === 'ecran') { tone(d, t, 'sine', 140, 40, 0.35, 0.5); noiseHit(d, t, 0.5, 'highpass', 6000, 2000, 0.5); sGlass(p.x, p.y, p.z); for (let i = 0; i < 6; i++) tone(d, t + rnd(0, 0.3), 'square', rnd(1500, 3000), rnd(800, 1500), 0.03, 0.04); return; }
  if (kind === 'verre' || kind === 'lampe') { sGlass(p.x, p.y, p.z); return; }
  if (kind === 'tissu') { noiseHit(d, t, 0.45, 'lowpass', 1200, 150, 0.45); tone(d, t, 'sine', 90, 50, 0.2, 0.3); return; }
  if (kind === 'plante') { noiseHit(d, t, 0.5, 'highpass', 2600, 1200, 0.3); tone(d, t, 'sine', 300, 120, 0.12, 0.08); return; }
  if (kind === 'metal') { for (let i = 0; i < 4; i++) tone(d, t + i * 0.06, 'sine', rnd(500, 1300), rnd(400, 900), 0.4, 0.08); noiseHit(d, t, 0.3, 'bandpass', 2400, 900, 0.4, 2); return; }
  if (kind === 'plastique') { noiseHit(d, t, 0.25, 'bandpass', 2200, 900, 0.4, 2); tone(d, t, 'triangle', 700, 200, 0.2, 0.12); return; }
  if (kind === 'carton') { noiseHit(d, t, 0.25, 'lowpass', 900, 200, 0.4); tone(d, t, 'sine', 110, 60, 0.15, 0.3); return; }
  noiseHit(d, t, 0.4, 'bandpass', 1100, 300, 0.55, 2); tone(d, t, 'sine', 95, 45, 0.3, 0.4);
  for (let i = 0; i < 6; i++) noiseHit(d, t + rnd(0.03, 0.35), 0.05, 'bandpass', rnd(700, 1600), 400, 0.22, 4);
}
function sZap(h) { if (!AU.on) return; const t = now(), d = spot(AU.fx, h, 10); tone(d, t, 'sawtooth', 120, 40, 0.3, 0.2); noiseHit(d, t, 0.2, 'bandpass', 5000, 2000, 0.3, 3); }
function sClang(p) { if (!AU.on) return; const t = now(), d = spot(AU.fx, p, 6); tone(d, t, 'sine', rnd(700, 900), rnd(650, 850), 0.3, 0.09); tone(d, t, 'sine', rnd(1700, 2100), 1600, 0.2, 0.05); noiseHit(d, t, 0.04, 'bandpass', 3500, 2500, 0.25, 5); }
function sRustle(p) { if (!AU.on) return; const t = now(); noiseHit(spot(AU.fx, p, 4), t, 0.22, 'highpass', 3500, 2500, 0.14); }
function sAlarm(c, hi) { if (!AU.on) return; const t = now(), d = spot(AU.fx, { x: c.x, y: 1, z: c.z }, 16); tone(d, t, 'square', hi ? 980 : 720, hi ? 980 : 720, 0.26, 0.045); tone(d, t, 'sine', hi ? 1960 : 1440, hi ? 1960 : 1440, 0.26, 0.02); }
function sWhee() { if (!AU.on) return; const t = now(); tone(AU.fx, t, 'sine', 420, 980, 0.5, 0.08, 0.04); noiseHit(AU.fx, t, 0.6, 'bandpass', 800, 1600, 0.12, 1); }
const LOOPS = {};
function loopNode(name, type, freq, q) {
  if (!AU.on) return null; if (LOOPS[name]) return LOOPS[name];
  const ctx = AU.ctx, src = ctx.createBufferSource(); src.buffer = AU.noise; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
  const g = ctx.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(AU.fx); src.start();
  return (LOOPS[name] = { g, f });
}
function slideSound(sp) { const L = loopNode('glisse', 'bandpass', 900, 0.6); if (!L) return; const t = AU.ctx.currentTime; L.g.gain.setTargetAtTime(sp > 0.5 ? 0.04 + Math.min(0.2, sp * 0.014) : 0, t, 0.08); L.f.frequency.setTargetAtTime(500 + sp * 70, t, 0.1); }
function jetSound(k) {
  const L = loopNode('jet', 'lowpass', 900, 1.2), L2 = loopNode('jet2', 'bandpass', 2400, 0.8); if (!L) return;
  const t = AU.ctx.currentTime; L.g.gain.setTargetAtTime(k * 0.42, t, 0.06); L2.g.gain.setTargetAtTime(k * 0.08, t, 0.06);
  L.f.frequency.setTargetAtTime(700 + k * 500 + Math.random() * 120, t, 0.05);
}
function sAbsorbAt(pos) { if (!AU.on) return; const t = now(), d = spot(AU.fx, pos, 6); tone(d, t, 'sawtooth', 80, 1600, 1.2, 0.12, 0.05); noiseHit(d, t, 1.2, 'bandpass', 200, 5000, 0.25, 3); }
function sEjectAt(pos) { if (!AU.on) return; const t = now(), d = spot(AU.fx, pos, 6); tone(d, t, 'sawtooth', 1600, 90, 0.6, 0.12); noiseHit(d, t, 0.4, 'lowpass', 4000, 300, 0.3); }
function sJetPickup() { if (!AU.on) return; const t = now(); [72, 76, 79, 84, 88].forEach((n, i) => { tone(AU.fx, t + i * 0.07, 'square', midi(n), midi(n), 0.12, 0.05); tone(AU.reverb, t + i * 0.07, 'sine', midi(n + 12), midi(n + 12), 0.5, 0.04); }); noiseHit(AU.fx, t + 0.35, 0.6, 'lowpass', 400, 2400, 0.3); }
// jukebox : ouverture du menu, touche de sélection, diamant qui saute
function sJukeOpen() { if (!AU.on) return; const t = now(); [76, 79, 83, 88].forEach((n, i) => { tone(AU.fx, t + i * 0.05, 'triangle', midi(n), midi(n), 0.16, 0.05); tone(AU.reverb, t + i * 0.05, 'sine', midi(n + 12), midi(n + 12), 0.4, 0.025); }); }
function sJukeKey(i) { if (!AU.on) return; const t = now(); noiseHit(AU.fx, t, 0.05, 'bandpass', 1800, 1400, 0.25, 5); tone(AU.fx, t + 0.02, 'square', i ? 520 : 300, i ? 520 : 200, 0.06, 0.04); if (i) { noiseHit(AU.fx, t + 0.25, 0.4, 'bandpass', 700, 2400, 0.12, 2); tone(AU.fx, t + 0.3, 'sine', 180, 120, 0.25, 0.08); } }
function sScratch(pos) { if (!AU.on) return; const t = now(), d = spot(AU.fx, pos, 5); noiseHit(d, t, 0.16, 'bandpass', 2400, 600, 0.3, 3); noiseHit(d, t + 0.17, 0.12, 'bandpass', 700, 2600, 0.24, 3); }
function updateAudio() {
  if (!AU.on) return;
  const ctx = AU.ctx, L = ctx.listener, t = ctx.currentTime;
  const fw = _v1.set(0, 0, -1).applyQuaternion(camera.quaternion), up = _v2.set(0, 1, 0).applyQuaternion(camera.quaternion);
  if (L.positionX) { L.positionX.setValueAtTime(camera.position.x, t); L.positionY.setValueAtTime(camera.position.y, t); L.positionZ.setValueAtTime(camera.position.z, t); L.forwardX.setValueAtTime(fw.x, t); L.forwardY.setValueAtTime(fw.y, t); L.forwardZ.setValueAtTime(fw.z, t); L.upX.setValueAtTime(up.x, t); L.upY.setValueAtTime(up.y, t); L.upZ.setValueAtTime(up.z, t); }
  else { L.setPosition(camera.position.x, camera.position.y, camera.position.z); L.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z); }
  const mp = AU.mPan;
  if (mp.positionX) { mp.positionX.setValueAtTime(M.pos.x, t); mp.positionY.setValueAtTime(M.pos.y + 1.6, t); mp.positionZ.setValueAtTime(M.pos.z, t); } else mp.setPosition(M.pos.x, M.pos.y + 1.6, M.pos.z);
  AU.mGain.gain.setTargetAtTime(M.state === 'dead' ? 0 : 0.35 * M.form, t, 0.2);
  AU.mFilter.frequency.setTargetAtTime(350 + Math.random() * 700 + (M.atk > 0 ? 600 : 0), t, 0.05);
}

/* ---------- musique de base : celle, toute simple, de la première version ----------
   mais en sourdine : plus lente, voilée, presque un souvenir de musique, pour que le
   jukebox fasse vraiment la différence. Elle s'efface dès qu'un jukebox joue. */
const BPM = 66, BEAT = 60 / BPM;
const BASE_LVL = 0.38; // niveau de la musique de base (le jukebox, lui, joue à plein)
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59], [46, 50, 53, 57], [48, 52, 55, 60]];
const BASS = [41, 40, 38, 36, 34, 36];
const ARP = [0, 1, 2, 3, 2, 3, 1, 2];
const MUS = { nextChord: 0, chordI: 0, nextArp: 0, arpI: 0, timer: null, paused: false };
function playChord(i, t) {
  const ctx = AU.ctx, dur = BEAT * 4;
  // nappe : filtre plus fermé, montée lente, longue traîne
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(820, t + dur * 0.6); f.frequency.linearRampToValueAtTime(480, t + dur + 2.2); f.Q.value = 0.5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 2.2); g.gain.setValueAtTime(0.09, t + dur - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur + 2.4);
  f.connect(g); g.connect(AU.base);
  for (const n of CHORDS[i]) for (const det of [-7, 7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 2.5); }
  // basse : une seule note tenue et douce, plus de pulsation
  const bo = ctx.createOscillator(); bo.type = 'sine'; bo.frequency.value = midi(BASS[i]);
  const bg = ctx.createGain(); bo.connect(bg); bg.connect(AU.base);
  bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.07, t + 1.4); bg.gain.setValueAtTime(0.07, t + dur - 0.5); bg.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
  bo.start(t); bo.stop(t + dur + 1.3);
}
function playArp(i, t) {
  // arpège clairsemé : une note sur deux, et encore pas toujours, très douce, qui se perd dans l'écho
  if (i % 2 || Math.random() < 0.35) return;
  const ch = CHORDS[Math.floor(i / 8) % CHORDS.length], n = ch[ARP[i % 8]] + 12;
  const ctx = AU.ctx, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midi(n);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g); g.connect(AU.base); g.connect(AU.delay); o.start(t); o.stop(t + 1.15);
}
// le jukebox remplace la musique de base : on la fait taire en douceur, puis on la reprend
function setBaseMusic(on) {
  if (!AU.ctx) { MUS.paused = !on; return; }
  const t = AU.ctx.currentTime;
  if (on && MUS.paused) { MUS.paused = false; MUS.nextChord = MUS.nextArp = t + 0.6; MUS.arpI = MUS.chordI * 8; }
  else if (!on) MUS.paused = true;
  AU.base.gain.cancelScheduledValues(t); AU.base.gain.setTargetAtTime(on ? BASE_LVL : 0, t, on ? 1.6 : 0.45);
}
function startMusic() {
  const ctx = AU.ctx; MUS.nextChord = MUS.nextArp = ctx.currentTime + 0.2;
  MUS.timer = setInterval(() => {
    if (!AU.ctx || AU.ctx.state !== 'running' || MUS.paused) return;
    const ahead = AU.ctx.currentTime + 0.35;
    if (MUS.nextChord < AU.ctx.currentTime - 1) MUS.nextChord = MUS.nextArp = AU.ctx.currentTime + 0.1;
    while (MUS.nextChord < ahead) { playChord(MUS.chordI, MUS.nextChord); MUS.chordI = (MUS.chordI + 1) % CHORDS.length; MUS.nextChord += BEAT * 4; }
    while (MUS.nextArp < ahead) { playArp(MUS.arpI, MUS.nextArp); MUS.arpI++; MUS.nextArp += BEAT / 2; }
  }, 90);
}
