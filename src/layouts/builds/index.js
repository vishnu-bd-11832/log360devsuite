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
import MDInput from "components/MDInput";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

const builds = [
  {
    id: "b001",
    product: "Log360",
    buildNumber: "5.3.2",
    url: "https://builds.internal/log360/5.3.2/Log360.exe",
    fileType: ".exe",
    platform: "Windows",
    connector: "Internal Nexus",
    updated: "2024-01-15",
  },
  {
    id: "b002",
    product: "Log360",
    buildNumber: "5.3.1",
    url: "https://builds.internal/log360/5.3.1/Log360.exe",
    fileType: ".exe",
    platform: "Windows",
    connector: "Internal Nexus",
    updated: "2024-01-08",
  },
  {
    id: "b003",
    product: "EventLog Analyzer",
    buildNumber: "12.3.1",
    url: "https://builds.internal/ela/12.3.1/EventLogAnalyzer.exe",
    fileType: ".exe",
    platform: "Windows",
    connector: "Internal Nexus",
    updated: "2024-01-12",
  },
  {
    id: "b004",
    product: "ADAudit Plus",
    buildNumber: "7.1.0",
    url: "https://builds.internal/adap/7.1.0/ADAuditPlus.exe",
    fileType: ".exe",
    platform: "Windows",
    connector: "Internal Nexus",
    updated: "2024-01-10",
  },
  {
    id: "b005",
    product: "DataSecurity Plus",
    buildNumber: "6.0.5",
    url: "https://builds.internal/dsp/6.0.5/DSP.bin",
    fileType: ".bin",
    platform: "Linux",
    connector: "Build Server",
    updated: "2024-01-11",
  },
  {
    id: "b006",
    product: "Endpoint DLP",
    buildNumber: "2.1.3",
    url: "https://builds.internal/edlp/2.1.3/EndpointDLP.ppm",
    fileType: ".ppm",
    platform: "Linux",
    connector: "Build Server",
    updated: "2024-01-09",
  },
  {
    id: "b007",
    product: "Log360 UEBA",
    buildNumber: "4.0.1",
    url: "https://builds.internal/ueba/4.0.1/UEBA.exe",
    fileType: ".exe",
    platform: "Windows",
    connector: "Internal Nexus",
    updated: "2024-01-14",
  },
];

const fileTypeColors = { ".exe": "primary", ".bin": "success", ".ppm": "warning" };

const columns = [
  { Header: "product", accessor: "product", width: "18%" },
  { Header: "build number", accessor: "buildNumber", width: "12%" },
  { Header: "file type", accessor: "fileType", width: "10%" },
  { Header: "platform", accessor: "platform", width: "10%" },
  { Header: "connector", accessor: "connector", width: "14%" },
  { Header: "download url", accessor: "url", width: "22%" },
  { Header: "updated", accessor: "updated", width: "8%" },
  { Header: "actions", accessor: "actions", width: "6%", isSorted: false },
];

