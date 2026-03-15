#!/usr/bin/env bash
# ============================================================
#  Build script — produces self-contained agent binaries
#  using `pkg` (https://github.com/vercel/pkg)
#
#  Output:
#    dist/log360-agent-win.exe    — Windows x64
#    dist/log360-agent-linux.bin  — Linux x64
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$SCRIPT_DIR/.."

cd "$AGENT_DIR"

echo "[+] Installing dependencies..."
npm install

echo "[+] Building Windows binary..."
npx pkg src/index.js \
    --targets node18-win-x64 \
    --output dist/log360-agent-win.exe \
    --compress GZip

echo "[+] Building Linux binary..."
npx pkg src/index.js \
    --targets node18-linux-x64 \
    --output dist/log360-agent-linux.bin \
    --compress GZip

chmod +x dist/log360-agent-linux.bin

echo ""
echo "[OK] Binaries created:"
ls -lh dist/
echo ""
echo "  Windows: dist/log360-agent-win.exe"
echo "  Linux:   dist/log360-agent-linux.bin"
echo ""
echo "Upload these to the Catalyst File Store or your build server,"
echo "then add the download URLs to the Builds configuration in Log360 Dev Suite."
