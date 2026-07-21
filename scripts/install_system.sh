#!/usr/bin/env bash
set -euo pipefail

# System-wide installer for Portals IDE
# - Linux: copies to /opt/portals-ide, installs icon to /usr/share/icons, desktop file to /usr/share/applications
# - macOS: copies to /Applications/Portals IDE (best-effort) and creates /usr/local/bin/portals-ide
# - Windows: prints instructions (packaging recommended)

if [ "$EUID" -ne 0 ]; then
  echo "This installer requires root. Re-run with sudo: sudo $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)/.."
APP_ID="portals-ide"
APP_NAME="Portals IDE"
VERSION="$(grep -oP '"version":\s*"\K[^"]+' "$SCRIPT_DIR/package.json" || echo '0.0.0')"

OS_TYPE="$(uname -s)"

echo "Installing $APP_NAME (v$VERSION) system-wide on $OS_TYPE"

if [ "$OS_TYPE" = "Linux" ] || [ "$OS_TYPE" = "GNU" ]; then
  TARGET_DIR="/opt/$APP_ID"
  echo "Target: $TARGET_DIR"
  mkdir -p "$TARGET_DIR"
  rsync -a --delete --exclude node_modules --exclude .git "$SCRIPT_DIR/" "$TARGET_DIR/"
  chmod -R a+rX "$TARGET_DIR"

  ICON_SRC="$TARGET_DIR/src/assets/app-icon.png"
  ICON_DST_DIR="/usr/share/icons/hicolor/256x256/apps"
  DESKTOP_DIR="/usr/share/applications"
  mkdir -p "$ICON_DST_DIR" "$DESKTOP_DIR"
  if [ -f "$ICON_SRC" ]; then
    cp "$ICON_SRC" "$ICON_DST_DIR/$APP_ID.png"
    echo "Installed icon to $ICON_DST_DIR/$APP_ID.png"
  else
    echo "Warning: $ICON_SRC not found; no icon installed"
  fi

  # Create launcher script symlink
  ln -sf "$TARGET_DIR/scripts/run_portals.sh" "/usr/local/bin/$APP_ID"
  chmod +x "$TARGET_DIR/scripts/run_portals.sh" || true

  DESKTOP_FILE="/usr/share/applications/$APP_ID.desktop"
  cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$APP_NAME
Exec=/usr/local/bin/$APP_ID
Icon=$APP_ID
Terminal=false
Categories=Development;IDE;
StartupNotify=true
StartupWMClass=Portals IDE
X-KDE-StartupWMClass=Portals IDE
EOF

  update-desktop-database >/dev/null 2>&1 || true
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
  fi

  echo "Installed $APP_NAME to $TARGET_DIR. Launcher: /usr/local/bin/$APP_ID. Desktop file: $DESKTOP_FILE"
  echo "You may need to log out/in for desktop integration to appear."
  exit 0

elif [ "$OS_TYPE" = "Darwin" ]; then
  TARGET_DIR="/Applications/$APP_NAME"
  echo "Copying to $TARGET_DIR"
  rm -rf "$TARGET_DIR"
  rsync -a --delete --exclude node_modules --exclude .git "$SCRIPT_DIR/" "$TARGET_DIR/"
  chmod -R a+rX "$TARGET_DIR"
  # Create a small launcher in /usr/local/bin
  LAUNCHER="/usr/local/bin/$APP_ID"
  cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
cd "$TARGET_DIR"
exec npx electron .
EOF
  chmod +x "$LAUNCHER"
  echo "Installed to $TARGET_DIR and created launcher $LAUNCHER"
  echo "Note: For a proper macOS app bundle, use electron-packager/electron-builder to create an .app." 
  exit 0

else
  echo "Unsupported OS for automated system install: $OS_TYPE"
  echo "On Windows, please package the app with electron-builder and create an installer."
  exit 2
fi
