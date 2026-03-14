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

const teams = [
  {
    id: "T001",
    name: "Engineering",
    parentId: null,
    parentName: "—",
    members: 12,
    machines: 8,
    description: "Root engineering team",
  },
  {
    id: "T002",
    name: "QA",
    parentId: "T001",
    parentName: "Engineering",
    members: 5,
    machines: 4,
    description: "Quality assurance sub-team",
  },
  {
    id: "T003",
    name: "Dev",
    parentId: "T001",
    parentName: "Engineering",
    members: 6,
    machines: 3,
    description: "Core development sub-team",
  },
  {
    id: "T004",
    name: "Build",
    parentId: "T001",
    parentName: "Engineering",
    members: 3,
    machines: 2,
    description: "CI/CD and build automation",
  },
  {
    id: "T005",
    name: "Infra",
    parentId: null,
    parentName: "—",
    members: 4,
    machines: 6,
    description: "Infrastructure and VMs",
  },
  {
    id: "T006",
    name: "Security",
    parentId: "T005",
    parentName: "Infra",
    members: 3,
    machines: 2,
    description: "Security testing team",
  },
];

const columns = [
  { Header: "team name", accessor: "name", width: "22%" },
  { Header: "team ID", accessor: "id", width: "10%" },
  { Header: "parent team", accessor: "parent", width: "16%" },
  { Header: "members", accessor: "members", width: "12%" },
  { Header: "machines", accessor: "machines", width: "12%" },
  { Header: "description", accessor: "description", width: "18%" },
  { Header: "actions", accessor: "actions", width: "10%", isSorted: false },
];

const rows = teams.map((t) => ({
  name: (
    <MDBox display="flex" alignItems="center" gap={1}>
      {t.parentId && (
        <Icon fontSize="small" sx={{ color: "#aaa", ml: 1 }}>
          subdirectory_arrow_right
        </Icon>
      )}
      <Icon fontSize="small" color="info">
        groups
      </Icon>
      <MDTypography variant="button" fontWeight="medium">
        {t.name}
      </MDTypography>
    </MDBox>
  ),
  id: <Chip label={t.id} size="small" variant="outlined" />,
  parent: t.parentId ? (
    <Chip label={t.parentName} size="small" color="default" />
  ) : (
    <MDTypography variant="caption" color="text">
      Root
    </MDTypography>
  ),
  members: (
    <MDBox display="flex" alignItems="center" gap={0.5}>
      <Icon fontSize="small" sx={{ color: "#666" }}>
        person
      </Icon>
      <MDTypography variant="button">{t.members}</MDTypography>
    </MDBox>
  ),
  machines: (
    <MDBox display="flex" alignItems="center" gap={0.5}>
      <Icon fontSize="small" sx={{ color: "#666" }}>
        computer
      </Icon>
      <MDTypography variant="button">{t.machines}</MDTypography>
    </MDBox>
  ),
  description: (
    <MDTypography variant="caption" color="text">
      {t.description}
    </MDTypography>
  ),
  actions: (
    <MDBox display="flex" gap={0.5}>
      <Tooltip title="Edit Team">
        <IconButton size="small" color="info">
          <Icon fontSize="small">edit</Icon>
        </IconButton>
      </Tooltip>
      <Tooltip title="Manage Members">
        <IconButton size="small" color="default">
          <Icon fontSize="small">manage_accounts</Icon>
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

function Teams() {
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
                  Teams
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  size="small"
                  startIcon={<Icon>add</Icon>}
                >
                  Create Team
                </MDButton>
              </MDBox>
              <MDBox p={2}>
                <MDTypography variant="caption" color="text">
                  Teams with a parent are nested sub-teams. Machines and members can belong to
                  multiple teams.
                </MDTypography>
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

export default Teams;
