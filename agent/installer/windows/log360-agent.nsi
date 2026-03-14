; ============================================================
;  Log360 Dev Suite Agent — NSIS Installer Script
;  Produces: Log360AgentSetup-1.0.0-win-x64.exe
;
;  Requirements:
;    NSIS >= 3.09  (https://nsis.sourceforge.io/)
;    nsDialogs plugin (bundled with NSIS 3.x)
;    LogicLib.nsh   (bundled with NSIS 3.x)
;    FileFunc.nsh   (bundled with NSIS 3.x)
;
;  Build:
;    Windows:  makensis log360-agent.nsi
;    Linux:    makensis log360-agent.nsi   (apt install nsis)
;
;  Silent install:
;    Log360AgentSetup-1.0.0-win-x64.exe /S /APIURL=https://... /TOKEN=abc123
; ============================================================

Unicode True

; ── Product metadata ─────────────────────────────────────────────────────────
!define PRODUCT_NAME        "Log360 Dev Suite Agent"
!define PRODUCT_SHORT_NAME  "Log360Agent"
!define PRODUCT_VERSION     "1.0.0"
!define PUBLISHER           "ManageEngine"
!define PRODUCT_URL         "https://github.com/vishnu-bd-11832/log360devsuite"
!define SVC_NAME            "Log360DevSuiteAgent"
!define SVC_DISPLAY         "Log360 Dev Suite Agent"
!define SVC_DESCRIPTION     "Remote management agent for Log360 Dev Suite"

; ── Installer metadata ────────────────────────────────────────────────────────
!define INST_DIR            "$PROGRAMFILES64\${PRODUCT_SHORT_NAME}"
!define DATA_DIR            "$APPDATA\${PRODUCT_SHORT_NAME}"
!define CONFIG_FILE         "${DATA_DIR}\agent.json"
!define AGENT_EXE           "log360-agent.exe"
!define UNINSTALLER_EXE     "uninstall.exe"
!define REG_UNINSTALL       "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_SHORT_NAME}"

Name              "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile           "Log360AgentSetup-${PRODUCT_VERSION}-win-x64.exe"
InstallDir        "${INST_DIR}"
InstallDirRegKey  HKLM "${REG_UNINSTALL}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor     /SOLID lzma
ShowInstDetails   show
ShowUninstDetails show

; ── Includes ──────────────────────────────────────────────────────────────────
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "StrFunc.nsh"

${StrTrimNewLines}

; ── Modern UI settings ────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON            "..\..\assets\installer-icon.ico"
!define MUI_UNICON          "..\..\assets\installer-icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "..\..\assets\installer-header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "..\..\assets\installer-welcome.bmp"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${AGENT_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Start Log360 Agent service now"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.md"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "View README"

; Fallback if artwork assets are missing (graceful degradation)
!macro _IncludeArt ASSET
  !if /FileExists "..\..\assets\${ASSET}"
    !define MUI_HEADERIMAGE
  !endif
!macroend

; ── Variables ─────────────────────────────────────────────────────────────────
Var Dialog
Var LabelApiUrl
Var TextApiUrl
Var LabelToken
Var TextToken
Var LabelHelp
Var ApiUrlValue
Var TokenValue

; ── Pages ─────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
Page custom ConfigPageCreate ConfigPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Configuration page ────────────────────────────────────────────────────────

Function ConfigPageCreate
  ; Skip if silent install values are already provided
  ${If} $ApiUrlValue != ""
  ${AndIf} $TokenValue != ""
    Abort ; skip this page
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "Agent Configuration" \
    "Enter the Catalyst API URL and your Agent Token."

  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ; ── API URL label + field ────────────────────────────────
  ${NSD_CreateLabel} 0 10u 100% 12u "Catalyst API URL:"
  Pop $LabelApiUrl

  ${NSD_CreateText} 0 24u 100% 14u "https://your-app.catalystappsail.in/api"
  Pop $TextApiUrl
  ${If} $ApiUrlValue != ""
    ${NSD_SetText} $TextApiUrl $ApiUrlValue
  ${EndIf}

  ; ── Token label + field ───────────────────────────────────
  ${NSD_CreateLabel} 0 46u 100% 12u "Agent Token (from Log360 Dev Suite portal):"
  Pop $LabelToken

  ${NSD_CreatePassword} 0 60u 100% 14u ""
  Pop $TextToken
  ${If} $TokenValue != ""
    ${NSD_SetText} $TextToken $TokenValue
  ${EndIf}

  ; ── Help text ─────────────────────────────────────────────
  ${NSD_CreateLabel} 0 82u 100% 30u \
    "Obtain the Agent Token from:$\r$\nLog360 Dev Suite portal → Machines → Add Machine → Copy Token"
  Pop $LabelHelp

  nsDialogs::Show
FunctionEnd

Function ConfigPageLeave
  ${NSD_GetText} $TextApiUrl $ApiUrlValue
  ${NSD_GetText} $TextToken  $TokenValue

  ${If} $ApiUrlValue == ""
    MessageBox MB_ICONEXCLAMATION "Please enter the Catalyst API URL."
    Abort
  ${EndIf}

  ${If} $TokenValue == ""
    MessageBox MB_ICONEXCLAMATION "Please enter the Agent Token."
    Abort
  ${EndIf}
FunctionEnd

; ── .onInit — parse silent-install command line ───────────────────────────────
Function .onInit
  ; Parse /APIURL= and /TOKEN= from command line
  ${GetOptions} $CMDLINE "/APIURL=" $ApiUrlValue
  ${GetOptions} $CMDLINE "/TOKEN="  $TokenValue
  ; Remove surrounding quotes if present
  ${StrTrimNewLines} $ApiUrlValue $ApiUrlValue
  ${StrTrimNewLines} $TokenValue  $TokenValue
FunctionEnd

; ── Helper macro to write config file ────────────────────────────────────────
!macro WriteAgentConfig APIURL TOKEN MACHINEID
  CreateDirectory "${DATA_DIR}"
  ; Build JSON manually (no JSON library in NSIS)
  FileOpen  $0 "${CONFIG_FILE}" w
  FileWrite $0 '{$\r$\n'
  FileWrite $0 '  "apiUrl": "${APIURL}",$\r$\n'
  FileWrite $0 '  "agentToken": "${TOKEN}"$\r$\n'
  FileWrite $0 '}$\r$\n'
  FileClose $0
!macroend

; ── Main install section ──────────────────────────────────────────────────────
Section "Log360 Agent (required)" SecMain
  SectionIn RO

  SetOutPath "$INSTDIR"

  ; ── Extract files ────────────────────────────────────────
  File "..\..\dist\log360-agent-win.exe"
  Rename "$INSTDIR\log360-agent-win.exe" "$INSTDIR\${AGENT_EXE}"

  File /oname=README.md "..\..\README.md"

  ; ── Write configuration ───────────────────────────────────
  CreateDirectory "${DATA_DIR}"
  FileOpen  $0 "${CONFIG_FILE}" w
  FileWrite $0 '{$\r$\n'
  FileWrite $0 '  "apiUrl": "$ApiUrlValue",$\r$\n'
  FileWrite $0 '  "agentToken": "$TokenValue"$\r$\n'
  FileWrite $0 '}$\r$\n'
  FileClose $0

  ; ── Registry entries ─────────────────────────────────────
  WriteRegStr HKLM "${REG_UNINSTALL}" "DisplayName"    "${PRODUCT_NAME}"
  WriteRegStr HKLM "${REG_UNINSTALL}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${REG_UNINSTALL}" "Publisher"      "${PUBLISHER}"
  WriteRegStr HKLM "${REG_UNINSTALL}" "URLInfoAbout"   "${PRODUCT_URL}"
  WriteRegStr HKLM "${REG_UNINSTALL}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${REG_UNINSTALL}" "UninstallString" '"$INSTDIR\${UNINSTALLER_EXE}"'
  WriteRegDWORD HKLM "${REG_UNINSTALL}" "NoModify" 1
  WriteRegDWORD HKLM "${REG_UNINSTALL}" "NoRepair"  1

  ; ── Windows Service ───────────────────────────────────────
  ; Stop + remove existing service if upgrading
  nsExec::ExecToLog 'sc stop "${SVC_NAME}"'
  nsExec::ExecToLog 'sc delete "${SVC_NAME}"'
  Sleep 2000

  nsExec::ExecToLog 'sc create "${SVC_NAME}" \
    binPath= "$INSTDIR\${AGENT_EXE}" \
    DisplayName= "${SVC_DISPLAY}" \
    start= auto \
    obj= LocalSystem'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION "Failed to create Windows service (error $0). \
      Check that you are running as Administrator."
    Abort
  ${EndIf}

  nsExec::ExecToLog 'sc description "${SVC_NAME}" "${SVC_DESCRIPTION}"'

  ; Set service environment variables (requires NSIS EnvVarUpdate or registry)
  WriteRegStr HKLM \
    "SYSTEM\CurrentControlSet\Services\${SVC_NAME}\Parameters" \
    "AppEnvironmentExtra" "PROGRAMDATA=$APPDATA"

  nsExec::ExecToLog 'sc start "${SVC_NAME}"'

  ; ── Uninstaller ───────────────────────────────────────────
  WriteUninstaller "$INSTDIR\${UNINSTALLER_EXE}"

SectionEnd

; ── Uninstaller ───────────────────────────────────────────────────────────────
Section "Uninstall"

  ; Stop and remove the service
  nsExec::ExecToLog 'sc stop "${SVC_NAME}"'
  Sleep 2000
  nsExec::ExecToLog 'sc delete "${SVC_NAME}"'

  ; Remove installed files
  Delete "$INSTDIR\${AGENT_EXE}"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\${UNINSTALLER_EXE}"
  RMDir  "$INSTDIR"

  ; Remove data directory (ask user)
  MessageBox MB_YESNO "Remove configuration and data at $\n${DATA_DIR}?" IDNO SkipData
    RMDir /r "${DATA_DIR}"
  SkipData:

  ; Remove registry
  DeleteRegKey HKLM "${REG_UNINSTALL}"

SectionEnd

; ── Section descriptions ──────────────────────────────────────────────────────
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} \
    "Installs the Log360 Dev Suite Agent binary and registers it as a Windows service."
!insertmacro MUI_FUNCTION_DESCRIPTION_END
