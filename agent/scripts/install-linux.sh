#!/usr/bin/env bash
# ============================================================
#  Log360 Dev Suite Agent — Linux Installer
#  Run as root (sudo ./install-linux.sh)
# ============================================================

set -e

INSTALL_DIR="/opt/log360-agent"
CONFIG_DIR="/etc/log360-agent"
SERVICE_FILE="/etc/systemd/system/log360-agent.service"
LOG_FILE="/var/log/log360-agent.log"

echo "[+] Installing Log360 Dev Suite Agent..."

# ── Detect package manager ─────────────────────────────────
check_node() {
    if command -v node >/dev/null 2>&1; then
        echo "[~] Node.js found: $(node --version)"
    else
        echo "[!] Node.js not found. Installing via nvm..."
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        # shellcheck source=/dev/null
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        nvm install 18
        nvm use 18
    fi
}

check_node

# ── Create directories ─────────────────────────────────────
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR"

# ── Copy agent files ───────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r "$SCRIPT_DIR/.." "$INSTALL_DIR"

# Install Node.js dependencies
cd "$INSTALL_DIR"
npm install --production 2>/dev/null || true

# ── Prompt for configuration ───────────────────────────────
read -rp "Enter Catalyst API URL (e.g. https://your-app.catalystappsail.in/api): " API_URL
read -rp "Enter Agent Token (from Log360 Dev Suite portal): " AGENT_TOKEN

cat > "$CONFIG_DIR/agent.json" <<EOF
{
  "apiUrl": "$API_URL",
  "agentToken": "$AGENT_TOKEN"
}
EOF

echo "[+] Config written to $CONFIG_DIR/agent.json"

# ── Determine agent command ────────────────────────────────
if [ -f "$INSTALL_DIR/dist/log360-agent-linux.bin" ]; then
    chmod +x "$INSTALL_DIR/dist/log360-agent-linux.bin"
    EXEC_CMD="$INSTALL_DIR/dist/log360-agent-linux.bin"
else
    EXEC_CMD="$(command -v node) $INSTALL_DIR/src/index.js"
fi

# ── Create systemd service ────────────────────────────────
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Log360 Dev Suite Agent
Documentation=https://github.com/vishnu-bd-11832/log360devsuite
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$EXEC_CMD
Restart=on-failure
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE
Environment=LOG360_API_URL=$API_URL
Environment=LOG360_AGENT_TOKEN=$AGENT_TOKEN
SyslogIdentifier=log360-agent
User=root

[Install]
WantedBy=multi-user.target
EOF

# ── Enable and start service ───────────────────────────────
if command -v systemctl >/dev/null 2>&1; then
    systemctl daemon-reload
    systemctl enable log360-agent
    systemctl start log360-agent
    echo ""
    echo "[OK] Log360 Dev Suite Agent installed and started."
    echo "     Status:      systemctl status log360-agent"
    echo "     Logs:        journalctl -u log360-agent -f"
    echo "     Config file: $CONFIG_DIR/agent.json"
else
    echo "[~] systemd not available. Start the agent manually:"
    echo "    LOG360_API_URL=$API_URL LOG360_AGENT_TOKEN=$AGENT_TOKEN $EXEC_CMD"
fi
