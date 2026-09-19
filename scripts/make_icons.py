#!/usr/bin/env python3
"""Resize the Vocab AI source icon. Recolor the AI badge and rays to the accent."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "icon-source.png"
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
FILL = (109, 92, 255, 255)  # #6d5cff


def is_accent_mark(r: int, g: int, b: int, a: int) -> bool:
    if a < 10:
        return False
    return b > r + 60 and b > g + 40 and b > 150


def recolor(img: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    src = img.convert("RGBA")
    pixels = src.load()
    width, height = src.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if is_accent_mark(r, g, b, a):
                pixels[x, y] = (color[0], color[1], color[2], a)
    return src


def save_png(img: Image.Image, size: int, name: str) -> None:
    img.resize((size, size), Image.Resampling.LANCZOS).save(OUT / name, optimize=True)


def write_favicon_svg(png32: Path) -> None:
    import base64

    payload = base64.b64encode(png32.read_bytes()).decode("ascii")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n'
        f'  <image href="data:image/png;base64,{payload}" width="32" height="32"/>\n'
        "</svg>\n"
    )
    (ROOT / "public" / "favicon.svg").write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    original = Image.open(SRC).convert("RGBA")
    save_png(original, 192, "icon-mark.png")
    tinted = recolor(original, FILL)
    save_png(tinted, 192, "icon-192.png")
    save_png(tinted, 512, "icon-512.png")
    fav = tinted.resize((32, 32), Image.Resampling.LANCZOS)
    fav_path = ROOT / "public" / "favicon-32.png"
    fav.save(fav_path, optimize=True)
    write_favicon_svg(fav_path)
    print(f"wrote icons in {OUT}")
