import { useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const machineOptions = ["dev-vm-01", "win-test-03", "linux-qa-02", "dev-vm-02", "linux-build-01"];
const productOptions = [
  "Log360",
  "EventLog Analyzer",
  "ADAudit Plus",
  "DataSecurity Plus",
  "Endpoint DLP",
  "Log360 UEBA",
];

const mockLogs = [
  {
    ts: "2024-01-15 11:32:01",
    level: "INFO",
    thread: "main",
    message: "Log360 server started on port 8095",
  },
  {
    ts: "2024-01-15 11:32:05",
    level: "INFO",
    thread: "scheduler",
    message: "Scheduled tasks initialized",
  },
  {
    ts: "2024-01-15 11:32:10",
    level: "DEBUG",
    thread: "db-pool",
    message: "Database connection pool created (size=10)",
  },
  {
    ts: "2024-01-15 11:32:15",
    level: "INFO",
    thread: "agent-listener",
    message: "Agent listener bound to 0.0.0.0:7070",
  },
  {
    ts: "2024-01-15 11:33:02",
    level: "WARN",
    thread: "license",
    message: "License expires in 14 days — please renew",
  },
  {
    ts: "2024-01-15 11:33:45",
    level: "ERROR",
    thread: "indexer",
    message: "Failed to index syslog batch: connection refused (host=syslog-relay:514)",
  },
  {
    ts: "2024-01-15 11:33:46",
    level: "ERROR",
    thread: "indexer",
    message: "Retrying in 30 seconds...",
  },
  {
    ts: "2024-01-15 11:34:16",
    level: "INFO",
    thread: "indexer",
    message: "Syslog batch indexed successfully (3204 events)",
  },
  {
    ts: "2024-01-15 11:35:00",
    level: "DEBUG",
    thread: "gc",
    message: "GC pause: 45ms, heap after: 512MB / 2048MB",
  },
  {
    ts: "2024-01-15 11:36:11",
    level: "INFO",
    thread: "api",
    message: "GET /api/v2/alerts?status=open — 200 OK (34ms)",
  },
  {
    ts: "2024-01-15 11:36:15",
    level: "INFO",
    thread: "api",
    message: "POST /api/v2/rules — 201 Created (120ms)",
  },
  {
    ts: "2024-01-15 11:37:00",
    level: "WARN",
    thread: "db-pool",
    message: "Slow query detected (1243ms): SELECT * FROM events WHERE ...",
  },
  {
    ts: "2024-01-15 11:38:22",
    level: "DEBUG",
    thread: "cache",
    message: "Cache miss for key: alert_summary_dashboard",
  },
  {
    ts: "2024-01-15 11:38:23",
    level: "DEBUG",
    thread: "cache",
    message: "Cache populated for key: alert_summary_dashboard (TTL=60s)",
  },
  {
    ts: "2024-01-15 11:39:05",
    level: "INFO",
    thread: "backup",
    message: "Scheduled DB backup started",
  },
  {
    ts: "2024-01-15 11:40:10",
    level: "INFO",
    thread: "backup",
    message: "Scheduled DB backup completed (size=2.1GB, duration=65s)",
  },
  {
    ts: "2024-01-15 11:41:00",
    level: "ERROR",
    thread: "auth",
    message: "Authentication failed for user admin@domain.com (invalid password)",
  },
  {
    ts: "2024-01-15 11:41:01",
    level: "WARN",
    thread: "auth",
    message: "3 failed login attempts for admin@domain.com — account locked for 5min",
  },
  {
    ts: "2024-01-15 11:42:30",
    level: "INFO",
    thread: "main",
    message: "Configuration reloaded (0 changes detected)",
  },
  {
    ts: "2024-01-15 11:43:55",
    level: "DEBUG",
    thread: "perf",
    message: "Response time P95=88ms, P99=210ms over last 60s",
  },
];

const levelColors = {
  ERROR: "#ff5252",
  WARN: "#ffab40",
  INFO: "#69f0ae",
  DEBUG: "#b0bec5",
};

const levelBg = {
  ERROR: "rgba(255,82,82,0.12)",
  WARN: "rgba(255,171,64,0.08)",
  INFO: "transparent",
  DEBUG: "transparent",
};

function Logs() {
  const [machine, setMachine] = useState("dev-vm-01");
  const [product, setProduct] = useState("Log360");
  const [levelFilter, setLevelFilter] = useState(["ERROR", "WARN", "INFO", "DEBUG"]);

  const filtered = mockLogs.filter((l) => levelFilter.includes(l.level));

  const handleLevelToggle = (_, newLevels) => {
    if (newLevels.length > 0) setLevelFilter(newLevels);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={3} pb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3} lg={2}>
            <Card sx={{ p: 2, height: "100%" }}>
              <MDTypography variant="h6" mb={2}>
                Select Source
              </MDTypography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Machine</InputLabel>
                <Select
                  value={machine}
                  label="Machine"
                  onChange={(e) => setMachine(e.target.value)}
                >
                  {machineOptions.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Product</InputLabel>
                <Select
                  value={product}
                  label="Product"
                  onChange={(e) => setProduct(e.target.value)}
                >
                  {productOptions.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <MDTypography variant="caption" color="text" fontWeight="bold" display="block" mb={1}>
                Log Level
              </MDTypography>
              <ToggleButtonGroup
                value={levelFilter}
                onChange={handleLevelToggle}
                orientation="vertical"
                size="small"
                fullWidth
              >
                {["ERROR", "WARN", "INFO", "DEBUG"].map((lvl) => (
                  <ToggleButton key={lvl} value={lvl} sx={{ justifyContent: "flex-start", gap: 1 }}>
                    <MDBox
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: levelColors[lvl],
                        flexShrink: 0,
                      }}
                    />
                    {lvl}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Card>
          </Grid>

          <Grid item xs={12} md={9} lg={10}>
            <Card>
              <MDBox
                px={2}
                py={1.5}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                borderBottom="1px solid rgba(255,255,255,0.1)"
                sx={{
                  bgcolor: "#1e1e1e",
                  borderTopLeftRadius: "inherit",
                  borderTopRightRadius: "inherit",
                }}
              >
                <MDBox display="flex" alignItems="center" gap={1}>
                  <Icon sx={{ color: "#69f0ae", fontSize: 16 }}>circle</Icon>
                  <MDTypography variant="caption" sx={{ color: "#ccc", fontFamily: "monospace" }}>
                    {machine} / {product} — serverlog.txt
                  </MDTypography>
                  <Chip
                    label={`${filtered.length} lines`}
                    size="small"
                    sx={{ bgcolor: "#333", color: "#aaa" }}
                  />
                </MDBox>
                <MDBox display="flex" gap={1}>
                  <MDButton
                    variant="text"
                    size="small"
                    sx={{ color: "#aaa" }}
                    startIcon={<Icon>refresh</Icon>}
                  >
                    Refresh
                  </MDButton>
                  <MDButton
                    variant="text"
                    size="small"
                    sx={{ color: "#aaa" }}
                    startIcon={<Icon>download</Icon>}
                  >
                    Download
                  </MDButton>
                  <MDButton
                    variant="text"
                    size="small"
                    sx={{ color: "#ffab40" }}
                    startIcon={<Icon>bug_report</Icon>}
                  >
                    Attach Debugger
                  </MDButton>
                </MDBox>
              </MDBox>
              <MDBox
                sx={{
                  bgcolor: "#1a1a1a",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#ccc",
                  p: 2,
                  height: 520,
                  overflowY: "auto",
                  borderBottomLeftRadius: "inherit",
                  borderBottomRightRadius: "inherit",
                }}
              >
                {filtered.map((log, i) => (
                  <MDBox
                    key={i}
                    display="flex"
                    gap={1}
                    sx={{
                      py: 0.3,
                      px: 0.5,
                      bgcolor: levelBg[log.level],
                      borderRadius: 0.5,
                      "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
                    }}
                  >
                    <MDBox component="span" sx={{ color: "#555", minWidth: 155, flexShrink: 0 }}>
                      {log.ts}
                    </MDBox>
                    <MDBox
                      component="span"
                      sx={{
                        color: levelColors[log.level],
                        minWidth: 48,
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      [{log.level}]
                    </MDBox>
                    <MDBox component="span" sx={{ color: "#7986cb", minWidth: 100, flexShrink: 0 }}>
                      {log.thread}
                    </MDBox>
                    <MDBox component="span" sx={{ color: "#e0e0e0" }}>
                      {log.message}
                    </MDBox>
                  </MDBox>
                ))}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Logs;
