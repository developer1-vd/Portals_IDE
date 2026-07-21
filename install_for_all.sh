#!/usr/bin/env sh
set -e

echo "Installing Portals IDE for all users..."
if [ "$(id -u)" != "0" ]; then
  echo "Please run this script with sudo or as root." >&2
  exit 1
fi
if command -v npm >/dev/null 2>&1; then
  if [ -d node_modules/electron ]; then
    echo "Removing broken Electron installation..."
    rm -rf node_modules/electron
  fi
  npm config set install-scripts electron@*
  if npm install-scripts --help >/dev/null 2>&1; then
    npm install-scripts approve electron@*
  fi
  npm install
  echo "Installation complete. Run 'npm start' to launch Portals IDE."
else
  echo "npm is not installed. Please install Node.js and npm first." >&2
  exit 1
fi
