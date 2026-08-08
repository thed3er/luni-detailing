# 2026-08-09 — Model přestavěný tak, aby nepotřeboval výjimky v CSP

## Zadání

Nesahat na Cloudflare. Web musí fungovat pod politikou, která už na doméně
je, tak jak je:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

Fonty se vyřešily minule (self-hostované). Zbývaly tři porušení, všechna
kolem 3D modelu — a všechna si způsobila komprese, kterou jsem si zavedl sám.

## Co bylo příčinou a co ji odstranilo

| porušení | příčina | řešení |
|---|---|---|
| `script-src` × 2 | Draco dekodér je WebAssembly a běží ve workeru vyrobeném z blob URL | `--compress quantize` místo `--compress draco`. Žádný worker, žádné WASM |
| `connect-src` × 24 | WebP textury zabalené uvnitř GLB. GLTFLoader na ně dělá `URL.createObjectURL` a `ImageBitmapLoader` je bere přes `fetch()` — blob URL spadá pod `connect-src` | výstup jako `.gltf` se **samostatnými** soubory textur. Loader je stahuje normální relativní URL |

```
npx @gltf-transform/cli optimize "the car.glb" web/car.gltf \
  --compress quantize --texture-compress webp
```

Pozor na past: samotné zrušení Draca nestačí. Dokud jsou textury uvnitř
kontejneru, blob URL vznikne tak jako tak a `connect-src 'self'` ho zařízne.
Teprve rozbalení do samostatných souborů to odstraní.

## Cena

| | Draco + GLB | quantize + .gltf |
|---|---|---|
| na disku | 4,27 MB | **11,35 MB** |
| souborů | 1 | 26 (`car.gltf`, `car.bin`, 24 × WebP) |
| požadavků na stránku | 19 | 42 |
| výjimky v CSP | 3 | **0** |

Po gzipu: `car.gltf` 64 055 → 6 037 B, `car.bin` 8 114 652 → 3 689 339 B.
Textury jsou WebP, ty se už nezmenší. Přes drát to tedy vyjde na ~6,6 MB,
**pokud** hosting `car.bin` (`application/octet-stream`) zabalí — u `.gltf`
jako JSON to jisté je, u binárky ne. Ověřit až po nasazení.

## Ověřeno v prohlížeči

Web pouštěn lokálně proti **doslovně té samé hlavičce**, kterou posílá
Cloudflare (`csp_server.py`), Chrome 1440×900:

- konzole **0 chyb, 0 varování**
- `hero-car` nemá fallback, model se vykreslí i s texturami a s dělicí
  čárou před/po
- 42 požadavků, 0 cizích origin

## Draco varianta zůstává

`kia-sportage-gt-line-2023/source/car-opt.glb` je v `.gitignore`, ne smazaný.
Kdyby se pravidla na Cloudflare někdy doplnila, je návrat na 4,27 MB otázkou
přepsání `src` u `<hero-car>`. Potřebné direktivy jsou:

```
script-src  'self' 'unsafe-inline' 'wasm-unsafe-eval';
worker-src  blob:;
connect-src 'self' blob:;
```

## Alternativy, které jsme nevzali

1. **Vypnout proxy na DNS záznamu** (oranžový mrak → šedý). GitHub Pages
   žádnou CSP neposílá, Draco varianta by fungovala beze změny. Cena: pryč
   je cache, WAF i analytika Cloudflare.
2. **Jet na `*.github.io`** — Cloudflare v cestě vůbec není.
3. **Doplnit pravidlo** — jediná cesta, kde je zároveň 4,27 MB i proxy.

## Otevřené k rozhodnutí

1. **Doména v `og:image`, `og:url` a `canonical`** pořád ukazuje na
   `https://lunidetailing.cz`, web běží na `lunidetailing.tomasjelinek.dev`.
   Náhled odkazu na Facebooku a WhatsAppu se nevykreslí. Trvá z minula.
2. **Gzip na `car.bin`** — ověřit po nasazení, je to rozdíl 7,7 vs 3,5 MB.
3. **GSAP je pořád 72 kB** kvůli jednomu `quickTo`.
