# 2026-08-08 — Hero s 3D modelem Kia a single-page web

## Co bylo uděláno

Z návrhu Hero sekce vznikla kompletní jednostránková homepage se skutečným
obsahem zákazníka, zlatou typografií a 3D modelem auta v hero sekci.

**Nové soubory:**

- `index.dc.html` — celá stránka (hero, služby, balíčky, ceník, realizace,
  o nás, kontakt, patička)
- `assets/studio.jpg` (1800 px, 401 kB) a `assets/studio-sm.jpg` — zmenšená
  `garaz.png` (8 MB → 401 kB) pro web
- `assets/logo.jpg` — kopie loga pro favicon a hlavičku
- `web-export/obrazky/galerie/01–13` — 13 fotek staženo z původního webu,
  aby nový web nehotlinkoval simdif.com

**Upraveno:** `hero-car.js`

**Beze změny:** `Hero.dc.html` — původní návrh, `index.dc.html` ho nahrazuje.
Je možné ho smazat.

## Proč

Návrh Hero.dc.html měl vymyšlený obsah (Brno-jih, „40 μm", telefon
734 112 090), který nepatří tomuto zákazníkovi. Veškerý text a všechny ceny
jsou teď z `web-export/texty/`.

## Design

Barvy a motiv vychází z podkladů zákazníka, ne z obecné šablony:

- **Zlatá** — navzorkována přímo z `logo.jpg` (nejsvětlejší pixely `#DFC48C`,
  jádro `#D0B377`). Paleta `#7A5A24 → #C9A24A → #F2E0AE`.
- **Pozadí 3D scény** — fotka reálné garáže (`garaz.png`), ne generický
  gradient. Auto tak stojí ve studiu zákazníka.
- **Podpisový prvek** — nadpis H1 má zlatý přechod, přes který pomalu
  přejíždí světlý pruh. Napodobuje inspekční lampu, kterou detailer
  kontroluje lak. Animace je jen na H1, jinde je zlatá statická.
- **Písmo** — Antonio (kondenzovaný display, působí jako automobilová
  typografie), Manrope (text), JetBrains Mono (ceny a štítky).

## Obsah stránky

Sekce: hero → služby (4 karty) → balíčky (3 stupně) → ceník (kompletní,
jako textová tabulka) → realizace (13 fotek) → o nás + hodnoty → kontakt.

Ceník je poprvé jako **text**, ne obrázek — vyřešeno zjištění č. 1
z `2026-08-08-crawl-a-export-webu.md`.

Doplněno: `<title>`, meta description, OG tagy a JSON-LD `AutoDetailing`
(vyplněno jen z ověřených údajů) — všechny chyběly.

## Změny v hero-car.js

1. **Atributy jen jednoslovné** (`spin`, `split` místo `rotation-seconds`,
   `default-split`). dc-runtime posílá komponentu přes React, který
   pomlčkované propy zmenší na malá písmena — `getAttribute('rotation-seconds')`
   proto vždy vracelo `null` a bralo se výchozí nastavení.
2. **Materiály z GLB se nepřepisují.** Původní `toPhysical()` nastavoval všem
   materiálům clearcoat 1.0 a roughness ≤ 0.22 — na reálném modelu by se
   leskly pneumatiky i látka. Teď se převádí jen box-placeholder.
3. **Podlaha posunuta k autu.** Roviny se stínem a odleskem byly na `y = 0`,
   ale model se posouvá na `y = -0.62` — stín se kreslil autu přes bok.
4. Zlatá místo tyrkysové, fotka garáže jako pozadí, měřítko modelu 2.9 → 2.6
   (při otáčení naboku vyjíždělo auto z rámu), stín u popisků PŘED/PO.

## Změny v index.dc.html oproti návrhu

- `<script type="importmap">` a modul `hero-car.js` musí být v reálném
  `<head>`, ne v `<helmet>`. Helmet je vkládá do hlavičky až po startu
  runtime, kdy je import mapa ignorovaná („An import map rule was removed").
- Z `<x-import>` odstraněn atribut `from="./hero-car.js"` — runtime se pak
  pokouší ES modul spustit jako klasický skript a spadne na
  „Cannot use import statement outside a module". Bez `from` čeká na
  registraci custom elementu, který načte modul v hlavičce.

## Ověřeno v prohlížeči

Chrome, 1440×900 a 390×844 (Pixel). Konzole bez chyb a varování, žádný
vodorovný přesah na mobilu, 120 fps při rotaci modelu. Na mobilu je model
vidět v prvním výřezu (hero je 3 bloky: nadpis → model → tlačítka).

## Doplněno později: špína nepokrývala celé auto

**Příznak:** textura zašpinění byla jen na části vozu a vypadala jako bílý šum.

**Příčina — dvě věci najednou:**

1. Shader počítal z atributu `position`, což je lokální souřadnice **každého
   meshe zvlášť**. Model má 468 meshů a 434 z nich má vlastní transformaci,
   takže každý díl počítal špínu ve svém rámu → nenavazovaly.
2. Souřadnice modelu jsou v **centimetrech** (rozsah ±200). `fbm(vDirtPos * 7.0)`
   z toho udělalo ~1400 period šumu — místo špíny bílý šum. Ze stejného důvodu
   `low` (víc špíny dole) při y ≈ 200 nikdy nenaskočilo, takže gradient
   shora dolů vůbec nefungoval.

**Oprava:** vertex shader převádí pozici do souřadnic karoserie
(`uRootInv * modelMatrix * transformed`), kde `uRootInv` je inverzní matice
modelu, aktualizovaná každý snímek. Tím je rám společný pro všechny meshe
a zároveň normalizovaný měřítkem z `fit()` — auto má vždy délku 2.6 a kola
na `y = 0`, nezávisle na tom, v jakých jednotkách je zdrojový GLB.

Doladěno i vzezření: svislé šmouhy (stlačením osy y v šumu), lehký prach po
celé karoserii + silná vrstva u prahů, tmavší barva špíny (`#282520`), aby
černé auto zůstalo černé a nešedlo do béžova.

Ověřeno porovnáním čistý/špinavý ve stejném úhlu.

## Otevřené k rozhodnutí

1. **GLB má 25 MB** (geometrie 21 MB, textury 4 MB, 468 primitiv). Načte se,
   ale na 4G to je řádově 15+ sekund. Doporučuji zkomprimovat, typicky
   vyjde 3–5 MB:
   `npx @gltf-transform/cli optimize "the car.glb" kia.glb --compress draco --texture-compress webp`
   Loader už DRACOLoader nastavený má, stačí vyměnit soubor.
2. **Telefonní číslo** — hlavní je `728 420 689`, WhatsApp `733 248 967`.
   Převzato z původního webu, stále nepotvrzeno (otázka z minulého deníku).
3. **Ceny „od"** — na webu je napsáno „částku upřesníme podle konkrétního
   vozu při domluvě termínu". Zadavatel by měl potvrdit, že to tak platí.
4. **Přesná adresa** studia v Rudíkově chybí — v JSON-LD je zatím jen obec.
5. **E-mail** není nikde uveden, na webu proto není. Kontaktní formulář
   z původního webu jsem nepřenášel (neměl by kam odesílat).
6. **Fotky galerie** jsou 844 px široké — na retina displejích měkké.
   Ideálně dodat originály.
