const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", { filePath, content }),
  saveFileAs: (content) => ipcRenderer.invoke("save-file-as", { content }),
  openFolder: () => ipcRenderer.invoke("open-folder"),
  readFolder: (folderPath) => ipcRenderer.invoke("read-folder", { folderPath }),
  openFileFromPath: (filePath) => ipcRenderer.invoke("open-file-path", { filePath }),
  terminalStart: (options) => ipcRenderer.invoke("terminal-start", options),
  terminalInput: (data) => ipcRenderer.send("terminal-input", data),
  terminalResize: (cols, rows) => ipcRenderer.send("terminal-resize", { cols, rows }),
  terminalKill: () => ipcRenderer.send("terminal-kill"),
  onTerminalData: (handler) => ipcRenderer.on("terminal-data", (_event, data) => handler(data)),
  onTerminalExit: (handler) => ipcRenderer.on("terminal-exit", (_event, payload) => handler(payload)),
  aiChat: (message, history) => ipcRenderer.invoke("ai-chat", { message, history }),
  aiRequestPermission: (type, details) => ipcRenderer.invoke("ai-request-permission", { type, details }),
  aiGetSudoPassword: () => ipcRenderer.invoke("ai-get-sudo-password"),
  aiReadFile: (filePath) => ipcRenderer.invoke("ai-read-file", { filePath }),
  aiWriteFile: (filePath, content) => ipcRenderer.invoke("ai-write-file", { filePath, content }),
  aiExecCommand: (command, sudoPassword) => ipcRenderer.invoke("ai-exec-command", { command, sudoPassword })
});
