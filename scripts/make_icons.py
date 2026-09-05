#!/usr/bin/env python3
"""Generate small install icons. Not vocabulary illustrations."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def make(size: int) -> None:
    img = Image.new("RGB", (size, size), "#1f5c4d")
    draw = ImageDraw.Draw(img)
    margin = size * 0.22
    page = [margin, margin * 0.85, size - margin, size - margin * 0.7]
    draw.rounded_rectangle(page, radius=size * 0.04, fill="#f6f1e8")
    x0 = margin + size * 0.08
    draw.rectangle(
        [x0, margin * 1.25, x0 + size * 0.28, margin * 1.25 + size * 0.05],
        fill="#1f5c4d",
    )
    for i in range(2):
        top = margin * 1.7 + i * size * 0.12
        draw.rectangle(
            [x0, top, size - margin - size * 0.08, top + size * 0.035],
            fill="#8a8378",
        )
    img.save(OUT / f"icon-{size}.png", optimize=True)


if __name__ == "__main__":
    make(192)
    make(512)
    print(f"wrote icons in {OUT}")
