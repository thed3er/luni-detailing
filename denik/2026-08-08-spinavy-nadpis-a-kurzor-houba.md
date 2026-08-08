# 2026-08-08 — Špinavý nadpis myjící se houbou a kurzor houba

## Co bylo uděláno

Nadpis v hero je zašpiněný a kurzor je houba, kterou se dá umýt.

**Nové soubory:**

- `vendor/gsap.min.js` — GSAP 3.13.0, 72 kB, staženo z unpkg a uloženo lokálně
- `assets/sponge.png` (40×40) a `assets/sponge@2x.png` (80×80) — kurzor houby

**Upraveno:** `index.html`, `hero-car.js`

## Zahozená mezizastávka

Nejdřív jsem animaci nadpisu **sjednotil** s dělicí čárou 3D modelu — jedna
hladina čistoty přes celé hero, tažení po autě myje i nadpis. Zadavatel to
zamítl, chtěl obě věci oddělené. Sjednocení je zrušené: `setSplit`
v `hero-car.js` už neposílá žádnou událost a nadpis o modelu neví.

Zapsáno, protože ta úvaha se bude nabízet znovu: model a nadpis spolu vizuálně
souvisí, ale jsou to dvě samostatné interakce a tak to má zůstat.

## Špinavý nadpis

Přes H1 leží `<canvas class="grime">`, `aria-hidden`, `pointer-events:none`.

**Blend `darken`, ne `multiply`.** `darken` je minimum po kanálech. Pozadí
`--ink` je (10,10,11), špína (118,112,99) — na pozadí tedy minimum vždycky
vyjde na pozadí a vrstva tam nedělá vůbec nic, ani při plném krytí. Na zlatých
písmenech naopak minimum vezme špínu a ztmaví je.

Špína je díky tomu vidět **jen na textu a nemusí se ořezávat na tvary písmen**.
Odpadá kreslení fontu do canvasu a s ním riziko, že se metriky rozejdou.

`multiply` jsem zkusil první a je špatně: ztmaví i pozadí (10 → 5) a kolem
nadpisu je pak vidět slabý obdélník. Ověřeno na screenshotu ve 2×.

**Kontrast má tvrdou dolní mez.** Všechny skvrny mají stejnou barvu
rgb(118,112,99) a liší se jen krytím, takže víc vrstev přes sebe nemůže projít
pod ni. Ta barva má na pozadí **4,0:1**, takže ani úplně zanesený nadpis
nespadne pod AA pro velký text.

**Nadpis není zašpiněný celý** — to bylo v zadání. Naměřeno na canvasu:
průměrné krytí 0,40, silně zanesených 17 % plochy, úplně čistých 31,5 %.
Kresba je ze tří vrstev: 11 velkých řídkých skvrn, 10 svislých stékanců
a 190 zrnek. Zrno je důležité — bez něj se plynulé skvrny čtou jako stín,
ne jako špína.

Šum je deterministický (LCG se seedem `20260808`), takže web vypadá po
reloadu stejně a jde porovnávat screenshot se screenshotem.

## Mytí houbou

`pointermove` nad H1 gumuje špínu přes `destination-out` měkkým kruhovým
štětcem o poloměru 34 px.

- **Otisky se kladou po úsečce** mezi snímky (krok `R × 0,34`), jinak by při
  rychlém tahu zůstávaly ve stopě díry.
- **GSAP drží houbu o kus za kurzorem** (`quickTo`, 0,16 s, `power3`), takže
  stopa vypadá jako tažená houba, ne jako skákající guma. Tohle je jediné,
  co GSAP na stránce dělá.
- **Ticker běží jen nad nadpisem** (`pointerenter` / `pointerleave`), jinak by
  držel rAF naživo na celé stránce.

Bez myši se špína vůbec nekreslí — podmínka `(hover: hover) and
(pointer: fine)`. Dotykový návštěvník dostane čistý nadpis, ne nadpis, co jde
zašpiněný odstranit.

