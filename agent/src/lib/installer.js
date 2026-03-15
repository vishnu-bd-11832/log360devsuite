/**
 * Installer — executes product installations via InstallShield silent install
 * or standard binary installers.
 *
 * Windows: .exe /s /f1"<response-file>"  (InstallShield)
 *          .exe /SILENT /NORESTART        (NSIS/InnoSetup)
 * Linux:   chmod +x installer.bin && ./installer.bin --unattended
 *          .ppm (ManageEngine-specific) via package manager script
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { spawn } = require("child_process");
const os = require("os");
const config = require("../config");
const api = require("./catalystClient");

const IS_WINDOWS = process.platform === "win32";

// ── Download helper ───────────────────────────────────────────────────────────

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);
    client
      .get(url, (res) => {
        if (res.statusCode >= 400) {
          file.destroy();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        file.destroy();
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

// ── Execute installer ─────────────────────────────────────────────────────────

function runInstaller(installerPath, fileType, issPath) {
  return new Promise((resolve, reject) => {
    let cmd;
    let args;

    if (IS_WINDOWS) {
      if (fileType === "exe") {
        cmd = installerPath;
        if (issPath && fs.existsSync(issPath)) {
          // InstallShield silent install with recorded response file
          args = ["/s", `/f1${issPath}`, "/f2nul"];
        } else {
          // NSIS / InnoSetup silent
          args = ["/SILENT", "/NORESTART", "/SUPPRESSMSGBOXES"];
        }
      } else if (fileType === "ppm") {
        // ManageEngine .ppm via the PPM installer
        cmd = "ppm.exe";
        args = [installerPath];
      } else {
        return reject(new Error(`Unsupported file type on Windows: ${fileType}`));
      }
    } else {
      if (fileType === "bin") {
        // Ensure executable
        fs.chmodSync(installerPath, 0o755);
        cmd = installerPath;
        args = ["--unattended"];
      } else if (fileType === "ppm") {
        cmd = "bash";
        args = [installerPath];
      } else {
        return reject(new Error(`Unsupported file type on Linux: ${fileType}`));
      }
    }

    const logLines = [];
    const child = spawn(cmd, args, { shell: IS_WINDOWS });

    child.stdout.on("data", (d) => logLines.push(d.toString()));
    child.stderr.on("data", (d) => logLines.push(`STDERR: ${d.toString()}`));

    child.on("close", (code) => {
      if (code === 0 || code === 3010 /* reboot required */) {
        resolve(logLines.join(""));
      } else {
        reject(new Error(`Installer exited with code ${code}\n${logLines.join("")}`));
      }
    });

    child.on("error", reject);
  });
}

// ── Main install flow ─────────────────────────────────────────────────────────

async function executeInstallation(task, logger) {
  const { install_id: installId, machine_id: machineId, file_url: fileUrl, file_type: fileType, iss_path: issPath } = task;

  logger.info(`[installer] Starting install for task ${installId} (${fileType})`);

  const tmpDir = os.tmpdir();
  const ext = fileType === "exe" ? ".exe" : fileType === "bin" ? ".bin" : ".ppm";
  const tmpFile = path.join(tmpDir, `log360_install_${installId}${ext}`);

  try {
    // 1. Report running
    await api.reportCommandResult(machineId, installId, {
      status: "running",
      logOutput: "Downloading installer...",
    });

    // 2. Download
    if (fileUrl) {
      logger.info(`[installer] Downloading ${fileUrl}`);
      await downloadFile(fileUrl, tmpFile);
    } else {
      throw new Error(`No download URL provided for installation task ${installId}`);
    }

    // 3. Execute
    logger.info(`[installer] Executing ${tmpFile}`);
    const log = await runInstaller(tmpFile, fileType, issPath);

    // 4. Report success
    await api.reportCommandResult(machineId, installId, {
      status: "complete",
      logOutput: log.slice(-4096), // keep last 4 KB of log
    });

    logger.info(`[installer] Task ${installId} completed successfully`);
  } catch (err) {
    logger.error(`[installer] Task ${installId} failed: ${err.message}`);
    await api.reportCommandResult(machineId, installId, {
      status: "failed",
      logOutput: err.message,
    }).catch(() => {});
  } finally {
    // Cleanup temp file
    fs.unlink(tmpFile, () => {});
  }
}

module.exports = { executeInstallation, downloadFile };
