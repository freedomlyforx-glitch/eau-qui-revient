#!/bin/bash
# construit, extrait le code du jeu et vérifie la syntaxe + les identifiants inconnus
cd "$(dirname "$0")"
python3 build.py >/dev/null || exit 1
python3 - <<'PY'
S='.'
p=open(S+'/site/index.html',encoding='utf-8').read()
a="<script>\n(function () {\n'use strict';\n"; i=p.rindex(a); j=p.index('\n})();\n</script>\n</body>', i)
open(S+'/game_check.js','w',encoding='utf-8').write(p[i+len('<script>\n'):j+len('\n})();')])
PY
node --check game_check.js || exit 1
npx -y eslint@8 --no-eslintrc --parser-options=ecmaVersion:2022 --env browser,es2022 --global THREE,Trystero --rule 'no-undef: error' --rule 'no-redeclare: error' --rule 'no-const-assign: error' --rule 'no-dupe-keys: error' --rule 'no-unreachable: warn' game_check.js 2>&1 | grep -v "^$" | head -${1:-60}
