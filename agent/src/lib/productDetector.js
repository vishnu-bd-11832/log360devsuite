/**
 * ManageEngine Product Detector
 *
 * Scans well-known installation directories for ManageEngine products and
 * tries to determine whether each product is currently running by checking
 * the process list.
 *
 * Detection patterns:
 *  Windows: C:\Program Files\ManageEngine\<ProductDir>\
 *           C:\ManageEngine\<ProductDir>\
 *  Linux:   /opt/manageengine/<productdir>/
 *           /opt/ME<ProductDir>/
 */

"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../config");
const api = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

// ── Known product definitions ─────────────────────────────────────────────────

const PRODUCTS = [
  {
    key: "Log360",
    name: "Log360",
    winDirs: ["Log360", "ManageEngine\\Log360"],
    linuxDirs: ["log360", "Log360"],
    processNames: ["log360.exe", "startlog360.exe", "java"],
    defaultPort: 8082,
    serviceStartScript: IS_WINDOWS ? "startlog360.bat" : "log360.sh",
  },
  {
    key: "EventLogAnalyzer",
    name: "EventLog Analyzer",
    winDirs: ["EventLog Analyzer", "ManageEngine\\EventLog Analyzer"],
    linuxDirs: ["eventloganalyzer", "EventLog Analyzer"],
    processNames: ["EventLogAnalyzer.exe", "startELA.exe", "java"],
    defaultPort: 8400,
    serviceStartScript: IS_WINDOWS ? "startELA.bat" : "ELA.sh",
  },
  {
    key: "ADAuditPlus",
    name: "ADAudit Plus",
    winDirs: ["ADAuditPlus", "ManageEngine\\ADAuditPlus"],
    linuxDirs: ["adauditplus", "ADAuditPlus"],
    processNames: ["ADAuditPlus.exe", "java"],
    defaultPort: 8081,
    serviceStartScript: IS_WINDOWS ? "startADAuditPlus.bat" : "ADAuditPlus.sh",
  },
  {
    key: "DataSecurityPlus",
    name: "DataSecurity Plus",
    winDirs: ["DataSecurity Plus", "ManageEngine\\DataSecurity Plus"],
    linuxDirs: ["datasecurityplus"],
    processNames: ["DataSecurityPlus.exe", "java"],
    defaultPort: 8888,
    serviceStartScript: IS_WINDOWS ? "startDSP.bat" : "DSP.sh",
  },
  {
    key: "CloudSecurityPlus",
    name: "Cloud Security Plus",
    winDirs: ["Cloud Security Plus", "ManageEngine\\Cloud Security Plus"],
    linuxDirs: ["cloudsecurityplus"],
    processNames: ["CloudSecurityPlus.exe", "java"],
    defaultPort: 8443,
    serviceStartScript: IS_WINDOWS ? "startCSP.bat" : "CSP.sh",
  },
  {
    key: "ExchangeReporterPlus",
    name: "Exchange Reporter Plus",
    winDirs: ["Exchange Reporter Plus", "ManageEngine\\Exchange Reporter Plus"],
    linuxDirs: [],
    processNames: ["ExchangeReporter.exe", "java"],
    defaultPort: 8333,
    serviceStartScript: "startERP.bat",
  },
  {
    key: "O365Manager",
    name: "O365 Manager Plus",
    winDirs: ["O365 Manager Plus", "ManageEngine\\O365 Manager Plus"],
    linuxDirs: [],
    processNames: ["O365ManagerPlus.exe", "java"],
    defaultPort: 8365,
    serviceStartScript: "startO365.bat",
  },
  {
    key: "M365SecurityPlus",
    name: "M365 Security Plus",
    winDirs: ["M365 Security Plus", "ManageEngine\\M365 Security Plus"],
    linuxDirs: ["m365securityplus"],
    processNames: ["M365SecurityPlus.exe", "java"],
    defaultPort: 8800,
    serviceStartScript: IS_WINDOWS ? "startM365.bat" : "M365.sh",
  },
  {
    key: "EndpointDLP",
    name: "Endpoint DLP Plus",
    winDirs: ["Endpoint DLP", "ManageEngine\\Endpoint DLP"],
    linuxDirs: ["endpointdlp"],
    processNames: ["EndpointDLP.exe", "java"],
    defaultPort: 8081,
    serviceStartScript: IS_WINDOWS ? "startDLP.bat" : "DLP.sh",
  },
  {
    key: "Log360UEBA",
    name: "Log360 UEBA",
    winDirs: ["Log360 UEBA", "ManageEngine\\Log360 UEBA"],
    linuxDirs: ["log360ueba"],
    processNames: ["Log360UEBA.exe", "java"],
    defaultPort: 8898,
    serviceStartScript: IS_WINDOWS ? "startUEBA.bat" : "UEBA.sh",
  },
];

// ── Scan base directories ─────────────────────────────────────────────────────

const WIN_BASE_DIRS = [
  "C:\\Program Files\\ManageEngine",
  "C:\\ManageEngine",
  "D:\\ManageEngine",
  "C:\\Program Files (x86)\\ManageEngine",
];

const LINUX_BASE_DIRS = ["/opt/manageengine", "/opt/ME", "/usr/local/manageengine"];

function getBaseDirs() {
  return IS_WINDOWS ? WIN_BASE_DIRS : LINUX_BASE_DIRS;
}

function tryReadVersion(installPath) {
  const candidates = [
    path.join(installPath, "conf", "about.properties"),
    path.join(installPath, "build.info"),
    path.join(installPath, "lib", "version.properties"),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const text = fs.readFileSync(f, "utf8");
      const m = text.match(/build[\s=]+(\d+)/i) || text.match(/version[\s=]+([^\s\r\n]+)/i);
      if (m) return m[1].trim();
    }
  }
  return "unknown";
}

function detectProducts(processes) {
  const runningNames = new Set(
    processes.map((p) => (p.name || "").toLowerCase().split(/[/\\]/).pop())
  );

  const results = [];

  for (const product of PRODUCTS) {
    const baseDirs = getBaseDirs();
    let installPath = null;
    const dirs = IS_WINDOWS ? product.winDirs : product.linuxDirs;

    for (const base of baseDirs) {
      for (const subdir of dirs) {
        const candidate = path.join(base, subdir);
        if (fs.existsSync(candidate)) {
          installPath = candidate;
          break;
        }
      }
      if (installPath) break;
    }

    if (!installPath) {
      results.push({
        product_key: product.key,
        product_name: product.name,
        status: "Not Installed",
        install_path: "",
        port: String(product.defaultPort),
        version: "",
        detected_at: new Date().toISOString(),
      });
      continue;
    }

    // Check if any related process is running
    const isRunning = product.processNames.some((pn) =>
      runningNames.has(pn.toLowerCase())
    );

    results.push({
      product_key: product.key,
      product_name: product.name,
      status: isRunning ? "Running" : "Stopped",
      install_path: installPath,
      port: String(product.defaultPort),
      version: tryReadVersion(installPath),
      detected_at: new Date().toISOString(),
    });
  }

  return results;
}

async function scanAndPush(processes, logger) {
  try {
    const products = detectProducts(processes);
    const running = products.filter((p) => p.status === "Running").length;
    const installed = products.filter((p) => p.status !== "Not Installed").length;
    logger.info(
      `[product-detector] ${installed} installed, ${running} running`
    );
    await api.pushProductList(config.machineId, products);
    return products;
  } catch (err) {
    logger.warn("[product-detector] Scan failed:", err.message);
    return [];
  }
}

module.exports = { detectProducts, scanAndPush, PRODUCTS };
