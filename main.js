const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

const terminalSessions = new Map();
let cachedPtyModule = null;

function getPtyModule() {
  if (cachedPtyModule) return cachedPtyModule;
  try {
    cachedPtyModule = require("node-pty");
    return cachedPtyModule;
  } catch (_error) {
    return null;
  }
}

function readEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs.readFileSync(envPath, "utf8").split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return env;
    const [key, ...rest] = trimmed.split("=");
    env[key] = rest.join("=").trim();
    return env;
  }, {});
}

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

function getShellConfig() {
  if (process.platform === "win32") {
    return {
      executable: process.env.ComSpec || "cmd.exe",
      args: []
    };
  }

  const env = readEnvFile();
  const customShell = env.TERMINAL_SHELL || process.env.SHELL || "/bin/zsh";
  return {
    executable: customShell,
    args: ["-i"]
  };
}

function killTerminalForWebContents(webContentsId) {
  const session = terminalSessions.get(webContentsId);
  if (!session) return;

  try {
    session.ptyProcess.kill();
  } catch (error) {
    console.warn("Failed to kill terminal session", error);
  }
  terminalSessions.delete(webContentsId);
}

ipcMain.handle("terminal-start", (event, options = {}) => {
  const pty = getPtyModule();
  if (!pty) {
    return {
      success: false,
      error: "Missing terminal dependency: node-pty. Run npm install in project root."
    };
  }

  const webContents = event.sender;
  const webContentsId = webContents.id;
  killTerminalForWebContents(webContentsId);

  const env = readEnvFile();
  const shell = getShellConfig();
  const cols = Number(options.cols) || 100;
  const rows = Number(options.rows) || 24;
  const cwd = env.TERMINAL_CWD || app.getPath("home");

  const ptyProcess = pty.spawn(shell.executable, shell.args, {
    name: "xterm-256color",
    cols,
    rows,
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color"
    }
  });

  ptyProcess.onData((data) => {
    if (!webContents.isDestroyed()) {
      webContents.send("terminal-data", data);
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (!webContents.isDestroyed()) {
      webContents.send("terminal-exit", { exitCode });
    }
    terminalSessions.delete(webContentsId);
  });

  terminalSessions.set(webContentsId, { ptyProcess });
  return { success: true };
});

ipcMain.on("terminal-input", (event, data) => {
  const session = terminalSessions.get(event.sender.id);
  if (!session) return;
  session.ptyProcess.write(typeof data === "string" ? data : "");
});

ipcMain.on("terminal-resize", (event, { cols, rows }) => {
  const session = terminalSessions.get(event.sender.id);
  if (!session) return;

  const safeCols = Math.max(20, Number(cols) || 80);
  const safeRows = Math.max(5, Number(rows) || 24);
  try {
    session.ptyProcess.resize(safeCols, safeRows);
  } catch (error) {
    console.warn("Failed to resize terminal", error);
  }
});

ipcMain.on("terminal-kill", (event) => {
  killTerminalForWebContents(event.sender.id);
});

app.on("web-contents-created", (_event, webContents) => {
  webContents.on("destroyed", () => {
    killTerminalForWebContents(webContents.id);
  });
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

const pendingPermissions = new Map();
let permissionIdCounter = 0;

ipcMain.handle("ai-chat", async (event, { message, history }) => {
  const env = readEnvFile();
  const provider = (env.AI_PROVIDER || "anthropic").toLowerCase();

  if (provider === "anthropic") {
    return handleAnthropicChat(env, message, history);
  } else if (provider === "ollama") {
    return handleOllamaChat(env, message, history);
  } else if (provider === "fireworks") {
    return handleFireworksChat(env, message, history);
  }

  return { error: `Unknown AI provider: ${provider}` };
});

function handleAnthropicChat(env, message, history) {
  const apiKey = env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Promise.resolve({ error: "ANTHROPIC_API_KEY not set in .env" });
  }

  const messages = [
    ...history,
    { role: "user", content: message }
  ];

  return new Promise((resolve) => {
    const data = JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 1024, messages });
    const req = https.request({
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    }, (res) => {
      let responseData = "";
      res.on("data", (chunk) => { responseData += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          const content = parsed.content && parsed.content[0] && parsed.content[0].text;
          resolve({ success: true, response: content || "No response" });
        } catch (e) {
          resolve({ error: "Failed to parse API response" });
        }
      });
    });

    req.on("error", (e) => {
      resolve({ error: e.message });
    });

    req.write(data);
    req.end();
  });
}

