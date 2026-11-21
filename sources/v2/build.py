#!/usr/bin/env python3
"""Assemble la page du jeu (index.html) et la première version (v1.html)."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'site')
os.makedirs(OUT, exist_ok=True)
URL = 'https://freedomlyforx-glitch.github.io/eau-qui-revient/'
DESC = "Un rêve en vue subjective : un lotissement californien pastel figé au coucher du soleil, des maisons qu'on peut détruire, des moutons arc-en-ciel, et un monstre d'eau qui revient toujours. Seul ou à plusieurs."
THREE = '0.147.0'
LIBS = ['build/three.min.js', 'examples/js/shaders/CopyShader.js', 'examples/js/shaders/LuminosityHighPassShader.js', 'examples/js/postprocessing/EffectComposer.js',
        'examples/js/postprocessing/MaskPass.js', 'examples/js/postprocessing/ShaderPass.js', 'examples/js/postprocessing/UnrealBloomPass.js', 'examples/js/objects/MarchingCubes.js']
def read(p):
    with open(p, encoding='utf-8') as f: return f.read()
head = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>L'eau qui revient</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#1c1430">
<meta property="og:type" content="website">
<meta property="og:url" content="{URL}">
<meta property="og:title" content="L'eau qui revient">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="{URL}apercu.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="L'eau qui revient">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{URL}apercu.jpg">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath d='M32 6C22 22 14 31 14 42a18 18 0 0 0 36 0C50 31 42 22 32 6z' fill='%23a3f3dc'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400;1,600&family=VT323&display=swap">
<style>
{read(os.path.join(SRC, 'style.css'))}
</style>
</head>
<body>
'''
scripts = '\n'.join(f'<script src="https://cdn.jsdelivr.net/npm/three@{THREE}/{l}"></script>' for l in LIBS)
js_files = sorted(f for f in os.listdir(os.path.join(SRC, 'js')) if f.endswith('.js'))
game = '\n'.join(read(os.path.join(SRC, 'js', f)) for f in js_files)
page = head + read(os.path.join(SRC, 'markup.html')) + '\n' + scripts + '\n<script>\n' + read(os.path.join(SRC, 'bvh.min.js')) + '\n</script>\n<script>\n' + read(os.path.join(SRC, 'trystero.min.js')) + '\n</script>\n<script>\n(function () {\n\'use strict\';\n' + game + '\n})();\n</script>\n</body>\n</html>\n'
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f: f.write(page)
# première version, jouable dans l'ordinateur du refuge
v1 = read(os.path.join(HERE, '..', 'eau-qui-revient.html'))
v1 = v1.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
i = v1.index('</style>') + len('</style>')
v1_head, v1_body = v1[:i], v1[i:]
quit_btn = '''<button class="bouton" id="quitterPC" type="button" hidden style="margin-left:12px">Quitter l'ordinateur</button>'''
v1_body = v1_body.replace('<p class="note" id="note"></p>', quit_btn + '\n      <p class="note" id="note"></p>', 1)
hook = '''
<script>
(function(){
  if (!/[?&]pc=/.test(location.search)) return;
  var quit = function(){ try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} try { parent.postMessage({ type: 'quitter-pc' }, '*'); } catch (e) {} };
  var b = document.getElementById('quitterPC'); if (b) { b.hidden = false; b.addEventListener('click', quit); }
  // touche X : on ressort de l'ordinateur et on revient dans le lotissement principal
  addEventListener('keydown', function(e){ if (e.code === 'KeyX') { e.preventDefault(); quit(); } });
  var s = document.querySelector('.sur-titre'); if (s) s.textContent = 'LAS PALMAS OS · version 1 · disquette n° 1';
})();
</script>
'''
# commandes tactiles pour la première version (elle n'en avait pas) : insérées dans son script pour piloter le joueur directement
touch = r'''
/* ---------- commandes tactiles ajoutées pour jouer depuis un téléphone ou une tablette ---------- */
(function () {
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  if (!/[?&]tactile=1/.test(location.search) && !coarse) return;
  noteEl.textContent = '';
  document.body.classList.add('tactile-v1');
  const css = document.createElement('style');
  css.textContent = [
    'body.tactile-v1{touch-action:none}',
    'body.tactile-v1 .commandes{display:none}',
    '#tactileV1{position:fixed;inset:0;z-index:15;touch-action:none;-webkit-user-select:none;user-select:none}',
    '#tactileV1 .tz-vue{position:absolute;inset:0}',
    '#tactileV1 .tz-marche{position:absolute;left:0;bottom:0;width:42%;height:66%}',
    '#tactileV1 .tmanette{position:absolute;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;border:2px solid rgba(255,245,250,.45);background:rgba(255,245,250,.07);opacity:0;transition:opacity .15s;pointer-events:none}',
    '#tactileV1 .tmanette i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,159,205,.5);box-shadow:0 0 18px rgba(255,159,205,.6)}',
    '#tactileV1 .tb{position:absolute;width:62px;height:62px;border-radius:50%;border:2px solid rgba(255,245,250,.55);background:rgba(36,24,62,.45);color:#fff5fa;font:16px "VT323","Lucida Console",monospace;letter-spacing:.04em;touch-action:none;padding:0}',
    '#tactileV1 .tb.on{background:rgba(255,159,205,.45);border-color:#ff9fcd}',
    '#tactileV1 .tb-tir{right:calc(max(16px,env(safe-area-inset-right,0px)) + 4px);bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 6px);width:88px;height:88px;font-size:20px;border-color:#ff9fcd}',
    '#tactileV1 .tb-saut{right:calc(max(16px,env(safe-area-inset-right,0px)) + 106px);bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 2px)}',
    '#tactileV1 .tb-viser{right:calc(max(16px,env(safe-area-inset-right,0px)) + 16px);bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 108px)}',
    '#tactileV1 .tb-rech{right:calc(max(16px,env(safe-area-inset-right,0px)) + 96px);bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 80px)}',
    'body.tactile-v1 .arme{transform:scale(.62);transform-origin:top right;top:calc(max(10px,env(safe-area-inset-top,0px)) + 104px)!important;bottom:auto!important}',
    'body.tactile-v1 .aide{font-size:16px!important;white-space:normal!important;max-width:80vw;text-align:center}'
  ].join('\n');
  document.head.append(css);
  const ui = document.createElement('div'); ui.id = 'tactileV1'; ui.hidden = true;
  ui.innerHTML = '<div class="tz-vue"></div><div class="tz-marche"></div><div class="tmanette"><i></i></div><button class="tb tb-viser" type="button">VISER</button><button class="tb tb-rech" type="button">RECH.</button><button class="tb tb-saut" type="button">SAUT</button><button class="tb tb-tir" type="button">TIR</button>';
  document.body.append(ui);
  const aide = $('aide'); if (aide) aide.textContent = 'Pouce gauche : marcher · glisse à droite : regarder · TIR : tirer';
  // pas de souris à capturer : on entre directement dans le rêve
  entrer.addEventListener('click', (e) => { e.stopImmediatePropagation(); try { initAudio(); } catch (err) {} beginPlay(); }, true);
  setInterval(() => { ui.hidden = state !== 'playing'; }, 200);
  const zm = ui.querySelector('.tz-marche'), zv = ui.querySelector('.tz-vue'), pad = ui.querySelector('.tmanette'), knob = pad.querySelector('i');
  let stick = null; const look = new Map();
  const setMove = (x, y) => { keys.KeyW = y < -0.3; keys.KeyS = y > 0.3; keys.KeyA = x < -0.3; keys.KeyD = x > 0.3; keys.ShiftLeft = y < -0.5 && Math.hypot(x, y) > 0.92; };
  zm.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (stick) return; stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; pad.style.left = e.clientX + 'px'; pad.style.top = e.clientY + 'px'; pad.style.opacity = '1'; try { zm.setPointerCapture(e.pointerId); } catch (err) {} });
  zm.addEventListener('pointermove', (e) => { if (!stick || stick.id !== e.pointerId) return; let dx = (e.clientX - stick.x) / 55, dy = (e.clientY - stick.y) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } setMove(dx, dy); knob.style.transform = 'translate(' + (dx * 40) + 'px,' + (dy * 40) + 'px)'; });
  const endStick = (e) => { if (!stick || stick.id !== e.pointerId) return; stick = null; setMove(0, 0); knob.style.transform = ''; pad.style.opacity = '0'; };
  zm.addEventListener('pointerup', endStick); zm.addEventListener('pointercancel', endStick);
  zv.addEventListener('pointerdown', (e) => { e.preventDefault(); look.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { zv.setPointerCapture(e.pointerId); } catch (err) {} });
  zv.addEventListener('pointermove', (e) => {
    const l = look.get(e.pointerId); if (!l || state !== 'playing') return;
    const dx = e.clientX - l.x, dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY;
    const k = 0.0042 * sens * (1 - WPN.ads * 0.35);
    P.yaw -= dx * k; P.pitch = clamp(P.pitch - dy * k, -1.45, 1.45); WPN.swx += dx * 0.00012; WPN.swy += dy * 0.00012;
  });
  const endLook = (e) => look.delete(e.pointerId);
  zv.addEventListener('pointerup', endLook); zv.addEventListener('pointercancel', endLook);
  const hold = (sel, on, off) => { const b = ui.querySelector(sel); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); on(); }); const up = () => { b.classList.remove('on'); if (off) off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); };
  hold('.tb-tir', () => { firing = true; }, () => { firing = false; });
  hold('.tb-saut', () => { keys.Space = true; }, () => { keys.Space = false; });
  hold('.tb-rech', () => { startReload(); });
  const viser = ui.querySelector('.tb-viser');
  viser.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); aiming = !aiming; viser.classList.toggle('on', aiming); });
})();
'''
k = v1_body.rindex('})();\n</script>')
v1_body = v1_body[:k] + touch + v1_body[k:]
v1_page = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + v1_head + '\n</head>\n<body>\n' + v1_body.lstrip() + hook + '</body>\n</html>\n'
with open(os.path.join(OUT, 'v1.html'), 'w', encoding='utf-8') as f: f.write(v1_page)
print('index.html', len(page), 'v1.html', len(v1_page), 'fichiers js', len(js_files))
# morceaux du jukebox
import shutil
ASSETS = os.path.join(HERE, 'assets')
if os.path.isdir(ASSETS):
    for root, dirs, files in os.walk(ASSETS):
        for fn in files:
            src = os.path.join(root, fn); dst = os.path.join(OUT, os.path.relpath(src, ASSETS))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(src): shutil.copyfile(src, dst)
