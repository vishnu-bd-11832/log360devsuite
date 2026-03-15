/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import ReportsLineChart from "examples/Charts/LineCharts/ReportsLineChart";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";
import DataTable from "examples/Tables/DataTable";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";

import reportsBarChartData from "layouts/dashboard/data/reportsBarChartData";
import reportsLineChartData from "layouts/dashboard/data/reportsLineChartData";

const recentActivityColumns = [
  { Header: "time", accessor: "time", width: "15%" },
  { Header: "machine", accessor: "machine", width: "20%" },
  { Header: "action", accessor: "action", width: "35%" },
  { Header: "status", accessor: "status", width: "15%" },
  { Header: "user", accessor: "user", width: "15%" },
];

const recentActivityRows = [
  {
    time: "10:42 AM",
    machine: "dev-vm-01",
    action: "Installed Log360 build 12345",
    status: <Chip label="Success" color="success" size="small" />,
    user: "john.doe",
  },
  {
    time: "10:15 AM",
    machine: "win-test-03",
    action: "DB Backup — EventLog Analyzer",
    status: <Chip label="Success" color="success" size="small" />,
    user: "jane.smith",
  },
  {
    time: "09:58 AM",
    machine: "linux-qa-02",
    action: "Agent connected",
    status: <Chip label="Online" color="info" size="small" />,
    user: "system",
  },
  {
    time: "09:30 AM",
    machine: "win-dev-05",
    action: "Installed ADAudit Plus build 7890",
    status: <Chip label="Failed" color="error" size="small" />,
    user: "alice.k",
  },
  {
    time: "09:05 AM",
    machine: "dev-vm-02",
    action: "Log read — Log360 UEBA",
    status: <Chip label="Success" color="success" size="small" />,
    user: "bob.t",
  },
  {
    time: "08:47 AM",
    machine: "win-test-01",
    action: "Uploaded backup to WorkDrive",
    status: <Chip label="Success" color="success" size="small" />,
    user: "jane.smith",
  },
];

function Dashboard() {
  const { agentUptime, products } = reportsLineChartData;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="dark"
                icon="computer"
                title="Total Machines"
                count={24}
                percentage={{ color: "success", amount: "+2", label: "added this week" }}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="info"
                icon="memory"
                title="Active Agents"
                count={18}
                percentage={{ color: "success", amount: "75%", label: "of machines online" }}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="success"
                icon="apps"
                title="Products Running"
                count={45}
                percentage={{ color: "success", amount: "+3", label: "since yesterday" }}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="warning"
                icon="pending_actions"
                title="Pending Installs"
                count={7}
                percentage={{ color: "error", amount: "+2", label: "queued today" }}
              />
            </MDBox>
          </Grid>
        </Grid>

        <MDBox mt={4.5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsBarChart
                  color="info"
                  title="Installation Activity"
                  description="Number of installs in last 7 days"
                  date="updated today"
                  chart={reportsBarChartData}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsLineChart
                  color="success"
                  title="Agent Uptime"
                  description="Agents online per day (last 7 days)"
                  date="updated 5 min ago"
                  chart={agentUptime}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsLineChart
                  color="dark"
                  title="Products Running"
                  description="ME products active per day"
                  date="just updated"
                  chart={products}
                />
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>

        <MDBox mt={2}>
          <Card>
            <MDBox p={3}>
              <MDTypography variant="h6" gutterBottom>
                Recent Activity
              </MDTypography>
              <DataTable
                table={{ columns: recentActivityColumns, rows: recentActivityRows }}
                isSorted={false}
                entriesPerPage={false}
                showTotalEntries={false}
                noEndBorder
              />
            </MDBox>
          </Card>
        </MDBox>
      </MDBox>
    </DashboardLayout>
  );
}

export default Dashboard;