function handleOllamaChat(env, message, history) {
  const ollamaUrl = env.OLLAMA_URL || "http://localhost:11434";
  const ollamaModel = env.OLLAMA_MODEL || "llama2";

  const messages = [
    ...history,
    { role: "user", content: message }
  ];

  return new Promise((resolve) => {
    const data = JSON.stringify({ model: ollamaModel, messages, stream: false });
    const url = new URL(ollamaUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 11434,
      path: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => { responseData += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ success: true, response: parsed.message.content || "No response" });
        } catch (e) {
          resolve({ error: "Failed to parse Ollama response" });
        }
      });
    });

    req.on("error", (e) => {
      resolve({ error: `Ollama connection failed: ${e.message}` });
    });

    req.write(data);
    req.end();
  });
}

function handleFireworksChat(env, message, history) {
  const apiKey = env.FIREWORKS_API_KEY;
  const model = env.FIREWORKS_MODEL || "accounts/fireworks/models/llama-v2-7b-chat";

  if (!apiKey) {
    return Promise.resolve({ error: "FIREWORKS_API_KEY not set in .env" });
  }

  const messages = [
    ...history,
    { role: "user", content: message }
  ];

  return new Promise((resolve) => {
    const data = JSON.stringify({ model, messages, max_tokens: 1024 });
    const req = https.request({
      hostname: "api.fireworks.ai",
      port: 443,
      path: "/inference/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "Authorization": `Bearer ${apiKey}`
      }
    }, (res) => {
      let responseData = "";
      res.on("data", (chunk) => { responseData += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
          resolve({ success: true, response: content || "No response" });
        } catch (e) {
          resolve({ error: "Failed to parse Fireworks response" });
        }
      });
    });

    req.on("error", (e) => {
      resolve({ error: e.message });
    });

    req.write(data);
    req.end();
  });
}

ipcMain.handle("ai-request-permission", async (event, { type, details }) => {
  const id = ++permissionIdCounter;
  const webContents = event.sender;

  let message = "";
  if (type === "file_read") {
    message = `AI wants to read: ${details.filePath}`;
  } else if (type === "file_write") {
    message = `AI wants to write to: ${details.filePath}`;
  } else if (type === "command_exec") {
    message = `AI wants to run: ${details.command}`;
  }

  const { response } = await dialog.showMessageBox({
    type: "question",
    buttons: ["Deny", "Allow"],
    title: "AI Permission Request",
    message,
    detail: `This will be executed with your current user permissions.`
  });

  return { permitted: response === 1 };
});

ipcMain.handle("ai-get-sudo-password", async () => {
  const { response, checkboxChecked } = await dialog.showMessageBox({
    type: "question",
    buttons: ["Cancel"],
    cancelId: 0,
    title: "Sudo Password Required",
    message: "This command requires sudo access",
    detail: "Enter your password in the terminal prompt that will appear."
  });

  return { ok: response !== 0 };
});

ipcMain.handle("ai-read-file", async (event, { filePath }) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return { success: true, content };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("ai-write-file", async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, "utf8");
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("ai-exec-command", async (event, { command, sudoPassword }) => {
  const { spawn } = require("child_process");

  return new Promise((resolve) => {
    let cmd = command;
    let args = [];
    let opts = { shell: true };

    if (sudoPassword) {
      cmd = `echo "${sudoPassword}" | sudo -S ${command}`;
    }

    const proc = spawn(cmd, args, opts);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });
    proc.on("close", (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });

    proc.on("error", (err) => {
      resolve({ error: err.message });
    });
  });
});

