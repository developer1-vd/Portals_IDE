#!/usr/bin/env sh
set -e

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Install Node.js and npm first." >&2
  exit 1
fi

# Remove any broken electron install and approve Electron install scripts if available.
if [ -d ../node_modules/electron ]; then
  echo "Removing broken Electron installation..."
  rm -rf ../node_modules/electron
fi

npm config set allow-scripts electron@*
if npm install-scripts --help >/dev/null 2>&1; then
  npm install-scripts approve electron@*
fi
npm install electron@26.6.10 --save-dev
