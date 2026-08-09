# 2026-08-09 — Model z 10,8 MB na 3,8 MB

## Kde ta váha byla

`gltf-transform inspect` na nasazené verzi:

| položka | hodnota |
|---|---|
| vykreslovaných vrcholů | **937 338** |
| nahrávaných vrcholů | 191 234 |
| `car.bin` | 7,74 MB |
| textury (24 × WebP) | 3,09 MB |
| z toho `normal_5.webp` | **1,64 MB** — víc než polovina všech textur |

937 tisíc vrcholů na widget široký ~650 px. Model je z konfigurátoru, kde se
na něj kouká přes celou obrazovku, tady je to plýtvání.

## Co se ukázalo

Předchozí build používal výchozí `--simplify-error 0.001`. **Brzdou není
`--simplify-ratio`, ale tolerance chyby** — simplifikace se zastaví, jakmile
narazí na limit, ať je cílový poměr jakýkoliv. Ověřeno:

| varianta | textury | ratio | error | `car.bin` | textury | celkem |
|---|---|---|---|---|---|---|
| původní | ∞ | — | 0,001 | 7,74 M | 3,09 M | **10,83 M** |
| A | 1024 | 0,5 | 0,005 | 7,34 M | 1,77 M | 9,11 M |
| B | 512 | 0,3 | 0,01 | 4,62 M | 0,72 M | 5,34 M |
| C | 1024 | 0,3 | 0,01 | 4,62 M | 1,77 M | 6,39 M |
| D | 512 | 0,2 | 0,02 | 3,23 M | 0,72 M | 3,95 M |
| **F** | **1024** | **0,15** | **0,02** | **2,07 M** | **1,77 M** | **3,84 M** |

Varianta A se stejným ratio 0,5 jako B, ale s desetinovou tolerancí, ubrala
z geometrie skoro nic — 7,74 → 7,34 M.

Zkoušel jsem i variantu E: C plus zmenšení jen normálových map na 512
(`resize --pattern "*normal*"`). Ušetřilo to jen 0,4 MB, protože `normal_5`
už byla zastropovaná na 1024. Nestálo to za krok navíc.

## Proč F, a ne D

D a F jsou skoro stejně velké (3,95 vs 3,84 MB), ale rozdělují si rozpočet
opačně. D šetří na texturách (512 px), F na geometrii. Na screenshotech měla
D rozmazaný nápis SPORTAGE na pátých dveřích a měkčí zadní světla, zatímco
F si při 1024 px nápisy udržela. **F je menší i hezčí** — D nemá důvod.

## Výsledek

| | před | po |
|---|---|---|
| model celkem | 10,83 MB | **3,84 MB** (−65 %) |
| `car.bin` | 7,74 MB | 2,07 MB |
| vykreslovaných vrcholů | 937 338 | **273 723** (−71 %) |
| nahrávaných vrcholů | 191 234 | 66 818 |
| výjimky v CSP | 0 | 0 |

Model je teď **menší než původní Draco varianta** (4,27 MB), a přitom
nepotřebuje `worker-src blob:` ani `'wasm-unsafe-eval'`. Tím padá kompromis
z předchozího zápisu — nezávislost na CSP už nestojí 7 MB navíc, stojí nic.

```
npx @gltf-transform/cli optimize "the car.glb" web/car.gltf \
  --compress quantize --texture-compress webp \
  --texture-size 1024 --simplify-ratio 0.15 --simplify-error 0.02
```

## Ověřeno v prohlížeči

Proti doslovné kopii CSP hlavičky z Cloudflare, Chrome 1440×900:

- konzole **0 chyb, 0 varování**, 42 požadavků, 0 cizích origin
- `hero-car` bez fallbacku, textury i dělicí čára před/po fungují

Varianty porovnány na screenshotech ve dvou úhlech (bok a zadní tři čtvrtě)
se **zmrazenou rotací** (`turnSec = 1e12`, `rot = 0.85`), jinak by se
srovnávaly různé natočení. Při skutečné velikosti hero sekce jsem mezi
původní verzí a F nenašel rozdíl, který by návštěvník zaznamenal.

## Otevřené k rozhodnutí

1. **Doména v `og:image`, `og:url` a `canonical`** pořád ukazuje na
   `https://lunidetailing.cz`, web běží na `lunidetailing.tomasjelinek.dev`.
   Trvá ze dvou předchozích zápisů.
2. **Fotky galerie jsou 6 MB PNG/JPG** — teď je to největší položka stránky,
   větší než model. Převod na WebP by ubral zhruba 70 %.
3. **GSAP je pořád 72 kB** kvůli jednomu `quickTo`.
