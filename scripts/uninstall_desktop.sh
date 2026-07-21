#!/usr/bin/env bash
set -euo pipefail

APP_ID="portals-ide"
ICON_DST="$HOME/.local/share/icons/hicolor/256x256/apps/$APP_ID.png"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_ID.desktop"

echo "Uninstalling $APP_ID desktop entry and icon (user-local)"

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

# Try to refresh caches where possible
if command -v kbuildsycoca5 >/dev/null 2>&1; then
  echo "Refreshing KDE service cache..."
  kbuildsycoca5 --noincremental || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  echo "Refreshing GTK icon cache..."
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" || true
fi

echo "Uninstall complete. You may need to log out/in or restart Plasma to clear caches."
