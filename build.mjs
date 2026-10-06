// Genera il sito statico in site/ partendo da src/.
// Ogni pagina in src/pages inizia con un blocco JSON tra due righe "---" (titolo, descrizione, slug).
// Nelle pagine e nei parziali: {{> nome}} include src/partials/nome.html, {{chiave}} inserisce un valore.
//
// Variabili d'ambiente:
//   SITE_URL  URL finale del sito, senza "/" finale (canonical, sitemap, Open Graph, schema.org)
//   NOINDEX   "1" per aggiungere noindex (anteprima su github.io)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const SRC = "src";
const OUT = "site";
const SITE_URL = (process.env.SITE_URL || "https://www.lavicrystalclean.it").replace(/\/$/, "");
const NOINDEX = process.env.NOINDEX === "1";

// Indirizzi del vecchio sito Wix ancora presenti su Google: ognuno diventa una pagina che
// rimanda subito alla pagina nuova più vicina (GitHub Pages non fa redirect lato server).
// Gli altri indirizzi vecchi finiscono su 404.html, che rimanda alla home.
const REDIRECTS = {
  "blank.html": "privacy.html",
  "post/servizi-di-pulizia-professionale-nella-val-di-sole.html": "",
  "post/pulizie-ecologiche-l-innovazione-di-lavi-crystal-clean.html": "#ecologico",
  "blog.html": "",
};

// Immagini per le anteprime social e per Google: foto vere "prima | dopo" di un lavoro (1200x630,
// composte dalle foto in assets/lavori). Le pagine senza immagine propria usano quella della home.
const OG = {
  home: "Prima e dopo la pulizia di un open space con cucina, lavoro di Lavi CrystalClean in Val di Sole",
  privati: "Prima e dopo la pulizia di un soggiorno, lavoro di Lavi CrystalClean in Val di Sole",
  aziende: "Prima e dopo la pulizia della camera di un appartamento per vacanze in Val di Sole, lavoro di Lavi CrystalClean",
  contatti: "Prima e dopo la pulizia di un angolo cottura, lavoro di Lavi CrystalClean in Val di Sole",
};
const ogImage = (slug) => `${SITE_URL}/assets/og-${slug in OG ? slug : "home"}.jpg`;
const ogAlt = (slug) => OG[slug] || OG.home;

// Foto reali dei lavori pubblicate nella home: entrano nei dati strutturati e nella sitemap delle immagini
const PHOTOS = [...readFileSync(join(SRC, "partials", "lavori.html"), "utf8").matchAll(/<img src="(assets\/lavori\/[\w-]+\.jpg)"/g)]
  .map(([, src]) => `${SITE_URL}/${src.replace(/-sm\.jpg$/, ".jpg")}`);

const partial = (name) => readFileSync(join(SRC, "partials", `${name}.html`), "utf8");

function render(tpl, vars, depth = 0) {
  if (depth > 5) throw new Error("Inclusioni troppo annidate");
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => render(partial(n), vars, depth + 1));
  return tpl.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Variabile mancante: ${k}`);
    return vars[k];
  });
}

// Data dell'ultima modifica di un file secondo git (per <lastmod> nella sitemap)
function lastmod(file) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

const text = (html) =>
  html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// Scheda Google dell'impresa (profilo Google Business): link nel sito e in sameAs dello schema.org
const GOOGLE =
  "https://www.google.com/search?q=Lavi+CrystalClean&stick=H4sIAAAAAAAA_-NgU1IxqDAxtzBKMzW2sEg2tDA2MTO1MqhItDRPtbQEctJMjUzNjRexCvoklmUqOBdVFpck5jjnpCbmAQCTaRWZPAAAAA";

// Dati strutturati schema.org: l'impresa è descritta una volta (@id) e ogni pagina la richiama.
const BIZ = `${SITE_URL}/#impresa`;
const TOWNS = [
  "Croviana", "Malè", "Dimaro Folgarida", "Commezzadura", "Mezzana", "Marilleva", "Pellizzano",
  "Ossana", "Vermiglio", "Peio", "Caldes", "Terzolas", "Cavizzana", "Rabbi", "Cles",
];
const business = {
  "@type": ["HouseCleaningService", "LocalBusiness"],
  "@id": BIZ,
  name: "Lavi CrystalClean",
  alternateName: "Lavi Crystal Clean",
  description:
    "Impresa di pulizie con sede a Croviana (TN), in Val di Sole: pulizie domestiche, uffici, negozi, case vacanza e B&B, post-ristrutturazione, post-trasloco, vetrine e sanificazioni con prodotti a basso impatto ambientale. Sopralluogo e preventivo gratuiti.",
  slogan: "Pulizia cristallina, impronta leggera.",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/assets/logo-192.png`,
  image: [...PHOTOS.filter((u) => /dopo\.jpg$/.test(u)).slice(0, 4), ogImage("home")],
  telephone: "+39 327 672 6509",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+39 327 672 6509",
    contactType: "customer service",
    areaServed: "IT",
    availableLanguage: "Italian",
  },
  founder: { "@type": "Person", name: "Lavinia" },
  vatID: "IT02812070221",
  address: {
    "@type": "PostalAddress",
    postalCode: "38027",
    addressLocality: "Croviana",
    addressRegion: "TN",
    addressCountry: "IT",
  },
  geo: { "@type": "GeoCoordinates", latitude: 46.344, longitude: 10.904 },
  areaServed: [
    ...["Val di Sole", "Val di Rabbi", "Val di Non"].map((name) => ({ "@type": "AdministrativeArea", name })),
    ...TOWNS.map((name) => ({ "@type": "City", name })),
  ],
  knowsAbout: [
    "Pulizie domestiche", "Pulizie uffici", "Pulizie case vacanza", "Pulizie post-ristrutturazione",
    "Pulizie post-trasloco", "Pulizia vetrine", "Sanificazioni", "Prodotti ecologici per la pulizia",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servizi di pulizia",
    itemListElement: [
      ["Pulizie domestiche ricorrenti", "privati.html"],
      ["Pulizia profonda della casa", "privati.html"],
      ["Pulizie post-ristrutturazione", "privati.html"],
      ["Pulizie post-trasloco", "privati.html"],
      ["Pulizie uffici, negozi e studi", "aziende.html"],
      ["Pulizie case vacanza, Airbnb e B&B (cambio ospiti)", "aziende.html#case-vacanza"],
      ["Pulizia vetri e vetrine", "aziende.html"],
      ["Sanificazioni", "aziende.html"],
      ["Pulizie post-evento e stagionali", ""],
      ["Riordino e decluttering", "privati.html"],
    ].map(([name, path]) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name, url: `${SITE_URL}/${path}`, provider: { "@id": BIZ } },
    })),
  },
  sameAs: ["https://www.instagram.com/lavicrystalclean/", GOOGLE],
};

function schema(meta, canonical, html) {
  const graph = [];
  if (meta.slug === "home") {
    graph.push(business, {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#sito`,
      url: `${SITE_URL}/`,
      name: "Lavi CrystalClean",
      inLanguage: "it-IT",
      publisher: { "@id": BIZ },
    });
  }
  const page = {
    "@type": meta.slug === "contatti" ? "ContactPage" : "WebPage",
    "@id": `${canonical}#pagina`,
    url: canonical,
    name: meta.title,
    description: meta.description,
    inLanguage: "it-IT",
    isPartOf: { "@id": `${SITE_URL}/#sito` },
    about: { "@id": BIZ },
  };
  if (meta.nome) {
    page.breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: meta.nome, item: canonical },
      ],
    };
  }
  graph.push(page);
  if (meta.servizio) {
    graph.push({
      "@type": "Service",
      name: meta.servizio,
      serviceType: meta.servizio,
      url: canonical,
      provider: { "@id": BIZ },
      areaServed: business.areaServed.slice(0, 3),
    });
  }
  // Domande frequenti lette dalla pagina, così restano sempre allineate al testo visibile
  const faq = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)];
  if (faq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faq.map(([, q, a]) => ({
        "@type": "Question",
        name: text(q),
        acceptedAnswer: { "@type": "Answer", text: text(a) },
      })),
    });
  }
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 1);
  return `<script type="application/ld+json">\n${json.replace(/</g, "\\u003c")}\n</script>`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });
