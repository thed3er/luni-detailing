# 2026-08-08 — Extrakce ceníku z obrázku

## Co bylo uděláno

Stažen obrázek ceníku z webu a jeho obsah přepsán do textu.

**Nové soubory:**

- `web-export/obrazky/cenik.png` — originál stažený z
  `https://lunidetailing.simdif.com/images/public/sd_69fafb41a0744.png`
  (844 × 1265 px, 1,6 MB)
- `web-export/texty/07-cenik.txt` — přepis ceníku: strukturovaný text
  + CSV přehled 24 položek + seznam překlepů v originálu + otázky k ověření

Aktualizován `web-export/sitemap.txt` (poznámka 1 a seznam souborů).

## Proč

Ceník je na webu pouze jako PNG. Pro nový web, vyhledávače i AI je obsah
nepoužitelný. Bylo potřeba dostat ceny do textové podoby.

## Postup

Přepis z obrázku. Každá sekce s cenou ověřena zvlášť na zvětšeném výřezu
(`sips -c ... --cropOffset ... && sips -Z 1200`), aby nedošlo k záměně
číslic — sekce interiér, balíčky, leštění, keramická ochrana i doplňkové
služby zkontrolovány samostatně.

## Zjištěné ceny (shrnutí)

| Kategorie | Rozsah |
|---|---|
| Interiér Klasik / Premium | od 990 / od 3 190 Kč |
| Exteriér Klasik / Premium | 990 / 1 990 Kč |
| Leštění 1-krokové / 2-krokové | 5 990–7 490 / 9 990–11 490 Kč |
| Keramická ochrana roční / 3letá | 4 990 / 6 990 Kč (+1 500 příprava laku) |
| Balíčky: Auto na prodej / Klasik / Premium | 7 490 / 14 990 / 18 990 Kč |
| Doplňky | 300–3 490 Kč |
| Příplatek dodávky | +20 % |

## Zjištění

1. **Překlepy přímo v obrázku:** „nezahrnuii" (→ nezahrnují), „3létá"
   (→ 3letá), „Čelni okno" (→ Čelní okno). Při výrobě nového ceníku opravit.
2. **Nejednotné formátování cen** — střídá se „990,- Kč" / „990 Kč",
   „1 490 Kč" / „1490 Kč".
3. **Terminologický rozpor:** balíčky obsahují „exteriér standard", ale
   v sekci EXTERIÉR se stupeň jmenuje „Klasik". **K ověření.**

## Otevřené otázky pro zadavatele

- Je „exteriér standard" v balíčcích totéž co „Exteriér Klasik"?
- Od čeho se odvíjí cena „od" u interiéru a rozsahy u leštění a vosku?
- Platí příplatek „Dodávky +20 %" na celý ceník, nebo jen na balíčky?
- Doby trvání jednotlivých zakázek (na webu nikde).
