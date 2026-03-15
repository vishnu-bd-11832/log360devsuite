@echo off
REM ============================================================
REM  Log360 Dev Suite Agent — Windows Installer
REM  Run as Administrator
REM ============================================================

SET INSTALL_DIR=%PROGRAMFILES%\Log360Agent
SET DATA_DIR=%PROGRAMDATA%\Log360Agent
SET SVC_NAME=Log360DevSuiteAgent

echo [+] Installing Log360 Dev Suite Agent...

REM Create directories
mkdir "%INSTALL_DIR%" 2>nul
mkdir "%DATA_DIR%" 2>nul

REM Copy agent files
xcopy /E /I /Y "%~dp0.." "%INSTALL_DIR%"

REM Prompt for configuration
SET /P API_URL=Enter Catalyst API URL (e.g. https://your-app.catalystappsail.in/api): 
SET /P AGENT_TOKEN=Enter Agent Token (from Log360 Dev Suite portal): 

REM Write config file
echo { > "%DATA_DIR%\agent.json"
echo   "apiUrl": "%API_URL%", >> "%DATA_DIR%\agent.json"
echo   "agentToken": "%AGENT_TOKEN%" >> "%DATA_DIR%\agent.json"
echo } >> "%DATA_DIR%\agent.json"

echo [+] Config written to %DATA_DIR%\agent.json

REM Install as Windows Service using sc.exe
sc query "%SVC_NAME%" >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo [~] Service already exists, removing old service...
    sc stop "%SVC_NAME%" >nul 2>&1
    sc delete "%SVC_NAME%" >nul 2>&1
    timeout /t 3 /nobreak >nul
)

REM Determine agent executable
IF EXIST "%INSTALL_DIR%\dist\log360-agent-win.exe" (
    SET AGENT_EXE=%INSTALL_DIR%\dist\log360-agent-win.exe
) ELSE (
    REM Fall back to node.js — verify it is available first
    where node >nul 2>&1
    IF ERRORLEVEL 1 (
        echo [!] ERROR: The pre-built agent binary was not found and Node.js is not on PATH.
        echo      Either:
        echo        a) Re-download the installer that includes the .exe binary, OR
        echo        b) Install Node.js 18+ from https://nodejs.org and re-run this script.
        exit /b 1
    )
    SET AGENT_EXE=node "%INSTALL_DIR%\src\index.js"
)

sc create "%SVC_NAME%" ^
    binPath= "%AGENT_EXE%" ^
    DisplayName= "Log360 Dev Suite Agent" ^
    Description= "Log360 Dev Suite remote management agent" ^
    start= auto ^
    obj= LocalSystem

IF ERRORLEVEL 1 (
    echo [!] Failed to create service. Please run as Administrator.
    exit /b 1
)

REM Set environment variables for the service
reg add "HKLM\SYSTEM\CurrentControlSet\Services\%SVC_NAME%\Parameters" /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\%SVC_NAME%\Parameters" /v "AppEnvironmentExtra" /t REG_MULTI_SZ /d "PROGRAMDATA=%PROGRAMDATA%" /f >nul 2>&1

sc start "%SVC_NAME%"

echo.
echo [OK] Log360 Dev Suite Agent installed and started.
echo      Service name: %SVC_NAME%
echo      Config file:  %DATA_DIR%\agent.json
echo.
pause
