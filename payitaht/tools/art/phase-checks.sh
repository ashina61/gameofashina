#!/usr/bin/env bash
set -euo pipefail
review_root="${1:?phase review directory required}"
mkdir -p "$review_root/checks"
pnpm exec tsc --noEmit > "$review_root/checks/typecheck.txt" 2>&1
node --import tsx --test $(find lib -name '*.test.ts') > "$review_root/checks/tests.txt" 2>&1
pnpm lint > "$review_root/checks/lint.txt" 2>&1
node tools/css-lint.cjs > "$review_root/checks/css.txt"
node tools/unused-css.cjs --strict >> "$review_root/checks/css.txt"
node tools/unused-assets.cjs --strict > "$review_root/checks/assets.txt"
python3 tools/art/half-size.py --check > "$review_root/checks/half-size.txt"
node tools/art/phone-assets.cjs > "$review_root/checks/phone-assets.json"
node tools/v2-criteria.cjs > "$review_root/checks/criteria.txt"
STATIC_EXPORT=1 NEXT_BASE_PATH=/gameofashina NEXT_PUBLIC_ASSET_BASE=/gameofashina pnpm build > "$review_root/checks/build.txt" 2>&1
printf 'Source and export checks passed: %s\n' "$review_root"
