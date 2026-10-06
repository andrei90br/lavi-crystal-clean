# Lavi CrystalClean — sito nuovo

Sito statico (solo italiano) per Lavi CrystalClean, impresa di pulizie a Croviana (TN), Val di Sole.
Sostituisce il sito Wix su lavicrystalclean.it. Struttura da landing page ad alta conversione, ispirata
alla reference impresadipulizievicenza.it (hero con CTA, punti di forza, percorsi Privati/Aziende, preventivo gratuito).

Slogan: **Pulizia cristallina, impronta leggera.**

## Pagine

- `index.html` — landing: hero, punti di forza, problema, percorsi, servizi, come funziona, standard ecologico, lavori prima/dopo, recensioni, zona, FAQ, preventivo
- `privati.html` — pulizie per la casa
- `aziende.html` — uffici, negozi, case vacanza e B&B (`#case-vacanza`)
- `contatti.html` — recapiti e modulo
- `privacy.html` — informativa privacy e cookie (noindex)
- `404.html` — pagina non trovata (noindex): rimanda alla pagina nuova più vicina o alla home

## SEO e GEO

`build.mjs` genera per ogni pagina canonical, Open Graph, dati strutturati schema.org (impresa con zone servite e
servizi, pagina, breadcrumb, servizio, FAQ lette dalla pagina) e inoltre `sitemap.xml` (con data di ultima modifica da git),
`robots.txt` e `llms.txt` (riassunto per gli assistenti AI, sorgente in `src/llms.txt`).
I vecchi indirizzi del sito Wix ancora presenti su Google sono in `REDIRECTS` dentro `build.mjs`: ognuno diventa
una pagina che rimanda subito a quella nuova.

## Struttura

```
src/pages/*.html     pagine; iniziano con un blocco JSON tra righe "---" (title, description, slug, tipo)
src/partials/*.html  head, header, footer, logo, form, reviews; si includono con {{> nome}}
src/assets/          style.css, main.js, favicon.svg, font Manrope (self-hosted, OFL)
build.mjs            genera site/ (Node 18+, nessuna dipendenza)
```

## Comandi

```sh
node build.mjs                 # genera site/
npm run serve                  # genera e apre l'anteprima su http://localhost:5173
SITE_URL=https://www.lavicrystalclean.it node build.mjs   # URL per canonical e sitemap
NOINDEX=1 node build.mjs       # anteprima non indicizzabile
```

## Deploy

Ogni push su `main` pubblica su GitHub Pages sul dominio `https://www.lavicrystalclean.it/` (file `CNAME`), indicizzabile.
Va attivato una volta: Settings → Pages → Source: **GitHub Actions**.

## Modulo preventivo

Non c'è un backend: il modulo compone il messaggio e lo apre in WhatsApp. Su richiesta di Andrei il sito
mostra solo telefono e WhatsApp: nessun indirizzo email.

## Prima del go-live

- Aggiungere i **numeri di autorità** (anni di attività, clienti, interventi) quando disponibili: andrebbero nella fascia sotto l'hero.
- Logo: ritagliato dal file di Andrei (JPG 1024 px). Se esiste una versione vettoriale o PNG trasparente ad alta risoluzione, rigenerare `src/assets/logo-*.png`, `favicon-48.png`, `apple-touch-icon.png` e `og-image.jpg`.
- Foto dei lavori (prima/dopo e galleria) in `src/assets/lavori/`, sezione `src/partials/lavori.html` in home. Mancano ancora foto del team.
- Far verificare il testo della privacy.
