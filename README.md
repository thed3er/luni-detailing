# LuNi DETAILING

Jednostránkový web detailingového studia v Rudíkově (okres Třebíč).
Statický — žádný build, žádný backend, žádný framework. Obsah je v HTML,
takže stránka je vidět i bez JavaScriptu.

## Spuštění lokálně

```
python3 -m http.server 8777
```

Pak otevřít <http://localhost:8777/>. Přes `file://` to nepojede — import
mapa a načítání GLB potřebují HTTP.

## Struktura

| cesta | co to je |
|---|---|
| `index.html` | celá stránka — obsah, styly i logika |
| `hero-car.js` | 3D model auta v hero sekci (custom element `<hero-car>`) |
| `vendor/three/` | three.js 0.160.0 + Draco dekodér, self-hostované |
| `vendor/fonts/` | Antonio + Manrope, self-hostované (88 kB) |
| `vendor/gsap.min.js` | jen na vyhlazení pozice houby nad nadpisem |
| `kia-sportage-gt-line-2023/web/` | model vozu — `car.gltf`, `car.bin` a 24 WebP textur |
| `assets/` | logo, fotka studia |
| `web-export/` | podklady stažené z původního webu — texty, ceník, fotky |
| `denik/` | deník změn |

Nekomprimovaný model, textury a předlohy obrázků jsou v `.gitignore` —
web je nenačítá.

## Nasazení

GitHub Pages: Settings → Pages → Deploy from branch → `main` / `root`.

Stránka za běhu nesahá na žádnou cizí doménu a **nepotřebuje žádnou výjimku
v Content-Security-Policy** — vystačí si s `default-src 'self'`. Ověřeno proti
politice, kterou před GitHub Pages staví Cloudflare: 0 chyb, 0 varování.

Kvůli tomu je model `.gltf` se samostatnými texturami a jen kvantizovaný,
ne Draco. Draco by potřeboval `worker-src blob:` a `'wasm-unsafe-eval'`,
zabalené textury zase `connect-src blob:`. Model je po zjednodušení geometrie 3,84 MB, tedy menší než dřívější
Draco varianta — nezávislost na CSP nestojí nic navíc.

Při vlastní doméně nezapomenout, že `og:image`, `og:url` a `canonical`
v `index.html` jsou napsané absolutně na `https://lunidetailing.cz`.
Na jiné adrese je potřeba je přepsat, jinak nebude fungovat náhled odkazu
na Facebooku a WhatsAppu.
