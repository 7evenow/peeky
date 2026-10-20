/* Routeur + rendu. Normalement pas besoin d'y toucher pour ajouter du contenu. */
(function () {
  "use strict";

  var main = document.getElementById("main");
  var topnav = document.getElementById("topnav");
  var SITE = "Peeky <3";

  /* ---------- outils ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function plural(n, one, many) {
    return n + " " + (n > 1 ? many : one);
  }

  function find(list, slug) {
    return list.filter(function (x) { return x.slug === slug; })[0];
  }

  function isResource(item) {
    return item.type === "video" || item.type === "link";
  }

  function countIn(sections) {
    return (sections || []).reduce(function (n, s) {
      return n + s.items.filter(isResource).length;
    }, 0);
  }

  // Les persos mis en avant dans content.js d'abord, les autres ensuite
  function orderedAgents() {
    var featured = Object.keys(CONTENT.agents || {});
    return GAME.agents.slice().sort(function (a, b) {
      var ia = featured.indexOf(a.slug), ib = featured.indexOf(b.slug);
      if (ia === -1) ia = 999;
      if (ib === -1) ib = 999;
      return ia - ib || a.name.localeCompare(b.name, "fr");
    });
  }

  function agentContent(slug) {
    return (CONTENT.agents || {})[slug] || { sections: [] };
  }

  function mapItems(slug) {
    return ((CONTENT.maps || {})[slug] || {}).items || [];
  }

  // Les vidéos des thèmes rattachées à une map (champ `map`)
  function guidesFor(slug) {
    var out = [];
    CONTENT.topics.forEach(function (t) {
      t.sections.forEach(function (s) {
        s.items.forEach(function (i) {
          if (i.map === slug) out.push(i);
        });
      });
    });
    return out;
  }

  function inRotation(slug) {
    return ((CONTENT.rotation || {}).maps || []).indexOf(slug) !== -1;
  }

  // Les maps en rotation d'abord, puis les autres (ordre alphabétique dans chaque groupe)
  function orderedMaps() {
    return GAME.maps.filter(function (m) { return inRotation(m.slug); })
      .concat(GAME.maps.filter(function (m) { return !inRotation(m.slug); }));
  }

  function setupsFor(slug) {
    return (typeof SETUPS !== "undefined" && SETUPS[slug]) || [];
  }

  function setTitle(title) {
    document.title = title ? title + " · " + SITE : SITE + " — apprendre Valorant";
  }

  /* ---------- navigation ---------- */

  function renderNav(active) {
    var links = CONTENT.topics.map(function (t) {
      return { href: "#/" + t.slug, slug: t.slug, label: t.title };
    });
    links.push({ href: "#/persos", slug: "persos", label: CONTENT.persos.title });

    topnav.innerHTML = links
      .map(function (l) {
        var on = l.slug === active ? ' aria-current="page"' : "";
        return '<a href="' + l.href + '"' + on + ">" + esc(l.label) + "</a>";
      })
      .join("");
  }

  /* ---------- blocs communs ---------- */

  function renderItem(item) {
    if (item.type === "video") {
      return (
        '<article class="video">' +
        '<button class="video-thumb" type="button" data-video="' + esc(item.id) + '" ' +
        'aria-label="Lancer la vidéo : ' + esc(item.title) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(item.id) + '/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360">' +
        '<span class="video-play" aria-hidden="true"></span>' +
        "</button>" +
        '<div class="video-meta">' +
        "<h4>" + esc(item.title) + "</h4>" +
        (item.note ? "<p>" + esc(item.note) + "</p>" : "") +
        '<a class="video-out" href="https://www.youtube.com/watch?v=' + esc(item.id) +
        '" target="_blank" rel="noopener">Ouvrir sur YouTube</a>' +
        "</div></article>"
      );
    }

    if (item.type === "link") {
      return (
        '<a class="link" href="' + esc(item.url) + '" target="_blank" rel="noopener">' +
        '<span class="link-icon" aria-hidden="true">↗</span>' +
        "<span><strong>" + esc(item.title) + "</strong>" +
        (item.note ? "<em>" + esc(item.note) + "</em>" : "") +
        "</span></a>"
      );
    }

    if (item.type === "todo") return '<p class="todo">' + esc(item.text) + "</p>";

    return '<p class="note">' + esc(item.text) + "</p>";
  }

  function renderSection(s) {
    var videos = s.items.filter(function (it) { return it.type === "video"; }).length;
    return (
      "<details" + (s.open ? " open" : "") + ">" +
      "<summary><span>" + esc(s.title) + "</span>" +
      (videos ? '<span class="pill">' + plural(videos, "vidéo", "vidéos") + "</span>" : "") +
      "</summary>" +
      '<div class="section-body">' + s.items.map(renderItem).join("") + "</div>" +
      "</details>"
    );
  }

  function renderSections(sections) {
    if (!sections || !sections.length) return "";
    return '<div class="sections">' + sections.map(renderSection).join("") + "</div>";
  }

  function renderCallout(intro) {
    if (!intro) return "";
    return (
      '<aside class="callout"><span class="callout-icon" aria-hidden="true">' +
      esc(intro.icon || "💡") + "</span><p>" + esc(intro.text) + "</p></aside>"
    );
  }

  function renderBack(href, label) {
    return '<a class="back" href="' + href + '">' + esc(label) + "</a>";
  }

  // Une "scène" : 1 à 3 agents sur leurs couleurs, pour les couvertures
  function renderStage(cover) {
    var cast = (cover.agents || [])
      .map(function (slug) { return (GAME.cast || {})[slug] || find(GAME.agents, slug); })
      .filter(Boolean)
      .slice(0, 3);
    if (!cast.length) return "";
    var style = cast
      .map(function (a, i) { return "--c" + i + ":" + a.colors[0] + ";--g" + i + ":" + (a.colors[2] || a.colors[0]); })
      .join(";");
    return (
      '<span class="stage stage--' + cast.length + '" style="' + style + '">' +
      cast.map(function (a, i) {
        return '<img class="stage-bg stage-bg--' + i + '" src="' + esc(a.background) + '" alt="" loading="lazy" decoding="async">';
      }).join("") +
      cast.map(function (a, i) {
        return '<img class="stage-agent stage-agent--' + i + '" src="' + esc(a.portrait) + '" alt="" loading="lazy" decoding="async">';
      }).join("") +
      "</span>"
    );
  }

  function renderCover(cover, imgClass) {
    if (!cover) return "";
    if (cover.agents) return renderStage(cover);
    return '<img class="' + imgClass + '" src="' + esc(cover) + '" alt="" loading="lazy" decoding="async">';
  }

  // En-tête de page avec une image ou une scène en bandeau
  function renderBanner(o) {
    var media = o.cover ? renderCover(o.cover, "banner-img") : "";
    var kind = !media ? " banner--plain" : o.cover.agents ? " banner--stage" : "";
    return (
      '<header class="banner' + kind + '">' + media +
      '<div class="banner-text">' +
      (o.eyebrow ? '<span class="eyebrow">' + esc(o.eyebrow) + "</span>" : "") +
      "<h1>" + esc(o.title) + "</h1>" +
      (o.tagline ? '<p class="banner-tagline">' + esc(o.tagline) + "</p>" : "") +
      "</div></header>"
    );
  }

  // Liens précédent / suivant en bas des fiches, avec le visuel de la page visée
  function pagerThumb(x) {
    if (x.portrait) {
      return (
        '<span class="pager-thumb pager-thumb--agent" style="--c1:' + x.colors[0] + ";--c3:" + x.colors[2] + '">' +
        '<img src="' + esc(x.portrait) + '" alt="" loading="lazy" decoding="async"></span>'
      );
    }
    if (x.card) {
      return '<span class="pager-thumb"><img src="' + esc(x.card) + '" alt="" loading="lazy" decoding="async"></span>';
    }
    return "";
  }

  function renderPager(prev, next, base) {
    function cell(x, dir) {
      if (!x) return "<span></span>";
      return (
        '<a class="pager-' + dir + '" href="#/' + base + x.slug + '">' + pagerThumb(x) +
        "<small>" + (dir === "prev" ? "Précédent" : "Suivant") + "</small>" +
        "<strong>" + esc(x.name) + "</strong></a>"
      );
    }
    return '<nav class="pager" aria-label="Pages voisines">' + cell(prev, "prev") + cell(next, "next") + "</nav>";
  }

  function renderChannels(channels) {
    if (!channels || !channels.length) return "";
    var cards = channels
      .map(function (c) {
        return (
          '<a class="channel" href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
          '<span class="channel-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">' +
          '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>' +
          "</svg></span>" +
          '<span class="channel-body">' +
          "<strong>" + esc(c.name) + "</strong>" +
          '<span class="channel-handle">' + esc(c.handle) + "</span>" +
          (c.note ? "<em>" + esc(c.note) + "</em>" : "") +
          "</span></a>"
        );
      })
      .join("");
    return (
      '<section class="block" aria-label="Chaînes YouTube à suivre">' +
      '<h2 class="block-title">Les chaînes à suivre</h2>' +
      '<div class="channels-grid">' + cards + "</div></section>"
    );
  }

  /* ---------- accueil ---------- */

  function homeCard(o) {
    var tags = (o.tags || [])
      .map(function (t) { return "<li>" + esc(t) + "</li>"; })
      .join("");
    return (
      '<a class="card" href="' + o.href + '">' +
      '<span class="card-media">' + o.media + "</span>" +
      '<span class="card-body">' +
      '<span class="card-top"><span class="card-step">' + esc(o.step) + "</span>" +
      '<span class="card-badge">' + esc(o.badge) + "</span></span>" +
      "<h2>" + esc(o.title) + "</h2>" +
      "<p>" + esc(o.tagline) + "</p>" +
      (tags ? '<ul class="tags">' + tags + "</ul>" : "") +
      '<span class="card-go">Ouvrir</span>' +
      "</span></a>"
    );
  }

  function renderHome() {
    setTitle(null);

    var cards = CONTENT.topics.map(function (t) {
      var n = countIn(t.sections);
      return homeCard({
        href: "#/" + t.slug,
        step: t.step,
        title: t.title,
        tagline: t.tagline,
        tags: t.tags,
        badge: t.maps ? plural(n, "vidéo", "vidéos") + " · " + GAME.maps.length + " maps" : plural(n, "vidéo", "vidéos"),
        media: renderCover(t.cover, ""),
      });
    });

    var lineup = orderedAgents()
      .slice(0, 4)
      .map(function (a) {
        return (
          '<span class="lineup-agent" style="--c1:' + a.colors[0] + ";--c3:" + a.colors[2] + '">' +
          '<img src="' + esc(a.portrait) + '" alt="" loading="lazy" decoding="async"></span>'
        );
      })
      .join("");

    cards.push(
      homeCard({
        href: "#/persos",
        step: CONTENT.persos.step,
        title: CONTENT.persos.title,
        tagline: CONTENT.persos.tagline,
        tags: CONTENT.persos.tags,
        badge: plural(GAME.agents.length, "smoker", "smokers"),
        media: '<span class="lineup">' + lineup + "</span>",
      })
    );

    var star = orderedAgents()[0];

    main.innerHTML =
      '<section class="hero">' +
      (star
        ? '<div class="hero-peek" aria-hidden="true" style="--c1:' + star.colors[0] + ";--c3:" + star.colors[2] + '">' +
          '<img class="hero-peek-bg" src="' + esc(star.background) + '" alt="">' +
          '<img class="hero-peek-agent" src="' + esc(star.portrait) + '" alt=""></div>'
        : "") +
      '<div class="hero-text">' +
      '<span class="eyebrow">Le parcours</span>' +
      "<h1>" + esc(CONTENT.hero.title).replace("&lt;3", '<span class="heart">&lt;3</span>') + "</h1>" +
      "<p>" + esc(CONTENT.hero.tagline) + "</p>" +
      "</div></section>" +
      '<section class="grid" aria-label="Les étapes">' + cards.join("") + "</section>";
  }

  /* ---------- page thème ---------- */

  function mapCard(m) {
    var guides = guidesFor(m.slug).length;
    var setups = setupsFor(m.slug).length;
    var badges = "";
    if (inRotation(m.slug)) badges += '<span class="map-badge map-badge--rot">En rotation</span>';
    if (guides) badges += '<span class="map-badge">Guide vidéo</span>';
    if (setups) badges += '<span class="map-badge map-badge--red">' + plural(setups, "setup", "setups") + "</span>";
    return (
      '<a class="map-card' + (inRotation(m.slug) ? "" : " map-card--off") + '" href="#/smoker/' + m.slug + '">' +
      '<img src="' + esc(m.card) + '" alt="" loading="lazy" decoding="async" width="640" height="360">' +
      (badges ? '<span class="map-badges">' + badges + "</span>" : "") +
      '<span class="map-card-info"><strong>' + esc(m.name) + "</strong>" +
      "<span>" + esc(m.sites) + "</span></span></a>"
    );
  }

  function renderMapGrid(block) {
    var on = GAME.maps.filter(function (m) { return inRotation(m.slug); });
    var off = GAME.maps.filter(function (m) { return !inRotation(m.slug); });
    var rot = CONTENT.rotation || {};

    return (
      '<section class="block block--maps" id="maps">' +
      '<h2 class="block-heading">' + esc(block.title) + "</h2>" +
      (block.text ? '<p class="block-text">' + esc(block.text) + "</p>" : "") +
      (on.length
        ? '<h3 class="map-group">En rotation' + (rot.label ? " <small>" + esc(rot.label) + "</small>" : "") + "</h3>" +
          '<div class="map-grid">' + on.map(mapCard).join("") + "</div>"
        : "") +
      (off.length
        ? '<h3 class="map-group">' + (on.length ? "Hors rotation <small>jouables en non classé</small>" : "Toutes les maps") + "</h3>" +
          '<div class="map-grid">' + off.map(mapCard).join("") + "</div>"
        : "") +
      "</section>"
    );
  }

  function renderTopic(topic) {
    setTitle(topic.title);
    main.innerHTML =
      '<article class="page">' +
      renderBack("#/", "Tous les thèmes") +
      renderBanner({
        cover: topic.cover,
        eyebrow: topic.step ? "Étape " + topic.step : "",
        title: topic.title,
        tagline: topic.tagline,
      }) +
      renderCallout(topic.intro) +
      renderChannels(topic.channels) +
      renderSections(topic.sections) +
      (topic.maps ? renderMapGrid(topic.maps) : "") +
      "</article>";
  }

  /* ---------- page map ---------- */

  var currentMap = null;

  function setupInfo(setup) {
    if (!setup) return "";
    var legend = Board.legend(setup);
    return (
      (legend ? '<div class="legend">' + legend + "</div>" : "") +
      (setup.note ? '<p class="board-note">' + esc(setup.note) + "</p>" : "")
    );
  }

  function renderBoard(m) {
    if (!m.minimap) return "";
    var setups = setupsFor(m.slug);
    var has = m.callouts.length > 0;
    var labels = m.callouts
      .map(function (c) {
        return (
          '<span class="callout-label' + (c.site ? " is-site" : "") + '" style="left:' +
          (c.x * 100).toFixed(2) + "%;top:" + (c.y * 100).toFixed(2) + '%">' + esc(c.label) + "</span>"
        );
      })
      .join("");

    var chips = setups
      .map(function (st, i) {
        return (
          '<button type="button" class="chip" data-setup="' + i + '" aria-pressed="' + (i === 0) + '">' +
          '<span class="side side--' + (st.side === "défense" ? "def" : "atk") + '">' + esc(st.side) + "</span>" +
          esc(st.title) + "</button>"
        );
      })
      .join("");

    return (
      '<section class="block">' +
      '<div class="block-row"><h2 class="block-heading">La map</h2><div class="block-actions">' +
      (has ? '<button class="toggle" type="button" data-toggle-callouts aria-pressed="true">Masquer les noms</button>' : "") +
      '<a class="toggle dev-only" href="#/smoker/' + m.slug + '/editeur">Éditer les setups</a>' +
      "</div></div>" +
      '<p class="block-text">' +
      (has
        ? "Les noms des zones, ceux que tout le monde utilise en vocal (en anglais, même sur les serveurs français)."
        : "Pour cette map, les noms de zones fournis par le jeu tombent au mauvais endroit : on ne les affiche pas plutôt que d'apprendre des noms faux. Les sites sont les zones jaunes.") +
      (setups.length ? " Choisis un setup pour voir où poser les smokes." : "") +
      "</p>" +
      (setups.length
        ? '<div class="chips" role="group" aria-label="Setups de smokes">' + chips + "</div>"
        : '<p class="board-empty">Pas encore de setup de smokes sur cette map.<span class="dev-only"> Crée le premier avec l&#39;éditeur.</span></p>') +
      '<figure class="minimap"><div class="minimap-inner board">' +
      '<img src="' + esc(m.minimap) + '" alt="Minimap de ' + esc(m.name) + '" decoding="async" width="900" height="900">' +
      '<div class="board-slot">' + Board.svg(m, setups[0]) + "</div>" +
      labels + "</div></figure>" +
      '<div class="board-info">' + setupInfo(setups[0]) + "</div>" +
      "</section>"
    );
  }

  function renderMap(m) {
    setTitle(m.name);
    currentMap = m;
    var list = orderedMaps();
    var i = list.indexOf(m);
    var guides = guidesFor(m.slug);
    var notes = mapItems(m.slug);

    var sections = [];
    if (guides.length) sections.push({ title: "Guide de la map", open: true, items: guides });
    if (notes.length) sections.push({ title: "Vidéos et notes", open: true, items: notes });

    main.innerHTML =
      '<article class="page">' +
      renderBack("#/smoker", "Smoker") +
      renderBanner({
        cover: m.cover,
        eyebrow: (inRotation(m.slug) ? "En rotation · " : "") + m.sites + (m.coordinates ? " · " + m.coordinates : ""),
        title: m.name,
      }) +
      renderBoard(m) +
      renderSections(sections) +
      renderPager(list[i - 1], list[i + 1], "smoker/") +
      "</article>";
  }

  /* ---------- éditeur de setups ---------- */

  var editor = null;

  function renderEditor(m) {
    setTitle("Éditeur · " + m.name);
    main.innerHTML = '<div class="editor-root"></div>';
    editor = Board.mountEditor(main.querySelector(".editor-root"), m, orderedAgents());
  }

  /* ---------- persos ---------- */

  function renderPersos() {
    setTitle(CONTENT.persos.title);
    var cards = orderedAgents()
      .map(function (a) {
        var n = countIn(agentContent(a.slug).sections);
        return (
          '<a class="agent-card" href="#/persos/' + a.slug + '" style="--c1:' + a.colors[0] + ";--c3:" + a.colors[2] + '">' +
          '<img class="agent-card-bg" src="' + esc(a.background) + '" alt="" loading="lazy" decoding="async">' +
          '<img class="agent-card-portrait" src="' + esc(a.portrait) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="agent-card-info">' +
          '<span class="agent-card-badge' + (n ? " is-filled" : "") + '">' +
          (n ? plural(n, "vidéo", "vidéos") : "Kit") + "</span>" +
          "<strong>" + esc(a.name) + "</strong></span></a>"
        );
      })
      .join("");

    main.innerHTML =
      '<article class="page">' +
      renderBack("#/", "Tous les thèmes") +
      renderBanner({
        eyebrow: "Étape " + CONTENT.persos.step,
        title: CONTENT.persos.title,
        tagline: CONTENT.persos.tagline,
      }) +
      '<section class="agent-grid" aria-label="Les smokers">' + cards + "</section>" +
      "</article>";
  }

  function renderAgent(a) {
    setTitle(a.name);
    var list = orderedAgents();
    var i = list.indexOf(a);
    var extra = agentContent(a.slug);

    // Le kit façon jeu : une rangée d'icônes, la description de celle choisie
    var tabs = a.abilities
      .map(function (ab, i) {
        return (
          '<button class="kit-tab" type="button" role="tab" id="kit-tab-' + i + '" ' +
          'aria-controls="kit-panel-' + i + '" aria-selected="' + (i === 0) + '" data-ability="' + i + '">' +
          '<span class="ability-icon">' +
          (ab.icon ? '<img src="' + esc(ab.icon) + '" alt="" decoding="async" width="32" height="32">' : "") +
          '<span class="ability-key">' + esc(ab.key) + "</span></span>" +
          '<span class="kit-tab-name">' + esc(ab.name) + "</span></button>"
        );
      })
      .join("");

    var panels = a.abilities
      .map(function (ab, i) {
        return (
          '<div class="kit-panel" role="tabpanel" id="kit-panel-' + i + '" aria-labelledby="kit-tab-' + i + '"' +
          (i === 0 ? "" : " hidden") + ">" +
          "<h3><span>" + esc(ab.key) + "</span>" + esc(ab.name) + "</h3>" +
          "<p>" + esc(ab.description) + "</p></div>"
        );
      })
      .join("");

    var kit =
      '<div class="kit-tabs" role="tablist" aria-label="Compétences de ' + esc(a.name) + '" style="--n:' +
      a.abilities.length + '">' + tabs + "</div>" + panels;

    var sections = extra.sections && extra.sections.length
      ? renderSections(extra.sections)
      : '<p class="todo">Pas encore de vidéos pour ' + esc(a.name) + " : on les ajoute quand tu t'y mets.</p>";

    main.innerHTML =
      '<article class="page">' +
      renderBack("#/persos", "Tous les persos") +
      '<header class="agent-hero" style="--c1:' + a.colors[0] + ";--c2:" + a.colors[1] + ";--c3:" + a.colors[2] + '">' +
      '<img class="agent-hero-bg" src="' + esc(a.background) + '" alt="">' +
      '<img class="agent-hero-portrait" src="' + esc(a.portrait) + '" alt="' + esc(a.name) + '">' +
      '<div class="agent-hero-text">' +
      '<span class="agent-role">' +
      (a.roleIcon ? '<img src="' + esc(a.roleIcon) + '" alt="" width="18" height="18">' : "") +
      esc(a.role) + "</span>" +
      "<h1>" + esc(a.name) + "</h1>" +
      "<p>" + esc(a.description) + "</p>" +
      "</div></header>" +
      '<section class="block">' +
      '<h2 class="block-heading">Le kit</h2>' +
      '<div class="kit">' + kit + "</div></section>" +
      renderCallout(extra.intro) +
      '<section class="block"><h2 class="block-heading">Nos vidéos</h2>' + sections + "</section>" +
      renderPager(list[i - 1], list[i + 1], "persos/") +
      "</article>";
  }

  /* ---------- 404 ---------- */

  function renderNotFound() {
    setTitle("Page introuvable");
    main.innerHTML =
      '<article class="page">' + renderBack("#/", "Tous les thèmes") +
      renderBanner({ title: "Page introuvable", tagline: "Cette page n'existe pas (ou plus)." }) +
      "</article>";
  }

  /* ---------- interactions ---------- */

  main.addEventListener("click", function (e) {
    var t = e.target;

    var btn = t.closest && t.closest("[data-video]");
    if (btn) {
      var frame = document.createElement("iframe");
      // cc_load_policy + cc_lang_pref : sous-titres FR activés d'office
      frame.src =
        "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(btn.getAttribute("data-video")) +
        "?autoplay=1&rel=0&hl=fr&cc_load_policy=1&cc_lang_pref=fr";
      frame.title = "Lecteur vidéo";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
      frame.allowFullscreen = true;
      frame.className = "video-frame";
      btn.replaceWith(frame);
      return;
    }

    var tab = t.closest && t.closest("[data-ability]");
    if (tab) {
      var kit = tab.closest(".kit");
      var pick = tab.getAttribute("data-ability");
      kit.querySelectorAll("[data-ability]").forEach(function (b) {
        b.setAttribute("aria-selected", String(b === tab));
      });
      kit.querySelectorAll(".kit-panel").forEach(function (p) {
        p.hidden = p.id !== "kit-panel-" + pick;
      });
      return;
    }

    var chip = t.closest && t.closest("[data-setup]");
    if (chip && currentMap) {
      var setup = setupsFor(currentMap.slug)[Number(chip.getAttribute("data-setup"))];
      main.querySelectorAll("[data-setup]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === chip));
      });
      main.querySelector(".board-slot").innerHTML = Board.svg(currentMap, setup);
      main.querySelector(".board-info").innerHTML = setupInfo(setup);
      return;
    }

    var toggle = t.closest && t.closest("[data-toggle-callouts]");
    if (toggle) {
      var fig = main.querySelector(".minimap");
      var hidden = fig.classList.toggle("hide-labels");
      toggle.setAttribute("aria-pressed", String(!hidden));
      toggle.textContent = hidden ? "Afficher les noms" : "Masquer les noms";
    }
  });

  /* ---------- routeur ---------- */

  var lastHash = location.hash;

  function route() {
    // on ne quitte pas l'éditeur sans prévenir s'il reste des modifications
    if (editor) {
      if (editor.isDirty() && !window.confirm("Tu as des modifications non enregistrées dans l'éditeur. Quitter quand même ?")) {
        history.replaceState(null, "", lastHash);
        return;
      }
      editor.destroy();
      editor = null;
    }
    lastHash = location.hash;
    currentMap = null;

    var parts = (location.hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    var first = parts[0] || "";
    var topic = find(CONTENT.topics, first);

    // anciennes adresses (#/clove, #/omen) -> page perso
    if (!topic && parts.length === 1 && find(GAME.agents, first)) {
      location.replace("#/persos/" + first);
      return;
    }

    renderNav(first);

    if (!first) renderHome();
    else if (first === "persos" && !parts[1]) renderPersos();
    else if (first === "persos" && find(GAME.agents, parts[1])) renderAgent(find(GAME.agents, parts[1]));
    else if (topic && !parts[1]) renderTopic(topic);
    else if (first === "smoker" && find(GAME.maps, parts[1]) && parts[2] === "editeur") renderEditor(find(GAME.maps, parts[1]));
    else if (first === "smoker" && find(GAME.maps, parts[1]) && !parts[2]) renderMap(find(GAME.maps, parts[1]));
    else renderNotFound();

    main.classList.toggle("main--wide", !!editor);

    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  // En local (npm run dev), le serveur permet d'éditer les setups : on affiche les boutons
  fetch("/api/ping", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.ok) document.documentElement.classList.add("is-dev"); })
    .catch(function () {});

  main.setAttribute("tabindex", "-1");
  window.addEventListener("hashchange", route);
  route();
})();
