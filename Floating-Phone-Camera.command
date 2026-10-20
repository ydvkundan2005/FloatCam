#!/bin/bash
# ==============================================================================
# FloatCam V3 — Companion Executable Launcher for macOS
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "=================================================="
echo "              Launching FloatCam V3               "
echo "=================================================="

# Check if application is already running
if pgrep -f "FloatCam" >/dev/null 2>&1; then
    echo "FloatCam is already running!"
    echo "Check your macOS menu bar / Dock for the FloatCam icon."
    osascript -e 'display notification "FloatCam is already running." with title "FloatCam V3"' 2>/dev/null || true
    sleep 2
    exit 0
fi

# Locate the application bundle
APP_PATH=""
if [ -d "/Applications/FloatCam.app" ]; then
    APP_PATH="/Applications/FloatCam.app"
elif [ -d "$DIR/dist/mac/FloatCam-darwin-arm64/FloatCam.app" ]; then
    APP_PATH="$DIR/dist/mac/FloatCam-darwin-arm64/FloatCam.app"
elif [ -d "$DIR/dist/mac/FloatCam-darwin-x64/FloatCam.app" ]; then
    APP_PATH="$DIR/dist/mac/FloatCam-darwin-x64/FloatCam.app"
fi

if [ -n "$APP_PATH" ]; then
    echo "Found app at: $APP_PATH"
    xattr -cr "$APP_PATH" 2>/dev/null || true
    open "$APP_PATH"
    echo "App launched successfully!"
    sleep 1
    exit 0
fi

# Fallback: open V3 DMG installer
if [ -f "$DIR/releases/FloatCam-v3.dmg" ]; then
    echo "Opening FloatCam V3 DMG installer from releases..."
    open "$DIR/releases/FloatCam-v3.dmg"
    exit 0
fi

echo "Launching from local development source..."
cd "$DIR" && npm start
exit 0
