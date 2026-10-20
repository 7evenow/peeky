/* ------------------------------------------------------------------
   Met à jour les données du jeu : les agents contrôleurs (portrait,
   kit en français) et les maps compétitives (image, minimap, callouts).

   Source : https://valorant-api.com — API communautaire qui sert les
   assets officiels de Riot Games.

   Usage :  npm install        (une seule fois, installe sharp)
            npm run update-data

   Écrit assets/js/game-data.js et les images dans assets/img/.
   À relancer quand un nouvel agent ou une nouvelle map sort.
   ------------------------------------------------------------------ */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://valorant-api.com/v1";
const LANG = "fr-FR";
const CONTROLLER_ROLE = "4ee40330-ecdd-4f2f-98a8-eb1243428373";

// Ordre d'affichage du kit, et touche par défaut de chaque emplacement
const SLOTS = [
  ["Grenade", "C"],
  ["Ability1", "Q"],
  ["Ability2", "E"],
  ["Ultimate", "X"],
  ["Passive", "Passif"],
];

const SIDES = { AttackerSide: "Attacker", DefenderSide: "Defender" };

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const hex = (c) => "#" + c.slice(0, 6);
const round = (n) => Math.round(n * 10000) / 10000;

async function getData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status + " " + url);
  return (await res.json()).data;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status + " " + url);
  return Buffer.from(await res.arrayBuffer());
}

async function writeWebp(input, rel, width, quality) {
  const out = path.join(ROOT, rel);
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(out);
  return rel;
}

async function saveImage(url, rel, width, quality) {
  if (!url) return null;
  return writeWebp(await download(url), rel, width, quality);
}

/* ---------- agents ---------- */

async function saveAgentArt(a, slug) {
  const [portrait, background, icon] = await Promise.all([
    saveImage(a.fullPortrait, "assets/img/agents/" + slug + ".webp", 900, 82),
    saveImage(a.background, "assets/img/agents/" + slug + "-bg.webp", 700, 70),
    saveImage(a.displayIcon, "assets/img/agents/" + slug + "-icon.webp", 160, 85),
  ]);
  return { portrait, background, icon };
}

// Les agents utilisés dans les couvertures des thèmes (cover.agents dans content.js)
async function coverAgentSlugs() {
  const src = await readFile(path.join(ROOT, "assets/js/content.js"), "utf8");
  const content = vm.runInNewContext(src + "\n;CONTENT");
  const slugs = new Set();
  for (const t of content.topics || []) {
    for (const s of (t.cover && t.cover.agents) || []) slugs.add(s);
  }
  return slugs;
}

async function buildCast(all) {
  const wanted = await coverAgentSlugs();
  const cast = {};
  for (const a of all) {
    const slug = slugify(a.displayName);
    if (!wanted.has(slug)) continue;
    process.stdout.write("  cover " + a.displayName + "\n");
    const art = await saveAgentArt(a, slug);
    cast[slug] = {
      name: a.displayName,
      colors: (a.backgroundGradientColors || []).slice(0, 3).map(hex),
      portrait: art.portrait,
      background: art.background,
    };
    wanted.delete(slug);
  }
  for (const s of wanted) process.stdout.write("  !! agent de couverture introuvable : " + s + "\n");
  return cast;
}

async function buildAgents(all) {
  const controllers = all
    .filter((a) => a.role && a.role.uuid === CONTROLLER_ROLE)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  const role = controllers[0].role;
  const roleIcon = await saveImage(role.displayIcon, "assets/img/roles/controleur.webp", 64, 90);

  const agents = [];
  for (const a of controllers) {
    const slug = slugify(a.displayName);
    process.stdout.write("  agent " + a.displayName + "\n");

    const { portrait, background, icon } = await saveAgentArt(a, slug);

    const abilities = [];
    for (const [slot, key] of SLOTS) {
      const ab = a.abilities.find((x) => x.slot === slot);
      if (!ab) continue;
      abilities.push({
        key,
        name: ab.displayName,
        description: ab.description,
        icon: await saveImage(
          ab.displayIcon,
          "assets/img/abilities/" + slug + "-" + key.toLowerCase() + ".webp",
          96,
          90
        ),
      });
    }

    agents.push({
      slug,
      name: a.displayName,
      role: role.displayName,
      roleIcon,
      description: a.description,
      colors: (a.backgroundGradientColors || []).slice(0, 3).map(hex),
      portrait,
      background,
      icon,
      abilities,
    });
  }
  return agents;
}

