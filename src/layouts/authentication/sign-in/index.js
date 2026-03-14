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

import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import LockIcon from "@mui/icons-material/Lock";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import BasicLayout from "layouts/authentication/components/BasicLayout";
import { initiateZohoLogin } from "services/zohoAuth";
import bgImage from "assets/images/bg-sign-in-basic.jpeg";

function SignIn() {
  return (
    <BasicLayout image={bgImage}>
      <Card>
        {/* Header */}
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="info"
          mx={2}
          mt={-3}
          p={2}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            Log360 Dev Suite
          </MDTypography>
          <MDTypography variant="body2" color="white" opacity={0.8} mt={0.5}>
            ManageEngine Internal Developer Portal
          </MDTypography>
        </MDBox>

        {/* Body */}
        <MDBox pt={4} pb={4} px={3} textAlign="center">
          {/* Zoho OAuth button */}
          <MDButton
            variant="contained"
            fullWidth
            onClick={initiateZohoLogin}
            sx={{
              backgroundColor: "#F05A28",
              "&:hover": { backgroundColor: "#d44e22" },
              color: "#fff",
              fontWeight: "bold",
              fontSize: "0.9rem",
              py: 1.5,
              textTransform: "none",
            }}
          >
            Sign in with Zoho
          </MDButton>

          <Divider sx={{ my: 2.5 }} />

          {/* Access restriction notice */}
          <MDBox display="flex" alignItems="flex-start" gap={1}>
            <LockIcon sx={{ fontSize: 18, mt: 0.25, color: "text.secondary" }} />
            <MDTypography variant="caption" color="text" textAlign="left">
              Access is restricted to members of <strong>wsm-info@zohocorp.com</strong>. Sign in
              with your Zoho corporate account. If you need access, contact your team admin.
            </MDTypography>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default SignIn;
