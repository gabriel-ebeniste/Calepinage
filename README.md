# Calepinage atelier (PWA)

Application 100 % côté client (HTML/CSS/JS), sans serveur ni Node pour fonctionner.

## Publier sur GitHub Pages
1. Sur github.com : **New repository** (nom ex. `calepinage`, public).
2. **Add file → Upload files** : déposez **le contenu** du dossier (index.html, manifest.json, service-worker.js, css/, js/, assets/, tests/, README.md, package.json), puis **Commit**.
3. **Settings → Pages** : *Source* = « Deploy from a branch », branche `main`, dossier `/ (root)`, **Save**.
4. Après ~1 min, l'adresse est `https://VOTRE-NOM.github.io/calepinage/` (affichée en haut de la page Pages).
5. Ouvrez cette adresse dans **Safari** sur l'iPhone, puis **Partager → Sur l'écran d'accueil**.
6. Hors connexion : ouvrez l'app une fois en ligne ; les fichiers sont ensuite en cache.
7. Mises à jour : remplacez les fichiers sur GitHub **et changez `V = 'calepinage-v1'` en `v2`, `v3`…** dans `service-worker.js`. L'app récupère la nouvelle version à l'ouverture suivante (fermez/rouvrez-la une ou deux fois).

Tous les chemins sont relatifs : le site fonctionne dans un sous-dossier GitHub Pages.

## Tests du moteur
`node tests/test.mjs` (Node ≥ 18), sans navigateur.

## Limites
Les projets sont stockés sur l'appareil (localStorage). iPhone et ordinateur ne se synchronisent pas : utilisez **Exporter / Importer** (fichier JSON).