/* ---------- maps ---------- */

function calloutLabel(c) {
  const side = SIDES[c.superRegionName] || c.superRegionName;
  return side === c.regionName ? side : side + " " + c.regionName;
}

/* ---------- recalage des callouts ----------
   Sur certaines maps retouchées, les positions données par l'API sont
   décalées par rapport à la minimap. On cherche l'échelle et le décalage
   qui posent chaque "Site" sur une zone jaune de la minimap et un maximum
   de callouts sur la carte. Si ça ne colle toujours pas, on n'affiche
   aucun callout pour cette map : mieux vaut rien que des noms faux. */

const GRID = 300; // résolution de travail de la minimap
const MAX_OFF_RATIO = 0.15; // part max de callouts hors de la carte
const MAX_SITE_GAP = 6; // distance max (px sur GRID) entre un "Site" et une zone jaune

async function minimapMasks(input) {
  const { data } = await sharp(input)
    .resize(GRID, GRID, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const size = GRID * GRID;
  const opaque = new Uint8Array(size);
  const toSite = new Int32Array(size).fill(-1); // distance à la zone jaune la plus proche
  const queue = new Int32Array(size);
  let head = 0, tail = 0;

  for (let i = 0; i < size; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    opaque[i] = a > 100 ? 1 : 0;
    if (a > 200 && (r + g) / 2 - b > 18) {
      toSite[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++], x = i % GRID, y = (i / GRID) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const j = ny * GRID + nx;
      if (toSite[j] < 0) {
        toSite[j] = toSite[i] + 1;
        queue[tail++] = j;
      }
    }
  }
  return { opaque, toSite };
}

function applyFit(c, f) {
  return { x: (c.x - 0.5) * f.sx + 0.5 + f.tx, y: (c.y - 0.5) * f.sy + 0.5 + f.ty };
}

function pixel(p) {
  const ix = Math.round(p.x * (GRID - 1)), iy = Math.round(p.y * (GRID - 1));
  return ix < 0 || iy < 0 || ix >= GRID || iy >= GRID ? -1 : iy * GRID + ix;
}

function scoreFit(masks, callouts, f) {
  let off = 0, siteGap = 0, siteMax = 0;
  for (const c of callouts) {
    const i = pixel(applyFit(c, f));
    if (i < 0 || !masks.opaque[i]) off++;
    if (c.site) {
      const d = i < 0 ? GRID : masks.toSite[i];
      siteGap += d;
      siteMax = Math.max(siteMax, d);
    }
  }
  // pénalité de déformation : on ne touche pas aux maps déjà justes
  const drift = Math.abs(f.sx - 1) + Math.abs(f.sy - 1) + Math.abs(f.tx) + Math.abs(f.ty);
  return { off, siteMax, score: off * 4 + siteGap + drift * 100 };
}

function bestFit(masks, callouts) {
  let best = null;
  const tryFit = (sx, sy, tx, ty) => {
    const f = { sx, sy, tx, ty };
    const s = scoreFit(masks, callouts, f);
    if (!best || s.score < best.score - 1e-9) best = Object.assign(f, s);
  };
  tryFit(1, 1, 0, 0);
  for (let sx = 0.8; sx <= 1.2001; sx += 0.02)
    for (let sy = 0.8; sy <= 1.2001; sy += 0.02)
      for (let tx = -0.15; tx <= 0.1501; tx += 0.01)
        for (let ty = -0.15; ty <= 0.1501; ty += 0.01) tryFit(sx, sy, tx, ty);
  const c = Object.assign({}, best);
  for (let sx = c.sx - 0.02; sx <= c.sx + 0.0201; sx += 0.005)
    for (let sy = c.sy - 0.02; sy <= c.sy + 0.0201; sy += 0.005)
      for (let tx = c.tx - 0.01; tx <= c.tx + 0.0101; tx += 0.0025)
        for (let ty = c.ty - 0.01; ty <= c.ty + 0.0101; ty += 0.0025) tryFit(sx, sy, tx, ty);
  return best;
}

async function placeCallouts(minimap, raw) {
  if (!minimap || !raw.length) return { callouts: [], fit: null, status: "aucun" };
  const masks = await minimapMasks(minimap);
  const fit = bestFit(masks, raw);
  if (fit.off > raw.length * MAX_OFF_RATIO || fit.siteMax > MAX_SITE_GAP) {
    return { callouts: [], fit: null, status: "masqués (données décalées)" };
  }
  const callouts = [];
  for (const c of raw) {
    const p = applyFit(c, fit);
    const i = pixel(p);
    // hors de la carte : on l'écarte (sauf les sites, déjà validés par la zone jaune)
    if (!c.site && (i < 0 || !masks.opaque[i])) continue;
    callouts.push({ label: c.label, site: c.site, x: round(p.x), y: round(p.y) });
  }
  const moved = fit.sx !== 1 || fit.sy !== 1 || fit.tx !== 0 || fit.ty !== 0;
  return { callouts, fit, status: callouts.length + "/" + raw.length + (moved ? " recalés" : "") };
}

async function buildMaps() {
  const all = await getData(API + "/maps?language=" + LANG);
  const seen = new Set();
  const competitive = all
    .filter((m) => m.tacticalDescription) // écarte TDM, escarmouches, entraînement
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  const maps = [];
  for (const m of competitive) {
    const slug = slugify(m.displayName);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const splash = await download(m.splash);
    const minimapRaw = m.displayIcon ? await download(m.displayIcon) : null;
    const [card, cover, minimap] = await Promise.all([
      writeWebp(splash, "assets/img/maps/" + slug + "-card.webp", 640, 72),
      writeWebp(splash, "assets/img/maps/" + slug + ".webp", 1400, 70),
      minimapRaw ? writeWebp(minimapRaw, "assets/img/maps/" + slug + "-minimap.webp", 900, 85) : null,
    ]);

    // position dans le repère de la minimap (formule de valorant-api)
    const raw = (m.callouts || []).map((c) => ({
      label: calloutLabel(c),
      site: c.regionName === "Site",
      x: c.location.y * m.xMultiplier + m.xScalarToAdd,
      y: c.location.x * m.yMultiplier + m.yScalarToAdd,
    }));
    const { callouts, fit, status } = await placeCallouts(minimapRaw, raw);
    // taille d'un centimètre du jeu sur la minimap (0 à 1), pour dessiner les smokes à l'échelle
    const scale = Math.abs(m.xMultiplier) * (fit ? fit.sx : 1);
    process.stdout.write("  map   " + m.displayName.padEnd(9) + " callouts " + status + "\n");

    maps.push({
      slug,
      name: m.displayName,
      sites: m.tacticalDescription,
      coordinates: m.coordinates,
      card,
      cover,
      minimap,
      scale: Number(scale.toPrecision(4)),
      callouts,
    });
  }
  return maps;
}

/* ---------- écriture ---------- */

const today = new Date().toISOString().slice(0, 10);
process.stdout.write("Récupération des données (" + LANG + ")…\n");
const allAgents = await getData(API + "/agents?isPlayableCharacter=true&language=" + LANG);
const data = {
  updated: today,
  agents: await buildAgents(allAgents),
  cast: await buildCast(allAgents),
  maps: await buildMaps(),
};

const js =
  "/* Fichier GÉNÉRÉ par scripts/update-game-data.mjs : ne pas modifier à la main.\n" +
  "   Source : valorant-api.com (assets Riot Games). Mis à jour le " + today + ". */\n\n" +
  "const GAME = " + JSON.stringify(data, null, 2) + ";\n";

await writeFile(path.join(ROOT, "assets/js/game-data.js"), js, "utf8");
process.stdout.write(
  "OK : " + data.agents.length + " agents, " + data.maps.length + " maps → assets/js/game-data.js\n"
);
