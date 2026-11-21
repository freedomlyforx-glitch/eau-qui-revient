#!/usr/bin/env python3
"""Assemble le site : index.html (le front de mer), lotissement.html (le niveau précédent) et v1.html (la toute première version)."""
import os, sys, subprocess, shutil, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
V2 = os.path.join(HERE, '..', 'v2')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'site')
os.makedirs(OUT, exist_ok=True)
DESC2 = "Un rêve en vue subjective : un lotissement californien pastel figé au coucher du soleil, des maisons qu'on peut détruire, des moutons arc-en-ciel, et un monstre d'eau qui revient toujours. Seul ou à plusieurs."
DESC3 = "Un rêve en vue subjective : un front de mer pastel entre jour et nuit, une jetée foraine, une grande roue, des petits jeux, une villa-refuge dont l'ordinateur redescend dans les niveaux précédents du rêve, et un monstre d'eau qui revient avec la marée. Seul ou à plusieurs."
def read(p):
    with open(p, encoding='utf-8') as f: return f.read()
def write(p, s):
    with open(p, 'w', encoding='utf-8') as f: f.write(s)
def between(s, a, b, last=False):
    i = (s.rindex(a) if last else s.index(a)) + len(a); j = s.index(b, i); return i, j
tmp = tempfile.mkdtemp(prefix='v2site-')
subprocess.run([sys.executable, os.path.join(V2, 'build.py'), tmp], check=True, stdout=subprocess.DEVNULL)
v2 = read(os.path.join(tmp, 'index.html'))
# --- le niveau précédent, jouable seul ou depuis l'ordinateur de la villa ---
key = "  if (PC.phase === 'dedans' && e.code === 'KeyX') { exitPC(); return; }\n"
assert key in v2
lot = v2.replace(key, key + "  if (e.code === 'KeyX' && !PC.phase && !P.ui && parent !== window && /[?&]pc=1/.test(location.search) && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (err) {} try { parent.postMessage({ type: 'quitter-pc' }, '*'); } catch (err) {} return; }\n", 1)
hook = '''<script>
(function () {
  if (!/[?&]pc=1/.test(location.search) || parent === window) return;
  var a = document.getElementById('aide'); if (a) a.textContent += ' · X : remonter au front de mer';
  var s = document.querySelector('.sur-titre'); if (s) s.textContent = 'MAREA OS · niveau 2 · le lotissement Las Palmas';
})();
</script>
'''
lot = lot.replace('</body>\n</html>', hook + '</body>\n</html>')
write(os.path.join(OUT, 'lotissement.html'), lot)
shutil.copyfile(os.path.join(tmp, 'v1.html'), os.path.join(OUT, 'v1.html'))
# --- le front de mer : même squelette de page, avec ses propres styles, balises et code ---
js_files = sorted(f for f in os.listdir(os.path.join(SRC, 'js')) if f.endswith('.js'))
game = '\n'.join(read(os.path.join(SRC, 'js', f)) for f in js_files)
page = v2.replace(DESC2, DESC3)
i, j = between(page, '<style>\n', '\n</style>\n</head>'); page = page[:i] + read(os.path.join(SRC, 'style.css')) + page[j:]
i, j = between(page, '<body>\n', '<script src="https://cdn.jsdelivr.net'); page = page[:i] + read(os.path.join(SRC, 'markup.html')) + '\n' + page[j:]
i, j = between(page, "<script>\n(function () {\n'use strict';\n", '\n})();\n</script>\n</body>', last=True); page = page[:i] + game + page[j:]
write(os.path.join(OUT, 'index.html'), page)
for name in os.listdir(tmp):
    if name in ('index.html', 'v1.html'): continue
    src, dst = os.path.join(tmp, name), os.path.join(OUT, name)
    if os.path.isdir(src): shutil.copytree(src, dst, dirs_exist_ok=True)
    else: shutil.copyfile(src, dst)
shutil.rmtree(tmp, ignore_errors=True)
print('index.html', len(page), 'lotissement.html', len(lot), 'fichiers js', len(js_files))
