# Reference city adaptation — 0.102.0 / SW116

The user supplied `1000146426.png` on 11 October and requested its adaptation to Payitaht. The new renderer uses the measured clearings in that painting; the Tiled map, engine plot indices, save schema, economy and approved HUD are unchanged. The source contains 24 movable land plots, the fixed municipal center, three piers, and one pirate island.

## Rendering

- `lib/game/city-map/master-projection.json` maps the 29 stable engine indices to measured image pixels. A minimum-cost assignment preserves relative positions of existing plots.
- `MasterCityScene` uses the existing Phaser camera gestures, controls bridge, lazy building textures, timers, flag and sky layers. Hit areas and move previews use the measured rectangles, with engine `plotOpen`/`plotFits` rules.
- Existing three-stage building art is reused. The embedded municipal building was removed from the terrain so the real municipal sprite responds to upgrades; no second municipal building is painted underneath it.
- Source layout and all three docks remain in the terrain. The northern defense artwork follows the painted embankment, rather than the old Tiled ring. Siege occupation flags/smoke and blockade ships use the new locations.
- Image aspect ratio is preserved. Mirrored water/soft distant woodland strips continue the portrait viewport. Citizens follow measured road lines. Moving merchant vessels and departure effects are separate sprites.
- This is a 2D painting: waterfalls and water highlights in the background itself remain static. Existing building art remains isometric; a new family drawn to this camera would be a separate art task.
- Changes are held on an isolated review branch. Do not deploy this visual change without the user's next instruction; the earlier instruction against publishing rejected city work remains applicable.

## Asset provenance

Built-in imagegen edit, `precise-object-edit`: remove only the central municipal building, its stairs and nearby central cypresses; fill with warm-earth empty construction ground; retain the other 24 plots, road intersections, waterfalls, cliffs, three piers and pirate island in place; same 1536×1024 image and lighting; no text/UI. The resulting terrain was exported as `public/images/game/terrain/city-master-20261011.webp` at WebP quality 88 (476 KiB). Prompt uses the user-supplied image as the edit target. No CLI/API image-generation fallback was used.

## Validation

Production static build, TypeScript, ESLint, CSS checks and V2 criteria passed. Two new tests verify preservation of all 29 indices/slot identities, image containment, maximum sprite widths and nonoverlapping plot click areas. PWA cache version check updated with SW116, and the new terrain is included in precache.

Actual Chromium/Phaser captures: new city, level-20 municipal center with level-8 land/coast/defense buildings, and harbor focus. These have zero page errors or missing assets. Screenshots are in `docs/mockups/master-adaptation/`.

The required full `layout-qa.cjs` was run. It reported zero overflow, clipped text, overlap, unnamed controls or page errors; it did not pass overall because unchanged HUD controls reported 312 repeated small-target and 664 repeated small-font findings across page/viewport visits. These are existing selectors in `ika-ribbon`, `ika-stock-open`, `ika-crest`, `ika-city`, `ika-might`, plus one quest-chip label. HUD files and styles are not changed by this task. These warnings are not treated as a clean layout pass.
