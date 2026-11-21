"""Builds static DM Sans instances for the PDF collateral (#119).

Chromium embeds variable fonts in PDFs as Type 3 glyph outlines, which some PDF viewers
render unhinted and which inflate the file. Static 400/700 instances of the site's own
self-hosted DM Sans subsets embed as ordinary TrueType instead.

Usage (needs fontTools and brotli):
    python -m pip install fonttools==4.55.3 brotli==1.1.0
    python tools/build-collateral-fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
src = root / "dist" / "assets" / "fonts"
out = root / "docs" / "collateral" / "source" / "fonts"
out.mkdir(parents=True, exist_ok=True)

for subset in ("latin", "latin-ext"):
    for weight in (400, 700):
        font = instantiateVariableFont(TTFont(src / f"dm-sans-{subset}.woff2"), {"wght": weight}, updateFontNames=True)
        font.flavor = "woff2"
        target = out / f"dm-sans-{subset}-{weight}.woff2"
        font.save(target)
        print(f"{target.relative_to(root)}: {target.stat().st_size} bytes")
