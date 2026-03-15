/**
 * Domain Deploy — discover domain machines and remotely deploy the Log360 agent.
 *
 * Wizard phases:
 *  1. config      — select gateway agent + enter domain credentials
 *  2. discovering — spinner while gateway agent queries Active Directory
 *  3. selecting   — checkbox table of discovered machines
 *  4. deploying   — real-time per-machine installation status
 */

import { useState, useEffect, useCallback, useRef } from "react";

import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// eslint-disable-next-line no-unused-vars
import { useAuth } from "context/authContext";

// ── Static gateway list (Windows agents already installed) ───────────────────
const GATEWAY_OPTIONS = [
  { id: "m001", name: "dev-vm-01", ip: "192.168.1.101", status: "Online" },
  { id: "m002", name: "win-test-03", ip: "192.168.1.103", status: "Online" },
  { id: "m006", name: "win-test-01", ip: "192.168.1.201", status: "Online" },
  { id: "m010", name: "team-shared-vm", ip: "192.168.4.1", status: "Online" },
];

// ── Simulated Active Directory machine inventory ──────────────────────────────
const MOCK_DOMAIN_MACHINES = [
  {
    name: "CORP-DC-01",
    fqdn: "corp-dc-01.corp.local",
    ip: "10.0.0.1",
    ou: "OU=DomainControllers",
    os: "Windows Server 2022",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "CORP-FS-01",
    fqdn: "corp-fs-01.corp.local",
    ip: "10.0.0.10",
    ou: "OU=Servers",
    os: "Windows Server 2019",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "CORP-APP-01",
    fqdn: "corp-app-01.corp.local",
    ip: "10.0.0.11",
    ou: "OU=Servers",
    os: "Windows Server 2019",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "CORP-DB-01",
    fqdn: "corp-db-01.corp.local",
    ip: "10.0.0.20",
    ou: "OU=Servers",
    os: "Windows Server 2022",
    agentInstalled: true,
    reachable: true,
  },
  {
    name: "DEV-WS-01",
    fqdn: "dev-ws-01.corp.local",
    ip: "10.0.1.11",
    ou: "OU=Dev,OU=Workstations",
    os: "Windows 11 Pro",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "DEV-WS-02",
    fqdn: "dev-ws-02.corp.local",
    ip: "10.0.1.12",
    ou: "OU=Dev,OU=Workstations",
    os: "Windows 11 Pro",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "DEV-WS-03",
    fqdn: "dev-ws-03.corp.local",
    ip: "10.0.1.13",
    ou: "OU=Dev,OU=Workstations",
    os: "Windows 10 Pro",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "QA-WS-01",
    fqdn: "qa-ws-01.corp.local",
    ip: "10.0.2.11",
    ou: "OU=QA,OU=Workstations",
    os: "Windows 10 Pro",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "QA-WS-02",
    fqdn: "qa-ws-02.corp.local",
    ip: "10.0.2.12",
    ou: "OU=QA,OU=Workstations",
    os: "Windows 10 Pro",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "PROD-APP-01",
    fqdn: "prod-app-01.corp.local",
    ip: "10.0.3.11",
    ou: "OU=Production,OU=Servers",
    os: "Windows Server 2022",
    agentInstalled: true,
    reachable: true,
  },
  {
    name: "PROD-APP-02",
    fqdn: "prod-app-02.corp.local",
    ip: "10.0.3.12",
    ou: "OU=Production,OU=Servers",
    os: "Windows Server 2022",
    agentInstalled: false,
    reachable: true,
  },
  {
    name: "LEGACY-WS-01",
    fqdn: "legacy-ws-01.corp.local",
    ip: "10.0.4.11",
    ou: "OU=Legacy",
    os: "Windows 7 Pro",
    agentInstalled: false,
    reachable: false,
  },
  {
    name: "LEGACY-WS-02",
    fqdn: "legacy-ws-02.corp.local",
    ip: "10.0.4.12",
    ou: "OU=Legacy",
    os: "Windows 7 Pro",
    agentInstalled: false,
    reachable: false,
  },
];

// ── Deployment step definitions ───────────────────────────────────────────────
const DEPLOY_STEPS = [
  { key: "ping", label: "Connectivity Check" },
  { key: "copy", label: "Copy Installer" },
  { key: "install", label: "Run Installer" },
  { key: "verify", label: "Verify Service" },
  { key: "register", label: "Register Agent" },
];

// Units each step takes in the simulation (total = TOTAL_UNITS)
const STEP_UNITS_LIST = [2, 3, 5, 2, 1];
const TOTAL_UNITS = STEP_UNITS_LIST.reduce((a, b) => a + b, 0); // 13

