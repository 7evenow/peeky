/* ------------------------------------------------------------------
   Le plateau : setups de smokes dessinés sur la minimap.
   - Board.svg(...)          : le calque en lecture seule (page d'une map)
   - Board.mountEditor(...)  : l'éditeur façon Valoplant (#/smoker/<map>/editeur)

   Les positions sont stockées de 0 à 1 sur la minimap. Le calque SVG
   travaille en 0..1000 pour rester lisible.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  /* ---------- réglages par smoker ----------
     smoke  : touche de la compétence de smoke (pour l'icône)
     radius : rayon de la smoke en mètres (approximatif, à ajuster si besoin)
     wall   : touche du mur, pour Viper et Harbor */
  var KIT = {
    astra: { color: "#d58cff", smoke: "E", radius: 4.75 },
    brimstone: { color: "#ff9e5e", smoke: "E", radius: 4.1 },
    clove: { color: "#ff7eb6", smoke: "E", radius: 4.1 },
    harbor: { color: "#4cc4ff", smoke: "E", radius: 4.5, wall: "Q" },
    miks: { color: "#ffd166", smoke: "E", radius: 4.1 },
    omen: { color: "#8f7dff", smoke: "E", radius: 4.1 },
    viper: { color: "#5ee38d", smoke: "Q", radius: 4.5, wall: "E" },
  };

  var SIZE = 1000;
  var TOOLS = [
    { id: "select", label: "Sélection", key: "V" },
    { id: "smoke", label: "Smoke", key: "S" },
    { id: "wall", label: "Mur", key: "M" },
    { id: "arrow", label: "Flèche", key: "F" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function agentOf(slug) {
    return GAME.agents.filter(function (a) { return a.slug === slug; })[0];
  }

  function kitOf(slug) {
    var k = KIT[slug];
    if (k) return k;
    var a = agentOf(slug);
    return { color: a ? a.colors[2] : "#cccccc", smoke: "E", radius: 4.1 };
  }

  function abilityIcon(slug, key) {
    var a = agentOf(slug);
    var ab = a && a.abilities.filter(function (x) { return x.key === key; })[0];
    return ab ? ab.icon : null;
  }

  function smokeRadius(map, slug) {
    // mètres -> centimètres du jeu -> fraction de la minimap -> unités du calque
    return kitOf(slug).radius * 100 * (map.scale || 0.00007) * SIZE;
  }

  function n(v) {
    return Math.round(v * SIZE * 10) / 10;
  }

  /* ---------- dessin ---------- */

  function drawItem(map, it, i, opts) {
    var sel = opts && opts.selected === i;
    var attr = ' data-i="' + i + '"';

    if (it.type === "smoke") {
      var r = smokeRadius(map, it.agent);
      var icon = abilityIcon(it.agent, kitOf(it.agent).smoke);
      var s = Math.max(r * 1.05, 18);
      return (
        '<g class="b-item b-smoke' + (sel ? " is-selected" : "") + '"' + attr +
        ' style="--sc:' + kitOf(it.agent).color + '" transform="translate(' + n(it.x) + " " + n(it.y) + ')">' +
        '<circle class="b-cloud" r="' + r.toFixed(1) + '"/>' +
        (icon ? '<image href="' + esc(icon) + '" x="' + (-s / 2).toFixed(1) + '" y="' + (-s / 2).toFixed(1) +
          '" width="' + s.toFixed(1) + '" height="' + s.toFixed(1) + '"/>' : "") +
        (sel ? '<circle class="b-ring" r="' + (r + 6).toFixed(1) + '"/>' : "") +
        "</g>"
      );
    }

    var line =
      ' x1="' + n(it.x1) + '" y1="' + n(it.y1) + '" x2="' + n(it.x2) + '" y2="' + n(it.y2) + '"';
    var handles = sel
      ? '<circle class="b-handle" data-end="1" cx="' + n(it.x1) + '" cy="' + n(it.y1) + '" r="9"/>' +
        '<circle class="b-handle" data-end="2" cx="' + n(it.x2) + '" cy="' + n(it.y2) + '" r="9"/>'
      : "";

    if (it.type === "wall") {
      return (
        '<g class="b-item b-wall' + (sel ? " is-selected" : "") + '"' + attr +
        ' style="--sc:' + kitOf(it.agent).color + '">' +
        '<line class="b-hit"' + line + "/>" +
        '<line class="b-halo b-halo--wall"' + line + "/>" +
        '<line class="b-wall-line"' + line + "/>" + handles + "</g>"
      );
    }

    if (it.type === "arrow") {
      return (
        '<g class="b-item b-arrow' + (sel ? " is-selected" : "") + '"' + attr + ">" +
        '<line class="b-hit"' + line + "/>" +
        '<line class="b-halo"' + line + ' marker-end="url(#b-head-halo)"/>' +
        '<line class="b-arrow-line"' + line + ' marker-end="url(#b-head)"/>' + handles + "</g>"
      );
    }
    return "";
  }

  // Le calque SVG d'un setup (en lecture seule ou dans l'éditeur)
  function svg(map, setup, opts) {
    var items = setup ? setup.items : [];
    return (
      '<svg class="board-layer" viewBox="0 0 ' + SIZE + " " + SIZE + '" aria-hidden="true">' +
      "<defs>" +
      '<marker id="b-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" markerUnits="strokeWidth" orient="auto">' +
      '<path class="b-head" d="M0 0 L10 5 L0 10 z"/></marker>' +
      // même pointe, un peu plus grande et sombre, pour le contour
      '<marker id="b-head-halo" viewBox="-2 -2 14 14" refX="5" refY="5" markerWidth="2.8" markerHeight="2.8" markerUnits="strokeWidth" orient="auto">' +
      '<path class="b-head-halo" d="M0 0 L10 5 L0 10 z"/></marker>' +
      "</defs>" +
      items.map(function (it, i) { return drawItem(map, it, i, opts); }).join("") +
      "</svg>"
    );
  }

  // Les agents utilisés dans un setup, pour la légende
  function legend(setup) {
    var seen = [];
    (setup ? setup.items : []).forEach(function (it) {
      if (it.agent && seen.indexOf(it.agent) === -1) seen.push(it.agent);
    });
    return seen
      .map(function (slug) {
        var a = agentOf(slug);
        return (
          '<span class="legend-item" style="--sc:' + kitOf(slug).color + '"><i></i>' +
          esc(a ? a.name : slug) + "</span>"
        );
      })
      .join("");
  }

  /* ---------- éditeur ---------- */

  function uid() {
    return Math.random().toString(36).slice(2, 8);
  }

  function round(v) {
    return Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
  }

  function clean(setups) {
    return setups.map(function (s) {
      return {
        id: s.id,
        title: s.title.trim() || "Sans titre",
        side: s.side,
        note: s.note.trim(),
        items: s.items.map(function (it) {
          var o = { type: it.type };
          if (it.agent) o.agent = it.agent;
          if (it.type === "smoke") { o.x = round(it.x); o.y = round(it.y); }
          else { o.x1 = round(it.x1); o.y1 = round(it.y1); o.x2 = round(it.x2); o.y2 = round(it.y2); }
          return o;
        }),
      };
    });
  }

  function newSetup(index) {
    return { id: uid(), title: "Setup " + index, side: "attaque", note: "", items: [] };
  }

  function mountEditor(root, map, agents) {
    var st = {
      setups: JSON.parse(JSON.stringify((SETUPS[map.slug] || []))),
      cur: 0,
      tool: "smoke",
      agent: (agents[0] || {}).slug,
      sel: -1,
      undo: [],
      redo: [],
      dirty: false,
      labels: true,
      drag: null,
    };
    if (!st.setups.length) st.setups.push(newSetup(1));

    /* ----- squelette ----- */
    var labels = map.callouts
      .map(function (c) {
        return (
          '<span class="callout-label' + (c.site ? " is-site" : "") + '" style="left:' +
          (c.x * 100).toFixed(2) + "%;top:" + (c.y * 100).toFixed(2) + '%">' + esc(c.label) + "</span>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="editor">' +
      '<header class="editor-head">' +
      '<div><a class="back" href="#/smoker/' + map.slug + '">' + esc(map.name) + "</a>" +
      '<h1>Éditeur de setups</h1></div>' +
      '<div class="editor-actions"><span class="editor-status" role="status"></span>' +
      '<button class="btn btn--primary" type="button" data-act="save">Enregistrer</button></div>' +
      "</header>" +
      '<p class="editor-small">L\'éditeur est fait pour l\'ordi : agrandis la fenêtre pour l\'utiliser.</p>' +
      '<div class="editor-body">' +
      '<aside class="editor-side">' +
      '<div class="editor-panel"><h2>Setups</h2><ul class="editor-list"></ul>' +
      '<button class="btn" type="button" data-act="new">+ Nouveau setup</button></div>' +
      '<div class="editor-panel editor-form"></div>' +
      "</aside>" +
      '<section class="editor-stage">' +
      '<div class="editor-tools"></div>' +
      '<figure class="minimap"><div class="minimap-inner board is-editing">' +
      '<img src="' + esc(map.minimap) + '" alt="Minimap de ' + esc(map.name) + '" width="900" height="900" draggable="false">' +
      '<div class="board-slot"></div>' + labels + "</div></figure>" +
      '<p class="editor-help"><b>Clic</b> pour poser · <b>glisser</b> pour déplacer · <b>clic droit</b> ou <b>Suppr</b> pour effacer · ' +
      "<b>Ctrl+Z</b> annuler · <b>Ctrl+S</b> enregistrer · <b>V S M F</b> pour changer d'outil</p>" +
      "</section></div></div>";

    var $ = function (sel) { return root.querySelector(sel); };
    var board = $(".board");
    var slot = $(".board-slot");

    /* ----- rendu des morceaux ----- */
    function current() {
      return st.setups[st.cur];
    }

    function drawBoard() {
      slot.innerHTML = svg(map, current(), { selected: st.sel });
      board.classList.toggle("hide-labels", !st.labels);
      board.setAttribute("data-tool", st.tool);
    }

    function drawList() {
      $(".editor-list").innerHTML = st.setups
        .map(function (s, i) {
          return (
            '<li><button type="button" data-pick="' + i + '"' + (i === st.cur ? ' aria-current="true"' : "") + ">" +
            "<strong>" + esc(s.title || "Sans titre") + "</strong>" +
            '<span class="side side--' + (s.side === "défense" ? "def" : "atk") + '">' + esc(s.side) + "</span>" +
            "<small>" + s.items.length + (s.items.length > 1 ? " éléments" : " élément") + "</small>" +
            "</button></li>"
          );
        })
        .join("");
    }

    function drawForm() {
      var s = current();
      $(".editor-form").innerHTML =
        "<h2>Ce setup</h2>" +
        '<label class="field"><span>Titre</span><input type="text" data-field="title" maxlength="60" value="' + esc(s.title) + '"></label>' +
        '<div class="field"><span>Côté</span><div class="seg">' +
        ["attaque", "défense"].map(function (side) {
          return '<button type="button" data-side="' + side + '"' + (s.side === side ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" + side + "</button>";
        }).join("") +
        "</div></div>" +
        '<label class="field"><span>Note</span><textarea data-field="note" rows="4" maxlength="400" placeholder="Quand l\'utiliser, dans quel ordre poser les smokes…">' + esc(s.note) + "</textarea></label>" +
        '<div class="editor-form-actions">' +
        '<button class="btn" type="button" data-act="duplicate">Dupliquer</button>' +
        '<button class="btn btn--danger" type="button" data-act="delete">Supprimer</button></div>';
    }

    function drawTools() {
      $(".editor-tools").innerHTML =
        '<div class="tool-group" role="group" aria-label="Outils">' +
        TOOLS.map(function (t) {
          return (
            '<button type="button" class="tool" data-tool="' + t.id + '" aria-pressed="' + (st.tool === t.id) + '"' +
            (t.id === "wall" ? ' title="Mur de Viper ou de Harbor"' : "") + ">" +
            esc(t.label) + "<kbd>" + t.key + "</kbd></button>"
          );
        }).join("") +
        "</div>" +
        '<div class="tool-group tool-agents" role="group" aria-label="Agent">' +
        agents.map(function (a, i) {
          return (
            '<button type="button" class="agent-pick" data-agent="' + a.slug + '" aria-pressed="' + (st.agent === a.slug) + '"' +
            ' title="' + esc(a.name) + " (" + (i + 1) + ')" style="--sc:' + kitOf(a.slug).color + '">' +
            '<img src="' + esc(a.icon) + '" alt="' + esc(a.name) + '" width="34" height="34"></button>'
          );
        }).join("") +
        "</div>" +
        '<div class="tool-group">' +
        '<button type="button" class="tool" data-act="undo" title="Annuler (Ctrl+Z)"' + (st.undo.length ? "" : " disabled") + ">Annuler</button>" +
        '<button type="button" class="tool" data-act="redo" title="Rétablir (Ctrl+Y)"' + (st.redo.length ? "" : " disabled") + ">Rétablir</button>" +
        '<button type="button" class="tool" data-act="labels" aria-pressed="' + st.labels + '">Noms</button>' +
        '<button type="button" class="tool" data-act="clear"' + (current().items.length ? "" : " disabled") + ">Tout effacer</button>" +
        "</div>";
    }

    function setStatus(text, kind) {
      var el = $(".editor-status");
      el.textContent = text;
      el.className = "editor-status" + (kind ? " is-" + kind : "");
    }

    function drawStatus() {
      if (st.dirty) setStatus("Modifications non enregistrées", "dirty");
    }

    function drawAll() {
      drawTools();
      drawList();
      drawForm();
      drawBoard();
      drawStatus();
    }

    /* ----- historique ----- */
    function snapshot() {
      return JSON.stringify({ setups: st.setups, cur: st.cur });
    }

    function restore(snap) {
      var o = JSON.parse(snap);
      st.setups = o.setups;
      st.cur = Math.min(o.cur, st.setups.length - 1);
      st.sel = -1;
    }

    function checkpoint() {
      st.undo.push(snapshot());
      if (st.undo.length > 150) st.undo.shift();
      st.redo = [];
      st.dirty = true;
    }

    function undo() {
      if (!st.undo.length) return;
      st.redo.push(snapshot());
      restore(st.undo.pop());
      st.dirty = true;
      drawAll();
    }

    function redo() {
      if (!st.redo.length) return;
      st.undo.push(snapshot());
      restore(st.redo.pop());
      st.dirty = true;
      drawAll();
    }

    /* ----- pointeur sur la minimap ----- */
    function point(e) {
      var r = board.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      };
    }

    function itemIndex(target) {
      var g = target.closest && target.closest(".b-item");
      return g ? Number(g.getAttribute("data-i")) : -1;
    }

    board.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      // on quitte un éventuel champ texte pour que les raccourcis remarchent
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      var wasDirty = st.dirty;
      var p = point(e);
      var items = current().items;
      var hit = itemIndex(e.target);
      var handle = e.target.closest && e.target.closest(".b-handle");

      if (st.tool === "select" || hit !== -1) {
        if (hit === -1) {
          st.sel = -1;
          drawBoard();
          return;
        }
        checkpoint();
        st.sel = hit;
        var it = items[hit];
        st.drag = {
          mode: handle ? "end" + handle.getAttribute("data-end") : "move",
          start: p,
          orig: JSON.parse(JSON.stringify(it)),
          moved: false,
          wasDirty: wasDirty,
        };
      } else if (st.tool === "smoke") {
        checkpoint();
        items.push({ type: "smoke", agent: st.agent, x: p.x, y: p.y });
        st.sel = items.length - 1;
        st.drag = { mode: "move", start: p, orig: JSON.parse(JSON.stringify(items[st.sel])), moved: true, wasDirty: wasDirty };
      } else {
        checkpoint();
        var line = { type: st.tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        if (st.tool === "wall") line = { type: "wall", agent: st.agent, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        items.push(line);
        st.sel = items.length - 1;
        st.drag = { mode: "end2", start: p, orig: JSON.parse(JSON.stringify(line)), moved: true, creating: true, wasDirty: wasDirty };
      }
      try {
        board.setPointerCapture(e.pointerId);
      } catch (err) {
        // certains navigateurs refusent la capture : le glisser marche quand même sur la carte
      }
      drawAll();
    });

    board.addEventListener("pointermove", function (e) {
      if (!st.drag || st.sel === -1) return;
      var p = point(e);
      var it = current().items[st.sel];
      var o = st.drag.orig;
      var dx = p.x - st.drag.start.x;
      var dy = p.y - st.drag.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.002) st.drag.moved = true;

      if (st.drag.mode === "move") {
        if (it.type === "smoke") {
          it.x = round(o.x + dx);
          it.y = round(o.y + dy);
        } else {
          it.x1 = round(o.x1 + dx); it.y1 = round(o.y1 + dy);
          it.x2 = round(o.x2 + dx); it.y2 = round(o.y2 + dy);
        }
      } else if (st.drag.mode === "end1") {
        it.x1 = p.x; it.y1 = p.y;
      } else {
        it.x2 = p.x; it.y2 = p.y;
      }
      drawBoard();
    });

    function endDrag() {
      if (!st.drag) return;
      var d = st.drag;
      st.drag = null;
      var items = current().items;
      var it = items[st.sel];
      // une ligne trop courte (simple clic avec Mur ou Flèche) : on l'annule
      if (d.creating && it && Math.hypot(it.x2 - it.x1, it.y2 - it.y1) < 0.012) {
        items.splice(st.sel, 1);
        st.sel = -1;
        st.undo.pop();
        st.dirty = d.wasDirty;
      } else if (!d.moved && !d.creating) {
        // simple clic de sélection : rien n'a changé
        st.undo.pop();
        st.dirty = d.wasDirty;
      }
      drawAll();
    }

    board.addEventListener("pointerup", endDrag);
    board.addEventListener("pointercancel", endDrag);

    board.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      var hit = itemIndex(e.target);
      if (hit === -1) return;
      checkpoint();
      current().items.splice(hit, 1);
      st.sel = -1;
      drawAll();
    });

    /* ----- boutons et champs ----- */
    function deleteSelected() {
      if (st.sel === -1) return;
      checkpoint();
      current().items.splice(st.sel, 1);
      st.sel = -1;
      drawAll();
    }

    function pickAgent(slug) {
      st.agent = slug;
      if (st.tool === "wall" && !kitOf(slug).wall) st.tool = "smoke";
      if (st.tool === "select") st.tool = "smoke";
      drawTools();
      drawBoard();
    }

    function pickTool(id) {
      if (id === "wall" && !kitOf(st.agent).wall) {
        var waller = agents.filter(function (a) { return kitOf(a.slug).wall; })[0];
        if (!waller) return;
        st.agent = waller.slug;
      }
      st.tool = id;
      if (id !== "select") st.sel = -1;
      drawTools();
      drawBoard();
    }

    root.addEventListener("click", function (e) {
      var t = e.target;
      var b;
      if ((b = t.closest("button[data-tool]"))) return pickTool(b.getAttribute("data-tool"));
      if ((b = t.closest("[data-agent]"))) return pickAgent(b.getAttribute("data-agent"));
      if ((b = t.closest("[data-pick]"))) {
        st.cur = Number(b.getAttribute("data-pick"));
        st.sel = -1;
        return drawAll();
      }
      if ((b = t.closest("[data-side]"))) {
        if (current().side === b.getAttribute("data-side")) return;
        checkpoint();
        current().side = b.getAttribute("data-side");
        return drawAll();
      }
      if (!(b = t.closest("[data-act]"))) return;
      var act = b.getAttribute("data-act");
      if (act === "save") return save();
      if (act === "undo") return undo();
      if (act === "redo") return redo();
      if (act === "labels") {
        st.labels = !st.labels;
        drawTools();
        return drawBoard();
      }
      if (act === "clear") {
        if (!current().items.length) return;
        checkpoint();
        current().items = [];
        st.sel = -1;
        return drawAll();
      }
      if (act === "new") {
        checkpoint();
        st.setups.push(newSetup(st.setups.length + 1));
        st.cur = st.setups.length - 1;
        st.sel = -1;
        drawAll();
        var input = $('[data-field="title"]');
        input.focus();
        input.select();
        return;
      }
      if (act === "duplicate") {
        checkpoint();
        var copy = JSON.parse(JSON.stringify(current()));
        copy.id = uid();
        copy.title = copy.title + " (copie)";
        st.setups.splice(st.cur + 1, 0, copy);
        st.cur += 1;
        return drawAll();
      }
      if (act === "delete") {
        if (current().items.length && !window.confirm("Supprimer le setup « " + current().title + " » ?")) return;
        checkpoint();
        st.setups.splice(st.cur, 1);
        if (!st.setups.length) st.setups.push(newSetup(1));
        st.cur = Math.max(0, st.cur - 1);
        st.sel = -1;
        return drawAll();
      }
    });

    // Titre et note : une étape d'historique par passage dans le champ
    root.addEventListener("focusin", function (e) {
      if (e.target.matches("[data-field]")) e.target.dataset.before = snapshot();
    });

    root.addEventListener("input", function (e) {
      var f = e.target.getAttribute("data-field");
      if (!f) return;
      if (e.target.dataset.before) {
        st.undo.push(e.target.dataset.before);
        st.redo = [];
        e.target.dataset.before = "";
      }
      current()[f] = e.target.value;
      st.dirty = true;
      drawList();
      drawStatus();
    });

    /* ----- enregistrement ----- */
    function save() {
      var mine = clean(st.setups).filter(function (s) { return s.items.length || s.note || !/^Setup \d+$/.test(s.title); });

      // pas de serveur local (site en ligne) : on donne le fichier complet à coller
      function copyFallback() {
        var all = {};
        Object.keys(SETUPS).forEach(function (k) { all[k] = SETUPS[k]; });
        if (mine.length) all[map.slug] = mine;
        else delete all[map.slug];
        var js =
          "/* Fichier écrit par l'éditeur de setups (npm run dev, puis « Éditer » sur une map).\n" +
          "   Tu peux aussi le modifier à la main. Positions : 0 à 1 sur la minimap. */\n\n" +
          "const SETUPS = " + JSON.stringify(all, null, 2) + ";\n";
        var done = function () {
          setStatus("Pas de serveur local : code copié, colle-le dans assets/js/setups.js", "dirty");
        };
        if (navigator.clipboard) navigator.clipboard.writeText(js).then(done, done);
        else done();
      }

      setStatus("Enregistrement…");
      fetch("/api/setups/" + map.slug, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mine),
      })
        .then(function (r) {
          if (r.status === 404 || r.status === 405 || r.status === 501) return copyFallback();
          if (!r.ok) {
            return r.text().then(function (msg) { setStatus("Pas enregistré : " + msg, "dirty"); });
          }
          return r.json().then(function (res) {
            // le serveur renvoie le fichier complet : on se remet à jour (autres onglets compris)
            Object.keys(SETUPS).forEach(function (k) { delete SETUPS[k]; });
            Object.keys(res.setups).forEach(function (k) { SETUPS[k] = res.setups[k]; });
            st.dirty = false;
            setStatus("Enregistré dans assets/js/setups.js", "ok");
          });
        })
        .catch(copyFallback);
    }

    /* ----- clavier ----- */
    function onKey(e) {
      var typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        return save();
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        return redo();
      }
      if (mod || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        return deleteSelected();
      }
      if (e.key === "Escape") {
        st.sel = -1;
        return pickTool("select");
      }
      var tool = TOOLS.filter(function (t) { return t.key.toLowerCase() === e.key.toLowerCase(); })[0];
      if (tool) return pickTool(tool.id);
      var digit = Number(e.key);
      if (digit >= 1 && digit <= agents.length) pickAgent(agents[digit - 1].slug);
    }

    function onUnload(e) {
      if (!st.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);

    drawAll();
    setStatus("Rien à enregistrer pour l'instant");

    return {
      isDirty: function () { return st.dirty; },
      destroy: function () {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("beforeunload", onUnload);
      },
    };
  }

  window.Board = { svg: svg, legend: legend, mountEditor: mountEditor, kitOf: kitOf };
})();
