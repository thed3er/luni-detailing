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
| `vendor/gsap.min.js` | jen na vyhlazení pozice houby nad nadpisem |
| `kia-sportage-gt-line-2023/source/car-opt.glb` | model vozu (4,3 MB, Draco + WebP) |
| `assets/` | logo, fotka studia |
| `web-export/` | podklady stažené z původního webu — texty, ceník, fotky |
| `denik/` | deník změn |

Nekomprimovaný model, textury a předlohy obrázků jsou v `.gitignore` —
web je nenačítá.

## Nasazení

GitHub Pages: Settings → Pages → Deploy from branch → `main` / `root`.

Při vlastní doméně nezapomenout, že `og:image`, `og:url` a `canonical`
v `index.html` jsou napsané absolutně na `https://lunidetailing.cz`.
Na jiné adrese je potřeba je přepsat, jinak nebude fungovat náhled odkazu
na Facebooku a WhatsAppu.
