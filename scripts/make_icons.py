#!/usr/bin/env python3
"""Resize the Vocab AI source icon. Not vocabulary illustrations."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "icon-source.png"
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
FILL = "#6d5cff"


def make(size: int) -> None:
    img = Image.open(SRC).convert("RGBA")
    canvas = Image.new("RGB", img.size, FILL)
    canvas.paste(img, mask=img.split()[-1])
    canvas.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)


if __name__ == "__main__":
    make(192)
    make(512)
    print(f"wrote icons in {OUT}")
