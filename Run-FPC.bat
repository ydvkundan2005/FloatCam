@echo off
title Floating Phone Camera
cd /d "%~dp0"
echo ==================================================
echo     Launching Floating Phone Camera (Windows)     
echo ==================================================

if exist "releases\FloatCam-v1.0-Windows.exe" (
    start "" "releases\FloatCam-v1.0-Windows.exe"
    exit
)

if exist "Floating Phone Camera.exe" (
    start "" "Floating Phone Camera.exe"
    exit
)

echo Starting in development mode via npm...
npm start
exit
