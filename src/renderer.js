const editor = document.getElementById("editor");
const btnNew = document.getElementById("btnNew");
const btnOpen = document.getElementById("btnOpen");
const btnSave = document.getElementById("btnSave");
const btnSaveAs = document.getElementById("btnSaveAs");
const btnOpenFolder = document.getElementById("btnOpenFolder");
const currentFileName = document.getElementById("currentFileName");
const currentFolder = document.getElementById("currentFolder");
const fileTree = document.getElementById("fileTree");
const editorStatus = document.getElementById("editorStatus");
const consoleLog = document.getElementById("consoleLog");
const portalWebview = document.getElementById("portalWebview");
const browserUrl = document.getElementById("browserUrl");
const btnBack = document.getElementById("btnBack");
const btnForward = document.getElementById("btnForward");
const btnReload = document.getElementById("btnReload");
const btnGo = document.getElementById("btnGo");
const linkButtons = Array.from(document.querySelectorAll(".link-button"));

let currentFilePath = null;
let isSaved = true;

function log(message, type = "info") {
  const entry = document.createElement("p");
  entry.textContent = message;
  entry.style.color = type === "error" ? "#f17e7e" : type === "success" ? "#7dd484" : "var(--muted)";
  consoleLog.prepend(entry);
}

function setStatus(message) {
  editorStatus.textContent = message;
}

function setFileName(name) {
  currentFileName.textContent = name || "untitled.txt";
}

async function openFile() {
  const file = await window.api.openFile();
  if (!file) {
    setStatus("Open canceled.");
    return;
  }
  editor.value = file.content;
  currentFilePath = file.filePath;
  setFileName(file.name);
  isSaved = true;
  setStatus(`Loaded ${file.name}`);
  log(`Opened ${file.name}`);
}

async function saveFile() {
  if (!currentFilePath) {
    return saveFileAs();
  }
  await window.api.saveFile(currentFilePath, editor.value);
  isSaved = true;
  setStatus(`Saved ${currentFileName.textContent}`);
  log(`Saved ${currentFileName.textContent}`, "success");
}

async function saveFileAs() {
  const file = await window.api.saveFileAs(editor.value);
  if (!file) {
    setStatus("Save canceled.");
    return;
  }
  currentFilePath = file.filePath;
  setFileName(file.name);
  isSaved = true;
  setStatus(`Saved ${file.name}`);
  log(`Saved as ${file.name}`, "success");
}

function maybeWarnUnsaved() {
  if (!isSaved) {
    return confirm("You have unsaved changes. Continue without saving?");
  }
  return true;
}

btnNew.addEventListener("click", () => {
  if (!maybeWarnUnsaved()) return;
  editor.value = "";
  currentFilePath = null;
  setFileName("untitled.txt");
  isSaved = true;
  setStatus("Ready to edit");
  log("Started a new file.");
});

btnOpen.addEventListener("click", openFile);
btnSave.addEventListener("click", saveFile);
btnSaveAs.addEventListener("click", saveFileAs);
btnOpenFolder.addEventListener('click', async () => {
  const folder = await window.api.openFolder();
  if (!folder) {
    setStatus('Folder open canceled.');
    return;
  }
  currentFolder.textContent = folder;
  setStatus(`Opened folder ${folder}`);
  const tree = await window.api.readFolder(folder);
  renderFileTree(tree, fileTree);
});

function updateBrowserUrl() {
  const url = browserUrl.value.trim();
  if (!url) return;
  const normalized = url.match(/^https?:\/\//) ? url : `https://${url}`;
  portalWebview.src = normalized;
  setStatus(`Loading ${normalized}`);
  log(`Navigating to ${normalized}`);
}

btnGo.addEventListener("click", updateBrowserUrl);
browserUrl.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    updateBrowserUrl();
  }
});

btnBack.addEventListener("click", () => {
  if (portalWebview.canGoBack()) portalWebview.goBack();
});
btnForward.addEventListener("click", () => {
  if (portalWebview.canGoForward()) portalWebview.goForward();
});
btnReload.addEventListener("click", () => {
  portalWebview.reload();
});

portalWebview.addEventListener("did-start-loading", () => {
  setStatus("Browser loading...");
});
portalWebview.addEventListener("did-stop-loading", () => {
  setStatus("Browser ready");
  browserUrl.value = portalWebview.getURL();
});
portalWebview.addEventListener("did-fail-load", () => {
  setStatus("Browser failed to load.");
  log("Browser failed to load the page.", "error");
});

editor.addEventListener("input", () => {
  isSaved = false;
});

window.addEventListener("beforeunload", (event) => {
  if (!isSaved) {
    event.returnValue = "You have unsaved changes.";
  }
});


function renderFileTree(tree, parent) {
  parent.innerHTML = "";
  tree.forEach((item) => {
    const node = document.createElement('div');
    node.className = 'file-tree-item';
    node.textContent = item.name;
    node.dataset.path = item.path;
    node.dataset.type = item.type;
    if (item.type === 'folder') {
      node.classList.add('folder');
      const childList = document.createElement('div');
      childList.className = 'file-tree-children';
      node.appendChild(childList);
      node.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (childList.childElementCount === 0) {
          const subtree = await window.api.readFolder(item.path);
          renderFileTree(subtree, childList);
        } else {
          childList.classList.toggle('collapsed');
        }
      });
    } else {
      node.classList.add('file');
      node.addEventListener('click', async () => {
        const file = await window.api.openFileFromPath(item.path);
        if (file) {
          editor.value = file.content;
          currentFilePath = file.filePath;
          setFileName(file.name);
          isSaved = true;
          setStatus(`Loaded ${file.name}`);
          log(`Opened ${file.name}`);
        }
      });
    }
    parent.appendChild(node);
  });
}

linkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const url = button.dataset.url;
    portalWebview.src = url;
    browserUrl.value = url;
    setStatus(`Browsing ${url}`);
    log(`Opened ${url}`);
  });
});

