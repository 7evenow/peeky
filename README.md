# Peeky &lt;3

Un mini site statique pour apprendre Valorant tranquillement, repris de la page Notion du même nom.

Un parcours en trois étapes :

1. **Base de Valo** : crosshair placement, mouvement, analyse des maps
2. **Smoker** : le rôle de contrôleur, puis les 13 maps avec minimap, callouts et setups de smokes
3. **Persos** : les 7 smokers du jeu, avec leur kit en français et nos vidéos

Pas de build : le site, c'est des fichiers statiques servis tels quels.

## Structure

```
index.html                  la coquille (header, footer)
assets/js/content.js        NOS ressources : vidéos, liens, conseils, rotation. Le fichier à éditer au quotidien
assets/js/setups.js         les setups de smokes, écrits par l'éditeur
assets/js/game-data.js      GÉNÉRÉ : agents, kits, maps, callouts. Ne pas modifier à la main
assets/js/app.js            le routeur et le rendu
assets/js/board.js          le dessin des setups sur la minimap, et l'éditeur
assets/css/style.css        le style
assets/img/                 GÉNÉRÉ : portraits, icônes de compétences, images et minimaps des maps
scripts/update-game-data.mjs  le script qui génère game-data.js et assets/img/
scripts/dev-server.mjs      le serveur local (npm run dev), qui permet à l'éditeur d'enregistrer
```

## Ajouter du contenu

Tout se passe dans `assets/js/content.js`.

### Une vidéo YouTube

L'`id`, c'est ce qui suit `watch?v=` dans l'URL
(`https://www.youtube.com/watch?v=M3AtZI_FLQ8` → `M3AtZI_FLQ8`) :

```js
{ type: "video", id: "M3AtZI_FLQ8", title: "Corrode — guide complet", note: "optionnel" },
```

Ajoute `map: "corrode"` sur une vidéo pour qu'elle apparaisse **aussi** sur la page de la map.

### Un lien, un conseil, un trou à combler

```js
{ type: "link", url: "https://exemple.com", title: "Le titre affiché", note: "optionnel" },
{ type: "note", text: "Un conseil, un rappel, un ordre à suivre." },
{ type: "todo", text: "Un trou à combler : s'affiche en pointillés." },
```

### Une section

```js
{
  title: "Coaching",
  open: false,          // true = dépliée à l'ouverture de la page
  items: [ ... ],
}
```

### Les agents en couverture d'un thème

Chaque thème a une couverture avec 1 à 3 agents (carte de l'accueil et bandeau de la page) :

```js
cover: { agents: ["jett", "phoenix"] },
```

N'importe quel agent du jeu marche (nom en minuscules, `kay-o` pour KAY/O).
Après un changement, lance `npm run update-data` pour récupérer ses images.

### Des vidéos pour un perso

La fiche (portrait, description, kit) est automatique. Pour ajouter nos vidéos,
une entrée dans `agents` avec le nom du perso en minuscules :

```js
agents: {
  viper: {
    intro: { icon: "💡", text: "Un encadré en haut (optionnel)." },
    sections: [ { title: "Comprendre le kit", open: true, items: [ ... ] } ],
  },
},
```

Les persos listés dans `agents` passent en premier dans la grille, dans l'ordre du fichier.

### Des vidéos ou des notes pour une map

Une entrée dans `maps` avec le nom de la map en minuscules. Elles s'affichent sous la minimap :

```js
maps: {
  ascent: {
    items: [
      { type: "video", id: "ID_YOUTUBE", title: "Les smokes de base sur Ascent" },
      { type: "note", text: "En défense B, on joue souvent depuis Market." },
    ],
  },
},
```

### La rotation classée

À chaque nouvel acte, mets à jour la liste des maps jouables en classé :

```js
rotation: {
  label: "Acte 6 · 2026",
  maps: ["abyss", "bind", "corrode", "haven", "lotus", "summit", "sunset"],
},
```

Ces maps passent en premier dans Smoker avec un badge « En rotation ». Les autres
restent accessibles, un peu plus pâles.

## Les setups de smokes (l'éditeur)

Les setups se dessinent sur la minimap, façon Valoplant :

1. Lance le serveur local : `npm run dev`, puis ouvre http://localhost:4173
2. Va sur une map dans Smoker, clique sur **Éditer les setups**
3. Pose tes smokes, murs et flèches, donne un titre, un côté (attaque / défense) et une note
4. **Enregistrer** (ou Ctrl+S) : c'est écrit dans `assets/js/setups.js`
5. `git add . && git commit -m "Setups" && git push` pour le mettre en ligne

Raccourcis : **V** sélection, **S** smoke, **M** mur, **F** flèche, **1 à 7** pour choisir
l'agent, **clic droit** ou **Suppr** pour effacer, **Ctrl+Z / Ctrl+Y** annuler / rétablir.

Les smokes sont à l'échelle de chaque map. Les rayons (environ 4 m, 4,75 m pour Astra) et
les couleurs se règlent en haut de `assets/js/board.js`.

Le bouton « Éditer » n'apparaît qu'avec `npm run dev` : sur le site en ligne, la page
d'une map montre les setups sans pouvoir les modifier.

## Mettre à jour les persos et les maps

Quand un nouvel agent contrôleur ou une nouvelle map sort :

```bash
npm install
npm run update-data
```

Le script récupère les données en français sur [valorant-api.com](https://valorant-api.com)
(API communautaire qui sert les assets officiels), convertit les images en WebP
et réécrit `assets/js/game-data.js`.

**À propos des callouts** : sur certaines maps retouchées par Riot, les positions fournies
par l'API sont décalées. Le script les recale automatiquement en posant chaque « Site »
sur sa zone jaune de la minimap. Quand le décalage est trop fort, il préfère ne rien
afficher pour la map plutôt que des noms faux. C'est le cas aujourd'hui de **Pearl** et
**Corrode** : le script l'indique dans sa sortie (`callouts masqués`).

## Voir le site en local

Ouvrir `index.html` directement ne suffit pas (le navigateur bloque les fichiers locaux).
Il faut le petit serveur du projet (Node, sans rien à installer) :

```bash
npm run dev
```

Puis ouvrir http://localhost:4173.

## Mettre en ligne sur GitHub Pages

Une fois le dépôt créé sur GitHub :

```bash
git init
git add .
git commit -m "Peeky <3 : premiere version du site"
git branch -M main
git remote add origin https://github.com/<ton-pseudo>/peeky.git
git push -u origin main
```

Ensuite, sur GitHub : **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**.

Le site sera en ligne sur `https://<ton-pseudo>.github.io/peeky/` au bout d'une minute.
À chaque `git push`, il se met à jour tout seul.

## Mentions

Site perso et non commercial, ni approuvé ni sponsorisé par Riot Games. Valorant, ses
images et ses données sont la propriété de Riot Games, Inc.
