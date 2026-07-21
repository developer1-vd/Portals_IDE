#!/usr/bin/env bash
set -euo pipefail

APP_ID="portals-ide"
APP_NAME="Portals IDE"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)/.."
ICON_SRC="$SCRIPT_DIR/src/assets/app-icon.png"

ICON_DST_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
DESKTOP_DST_DIR="$HOME/.local/share/applications"

mkdir -p "$ICON_DST_DIR" "$DESKTOP_DST_DIR"

if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$ICON_DST_DIR/$APP_ID.png"
  echo "Installed icon to $ICON_DST_DIR/$APP_ID.png"
else
  echo "Warning: icon not found at $ICON_SRC"
fi

DESKTOP_FILE="$DESKTOP_DST_DIR/$APP_ID.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Exec=$SCRIPT_DIR/scripts/run_portals.sh
Icon=$APP_ID
Terminal=false
Categories=Development;IDE;
StartupNotify=true
# Try to help KDE match the running window to this desktop file
StartupWMClass=Portals IDE
X-KDE-StartupWMClass=Portals IDE
EOF

chmod 644 "$DESKTOP_FILE"
chmod +x "$SCRIPT_DIR/scripts/run_portals.sh" || true
echo "Installed desktop file to $DESKTOP_FILE"

# Update KDE/GTK caches where available
if command -v kbuildsycoca5 >/dev/null 2>&1; then
  kbuildsycoca5 --noincremental || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" || true
fi

echo "Installation complete. You may need to log out/in or restart Plasma for the icon to appear in the task manager."