// Precompute cumulative boundaries [{start, done}]
const STEP_BOUNDS = STEP_UNITS_LIST.reduce((acc, u) => {
  const prev = acc.length ? acc[acc.length - 1].done : 0;
  acc.push({ start: prev, done: prev + u });
  return acc;
}, []);

// ── Helper: compute per-step status from a units count ────────────────────────
function calcSteps(units) {
  return DEPLOY_STEPS.map((step, i) => {
    const { start, done } = STEP_BOUNDS[i];
    if (units <= start) return { ...step, status: "pending" };
    if (units < done) return { ...step, status: "running" };
    return { ...step, status: "done" };
  });
}

// ── Helper: compute machine-level status label from units ─────────────────────
function calcMachineStatus(units) {
  if (units === 0) return "queued";
  if (units <= STEP_BOUNDS[0].start) return "queued";
  if (units < STEP_BOUNDS[0].done) return "connecting";
  if (units < STEP_BOUNDS[1].done) return "copying";
  if (units < STEP_BOUNDS[2].done) return "installing";
  if (units < STEP_BOUNDS[3].done) return "verifying";
  if (units < TOTAL_UNITS) return "registering";
  return "done";
}

// ── Helper: build log lines for a step starting ───────────────────────────────
function buildStepLog(machine, stepKey) {
  const ts = new Date().toLocaleTimeString();
  const scripts = {
    ping: [
      `[${ts}] Sending ICMP echo request to ${machine.ip}...`,
      `[${ts}] Reply from ${machine.ip}: bytes=32 time=6ms TTL=128`,
    ],
    copy: [
      `[${ts}] Connecting to \\\\${machine.name}\\ADMIN$\\Temp\\`,
      `[${ts}] Copying log360-agent.exe (12.3 MB)...`,
      `[${ts}] Transfer complete — 4.2 MB/s average`,
    ],
    install: [
      `[${ts}] Invoking WMI Win32_Process.Create on ${machine.name}`,
      `[${ts}] Command: log360-agent.exe /S /APIURL=https://your-app.catalystappsail.in/api /TOKEN=***`,
      `[${ts}] [InstallShield] Extracting files to C:\\Program Files\\Log360Agent\\`,
      `[${ts}] [InstallShield] Creating Windows Service: Log360DevSuiteAgent`,
    ],
    verify: [
      `[${ts}] Querying service status via WMI...`,
      `[${ts}] Service 'Log360DevSuiteAgent': Running (PID 4912)`,
    ],
    register: [
      `[${ts}] Agent contacting portal: https://your-app.catalystappsail.in/api/agents/register`,
      `[${ts}] Machine registered — ID: ${machine.name.toLowerCase()}-${Date.now().toString(36)}`,
    ],
  };
  return (scripts[stepKey] || [`[${ts}] ${stepKey}...`]).join("\n");
}

// ── Status → MUI color mapping ────────────────────────────────────────────────
const STATUS_COLOR = {
  queued: "default",
  connecting: "warning",
  copying: "warning",
  installing: "info",
  verifying: "info",
  registering: "info",
  done: "success",
  failed: "error",
};

