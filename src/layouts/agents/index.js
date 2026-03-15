import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

const agents = [
  {
    machine: "dev-vm-01",
    os: "Windows",
    platform: "x64",
    version: "1.4.2",
    status: "Online",
    lastSeen: "1 min ago",
    cpu: 18,
    mem: 42,
    capabilities: ["process-monitor", "product-detector", "installer"],
  },
  {
    machine: "win-test-03",
    os: "Windows",
    platform: "x64",
    version: "1.4.2",
    status: "Online",
    lastSeen: "3 min ago",
    cpu: 5,
    mem: 28,
    capabilities: ["process-monitor", "product-detector", "installer"],
  },
  {
    machine: "linux-qa-02",
    os: "Linux",
    platform: "x64",
    version: "1.3.8",
    status: "Online",
    lastSeen: "2 min ago",
    cpu: 12,
    mem: 55,
    capabilities: ["process-monitor", "product-detector", "installer"],
  },
  {
    machine: "win-dev-05",
    os: "Windows",
    platform: "x64",
    version: "1.4.1",
    status: "Offline",
    lastSeen: "2 hrs ago",
    cpu: 0,
    mem: 0,
    capabilities: ["process-monitor", "product-detector"],
  },
  {
    machine: "dev-vm-02",
    os: "Linux",
    platform: "x64",
    version: "1.4.2",
    status: "Online",
    lastSeen: "just now",
    cpu: 34,
    mem: 61,
    capabilities: ["process-monitor", "product-detector", "installer"],
  },
  {
    machine: "win-test-01",
    os: "Windows",
    platform: "x64",
    version: "1.4.0",
    status: "Online",
    lastSeen: "5 min ago",
    cpu: 9,
    mem: 38,
    capabilities: ["process-monitor", "product-detector", "installer"],
  },
  {
    machine: "linux-build-01",
    os: "Linux",
    platform: "x64",
    version: "1.4.2",
    status: "Online",
    lastSeen: "1 min ago",
    cpu: 72,
    mem: 80,
    capabilities: ["process-monitor", "product-detector", "installer"],
  },
  {
    machine: "win-dev-09",
    os: "Windows",
    platform: "x64",
    version: "1.3.9",
    status: "Offline",
    lastSeen: "1 day ago",
    cpu: 0,
    mem: 0,
    capabilities: ["process-monitor"],
  },
];

const capIcons = {
  "process-monitor": { icon: "monitor_heart", label: "Process Monitor" },
  "product-detector": { icon: "search", label: "Product Detector" },
  installer: { icon: "install_desktop", label: "Installer" },
};

const columns = [
  { Header: "machine", accessor: "machine", width: "18%" },
  { Header: "os / platform", accessor: "osPlatform", width: "12%" },
  { Header: "agent version", accessor: "version", width: "12%" },
  { Header: "status", accessor: "status", width: "10%" },
  { Header: "last seen", accessor: "lastSeen", width: "12%" },
  { Header: "cpu / mem", accessor: "resources", width: "16%" },
  { Header: "capabilities", accessor: "capabilities", width: "14%" },
  { Header: "actions", accessor: "actions", width: "6%", isSorted: false },
];

const rows = agents.map((a) => ({
  machine: (
    <MDBox display="flex" alignItems="center" gap={1}>
      <Icon fontSize="small" sx={{ color: a.os === "Windows" ? "#0078d4" : "#ff6600" }}>
        {a.os === "Windows" ? "desktop_windows" : "terminal"}
      </Icon>
      <MDTypography variant="button" fontWeight="medium">
        {a.machine}
      </MDTypography>
    </MDBox>
  ),
  osPlatform: (
    <MDTypography variant="caption" color="text">
      {a.os} / {a.platform}
    </MDTypography>
  ),
  version: <Chip label={a.version} size="small" variant="outlined" />,
  status: (
    <Chip label={a.status} color={a.status === "Online" ? "success" : "default"} size="small" />
  ),
  lastSeen: (
    <MDTypography variant="caption" color="text">
      {a.lastSeen}
    </MDTypography>
  ),
  resources:
    a.status === "Online" ? (
      <MDBox width="100px">
        <MDTypography variant="caption" color="text">
          CPU {a.cpu}%
        </MDTypography>
        <LinearProgress
          variant="determinate"
          value={a.cpu}
          color={a.cpu > 80 ? "error" : a.cpu > 60 ? "warning" : "info"}
          sx={{ mb: 0.5, height: 4, borderRadius: 2 }}
        />
        <MDTypography variant="caption" color="text">
          MEM {a.mem}%
        </MDTypography>
        <LinearProgress
          variant="determinate"
          value={a.mem}
          color={a.mem > 80 ? "error" : a.mem > 60 ? "warning" : "info"}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </MDBox>
    ) : (
      <MDTypography variant="caption" color="text">
        —
      </MDTypography>
    ),
  capabilities: (
    <MDBox display="flex" gap={0.5}>
      {a.capabilities.map((cap) => (
        <Tooltip key={cap} title={capIcons[cap]?.label || cap}>
          <Icon fontSize="small" sx={{ color: "#555", cursor: "default" }}>
            {capIcons[cap]?.icon || "extension"}
          </Icon>
        </Tooltip>
      ))}
    </MDBox>
  ),
  actions: (
    <MDBox display="flex" gap={0.5}>
      <Tooltip title="View Processes">
        <IconButton size="small" color="info" disabled={a.status !== "Online"}>
          <Icon fontSize="small">monitor_heart</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="View Details">
        <IconButton size="small" color="default">
          <Icon fontSize="small">info</Icon>
        </IconButton>
      </Tooltip>
    </MDBox>
  ),
}));

function Agents() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} lg={3}>
            <Card sx={{ p: 2, textAlign: "center" }}>
              <Icon sx={{ fontSize: 40, color: "#1A73E8" }}>memory</Icon>
              <MDTypography variant="h6" mt={1}>
                Download Agent
              </MDTypography>
              <MDTypography variant="caption" color="text" display="block" mb={2}>
                Deploy on target machines to enable remote management
              </MDTypography>
              <MDButton variant="gradient" color="info" fullWidth size="small" sx={{ mb: 1 }}>
                <Icon sx={{ mr: 1 }}>desktop_windows</Icon> Windows Agent (.exe)
              </MDButton>
              <MDButton variant="gradient" color="dark" fullWidth size="small">
                <Icon sx={{ mr: 1 }}>terminal</Icon> Linux Agent (.bin)
              </MDButton>
            </Card>
          </Grid>
          <Grid item xs={12} md={8} lg={9}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="dark"
                borderRadius="lg"
                coloredShadow="dark"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Agents
                </MDTypography>
                <MDBox display="flex" gap={1}>
                  <Chip
                    label={`${agents.filter((a) => a.status === "Online").length} Online`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`${agents.filter((a) => a.status === "Offline").length} Offline`}
                    size="small"
                    sx={{ bgcolor: "#555", color: "#fff" }}
                  />
                </MDBox>
              </MDBox>
              <DataTable
                table={{ columns, rows }}
                isSorted={false}
                entriesPerPage={{ defaultValue: 10 }}
                showTotalEntries
                canSearch
              />
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Agents;
