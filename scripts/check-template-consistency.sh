#!/usr/bin/env bash
# scripts/check-template-consistency.sh
# §A.7 Template Consistency Check (P1 #2 verification, 2026-06-27)
#
# Ensures progress slides have the same number of meta-page indicators as paper slides
# (i.e. one per .slide-page section). Catches drift between paper-mode and progress-mode
# templates when adding new slide variants.
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

# Find all slide.astro output dirs (paper + progress)
while IFS= read -r slide_dir; do
  html="$slide_dir/index.html"
  [ -f "$html" ] || continue

  # Count meta-page class occurrences
  meta_count=$(grep -oE 'class="meta-page"' "$html" | wc -l | tr -d ' ')
  # Count .slide-page sections (data-page attributes are the canonical marker)
  slide_count=$(grep -oE 'class="slide-page[^"]*"' "$html" | wc -l | tr -d ' ')

  rel="${html#$DIST/}"
  if [ "$meta_count" != "$slide_count" ]; then
    echo "DRIFT: $rel — meta-page=$meta_count vs slide-page=$slide_count"
    fail=1
  else
    echo "OK:    $rel — $meta_count meta-page = $slide_count slide-page"
  fi
done < <(find "$DIST" -type d -path "*/slide" 2>/dev/null | sort)

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "FAIL: progress/paper slides have inconsistent meta-page indicator count."
  echo "Each .slide-page section should have exactly one <span class=\"meta-page\"> element."
  exit 1
fi

echo ""
echo "PASS: all slides consistent ($meta_count meta-page per $slide_count slide-page)"
exit 0