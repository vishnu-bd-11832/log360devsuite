# Log360 Dev Suite — Zoho Catalyst Setup Guide

**Data Centre: Indian DC (IN)**
All URLs use `.zoho.in` / `.catalystappsail.in` domains.

> **Looking for the step-by-step AppSail deployment guide?**
> See the [README → Deploy to Zoho Catalyst AppSail](./README.md#deploy-to-zoho-catalyst-appsail--step-by-step).

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Zoho API Console — Create OAuth Client](#2-zoho-api-console--create-oauth-client)
3. [Catalyst Project Setup](#3-catalyst-project-setup)
4. [DataStore Tables](#4-datastore-tables)
5. [Cloud Function — log360-api](#5-cloud-function--log360-api)
6. [Static Hosting — React Frontend](#6-static-hosting--react-frontend)
7. [Environment Variables](#7-environment-variables)
8. [Deploy](#8-deploy)
9. [Troubleshooting](#9-troubleshooting)
10. [API Reference](#10-api-reference)

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18.x | https://nodejs.org |
| Catalyst CLI | latest | `npm install -g @zohocrm/catalyst-cli` |
| Git | any | https://git-scm.com |

---

## 2. Zoho API Console — Create OAuth Client

1. Go to **https://api-console.zoho.in** (Indian DC)
2. Click **Add Client → Non-based Applications** (implicit grant, suitable for SPA)
3. Fill in:
   | Field | Value |
   |-------|-------|
   | Client Name | Log360 Dev Suite |
   | Homepage URL | `https://<project-id>-<env-id>.catalystappsail.in` |
   | Authorized Redirect URIs | `https://<project-id>-<env-id>.catalystappsail.in/authentication/callback` |
4. Click **Create** — note the **Client ID** (you will not receive a secret for implicit grant)
5. Required OAuth scope: `AaaServer.profile.Read`

> **Local development**: Also add `http://localhost:3000/authentication/callback` to the authorized redirect URIs.

---

## 3. Catalyst Project Setup

```bash
# Install Catalyst CLI
npm install -g @zohocrm/catalyst-cli

# Authenticate with Indian DC
catalyst login --dc IN

# Clone and enter the repo
git clone https://github.com/vishnu-bd-11832/log360devsuite.git
cd log360devsuite

# Initialize Catalyst project (link to existing Catalyst project)
catalyst init
# Select: Indian DC, existing project → "log360devsuite"

# Install frontend dependencies
npm install

# Install API function dependencies
cd functions/log360-api && npm install && cd ../..
```

---

## 4. DataStore Tables

Create the following tables in **Catalyst DataStore** (Console → DataStore):

### 4.1 `Agents`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | Primary key |
| `machine_id` | TEXT | UUID, unique per machine |
| `hostname` | TEXT | Machine hostname |
| `os` | TEXT | `Windows` / `Linux` |
| `platform` | TEXT | `x64` / `arm64` |
| `agent_version` | TEXT | e.g. `1.4.2` |
| `status` | TEXT | `Online` / `Offline` |
| `ip_address` | TEXT | |
| `last_seen` | TEXT | ISO timestamp |
| `token_hash` | TEXT | SHA-256 of agent token |
| `owner_email` | TEXT | Zoho email of owner |
| `team_id` | TEXT | Team ID (nullable) |
| `capabilities` | TEXT | JSON array |

### 4.2 `Machines`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | |
| `machine_id` | TEXT | UUID |
| `name` | TEXT | Display name |
| `type` | TEXT | `user` / `team` |
| `os` | TEXT | |
| `owner_email` | TEXT | |
| `team_id` | TEXT | |
| `ip_address` | TEXT | |
| `agent_version` | TEXT | |
| `status` | TEXT | |
| `created_at` | TEXT | ISO timestamp |

### 4.3 `Products`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | |
| `machine_id` | TEXT | FK → Agents.machine_id |
| `product_name` | TEXT | e.g. `EventLog Analyzer` |
| `product_key` | TEXT | e.g. `EventLogAnalyzer` |
| `install_path` | TEXT | |
| `status` | TEXT | `Running` / `Stopped` / `Not Installed` |
| `port` | TEXT | |
| `version` | TEXT | |
| `detected_at` | TEXT | ISO timestamp |

### 4.4 `Installations`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | |
| `install_id` | TEXT | UUID |
| `machine_id` | TEXT | |
| `product_name` | TEXT | |
| `build_number` | TEXT | |
| `file_url` | TEXT | Download URL |
| `file_type` | TEXT | `exe` / `bin` / `ppm` |
| `status` | TEXT | `pending` / `running` / `complete` / `failed` |
| `log_output` | TEXT | Tail of install log |
| `started_at` | TEXT | ISO timestamp |
| `completed_at` | TEXT | ISO timestamp |

### 4.5 `Builds`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | |
| `build_id` | TEXT | UUID |
| `product_name` | TEXT | |
| `build_number` | TEXT | |
| `download_url` | TEXT | |
| `file_type` | TEXT | `exe` / `bin` / `ppm` |
| `platform` | TEXT | `windows` / `linux` / `all` |
| `connector_id` | TEXT | FK → Connectors |
| `iss_path` | TEXT | InstallShield response file path |
| `is_active` | TEXT | `true` / `false` |
| `created_at` | TEXT | ISO timestamp |

### 4.6 `Connectors`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | |
| `connector_id` | TEXT | UUID |
| `name` | TEXT | e.g. `Nexus`, `HTTP Server` |
| `type` | TEXT | `nexus` / `http` / `s3` |
| `base_url` | TEXT | |
| `auth_header` | TEXT | Encrypted credential |
| `is_active` | TEXT | |
| `created_at` | TEXT | |

### 4.7 `Backups`
| Column | Type | Notes |
|--------|------|-------|
| `ROWID` | auto | |
| `backup_id` | TEXT | UUID |
| `machine_id` | TEXT | |
| `product_name` | TEXT | |
| `type` | TEXT | `full` / `db` / `config` |
| `size_mb` | TEXT | |
| `local_path` | TEXT | |
| `workdrive_url` | TEXT | Zoho WorkDrive file URL |
| `status` | TEXT | `pending` / `complete` / `failed` |
| `created_at` | TEXT | |

---

## 5. Cloud Function — log360-api

The `functions/log360-api/` directory contains an Express-based Advanced IO function.

**Create the function in Catalyst Console:**
1. Go to **Functions → Add Function**
2. Name: `log360-api`
3. Type: **Advanced IO**
4. Runtime: **Node.js 18**
5. Memory: **512 MB**, Timeout: **60 s**

**Add URL pattern in Catalyst Console → Functions → URL Patterns:**
```
/api/*   →   log360-api
```

---

## 6. Static Hosting — React Frontend

1. Go to **Hosting → Static Sites → Add Static Site**
2. Name: `log360devsuite-web`
3. Build Command: `npm run build`
4. Publish Directory: `build`
5. The included `public/_redirects` handles SPA fallback routing automatically.

---

## 7. Environment Variables

Set the following in **Catalyst Console → Hosting → log360devsuite-web → Environment Variables** and also in **Functions → log360-api → Environment Variables**:

| Variable | Where | Description |
|----------|-------|-------------|
| `REACT_APP_ZOHO_CLIENT_ID` | Frontend | OAuth Client ID from api-console.zoho.in |
| `REACT_APP_ZOHO_REDIRECT_URI` | Frontend | `https://<site>.catalystappsail.in/authentication/callback` |
| `REACT_APP_ALLOWED_EMAILS` | Frontend | Comma-separated wsm-info roster |
| `REACT_APP_CATALYST_API_URL` | Frontend | `https://<site>.catalystappsail.in/api` |
| `ZOHO_CLIENT_ID` | Function | Same OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Function | OAuth client secret (server-based client) |
| `ZOHO_DC` | Function | `IN` |
| `AGENT_TOKEN_SECRET` | Function | Random 256-bit secret for agent token signing |

---

## 8. Deploy

```bash
# Build the React frontend
npm run build

# Deploy everything (frontend + function) to Catalyst IN DC
catalyst deploy

# Or deploy only the frontend
catalyst deploy --app log360devsuite-web

# Or deploy only the function
catalyst deploy --function log360-api
```

After deployment the app will be available at:
```
https://<project-id>-<env-id>.catalystappsail.in
```

---

## 9. Troubleshooting

### Catalyst CLI not found

```bash
npm install -g zcatalyst-cli
catalyst --version
```

### `catalyst deploy` fails with "project not initialized"

Run `catalyst init` from the repo root and select your existing Catalyst project
in the Indian DC.

### OAuth redirect mismatch

Make sure the **Authorized Redirect URIs** in
[api-console.zoho.in](https://api-console.zoho.in) exactly match the URL your
app is served from, including the protocol (`https://`) and path
(`/authentication/callback`).

### Cloud function returns 502 / timeout

- Check that `functions/log360-api/node_modules` is present (run `npm install`
  inside `functions/log360-api/`).
- Increase the function timeout in the Catalyst Console if your DataStore
  queries are slow.

### Frontend shows a blank page after deploy

- Confirm that `public/_redirects` exists with the SPA fallback rule.
- Verify the `REACT_APP_CATALYST_API_URL` environment variable points to the
  correct AppSail URL.

---

## 10. API Reference

All routes are prefixed with `/api` and served by the `log360-api` Catalyst function.

### Authentication

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/verify` | Verify a Zoho access token and return a Catalyst session token | No |
| POST | `/api/auth/agent-token` | Issue a long-lived agent token for a machine | Bearer (user) |

### Agents

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/agents/register` | Agent self-registration (first boot) | Agent token |
| POST | `/api/agents/:machineId/heartbeat` | Update agent status, CPU, memory | Agent token |
| GET | `/api/agents` | List all agents visible to the user | Bearer (user) |
| GET | `/api/agents/:machineId` | Get agent detail | Bearer (user) |
| DELETE | `/api/agents/:machineId` | Remove an agent | Bearer (user) |

### Machines

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/machines` | List machines accessible to the user | Bearer (user) |
| POST | `/api/machines` | Register a new machine | Bearer (user) |
| GET | `/api/machines/:machineId` | Get machine detail | Bearer (user) |
| PATCH | `/api/machines/:machineId` | Update machine (type, team, owner) | Bearer (user) |
| DELETE | `/api/machines/:machineId` | Remove a machine | Bearer (user) |

### Processes

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/machines/:machineId/processes` | List running processes on the machine | Bearer (user) |
| POST | `/api/machines/:machineId/processes/refresh` | Ask agent to re-scan processes | Bearer (user) |

### Products

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/machines/:machineId/products` | List detected ME products on a machine | Bearer (user) |
| POST | `/api/machines/:machineId/products/scan` | Trigger product scan on machine | Bearer (user) |
| POST | `/api/machines/:machineId/products/:productKey/start` | Start a product service | Bearer (user) |
| POST | `/api/machines/:machineId/products/:productKey/stop` | Stop a product service | Bearer (user) |

### Logs

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/machines/:machineId/logs` | Stream latest log lines from a product | Bearer (user) |
| GET | `/api/machines/:machineId/logs/download` | Download full log file | Bearer (user) |

### Installations

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/installations` | List all installation tasks | Bearer (user) |
| POST | `/api/installations` | Create a new installation task | Bearer (user) |
| GET | `/api/installations/:installId` | Get installation detail + log | Bearer (user) |
| DELETE | `/api/installations/:installId` | Cancel a pending installation | Bearer (user) |
| GET | `/api/machines/:machineId/commands/pending` | Agent polls for pending commands | Agent token |
| POST | `/api/machines/:machineId/commands/:cmdId/result` | Agent reports command result | Agent token |

### Builds

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/builds` | List all build configurations | Bearer (user) |
| POST | `/api/builds` | Add a build configuration | Bearer (user) |
| PUT | `/api/builds/:buildId` | Update a build configuration | Bearer (user) |
| DELETE | `/api/builds/:buildId` | Remove a build configuration | Bearer (user) |
| POST | `/api/builds/import` | Bulk import builds from JSON | Bearer (user) |
| GET | `/api/builds/export` | Export all builds as JSON | Bearer (user) |

### Connectors

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/connectors` | List connectors | Bearer (user) |
| POST | `/api/connectors` | Add a connector | Bearer (user) |
| PUT | `/api/connectors/:connectorId` | Update a connector | Bearer (user) |
| DELETE | `/api/connectors/:connectorId` | Remove a connector | Bearer (user) |
| POST | `/api/connectors/:connectorId/test` | Test connectivity | Bearer (user) |

### Backups

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/backups` | List backups | Bearer (user) |
| POST | `/api/backups` | Trigger a backup | Bearer (user) |
| GET | `/api/backups/:backupId` | Get backup detail | Bearer (user) |
| POST | `/api/backups/:backupId/upload-workdrive` | Upload backup to Zoho WorkDrive | Bearer (user) |
| POST | `/api/backups/:backupId/convert-mssql` | Trigger DB → MSSQL conversion | Bearer (user) |

### Teams

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/teams` | List teams (with hierarchy) | Bearer (user) |
| POST | `/api/teams` | Create a team | Bearer (user) |
| GET | `/api/teams/:teamId` | Get team detail + members + machines | Bearer (user) |
| PATCH | `/api/teams/:teamId` | Update team (name, parent) | Bearer (user) |
| DELETE | `/api/teams/:teamId` | Delete a team | Bearer (user) |
| POST | `/api/teams/:teamId/members` | Add a member | Bearer (user) |
| DELETE | `/api/teams/:teamId/members/:email` | Remove a member | Bearer (user) |