// ── Wizard step labels ────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  "Gateway & Credentials",
  "Discover Machines",
  "Select Machines",
  "Deploy Agent",
];
const PHASE_TO_STEP = { config: 0, discovering: 1, selecting: 2, deploying: 3 };

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
function DomainDeploy() {
  // Auth token (forwarded to Catalyst API for real calls)
  const { token } = useAuth();
  // Suppress "token never read" lint warning — used when API calls are live
  void token;

  // ── Wizard phase ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState("config"); // config | discovering | selecting | deploying

  // ── Gateway config ────────────────────────────────────────────────────────
  const [gatewayId, setGatewayId] = useState(GATEWAY_OPTIONS[0]?.id || "");
  const [useServiceAccount, setUseServiceAccount] = useState(true);
  const [domainName, setDomainName] = useState("corp.local");
  const [domainUser, setDomainUser] = useState("");
  const [domainPassword, setDomainPassword] = useState("");
  const [discoveryError, setDiscoveryError] = useState("");

  // ── Discovered machines ───────────────────────────────────────────────────
  const [domainMachines, setDomainMachines] = useState([]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());
  const [filterTab, setFilterTab] = useState(0); // 0=all 1=uninstalled 2=installed 3=unreachable
  const [searchTerm, setSearchTerm] = useState("");

  // ── Deployment ────────────────────────────────────────────────────────────
  const [deployResults, setDeployResults] = useState([]);
  const [expandedMachines, setExpandedMachines] = useState({});
  const [deployTick, setDeployTick] = useState(0); // increment to restart simulation
  const tickRef = useRef(null);

  // ── Discovery handler ─────────────────────────────────────────────────────
  const handleDiscover = useCallback(async () => {
    if (!gatewayId || !domainName.trim()) return;
    setPhase("discovering");
    setDiscoveryError("");

    try {
      // Real API call — uncomment when Catalyst backend is deployed:
      // const res = await catalystApi.post("/domain/discover", {
      //   gatewayMachineId: gatewayId, domainName, useServiceAccount,
      //   username: useServiceAccount ? "" : domainUser,
      // }, token);
      // const { discoveryId } = res;
      // ... poll /domain/discover/:discoveryId until status === "done"

      // Demo simulation: simulate ~2.5 s latency then return mock data
      await new Promise((r) => setTimeout(r, 2500));
      setDomainMachines(MOCK_DOMAIN_MACHINES);
      setSelected(new Set());
      setFilterTab(0);
      setSearchTerm("");
      setPhase("selecting");
    } catch (err) {
      setDiscoveryError(err.message);
      setPhase("config");
    }
  }, [gatewayId, domainName, useServiceAccount, domainUser]);

  // ── Deploy handler ────────────────────────────────────────────────────────
  const handleDeploy = useCallback(() => {
    const targets = domainMachines.filter(
      (m) => selected.has(m.name) && m.reachable && !m.agentInstalled
    );
    if (targets.length === 0) return;

    const results = targets.map((m, i) => ({
      ...m,
      status: "queued",
      tick: 0,
      units: 0,
      speed: [1, 1, 2, 2, 3][i % 5], // stagger speeds
      startDelay: i, // stagger start by index
      willFail: i % 7 === 4, // realistic: 1-in-7 fails
      steps: DEPLOY_STEPS.map((s) => ({ ...s, status: "pending" })),
      log: `[${new Date().toLocaleTimeString()}] Deployment queued for ${m.name} (${m.ip})`,
    }));

    setDeployResults(results);
    setExpandedMachines(results.length > 0 ? { [results[0].name]: true } : {});
    setPhase("deploying");
    setDeployTick((n) => n + 1);
  }, [domainMachines, selected]);

  // ── Retry failed handler ──────────────────────────────────────────────────
  const handleRetryFailed = useCallback(() => {
    setDeployResults((prev) =>
      prev.map((r) => {
        if (r.status !== "failed") return r;
        return {
          ...r,
          status: "queued",
          tick: 0,
          units: 0,
          willFail: false, // don't fail again on retry
          steps: DEPLOY_STEPS.map((s) => ({ ...s, status: "pending" })),
          log: r.log + `\n[${new Date().toLocaleTimeString()}] ─── Retrying deployment ───`,
        };
      })
    );
    setDeployTick((n) => n + 1);
  }, []);

  // ── Simulation tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "deploying") return () => {};

    if (tickRef.current) clearInterval(tickRef.current);

    tickRef.current = setInterval(() => {
      setDeployResults((prev) => {
        const next = prev.map((r) => {
          if (r.status === "done" || r.status === "failed") return r;

          const newTick = r.tick + 1;

          // Stagger: don't start until startDelay ticks have passed
          if (newTick <= r.startDelay) return { ...r, tick: newTick };

          // Advance only every `speed` ticks after the start delay
          const adjusted = newTick - r.startDelay;
          if (adjusted % r.speed !== 0) return { ...r, tick: newTick };

          const newUnits = r.units + 1;

          // ── Predetermined fail: midway through install step ─────────────
          if (r.willFail && newUnits === STEP_BOUNDS[2].done - 1) {
            const failSteps = DEPLOY_STEPS.map((s, i) => {
              if (i < 2) return { ...s, status: "done" };
              if (i === 2) return { ...s, status: "failed" };
              return { ...s, status: "pending" };
            });
            const ts = new Date().toLocaleTimeString();
            return {
              ...r,
              tick: newTick,
              units: newUnits,
              status: "failed",
              steps: failSteps,
              log:
                r.log +
                `\n[${ts}] Running installer on ${r.name}...` +
                `\n[${ts}] [ERROR] Access is denied (WMI 0x80070005).` +
                `\n[${ts}] Hint: Enable WMI and PSRemoting on the target machine.` +
                `\n[${ts}] ✗ Deployment failed.`,
            };
          }

          // ── Normal step advancement ─────────────────────────────────────
          const prevSteps = calcSteps(r.units);
          const newSteps = calcSteps(newUnits);
          let log = r.log;
          const ts = new Date().toLocaleTimeString();

          newSteps.forEach((ns, i) => {
            const ps = prevSteps[i];
            if (ns.status === "running" && ps.status !== "running") {
              log += `\n${buildStepLog(r, ns.key)}`;
            }
            if (ns.status === "done" && ps.status !== "done") {
              log += `\n[${ts}] ✓ ${ns.label} complete.`;
            }
          });

          const newStatus = newUnits >= TOTAL_UNITS ? "done" : calcMachineStatus(newUnits);

          if (newStatus === "done" && r.status !== "done") {
            log += `\n[${ts}] ✓ Agent successfully deployed and registered.`;
          }

          return { ...r, tick: newTick, units: newUnits, status: newStatus, steps: newSteps, log };
        });

        // Stop the interval when all machines have finished
        const allTerminal = next.every((r) => r.status === "done" || r.status === "failed");
        if (allTerminal && tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }

        return next;
      });
    }, 800);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [phase, deployTick]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const installable = domainMachines.filter((m) => m.reachable && !m.agentInstalled);

  const handleToggleSelect = useCallback((name, reachable, agentInstalled) => {
    if (!reachable || agentInstalled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSelectAllInstallable = useCallback(() => {
    setSelected(new Set(installable.map((m) => m.name)));
  }, [installable]);

  // ── Filtered machine list for the selection table ─────────────────────────
  const filteredMachines = domainMachines.filter((m) => {
    if (filterTab === 1 && (m.agentInstalled || !m.reachable)) return false;
    if (filterTab === 2 && !m.agentInstalled) return false;
    if (filterTab === 3 && m.reachable) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.ip.includes(q) ||
        m.os.toLowerCase().includes(q) ||
        m.ou.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedDeployable = [...selected].filter((name) =>
    domainMachines.find((m) => m.name === name && m.reachable && !m.agentInstalled)
  ).length;

  const gateway = GATEWAY_OPTIONS.find((g) => g.id === gatewayId);

  // ─────────────────────────────────────────────────────────────────────────
  // Phase renderers
  // ─────────────────────────────────────────────────────────────────────────

  // ── Phase: Config ─────────────────────────────────────────────────────────
  function renderConfig() {
    return (
      <Grid container spacing={3}>
        {discoveryError && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setDiscoveryError("")}>
              Discovery failed: {discoveryError}
            </Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Alert severity="info" icon={<Icon>info</Icon>} sx={{ alignItems: "center" }}>
            <strong>Demo Mode —</strong> Domain discovery uses sample Active Directory data. Connect
            to a deployed Catalyst backend to use live domain data.
          </Alert>
        </Grid>

        {/* Left: form */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3 }}>
            <MDTypography variant="h6" mb={0.5}>
              Gateway Machine
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block" mb={2}>
              Select a Windows machine with the agent already installed. It will query Active
              Directory and push the installer to each target.
            </MDTypography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Gateway Machine</InputLabel>
              <Select
                value={gatewayId}
                onChange={(e) => setGatewayId(e.target.value)}
                label="Gateway Machine"
              >
                {GATEWAY_OPTIONS.map((gw) => (
                  <MenuItem key={gw.id} value={gw.id}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <Icon sx={{ color: "#0078d4", fontSize: "1.1rem" }}>desktop_windows</Icon>
                      <MDTypography variant="button">
                        {gw.name} &nbsp;
                        <MDTypography component="span" variant="caption" color="text">
                          ({gw.ip})
                        </MDTypography>
                      </MDTypography>
                      <Chip label={gw.status} color="success" size="small" sx={{ ml: "auto" }} />
                    </MDBox>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Domain Name"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="corp.local"
              helperText="Active Directory domain FQDN"
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <MDTypography variant="h6" mb={1}>
              Domain Credentials
            </MDTypography>

            <FormControlLabel
              control={
                <Switch
                  checked={useServiceAccount}
                  onChange={(e) => setUseServiceAccount(e.target.checked)}
                />
              }
              label="Use gateway agent's Windows service account"
              sx={{ mb: useServiceAccount ? 0 : 2 }}
            />

            {!useServiceAccount && (
              <>
                <TextField
                  fullWidth
                  label="Domain User"
                  placeholder="CORP\\administrator"
                  value={domainUser}
                  onChange={(e) => setDomainUser(e.target.value)}
                  sx={{ mb: 2, mt: 2 }}
                />
                <TextField
                  fullWidth
                  label="Domain Password"
                  type="password"
                  value={domainPassword}
                  onChange={(e) => setDomainPassword(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <MDButton
              variant="gradient"
              color="info"
              fullWidth
              size="large"
              onClick={handleDiscover}
              disabled={!gatewayId || !domainName.trim()}
              sx={{ mt: 2 }}
            >
              <Icon sx={{ mr: 1 }}>travel_explore</Icon>
              Discover Domain Machines
            </MDButton>
          </Card>
        </Grid>

        {/* Right: how-it-works */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: "100%" }}>
            <MDTypography variant="h6" mb={2}>
              How It Works
            </MDTypography>
            {[
              {
                icon: "travel_explore",
                color: "#1A73E8",
                label: "1 · Discovery",
                desc: "The gateway agent runs Get-ADComputer to enumerate all machines in the domain, checks reachability via ICMP, and detects which machines already have the agent installed.",
              },
              {
                icon: "checklist",
                color: "#4CAF50",
                label: "2 · Selection",
                desc: "You choose which machines to deploy to. Unreachable machines and machines already running the agent are clearly marked.",
              },
              {
                icon: "rocket_launch",
                color: "#FF9800",
                label: "3 · Remote Deploy",
                desc: "The gateway copies the installer to each target via Admin shares (\\\\MACHINE\\ADMIN$\\Temp) and executes it silently using WMI Win32_Process or PowerShell Remoting.",
              },
              {
                icon: "monitor_heart",
                color: "#9C27B0",
                label: "4 · Live Status",
                desc: "Per-machine progress with five tracked steps: Connectivity → Copy → Install → Verify → Register. Full installation log visible for every machine.",
              },
            ].map(({ icon, color, label, desc }) => (
              <MDBox key={label} display="flex" alignItems="flex-start" gap={1.5} mb={2}>
                <Icon sx={{ color, mt: 0.3, fontSize: "1.4rem" }}>{icon}</Icon>
                <MDBox>
                  <MDTypography variant="button" fontWeight="bold">
                    {label}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {desc}
                  </MDTypography>
                </MDBox>
              </MDBox>
            ))}
          </Card>
        </Grid>
      </Grid>
    );
  }

  // ── Phase: Discovering ────────────────────────────────────────────────────
  function renderDiscovering() {
    return (
      <Card>
        <MDBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          py={8}
          gap={3}
        >
          <CircularProgress color="info" size={52} thickness={4} />
          <MDBox textAlign="center">
            <MDTypography variant="h5" fontWeight="bold" mb={1}>
              Discovering Domain Machines
            </MDTypography>
            <MDTypography variant="body2" color="text" mb={0.5}>
              Gateway: <strong>{gateway?.name}</strong> ({gateway?.ip}) → Domain:{" "}
              <strong>{domainName}</strong>
            </MDTypography>
            <MDTypography variant="caption" color="text" sx={{ fontFamily: "monospace" }}>
              Running: Get-ADComputer -Filter * -Properties OperatingSystem,LastLogonDate
            </MDTypography>
          </MDBox>
          <MDButton variant="text" color="info" size="small" onClick={() => setPhase("config")}>
            Cancel
          </MDButton>
        </MDBox>
      </Card>
    );
  }

  // ── Phase: Selecting ──────────────────────────────────────────────────────
  function renderSelecting() {
    const stats = [
      { label: "Total Found", value: domainMachines.length, color: "#1A73E8", icon: "dns" },
      {
        label: "Reachable",
        value: domainMachines.filter((m) => m.reachable).length,
        color: "#4CAF50",
        icon: "signal_cellular_alt",
      },
      { label: "Not Installed", value: installable.length, color: "#FF9800", icon: "download" },
      {
        label: "Already Active",
        value: domainMachines.filter((m) => m.agentInstalled).length,
        color: "#9C27B0",
        icon: "check_circle",
      },
    ];

    const allInstallableSelected =
      installable.length > 0 && installable.every((m) => selected.has(m.name));
    const someInstallableSelected =
      !allInstallableSelected && installable.some((m) => selected.has(m.name));

    return (
      <Grid container spacing={3}>
        {/* Stats row */}
        {stats.map(({ label, value, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <Card sx={{ p: 2, textAlign: "center" }}>
              <Icon sx={{ fontSize: 32, color }}>{icon}</Icon>
              <MDTypography variant="h4" fontWeight="bold" mt={0.5}>
                {value}
              </MDTypography>
              <MDTypography variant="caption" color="text">
                {label}
              </MDTypography>
            </Card>
          </Grid>
        ))}

        {/* Machine selection table */}
        <Grid item xs={12}>
          <Card>
            {/* Card header */}
            <MDBox
              mx={2}
              mt={-3}
              py={2}
              px={2}
              variant="gradient"
              bgColor="info"
              borderRadius="lg"
              coloredShadow="info"
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <MDBox>
                <MDTypography variant="h6" color="white">
                  Domain Machines — {domainName}
                </MDTypography>
                <MDTypography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Discovered via {gateway?.name}
                </MDTypography>
              </MDBox>
              <MDBox display="flex" gap={1}>
                <MDButton
                  variant="contained"
                  color="white"
                  size="small"
                  onClick={handleSelectAllInstallable}
                  disabled={installable.length === 0}
                >
                  <Icon sx={{ mr: 0.5 }}>select_all</Icon>
                  Select All Uninstalled
                </MDButton>
                <MDButton
                  variant="outlined"
                  sx={{ color: "white", borderColor: "rgba(255,255,255,0.6)" }}
                  size="small"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </MDButton>
              </MDBox>
            </MDBox>

            {/* Tabs + Search */}
            <MDBox
              px={3}
              pt={2}
              pb={1}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
            >
              <Tabs
                value={filterTab}
                onChange={(_, v) => setFilterTab(v)}
                textColor="info"
                indicatorColor="info"
              >
                <Tab label={`All (${domainMachines.length})`} />
                <Tab label={`Not Installed (${installable.length})`} />
                <Tab
                  label={`Installed (${domainMachines.filter((m) => m.agentInstalled).length})`}
                />
                <Tab label={`Unreachable (${domainMachines.filter((m) => !m.reachable).length})`} />
              </Tabs>
              <TextField
                size="small"
                placeholder="Search machines…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon fontSize="small">search</Icon>
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 220 }}
              />
            </MDBox>

            {/* Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ pl: 2 }}>
                      <Tooltip
                        title={
                          allInstallableSelected
                            ? "Deselect all"
                            : "Select all reachable / not-installed"
                        }
                      >
                        <Checkbox
                          indeterminate={someInstallableSelected}
                          checked={allInstallableSelected}
                          onChange={(e) =>
                            e.target.checked ? handleSelectAllInstallable() : setSelected(new Set())
                          }
                        />
                      </Tooltip>
                    </TableCell>
                    {[
                      "Machine",
                      "IP Address",
                      "Operating System",
                      "Organizational Unit",
                      "Reachability",
                      "Agent",
                    ].map((h) => (
                      <TableCell key={h}>
                        <MDTypography variant="caption" fontWeight="bold" color="text">
                          {h}
                        </MDTypography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMachines.map((m) => {
                    const isDisabled = !m.reachable || m.agentInstalled;
                    return (
                      <TableRow
                        key={m.name}
                        hover={!isDisabled}
                        selected={selected.has(m.name)}
                        onClick={() => handleToggleSelect(m.name, m.reachable, m.agentInstalled)}
                        sx={{
                          cursor: isDisabled ? "default" : "pointer",
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >
                        <TableCell padding="checkbox" sx={{ pl: 2 }}>
                          <Checkbox
                            checked={selected.has(m.name)}
                            disabled={isDisabled}
                            onChange={() =>
                              handleToggleSelect(m.name, m.reachable, m.agentInstalled)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <MDBox display="flex" alignItems="center" gap={1}>
                            <Icon sx={{ color: "#0078d4", fontSize: "1.1rem" }}>
                              desktop_windows
                            </Icon>
                            <MDBox>
                              <MDTypography variant="button" fontWeight="medium">
                                {m.name}
                              </MDTypography>
                              <MDTypography
                                variant="caption"
                                color="text"
                                display="block"
                                sx={{ fontSize: "0.65rem" }}
                              >
                                {m.fqdn}
                              </MDTypography>
                            </MDBox>
                          </MDBox>
                        </TableCell>
                        <TableCell>
                          <MDTypography variant="caption">{m.ip}</MDTypography>
                        </TableCell>
                        <TableCell>
                          <MDTypography variant="caption">{m.os}</MDTypography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.ou}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.6rem", maxWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.reachable ? "Reachable" : "Unreachable"}
                            color={m.reachable ? "success" : "error"}
                            size="small"
                            icon={<Icon>{m.reachable ? "wifi" : "wifi_off"}</Icon>}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.agentInstalled ? "Installed" : "Not Installed"}
                            color={m.agentInstalled ? "primary" : "default"}
                            size="small"
                            icon={<Icon>{m.agentInstalled ? "check" : "download"}</Icon>}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredMachines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <MDTypography variant="body2" color="text">
                          No machines match the current filter.
                        </MDTypography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Bottom action bar */}
            <MDBox
              px={3}
              py={2}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
            >
              <MDTypography variant="body2" color="text">
                {selectedDeployable === 0
                  ? "No machines selected"
                  : `${selectedDeployable} machine${selectedDeployable !== 1 ? "s" : ""} selected`}
              </MDTypography>
              <MDBox display="flex" gap={1}>
                <MDButton
                  variant="outlined"
                  color="info"
                  size="small"
                  onClick={() => setPhase("config")}
                >
                  ← Change Gateway
                </MDButton>
                <MDButton
                  variant="gradient"
                  color="info"
                  onClick={handleDeploy}
                  disabled={selectedDeployable === 0}
                >
                  <Icon sx={{ mr: 1 }}>rocket_launch</Icon>
                  Deploy Agent to{" "}
                  {selectedDeployable > 0
                    ? `${selectedDeployable} Machine${selectedDeployable !== 1 ? "s" : ""}`
                    : "Selected Machines"}
                </MDButton>
              </MDBox>
            </MDBox>
          </Card>
        </Grid>
      </Grid>
    );
  }

  // ── Phase: Deploying ──────────────────────────────────────────────────────
  function renderDeploying() {
    const done = deployResults.filter((r) => r.status === "done").length;
    const failed = deployResults.filter((r) => r.status === "failed").length;
    const total = deployResults.length;
    const allTerminal = done + failed === total;
    const overallPct =
      total === 0
        ? 0
        : Math.round(
            (deployResults.reduce((sum, r) => sum + r.units, 0) / (total * TOTAL_UNITS)) * 100
          );

    return (
      <Grid container spacing={3}>
        {/* Summary banner */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              mb={2}
              flexWrap="wrap"
              gap={1}
            >
              <MDBox>
                <MDTypography variant="h5" fontWeight="bold">
                  {allTerminal ? "Deployment Complete" : "Deploying Agent…"}
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Gateway: <strong>{gateway?.name}</strong> → {total} target machine
                  {total !== 1 ? "s" : ""}
                </MDTypography>
              </MDBox>
              <MDBox display="flex" gap={1} flexWrap="wrap">
                <Chip
                  icon={<Icon>check_circle</Icon>}
                  label={`${done} Succeeded`}
                  color={done > 0 ? "success" : "default"}
                  size="small"
                />
                <Chip
                  icon={<Icon>error</Icon>}
                  label={`${failed} Failed`}
                  color={failed > 0 ? "error" : "default"}
                  size="small"
                />
                <Chip
                  icon={<Icon>hourglass_empty</Icon>}
                  label={`${total - done - failed} In Progress`}
                  color={total - done - failed > 0 ? "warning" : "default"}
                  size="small"
                />
              </MDBox>
            </MDBox>
            <LinearProgress
              variant="determinate"
              value={overallPct}
              color={failed > 0 && allTerminal ? "warning" : "info"}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <MDTypography variant="caption" color="text" display="block" mt={0.5}>
              {overallPct}% complete
            </MDTypography>
          </Card>
        </Grid>

        {/* Per-machine accordions */}
        <Grid item xs={12}>
          {deployResults.map((r) => {
            const activeStepIdx = r.steps.findIndex((s) => s.status === "running");
            const isExpanded = !!expandedMachines[r.name];

            return (
              <Accordion
                key={r.name}
                expanded={isExpanded}
                onChange={() =>
                  setExpandedMachines((prev) => ({ ...prev, [r.name]: !prev[r.name] }))
                }
                sx={{ mb: 1, "&:before": { display: "none" } }}
                elevation={2}
              >
                <AccordionSummary expandIcon={<Icon>expand_more</Icon>} sx={{ minHeight: 64 }}>
                  <MDBox display="flex" alignItems="center" gap={2} width="100%" pr={1}>
                    {r.status === "queued" || r.status === "connecting" ? (
                      <CircularProgress size={18} color="info" />
                    ) : (
                      <Icon
                        sx={{
                          color:
                            r.status === "done"
                              ? "#4CAF50"
                              : r.status === "failed"
                              ? "#f44336"
                              : "#1A73E8",
                        }}
                      >
                        {r.status === "done"
                          ? "check_circle"
                          : r.status === "failed"
                          ? "cancel"
                          : "desktop_windows"}
                      </Icon>
                    )}

                    <MDBox flex={1} minWidth={0}>
                      <MDTypography variant="button" fontWeight="bold">
                        {r.name}
                      </MDTypography>
                      <MDTypography
                        variant="caption"
                        color="text"
                        display="block"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        {r.ip} &bull; {r.os}
                      </MDTypography>
                    </MDBox>

                    {/* Mini step indicators (desktop) */}
                    <MDBox
                      display={{ xs: "none", md: "flex" }}
                      alignItems="center"
                      gap={0.5}
                      mr={1}
                    >
                      {r.steps.map((s) => (
                        <Tooltip key={s.key} title={s.label}>
                          <Icon
                            sx={{
                              fontSize: "1rem",
                              color:
                                s.status === "done"
                                  ? "#4CAF50"
                                  : s.status === "running"
                                  ? "#1A73E8"
                                  : s.status === "failed"
                                  ? "#f44336"
                                  : "#bbb",
                            }}
                          >
                            {s.status === "done"
                              ? "check_circle"
                              : s.status === "failed"
                              ? "cancel"
                              : s.status === "running"
                              ? "radio_button_checked"
                              : "radio_button_unchecked"}
                          </Icon>
                        </Tooltip>
                      ))}
                    </MDBox>

                    <Chip
                      label={r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      color={STATUS_COLOR[r.status] || "default"}
                      size="small"
                      sx={{ minWidth: 90 }}
                    />
                  </MDBox>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0 }}>
                  <Grid container spacing={2}>
                    {/* Left: step stepper */}
                    <Grid item xs={12} md={4}>
                      <MDTypography
                        variant="caption"
                        fontWeight="bold"
                        color="text"
                        display="block"
                        mb={1}
                      >
                        Installation Steps
                      </MDTypography>
                      <Stepper
                        activeStep={
                          activeStepIdx === -1
                            ? r.steps.filter((s) => s.status === "done").length
                            : activeStepIdx
                        }
                        orientation="vertical"
                        sx={{ "& .MuiStepConnector-line": { minHeight: 16 } }}
                      >
                        {r.steps.map((step) => (
                          <Step key={step.key} completed={step.status === "done"}>
                            <StepLabel
                              error={step.status === "failed"}
                              StepIconComponent={() => {
                                if (step.status === "running")
                                  return <CircularProgress size={20} color="info" />;
                                if (step.status === "done")
                                  return (
                                    <Icon sx={{ color: "#4CAF50", fontSize: "1.2rem" }}>
                                      check_circle
                                    </Icon>
                                  );
                                if (step.status === "failed")
                                  return (
                                    <Icon sx={{ color: "#f44336", fontSize: "1.2rem" }}>
                                      cancel
                                    </Icon>
                                  );
                                return (
                                  <Icon sx={{ color: "#bbb", fontSize: "1.2rem" }}>
                                    radio_button_unchecked
                                  </Icon>
                                );
                              }}
                            >
                              <MDTypography
                                variant="caption"
                                fontWeight={step.status === "running" ? "bold" : "regular"}
                                color={step.status === "failed" ? "error" : "text"}
                              >
                                {step.label}
                              </MDTypography>
                            </StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                    </Grid>

                    {/* Right: live log */}
                    <Grid item xs={12} md={8}>
                      <MDTypography
                        variant="caption"
                        fontWeight="bold"
                        color="text"
                        display="block"
                        mb={1}
                      >
                        Installation Log
                      </MDTypography>
                      <MDBox
                        component="pre"
                        sx={{
                          bgcolor: "#0d1117",
                          color: "#c9d1d9",
                          p: 1.5,
                          borderRadius: 1,
                          fontSize: "0.68rem",
                          fontFamily: "'Courier New', monospace",
                          lineHeight: 1.6,
                          height: 200,
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          border: "1px solid #30363d",
                        }}
                        ref={(el) => {
                          if (el) el.scrollTop = el.scrollHeight;
                        }}
                      >
                        {r.log || "Waiting to start…"}
                      </MDBox>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Grid>

        {/* Completion actions */}
        {allTerminal && (
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <MDBox
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={2}
              >
                <MDBox>
                  {failed === 0 ? (
                    <MDTypography variant="h6">
                      🎉 All {total} machine{total !== 1 ? "s" : ""} deployed successfully!
                    </MDTypography>
                  ) : (
                    <MDTypography variant="h6">
                      {done} succeeded &bull; {failed} failed
                    </MDTypography>
                  )}
                  <MDTypography variant="body2" color="text">
                    {failed > 0
                      ? "Check the logs above. Common causes: WMI disabled, PSRemoting off, firewall blocking Admin$ share."
                      : "Newly deployed agents will appear in the Agents page shortly."}
                  </MDTypography>
                </MDBox>
                <MDBox display="flex" gap={1} flexWrap="wrap">
                  {failed > 0 && (
                    <MDButton variant="outlined" color="error" onClick={handleRetryFailed}>
                      <Icon sx={{ mr: 0.5 }}>refresh</Icon>
                      Retry {failed} Failed
                    </MDButton>
                  )}
                  <MDButton
                    variant="outlined"
                    color="info"
                    onClick={() => {
                      setSelected(new Set());
                      setPhase("selecting");
                    }}
                  >
                    ← Deploy to More
                  </MDButton>
                  <MDButton variant="gradient" color="info" href="/agents">
                    View Agents →
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={4}>
        {/* Page title */}
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="bold">
            Domain Agent Deployment
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Discover Active Directory machines and push the Log360 Dev Suite agent remotely.
          </MDTypography>
        </MDBox>

        {/* Wizard step indicator */}
        <Card sx={{ p: 2, mb: 3 }}>
          <Stepper activeStep={PHASE_TO_STEP[phase] ?? 0} alternativeLabel>
            {WIZARD_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Card>

        {/* Current phase content */}
        {phase === "config" && renderConfig()}
        {phase === "discovering" && renderDiscovering()}
        {phase === "selecting" && renderSelecting()}
        {phase === "deploying" && renderDeploying()}
      </MDBox>
    </DashboardLayout>
  );
}

export default DomainDeploy;
