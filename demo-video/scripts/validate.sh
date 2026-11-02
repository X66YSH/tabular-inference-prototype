#!/bin/sh
# Compile the timeline/state modules to CommonJS in a temp dir and run the checks.
set -e
cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
npx tsc --noEmit false --module commonjs --moduleResolution node --outDir "$OUT" \
  --jsx react-jsx --target ES2020 --skipLibCheck --esModuleInterop \
  src/state.ts src/timeline.ts src/layout.ts src/lib/anim.ts src/data/dataset.ts
NODE_PATH="$PWD/node_modules" node scripts/validate.cjs "$OUT"
rm -rf "$OUT"
