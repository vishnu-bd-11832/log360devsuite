import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Authentication layout
import BasicLayout from "layouts/authentication/components/BasicLayout";

// Zoho OAuth helpers
import {
  parseHashToken,
  fetchZohoUserInfo,
  isAuthorizedUser,
  saveSession,
} from "services/zohoAuth";

// Auth context
import { useAuth } from "context/authContext";

// Background image
import bgImage from "assets/images/bg-sign-in-basic.jpeg";

function ZohoCallback() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  // "processing" | "unauthorized" | "error"
  const [status, setStatus] = useState("processing");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      setStatus("error");
      setDetail("No authentication data received from Zoho.");
      return;
    }

    const { accessToken, expiresIn, error, errorDescription } = parseHashToken(hash);

    if (error) {
      setStatus("error");
      setDetail(errorDescription || error);
      return;
    }

    if (!accessToken) {
      setStatus("error");
      setDetail("No access token was received. Please try again.");
      return;
    }

    fetchZohoUserInfo(accessToken)
      .then((userInfo) => {
        const email = userInfo.Email || userInfo.email || "";
        if (!isAuthorizedUser(email)) {
          setStatus("unauthorized");
          setDetail(email || "(unknown email)");
          return;
        }
        saveSession(userInfo, accessToken, expiresIn);
        signIn(userInfo, accessToken);
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        setStatus("error");
        setDetail(err.message || "An unexpected error occurred.");
      });
  }, []); // eslint-disable-line

  const goToSignIn = () => navigate("/authentication/sign-in", { replace: true });

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
          <MDTypography variant="h5" fontWeight="medium" color="white" mt={1}>
            Log360 Dev Suite
          </MDTypography>
        </MDBox>

        {/* Body */}
        <MDBox pt={4} pb={4} px={3} textAlign="center">
          {/* ── Processing ── */}
          {status === "processing" && (
            <MDBox>
              <CircularProgress color="info" size={40} />
              <MDTypography variant="body2" color="text" mt={2}>
                Verifying your Zoho account&hellip;
              </MDTypography>
            </MDBox>
          )}

          {/* ── Access Denied ── */}
          {status === "unauthorized" && (
            <MDBox>
              <MDTypography variant="h6" color="error" gutterBottom>
                Access Denied
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={1}>
                <strong>{detail}</strong> is not authorised to use this application.
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={3}>
                Access is restricted to members of <strong>wsm-info@zohocorp.com</strong>. Contact
                your team admin if you believe this is a mistake.
              </MDTypography>
              <MDButton variant="gradient" color="info" onClick={goToSignIn}>
                Back to Sign In
              </MDButton>
            </MDBox>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <MDBox>
              <MDTypography variant="h6" color="error" gutterBottom>
                Authentication Error
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={3}>
                {detail}
              </MDTypography>
              <MDButton variant="gradient" color="info" onClick={goToSignIn}>
                Back to Sign In
              </MDButton>
            </MDBox>
          )}
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default ZohoCallback;
