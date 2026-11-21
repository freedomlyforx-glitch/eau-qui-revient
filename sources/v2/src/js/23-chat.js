/* =========================================================
   Discussion de proximité, sur demande, avec traduction automatique
   ========================================================= */
const LANGS = { fr: 'français', en: 'anglais', es: 'espagnol', de: 'allemand', it: 'italien', pt: 'portugais', nl: 'néerlandais', pl: 'polonais', ru: 'russe', tr: 'turc', ar: 'arabe', ja: 'japonais', ko: 'coréen', zh: 'chinois' };
const CHAT = { peer: null, pending: null, outgoing: null, outT: 0, blocked: new Set(), wantUnlock: false, tr: {} };
function requestChatNearest() {
  if (!NET.on) { toast('La discussion fonctionne sur un serveur en ligne, avec d’autres rêveurs.'); return; }
  if (CHAT.peer) { openChatInput(); return; }
  const n = nearestPeer(6);
  if (!n) { toast('Approche-toi d’un autre rêveur pour lui proposer de discuter.'); return; }
  CHAT.outgoing = n.id; CHAT.outT = performance.now();
  NET.send('chatDem', {}, n.id);
  toast('Demande envoyée à ' + n.nom + '…');
  setTimeout(() => { if (CHAT.outgoing === n.id) { CHAT.outgoing = null; toast(n.nom + ' n’a pas répondu.'); } }, 20000);
}
function onChatRequest(from) {
  if (CHAT.blocked.has(from)) return;
  if (CHAT.peer || CHAT.pending) { NET.send('chatRep', { ok: false, occupe: true }, from); return; }
  CHAT.pending = from;
  $('demandeTxt').textContent = NET.nameOf(from) + ' souhaite discuter avec toi.';
  $('demande').hidden = false; sPing();
  setTimeout(() => { if (CHAT.pending === from) answerChat(false); }, 25000);
}
function answerChat(ok) {
  const from = CHAT.pending; if (!from) return;
  CHAT.pending = null; $('demande').hidden = true;
  NET.send('chatRep', { ok: !!ok }, from);
  if (ok) openChat(from);
}
function onChatReply(from, ok, occupe) {
  if (CHAT.outgoing !== from) return;
  CHAT.outgoing = null;
  if (ok) { openChat(from); toast(NET.nameOf(from) + ' accepte de discuter'); }
  else toast(NET.nameOf(from) + (occupe ? ' discute déjà avec quelqu’un.' : ' préfère ne pas discuter pour le moment.'));
}
function openChat(id) {
  CHAT.peer = id;
  $('messages').innerHTML = '';
  const p = NET.peers.get(id);
  $('discTitre').textContent = 'Discussion avec ' + NET.nameOf(id);
  addChatLine('sys', 'Tu écris en ' + (LANGS[PROFILE.langue] || PROFILE.langue) + (p && p.langue && p.langue !== PROFILE.langue ? ', ' + NET.nameOf(id) + ' écrit en ' + (LANGS[p.langue] || p.langue) + ' : les messages sont traduits automatiquement.' : '.'));
  $('message').placeholder = DEVICE === 'mobile' ? 'Écris ici…' : 'Écris ici, Entrée pour envoyer';
  $('discussion').hidden = false; sPing();
  if (DEVICE !== 'mobile') addChatLine('sys', 'Appuie sur Entrée pour écrire, Échap pour revenir au jeu.');
  else addChatLine('sys', 'Touche ÉCRIRE ou la zone de texte pour écrire.');
}
function closeChat(silent) {
  if (!CHAT.peer) return;
  if (!silent) NET.send('chatFin', {}, CHAT.peer);
  CHAT.peer = null; $('discussion').hidden = true;
  if (P.ui) closeChatInput();
}
function openChatInput() {
  if (!CHAT.peer) return;
  P.ui = true; WPN.firing = false; for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) { CHAT.wantUnlock = true; document.exitPointerLock(); }
  const inp = $('message'); inp.focus();
}
function closeChatInput() { P.ui = false; $('message').blur(); if (gameState === 'jeu' && DEVICE !== 'mobile') requestLock(); }
function addChatLine(kind, text, extra) {
  const box = $('messages');
  const div = document.createElement('div'); div.className = 'msg ' + kind;
  const span = document.createElement('span'); span.textContent = text; div.append(span);
  if (extra) { const sm = document.createElement('small'); sm.textContent = extra.label; let showOrig = false; sm.addEventListener('click', () => { showOrig = !showOrig; span.textContent = showOrig ? extra.orig : extra.tr; sm.textContent = showOrig ? 'voir la traduction' : extra.label; }); div.append(sm); div._span = span; div._sm = sm; }
  box.append(div); box.scrollTop = box.scrollHeight;
  while (box.children.length > 60) box.firstChild.remove();
  return div;
}
$('saisie').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = $('message'), txt = inp.value.trim().slice(0, 200);
  if (txt && CHAT.peer) { NET.send('chatMsg', { txt, lang: PROFILE.langue }, CHAT.peer); addChatLine('moi', txt); }
  inp.value = '';
  if (DEVICE !== 'mobile') closeChatInput();
});
$('message').addEventListener('focus', () => { P.ui = true; WPN.firing = false; for (const k in keys) keys[k] = false; });
$('message').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.code === 'Escape') { e.preventDefault(); closeChatInput(); } });
$('discFermer').addEventListener('click', () => closeChat(false));
$('discBloquer').addEventListener('click', () => { if (CHAT.peer) { CHAT.blocked.add(CHAT.peer); toast(NET.nameOf(CHAT.peer) + ' est bloqué : tu ne recevras plus ses demandes.'); closeChat(false); } });
$('demOui').addEventListener('click', () => answerChat(true));
$('demNon').addEventListener('click', () => answerChat(false));
async function onChatMessage(from, d) {
  if (from !== CHAT.peer || !d || typeof d.txt !== 'string' || CHAT.blocked.has(from)) return;
  const txt = d.txt.slice(0, 200), lang = String(d.lang || 'fr').slice(0, 5);
  sPing();
  if (lang === PROFILE.langue) { addChatLine('eux', txt); return; }
  const line = addChatLine('eux', txt + '  …', { label: 'traduction en cours', orig: txt, tr: txt });
  const tr = await translate(txt, lang, PROFILE.langue);
  if (tr) { line._span.textContent = tr; line._sm.textContent = 'traduit du ' + (LANGS[lang] || lang) + ' · voir l’original'; line._label = line._sm.textContent; }
  else { line._span.textContent = txt; line._sm.textContent = 'traduction indisponible (' + (LANGS[lang] || lang) + ')'; }
  // mise à jour de l'étiquette pour la bascule original / traduction
  const extraTr = tr || txt; line._sm.onclick = null;
  let showOrig = false; const label = line._sm.textContent;
  line._sm.replaceWith(line._sm.cloneNode(true)); const sm = line.querySelector('small');
  sm.addEventListener('click', () => { showOrig = !showOrig; line._span.textContent = showOrig ? txt : extraTr; sm.textContent = showOrig ? 'voir la traduction' : label; });
}
async function translate(text, from, to) {
  try {
    if ('Translator' in self) {
      const key = from + '>' + to;
      if (!CHAT.tr[key]) {
        const av = await self.Translator.availability({ sourceLanguage: from, targetLanguage: to });
        if (av && av !== 'unavailable') CHAT.tr[key] = await self.Translator.create({ sourceLanguage: from, targetLanguage: to });
      }
      if (CHAT.tr[key]) return await CHAT.tr[key].translate(text);
    }
  } catch (e) {}
  try {
    const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + from + '|' + to);
    const j = await r.json();
    const out = j && j.responseData && j.responseData.translatedText;
    if (out && !/MYMEMORY WARNING/i.test(out)) { const ta = document.createElement('textarea'); ta.innerHTML = out; return ta.value; }
  } catch (e) {}
  return null;
}
