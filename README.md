# Log360 Dev Suite

A full-stack remote machine management and software deployment platform built on
**Zoho Catalyst** (Indian DC). It comprises a **React 18** single-page
application, a **Node.js 18 Express** cloud function, and a cross-platform
**agent** that runs on Windows and Linux.

| Component | Stack | Location |
|-----------|-------|----------|
| Frontend | React 18 + Material Dashboard 2 | `src/` |
| API | Express 4 + Catalyst SDK | `functions/log360-api/` |
| Agent | Node.js 18 (compiled to binary) | `agent/` |
| Database | Catalyst DataStore (7 tables) | Managed by Catalyst |

---

## Deploy to Zoho Catalyst AppSail — Step-by-Step

Follow the steps below to deploy Log360 Dev Suite to Zoho Catalyst AppSail from
scratch. Every step assumes the **Indian DC (`IN`)** data centre.

### Step 1 — Install Prerequisites

| Tool | Version | Install command / link |
|------|---------|-----------------------|
| Node.js | 18.x or later | <https://nodejs.org> |
| Catalyst CLI | latest | `npm install -g zcatalyst-cli` |
| Git | any | <https://git-scm.com> |

Verify each tool is available:

```bash
node -v          # v18.x+
catalyst --version
git --version
```

### Step 2 — Sign In to Zoho Catalyst (Indian DC)

```bash
catalyst login --dc IN
```

A browser window will open. Log in with your **Zoho** account and grant access.

### Step 3 — Create a Zoho OAuth Client

1. Open **<https://api-console.zoho.in>** (Indian DC).
2. Click **Add Client → Non-based Applications** (implicit grant — suitable for
   single-page applications).
3. Fill in the form:

   | Field | Value |
   |-------|-------|
   | Client Name | `Log360 Dev Suite` |
   | Homepage URL | `https://<project-id>-<env-id>.catalystappsail.in` |
   | Authorized Redirect URIs | `https://<project-id>-<env-id>.catalystappsail.in/authentication/callback` |

   > **Tip:** You will get the exact `<project-id>-<env-id>` URL after your
   > first deployment in Step 8. You can update these URIs later.

4. Click **Create** and note the **Client ID**.
5. Required OAuth scope: `AaaServer.profile.Read`.

> **Local development:** Also add
> `http://localhost:3000/authentication/callback` to the redirect URIs.

### Step 4 — Clone the Repository and Install Dependencies

```bash
# Clone
git clone https://github.com/vishnu-bd-11832/log360devsuite.git
cd log360devsuite

# Install frontend dependencies
npm install

# Install API function dependencies
cd functions/log360-api
npm install
cd ../..
```

### Step 5 — Initialise the Catalyst Project

```bash
catalyst init
```

When prompted, select:

1. **Data Centre** → `IN` (Indian)
2. **Project** → choose your existing Catalyst project or create a new one named
   `log360devsuite`.

This links your local directory to the remote Catalyst project and generates a
`.catalyst` folder.

### Step 6 — Create DataStore Tables

Open the **Catalyst Console → DataStore** and create the following seven tables
with the columns listed below. All columns are of type **TEXT** unless noted.

<details>
<summary><strong>6.1 Agents</strong></summary>

| Column | Notes |
|--------|-------|
| `machine_id` | UUID, unique per machine |
| `hostname` | Machine hostname |
| `os` | `Windows` / `Linux` |
| `platform` | `x64` / `arm64` |
| `agent_version` | e.g. `1.4.2` |
| `status` | `Online` / `Offline` |
| `ip_address` | |
| `last_seen` | ISO timestamp |
| `token_hash` | SHA-256 of agent token |
| `owner_email` | Zoho email of owner |
| `team_id` | Nullable |
| `capabilities` | JSON array |
</details>

<details>
<summary><strong>6.2 Machines</strong></summary>

| Column | Notes |
|--------|-------|
| `machine_id` | UUID |
| `name` | Display name |
| `type` | `user` / `team` |
| `os` | |
| `owner_email` | |
| `team_id` | |
| `ip_address` | |
| `agent_version` | |
| `status` | |
| `created_at` | ISO timestamp |
</details>

<details>
<summary><strong>6.3 Products</strong></summary>

| Column | Notes |
|--------|-------|
| `machine_id` | FK → Agents |
| `product_name` | e.g. `EventLog Analyzer` |
| `product_key` | e.g. `EventLogAnalyzer` |
| `install_path` | |
| `status` | `Running` / `Stopped` / `Not Installed` |
| `port` | |
| `version` | |
| `detected_at` | ISO timestamp |
</details>

<details>
<summary><strong>6.4 Installations</strong></summary>

| Column | Notes |
|--------|-------|
| `install_id` | UUID |
| `machine_id` | |
| `product_name` | |
| `build_number` | |
| `file_url` | Download URL |
| `file_type` | `exe` / `bin` / `ppm` |
| `status` | `pending` / `running` / `complete` / `failed` |
| `log_output` | Tail of install log |
| `started_at` | ISO timestamp |
| `completed_at` | ISO timestamp |
</details>

<details>
<summary><strong>6.5 Builds</strong></summary>

| Column | Notes |
|--------|-------|
| `build_id` | UUID |
| `product_name` | |
| `build_number` | |
| `download_url` | |
| `file_type` | `exe` / `bin` / `ppm` |
| `platform` | `windows` / `linux` / `all` |
| `connector_id` | FK → Connectors |
| `iss_path` | InstallShield response file |
| `is_active` | `true` / `false` |
| `created_at` | ISO timestamp |
</details>

<details>
<summary><strong>6.6 Connectors</strong></summary>

