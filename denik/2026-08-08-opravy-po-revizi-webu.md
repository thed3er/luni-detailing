# 2026-08-08 — Opravy po revizi (B1–B12) + typografie čísel a ikony kanálů

Reakce na seznam vad z revize `index.dc.html`. Každou vadu jsem před opravou
ověřil v prohlížeči (Chrome, 1440×900 a 390×844), ne jen podle popisu.

## B1 — Diakritika verzálek se lámala o řádek nad sebou

**Ověřeno:** `RUDÍKOV, / OKRES TŘEBÍČ` — háček nad Ř a čárky nad Í/Č visely
odtržené v mezeře. Totéž `AUTO JE VIZITKA / SVÉHO MAJITELE`.

**Změřená příčina** (canvas `measureText`, Antonio 700, font-size 100 px):

| glyf | přesah nad účaří |
|------|------------------|
| `R` (verzálka) | 86 px |
| `Ř`, `Č` (háček) | 109 px |
| `Í` (čárka) | 113 px |
| `,` (pod účaří) | 16,5 px |

Diakritika tedy potřebuje `line-height` ≥ **1,13**, a když je na řádku nad ní
interpunkce, ≥ **1,30**. Původní hodnoty byly `h1: .88` a `h2: .94`.

Revize doporučovala „≥ 1.0" — to podle měření nestačí, akcenty by pořád
zasahovaly do účaří řádku nad. Nastaveno `h1: 1.16`, `h2: 1.26`.

## B2 — 26 MB GLB

```
npx @gltf-transform/cli optimize "the car.glb" car-opt.glb \
  --compress draco --texture-compress webp
```

`the car.glb` 27,05 MB → `car-opt.glb` **4,27 MB**. Původní soubor zůstal
jako zdroj. Vizuálně bez rozdílu (porovnáno ve stejném úhlu), konzole čistá.

## B3 — Na mobilu chyběla navigace

Do hlavičky přidáno mobilní menu jako nativní `<details>` / `<summary>` —
rozbalení řeší prohlížeč, JS ho jen zavírá po kliknutí na kotvu (`<details>`
se samo nezavře). Pod 900 px se ukazuje hamburger, nad ním původní nav.
Zlaté CTA na telefon zůstává v hlavičce i na mobilu, pod 420 px se zúží
na samotnou ikonu.

## B4 — Ceny v kartách se lámaly uprostřed

`Premium od / 3 190 Kč`, `2- / krokové`. Každá dvojice název+cena je teď
v `<b>` s `white-space:nowrap`, zalomí se jen mezi dvojicemi.

## B5 — Galerie končila dírou

6 širokých + 7 běžných fotek = 19 sloupcových jednotek, 19 mod 4 = 3 →
čtvrtý sloupec posledního řádku zůstal černý. Poslední fotka (`11.png`)
dostala `class="wide"` → 20 jednotek = 5 plných řádků. Sedí i na mobilu
(2 sloupce).

## B6 — Kontrast `.stage-note`

`rgba(237,233,226,.42)` @ 10,5 px ≈ 3,6:1. Teď `.78` @ 12 px ≈ 10:1.

## B7 — Interakce 3D modelu

