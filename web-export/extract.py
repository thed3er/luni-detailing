#!/usr/bin/env python3
"""Extrakce strukturovaneho textu z HTML stranek lunidetailing.simdif.com."""
import html as H
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SKIP_TAGS = {"script", "style", "noscript", "svg"}
BLOCK = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "div", "section", "br", "td", "tr"}


def unescape_deep(s):
    # SimDif nekde dvojite koduje entity (&amp;iacute;)
    for _ in range(3):
        new = H.unescape(s)
        if new == s:
            break
        s = new
    return s


class Extractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.skip = 0
        self.out = []          # (kind, text)
        self.buf = []
        self.cur_tag = None
        self.images = []
        self.links = []
        self.href = None
        self.link_buf = []

    def _flush(self, kind=None):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        self.buf = []
        if text:
            self.out.append((kind or "text", unescape_deep(text)))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP_TAGS:
            self.skip += 1
            return
        if self.skip:
            return
        if tag == "img":
            self.images.append((unescape_deep(a.get("alt", "")), a.get("src", "")))
            return
        if tag == "a":
            self.href = a.get("href", "")
            self.link_buf = []
        if tag in BLOCK:
            self._flush(self.cur_tag)
            self.cur_tag = tag if re.fullmatch(r"h[1-6]|li", tag) else None

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag == "a" and self.href is not None:
            label = re.sub(r"\s+", " ", "".join(self.link_buf)).strip()
            self.links.append((unescape_deep(label), unescape_deep(self.href)))
            self.href = None
        if tag in BLOCK:
            self._flush(self.cur_tag)
            self.cur_tag = None

    def handle_data(self, d):
        if not self.skip:
            self.buf.append(d)
            if self.href is not None:
                self.link_buf.append(d)

    def handle_entityref(self, name):
        self.handle_data("&%s;" % name)

    def handle_charref(self, name):
        self.handle_data("&#%s;" % name)

    def close(self):
        super().close()
        self._flush(self.cur_tag)


BOILERPLATE = re.compile(
    r"outdated browser|SimDif|Menu ▾|^X$|^Číst dále\.\.\.$|^\W*$", re.I)


def section(src, pattern):
    m = re.search(pattern, src, re.S | re.I)
    return m.group(1) if m else ""


def render(url, path, src):
    title = unescape_deep(section(src, r"<title>(.*?)</title>")).strip()
    desc = unescape_deep(section(src, r'<meta name="description" content="(.*?)"'))
    kw = unescape_deep(section(src, r'<meta name="keywords" content="(.*?)"'))
    og_t = unescape_deep(section(src, r'<meta property="og:title" content="(.*?)"'))

    main = section(src, r"<main.*?>(.*)</main>") or src
    main = re.sub(r"<nav.*?</nav>", "", main, flags=re.S)  # navigace je na vsech strankach stejna
    footer = section(src, r"<footer.*?>(.*)</footer>")

    p = Extractor()
    p.feed(main)
    p.close()

    lines = []
    lines.append("=" * 70)
    lines.append("URL:              %s" % url)
    lines.append("Titulek (title):  %s" % (title or "(prázdný)"))
    lines.append("Meta description: %s" % (desc or "(prázdná)"))
    lines.append("Meta keywords:    %s" % (kw or "(prázdná)"))
    lines.append("OG title:         %s" % (og_t or "(prázdný)"))
    lines.append("=" * 70)
    lines.append("")
    lines.append("## OBSAH STRÁNKY")
    lines.append("")
    seen = set()
    for kind, text in p.out:
        if BOILERPLATE.search(text) or text in seen:
            continue
        seen.add(text)
        if re.fullmatch(r"h[1-6]", kind or ""):
            lines.append("")
            lines.append("[%s] %s" % (kind.upper(), text))
            lines.append("-" * len(text))
        elif kind == "li":
            lines.append("  - %s" % text)
        else:
            lines.append(text)

    imgs = [(alt, s) for alt, s in p.images if not s.startswith("img/preset")]
    if imgs:
        lines.append("")
        lines.append("## OBRÁZKY (alt text | soubor)")
        lines.append("")
        for alt, s in imgs:
            lines.append("  %s | %s" % (alt or "(bez alt textu)", s))

    if p.links:
        lines.append("")
        lines.append("## ODKAZY")
        lines.append("")
        for label, href in p.links:
            if href.startswith(("#", "javascript")):
                continue
            lines.append("  %-40s -> %s" % (label or "(bez textu)", href))

    if footer:
        f = Extractor()
        f.feed(footer)
        f.close()
        ftxt = [t for k, t in f.out if not BOILERPLATE.search(t)]
        if ftxt:
            lines.append("")
            lines.append("## PATIČKA")
            lines.append("")
            lines.extend("  " + t for t in dict.fromkeys(ftxt))

    lines.append("")
    return "\n".join(lines)


def main():
    raw = Path(sys.argv[1])
    outdir = Path(sys.argv[2])
    outdir.mkdir(parents=True, exist_ok=True)
    pages = [
        ("index", "https://lunidetailing.simdif.com/", "01-uvod"),
        ("o_nas", "https://lunidetailing.simdif.com/o_nás.html", "02-o-nas"),
        ("nase_sluzby", "https://lunidetailing.simdif.com/naše_služby.html", "03-nase-sluzby"),
        ("nase_sluzby-1", "https://lunidetailing.simdif.com/naše_služby-1.html", "04-fotogalerie"),
        ("kde_nas_najdete", "https://lunidetailing.simdif.com/kde_nás_najdete.html", "05-kde-nas-najdete"),
        ("contact", "https://lunidetailing.simdif.com/contact.html", "06-kontakty"),
    ]
    for src_name, url, out_name in pages:
        src = (raw / (src_name + ".html")).read_text(encoding="utf-8")
        (outdir / (out_name + ".txt")).write_text(render(url, src_name, src), encoding="utf-8")
        print("ok", out_name)


if __name__ == "__main__":
    main()
