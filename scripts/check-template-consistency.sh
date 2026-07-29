#!/usr/bin/env bash
# scripts/check-template-consistency.sh
# §A.7 Template Consistency Check (P1 #2 verification, 2026-06-27)
#
# Ensures every generated deck carries the shared Swiss template signature.
#
# Usage:  bash scripts/check-template-consistency.sh [dist-dir]
# Default dist-dir: ./dist
#
# Exit code: 0 = consistent (per-slide meta-page count matches .slide-page count)
#            1 = drift detected (output details)

set -u
DIST="${1:-./dist}"

if [ ! -d "$DIST" ]; then
  echo "ERROR: dist directory not found: $DIST" >&2
  echo "Run 'pnpm build' first." >&2
  exit 2
fi

fail=0
deck_count=0

# Find all generated slide output dirs (paper + progress).
while IFS= read -r slide_dir; do
  html="$slide_dir/index.html"
  [ -f "$html" ] || continue

  count_class() {
    rg -o "class=\"[^\"]*$1[^\"]*\"" "$html" | wc -l | tr -d ' '
  }

  slide_count=$(count_class "slide-page")
  meta_count=$(count_class "meta-page")
  accent_count=$(count_class "slide-top-accent")
  bar_count=$(count_class "accent-bar")
  kicker_count=$(count_class "kicker")
  corner_count=$(count_class "slide-info-corner")
  rel="${html#"$DIST"/}"
  deck_count=$((deck_count + 1))

  if [ "$slide_count" -eq 0 ] ||
     [ "$meta_count" -ne "$slide_count" ] ||
     [ "$accent_count" -ne "$slide_count" ] ||
     [ "$bar_count" -ne "$slide_count" ] ||
     [ "$kicker_count" -lt "$slide_count" ] ||
     [ "$corner_count" -ne 1 ]; then
    echo "DRIFT: $rel — slides=$slide_count meta=$meta_count top-accent=$accent_count accent-bar=$bar_count kicker=$kicker_count info-corner=$corner_count"
    fail=1
  else
    echo "OK:    $rel — slides=$slide_count, shared signature complete"
  fi
done < <(find "$DIST" -type d -path "*/slide" 2>/dev/null | sort)

# A missing output set must not be reported as consistent.
if [ "$deck_count" -eq 0 ]; then
  echo "DRIFT: no generated slide decks found under $DIST"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "FAIL: generated decks drift from the shared template contract."
  exit 1
fi

echo ""
echo "PASS: $deck_count generated decks satisfy the shared template contract."
exit 0
