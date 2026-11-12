#!/usr/bin/env python3
"""THROWAWAY fixture: reject a hair edit when protected pixels changed.

No model, network, persistence, or App integration. The two manual masks are
calibrated only for the fixed synthetic fixture. Output is a readable state
snapshot in output/results.json plus PNG masks and diff heatmaps.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "throwaway-realness-bob-2026-08-07" / "output"
OUT = ROOT / "output"
THRESHOLD = 12
GATES = {
    "face": {"changed_percent": 1.0, "mean_abs_difference": 4.0},
    "ears": {"changed_percent": 3.0, "mean_abs_difference": 5.0},
    "neck": {"changed_percent": 3.0, "mean_abs_difference": 5.0},
    "protected_non_hair": {"changed_percent": 3.0, "mean_abs_difference": 5.0},
}


def blank(size: tuple[int, int]) -> Image.Image:
    return Image.new("L", size, 0)


def combined(*masks: Image.Image) -> Image.Image:
    result = blank(masks[0].size)
    for mask in masks:
        result = ImageChops.lighter(result, mask)
    return result


def mask_set(view: str, size: tuple[int, int]) -> dict[str, Image.Image]:
    """Fixed-fixture manual regions, intentionally not a general segmentation model."""
    width, height = size
    if (width, height) != (607, 863):
        raise ValueError(f"Expected 607x863 fixture, got {width}x{height}")
    face = blank(size)
    ears = blank(size)
    neck = blank(size)
    hair_outer = blank(size)
    if view == "front":
        ImageDraw.Draw(face).ellipse((174, 164, 438, 547), fill=255)
        d = ImageDraw.Draw(ears)
        d.ellipse((143, 308, 190, 427), fill=255)
        d.ellipse((424, 308, 471, 427), fill=255)
        ImageDraw.Draw(neck).polygon([(235, 500), (376, 500), (399, 675), (212, 675)], fill=255)
        ImageDraw.Draw(hair_outer).ellipse((98, 55, 509, 626), fill=255)
    elif view == "left":
        ImageDraw.Draw(face).ellipse((183, 165, 445, 548), fill=255)
        d = ImageDraw.Draw(ears)
        d.ellipse((160, 302, 210, 430), fill=255)
        d.ellipse((430, 323, 466, 419), fill=255)
        ImageDraw.Draw(neck).polygon([(239, 500), (378, 500), (409, 682), (216, 682)], fill=255)
        ImageDraw.Draw(hair_outer).ellipse((91, 54, 510, 635), fill=255)
    else:
        raise ValueError(view)
    protected_anatomy = combined(face, ears, neck)
    edge_buffer = protected_anatomy.filter(ImageFilter.MaxFilter(25))
    hair_editable = ImageChops.subtract(hair_outer, edge_buffer)
    protected_non_hair = ImageChops.invert(hair_editable)
    return {
        "hair_editable": hair_editable,
        "face": face,
        "ears": ears,
        "neck": neck,
        "protected_non_hair": protected_non_hair,
    }


def region_stats(diff: Image.Image, mask: Image.Image) -> dict[str, float | int]:
    values = []
    for rgb, selected in zip(diff.getdata(), mask.getdata()):
        if selected:
            values.append(sum(rgb) / 3)
    changed = sum(value > THRESHOLD for value in values)
    return {
        "pixels": len(values),
        "mean_abs_difference": round(sum(values) / len(values), 3),
        "changed_pixels": changed,
        "changed_percent": round(100 * changed / len(values), 3),
    }


def heatmap(source: Image.Image, diff: Image.Image, path: Path) -> None:
    energy = diff.convert("L").point(lambda value: min(255, value * 3))
    red = Image.merge("RGB", (energy, Image.new("L", energy.size), Image.new("L", energy.size)))
    Image.blend(source, red, 0.58).save(path)


def mask_preview(source: Image.Image, masks: dict[str, Image.Image], path: Path) -> None:
    canvas = source.convert("RGBA")
    layers = (("hair_editable", (41, 121, 255, 90)), ("face", (255, 199, 0, 115)), ("ears", (255, 71, 71, 145)), ("neck", (0, 195, 132, 115)))
    for name, colour in layers:
        paint = Image.new("RGBA", source.size, colour)
        canvas.alpha_composite(Image.composite(paint, Image.new("RGBA", source.size), masks[name]))
    canvas.convert("RGB").save(path)


def pair(view: str, input_name: str, candidate_name: str) -> dict:
    source = Image.open(PREVIOUS / input_name).convert("RGB")
    candidate = Image.open(PREVIOUS / candidate_name).convert("RGB")
    if source.size != candidate.size:
        raise ValueError(f"{view}: candidate size {candidate.size} differs from source {source.size}")
    masks = mask_set(view, source.size)
    diff = ImageChops.difference(source, candidate)
    for name, mask in masks.items():
        mask.save(OUT / f"{view}-mask-{name}.png")
    heatmap(source, diff, OUT / f"{view}-pixel-difference-heatmap.png")
    mask_preview(source, masks, OUT / f"{view}-mask-preview.png")
    stats = {name: region_stats(diff, mask) for name, mask in masks.items() if name != "hair_editable"}
    failures = []
    for region, gate in GATES.items():
        actual = stats[region]
        if actual["changed_percent"] > gate["changed_percent"] or actual["mean_abs_difference"] > gate["mean_abs_difference"]:
            failures.append(region)
    return {"view": view, "source": str(PREVIOUS / input_name), "candidate": str(PREVIOUS / candidate_name), "stats": stats, "failures": failures, "verdict": "PASS" if not failures else "FAIL"}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    results = {
        "fixture": "synthetic demo subject only; not real-person identity evidence",
        "mask_method": "manual fixed-fixture geometry; no segmentation model downloaded",
        "candidate_method": "prior ImageGen whole-image redraw baseline; no explicit mask API was available",
        "threshold_per_channel_mean_abs_difference": THRESHOLD,
        "gates": GATES,
        "views": [
            pair("front", "input-front-same-size.png", "bob-front.png"),
            pair("left", "input-left-same-size.png", "bob-left.png"),
        ],
    }
    results["verdict"] = "PASS" if all(item["verdict"] == "PASS" for item in results["views"]) else "FAIL"
    (OUT / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