Při změně velikosti okna se špína překreslí (`ResizeObserver`), čímž se smyje.
Beru jako přijatelné.

## Kurzor houba

`assets/sponge.png` + `@2x`, hotspot 20 21, **na celém webu** (`body`).
Odkazy, tlačítka, `summary` a `label` si nechávají `pointer`, formulářová pole
`auto` — kurzor musí pořád říkat, na co jde kliknout a kam se dá psát.

Dvě deklarace za sebou, `url()` a `image-set()`: `image-set()` v `cursor`
neumí každý prohlížeč, kdo ho nezná, vezme první. Hodnota je v custom property
`--cur-sponge` / `--cur-sponge-hi`, protože proměnné procházejí hranicí shadow
DOM — bez toho by nad 3D modelem naskočila zpátky ruka (`hero-car.js` si na
`.stage` nastavuje vlastní kurzor).

## line-height H1

Bylo 1.16, teď **0.95**. Jde to, protože text H1 („DETAILING, KDE DETAIL JE
STANDARD") nemá jedinou diakritiku. Naměřená mez 1,13 z minulé revize platí
pro nadpisy s háčky a čárkami, ne pro tenhle.

Zbývala jedna překážka. Změřeno v prohlížeči při `font-size` 95,04 px:

| veličina | hodnota |
|---|---|
| výška verzálky | 81,7 px |
| pokles čárky pod účaří | 15,7 px |
| vodorovná poloha čárky | x 339–361 px |
| šířka řádku „KDE DETAIL" | 364 px |

Čárka z „DETAILING," tedy dosedala přesně na „L" z „DETAIL" a nadpis se četl
jako `DETAIL'`. Minimum je (81,7 + 15,7) / 95,04 = **1,025 em**, ale jen v té
jedné mezeře.

Řádky nadpisu jsou proto bloky (`<span>`) místo `<br>`, takže jde každé mezeře
nastavit vlastní proložení. Druhý řádek má `margin-top:.10em`, jeho mezera je
1,05 em, zbylá zůstává 0,95 em. Naměřeno po opravě: rozestupy 99,8 a 90,3 px,
spodek čárky 251,3 px, vršek druhého řádku 260,8 px → **9,5 px vzduchu**.

Zrušena CSS animace `lampSweep` (přejíždějící lesk na H1). Byl to ten
generický AI shimmer z revize a s myjící se špínou by se tloukl.

## Ověřeno v prohlížeči

Chrome, 1440×900 a 390×844 (dotykový kontext). Konzole bez chyb.

- Krytí špíny: průměr 0,404, silně 17,2 %, čistě 31,5 %
- Tah houbou přes nadpis: krytí v pruhu **0,447 → 0,000**, stopa je souvislá
- `darken` na pozadí: vrstva má v testovaném bodě krytí 0,149 a pozadí
  nezměnila (ověřeno i vizuálně ve 2× výřezu — žádný obdélník)
- Kurzor: houba na `body` i na řádcích ceníku i na `.stage` v shadow DOM,
  `pointer` na odkazech
- Dotykový kontext: canvas se špínou se vůbec nevytvoří
- Žádný vodorovný přesah na 1440 ani 390

## Otevřené k rozhodnutí

1. **GSAP přidal 72 kB blokujícího skriptu** a používá se jen na vyhlazení
   pozice houby. Až se zkomprimuje GLB, stojí za zvážení to přepsat na
   ruční lerp v rAF a GSAP vyhodit.
2. **`line-height:.95` u H1 platí jen pro tenhle text.** Jakmile se do nadpisu
   dostane háček nebo čárka, musí zpět na 1,16. Je to v komentáři u pravidla,
   ale je to past.
3. **Špína se po umytí nevrací.** Kdo přejede celý nadpis, má ho čistý až do
   reloadu. Nabízí se pomalé vracení, ale působilo by to jako chyba.
4. **Houba se nemění při stisku.** Šlo by přidat zmáčknutou variantu pro
   `[data-grab="1"]` u modelu, zatím je stejná, aby kurzor neproblikával.
