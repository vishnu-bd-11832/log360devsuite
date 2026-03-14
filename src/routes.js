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

/** 
  All of the routes for the Material Dashboard 2 React are added here,
  You can add a new route, customize the routes and delete the routes here.

  Once you add a new route on this file it will be visible automatically on
  the Sidenav.

  For adding a new route you can follow the existing routes in the routes array.
  1. The `type` key with the `collapse` value is used for a route.
  2. The `type` key with the `title` value is used for a title inside the Sidenav. 
  3. The `type` key with the `divider` value is used for a divider between Sidenav items.
  4. The `name` key is used for the name of the route on the Sidenav.
  5. The `key` key is used for the key of the route (It will help you with the key prop inside a loop).
  6. The `icon` key is used for the icon of the route on the Sidenav, you have to add a node.
  7. The `collapse` key is used for making a collapsible item on the Sidenav that has other routes
  inside (nested routes), you need to pass the nested routes inside an array as a value for the `collapse` key.
  8. The `route` key is used to store the route location which is used for the react router.
  9. The `href` key is used to store the external links location.
  10. The `title` key is only for the item with the type of `title` and its used for the title text on the Sidenav.
  10. The `component` key is used to store the component of its route.
*/

import Dashboard from "layouts/dashboard";
import Machines from "layouts/machines";
import Teams from "layouts/teams";
import Agents from "layouts/agents";
import DomainDeploy from "layouts/domain-deploy";
import Products from "layouts/products";
import Installations from "layouts/installations";
import Builds from "layouts/builds";
import Logs from "layouts/logs";
import Backups from "layouts/backups";
import SignIn from "layouts/authentication/sign-in";
import ZohoCallback from "layouts/authentication/callback";

import Icon from "@mui/material/Icon";

const routes = [
  // ── Overview ──────────────────────────────────────────────────────────────
  { type: "title", title: "Overview", key: "overview-title" },
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <Dashboard />,
  },

  // ── Infrastructure ────────────────────────────────────────────────────────
  { type: "title", title: "Infrastructure", key: "infra-title" },
  {
    type: "collapse",
    name: "Machines",
    key: "machines",
    icon: <Icon fontSize="small">computer</Icon>,
    route: "/machines",
    component: <Machines />,
  },
  {
    type: "collapse",
    name: "Teams",
    key: "teams",
    icon: <Icon fontSize="small">groups</Icon>,
    route: "/teams",
    component: <Teams />,
  },
  {
    type: "collapse",
    name: "Agents",
    key: "agents",
    icon: <Icon fontSize="small">memory</Icon>,
    route: "/agents",
    component: <Agents />,
  },
  {
    type: "collapse",
    name: "Domain Deploy",
    key: "domain-deploy",
    icon: <Icon fontSize="small">domain</Icon>,
    route: "/domain-deploy",
    component: <DomainDeploy />,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  { type: "title", title: "Products", key: "products-title" },
  {
    type: "collapse",
    name: "ME Products",
    key: "products",
    icon: <Icon fontSize="small">apps</Icon>,
    route: "/products",
    component: <Products />,
  },
  {
    type: "collapse",
    name: "Installations",
    key: "installations",
    icon: <Icon fontSize="small">install_desktop</Icon>,
    route: "/installations",
    component: <Installations />,
  },
  {
    type: "collapse",
    name: "Builds",
    key: "builds",
    icon: <Icon fontSize="small">build</Icon>,
    route: "/builds",
    component: <Builds />,
  },

  // ── Developer Tools ───────────────────────────────────────────────────────
  { type: "title", title: "Developer Tools", key: "devtools-title" },
  {
    type: "collapse",
    name: "Logs",
    key: "logs",
    icon: <Icon fontSize="small">article</Icon>,
    route: "/logs",
    component: <Logs />,
  },
  {
    type: "collapse",
    name: "Backups",
    key: "backups",
    icon: <Icon fontSize="small">backup</Icon>,
    route: "/backups",
    component: <Backups />,
  },

  // ── Auth routes — not shown in the sidenav (no `type` property) ───────────
  {
    key: "sign-in",
    route: "/authentication/sign-in",
    component: <SignIn />,
    isPublic: true,
  },
  {
    key: "zoho-callback",
    route: "/authentication/callback",
    component: <ZohoCallback />,
    isPublic: true,
  },
];

export default routes;
