#!/usr/bin/env python3
"""THROWAWAY controlled compositing proof; not a general hair segmentation pipeline."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "throwaway-realness-bob-2026-08-07" / "output"
OUT = ROOT / "controlled-output"
SIZE = (607, 863)


def blank() -> Image.Image:
    return Image.new("L", SIZE, 0)


def union(*masks: Image.Image) -> Image.Image:
    result = blank()
    for mask in masks:
        result = ImageChops.lighter(result, mask)
    return result


def regions(view: str) -> tuple[Image.Image, Image.Image, dict[str, Image.Image], list[tuple[int, int]]]:
    """Manual, fixed-fixture regions. They are intentionally non-general."""
    face, ears, neck, outer = blank(), blank(), blank(), blank()
    if view == "front":
        ImageDraw.Draw(face).ellipse((174, 164, 438, 547), fill=255)
        d = ImageDraw.Draw(ears)
        d.ellipse((143, 308, 190, 427), fill=255); d.ellipse((424, 308, 471, 427), fill=255)
        ImageDraw.Draw(neck).polygon([(235, 500), (376, 500), (399, 675), (212, 675)], fill=255)
        shell = [(97, 62), (176, 28), (430, 28), (510, 96), (525, 328), (507, 555), (444, 641), (385, 644), (385, 535), (222, 535), (222, 645), (158, 640), (95, 554), (78, 330)]
        bob = [(123, 96), (175, 55), (430, 55), (482, 110), (488, 355), (452, 553), (405, 592), (203, 592), (151, 553), (111, 354)]
    elif view == "left":
        ImageDraw.Draw(face).ellipse((183, 165, 445, 548), fill=255)
        d = ImageDraw.Draw(ears)
        d.ellipse((160, 302, 210, 430), fill=255); d.ellipse((430, 323, 466, 419), fill=255)
        ImageDraw.Draw(neck).polygon([(239, 500), (378, 500), (409, 682), (216, 682)], fill=255)
        shell = [(90, 55), (166, 24), (426, 34), (510, 112), (528, 336), (511, 565), (448, 652), (392, 650), (390, 535), (224, 535), (216, 652), (152, 642), (88, 555), (70, 328)]
        bob = [(116, 92), (168, 49), (424, 59), (484, 118), (493, 360), (456, 564), (406, 601), (199, 595), (141, 550), (103, 354)]
    else:
        raise ValueError(view)
    ImageDraw.Draw(outer).polygon(shell, fill=255)
    protected = union(face, ears, neck)
    # 12px protection buffer means the edit will not touch immediate anatomy edges.
    protected_buffer = protected.filter(ImageFilter.MaxFilter(25))
    edit = ImageChops.subtract(outer, protected_buffer)
    return edit, protected, {"face": face, "ears": ears, "neck": neck}, bob


def write_inputs(view: str, source_name: str) -> None:
    source = Image.open(PREVIOUS / source_name).convert("RGB")
    source.save(OUT / f"{view}-before-source.png")
    edit, protected, parts, bob = regions(view)
    edit.save(OUT / f"{view}-edit-mask-binary.png")
    protected.save(OUT / f"{view}-protected-anatomy-mask.png")
    for name, mask in parts.items():
        mask.save(OUT / f"{view}-protected-{name}-mask.png")
    annotation = source.convert("RGBA")
    magenta = Image.new("RGBA", SIZE, (230, 0, 170, 120))
    green = Image.new("RGBA", SIZE, (0, 230, 120, 145))
    annotation.alpha_composite(Image.composite(magenta, Image.new("RGBA", SIZE), edit))
    annotation.alpha_composite(Image.composite(green, Image.new("RGBA", SIZE), protected))
    draw = ImageDraw.Draw(annotation)
    draw.line(bob + [bob[0]], fill=(0, 232, 255, 255), width=5, joint="curve")
    annotation.convert("RGB").save(OUT / f"{view}-imagegen-edit-annotation.png")


def stat(diff: Image.Image, mask: Image.Image) -> dict[str, float | int]:
    selected = [sum(pixel) / 3 for pixel, value in zip(diff.getdata(), mask.getdata()) if value]
    changed = sum(value != 0 for value in selected)
    return {
        "pixels": len(selected),
        "changed_pixels": changed,
        "changed_percent": round(100 * changed / len(selected), 6),
        "mean_abs_difference": round(sum(selected) / len(selected), 6),
        "max_abs_difference": round(max(selected), 6),
    }


def heatmap(source: Image.Image, diff: Image.Image, output: Path) -> None:
    energy = diff.convert("L").point(lambda value: min(255, value * 3))
    red = Image.merge("RGB", (energy, Image.new("L", SIZE), Image.new("L", SIZE)))
    Image.blend(source, red, 0.62).save(output)


def composite(view: str, source_name: str, candidate_path: Path) -> dict:
    source = Image.open(PREVIOUS / source_name).convert("RGB")
    candidate = ImageOps.fit(Image.open(candidate_path).convert("RGB"), SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    edit, protected, parts, _ = regions(view)
    # Feather starts only inside the binary edit area; every zero-mask pixel is source-identical.
    feather = ImageChops.darker(edit, edit.filter(ImageFilter.GaussianBlur(6)))
    result = Image.composite(candidate, source, feather)
    result.save(OUT / f"{view}-controlled-bob.png")
    result.save(OUT / f"{view}-after-controlled-bob.png")
    candidate.save(OUT / f"{view}-imagegen-candidate-normalized.png")
    diff = ImageChops.difference(source, result)
    heatmap(source, diff, OUT / f"{view}-controlled-difference-heatmap.png")
    stats = {name: stat(diff, mask) for name, mask in parts.items()}
    stats["protected_anatomy"] = stat(diff, protected)
    outside = ImageChops.invert(edit)
    stats["outside_binary_edit_mask"] = stat(diff, outside)
    checks = {name: values["changed_pixels"] == 0 for name, values in stats.items()}
    return {"view": view, "candidate": str(candidate_path), "checks": checks, "stats": stats, "verdict": "PASS" if all(checks.values()) else "FAIL"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-front", type=Path)
    parser.add_argument("--candidate-left", type=Path)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    write_inputs("front", "input-front-same-size.png")
    write_inputs("left", "input-left-same-size.png")
    if not args.candidate_front or not args.candidate_left:
        print("Prepared ImageGen reference annotations in", OUT)
        return
    data = {
        "scope": "synthetic fixture only; local compositing mechanism, not production segmentation",
        "candidate_generation": "ImageGen received source + visible annotation; annotation is advisory because the API has no explicit mask parameter",
        "views": [
            composite("front", "input-front-same-size.png", args.candidate_front),
            composite("left", "input-left-same-size.png", args.candidate_left),
        ],
    }
    data["verdict"] = "PASS" if all(item["verdict"] == "PASS" for item in data["views"]) else "FAIL"
    (OUT / "controlled-results.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
