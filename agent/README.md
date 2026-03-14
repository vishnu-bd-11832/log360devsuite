# Log360 Dev Suite Agent

Cross-platform remote management agent for the Log360 Dev Suite developer portal.  
Runs on **Windows** (x64) and **Linux** (x64/ARM64) as a background service.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Log360 Dev Suite (Zoho Catalyst — IN DC)                │
│  ┌────────────────┐  ┌────────────────────────────────┐  │
│  │  React SPA     │  │  Cloud Function: log360-api    │  │
│  │  (Static Site) │  │  /api/* routes                 │  │
│  └────────────────┘  └──────────┬─────────────────────┘  │
└─────────────────────────────────┼──────────────────────┘
                                  │ HTTPS
         ┌────────────────────────┼───────────────────┐
         │                        │                   │
   ┌─────▼──────┐           ┌─────▼──────┐     ┌──────▼─────┐
   │ Windows VM │           │ Linux Dev  │     │ Test Server│
   │ Agent v1   │           │ Agent v1   │     │ Agent v1   │
   └────────────┘           └────────────┘     └────────────┘
```

## Features

| Capability | Description |
|------------|-------------|
| **Heartbeat** | Reports CPU, memory, and online status every 15 s |
| **Process Monitor** | Lists all running processes (`tasklist` / `ps aux`) |
| **Product Detector** | Scans for ManageEngine products by folder patterns |
| **Installer** | Executes `.exe` (InstallShield/NSIS) and `.bin` installers silently |
| **Log Reader** | Tails ManageEngine product log files and pushes chunks to Catalyst |
| **Backup Manager** | Full/DB/config backups, MSSQL conversion, WorkDrive upload |
| **Command Polling** | Polls the Catalyst API every 10 s for pending commands |

## Detected Products

- Log360
- EventLog Analyzer
- ADAudit Plus
- DataSecurity Plus
- Cloud Security Plus
- Exchange Reporter Plus
- O365 Manager Plus
- M365 Security Plus
- Endpoint DLP Plus
- Log360 UEBA

---

## Quick Start

### 1. Obtain an Agent Token

1. Open the **Log360 Dev Suite** portal
2. Go to **Machines → Add Machine**
3. Copy the generated **Agent Token**

### 2. Install on Windows

```bat
REM Run as Administrator
scripts\install-windows.bat
```

### 3. Install on Linux

```bash
sudo bash scripts/install-linux.sh
```

### 4. Manual / Docker

```bash
npm install

export LOG360_API_URL=https://your-app.catalystappsail.in/api
export LOG360_AGENT_TOKEN=<your-token>

node src/index.js
```

---

## Configuration

The agent reads configuration from (in priority order):

1. **Environment variables** (highest priority)
2. **Config file**: `%PROGRAMDATA%\Log360Agent\agent.json` (Windows) or `/etc/log360-agent/agent.json` (Linux)

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG360_API_URL` | _required_ | Catalyst API base URL |
| `LOG360_AGENT_TOKEN` | _required_ | Long-lived agent auth token |
| `LOG360_MACHINE_ID` | auto-generated UUID | Stable machine identifier |
| `LOG360_HEARTBEAT_MS` | `15000` | Heartbeat interval (ms) |
| `LOG360_POLL_MS` | `10000` | Command poll interval (ms) |
| `LOG360_PROCESS_SCAN_MS` | `30000` | Process scan interval (ms) |
| `LOG360_PRODUCT_SCAN_MS` | `120000` | Product scan interval (ms) |
| `LOG360_LOG_PUSH_MS` | `5000` | Log push interval (ms) |

---

## Building Standalone Binaries

Requires `pkg` (installed as a dev dependency):

```bash
# Build both Windows .exe and Linux .bin
bash scripts/build.sh

# Output:
#   dist/log360-agent-win.exe
#   dist/log360-agent-linux.bin
```

---

## Agent Development Plan

### Phase 1 — Core (Done ✅)
- [x] Cross-platform Node.js agent skeleton
- [x] Catalyst API client with agent token auth
- [x] Heartbeat (CPU/memory reporting)
- [x] Process monitor (tasklist/ps)
- [x] ManageEngine product detector (folder patterns)
- [x] Installer (InstallShield silent / .bin unattended)
- [x] Log reader + chunked push to Catalyst
- [x] Backup manager (full/DB/config, MSSQL conversion)
- [x] Windows service install script (.bat)
- [x] Linux systemd service install script (.sh)
- [x] Binary build script (pkg)

### Phase 2 — Hardening (Planned)
- [ ] TLS certificate pinning for Catalyst API calls
- [ ] Token rotation (agent requests a new token every 24 h)
- [ ] Delta process list (only push changes, not full list)
- [ ] Multi-instance product detection (detect multiple installed builds)
- [ ] Port liveness check (TCP connect to product port)
- [ ] Debugger attachment: `jdb -attach <port>` or `cdb.exe` wrapper
- [ ] Dev setup scripts (set env vars, configure log level, restart)

### Phase 3 — Advanced (Planned)
- [ ] Windows: `.msi` / `.msix` installer support
- [ ] Linux: `.rpm` / `.deb` package support
- [ ] Real-time log streaming (WebSocket via Catalyst Zia/Websocket service)
- [ ] Zoho WorkDrive direct upload (OAuth2 with refresh token)
- [ ] Agent auto-update (checks for new version on heartbeat)
- [ ] Sandboxed installation (isolated user account, rollback on failure)
- [ ] ARM64 binary support (`node18-linux-arm64`)
