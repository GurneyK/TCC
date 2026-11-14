#!/usr/bin/env bash
# Copy Design System entries into this app without overwriting anything already here.
# Usage: ./scripts/ds-add.sh [--globals] <catalog-id> [<catalog-id> ...]
#   --globals also brings tailwind.config.ts and src/index.css (only if they don't exist yet)
# Find IDs: node ../Design-library/scripts/copy-component.mjs --search <term>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DS_DIR="${DS_DIR:-$ROOT/../Design-library}"
STAGING="$ROOT/.ds-staging"

if [ ! -f "$DS_DIR/scripts/copy-component.mjs" ]; then
  echo "Design System not found at $DS_DIR"
  echo "Clone it next to this repo: git clone https://github.com/GurneyK/Design-library.git ../Design-library"
  exit 1
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: ./scripts/ds-add.sh <catalog-id> [<catalog-id> ...]"
  exit 1
fi

GLOBALS=""
if [ "$1" = "--globals" ]; then GLOBALS="--globals"; shift; fi

rm -rf "$STAGING"
for id in "$@"; do
  (cd "$DS_DIR" && node scripts/copy-component.mjs "$id" $GLOBALS \
    --handoff-file developer-handoff.json --source-root . --out "$STAGING" >/dev/null)
  echo "staged: $id"
done

# Move staged files in. Existing files are never overwritten, so promoted components stay safe.
cd "$STAGING"
find . -type f | sed 's|^\./||' | while read -r f; do
  if [ -e "$ROOT/$f" ]; then
    echo "  kept existing: $f"
  else
    mkdir -p "$ROOT/$(dirname "$f")"
    cp "$f" "$ROOT/$f"
    echo "  added: $f"
  fi
done
cd "$ROOT"
rm -rf "$STAGING"
