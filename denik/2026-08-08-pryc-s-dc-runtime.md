# 2026-08-08 — Pryč s dc-runtime, React a Babelem

## Proč

Při přípravě na GitHub Pages se ukázalo, že `support.js` (dc-runtime) si
v prohlížeči stahuje tři skripty z **unpkg.com**:

| skript | velikost |
|---|---|
| `@babel/standalone@7.29.0` | 3 137 752 B |
| `react-dom@18.3.1` | 131 835 B |
| `react@18.3.1` | 10 751 B |

Zjištěno z `support.js`, ověřeno stažením. Dohromady **3,3 MB**, které se
načtou před prvním pixelem, a `@babel/standalone` navíc při každém načtení
v prohlížeči transpiluje `<script type="text/x-dc">`.

Horší než velikost je závislost. Celá stránka byla uvnitř `<x-dc>` a
renderovala se až z JS. Ověřeno zablokováním `unpkg.com/**` v Playwrightu:

```
document.body.innerText → "(prázdná stránka)"
```

Ne rozbitý layout — nic. Kdo má výpadek CDN nebo firewall na unpkg, nevidí
ani telefonní číslo. Zrovna kvůli tomuhle se předtím self-hostoval three.js.

## Co se změnilo

Runtime šel pryč celý, stránka je obyčejné HTML:

- `<helmet>` → obsah přesunut do skutečné `<head>`
- `<x-dc>` a obalový `<div>` → `<body>`
- `<x-import component-from-global-scope="hero-car" …>` → `<hero-car …>`.
  `hero-car.js` si custom element registruje sám (`hero-car.js:498`), x-import
  byl jen prostředník. Atribut `hint-size` zrušen — `HeroCar` ho nikdy nečetl,
  v `observedAttributes` je jen `src`, `accent`, `spin`, `split`.
- `ref="{{ navRef }}"` na hlavičce → `document.querySelector('.nav')`
- `<script type="text/x-dc">` s `class Component extends DCLogic` → obyčejný
  `<script>` na konci `<body>`
- `componentWillUnmount()` a `renderVals()` zrušeny bez náhrady. Odhlašování
  posluchačů a odpojování observerů dávalo smysl u komponenty, která se může
  odmontovat. Tahle stránka se neodmontuje nikdy — zanikne s dokumentem.
- Posluchače houby (`grimeMove`, `grimeEnter`, `grimeLeave`) byly pole na
  `this` jen proto, aby šly odregistrovat. Teď jsou to inline funkce.
- `support.js` smazán (68 kB).

## Past, do které jsem šlápl

GSAP jsem při stěhování dal do `<head>` s `defer`, aby neblokoval. Jenže
inline skript na konci `<body>` běží **během** parsování, tedy dřív než
odložené skripty — `typeof gsap !== 'undefined'` by vyšlo `false` a houba by
se přestala vyhlazovat (tiše, protože kód má fallback na `wipeTo`).

Kód proto visí na `DOMContentLoaded`: odložené skripty doběhnou po parsování,
ale ještě před touhle událostí.

## Ověřeno v prohlížeči

S **plně zablokovaným `unpkg.com/**`**, Chrome 1440×900 a 390×844:

- konzole 0 chyb, 0 varování
- obsah se vykreslí, `<hero-car>` má canvas v shadow DOM, model se načte
- `[data-reveal]`: 18 prvků, po odscrollování na ceník odhaleno 11 →
  IntersectionObserver funguje
- špinavý nadpis: průměrné krytí 0,404; po tahu myší přes nadpis **0,314** →
  houba maže, GSAP ticker běží
- mobilní menu: otevře se, po kliknutí na `.sheet a[href='#cenik']` se zavře
  (`open: false`), hash `#cenik`, scroll 4198
- žádný vodorovný přesah na 390

Pozn.: první pokus o klik na menu přes `getByRole('link', {name:'Ceník'})`
trefil skrytý odkaz v desktopové navigaci a vypadal jako chyba. Není —
přes `.sheet a[href='#cenik']` se menu zavírá.

## Co to udělalo s vahou

Ze stránky zmizelo **3,3 MB staženého JS** a s ním transpilace v prohlížeči.
Zbývá `vendor/three` (načítá se jen kvůli modelu) a `vendor/gsap.min.js`.

## Otevřené k rozhodnutí

1. **GSAP je pořád 72 kB kvůli jednomu `quickTo`.** Ruční lerp v `rAF` by to
   nahradil pěti řádky a soubor by mohl zmizet. Nedělal jsem to teď, protože
   to mění chování animace, kterou psal někdo jiný.
2. **Google Fonts zůstávají jediná cizí doména.** Antonio a Manrope by šly
   self-hostovat stejně jako three.js, pak by web nešahal ven vůbec.
