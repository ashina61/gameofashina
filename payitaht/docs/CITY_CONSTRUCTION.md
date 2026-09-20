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
