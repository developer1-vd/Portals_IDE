const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", { filePath, content }),
  saveFileAs: (content) => ipcRenderer.invoke("save-file-as", { content }),
  openFolder: () => ipcRenderer.invoke("open-folder"),
  readFolder: (folderPath) => ipcRenderer.invoke("read-folder", { folderPath }),
  openFileFromPath: (filePath) => ipcRenderer.invoke("open-file-path", { filePath })
});