if (existsSync("CNAME")) cpSync("CNAME", join(OUT, "CNAME"));
cpSync(join(SRC, "favicon.ico"), join(OUT, "favicon.ico"));

const urls = [];
for (const file of readdirSync(join(SRC, "pages")).filter((f) => f.endsWith(".html"))) {
  const raw = readFileSync(join(SRC, "pages", file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`${file}: manca il blocco iniziale ---`);
  const meta = JSON.parse(m[1]);
  const path = file === "index.html" ? "" : file;
  const canonical = `${SITE_URL}/${path}`;
  const vars = {
    ...meta,
    site: SITE_URL,
    canonical,
    robots: NOINDEX || meta.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    year: String(new Date().getFullYear()),
    // La pagina 404 viene servita a qualsiasi indirizzo: i percorsi relativi partono dalla radice del sito
    base: file === "404.html" ? `<base href="${SITE_URL}/">` : "",
    ogimage: ogImage(meta.slug),
    ogalt: ogAlt(meta.slug),
    google: GOOGLE.replace(/&/g, "&amp;"),
    schema: "",
  };
  // Primo passaggio per leggere le FAQ, secondo con i dati strutturati
  const body = render(raw.slice(m[0].length), vars);
  vars.schema = meta.noindex ? "" : schema(meta, canonical, body);
  let html = render(raw.slice(m[0].length), vars);
  // Voce di menu attiva
  html = html.replaceAll(`data-nav="${meta.slug}"`, `data-nav="${meta.slug}" aria-current="page"`);
  writeFileSync(join(OUT, file), html);
  if (!meta.noindex) {
    const d = lastmod(join(SRC, "pages", file));
    const imgs = [ogImage(meta.slug), ...(/\{\{>\s*lavori\s*\}\}/.test(raw) ? PHOTOS : [])]
      .map((u) => `<image:image><image:loc>${u}</image:loc></image:image>`)
      .join("");
    urls.push(`  <url><loc>${canonical}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}${imgs}</url>`);
  }
}

for (const [from, to] of Object.entries(REDIRECTS)) {
  const target = `${SITE_URL}/${to}`;
  const canon = target.split("#")[0];
  const out = join(OUT, from);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Lavi CrystalClean</title>
<link rel="canonical" href="${canon}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<p>Questa pagina si è spostata: <a href="${target}">vai alla nuova pagina di Lavi CrystalClean</a>.</p>
</body>
</html>
`
  );
}

writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`
);
writeFileSync(
  join(OUT, "robots.txt"),
  NOINDEX ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);
// Riassunto per gli assistenti AI (https://llmstxt.org)
writeFileSync(join(OUT, "llms.txt"), render(readFileSync(join(SRC, "llms.txt"), "utf8"), { site: SITE_URL }));
console.log(`Generate ${urls.length} pagine in ${OUT}/ (${SITE_URL}${NOINDEX ? ", noindex" : ""})`);
