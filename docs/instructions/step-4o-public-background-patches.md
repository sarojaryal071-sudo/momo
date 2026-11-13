# Step 4o — Blurred colour patches on the public site (decision D-067)

Prerequisite: Step 4n is merged (any later step is fine). Merge `origin/main` first. Read `CLAUDE.md`, D-044, D-050, D-059, D-061, D-067 and how the admin builds its layer (`.bg-patches` in `admin/css/admin.css` and the patch tokens in `theme.css`). Owner rules for the session: write the code, run the build once and only the tests for files you changed; look at your own 390 px and 1440 px screenshots of the pages below and say what you saw; no demo wording.

## Do

1. **Reuse the admin layer, do not copy it.** Move the `.bg-patches` rules and the patch tokens (size, blur, colours, opacity, positions) into a shared place both stylesheets use (for example `theme.css` or `base.css`), so the admin and the public site stay identical and change from one place. The admin must look exactly as it does now.
2. **Add the layer to every public page:** home, shop, cart, done (receipt), how to cook, and any other public page (`privacy`, `terms`, 404 if present). One fixed element behind everything: three or four solid circles in the brand colours (emerald tint, sage, peach tint, a hint of green), blurred, low opacity, placed top, middle-left and bottom-right so they show around the content as in the admin. No gradients, no animation, `aria-hidden="true"`, `pointer-events: none`, `z-index` below all content, page base white or the existing very light tint.
3. **Content stays solid:** product cards, the cart, forms, the receipt and text blocks keep their solid backgrounds; the hero panel and photos are untouched. Check that the hero and the trust row do not clash with a patch behind them.
4. **Contrast:** every text and background pair that sits over a patch still meets 4.5:1 (measure at the strongest patch for body text, muted text, the copper and peach accents, buttons and the header); report the lowest ratio you found.
5. **Performance and safety:** the layer must not cost more than it gives: no repaint on scroll (static fixed layer, no `will-change` unless it helps), check scrolling stays smooth at a 390 px viewport with 4x CPU slowdown if you can, and report the home page transfer size and any change in the Lighthouse mobile numbers you can get without a full audit (Step 5 does the full one). If it hurts scrolling, reduce the blur radius or the number of circles and say so.
6. **Fallbacks:** solid base when `backdrop`/`filter` is unsupported, hidden under `prefers-reduced-transparency`, **hidden in print** (the receipt must print clean), and the full-screen menu and product sheet keep their own glass as built.
7. **Keep fluid tokens (D-022):** sizes in token definitions only; no pixel values in components.

## Do not

Add gradients, animation, images or libraries; change layout, copy, glass elsewhere or the admin look; add `overflow-x: hidden` to hide a layout problem (the circles are clipped inside their own fixed layer).

## Report

Under 15 lines: what moved to the shared place, which pages got the layer, the lowest contrast ratio, what you checked on screenshots, scrolling or size cost, and anything that looked off. Then the owner checks the live site on a phone (home, shop, cart, receipt, menu open) and prints a receipt preview.