| Column | Notes |
|--------|-------|
| `connector_id` | UUID |
| `name` | e.g. `Nexus` |
| `type` | `nexus` / `http` / `s3` |
| `base_url` | |
| `auth_header` | Encrypted credential |
| `is_active` | |
| `created_at` | |
</details>

<details>
<summary><strong>6.7 Backups</strong></summary>

| Column | Notes |
|--------|-------|
| `backup_id` | UUID |
| `machine_id` | |
| `product_name` | |
| `type` | `full` / `db` / `config` |
| `size_mb` | |
| `local_path` | |
| `workdrive_url` | Zoho WorkDrive file URL |
| `status` | `pending` / `complete` / `failed` |
| `created_at` | |
</details>

### Step 7 — Configure Environment Variables

#### 7a. Frontend Environment Variables

Create a `.env` file at the project root (use `.env.example` as a template):

```bash
cp .env.example .env
```

Fill in the values:

```dotenv
REACT_APP_ZOHO_CLIENT_ID=<your_zoho_client_id>
REACT_APP_ZOHO_REDIRECT_URI=https://<project-id>-<env-id>.catalystappsail.in/authentication/callback
REACT_APP_ALLOWED_EMAILS=user1@zohocorp.com,user2@zohocorp.com
REACT_APP_CATALYST_API_URL=https://<project-id>-<env-id>.catalystappsail.in/api
```

> Replace `<project-id>-<env-id>` with your actual Catalyst subdomain.

#### 7b. Cloud Function Environment Variables

Set these in the **Catalyst Console → Functions → log360-api → Environment
Variables** (or via `catalyst.config.json`):

| Variable | Value |
|----------|-------|
| `ZOHO_CLIENT_ID` | Your Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Your Zoho OAuth client secret (create a **Server-based** client for this) |
| `ZOHO_DC` | `IN` |
| `AGENT_TOKEN_SECRET` | A random 256-bit hex string for signing agent tokens |

You can generate a token secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 8 — Set Up the Cloud Function

1. In the **Catalyst Console**, go to **Functions → Add Function**.
2. Configure:
   - **Name:** `log360-api`
   - **Type:** Advanced IO
   - **Runtime:** Node.js 18
   - **Memory:** 512 MB
   - **Timeout:** 60 seconds
3. Under **Functions → URL Patterns**, add a pattern so that all `/api/*`
   requests are routed to this function:

   ```
   /api/*  →  log360-api
   ```

### Step 9 — Set Up Static Hosting

1. In the **Catalyst Console**, go to **Hosting → Static Sites → Add Static
   Site**.
2. Configure:
   - **Name:** `log360devsuite-web`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `build`
3. The included `public/_redirects` file handles SPA fallback routing
   automatically.

### Step 10 — Build and Deploy

```bash
# Build the React frontend
npm run build

# Deploy everything (frontend + cloud function) to Catalyst
catalyst deploy
```

You can also deploy components individually:

```bash
# Deploy only the frontend
catalyst deploy --only hosting

# Deploy only the cloud function
catalyst deploy --only functions
```

After a successful deployment the CLI will print your live URL:

```
https://<project-id>-<env-id>.catalystappsail.in
```

### Step 11 — Update OAuth Redirect URIs

Now that you have the live URL, go back to **<https://api-console.zoho.in>** and
make sure both fields match:

| Field | Value |
|-------|-------|
| Homepage URL | `https://<project-id>-<env-id>.catalystappsail.in` |
| Authorized Redirect URIs | `https://<project-id>-<env-id>.catalystappsail.in/authentication/callback` |

### Step 12 — Verify the Deployment

1. Open `https://<project-id>-<env-id>.catalystappsail.in` in a browser.
2. You should see the Log360 Dev Suite login page.
3. Click **Sign in with Zoho** — you will be redirected to Zoho OAuth.
4. After successful authentication you are taken to the dashboard.
5. Check the API health endpoint:

   ```bash
   curl https://<project-id>-<env-id>.catalystappsail.in/api/health
   # {"status":"ok","service":"log360-api","dc":"IN","ts":"..."}
   ```

---

## Local Development

```bash
# Start React dev server (http://localhost:3000)
npm start

# In a separate terminal, start the Catalyst local dev server
catalyst serve
```

Make sure your `.env` points to `http://localhost:3000/authentication/callback`
and `http://localhost:3001/api` for local development.

---

## Project Structure

```
log360devsuite/
├── src/                        # React 18 SPA (Material Dashboard 2)
├── public/                     # Static assets & SPA redirects
├── functions/log360-api/       # Express cloud function
│   ├── index.js                # Entry point
│   ├── routes/                 # API route modules
│   └── middleware/             # Auth middleware
├── agent/                      # Cross-platform agent (Windows/Linux)
├── catalyst.config.json        # Catalyst project configuration
├── .env.example                # Environment variable template
├── CATALYST_SETUP.md           # Detailed setup reference
└── package.json                # Frontend dependencies & scripts
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install frontend dependencies |
| `npm start` | Start local React dev server |
| `npm run build` | Build production frontend |
| `catalyst login --dc IN` | Authenticate with Zoho Catalyst (Indian DC) |
| `catalyst init` | Link project to Catalyst |
| `catalyst serve` | Start Catalyst local dev server |
| `catalyst deploy` | Deploy everything to Catalyst AppSail |
| `catalyst deploy --only hosting` | Deploy only the static site |
| `catalyst deploy --only functions` | Deploy only the cloud function |

---

## Further Reading

- [CATALYST_SETUP.md](./CATALYST_SETUP.md) — Full setup reference with
  DataStore schema, API reference, and environment variable details.
- [Agent README](./agent/README.md) — Agent architecture, features, and
  installer documentation.
- [Zoho Catalyst Documentation](https://docs.catalyst.zoho.com/) — Official
  Catalyst platform docs.
