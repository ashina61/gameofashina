# Sancaktar raster art · 5 October 2026

Project assets: public/images/game/ui/sancaktar/. Built-in imagegen used; no CLI/API key workflow. Three generation calls produced a transparent heraldic atlas, a ten-standard atlas and the transparent extraction of the latter. Sharp extracts the individual sprites and derives cloth-only alpha masks. Exact saved crest, banner and color identifiers are retained.

## Prompt set

1. Transparent production sprite atlas, 3 columns × 4 rows. In order: crescent and star, tulip, crossed curved swords, galley, tower, open book, sun, eagle, wolf head, bow and arrow, plane tree, eight-point star. Raised antique gold/champagne embroidery, visible stitches, sculpted relief, warm upper-left light, copper recesses, same painter. No backing cloth, coins, shields, text or vector outlines.
2. Ten silk standards, five columns × two rows, reference standard.webp for gold pole and neutral silver silk. In order: shallow swallowtail, deep double tail, triangular pennant, rectangular bottom, broad spear point, deep notch, round bottom, serrated bottom, three tails, narrow pennant. Gold embroidery must follow each actual shape. Same brass poles, tassels and empty emblem areas. No text or emblem.
3. Extract the atlas background to genuine alpha while preserving every pole, cloth cut, gold border and registration.

Every cloth is 300×500 WebP with genuine alpha; each emblem is 256×256 transparent WebP. Runtime only colors the neutral silk using its own raster alpha mask; golden details remain untouched. The emblem is a separate image, never an SVG.
