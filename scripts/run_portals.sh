#!/usr/bin/env bash
# Wrapper to run the Portals IDE from the repository directory
set -euo pipefail
# Resolve the real script location even when invoked through a symlink.
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
	DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
	SOURCE="$(readlink "$SOURCE")"
	[[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."
echo "Launching Portals IDE from $(pwd)"
LOCAL_ELECTRON="$(pwd)/node_modules/.bin/electron"
GLOBAL_ELECTRON="$(command -v electron || true)"

if [ -x "$LOCAL_ELECTRON" ]; then
	echo "Using local electron: $LOCAL_ELECTRON"
	exec "$LOCAL_ELECTRON" .
elif [ -n "$GLOBAL_ELECTRON" ]; then
	echo "Using global electron: $GLOBAL_ELECTRON"
	exec "$GLOBAL_ELECTRON" .
else
	echo "Falling back to npx electron (may download on first run)"
	exec npx electron .
fi
