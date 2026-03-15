#!/usr/bin/env bash
# ============================================================
#  Build the Windows NSIS installer on Linux or macOS.
#  Requires: nsis >= 3.09 (apt install nsis / brew install nsis)
#
#  Usage:
#    bash agent/installer/windows/build-nsis.sh [--version 1.0.0]
#
#  Pre-requisite: the Windows binary must already be built:
#    bash agent/scripts/build.sh --platform win
#
#  Output: agent/installer/windows/Log360AgentSetup-<version>-win-x64.exe
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION="${AGENT_VERSION:-1.0.0}"

# ── Validate prerequisites ─────────────────────────────────
if ! command -v makensis >/dev/null 2>&1; then
    echo "[!] makensis not found."
    echo "    Install with:  sudo apt-get install -y nsis    (Ubuntu/Debian)"
    echo "                   brew install nsis               (macOS)"
    exit 1
fi

WIN_BINARY="$AGENT_DIR/dist/log360-agent-win.exe"
if [ ! -f "$WIN_BINARY" ]; then
    echo "[!] Windows binary not found at $WIN_BINARY"
    echo "    Build it first:  bash agent/scripts/build.sh --platform win"
    exit 1
fi

# ── Update version in .nsi if needed ─────────────────────────
NSI_SCRIPT="$SCRIPT_DIR/log360-agent.nsi"
TMP_NSI="$SCRIPT_DIR/log360-agent-build.nsi"
sed "s/!define PRODUCT_VERSION.*$/!define PRODUCT_VERSION     \"$VERSION\"/" \
    "$NSI_SCRIPT" > "$TMP_NSI"

# ── Create placeholder assets if missing ─────────────────────
ASSETS_DIR="$AGENT_DIR/assets"
mkdir -p "$ASSETS_DIR"

for ASSET in installer-icon.ico installer-header.bmp installer-welcome.bmp; do
    if [ ! -f "$ASSETS_DIR/$ASSET" ]; then
        echo "[~] Placeholder asset: $ASSETS_DIR/$ASSET (skipping artwork)"
    fi
done

# ── Create placeholder LICENSE if missing ────────────────────
if [ ! -f "$AGENT_DIR/LICENSE" ]; then
    echo "Log360 Dev Suite Agent — Proprietary Software" > "$AGENT_DIR/LICENSE"
    echo "Copyright $(date +%Y) ManageEngine / Zoho Corporation" >> "$AGENT_DIR/LICENSE"
fi

# ── Run makensis ─────────────────────────────────────────────
echo "[+] Building Windows installer v$VERSION..."
cd "$SCRIPT_DIR"
makensis \
    -DAGENT_VERSION="$VERSION" \
    -DOUT_DIR="$SCRIPT_DIR" \
    "$TMP_NSI"
rm -f "$TMP_NSI"

OUTPUT="$SCRIPT_DIR/Log360AgentSetup-${VERSION}-win-x64.exe"
if [ -f "$OUTPUT" ]; then
    SIZE=$(du -sh "$OUTPUT" | cut -f1)
    echo ""
    echo "[OK] Windows installer created:"
    echo "     $OUTPUT ($SIZE)"
else
    echo "[!] makensis ran but output file not found: $OUTPUT"
    exit 1
fi
