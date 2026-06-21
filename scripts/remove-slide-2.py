#!/usr/bin/env python3
"""Remove Slide 2 (Abstract) from both ZH and EN slide templates.
After removal: slide count 14 -> 13, re-number data-page="N" -> "N-1" for N>=3,
meta-page "NN / 14" -> "(NN-1) / 13".

Run: python3 scripts/remove-slide-2.py
"""
import re
import sys
from pathlib import Path

ROOT = Path("/Users/myk/Repo/mykcs/content2html")
TARGETS = [
    ROOT / "src/pages/zh/paper/2603.12109/slide.astro",
    ROOT / "src/pages/en/paper/2603.12109/slide.astro",
]


def renumber(content: str) -> tuple[str, dict]:
    stats: dict = {}

    slide2_pattern = re.compile(
        r"  <!-- Slide 2:[^\n]*\n(?:.*?\n)*?  </section>\n",
        re.MULTILINE,
    )
    new_content, n_removed = slide2_pattern.subn("", content, count=1)
    stats["slide2_removed"] = n_removed

    def replace_data_page(match: re.Match) -> str:
        n = int(match.group(1))
        if n >= 3:
            return f'data-page="{n - 1}"'
        return match.group(0)
    new_content, dp_count = re.subn(
        r'data-page="(\d+)"', replace_data_page, new_content
    )
    stats["data_page_renumbered"] = dp_count

    def replace_meta_page(match: re.Match) -> str:
        n = int(match.group(1))
        if n >= 3:
            return f'meta-page">{n - 1:02d} / 13'
        return match.group(0)
    new_content, mp_count = re.subn(
        r'meta-page">(\d{2}) / 14', replace_meta_page, new_content
    )
    stats["meta_page_renumbered"] = mp_count

    new_content = new_content.replace(
        "meta-page\">01 / 14", "meta-page\">01 / 13"
    )

    return new_content, stats


for path in TARGETS:
    content = path.read_text(encoding="utf-8")
    print(f"\n=== {path.relative_to(ROOT)} ===")
    print(f"  Before: {len(content)} bytes")

    new_content, stats = renumber(content)

    print(f"  After:  {len(new_content)} bytes")
    print(f"  slide2_removed: {stats['slide2_removed']}")
    print(f"  data_page_renumbered: {stats['data_page_renumbered']}")
    print(f"  meta_page_renumbered: {stats['meta_page_renumbered']}")

    if stats["slide2_removed"] != 1:
        print(f"  ERROR: expected to remove exactly 1 slide-2 section, got {stats['slide2_removed']}")
        sys.exit(1)

    dp_values = re.findall(r'data-page="(\d+)"', new_content)
    if sorted(int(v) for v in dp_values) != list(range(1, 14)):
        print(f"  ERROR: data-page values not unique 1..13, got {sorted(set(int(v) for v in dp_values))}")
        sys.exit(1)

    path.write_text(new_content, encoding="utf-8")
    print(f"  Written (data-page values: {sorted(int(v) for v in set(dp_values))})")

print("\nAll files updated.")