# 2026-08-09 — Galerie na WebP

## Co bylo uděláno

Zadavatel převedl fotky galerie a obrázek ceníku na WebP. Já je přidal do
gitu a přepsal 13 odkazů v `index.html`.

| | před | po |
|---|---|---|
| galerie (13 fotek) | 6,0 MB | **1,2 MB** (−80 %) |
| `cenik.png` → `.webp` | 1,60 MB | 0,12 MB |

Největší úspory u snímků před/po, které byly PNG: `08.png` 837 kB → 84 kB,
`05.png` 825 kB → 71 kB. Fotografie v PNG jsou vždycky plýtvání.

## Ověřeno, že se nerozbilo rozvržení

Rozměry WebP odpovídají originálům na pixel (kontrolováno `sips` u 01, 04,
09 a 11 — 844×633, 844×561, 844×633, 844×619). Atributy `width` a `height`
v `index.html` tedy platí dál a nehrozí poskakování obsahu při dokreslování.

## Lazy loading

Všech 13 fotek galerie i fotka studia v „O nás" **už `loading="lazy"` měly**
od prvního nasazení. Ověřeno měřením, ne pohledem do kódu: po načtení
stránky, před scrollováním, je z galerie staženo **0 souborů**. Po odscrollování
na sekci Realizace se dotáhne 13 souborů / 1 244 kB.

Nelazy zůstávají dva obrázky, oba správně:

- `assets/mark.svg` v hlavičce — 464 B, nad ohybem
- pozadí 3D scény v `hero-car.js` — má `fetchpriority="high"`, je to první
  věc, kterou návštěvník vidí

Doplněno `decoding="async"` ke všem 14 lazy obrázkům (dřív tam nebylo
u žádného) — dekódování běží mimo hlavní vlákno a nezdržuje scrollování.

## Ověřeno v prohlížeči

Proti kopii CSP hlavičky z Cloudflare, Chrome 1440×900:

- konzole **0 chyb, 0 varování** — žádný odkaz nezůstal na starou příponu
- všech 13 `<img>` má `complete = true` a `naturalWidth = 844`
- poslední řada (06 + 11, obě široké) vyplňuje všechny čtyři sloupce

Pozn.: snímek celého elementu `.shots` ukázal spodní dvě řady černé. Není to
chyba stránky — lazy obrázky pod výřezem se v okamžiku snímání ještě
nevykreslily. Na normálním snímku výřezu po odscrollování jsou všechny.

## Originály zůstávají v gitu

`.jpg` a `.png` předlohy (6,0 MB) jsem nechal sledované. Web je nenačítá, ale
na rozdíl od zkomprimovaného modelu je nejde znovu vyrobit — jsou to fotky
zadavatele stažené z původního webu. Kdyby se měl repozitář odlehčit, patří
do `.gitignore` stejně jako `car-opt.glb`.

## Otevřené k rozhodnutí

1. ~~`assets/studio.jpg` není převedená~~ — vyřešeno, viz níže.
2. **Doména v `og:image`, `og:url` a `canonical`** pořád ukazuje na
   `https://lunidetailing.cz`, web běží na `lunidetailing.tomasjelinek.dev`.
   Trvá ze tří předchozích zápisů.
3. **GSAP je pořád 72 kB** kvůli jednomu `quickTo`.

## Doplněno později: studio.jpg

Zadavatel převedl i fotku studia. **401 kB → 138 kB**, a `studio-sm.jpg`
87 kB → 45 kB.

Přepsány dva odkazy: `<img>` v „O nás" a `ROOM` v `hero-car.js:8`. Ten druhý
je důležitější — je to pozadí 3D scény, načítá se hned s `fetchpriority="high"`
a leží na kritické cestě k prvnímu vykreslení. Naměřeno po přepisu:
`studio.webp 135 kB`, první vykreslení celkem 5 643 kB.

**`og:image` zůstal schválně na JPEG.** Robot Facebooku a WhatsAppu si
s WebP v náhledu odkazu spolehlivě neporadí. Kvůli tomu zůstává v `assets/`
i `studio.jpg`, přestože ho web sám nenačítá — je v HTML komentář, aby to
někdo příště „neopravil". Doplněno `og:image:type`.

`assets/studio-sm.jpg` ani `studio-sm.webp` se nepoužívají nikde — zbyly
z prvního zmenšování `garaz.png`.