Popisky PŘED/PO v `hero-car.js` byly 10 px se stínem přes karoserii. Teď
12 px na tmavé podložce s rámečkem. Popisek pod scénou dostal šipkové ikony
a plnou formulaci („Tažením do stran otočíte vůz").

**Nepotvrzeno:** tvrzení revize, že na mobilu je spodních ~40 % scény prázdná
šeď. Na 390×844 vyplňuje vůz scénu celou.

## B8 — Tvrzení, která nejsou v podkladech

Ověřeno proti `web-export/texty/` — v podkladech nejsou. Odstraněno:

- „Fotky před a po vznikají v našem studiu, bez retuše" → „Fotografie před
  a po z našich zakázek."
- „Ceny jsou včetně práce i použitých přípravků" → „Kompletní ceník služeb."
  (Jediná cenová poznámka v podkladech je „Ceny nezahrnují přípravu laku:
  + 1 500 Kč", ta na webu je.)
- alt „…hexagonové LED osvětlení" (2×) → bez dovozeného popisu osvětlení.

## B9 — og:image byla relativní cesta

Doména potvrzena zadavatelem: `https://lunidetailing.cz`. Absolutní URL
doplněna do `og:image`, `og:url`, `link rel=canonical` a do JSON-LD
(`image`, `url`).

## B10 — E-mail

Zadavatel dodal `lunidetailing@seznam.cz`. Doplněn do sekce kontakt,
do poznámky v ceníku, do patičky a do JSON-LD. Kontaktní formulář
z původního webu nepřenášen — neměl by kam odesílat.

## B11 — three.js z unpkg CDN

Self-hostováno do `vendor/three/` (three 0.160.0, 1,6 MB):

```
vendor/three/three.module.js
vendor/three/addons/loaders/{GLTFLoader,DRACOLoader}.js
vendor/three/addons/environments/RoomEnvironment.js
vendor/three/addons/utils/BufferGeometryUtils.js   ← GLTFLoader ho importuje
vendor/three/draco/{draco_wasm_wrapper.js,draco_decoder.wasm}
```

Import mapa v `<head>` míří na lokální cesty, `DRACOLoader.setDecoderPath`
taky (dřív gstatic.com). Hero teď nezávisí na žádné cizí doméně kromě
Google Fonts.

## B12 — Favicon a logo v hlavičce

`assets/logo.jpg` je zlatý script na černé — v 34 px nečitelná šmouha.
Nahrazeno `assets/mark.svg`: monogram LN, čárová kresba, ostrý ve 34 i 16 px.
Původní `logo.jpg` zůstává pro sociální sítě.

## Typografie čísel — pryč s monospace

JetBrains Mono byl na ceny a štítky vývojářský font bez vazby na obor —
`7 490 Kč` v monospace s prostrkáním vypadalo jako katalogové číslo dílu.

- **Ceny a čísla** → Antonio (stejná kondenzovaná automobilová typografie
  jako nadpisy) + `font-variant-numeric: tabular-nums`. Zvětšeno, protože
  Antonio je užší: ceny balíčků 29 → 40 px, řádky ceníku 14 → 20 px,
  čísla v hero 21 → 30 px.
- **Štítky a popisky** (eyebrow, klíče v kontaktech, stupně balíčků) →
  Manrope 600 s prostrkáním.

JetBrains Mono vypuštěn i z Google Fonts URL — o jednu rodinu míň ke stažení.

## Ikony kanálů

Čárová sada kreslená přímo v HTML jako inline SVG (Facebook, Instagram,
WhatsApp, telefon, e-mail, poloha) — 1,5px tah, bez výplně, `currentColor`.
Žádná závislost na icon fontu ani knihovně. Použité v kontaktních řádcích,
v tlačítkách, v mobilním menu a jako čtvercová řada odkazů na sítě.

## Ověřeno

Chrome 1440×900 a 390×844, konzole bez chyb a varování. Model se načte
a otáčí, mobilní menu se otevře i zavře po kliknutí na kotvu.
Váha stránky při načtení hero: **4,5 MB** (z toho GLB 4,2 MB), dřív ~30 MB.

## Otevřené k rozhodnutí

1. **Fotky galerie** — 6 MB PNG/JPG celkem, `04.png` 704 kB, `08.png` 837 kB.
   Převod na WebP by ušetřil zhruba 70 %. Zároveň jsou jen 844 px široké,
   na retina displejích měkké — ideálně dodat originály.
2. **Přesná adresa** studia v Rudíkově pořád chybí (JSON-LD má jen obec).
3. Otázky z minulého deníku k ceníku (co je „exteriér standard", od čeho se
   odvíjí „od", rozsah u leštění, platnost příplatku za dodávky) trvají.
