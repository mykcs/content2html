# content2html styles/ — architecture

This directory holds the visual contract for all 4 content2html products:
`paper-slide`, `paper-summary`, `progress-slide`, `progress-report`.

## File layout

| File | Scope | Media | Purpose |
|------|-------|-------|---------|
| `global.css` | All slides + longform | screen | Design tokens (Tailwind v4 `@theme`), typography, slide deck chrome |
| `print.css` | All slides (`.slide-page` and descendants) | `@media print` only | Print-optimized layout (297×167mm, 1 slide per page) |

## How print works

`global.css` imports `print.css` after `@import "tailwindcss"`. The print rules
are scoped under `@media print`, so they never affect screen rendering. Every
`.slide-page` element (and its children) is automatically styled for print
without per-slide configuration.

```css
/* global.css */
@import "tailwindcss";
@import "./print.css";   /* auto-applied to all slides in print */
```

## Why two files (not one)

After 6 commits iterating on print (see `~/.claude/docs/adr/0006-content2html-print-strategy.md` Update 1+2
and `~/.claude/knowledge/cases/wiki/CASE-CONTENT2HTML-PRINT-PAGE-COUNT-DVR-20260622.md`),
print grew to ~165 lines of rules with their own design contract (4-layer
print pipeline semantics). Keeping them in a separate file:

1. **Readability** — screen designers scanning `global.css` aren't distracted by print rules.
2. **Single responsibility** — `print.css` documents the print contract top-to-bottom
   in section comments (§1 @page, §2 root font-size, §3 slide sizing, §4 absolute
   elements, §5 figures, §6 per-element px, §7 UI hide). New contributors can read
   the print contract in one place.
3. **Independent evolution** — print rules change at a different cadence than screen
   rules (e.g. print fix tied to a specific browser bug, screen fix tied to a
   visual redesign).
4. **Reuse across products** — `summary` and `report` products use the same
   `global.css` but skip slide print rules (they use `.longform` not `.slide-page`).
   With print.css imported in global.css, the rules apply automatically when `.slide-page`
   is present.

## Adding a new slide type

No print.css changes needed — every `.slide-page` automatically inherits print rules.
If your new slide has absolute-positioned elements, see `print.css` §4 for
the scaling pattern (multiply screen px by `0.5846` and round).

## Adding a new figure aspect class

Append to the figure rule list in `print.css` §5:

```css
.slide-page .frame-img.r-3x4,    /* new aspect ratio */
.slide-page .frame-img.r-21x9,
... { flex: 0 1 auto !important; max-height: 75% !important; height: auto !important; }
```

## E2E verification

```bash
node scripts/verify-print-e2e.mjs
```

Checks (all must pass):

1. PDF page count = `.slide-page` count (no trailing blank, no overflow)
2. `.slide-page` width = 297mm (1122.52px @ 96 DPI)
3. `html` font-size = 9.37px (rem cascade 0.585×)
4. Adjacent sibling `.slide-page + .slide-page` has `break-before: page`
5. Print CSS contains `@page { size: 297mm 167mm }` and `@media print` rules

See `scripts/verify-print-e2e.mjs` for the canonical implementation.

## Scale formula

```
scale = 297mm / (1920px / 96dpi × 25.4mm/inch) = 297 / 508 ≈ 0.5846
```

Every screen px value in `print.css` is `screenValue × scale` (rounded to int).
Every em/rem value cascades from `.slide-page { font-size: 9.37px }` which is
`16px × scale` — so `5rem` (h1 screen) renders as `5 × 9.37 = 46.85px` in print.
