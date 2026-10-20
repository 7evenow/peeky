/* ------------------------------------------------------------------
   Serveur local pour travailler sur le site : npm run dev

   - sert les fichiers du site sur http://localhost:4173
   - permet à l'éditeur de setups d'enregistrer dans assets/js/setups.js

   Il n'écoute que sur la machine (127.0.0.1) et ne peut écrire que ce
   fichier-là. En ligne (GitHub Pages), l'éditeur ne peut pas enregistrer.
   ------------------------------------------------------------------ */

import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4173;
const SETUPS_FILE = path.join(ROOT, "assets/js/setups.js");
const MAX_BODY = 2 * 1024 * 1024;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("trop gros"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const num = (v) => typeof v === "number" && Number.isFinite(v);
const slug = (v) => typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v);

// Garde-fou : on n'écrit que des setups bien formés
function validList(list) {
  return (
    Array.isArray(list) &&
    list.every(
        (s) =>
          s && typeof s.id === "string" && typeof s.title === "string" &&
          (s.side === "attaque" || s.side === "défense") &&
          typeof s.note === "string" && Array.isArray(s.items) &&
          s.items.every((it) =>
            it.type === "smoke" ? slug(it.agent) && num(it.x) && num(it.y)
            : it.type === "wall" ? slug(it.agent) && num(it.x1) && num(it.y1) && num(it.x2) && num(it.y2)
            : it.type === "arrow" ? num(it.x1) && num(it.y1) && num(it.x2) && num(it.y2)
            : false
          )
      )
  );
}

// Le fichier actuel, relu à chaque fois : un autre onglet a pu enregistrer entre-temps.
// null s'il existe mais qu'on n'arrive pas à le lire (modifié à la main avec une erreur).
async function currentSetups() {
  let src;
  try {
    src = await readFile(SETUPS_FILE, "utf8");
  } catch {
    return {};
  }
  try {
    const data = vm.runInNewContext(src + "\n;SETUPS", {}, { timeout: 1000 });
    return data && typeof data === "object" ? JSON.parse(JSON.stringify(data)) : null;
  } catch {
    return null;
  }
}

// N'enregistre que la map envoyée : les autres maps du fichier restent intactes
async function saveSetups(req, res, map) {
  if (!slug(map)) return send(res, 400, "Map inconnue");
  let list;
  try {
    list = JSON.parse(await readBody(req));
  } catch {
    return send(res, 400, "JSON illisible");
  }
  if (!validList(list)) return send(res, 422, "Setups mal formés");

  const data = await currentSetups();
  if (!data) return send(res, 409, "assets/js/setups.js est illisible : corrige-le avant d'enregistrer");
  if (list.length) data[map] = list;
  else delete data[map];

  const js =
    "/* Fichier écrit par l'éditeur de setups (npm run dev, puis « Éditer » sur une map).\n" +
    "   Tu peux aussi le modifier à la main. Positions : 0 à 1 sur la minimap. */\n\n" +
    "const SETUPS = " + JSON.stringify(data, null, 2) + ";\n";
  await writeFile(SETUPS_FILE, js, "utf8");
  console.log("  " + map + " : " + list.length + (list.length > 1 ? " setups enregistrés" : " setup enregistré"));
  send(res, 200, JSON.stringify({ ok: true, setups: data }), TYPES[".json"]);
}

async function serveFile(req, res) {
  const url = new URL(req.url, "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, "Interdit");
  try {
    const info = await stat(file);
    if (!info.isFile()) return send(res, 404, "Introuvable");
    send(res, 200, await readFile(file), TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
  } catch {
    send(res, 404, "Introuvable");
  }
}

createServer(async (req, res) => {
  try {
    if (req.url === "/api/ping") return send(res, 200, JSON.stringify({ ok: true }), TYPES[".json"]);
    const save = req.url.match(/^\/api\/setups\/([a-z0-9-]+)$/);
    if (save && req.method === "POST") return await saveSetups(req, res, save[1]);
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Méthode non autorisée");
    await serveFile(req, res);
  } catch (e) {
    console.error(e);
    send(res, 500, "Erreur serveur");
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log("Peeky <3 en local : http://localhost:" + PORT);
  console.log("L'éditeur de setups peut enregistrer dans assets/js/setups.js");
});
