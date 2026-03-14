@echo off
REM ============================================================
REM  Build the Windows NSIS installer on a Windows machine.
REM  Requires: NSIS >= 3.09 installed at default location
REM            or on PATH as makensis.exe
REM
REM  Usage: build-nsis.bat [version]
REM  Example: build-nsis.bat 1.0.0
REM ============================================================

SET VERSION=%~1
IF "%VERSION%"=="" SET VERSION=1.0.0

SET SCRIPT_DIR=%~dp0
SET AGENT_DIR=%SCRIPT_DIR%..\..

REM ── Check for NSIS ────────────────────────────────────────
WHERE makensis >nul 2>&1
IF ERRORLEVEL 1 (
    IF EXIST "%PROGRAMFILES(X86)%\NSIS\makensis.exe" (
        SET MAKENSIS="%PROGRAMFILES(X86)%\NSIS\makensis.exe"
    ) ELSE IF EXIST "%PROGRAMFILES%\NSIS\makensis.exe" (
        SET MAKENSIS="%PROGRAMFILES%\NSIS\makensis.exe"
    ) ELSE (
        echo [!] makensis not found. Download NSIS from https://nsis.sourceforge.io/
        exit /b 1
    )
) ELSE (
    SET MAKENSIS=makensis
)

REM ── Check for Windows binary ──────────────────────────────
IF NOT EXIST "%AGENT_DIR%\dist\log360-agent-win.exe" (
    echo [!] Windows binary not found: %AGENT_DIR%\dist\log360-agent-win.exe
    echo     Build it first with: npm run build:win
    exit /b 1
)

REM ── Create placeholder LICENSE if missing ─────────────────
IF NOT EXIST "%AGENT_DIR%\LICENSE" (
    echo Log360 Dev Suite Agent - Proprietary Software > "%AGENT_DIR%\LICENSE"
)

REM ── Run NSIS ──────────────────────────────────────────────
echo [+] Building Windows installer v%VERSION%...

cd /d "%SCRIPT_DIR%"
%MAKENSIS% ^
    /DAGENT_VERSION="%VERSION%" ^
    log360-agent.nsi

IF ERRORLEVEL 1 (
    echo [!] makensis failed.
    exit /b 1
)

echo.
echo [OK] Installer created: Log360AgentSetup-%VERSION%-win-x64.exe
