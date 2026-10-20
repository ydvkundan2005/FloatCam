@echo off
title FloatCam V3
cd /d "%~dp0"
echo ==================================================
echo              Launching FloatCam V3 (Windows)       
echo ==================================================

if exist "releases\FloatCam-Setup-v3.exe" (
    echo Launching FloatCam V3 Setup Installer...
    start "" "releases\FloatCam-Setup-v3.exe"
    exit
)

if exist "FloatCam.exe" (
    start "" "FloatCam.exe"
    exit
)

echo Starting FloatCam in development mode via npm...
npm start
exit
