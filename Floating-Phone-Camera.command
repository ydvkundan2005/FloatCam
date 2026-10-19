#!/bin/bash
# ==============================================================================
# Floating Phone Camera — Companion Executable Launcher for macOS
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "=================================================="
echo "    Launching Floating Phone Camera (FPC)        "
echo "=================================================="

# Check if application is already running to prevent duplicate instances
if pgrep -f "Floating Phone Camera" >/dev/null 2>&1 || pgrep -f "FPC.app" >/dev/null 2>&1; then
    echo "Floating Phone Camera is already running!"
    echo "Check your macOS menu bar (top-right of your screen) for the camera icon."
    osascript -e 'display notification "Floating Phone Camera is already running in your menu bar." with title "Floating Phone Camera"' 2>/dev/null || true
    sleep 2
    exit 0
fi

# Locate the application bundle
APP_PATH=""
if [ -d "/Applications/Floating Phone Camera.app" ]; then
    APP_PATH="/Applications/Floating Phone Camera.app"
elif [ -d "$DIR/Floating Phone Camera.app" ]; then
    APP_PATH="$DIR/Floating Phone Camera.app"
elif [ -d "$DIR/dist/mac/Floating Phone Camera-darwin-arm64/Floating Phone Camera.app" ]; then
    APP_PATH="$DIR/dist/mac/Floating Phone Camera-darwin-arm64/Floating Phone Camera.app"
elif [ -d "$DIR/FPC.app" ]; then
    APP_PATH="$DIR/FPC.app"
fi

if [ -n "$APP_PATH" ]; then
    echo "Found app at: $APP_PATH"
    # Clear quarantine attribute if set
    xattr -cr "$APP_PATH" 2>/dev/null || true
    open "$APP_PATH"
    echo "App launched successfully!"
    echo "Look for the camera icon in your macOS menu bar."
    sleep 2
    exit 0
fi

# Fallback: check DMG installer
if [ -f "$DIR/releases/FloatCam-v1.0-macOS.dmg" ]; then
    echo "Opening DMG installer from releases..."
    open "$DIR/releases/FloatCam-v1.0-macOS.dmg"
    exit 0
fi
if [ -f "$DIR/Floating-Phone-Camera-macOS.dmg" ]; then
    echo "Opening DMG installer..."
    open "$DIR/Floating-Phone-Camera-macOS.dmg"
    exit 0
fi

echo "Launching from local development source..."
cd "$DIR" && npm start
exit 0

echo "Error: Could not locate Floating Phone Camera application bundle."
read -p "Press Enter to exit..."
