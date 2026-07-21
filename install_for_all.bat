@echo off
if "%USERNAME%"=="" (
  echo Unable to determine user context.
  exit /b 1
)
echo Run this script from an elevated command prompt.
if not defined npm (
  echo npm is not installed. Install Node.js and npm first.
  exit /b 1
)
if exist node_modules\electron (
  echo Removing broken Electron installation...
  rmdir /s /q node_modules\electron
)
npm config set allow-scripts electron@*
npm install-scripts approve electron@*
npm install
echo Installation complete. Run npm start to launch Portals IDE.
