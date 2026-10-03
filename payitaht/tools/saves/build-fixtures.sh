#!/usr/bin/env bash
# Eski sürümlerin kayıt örneklerini lib/game/fixtures/saves/ altına yazar.
# Her sürüm git arşivinden geçici bir klasöre açılır, kendi motoruyla oynanır.
# Kullanım: tools/saves/build-fixtures.sh <commit>=<sürüm> ...
set -euo pipefail
APP="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="$(git -C "$APP" rev-parse --show-toplevel)"
OUT="$APP/lib/game/fixtures/saves"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for pair in "$@"; do
  commit="${pair%%=*}"; version="${pair##*=}"
  dir="$TMP/$version"; mkdir -p "$dir"
  git -C "$REPO" archive "$commit" payitaht/lib payitaht/tsconfig.json | tar -x -C "$dir"
  mkdir -p "$dir/payitaht/tools/saves"
  cp "$APP/tools/saves/make-fixture.ts" "$dir/payitaht/tools/saves/"
  ln -s "$APP/node_modules" "$dir/payitaht/node_modules"
  (cd "$dir/payitaht" && npx tsx tools/saves/make-fixture.ts > "$OUT/$version.json")
  echo "$version: $(wc -c < "$OUT/$version.json") bayt"
done
rm -rf "$TMP"
