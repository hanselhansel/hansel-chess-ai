#!/usr/bin/env bash
# Official Stockfish 18 generic x86-64. Ruler only. Not committed (108MB).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/train/bin/stockfish"
mkdir -p "$ROOT/train/bin"
if [[ -x "$DEST" ]]; then
  echo "already have $DEST"
  exit 0
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL -o "$TMP/sf.tar" \
  "https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64.tar"
tar --no-same-owner -xf "$TMP/sf.tar" -C "$TMP"
cp "$TMP/stockfish/stockfish-ubuntu-x86-64" "$DEST"
chmod +x "$DEST"
echo "wrote $DEST"
