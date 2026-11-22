# Sources de "L'eau qui revient"

Ce dossier contient tout ce qu'il faut pour reconstruire les pages du jeu. Il n'est pas utilisé par le site lui-même.

- `v3/src` : le niveau de base, le front de mer (`index.html`). Le code est découpé en fichiers numérotés dans `v3/src/js`, assemblés dans l'ordre alphabétique.
- `v2/src` : le niveau précédent, le lotissement (`lotissement.html`).
- `eau-qui-revient.html` : la toute première version (`v1.html`).
- `essais` : les essais automatiques (ils pilotent un navigateur sans écran) et leurs scénarios.

## Reconstruire le site

Depuis la racine du dépôt :

    python3 sources/v3/build.py .

Cette commande réécrit `index.html`, `lotissement.html` et `v1.html`. Les musiques (`musique/`) et l'image d'aperçu (`apercu.jpg`) sont déjà à la racine et ne sont pas touchées.

## Vérifier avant de publier

    sources/v3/check.sh

Le script reconstruit le jeu dans `sources/v3/site`, vérifie la syntaxe et signale les noms inconnus.

Les essais du dossier `essais` attendent, à côté de `v2` et `v3`, un dossier `lib/package` (le paquet `three` version 0.147.0 décompressé) et un dossier `fonts` (les paquets `@fontsource/vt323` et `@fontsource/cormorant-garamond` décompressés). Exemple :

    SITE=v3 python3 sources/essais/v2_dbg.py sources/essais/scenarios/casse.txt

## Mesurer la fluidité

Quatre essais servent à comparer deux versions du jeu sans dépendre de la carte graphique de la machine :

- `essais/v3_gl.py` : nombre d'ordres envoyés à la carte graphique par image, et temps de calcul pur du programme par image ;
- `essais/v3_gpu.py` : temps complet d'une image en rendu logiciel, mesuré image par image ;
- `essais/v3_parts.py` : part de chaque élément (mer, ciel, sol, ombres…) dans ce temps ;
- `essais/v3_calls.py` : liste de tout ce qui est dessiné dans une image, passe par passe.

En jeu, le réglage "Afficher la fluidité" donne le nombre d'images par seconde réellement affichées par l'appareil.
