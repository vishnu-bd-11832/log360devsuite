#!/usr/bin/env bash
# ============================================================
#  Build the Debian (.deb) package for the Log360 Dev Suite Agent.
#  Requires: dpkg-deb (part of the 'dpkg' package — pre-installed on Ubuntu/Debian)
#
#  Usage:
#    bash agent/installer/linux/build-deb.sh
#
#  Pre-requisite: the Linux binary must already be built at:
#    agent/dist/log360-agent-linux.bin
#
#  Output: agent/installer/linux/log360-devsuite-agent_<version>_amd64.deb
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION="${AGENT_VERSION:-1.0.0}"
ARCH="amd64"
PKG_NAME="log360-devsuite-agent_${VERSION}_${ARCH}"
BUILD_DIR="$(mktemp -d)"

# ── Validate prerequisites ─────────────────────────────────
if ! command -v dpkg-deb >/dev/null 2>&1; then
    echo "[!] dpkg-deb not found. Install with: sudo apt-get install -y dpkg"
    exit 1
fi

LINUX_BINARY="$AGENT_DIR/dist/log360-agent-linux.bin"
if [ ! -f "$LINUX_BINARY" ]; then
    echo "[!] Linux binary not found at $LINUX_BINARY"
    echo "    Build it first:  bash agent/scripts/build.sh"
    exit 1
fi

echo "[+] Building Debian package v${VERSION} in $BUILD_DIR..."

# ── Assemble package directory ─────────────────────────────
PKG_DIR="$BUILD_DIR/$PKG_NAME"

# Copy static layout (DEBIAN control files, systemd unit, example config)
cp -r "$SCRIPT_DIR/deb/." "$PKG_DIR/"

# ── Place the agent binary ─────────────────────────────────
mkdir -p "$PKG_DIR/usr/bin"
cp "$LINUX_BINARY" "$PKG_DIR/usr/bin/log360-agent"
chmod 755 "$PKG_DIR/usr/bin/log360-agent"

# ── Stamp the correct version into control ────────────────
sed -i "s/^Version: .*/Version: $VERSION/" "$PKG_DIR/DEBIAN/control"

# ── Stamp the correct architecture ────────────────────────
sed -i "s/^Architecture: .*/Architecture: $ARCH/" "$PKG_DIR/DEBIAN/control"

# ── Compute installed size (kB) ───────────────────────────
INST_SIZE_KB=$(du -sk "$PKG_DIR" --exclude='./DEBIAN' 2>/dev/null | cut -f1 || echo "0")
sed -i "s/^Installed-Size: .*/Installed-Size: $INST_SIZE_KB/" "$PKG_DIR/DEBIAN/control"

# ── Set required permissions on maintainer scripts ────────
chmod 755 "$PKG_DIR/DEBIAN/postinst" "$PKG_DIR/DEBIAN/prerm"
chmod 644 "$PKG_DIR/DEBIAN/control" "$PKG_DIR/DEBIAN/conffiles"

# ── Build the .deb ────────────────────────────────────────
OUT_DIR="$SCRIPT_DIR"
dpkg-deb --build --root-owner-group "$PKG_DIR" "$OUT_DIR/${PKG_NAME}.deb"

# ── Verify output ─────────────────────────────────────────
OUTPUT="$OUT_DIR/${PKG_NAME}.deb"
if [ -f "$OUTPUT" ]; then
    SIZE=$(du -sh "$OUTPUT" | cut -f1)
    echo ""
    echo "[OK] Debian package created:"
    echo "     $OUTPUT ($SIZE)"
    echo ""
    echo "Install with:   sudo dpkg -i ${PKG_NAME}.deb"
    echo "Remove with:    sudo dpkg -r log360-devsuite-agent"
    echo ""
    # Show package info
    dpkg-deb --info "$OUTPUT" | grep -E "Package|Version|Architecture|Installed-Size|Description" || true
else
    echo "[!] dpkg-deb ran but output file not found: $OUTPUT"
    rm -rf "$BUILD_DIR"
    exit 1
fi

rm -rf "$BUILD_DIR"
