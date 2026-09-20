# City construction artwork — September 2026

The city uses a common surveyed layout and two matching environment states.
`city-empty-v4.webp` contains roads, vacant courtyards, a shallow earth trench
and an unbuilt sandy shore. `city-fortified-v4.webp` adds U-shaped landward
fortifications only after the first wall build completes. Sea access remains open.
Walls are selected at the fixed north gate foundation; they consume no building plot.

There are 14 land courtyards and two coastal sites. Plot 0 is the municipality.
It is fixed in the command handler and restored there when importing older saves.
The migration retains buildings, resources and progress while relocating invalid
old plot indices into their matching zones.

Trade port and shipyard use separate transparent sprites (`liman-v4.webp` and
`tersane-v4.webp`), with no baked water tiles. Their docks appear only upon
completion. Initial builds show `construction-v4.webp`; queued buildings reserve
an empty site. Upgrades keep the existing structure visible. `structure-visual.ts`
is the shared completion-state rule. The ground and building origins are calibrated
in `plots.generated.ts` and `phaser-city.ts`.

Camera navigation retains dragging, pinch and mouse wheel. The zoom button pair
has been removed. Drag/pinch tails cannot open a building by accident. Existing
research and troop artwork from the published demo is retained in the source tree.

## Art provenance

Five original assets were generated with built-in imagegen. Actual source output
is 1254×1254. WebP conversion and alpha trimming preserve genuine transparency.
The existing capital-v3 environment was the composition reference, and existing
land-building sprites were retained with adjusted scale, ground origins and shadows.

Prompts: preserve the reference roads and empty plots; remove every wall, gate,
tower, pier, ship and crane; replace perimeter fortifications with an earth trench
and maritime facilities with bare sand; remove the central fountain. Create a
matching fortified state with only top and side walls and open coastal roads.
Generate two isolated ivory/terracotta Ottoman maritime buildings with timber
docks/slipways, plus one low foundation/scaffolding sprite, using upper-left light.
No ground slabs, water tiles, backgrounds or UI in the transparent sprites.

## Verification

Engine and render-state tests cover construction completion, queued jobs, upgrades,
wall visibility, saved construction, fixed municipality and legacy plot migration.
Mobile browser review uses a 390×844 iframe with empty, completed and construction
fixtures. Physical-device pinch and native iOS/Android builds require device QA.

## v5 — buildings fitted to the painted courtyards

All eleven land-building sprites were regenerated using the v4 ground as the
camera, materials and lighting reference. They live in `buildings-v5/`; UI cards
and the scene share the same versioned asset resolver. The port, shipyard and
conditional wall backgrounds retain their v4 artwork.

The new camera is elevated and nearly frontal, with broad terracotta roofs,
ivory masonry and a narrow side facade. Transparent cutouts contain no detached
terrain slabs. Sharp trims transparent margins and converts to WebP (quality 94,
alpha quality 100) without changing the architecture. Source PNGs were generated
at 1254×1254; shipped sprites retain their natural proportions.

`plots.generated.ts` records each courtyard's inner paving polygon and safe
width/depth envelope. Stable plot indexes retain saved city layouts; the municipality
stays at (50,36). `building-sprites.ts` records the ground center and footprint
fractions of each trimmed sprite. Uniform scaling fits both dimensions and clips
the footprint envelope against every courtyard edge, including after moving.
Detached oval shadows were removed. Sprite alpha drives building taps; the same
courtyard polygon drives plot selection and the green move outline.

Verification: 68 engine/render tests, including every shipped land sprite fitted
to every valid courtyard, aspect-ratio preservation and boundary containment.
Browser checks cover building selection, moving/confirming a house into another
courtyard, and mobile city rendering. Gesture implementation remains unchanged.

## v6 — composition, not miniatures on terraces

The v5 footprint containment rule made roofs and facades too small compared with
painted trees, steps and plazas. It was geometrically bounded but artistically
incorrect. v6 removes that inscribed-rectangle sizing rule. Each site now has an
explicit silhouette width and maximum architectural height; movable buildings
fill this budget without aspect-ratio distortion. Most outer buildings are about
40–60% wider than v5. The two lots beside the civic center move outward slightly.

The permanent municipality is painted directly into both v6 ground states, with
its own forecourt, stair, landscaping and contact shadow. Its roughly 27%-wide
silhouette replaces the previous roughly 10%-wide icon. Its gameplay level,
upgrade action and selection still work; no second sprite is drawn over it.
A polygon follows the landmark silhouette for input. The municipality no longer
has a misleading flip button. Walls still depend on completed construction;
other buildings and maritime facilities remain independent buildable sprites.

Built-in imagegen produced `environments/city-empty-v6.webp` and
`environments/city-fortified-v6.webp`. Prompt 1: keep the empty map's roads,
coastline and courtyards, integrate a prominent ivory/terracotta Ottoman municipal
hall at the central plaza with physically connected steps, ground shadow and
landscaping; leave other courtyards and coast empty. Prompt 2: preserve that exact
interior composition and add only the U-shaped perimeter walls and north gate.
Source outputs were converted to WebP at quality 95 without architectural edits.

Review includes fully built and initial mobile cities, municipal selection and
upgrade availability. Tests now guard silhouette occupancy as well as proportions,
so a mathematically safe but miniature rendering is no longer accepted.