const rows = builds.map((b) => ({
  product: (
    <MDTypography variant="button" fontWeight="medium">
      {b.product}
    </MDTypography>
  ),
  buildNumber: <Chip label={b.buildNumber} size="small" color="info" variant="outlined" />,
  fileType: (
    <Chip label={b.fileType} size="small" color={fileTypeColors[b.fileType] || "default"} />
  ),
  platform: (
    <MDBox display="flex" alignItems="center" gap={0.5}>
      <Icon fontSize="small" sx={{ color: b.platform === "Windows" ? "#0078d4" : "#ff6600" }}>
        {b.platform === "Windows" ? "desktop_windows" : "terminal"}
      </Icon>
      <MDTypography variant="caption">{b.platform}</MDTypography>
    </MDBox>
  ),
  connector: (
    <MDTypography variant="caption" color="text">
      {b.connector}
    </MDTypography>
  ),
  url: (
    <MDTypography
      variant="caption"
      color="info"
      sx={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: 200,
        display: "block",
      }}
      title={b.url}
    >
      {b.url}
    </MDTypography>
  ),
  updated: (
    <MDTypography variant="caption" color="text">
      {b.updated}
    </MDTypography>
  ),
  actions: (
    <MDBox display="flex" gap={0.5}>
      <Tooltip title="Edit">
        <IconButton size="small" color="info">
          <Icon fontSize="small">edit</Icon>
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

const connectors = [
  {
    name: "Internal Nexus",
    type: "Nexus Repository",
    url: "https://nexus.internal",
    status: "Connected",
  },
  {
    name: "Build Server",
    type: "HTTP File Server",
    url: "https://builds.internal",
    status: "Connected",
  },
  { name: "AWS S3 Bucket", type: "S3", url: "s3://me-builds-bucket", status: "Disconnected" },
];

function Builds() {
  const [addOpen, setAddOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const handleExportJson = () => {
    setJsonText(
      JSON.stringify(
        builds.map(({ id, ...rest }) => rest),
        null,
        2
      )
    );
    setJsonDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3}>
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
                  Build Configurations
                </MDTypography>
                <MDBox display="flex" gap={1}>
                  <MDButton
                    variant="outlined"
                    color="white"
                    size="small"
                    startIcon={<Icon>upload_file</Icon>}
                    onClick={handleExportJson}
                  >
                    Import / Export JSON
                  </MDButton>
                  <MDButton
                    variant="contained"
                    color="white"
                    size="small"
                    startIcon={<Icon>add</Icon>}
                    onClick={() => setAddOpen(true)}
                  >
                    Add Build
                  </MDButton>
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

          <Grid item xs={12}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6" gutterBottom>
                  Connectors
                </MDTypography>
                <MDTypography variant="caption" color="text" display="block" mb={2}>
                  Connectors define where build files (.exe / .bin / .ppm) are downloaded from.
                </MDTypography>
                <Grid container spacing={2}>
                  {connectors.map((c) => (
                    <Grid item xs={12} md={4} key={c.name}>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <MDBox
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <MDBox>
                            <MDTypography variant="button" fontWeight="bold">
                              {c.name}
                            </MDTypography>
                            <MDTypography variant="caption" color="text" display="block">
                              {c.type}
                            </MDTypography>
                            <MDTypography
                              variant="caption"
                              color="info"
                              sx={{ wordBreak: "break-all" }}
                            >
                              {c.url}
                            </MDTypography>
                          </MDBox>
                          <Chip
                            label={c.status}
                            color={c.status === "Connected" ? "success" : "error"}
                            size="small"
                          />
                        </MDBox>
                        <MDBox display="flex" gap={1} mt={1}>
                          <MDButton variant="text" color="info" size="small">
                            Configure
                          </MDButton>
                          <MDButton variant="text" color="error" size="small">
                            Remove
                          </MDButton>
                        </MDBox>
                      </Card>
                    </Grid>
                  ))}
                  <Grid item xs={12} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        minHeight: 110,
                      }}
                    >
                      <MDBox textAlign="center">
                        <Icon sx={{ fontSize: 32, color: "#aaa" }}>add_circle_outline</Icon>
                        <MDTypography variant="caption" color="text" display="block">
                          Add Connector
                        </MDTypography>
                      </MDBox>
                    </Card>
                  </Grid>
                </Grid>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Build Configuration</DialogTitle>
        <DialogContent>
          <MDBox display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select defaultValue="" label="Product">
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
            <MDInput label="Build Number" fullWidth size="small" />
            <MDInput label="Download URL" fullWidth size="small" />
            <FormControl fullWidth size="small">
              <InputLabel>File Type</InputLabel>
              <Select defaultValue="" label="File Type">
                <MenuItem value=".exe">.exe (Windows InstallShield)</MenuItem>
                <MenuItem value=".bin">.bin (Linux)</MenuItem>
                <MenuItem value=".ppm">.ppm (Plugin Package)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Connector</InputLabel>
              <Select defaultValue="" label="Connector">
                {connectors.map((c) => (
                  <MenuItem key={c.name} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="error" onClick={() => setAddOpen(false)}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={() => setAddOpen(false)}>
            Save
          </MDButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import / Export Build JSON</DialogTitle>
        <DialogContent>
          <MDTypography variant="caption" color="text" display="block" mb={1}>
            Edit the JSON below to bulk-update build configurations, then click Import.
          </MDTypography>
          <MDBox
            component="textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            sx={{
              width: "100%",
              height: 320,
              fontFamily: "monospace",
              fontSize: 12,
              p: 1,
              border: "1px solid #ccc",
              borderRadius: 1,
              resize: "vertical",
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="error" onClick={() => setJsonDialogOpen(false)}>
            Close
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={() => setJsonDialogOpen(false)}>
            Import
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default Builds;
