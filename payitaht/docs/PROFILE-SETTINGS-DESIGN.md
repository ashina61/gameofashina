# Approved portrait UI · 5 October 2026

Reference of record: `mockups/approved-profile.webp` and `mockups/approved-settings.webp`. These are the two designs Adem approved. Do not substitute the removed sidebar/resource-rail desktop concept, the portrait avatar checkpoint, invented volume/quality/shadow settings, or the old compact theme.

Use full-width warm textured parchment, dark walnut title bar and four flush tabs, engraved brass edges, red active states, large painted object illustrations and five fixed illustrated navigation destinations. Serif type, generous readable content width. Scroll content on smaller screens; keep back/close and navigation reachable. Honor safe areas and reduced motion. Subsequent screens need a proposal and user review before implementation.

Profile: vertical customizable silk standard in a coastal loggia, real ruler/title/motto, three summary cells, prominent identity edit action, Saltanat/Şehirler/Nişanlar/Sancak. Reign has title progress, illustrated four-score ledger and the three featured medals. Unearned medals are visibly locked. Preserve city routes, all rankings and records, all achievements and the explicit save/cancel editor.

Settings: illustrated desk, Tercihler/Cihaz/Kayıt/Bilgi. Preferences use real immediate-save music/effects/ambient/haptics switches, night/day, reduced motion, light-mode tri-state and expandable AI pace. No fake slider, fake account or unsupported graphics controls. Keep device notifications, installation status, valid file backup/restore, destructive reset confirmation and diagnostic tools in their respective tabs.

Asset provenance: painted icons, medals, navigation objects and desk are cropped from the approved mockups. Loggia background and neutral embroidered standard were derived with the built-in image generator; extraction and alpha feathering use Sharp. Prompt sequence: extract the loggia without UI/writing; remove foreground standard and pole while preserving scene; extract neutral gray embroidered standard and pole without a central emblem. Actual standard color/crest/outline are game data, never baked identity. The assets live at `public/images/game/ui/approved-court/`.

Scope: Profile and Settings only. Game engine, save format, other page appearance and production/speed rules remain independent of this presentation change.

## Approved continuation · 5 October 2026 · 0.55.0
The user explicitly requested applying this language to all Profile and Settings sub-tabs. Cities is an illustrated estate register with all eight ranks and fourteen record fields. Medals is a tiered painted display with actual earned filters and progress. Standard editing uses the same live embroidered cloth for shape/color options and brass crest coins; save/cancel remains explicit. Device, Save and Information use painted subsection headings, parchment inscriptions, illustrated status cells, full-width brass action buttons and a separate reset confirmation. Shared primitives live in royal-kit.tsx; styles in 25-royal-subtabs.css. Preserve the approved main pages and the fixed navigation. Review this completed section with the user before redesigning another page.
