<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Payitaht Adaları — ajanlar için

- Görsel yenileme işi: `docs/gorsel-brifi.md` (fazlar, sanat kılavuzu, kontroller). Oradaki sırayla ilerle; G0, G2, G4 ve G6'dan sonra onay bekle.
- Görsel brif 2 (mockup moduna geçiş): `docs/gorsel-brifi-2.md` — H1, H2, H3; H3'ten sonra onay bekle. Hedef mockup'lar `docs/mockups/`.
- Genel plan ve durum: `docs/v2-plani.md`.
- Commit öncesi kontroller: `pnpm check` + `node tools/layout-qa.cjs` (yerel sunucu gerekir) + `node tools/v2-criteria.cjs`.
- Oyun kuralı, ekonomi, kayıt biçimi ve slot koordinatları izinsiz değişmez.
