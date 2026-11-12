#!/usr/bin/env python3
"""Touch regression for the iOS Web bundle's 100-card catalog."""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = sys.argv[1]
OUT_PATH = Path(sys.argv[2])


def touch_swipe(page, selector):
    box = page.locator(selector).bounding_box()
    if not box:
        raise AssertionError(f"no bounding box for {selector}")
    x = box["x"] + box["width"] / 2
    start_y = box["y"] + box["height"] * 0.78
    end_y = box["y"] + box["height"] * 0.22
    session = page.context.new_cdp_session(page)
    session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": start_y, "id": 1}]})
    for step in range(1, 7):
        y = start_y + (end_y - start_y) * step / 6
        session.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y, "id": 1}]})
    session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    page.goto(f"{BASE_URL}/?demo=style&simulator=1", wait_until="networkidle")
    page.wait_for_function("document.querySelectorAll('#styleOptions .catalog-option').length === 100")
    selector = "#styleOptions"
    before = page.locator(selector).evaluate(
        "el => ({scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflowY: getComputedStyle(el).overflowY, display: getComputedStyle(el).display, touchAction: getComputedStyle(el).touchAction})"
    )
    touch_swipe(page, selector)
    page.wait_for_timeout(300)
    after_swipe = page.locator(selector).evaluate("el => ({scrollTop: el.scrollTop, maxScrollTop: el.scrollHeight - el.clientHeight})")
    last = page.locator("#styleOptions .catalog-option").nth(99)
    last.scroll_into_view_if_needed()
    last.click()
    selected_last = last.evaluate("el => el.classList.contains('selected')")
    page.locator("#colorTab").click()
    colors = page.locator(".color-option")
    colors.nth(1).click()
    colors.nth(2).click()
    selected_color = colors.nth(2).evaluate("el => el.classList.contains('selected')")
    page.locator("#hairTab").click()
    page.locator("#viewResult").click()
    reached_compare = page.locator("body").evaluate("el => el.dataset.mode === 'result'")
    result = {
        "engine": "chromium-touch-emulation",
        "before": before,
        "after_swipe": after_swipe,
        "last_entry_clickable": selected_last,
        "second_color_clickable": selected_color,
        "compare_reached": reached_compare,
        "pass": after_swipe["scrollTop"] >= 40 and selected_last and selected_color and reached_compare,
    }
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    browser.close()

if not result["pass"]:
    raise SystemExit("catalog touch scroll regression: FAIL")
