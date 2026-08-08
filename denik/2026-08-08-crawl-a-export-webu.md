# 2026-08-08 — Crawl lunidetailing.simdif.com, sitemapa a export textů

## Co bylo uděláno

Prohledán web https://lunidetailing.simdif.com/ včetně všech podstránek.
Vytvořena sitemapa a strukturovaný textový export.

**Nové soubory:**

- `web-export/sitemap.txt` — čitelná sitemapa: struktura, nadpisy, kontakty,
  externí odkazy, poznámky ke zjištěným problémům
- `web-export/sitemap-puvodni.xml` — původní `sitemap.xml` stažená z webu
- `web-export/texty/01-uvod.txt` až `06-kontakty.txt` — text jednotlivých stránek
  (URL, title, meta tagy, nadpisy, text, obrázky s alt texty, odkazy)
- `web-export/extract.py` — extraktor (Python stdlib, žádné závislosti);
  spuštění: `python3 extract.py <adresář_s_html> <výstupní_adresář>`

## Proč

Podklad pro přípravu nového webu — potřeba znát veškerý existující obsah
a strukturu, aby se nic neztratilo.

## Postup

1. `robots.txt` → odkazuje na `sitemap.xml` se 6 URL
2. Ověřeno crawlem odkazů z HTML — žádné další stránky nad rámec sitemapy
3. Obsah je statické HTML, nerenderuje se JS → stačil `curl`
4. Extrakce přes `html.parser` ze stdlib, parsuje se pouze `<main>` bez `<nav>`
5. Pozor: SimDif entity kóduje dvojitě (`&amp;iacute;`) → v extraktoru
   `unescape_deep()` s opakovaným unescape

## Zjištění

1. **Ceník je pouze obrázek** (`sd_69fafb41a0744.png`) — v HTML není ani jedna
   cena ani název služby jako text. Pro vyhledávače a AI neviditelné.
2. **Prázdné meta description a keywords na všech 6 stránkách.** Homepage má
   navíc prázdný `<title>` a `og:title`.
3. **Duplicitní title** — `/naše_služby.html` i `/naše_služby-1.html`
   (fotogalerie) mají obě "Naše služby".
4. **Dvě různá telefonní čísla** — tlačítko Volat `+420 728 420 689`,
   WhatsApp `+420 733 248 967`. Není jasné, které je hlavní. **K ověření.**
5. **E-mail není na webu nikde uveden** — pouze kontaktní formulář.
6. **Celý web má 2 278 znaků textu**, z toho 1 915 (84 %) na stránce "O nás".
   Fotogalerie má 0 znaků textu, jen 13 obrázků.
7. Diakritika přímo v URL (`/o_nás.html`).

## Otevřené otázky pro zadavatele

- Které telefonní číslo je hlavní?
- Existuje ceník v textové podobě (ne jako obrázek)?
- Má být zveřejněn e-mail?
- Přesná adresa provozovny v Rudíkově (web uvádí jen obec)?
