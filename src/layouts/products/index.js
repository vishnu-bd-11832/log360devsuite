import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

const products = [
  { name: "Log360", status: "Running", port: 8095, version: "5.3.2", machine: "dev-vm-01" },
  {
    name: "EventLog Analyzer",
    status: "Running",
    port: 8400,
    version: "12.3.1",
    machine: "dev-vm-01",
  },
  { name: "ADAudit Plus", status: "Stopped", port: 9200, version: "7.1.0", machine: "win-test-03" },
  {
    name: "DataSecurity Plus",
    status: "Running",
    port: 6300,
    version: "6.0.5",
    machine: "linux-qa-02",
  },
  {
    name: "Cloud Security Plus",
    status: "Not Installed",
    port: "—",
    version: "—",
    machine: "win-test-03",
  },
  {
    name: "Exchange Reporter Plus",
    status: "Running",
    port: 8181,
    version: "5.7.2",
    machine: "win-dev-05",
  },
  {
    name: "O365 Manager Plus",
    status: "Stopped",
    port: 8365,
    version: "4.5.0",
    machine: "win-dev-05",
  },
  {
    name: "M365 Security Plus",
    status: "Not Installed",
    port: "—",
    version: "—",
    machine: "win-test-01",
  },
  {
    name: "Endpoint DLP",
    status: "Running",
    port: 7070,
    version: "2.1.3",
    machine: "linux-build-01",
  },
  { name: "Log360 UEBA", status: "Running", port: 8125, version: "4.0.1", machine: "dev-vm-02" },
];

const statusProps = {
  Running: { color: "success", icon: "check_circle" },
  Stopped: { color: "error", icon: "cancel" },
  "Not Installed": { color: "default", icon: "remove_circle_outline" },
};

const columns = [
  { Header: "product", accessor: "product", width: "26%" },
  { Header: "status", accessor: "status", width: "14%" },
  { Header: "port", accessor: "port", width: "8%" },
  { Header: "version", accessor: "version", width: "12%" },
  { Header: "machine", accessor: "machine", width: "18%" },
  { Header: "actions", accessor: "actions", width: "22%", isSorted: false },
];

const rows = products.map((p) => {
  const sp = statusProps[p.status];
  return {
    product: (
      <MDBox display="flex" alignItems="center" gap={1}>
        <Icon fontSize="small" color="info">
          apps
        </Icon>
        <MDTypography variant="button" fontWeight="medium">
          {p.name}
        </MDTypography>
      </MDBox>
    ),
    status: (
      <Chip
        icon={<Icon style={{ fontSize: 14 }}>{sp.icon}</Icon>}
        label={p.status}
        color={sp.color}
        size="small"
      />
    ),
    port: (
      <MDTypography variant="button" color="text">
        {p.port}
      </MDTypography>
    ),
    version: (
      <MDTypography variant="caption" color="text">
        {p.version}
      </MDTypography>
    ),
    machine: (
      <MDTypography variant="caption" color="text">
        {p.machine}
      </MDTypography>
    ),
    actions: (
      <MDBox display="flex" gap={0.5}>
        {p.status === "Running" && (
          <Tooltip title="Stop">
            <IconButton size="small" color="error">
              <Icon fontSize="small">stop_circle</Icon>
            </IconButton>
          </Tooltip>
        )}
        {p.status === "Stopped" && (
          <Tooltip title="Start">
            <IconButton size="small" color="success">
              <Icon fontSize="small">play_circle</Icon>
            </IconButton>
          </Tooltip>
        )}
        {p.status === "Not Installed" && (
          <Tooltip title="Install">
            <IconButton size="small" color="info">
              <Icon fontSize="small">install_desktop</Icon>
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="View Logs">
          <IconButton size="small" color="default" disabled={p.status === "Not Installed"}>
            <Icon fontSize="small">article</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title="Restart">
          <IconButton size="small" color="warning" disabled={p.status === "Not Installed"}>
            <Icon fontSize="small">restart_alt</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title="Attach Debugger">
          <IconButton size="small" color="default" disabled={p.status !== "Running"}>
            <Icon fontSize="small">bug_report</Icon>
          </IconButton>
        </Tooltip>
      </MDBox>
    ),
  };
});

function Products() {
  const running = products.filter((p) => p.status === "Running").length;
  const stopped = products.filter((p) => p.status === "Stopped").length;
  const notInstalled = products.filter((p) => p.status === "Not Installed").length;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3} mb={3}>
          {[
            { label: "Running", count: running, color: "success", icon: "check_circle" },
            { label: "Stopped", count: stopped, color: "error", icon: "cancel" },
            {
              label: "Not Installed",
              count: notInstalled,
              color: "default",
              icon: "remove_circle_outline",
            },
          ].map((s) => (
            <Grid item xs={12} md={4} key={s.label}>
              <Card sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                <Icon color={s.color === "default" ? "action" : s.color} sx={{ fontSize: 36 }}>
                  {s.icon}
                </Icon>
                <MDBox>
                  <MDTypography variant="h4" fontWeight="bold">
                    {s.count}
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    {s.label}
                  </MDTypography>
                </MDBox>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  ManageEngine Products
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  size="small"
                  startIcon={<Icon>refresh</Icon>}
                >
                  Refresh Status
                </MDButton>
              </MDBox>
              <DataTable
                table={{ columns, rows }}
                isSorted={false}
                entriesPerPage={false}
                showTotalEntries={false}
                noEndBorder
              />
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Products;
