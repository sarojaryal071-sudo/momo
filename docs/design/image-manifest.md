# Image manifest

Status: v2, 2026-11-10 (hero replaced). All images are in `frontend/assets/img/` as WebP. Every one is **AI-generated** and is a mood placeholder until her real photos exist (decision D-017). Never present them as her real kitchen or her actual packs.

## How each type must be used

- **Cut-out** (real transparency): place on white, `--green-tint`, `--peach` or `--peach-tint`. The chutney and step cut-outs keep a soft baked shadow under them, so **do not place those on emerald**. The hero and the single momo have no baked shadow; add `--shadow-card` with `filter: drop-shadow(...)` if wanted.
- **Multiply** (opaque, white background): the two pack shots. Show them with `mix-blend-mode: multiply` inside a container that has `isolation: isolate` and a light tinted background (white or `--green-tint`). The white disappears and the clear plastic stays transparent. Do not add a drop-shadow filter or an opacity animation to these, and do not place them on a dark background.
- **Scene** (opaque photo): used as a framed image, never as a stretched full-bleed band (see sizes).

## Files

| File (+ smaller variant) | Size | Type | Where | Suggested alt text |
|---|---|---|---|---|
| `cutout-hero.webp` (+ `-600`) | 1200 x 1200 | cut-out | Hero panel | "A bamboo steamer filled with freshly steamed momo" |
| `cutout-momo.webp` (+ `-400`) | 800 x 800 | cut-out | Steps section; spare | "A single pleated momo" |
| `cutout-chutney.webp` (+ `-400`) | 800 x 800 | cut-out | Chutney tile | "A clay bowl of red tomato chutney with a wooden spoon" |
| `cutout-step-wrapper.webp` (+ `-300`) | 600 x 600 | cut-out | Steps: wrapper | "A thin round of dough" |
| `cutout-step-fold.webp` (+ `-300`) | 600 x 600 | cut-out | Steps: fold | "A momo being folded around a filling" |
| `cutout-step-finished.webp` (+ `-300`) | 600 x 600 | cut-out | Steps: finished | "A finished, pleated momo" |
| `pack-chicken.webp` (+ `-400`) | 800 x 800 | multiply | Product card, slug `chicken-momo` | "A bag of frozen momo tied with twine and a blank paper tag" |
| `pack-veg.webp` (+ `-400`) | 800 x 800 | multiply | Product card, slug `veg-momo` | same wording |
| `photo-kitchen-corner.webp` (+ `-800`) | 1024 x 687 | scene | Made-together band, how to cook | "A home kitchen corner with a brick wall, wooden counter and a bamboo steamer" |
| `photo-plate.webp` (+ `-800`) | 1024 x 687 | scene | Spare (banner or shop header) | "A plate of steamed momo with a small bowl of tomato chutney" |

Variants named `-400`, `-300` and `-600` are the smaller sizes for `srcset`; the full-size file has no suffix. The old `placeholder-kitchen-corner*.webp` files can be deleted once nothing refers to them. `placeholder-og.webp` stays until the social preview image exists (Step 5).

## Known limits (do not hide these)

1. **Hero (replaced 2026-11-10):** open steamer, no lid, fully inside the frame with margin, no baked shadow. It has a very faint baked steam wisp inside the basket; the CSS wisps add more above it, so keep them subtle.
2. **The two pack shots look almost the same** (same bag, tag and angle) and show roughly 9 to 12 momo, not 40. They are placeholders. The product name, size and price carry the difference. Replace both with real photos before launch.
3. **Scenes are only 1024 px wide.** Show them in a framed or half-width container up to about their native width. Do not stretch them across a wide band; they will look soft. Regenerate at larger size if a wide banner is wanted.
4. **Steam:** only a faint baked wisp in the hero; the CSS steam wisps provide the rest.
5. **The product `photo` field in the database** can point at an uploaded image later; these files are only the fallbacks for the seeded products.
6. **Placeholder honesty:** keep the "photo coming soon" status in the report; add the real photos when she has them and remove these.

## Replacement plan

When her real product photos exist: photograph each pack on a plain light background, keep the same file names and sizes, and the layout needs no changes.
