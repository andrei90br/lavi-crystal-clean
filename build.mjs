// Genera il sito statico in site/ partendo da src/.
// Ogni pagina in src/pages inizia con un blocco JSON tra due righe "---" (titolo, descrizione, slug).
// Nelle pagine e nei parziali: {{> nome}} include src/partials/nome.html, {{chiave}} inserisce un valore.
//
// Variabili d'ambiente:
//   SITE_URL  URL finale del sito, senza "/" finale (canonical, sitemap, Open Graph)
//   NOINDEX   "1" per aggiungere noindex (anteprima su github.io)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const OUT = "site";
const SITE_URL = (process.env.SITE_URL || "https://www.lavicrystalclean.it").replace(/\/$/, "");
const NOINDEX = process.env.NOINDEX === "1";

const partial = (name) => readFileSync(join(SRC, "partials", `${name}.html`), "utf8");

function render(tpl, vars, depth = 0) {
  if (depth > 5) throw new Error("Inclusioni troppo annidate");
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => render(partial(n), vars, depth + 1));
  return tpl.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Variabile mancante: ${k}`);
    return vars[k];
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });
if (existsSync("CNAME")) cpSync("CNAME", join(OUT, "CNAME"));

const urls = [];
for (const file of readdirSync(join(SRC, "pages")).filter((f) => f.endsWith(".html"))) {
  const raw = readFileSync(join(SRC, "pages", file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`${file}: manca il blocco iniziale ---`);
  const meta = JSON.parse(m[1]);
  const path = file === "index.html" ? "" : file;
  const vars = {
    ...meta,
    site: SITE_URL,
    canonical: `${SITE_URL}/${path}`,
    robots: NOINDEX || meta.noindex ? "noindex, nofollow" : "index, follow",
    year: String(new Date().getFullYear()),
  };
  let html = render(raw.slice(m[0].length), vars);
  // Voce di menu attiva
  html = html.replaceAll(`data-nav="${meta.slug}"`, `data-nav="${meta.slug}" aria-current="page"`);
  writeFileSync(join(OUT, file), html);
  if (!meta.noindex) urls.push(`${SITE_URL}/${path}`);
}

writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(
  join(OUT, "robots.txt"),
  NOINDEX ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
);
console.log(`Generate ${urls.length} pagine in ${OUT}/ (${SITE_URL}${NOINDEX ? ", noindex" : ""})`);
