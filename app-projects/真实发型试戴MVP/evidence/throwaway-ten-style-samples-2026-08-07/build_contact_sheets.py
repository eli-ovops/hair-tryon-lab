#!/usr/bin/env python3
"""Build evidence overview sheets only; source samples remain unedited."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = ImageFont.load_default()
W, HEADER, ROW_GAP, LABEL_H = 1200, 72, 18, 28


def make(folder: str, items: list[tuple[str, str]], output: str) -> None:
    rows = []
    for filename, label in items:
        image = Image.open(ROOT / folder / filename).convert("RGB")
        h = round(image.height * W / image.width)
        rows.append((image.resize((W, h), Image.Resampling.LANCZOS), label))
    height = HEADER + sum(image.height + LABEL_H + ROW_GAP for image, _ in rows)
    canvas = Image.new("RGB", (W, height), "#f5f5f2")
    draw = ImageDraw.Draw(canvas)
    draw.text((22, 16), "GENERATIVE TECHNICAL SAMPLES — SYNTHETIC SUBJECT — NOT REAL TRY-ON", fill="#7f1d1d", font=FONT)
    y = HEADER
    for image, label in rows:
        draw.text((16, y), label, fill="#111827", font=FONT)
        y += LABEL_H
        canvas.paste(image, (0, y))
        y += image.height + ROW_GAP
    canvas.save(ROOT / output)


make("female", [
    ("01-bob-triptych.png", "01 Female — Jaw Bob"),
    ("02-pixie-triptych.png", "02 Female — Pixie"),
    ("03-long-layers-curtain-bangs-triptych.png", "03 Female — Long layers + curtain bangs"),
    ("04-shoulder-loose-waves-triptych.png", "04 Female — Shoulder loose waves"),
    ("05-medium-long-coily-triptych.png", "05 Female — Medium-long Coily"),
], "female-five-contact-sheet.png")
make("male", [
    ("01-textured-crop-triptych.png", "01 Male — Textured Crop"),
    ("02-crew-fade-triptych.png", "02 Male — Crew / Fade"),
    ("03-side-part-triptych.png", "03 Male — Side Part"),
    ("04-curtains-triptych.png", "04 Male — Curtains"),
    ("05-curly-taper-triptych.png", "05 Male — Curly Taper"),
], "male-five-contact-sheet.png")
