# Portals IDE

Portals IDE is a clean Electron-based workspace for browsing the web and editing code together. It provides:

- A built-in browser panel for research, tutorials, and code browsing.
- A simple code editor with file open/save support.
- A workspace sidebar for quick links and local folder navigation.
- A folder tree explorer for opening and browsing local files.

## Installation

### Linux / macOS
1. Install [Node.js and npm](https://nodejs.org/).
2. Run `./install.sh` from the project root.
3. Run `npm start`.

### Windows
1. Install [Node.js and npm](https://nodejs.org/).
2. Run `install.bat`.
3. Run `npm start`.

## Folder Explorer

1. Click the `Open Folder` button in the header.
2. Select a local folder to display its file tree in the workspace sidebar.
3. Click files to open them in the editor.

## Custom shell configuration

1. Copy `.env.example` to `.env`.
2. Set your preferred terminal shell:
   ```env
   TERMINAL_SHELL=/usr/bin/zsh
   ```
3. Save and restart Portals IDE.

The app will use `TERMINAL_SHELL` for the built-in terminal if set, otherwise it falls back to your system `SHELL`.

If the terminal area shows a dependency warning, run:

```sh
npm install
```

Then restart the app.

## Features

- Modern and clean UI with browser and editor panels.
- File controls: New, Open, Save, Save As.
- Browser navigation and direct URL entry.
- Config details displayed in the workspace panel.
- Quick links for common developer resources.
- Local folder file explorer for browsing project files.

## Run

```sh
npm start
```

## Notes

- The browser panel uses Electron `webview`.
- This project is designed to make web research and coding feel seamless.

## Adding your icon

Drop your 1024x1024 PNG into the project at `src/assets/app-icon.png` and the app will use it as the window icon when present. For best cross-platform results you may also generate platform-specific files:

   - Create an iconset folder and use `iconutil` (macOS) or an online converter. Example on macOS:

```sh
mkdir MyIcon.iconset
sips -z 16 16     icon-1024.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out MyIcon.iconset/icon_32x32.png
sips -z 128 128   icon-1024.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out MyIcon.iconset/icon_512x512.png
iconutil -c icns MyIcon.iconset
```

   - Use `png2ico` or ImageMagick + `icotool`. Example using `icotool`:

```sh
convert icon-1024.png -resize 256x256 icon-256.png
convert icon-1024.png -resize 128x128 icon-128.png
icotool -c app.ico icon-256.png icon-128.png
```

>- Linux: supply PNGs at multiple sizes (512, 256, 128, 64) and package them with your distribution package. The app will use `src/assets/app-icon.png` if present for the window icon.

Note: The app uses the PNG at `src/assets/app-icon.png` for the in-app/window icon. Packaging installers (NSIS, dmg, Snap, deb, etc.) may require separate icon files during build — follow your packager's documentation.

KDE/Wayland note — make the taskbar show your icon
-----------------------------------------------
On KDE/Wayland the task manager usually takes the icon from a `.desktop` file, not the per-window icon. To register the app and ensure the correct icon appears in the taskbar, run the installer script included in this repo which will copy the icon and create a desktop entry:

```bash
cd /home/virajd/Portals_IDE
./scripts/install_desktop.sh
```

You may need to log out and back in (or restart Plasma) for the change to take effect.

If you prefer, I can create packaged binaries for your OS that embed icons directly.

## System installer troubleshooting

If you installed the system-wide version and saw an error like this when launching from the system launcher:

```
Launching Portals IDE from /usr/local
npm notice run npx
npm notice run 'electron' .
Error launching app
Unable to find Electron app at /usr/local

Cannot find module '/usr/local'
```

Cause: the run wrapper script (`scripts/run_portals.sh`) originally `cd`'s relative to its own location using `dirname "$0"`. When the launcher is installed as a symlink in `/usr/local/bin`, `dirname "$0"` resolves to `/usr/local` and the script tries to run the app from the wrong directory.

Quick fixes:

- Preferred: update the run wrapper to resolve symlinks and use the script's real location. Replace the first `cd "$(dirname "$0")/.."` with the following (this correctly follows symlinks):

```bash
# resolve script location even when invoked through a symlink
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
   DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
   SOURCE="$(readlink "$SOURCE")"
   [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."
```

- Alternative: install the desktop file so its `Exec` points directly at the install directory script (for example `/opt/portals-ide/scripts/run_portals.sh`) instead of invoking the symlink in `/usr/local/bin`.

After applying the fix, re-run the installer or update the wrapper and test:

```bash
# if you updated the wrapper in-place
chmod +x scripts/run_portals.sh
# test locally
./scripts/run_portals.sh

# if you installed system-wide, reinstall so desktop entries/symlinks use the updated wrapper
sudo ./scripts/install_system.sh
```

