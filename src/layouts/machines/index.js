import { useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

const allMachines = [
  {
    id: "m001",
    name: "dev-vm-01",
    type: "user",
    os: "Windows",
    owner: "john.doe",
    agentVersion: "1.4.2",
    status: "Online",
    ip: "192.168.1.101",
  },
  {
    id: "m002",
    name: "win-test-03",
    type: "team",
    os: "Windows",
    owner: "Team: QA",
    agentVersion: "1.4.2",
    status: "Online",
    ip: "192.168.1.103",
  },
  {
    id: "m003",
    name: "linux-qa-02",
    type: "team",
    os: "Linux",
    owner: "Team: QA",
    agentVersion: "1.3.8",
    status: "Online",
    ip: "192.168.1.112",
  },
  {
    id: "m004",
    name: "win-dev-05",
    type: "user",
    os: "Windows",
    owner: "alice.k",
    agentVersion: "1.4.1",
    status: "Offline",
    ip: "192.168.1.105",
  },
  {
    id: "m005",
    name: "dev-vm-02",
    type: "user",
    os: "Linux",
    owner: "bob.t",
    agentVersion: "1.4.2",
    status: "Online",
    ip: "192.168.2.10",
  },
  {
    id: "m006",
    name: "win-test-01",
    type: "team",
    os: "Windows",
    owner: "Team: Dev",
    agentVersion: "1.4.0",
    status: "Online",
    ip: "192.168.1.201",
  },
  {
    id: "m007",
    name: "linux-build-01",
    type: "team",
    os: "Linux",
    owner: "Team: Build",
    agentVersion: "1.4.2",
    status: "Online",
    ip: "192.168.3.50",
  },
  {
    id: "m008",
    name: "win-dev-09",
    type: "user",
    os: "Windows",
    owner: "carol.m",
    agentVersion: "1.3.9",
    status: "Offline",
    ip: "192.168.1.209",
  },
  {
    id: "m009",
    name: "linux-dev-04",
    type: "user",
    os: "Linux",
    owner: "dave.r",
    agentVersion: "1.4.2",
    status: "Online",
    ip: "192.168.2.44",
  },
  {
    id: "m010",
    name: "team-shared-vm",
    type: "team",
    os: "Windows",
    owner: "Team: Infra",
    agentVersion: "1.4.2",
    status: "Online",
    ip: "192.168.4.1",
  },
];

function buildRows(machines) {
  return machines.map((m) => ({
    name: (
      <MDBox display="flex" alignItems="center" gap={1}>
        <Icon fontSize="small" sx={{ color: m.os === "Windows" ? "#0078d4" : "#ff6600" }}>
          {m.os === "Windows" ? "desktop_windows" : "terminal"}
        </Icon>
        <MDTypography variant="button" fontWeight="medium">
          {m.name}
        </MDTypography>
      </MDBox>
    ),
    type: (
      <Chip
        label={m.type === "user" ? "User" : "Team"}
        color={m.type === "user" ? "primary" : "secondary"}
        size="small"
        variant="outlined"
      />
    ),
    os: m.os,
    status: (
      <Chip label={m.status} color={m.status === "Online" ? "success" : "default"} size="small" />
    ),
    owner: m.owner,
    agentVersion: m.agentVersion,
    actions: (
      <MDBox display="flex" gap={0.5}>
        <Tooltip title="View Details">
          <IconButton size="small" color="info">
            <Icon fontSize="small">visibility</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title="View Logs">
          <IconButton size="small" color="default">
            <Icon fontSize="small">article</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove">
          <IconButton size="small" color="error">
            <Icon fontSize="small">delete</Icon>
          </IconButton>
        </Tooltip>
      </MDBox>
    ),
  }));
}

const columns = [
  { Header: "name", accessor: "name", width: "22%" },
  { Header: "type", accessor: "type", width: "10%" },
  { Header: "os", accessor: "os", width: "10%" },
  { Header: "status", accessor: "status", width: "10%" },
  { Header: "owner / team", accessor: "owner", width: "18%" },
  { Header: "agent version", accessor: "agentVersion", width: "14%" },
  { Header: "actions", accessor: "actions", width: "16%", isSorted: false },
];

function Machines() {
  const [tab, setTab] = useState(0);

  const filtered =
    tab === 0
      ? allMachines
      : tab === 1
      ? allMachines.filter((m) => m.type === "user")
      : allMachines.filter((m) => m.type === "team");

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
                  Machines
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  size="small"
                  startIcon={<Icon>add</Icon>}
                >
                  Add Machine
                </MDButton>
              </MDBox>
              <MDBox px={3} pt={2}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  textColor="info"
                  indicatorColor="info"
                >
                  <Tab label={`All (${allMachines.length})`} />
                  <Tab
                    label={`User Machines (${allMachines.filter((m) => m.type === "user").length})`}
                  />
                  <Tab
                    label={`Team Machines (${allMachines.filter((m) => m.type === "team").length})`}
                  />
                </Tabs>
              </MDBox>
              <MDBox pt={1}>
                <DataTable
                  table={{ columns, rows: buildRows(filtered) }}
                  isSorted={false}
                  entriesPerPage={{ defaultValue: 10 }}
                  showTotalEntries
                  canSearch
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Machines;
