Unicode true

!define PRODUCT_NAME "FloatCam"
!define PRODUCT_VERSION "3.0.0"
!define PRODUCT_PUBLISHER "FloatCam Contributors"
!define PRODUCT_WEB_SITE "https://github.com/ydvkundan2005/FloatCam"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\FloatCam.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKCU"

; Paths passed in as defines from build script (-DROOT_DIR=... -DAPP_DIR=... -DOUT_DIR=... -DICON_PATH=...)
; Fallback to relative paths for manual builds
!ifndef ROOT_DIR
  !define ROOT_DIR ".."
!endif
!ifndef APP_DIR
  !define APP_DIR "${ROOT_DIR}\dist\win\FloatCam-win32-x64"
!endif
!ifndef OUT_DIR
  !define OUT_DIR "${ROOT_DIR}\dist\installer"
!endif
!ifndef ICON_PATH
  !define ICON_PATH "${ROOT_DIR}\assets\icon.ico"
!endif

SetCompressor /SOLID lzma

; Modern UI 2
!include "MUI2.nsh"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${ICON_PATH}"
!define MUI_UNICON "${ICON_PATH}"

; Welcome page
!insertmacro MUI_PAGE_WELCOME
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\FloatCam.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch FloatCam"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language files
!insertmacro MUI_LANGUAGE "English"

; Name and Output File
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "${OUT_DIR}\FloatCam-Setup-v3.exe"
InstallDir "$LOCALAPPDATA\Programs\FloatCam"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel user

Section "MainSection" SEC01
  ; Close existing running instance of FloatCam if open so files are not locked
  nsExec::Exec `taskkill /F /IM FloatCam.exe`

  SetOutPath "$INSTDIR"
  SetOverwrite try

  ; Copy all files from the verified working application build
  File /r "${APP_DIR}\*"

  ; Create Shortcuts
  CreateDirectory "$SMPROGRAMS\FloatCam"
  CreateShortCut "$SMPROGRAMS\FloatCam\FloatCam.lnk" "$INSTDIR\FloatCam.exe" "" "$INSTDIR\FloatCam.exe" 0
  CreateShortCut "$SMPROGRAMS\FloatCam\Uninstall FloatCam.lnk" "$INSTDIR\Uninstall FloatCam.exe" "" "$INSTDIR\Uninstall FloatCam.exe" 0
  CreateShortCut "$DESKTOP\FloatCam.lnk" "$INSTDIR\FloatCam.exe" "" "$INSTDIR\FloatCam.exe" 0
SectionEnd

Section -AdditionalIcons
  WriteIniStr "$INSTDIR\${PRODUCT_NAME}.url" "InternetShortcut" "URL" "${PRODUCT_WEB_SITE}"
  CreateShortCut "$SMPROGRAMS\FloatCam\Website.lnk" "$INSTDIR\${PRODUCT_NAME}.url"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\Uninstall FloatCam.exe"
  WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\FloatCam.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall FloatCam.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\FloatCam.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) was successfully removed from your computer."
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" IDYES +2
  Abort
FunctionEnd

Section Uninstall
  ; Close running FloatCam
  nsExec::Exec `taskkill /F /IM FloatCam.exe`

  ; Remove shortcuts
  Delete "$DESKTOP\FloatCam.lnk"
  Delete "$SMPROGRAMS\FloatCam\Website.lnk"
  Delete "$SMPROGRAMS\FloatCam\Uninstall FloatCam.lnk"
  Delete "$SMPROGRAMS\FloatCam\FloatCam.lnk"
  RMDir "$SMPROGRAMS\FloatCam"

  ; Remove all installed application files
  RMDir /r "$INSTDIR"

  ; Clean registry
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"
  SetAutoClose true
SectionEnd
