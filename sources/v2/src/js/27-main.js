/* =========================================================
   Assemblage final du décor puis boucle principale
   ========================================================= */
B.build(world, 'dur', SHOOT);
BF.build(world, 'feuille', SHOOT);
buildDestr(world);
// moins de reflets d'ambiance sur les matériaux mats : les zones à l'ombre restent vraiment à l'ombre
{
  const seen = new Set();
  scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (seen.has(m) || !m.isMeshStandardMaterial) continue; seen.add(m); if (m.metalness < 0.5 && m.envMapIntensity < 1.2) m.envMapIntensity *= 0.14; } });
}
// tirs : arbre de boîtes englobantes pour que chaque balle ne teste que quelques triangles
if (window.MeshBVHLib) {
  THREE.BufferGeometry.prototype.computeBoundsTree = MeshBVHLib.computeBoundsTree;
  THREE.Mesh.prototype.raycast = MeshBVHLib.acceleratedRaycast;
  ray.firstHitOnly = true;
}
{
  const bg = new THREE.IcosahedronGeometry(1, 2);
  const p = bg.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new V3(p.getX(i), p.getY(i), p.getZ(i)); const n = 1 + 0.16 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.cos(v.z * 3.7); v.multiplyScalar(n); v.y *= 0.82; p.setXYZ(i, v.x, v.y, v.z); }
  bg.computeVertexNormals();
  const im = new THREE.InstancedMesh(bg, std({ color: C('#ffffff'), roughness: 0.9, envMapIntensity: 0.5 }), bushes.length);
  bushes.forEach((b, i) => { im.setMatrixAt(i, M4(b[0], b[3] * 0.5 + (b[1] > 0.3 && b[1] < 0.4 ? 0.16 : 0), b[2], 0, R() * 6, 0, b[3], b[3], b[3])); im.setColorAt(i, C(b[4])); });
  im.castShadow = true; im.receiveShadow = true; im.userData.surface = 'buisson';
  world.add(im); SHOOT.push(im);
}
if (window.MeshBVHLib) for (const m of SHOOT) { const g = m.geometry; if (g && !g.boundsTree && g.attributes.position && g.attributes.position.count > 240) { try { g.computeBoundsTree(); } catch (e) {} } }
let last = performance.now(), perfAcc = 0, perfN = 0, perfGood = 0, shadowTick = 0, attractT = 0, tvFrame = 0, crtT = 0, pcT = 0;
const UNDER_FOG = C('#2b8fa8'), BASE_FOG = FOG_COLOR.clone(), INDOOR = { fog: 0.0018, bloom: 0.55, expo: 1.02 };
function updateZones(dt) {
  const p = camera.position;
  const tgt = Object.assign({}, ZONE_DEF);
  for (const z of ZONES) { const w = z.test(p); if (w > 0) for (const k in z.v) tgt[k] = lerp(tgt[k], z.v[k], w); }
  const h = houseAt(p.x, p.z, true); if (h && !h.collapsed && p.y < 4) for (const k in INDOOR) tgt[k] = INDOOR[k];
  for (const k in tgt) zoneCur[k] = damp(zoneCur[k], tgt[k], 2.2, dt);
  const under = P.underwater && gameState !== 'accueil';
  FOG_COLOR.lerp(under ? UNDER_FOG : BASE_FOG, 1 - Math.exp(-8 * dt));
  scene.fog.color.copy(FOG_COLOR);
  const dens = under ? 0.075 : zoneCur.fog;
  scene.fog.density = damp(scene.fog.density, dens, under ? 10 : 3, dt); FOG.density.value = scene.fog.density;
  bloom.strength = zoneCur.bloom; finalPass.uniforms.uExposure.value = zoneCur.expo;
}
function updateEnv(dt) {
  const t = clockU.value;
  sky.position.copy(camera.position);
  for (const c of clouds) { c.s.position.x += c.sp * dt * 0.6; if (c.s.position.x > 700) c.s.position.x = -660; }
  for (const c of lowClouds) { c.s.position.x += c.sp * dt; if (c.s.position.x > MAP.x1 + 10) c.s.position.x = MAP.x0 - 10; }
  MAT.amber.color.setHex(0xffc070).multiplyScalar(Math.sin(t * 5) > 0 ? 3.5 : 0.25);
  if ((tvFrame = (tvFrame + 1) % 3) === 0) {
    const g = tvCanvas[1], img = g.createImageData(96, 72), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = v * 0.95; d[i + 1] = v * 0.9; d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    if (Math.sin(t * 0.7) > 0.86) { g.fillStyle = 'rgba(255,190,225,0.95)'; g.font = 'bold 13px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('RÉVEILLE-TOI', 48, 40); }
    T.tv.needsUpdate = true;
  }
  crtT -= dt; if (crtT <= 0) { crtT = 0.1; drawCRT(t); }
  pcT -= dt; if (pcT <= 0) { pcT = 0.25; drawPC(t); }
  for (const s of SHOPS) if (s.neon) s.neon.material.opacity = Math.random() < 0.004 ? 0.25 : 1;
  updateSoftLights(camera.position);
}
function doorUsers(players) {
  const list = players.slice();
  if (M.state === 'hunt') list.push({ x: M.pos.x, y: M.gy, z: M.pos.z });
  return list;
}
function frame(nowMs) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  simulate(rdt, true);
}
function simulate(rdt, render) {
  clockU.value += rdt;
  if (PC.phase === 'dedans') { updateNet(rdt); return; }
  if (slowT > 0) { slowT -= rdt; timeScale = damp(timeScale, 0.28, 30, rdt); } else timeScale = damp(timeScale, 1, 6, rdt);
  const playing = gameState === 'jeu' || (gameState === 'pause' && NET.on);
  const gdt = gameState === 'pause' && !NET.on ? 0 : rdt * timeScale;
  const players = allPlayers();
  let mv = { sprint: false, moving: false, bobAmt: 0 };
  if (PC.phase) updatePC(rdt);
  else if (playing) { playTime += rdt; mv = updatePlayer(gdt); }
  else if (gameState === 'accueil') {
    attractT += rdt; const t = attractT;
    camera.position.set(Math.sin(t * 0.05) * 3.5, 1.75 + Math.sin(t * 0.2) * 0.08, 52 + Math.sin(t * 0.031) * 18);
    camera.rotation.set(0.04 + Math.sin(t * 0.07) * 0.03, Math.sin(t * 0.045) * 0.45, 0);
    gunRoot.position.set(0.17, -0.225 + Math.sin(t * 1.2) * 0.003, -0.47); gunRoot.rotation.set(0, 0.035, 0);
    players[0].x = camera.position.x; players[0].z = camera.position.z - 30; players[0].y = 0;
  }
  if (playing && !PC.phase) updateWeapon(gdt, mv);
  if (PC.phase) gunRoot.visible = false;
  if (gdt > 0) {
    const auth = !NET.on || NET.isHost();
    updateMonster(gdt, auth, players);
    updateSheep(gdt, auth, players);
    const pushers = players.filter((p) => !p.dead).map((p) => ({ x: p.x, y: p.y, z: p.z, r: 0.42, vx: p.local ? P.vel.x : 0, vz: p.local ? P.vel.z : 0, local: !!p.local }));
    if (M.state === 'hunt') pushers.push({ x: M.pos.x, y: M.gy, z: M.pos.z, r: 1.1 });
    updateBalls(Math.min(gdt, 1 / 30), pushers);
    updateParticles(gdt);
    const du = doorUsers(players);
    updateHouses(gdt, du); updateShops(gdt, du); updateRefuge(gdt, du); updateProps(gdt); updateDives(gdt);
    updateDestr(gdt, players); updateLamps(); updateCars(gdt); updateLagoons(gdt); updateBigBalls(gdt, pushers); updateSprinklers(gdt);
  }
  updateJetpack(rdt);
  updateJukebox(rdt);
  updateNet(rdt);
  if (gameState === 'accueil' && !PC.phase) { /* rien */ }
  updateZones(rdt);
  updateEnv(rdt);
  if (gameState === 'jeu' && !PC.phase) updateHUD(rdt);
  updateAudio(); updateJukeAudio(rdt);
  wet = damp(wet, 0, 0.8, rdt); hurt = damp(hurt, 0, 2.5, rdt); killFx = damp(killFx, 0, 3, rdt); flashFx = damp(flashFx, 0, 9, rdt);
  const fu = finalPass.uniforms;
  fu.uTime.value = clockU.value; fu.uWet.value = P.underwater ? 0 : wet; fu.uHurt.value = hurt; fu.uKill.value = killFx; fu.uFlash.value = flashFx;
  fu.uUnder.value = damp(fu.uUnder.value, P.underwater && gameState !== 'accueil' ? 1 : 0, 10, rdt);
  if (!PC.phase) fu.uWarp.value = P.warp;
  fu.uFade.value = damp(fu.uFade.value, P.dead ? 0.55 : 0, 3, rdt);
  if (!render) return;
  shadowTick = (shadowTick + 1) % (PRESETS[qualiteNom].shadowEvery || 1);
  if (shadowTick === 0) { placeSun(camera.position.x, camera.position.y, camera.position.z); renderer.shadowMap.needsUpdate = true; }
  composer.render(rdt);
  if (!$('prep').hidden) renderPreview(rdt);
  if (gameState === 'jeu') {
    perfAcc += rdt; perfN++;
    if (perfAcc > 2) {
      const fps = perfN / perfAcc; perfAcc = 0; perfN = 0;
      const maxPR = Math.min(window.devicePixelRatio || 1, PRESETS[qualiteNom].pr);
      if (fps < 48 && pixelRatio > 0.6) { pixelRatio = Math.max(0.6, Math.round((pixelRatio - 0.1) * 100) / 100); resize(); perfGood = 0; }
      else if (fps > 58) { perfGood += 2; if (perfGood >= 8 && pixelRatio < maxPR - 0.01) { pixelRatio = Math.min(maxPR, pixelRatio + 0.1); resize(); perfGood = 0; } }
      else perfGood = 0;
    }
  }
}
// démarrage : le monstre se promène dans la rue pendant l'accueil
M.state = 'hunt'; M.form = 1; M.pos.set(0, 0, 20);
setGlove(PROFILE.couleur);
document.body.classList.toggle('mobile', DEVICE === 'mobile');
requestAnimationFrame((t) => { last = t; frame(t); });
$('choixPC').disabled = false; $('choixMobile').disabled = false;
noteEl.textContent = PREP.join ? 'Tu as été invité dans un rêve partagé : choisis ton appareil pour le rejoindre.' : '';
if (IS_TOUCH) { try { $('choixMobile').focus({ preventScroll: true }); } catch (e) {} }
if (DEBUG) window.__dbg = { SHOOT, rayHouses, rayBalls, rayShops, step: (n, dt) => { for (let i = 0; i < n; i++) simulate(dt || 0.05, false); }, shoot, traceShot, applyHit, curW, WEAPONS, MODELS, myBeam, refugeDoor, CROWNS, RES, softLights, zoneCur, get bloom() { return bloom; }, finalPass, scene, FOG, P, M, WPN, NET, PREP, PROFILE, SHEEP, houses, panels, glasses, pools, PORTALS, TRAMPS, camera, renderer, startGame, chooseDevice, killMonster, respawnMonster, hurtPlayer, destroyPanel, collapseHouse, shakePalm, explodeSheep, switchWeapon, enterPC, exitPC, PC, teleport, toggleRefugeLock, setState: (s) => { gameState = s; }, keys, sheepMatrices, CHAT, openChat, onChatMessage, translate, allPlayers, get ballCount() { return ballCount; }, DESTR, JET, spawnJetpack, equipJetpack, LAGOONS, SLIDES, BIGB, CARS, LAMP_HEADS, openVersions, PCMENU, groundAt, floors, PALMS, DIVES, SHOPS, LAGOONS_DEF, makeAvatar, animateAvatar, setKills: (n) => { kills = n; }, JUKE, TRACKS, jukePlay, jukeStop, jukeChoose, openJukeMenu, nearJukebox, jukeInside, MUS, AU, SPK, VOL, get kills() { return kills; } };
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) { try { hot.snapshot(() => ({ kills })); } catch (e) {} }
