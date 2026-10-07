# HUD cleanup and navigation feedback — 7 October 2026

## User correction

Two screenshots exposed stacked advisor badges, a duplicated level circle, rectangular counter patches and residual coffee artwork behind Mermer. The profile medallion must show only the player's selected gold crest, safely inside its circular frame. Navigation must visibly respond to a press.

## Implementation

- `top-clean-v2.webp` is an imagegen edit of the original HUD painting. Sample counters, advisor dots, the ruler portrait, the small level ring and all coffee artwork were removed. Existing labels/portraits and the walnut/gold direction are retained. This edited background is not claimed to be pixel-identical to the previous crop.
- Live counters render on the continuous painting with transparent backgrounds. The luxury icon and complete name are rendered for every specialty, including Kahve. There are no rectangular text patches or steam behind Mermer.
- The profile button renders `RoyalCrest` at 58% of the slot. Its 22% left / 27% top offset places its center at the painted medallion center (about 73,73 on the 864px canvas). One runtime level circle remains. No cloth or pole appears.
- Advisor dots have a single runtime source. A silent advisor has no dot, and a marked advisor has one round dot in the portrait rim position. News quantities remain in accessible button labels.
- The five lower painted plates respond independently: a 3px/4% press, a 420ms gold flash on every click and a persistent bright/gold selected plate. Reduced-motion uses immediate brightness and selection rather than movement.
- The baked task notification seal is covered with nearby matching walnut from the same painting, moving with the plate. There is no black/outlined neutral dot. Only the live task notification count creates a red dot.
- Navigation callbacks, economy, game rules and save format remain unchanged.

## Verification

328 tests, typecheck, ESLint, CSS gates and V2 criteria were run. Browser checks cover 360/390 and reference-sized 864 viewports; five navigation actions, press transform, repeatable flash, selected-state marker, one level circle, selected cloth source and transparent counter backgrounds. The layout scanner is also run and its existing sub-44px advisor targets/reference-size text findings are retained honestly rather than labelled a clean accessibility pass.

## Art provenance

Built-in imagegen edit, precise-object-edit. Final asset: `public/images/game/ui/exact-hud/top-clean-v2.webp`.

Prompt: Preserve the two-row walnut/gold HUD direction, outer frame, castle, resource icons and four advisor portraits/labels. Remove the ruler face, sample text/numbers, small level circle and all fixed red notification dots; restore continuous wood/parchment. Remove the coffee cup/saucer/steam and Kahve label for the runtime luxury resource. Keep the exterior transparent. Do not leave ghost numbers, rectangle patches or duplicated circles.

Revision 0.60.2, service-worker cache v60.

## City chooser — 0.60.5

The city plaque/arrow opens a compact walnut menu with every owned city, island coordinates and the active-city check. Selecting a city uses the existing visit/select action, closes the menu and returns to city view. Outside pointer, Escape and arrow-key navigation are supported; city management remains a menu item. Multi-city selection, close behavior and the wolf emblem were checked at 390px.
