# Exact source HUD — 7 October 2026

User source: `docs/mockups/exact-hud/reference.png` (1000145232.png).

The upper and lower bar paintings are lossless crops of this source, rather than approximations assembled from the previous icons. The upper crop is (0,38,864,232); lower crop is (0,1298,864,220). Artwork, portraits, gold ornaments, parchment, ship/city/island icons and compass retain the original pixels. CSS clips away exterior background corners and scales each bar uniformly to viewport width. Safe areas remain outside the artwork.

Live city name, coordinates, Divanhane level, might, resources, production and action points cover source example text. Non-coffee islands show their existing luxury icon/name instead of a misleading coffee counter. Advisor and quest notification dots follow actual news. Screen-reader labels retain live quantities. All callbacks are unchanged. The depicted ruler portrait intentionally follows this exact requested reference rather than the old embroidered crest.

## Verification

- 328 engine/cache tests pass; typecheck, ESLint, CSS colour/unused-class gates and V2 criteria pass.
- Browser verified at 360×740, 390×844 and reference-size 864×1536. The 360/390 captures and source reference are archived in `docs/mockups/exact-hud/`.
- All five navigation actions were clicked in the running application.
- Resource masks were corrected after finding source/sample figures behind the live action-point text; no example numbers remain visible in the final captures.
- Layout scan also runs at 130% text size and reports failures; its report is not a clean pass. Its small-text/touch-size findings must not be described as a clean accessibility pass: uniform scaling of this dense original reference yields advisor hit areas narrower than 44px and reference-sized text below 11px on narrow phones.

This is source artwork fidelity, not a claim of an identical entire screenshot. City scene, real values, city name, island luxury and news dots differ with the actual game state. Baked decorative labels/icons are the requested painting; dynamic information remains DOM text.

Cache revision: v59. Package revision: 0.60.1. No economy, save format, city geometry or game-rule changes.
