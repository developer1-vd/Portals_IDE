const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

function readFolder(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries
    .map((entry) => ({
      name: entry.name,
      path: path.join(directory, entry.name),
      type: entry.isDirectory() ? "folder" : "file"
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}

function createWindow() {
  const iconPath = path.join(__dirname, "src", "assets", "app-icon.png");
  let loadedIcon = null;
  const windowOptions = {
    width: 1920,
    height: 1080,
    minWidth: 1200,
    minHeight: 800,
    resizable: true,
    fullscreenable: true,
    title: "Portals IDE",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "src", "preload.js"),
      webviewTag: true,
      sandbox: false
    }
  };

  // Use the provided app icon if it exists (place a 1024x1024 PNG at src/assets/app-icon.png)
  try {
    if (fs.existsSync(iconPath)) {
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) {
        // Resize to a reasonable size for window manager (keeps aspect)
        loadedIcon = img.resize({ width: 256, height: 256 });
        windowOptions.icon = loadedIcon;
      } else {
        loadedIcon = nativeImage.createFromPath(iconPath);
        windowOptions.icon = iconPath;
      }
      console.log('[Portals IDE] Found app icon:', iconPath);
    } else {
      console.log('[Portals IDE] No app icon found at', iconPath);
    }
  } catch (e) {
    console.warn('[Portals IDE] Error loading app icon:', e && e.message ? e.message : e);
  }

  const mainWindow = new BrowserWindow(windowOptions);

  // Try to force the window manager to use the loaded icon (Linux/Wayland/WMs vary)
  try {
    if (loadedIcon && typeof mainWindow.setIcon === 'function') {
      mainWindow.setIcon(loadedIcon);
      console.log('[Portals IDE] Called mainWindow.setIcon() with loaded icon.');
    } else if (loadedIcon) {
      // As fallback, set the icon via BrowserWindow options already applied
      console.log('[Portals IDE] Icon loaded but mainWindow.setIcon not available on this platform.');
    }
  } catch (e) {
    console.warn('[Portals IDE] Error setting window icon:', e && e.message ? e.message : e);
  }

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
  mainWindow.removeMenu();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("open-folder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open folder",
    properties: ["openDirectory"]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

ipcMain.handle("read-folder", async (event, { folderPath }) => {
  try {
    return readFolder(folderPath);
  } catch (e) {
    console.warn("Failed to read folder", folderPath, e);
    return [];
  }
});

ipcMain.handle("open-file-path", async (event, { filePath }) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf8");
  return { filePath, content, name: path.basename(filePath) };
});

ipcMain.handle("run-terminal-command", async (event, { command }) => {
  if (!command || typeof command !== "string") {
    return { success: false, output: "", error: "No command provided" };
  }

  try {
    return await new Promise((resolve) => {
      const { exec } = require("child_process");
      const cwd = app.getPath("home");
      exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, output: stdout, error: stderr || error.message });
        } else {
          resolve({ success: true, output: stdout || stderr || "", error: stderr || "" });
        }
      });
    });
  } catch (e) {
    return { success: false, output: "", error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle("open-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open file",
    properties: ["openFile"],
    filters: [
      { name: "Text and code files", extensions: ["txt", "js", "ts", "json", "html", "css", "md", "py", "sh", "bat"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, "utf8");
  return { filePath, content, name: path.basename(filePath) };
});

ipcMain.handle("save-file", async (event, { filePath, content }) => {
  if (!filePath) {
    return null;
  }
  fs.writeFileSync(filePath, content, "utf8");
  return { filePath, name: path.basename(filePath) };
});

ipcMain.handle("save-file-as", async (event, { content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save file as",
    defaultPath: "untitled.txt",
    filters: [
      { name: "Text and code files", extensions: ["txt", "js", "ts", "json", "html", "css", "md", "py", "sh", "bat"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (canceled || !filePath) {
    return null;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return { filePath, name: path.basename(filePath) };
});

