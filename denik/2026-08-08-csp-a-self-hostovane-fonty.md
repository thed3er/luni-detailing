# 2026-08-08 — CSP na Cloudflare a self-hostované fonty

## Příznak

Na nasazeném webu (`lunidetailing.tomasjelinek.dev`, GitHub Pages za
Cloudflare proxy) hlásila konzole:

```
Fetch API cannot load blob:https://lunidetailing.tomasjelinek.dev/7df5e357-…
Refused to connect because it violates the document's Content Security Policy.
```

## Odkud ta CSP je

Zjištěno z hlaviček živého webu (`curl -D -`):

```
server: cloudflare
x-github-request-id: F216:306165:…
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;
  connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

GitHub Pages CSP neposílá a Cloudflare ji sám od sebe taky nepřidává — je to
Transform Rule na Cloudflare.

## Co všechno blokovala

Politika pustěna proti webu lokálně (`csp_server.py` s tou samou hlavičkou).
Nebylo to jedno porušení, ale tři:

| direktiva | výskytů | co padalo |
|---|---|---|
| `connect-src 'self'` | 24 | WebP textury zabalené v GLB. GLTFLoader na ně dělá blob URL a `ImageBitmapLoader` je bere přes `fetch()` → tohle je hláška ze zadání |
| `script-src 'self' 'unsafe-inline'` | 4 | Draco worker z blob URL + `WebAssembly.instantiate()` |
| `style-src 'self' 'unsafe-inline'` | 1 | stylesheet z `fonts.googleapis.com` |

**Fonty se vůbec nenačítaly a nikdo si toho nevšiml.** Ověřeno měřením
šířky textu v canvasu: `Antonio` 565 px, `Manrope` 565 px, neexistující font
565 px — obě rodiny padaly na fallback. Web běžel v systémovém bezpatkovém
písmu, ne v Antoniu.

První dvě příčiny jsem si způsobil sám při kompresi modelu:
`--texture-compress webp` udělal blob textury, `--compress draco` přinesl
worker a WASM.

## Oprava 1 — fonty do projektu

Google Fonts self-hostované do `vendor/fonts/`, `<link>` na googleapis.com
i `preconnect` na gstatic.com pryč.

**Rodiny jsou variabilní.** Stáhl jsem 12 souborů (3 váhy Antonia × 2
podmnožiny + 3 váhy Manrope × 2), ale `md5` ukázalo jen **4 unikátní** —
Google pro každou požadovanou váhu posílá tentýž variabilní soubor. Zbylo
proto 5 souborů (4 × woff2 + CSS), **88 kB**, s `font-weight: 100 700`
pro Antonio a `200 800` pro Manrope místo statických řezů.

**latin-ext je povinná**, nese ř ě ů č š ž ď ť. Cyrilice, řečtina a
vietnamština vynechány.

Manrope 700 se nikde v CSS nepoužívá — z požadavku vypadlo. Antonio používá
všechny tři váhy (700 nadpisy, 600 čísla, 400 `.motto`).

Přidán `preload` na obě latinky, protože se potřebují hned.

## Ověření, že se sazba nezměnila

Metrika Antonia při `700 100px` po přechodu na variabilní soubor:

| glyf | dřív (Google) | teď (lokálně) |
|---|---|---|
| `R` | 85,9375 | 85,9375 |
| `Í` | 112,939453125 | 112,939453125 |
| `Ř` | 109,27734375 | 109,27734375 |
| `,` pod účaří | 16,50390625 | 16,50390625 |

Shoda na desetinu pixelu → naměřené meze pro `line-height` z revize
(1,13 a 1,30) platí dál.

Šířka „OKRES TŘEBÍČ": Antonio 489 px vs fallback 759 px → latin-ext funguje.

## Audit zbytku

`performance.getEntriesByType('resource')`: **19 požadavků, 0 cizích
origin.** Do projektu už není co stáhnout.

Zbylé absolutní URL v souboru se nenačítají:

- `https://schema.org` — jen identifikátor `@context` v JSON-LD
- `wa.me`, `facebook.com`, `instagram.com` — odchozí odkazy, na ty se kliká
- `https://lunidetailing.cz/…` v `og:image`, `og:url`, `canonical` a JSON-LD
  — **nesedí s doménou, na které web běží** (`lunidetailing.tomasjelinek.dev`).
  Náhled odkazu na Facebooku a WhatsAppu se kvůli tomu nevykreslí.
  K rozhodnutí, která doména je ta finální.

## Co teď stačí povolit v CSP

Se self-hostovanými fonty odpadají výjimky pro `style-src` i `font-src`.
Zbývají tři, všechny kvůli 3D modelu:

```
script-src  'self' 'unsafe-inline' 'wasm-unsafe-eval';
worker-src  blob:;
connect-src 'self' blob:;
```

`'wasm-unsafe-eval'`, ne `'unsafe-eval'` — povolí jen kompilaci WebAssembly,
ne `eval()` na JavaScriptu.

Ověřeno lokálně s `style-src 'self'` a `font-src 'self'`: 0 chyb, 0 varování,
model se načte, fonty sedí.

Kdyby se do politiky sahat nemělo: `--compress quantize` místo `draco`
odstraní `worker-src` i `wasm-unsafe-eval`, ale model naroste
**4,27 → 11,32 MB** (změřeno).

## Otevřené k rozhodnutí

1. **Doména v `og:image`, `og:url` a `canonical`** — viz výše.
2. **GSAP je pořád 72 kB** kvůli jednomu `quickTo`.
3. Prohlížeč si stále sahá pro `/favicon.ico` a dostane 404, i když je
   deklarovaný `assets/mark.svg`. Kosmetika.
