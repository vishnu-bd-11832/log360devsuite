import { useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

const workdriveStatus = {
  connected: true,
  user: "dev-team@manageengine.com",
  folder: "/Log360DevSuite/Backups",
};

const backups = [
  {
    id: "bk001",
    machine: "dev-vm-01",
    product: "Log360",
    type: "Full",
    size: "4.2 GB",
    date: "2024-01-15 02:00",
    status: "Success",
    location: "WorkDrive",
  },
  {
    id: "bk002",
    machine: "dev-vm-01",
    product: "Log360",
    type: "DB",
    size: "2.1 GB",
    date: "2024-01-15 11:40",
    status: "Success",
    location: "Local",
  },
  {
    id: "bk003",
    machine: "win-test-03",
    product: "EventLog Analyzer",
    type: "Full",
    size: "3.7 GB",
    date: "2024-01-14 03:00",
    status: "Success",
    location: "WorkDrive",
  },
  {
    id: "bk004",
    machine: "linux-qa-02",
    product: "DataSecurity Plus",
    type: "Config",
    size: "12 MB",
    date: "2024-01-14 12:30",
    status: "Success",
    location: "Local",
  },
  {
    id: "bk005",
    machine: "linux-build-01",
    product: "Endpoint DLP",
    type: "DB",
    size: "890 MB",
    date: "2024-01-13 02:00",
    status: "Failed",
    location: "Local",
  },
  {
    id: "bk006",
    machine: "dev-vm-02",
    product: "Log360 UEBA",
    type: "Full",
    size: "1.8 GB",
    date: "2024-01-13 04:00",
    status: "Success",
    location: "WorkDrive",
  },
  {
    id: "bk007",
    machine: "win-test-01",
    product: "ADAudit Plus",
    type: "DB",
    size: "650 MB",
    date: "2024-01-12 02:00",
    status: "Success",
    location: "Local",
  },
];

const typeColors = { Full: "primary", DB: "info", Config: "warning" };
const locationColors = { WorkDrive: "success", Local: "default" };

const columns = [
  { Header: "machine", accessor: "machine", width: "14%" },
  { Header: "product", accessor: "product", width: "18%" },
  { Header: "type", accessor: "type", width: "10%" },
  { Header: "size", accessor: "size", width: "10%" },
  { Header: "date", accessor: "date", width: "16%" },
  { Header: "status", accessor: "status", width: "10%" },
  { Header: "location", accessor: "location", width: "12%" },
  { Header: "actions", accessor: "actions", width: "10%", isSorted: false },
];

const rows = backups.map((b) => ({
  machine: (
    <MDTypography variant="button" fontWeight="medium">
      {b.machine}
    </MDTypography>
  ),
  product: (
    <MDTypography variant="caption" color="text">
      {b.product}
    </MDTypography>
  ),
  type: <Chip label={b.type} size="small" color={typeColors[b.type] || "default"} />,
  size: (
    <MDTypography variant="caption" color="text">
      {b.size}
    </MDTypography>
  ),
  date: (
    <MDTypography variant="caption" color="text">
      {b.date}
    </MDTypography>
  ),
  status: (
    <Chip label={b.status} color={b.status === "Success" ? "success" : "error"} size="small" />
  ),
  location: (
    <Chip
      icon={
        <Icon style={{ fontSize: 14 }}>{b.location === "WorkDrive" ? "cloud" : "storage"}</Icon>
      }
      label={b.location}
      color={locationColors[b.location]}
      size="small"
      variant="outlined"
    />
  ),
  actions: (
    <MDBox display="flex" gap={0.5}>
      <Tooltip title="Restore">
        <IconButton size="small" color="info">
          <Icon fontSize="small">restore</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="Upload to WorkDrive">
        <IconButton size="small" color="success" disabled={b.location === "WorkDrive"}>
          <Icon fontSize="small">cloud_upload</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="Convert to MSSQL">
        <IconButton size="small" color="warning" disabled={b.type !== "DB"}>
          <Icon fontSize="small">storage</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error">
          <Icon fontSize="small">delete</Icon>
        </IconButton>
      </Tooltip>
    </MDBox>
  ),
}));

function Backups() {
  const [backupOpen, setBackupOpen] = useState(false);
  const [mssqlOpen, setMssqlOpen] = useState(false);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <MDBox display="flex" alignItems="center" gap={2}>
                <Icon
                  sx={{ fontSize: 40, color: workdriveStatus.connected ? "#4caf50" : "#9e9e9e" }}
                >
                  cloud
                </Icon>
                <MDBox flex={1}>
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <MDTypography variant="h6">Zoho WorkDrive</MDTypography>
                    <Chip
                      label={workdriveStatus.connected ? "Connected" : "Disconnected"}
                      color={workdriveStatus.connected ? "success" : "default"}
                      size="small"
                    />
                  </MDBox>
                  {workdriveStatus.connected && (
                    <>
                      <MDTypography variant="caption" color="text" display="block">
                        {workdriveStatus.user}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        Folder: {workdriveStatus.folder}
                      </MDTypography>
                    </>
                  )}
                </MDBox>
                <MDButton
                  variant="outlined"
                  color={workdriveStatus.connected ? "error" : "info"}
                  size="small"
                >
                  {workdriveStatus.connected ? "Disconnect" : "Connect"}
                </MDButton>
              </MDBox>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <MDTypography variant="h6" mb={1}>
                Quick Actions
              </MDTypography>
              <MDBox display="flex" flexWrap="wrap" gap={1}>
                <MDButton
                  variant="gradient"
                  color="info"
                  size="small"
                  startIcon={<Icon>backup</Icon>}
                  onClick={() => setBackupOpen(true)}
                >
                  Take Backup
                </MDButton>
                <MDButton
                  variant="gradient"
                  color="warning"
                  size="small"
                  startIcon={<Icon>storage</Icon>}
                  onClick={() => setMssqlOpen(true)}
                >
                  Convert to MSSQL
                </MDButton>
                <MDButton
                  variant="gradient"
                  color="success"
                  size="small"
                  startIcon={<Icon>cloud_upload</Icon>}
                >
                  Upload Latest to WorkDrive
                </MDButton>
              </MDBox>
            </Card>
          </Grid>
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
                  Backup History
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  size="small"
                  startIcon={<Icon>backup</Icon>}
                  onClick={() => setBackupOpen(true)}
                >
                  Take Backup
                </MDButton>
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

      <Dialog open={backupOpen} onClose={() => setBackupOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Take Backup</DialogTitle>
        <DialogContent>
          <MDBox display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Machine</InputLabel>
              <Select defaultValue="" label="Machine">
                {["dev-vm-01", "win-test-03", "linux-qa-02", "dev-vm-02"].map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select defaultValue="" label="Product">
                {["Log360", "EventLog Analyzer", "ADAudit Plus", "DataSecurity Plus"].map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Backup Type</InputLabel>
              <Select defaultValue="Full" label="Backup Type">
                <MenuItem value="Full">Full Backup</MenuItem>
                <MenuItem value="DB">DB Backup Only</MenuItem>
                <MenuItem value="Config">Config Backup Only</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Upload to</InputLabel>
              <Select defaultValue="Local" label="Upload to">
                <MenuItem value="Local">Local Storage</MenuItem>
                <MenuItem value="WorkDrive">Zoho WorkDrive</MenuItem>
              </Select>
            </FormControl>
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="error" onClick={() => setBackupOpen(false)}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={() => setBackupOpen(false)}>
            Start Backup
          </MDButton>
        </DialogActions>
      </Dialog>

      <Dialog open={mssqlOpen} onClose={() => setMssqlOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert DB Backup to MSSQL</DialogTitle>
        <DialogContent>
          <MDBox display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Select DB Backup</InputLabel>
              <Select defaultValue="" label="Select DB Backup">
                {backups
                  .filter((b) => b.type === "DB")
                  .map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.machine} / {b.product} — {b.date} ({b.size})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Target MSSQL Server</InputLabel>
              <Select defaultValue="" label="Target MSSQL Server">
                <MenuItem value="local">localhost\SQLEXPRESS</MenuItem>
                <MenuItem value="server1">sql-server-01\MSSQLSERVER</MenuItem>
              </Select>
            </FormControl>
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="error" onClick={() => setMssqlOpen(false)}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="warning" onClick={() => setMssqlOpen(false)}>
            Convert
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default Backups;
