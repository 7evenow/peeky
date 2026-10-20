/* ------------------------------------------------------------------
   Le contenu du site. C'est le SEUL fichier à modifier au quotidien.

   Les fiches des persos (portrait, rôle, kit) et des maps (image,
   minimap, callouts) viennent toutes seules de game-data.js : ici on
   ne met que NOS ressources (vidéos, liens, conseils).

   Un thème    : { slug, step, title, tagline, tags, cover?, intro?, channels?, sections }
   La couverture : { agents: ["jett", "phoenix"] }  (1 à 3 agents, nom en minuscules,
                   puis npm run update-data pour récupérer leurs images)
   Une chaîne  : { name, handle, url, note? }
   Une section : { title, open?, items: [...] }
   Un item     : { type: "video", id: "ID_YOUTUBE", title, note?, map? }
                 { type: "link",  url, title, note? }
                 { type: "note",  text }
                 { type: "todo",  text }   <- un trou à combler, affiché en pointillés

   Sur une vidéo, `map: "ascent"` l'affiche aussi sur la page de la map.
   ------------------------------------------------------------------ */

const CONTENT = {
  hero: {
    title: "Peeky <3",
    tagline:
      "Pas besoin de tout savoir d'un coup. Un thème à la fois, dans l'ordre, et ça rentre tout seul.",
  },

  /* ---------- les thèmes, dans l'ordre du parcours ---------- */

  topics: [
    {
      slug: "base-valo",
      step: "01",
      title: "Base de Valo",
      tagline: "Les fondations : regarder au bon endroit, bouger juste, lire une map.",
      tags: ["peek", "angles", "timing", "maps", "crosshair", "mouvement"],
      cover: { agents: ["jett", "phoenix"] },
      intro: {
        icon: "💡",
        text:
          "Les vidéos sont en anglais, mais les sous-titres français s'activent tout seuls quand tu lances une vidéo ici. Si ça va trop vite, mets la lecture en 0.75×.",
      },
      channels: [
        {
          name: "Slayerkey",
          handle: "@Slayerkey",
          url: "https://www.youtube.com/@Slayerkey",
          note: "Coach Valorant. C'est lui qui fait tous les guides de map plus bas.",
        },
        {
          name: "korey",
          handle: "@koreyVAL",
          url: "https://www.youtube.com/@koreyVAL/videos",
          note: "Format court, beaucoup de fondamentaux et de mécaniques.",
        },
      ],
      sections: [
        {
          title: "Par où commencer",
          open: true,
          items: [
            {
              type: "note",
              text:
                "Avant les maps : savoir où placer son viseur et comment s'arrêter pour tirer. C'est 80 % des duels gagnés en bas elo. Les deux sections juste en dessous d'abord, les maps après.",
            },
          ],
        },
        {
          title: "Crosshair placement",
          open: true,
          items: [
            {
              type: "video",
              id: "4PHtg9MONOE",
              title: "Entraîner son crosshair placement",
              note:
                "korey — la toute première vidéo à regarder. Viser à hauteur de tête, pré-viser les angles : c'est ce qui fait gagner les duels avant même de tirer.",
            },
          ],
        },
        {
          title: "Mouvement",
          open: true,
          items: [
            {
              type: "video",
              id: "8lgwinmOFMI",
              title: "Entraîner son mouvement",
              note:
                "korey — s'arrêter net avant de tirer, strafe, contre-strafe. À regarder juste après le crosshair placement.",
            },
          ],
        },
        {
          title: "Analyse des maps",
          open: false,
          items: [
            {
              type: "note",
              text:
                "Une map à la fois, et seulement celles qui tombent dans ta rotation. Regarder les 7 d'affilée ne sert à rien. Chaque guide est aussi rangé sur la page de sa map, dans Smoker.",
            },
            { type: "video", id: "M3AtZI_FLQ8", title: "Corrode — guide complet", map: "corrode" },
            { type: "video", id: "IaoCZCGuCMc", title: "Abyss — guide complet", map: "abyss" },
            { type: "video", id: "hx4EU_pkw-Q", title: "Summit — guide complet", map: "summit" },
            { type: "video", id: "qZifu8u8pJU", title: "Haven — tout ce qu'il faut savoir", map: "haven" },
            { type: "video", id: "uxyx0QEoS00", title: "Bind — entry & angles de défense", map: "bind" },
            { type: "video", id: "jspCQg61_S0", title: "Lotus — entry & angles de défense", map: "lotus" },
            { type: "video", id: "KI5d7Jz0sMA", title: "Sunset — entry & angles de défense", map: "sunset" },
          ],
        },
      ],
    },

    {
      slug: "smoker",
      step: "02",
      title: "Smoker",
      tagline: "Poser ses fumées au bon endroit, au bon moment.",
      tags: ["rôle", "types de smokes", "smokes par map"],
      cover: { agents: ["viper", "brimstone"] },
      intro: {
        icon: "💡",
        text: "Sur la première vidéo, regarde jusqu'à 5 min 52. Après, c'est moins utile.",
      },
      sections: [
        {
          title: "Les bases du rôle",
          open: true,
          items: [
            {
              type: "video",
              id: "Qzsih0CWrxk",
              title: "Comprendre le rôle de contrôleur",
              note:
                "Warsky — à regarder jusqu'à 5 min 52, après c'est moins utile. Pourquoi on fume, et pour qui.",
            },
            {
              type: "video",
              id: "ixKzcf3jpGc",
              title: "Chaque type de fumée et à quoi elle sert",
              note: "SC Valorant Guides — les différentes façons d'utiliser une smoke.",
            },
          ],
        },
      ],
      // La grille des maps s'affiche sous les sections
      maps: {
        title: "Smokes par map",
        text:
          "Choisis une map : la minimap avec les callouts, le guide vidéo s'il y en a un, et les smokes à connaître.",
      },
    },
  ],

  /* ---------- persos ---------- */

  persos: {
    step: "03",
    title: "Persos",
    tagline: "Tous les smokers du jeu : leur kit expliqué en français, et nos vidéos pour chacun.",
    tags: ["kit", "coaching", "games pro"],
  },

  // Une entrée par perso (le nom en minuscules). Ceux listés ici passent
  // en premier dans la grille, dans cet ordre. Les autres suivent par ordre
  // alphabétique, avec juste leur fiche et leur kit.
  agents: {
    clove: {
      intro: {
        icon: "💡",
        text:
          "Les deux premières vidéos sont en français. Le reste est en anglais, avec les sous-titres FR qui s'activent tout seuls.",
      },
      sections: [
        {
          title: "Comprendre le kit",
          open: true,
          items: [
            {
              type: "video",
              id: "EeGxZsxSlGo",
              title: "Bien comprendre et jouer Clove en 2026",
              note: "ZEN — en français. Le tutoriel à voir en premier : à quoi sert chaque compétence.",
            },
          ],
        },
        {
          title: "Coaching",
          open: true,
          items: [
            {
              type: "video",
              id: "GCX6G8nsgN0",
              title: "Coaching pour sortir du Gold (Breeze / Clove)",
              note: "WiPR — en français. Un vrai coaching sur une joueuse, les erreurs y sont expliquées une par une.",
            },
            {
              type: "video",
              id: "RNbf9yZGPyQ",
              title: "La différence entre un Clove Gold et un Clove Immortal",
              note: "bonkar — ce qui sépare les deux niveaux, concrètement.",
            },
          ],
        },
        {
          title: "Analyse de gameplay",
          open: false,
          items: [
            {
              type: "video",
              id: "LecoFJAKelI",
              title: "Carry comme un Clove Radiant (comment il réfléchit)",
              note: "Maxie — la logique de décision, pas juste les placements.",
            },
            {
              type: "video",
              id: "yDr9mVVb8ZE",
              title: "VOD Clove Sunset Radiant 41/19",
              note: "strikerval — une partie commentée de bout en bout.",
            },
          ],
        },
        {
          title: "Games pro",
          open: false,
          items: [
            {
              type: "note",
              text:
                "À regarder plus tard, pour le plaisir et pour voir ce que donne le personnage au plus haut niveau. Pas prioritaire pour progresser.",
            },
            { type: "video", id: "1MmuwZbziO4", title: "zekken — Clove en agent de carry (36 kills, MVP)" },
            { type: "video", id: "l5Rkpik0iBA", title: "NRG s0m — Clove, match complet (35+ élims, MVP)" },
          ],
        },
      ],
    },

    omen: {
      sections: [],
    },
  },

  /* ---------- rotation classée ----------
     Les maps jouables en classé cette saison (nom en minuscules).
     À mettre à jour à chaque nouvel acte. */

  rotation: {
    label: "Acte 6 · 2026",
    maps: ["abyss", "bind", "corrode", "haven", "lotus", "summit", "sunset"],
  },

  /* ---------- vidéos et notes par map ----------
     Les setups de smokes, eux, se font avec l'éditeur (assets/js/setups.js). */

  // Une entrée par map (le nom en minuscules), affichée sous la minimap.
  // Exemple :
  //   ascent: {
  //     items: [
  //       { type: "video", id: "ID_YOUTUBE", title: "Les smokes de base sur Ascent" },
  //       { type: "note", text: "En défense B, on joue souvent depuis Market." },
  //     ],
  //   },
  maps: {},
};
