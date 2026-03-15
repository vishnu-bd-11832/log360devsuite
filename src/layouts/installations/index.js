import { useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
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
import MDInput from "components/MDInput";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

const installations = [
  {
    id: "inst-001",
    product: "Log360",
    version: "5.3.2",
    machine: "dev-vm-01",
    status: "Complete",
    progress: 100,
    started: "Today 10:42 AM",
    duration: "8m 32s",
    installedBy: "john.doe",
  },
  {
    id: "inst-002",
    product: "EventLog Analyzer",
    version: "12.3.1",
    machine: "win-test-03",
    status: "Running",
    progress: 63,
    started: "Today 11:15 AM",
    duration: "4m 10s",
    installedBy: "jane.smith",
  },
  {
    id: "inst-003",
    product: "ADAudit Plus",
    version: "7.1.0",
    machine: "linux-qa-02",
    status: "Failed",
    progress: 35,
    started: "Today 09:58 AM",
    duration: "2m 05s",
    installedBy: "alice.k",
  },
  {
    id: "inst-004",
    product: "Log360 UEBA",
    version: "4.0.1",
    machine: "dev-vm-02",
    status: "Pending",
    progress: 0,
    started: "—",
    duration: "—",
    installedBy: "bob.t",
  },
  {
    id: "inst-005",
    product: "DataSecurity Plus",
    version: "6.0.5",
    machine: "linux-build-01",
    status: "Complete",
    progress: 100,
    started: "Yesterday 4:30 PM",
    duration: "11m 20s",
    installedBy: "carol.m",
  },
  {
    id: "inst-006",
    product: "Endpoint DLP",
    version: "2.1.3",
    machine: "win-test-01",
    status: "Pending",
    progress: 0,
    started: "—",
    duration: "—",
    installedBy: "dave.r",
  },
  {
    id: "inst-007",
    product: "Exchange Reporter Plus",
    version: "5.7.2",
    machine: "win-dev-05",
    status: "Complete",
    progress: 100,
    started: "Yesterday 2:00 PM",
    duration: "6m 44s",
    installedBy: "john.doe",
  },
];

const statusColors = {
  Complete: "success",
  Running: "info",
  Failed: "error",
  Pending: "warning",
};

const columns = [
  { Header: "product", accessor: "product", width: "18%" },
  { Header: "version", accessor: "version", width: "10%" },
  { Header: "machine", accessor: "machine", width: "14%" },
  { Header: "status / progress", accessor: "statusProgress", width: "22%" },
  { Header: "started", accessor: "started", width: "16%" },
  { Header: "duration", accessor: "duration", width: "10%" },
  { Header: "actions", accessor: "actions", width: "10%", isSorted: false },
];

const rows = installations.map((inst) => ({
  product: (
    <MDTypography variant="button" fontWeight="medium">
      {inst.product}
    </MDTypography>
  ),
  version: <Chip label={inst.version} size="small" variant="outlined" />,
  machine: (
    <MDTypography variant="caption" color="text">
      {inst.machine}
    </MDTypography>
  ),
  statusProgress: (
    <MDBox>
      <MDBox display="flex" alignItems="center" gap={1} mb={0.5}>
        <Chip label={inst.status} color={statusColors[inst.status]} size="small" />
        {inst.status === "Running" && (
          <MDTypography variant="caption" color="text">
            {inst.progress}%
          </MDTypography>
        )}
      </MDBox>
      {inst.status === "Running" && (
        <LinearProgress
          variant="determinate"
          value={inst.progress}
          color="info"
          sx={{ height: 6, borderRadius: 3, width: 120 }}
        />
      )}
    </MDBox>
  ),
  started: (
    <MDTypography variant="caption" color="text">
      {inst.started}
    </MDTypography>
  ),
  duration: (
    <MDTypography variant="caption" color="text">
      {inst.duration}
    </MDTypography>
  ),
  actions: (
    <MDBox display="flex" gap={0.5}>
      <Tooltip title="View Log">
        <IconButton size="small" color="info">
          <Icon fontSize="small">article</Icon>
        </IconButton>
      </Tooltip>
      {inst.status === "Failed" && (
        <Tooltip title="Retry">
          <IconButton size="small" color="warning">
            <Icon fontSize="small">replay</Icon>
          </IconButton>
        </Tooltip>
      )}
      {inst.status === "Running" && (
        <Tooltip title="Cancel">
          <IconButton size="small" color="error">
            <Icon fontSize="small">stop_circle</Icon>
          </IconButton>
        </Tooltip>
      )}
    </MDBox>
  ),
}));

function Installations() {
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState("");
  const [newMachine, setNewMachine] = useState("");

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
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
                  Installations
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  size="small"
                  startIcon={<Icon>add</Icon>}
                  onClick={() => setOpen(true)}
                >
                  New Installation
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Installation</DialogTitle>
        <DialogContent>
          <MDBox display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select
                value={newProduct}
                label="Product"
                onChange={(e) => setNewProduct(e.target.value)}
              >
                {[
                  "Log360",
                  "EventLog Analyzer",
                  "ADAudit Plus",
                  "DataSecurity Plus",
                  "Endpoint DLP",
                  "Log360 UEBA",
                ].map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Build</InputLabel>
              <Select value="" label="Build">
                <MenuItem value="5.3.2">5.3.2 (Latest)</MenuItem>
                <MenuItem value="5.3.1">5.3.1</MenuItem>
                <MenuItem value="5.2.0">5.2.0</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Target Machine</InputLabel>
              <Select
                value={newMachine}
                label="Target Machine"
                onChange={(e) => setNewMachine(e.target.value)}
              >
                {["dev-vm-01", "win-test-03", "linux-qa-02", "dev-vm-02", "win-test-01"].map(
                  (m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
            <MDInput label="Install Directory (optional)" fullWidth size="small" />
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="error" onClick={() => setOpen(false)}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={() => setOpen(false)}>
            Start Installation
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default Installations;
