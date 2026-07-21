#!/usr/bin/env bash
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "This uninstall script requires root. Re-run with sudo: sudo $0"
  exit 1
fi

APP_ID="portals-ide"
TARGET_DIR="/opt/$APP_ID"
LAUNCHER="/usr/local/bin/$APP_ID"
ICON_DST="/usr/share/icons/hicolor/256x256/apps/$APP_ID.png"
DESKTOP_FILE="/usr/share/applications/$APP_ID.desktop"

echo "Uninstalling system-wide $APP_ID"

if [ -L "$LAUNCHER" ] || [ -f "$LAUNCHER" ]; then
  rm -f "$LAUNCHER"
  echo "Removed launcher: $LAUNCHER"
else
  echo "Launcher not found: $LAUNCHER"
fi

if [ -f "$DESKTOP_FILE" ]; then
  rm -f "$DESKTOP_FILE"
  echo "Removed desktop file: $DESKTOP_FILE"
else
  echo "Desktop file not found: $DESKTOP_FILE"
fi

if [ -f "$ICON_DST" ]; then
  rm -f "$ICON_DST"
  echo "Removed icon: $ICON_DST"
else
  echo "Icon not found: $ICON_DST"
fi

if [ -d "$TARGET_DIR" ]; then
  rm -rf "$TARGET_DIR"
  echo "Removed installation directory: $TARGET_DIR"
else
  echo "Installation directory not found: $TARGET_DIR"
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database >/dev/null 2>&1 || true
fi

echo "System uninstall complete. You may need to log out/in to clear caches."
