const { app, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const remote = require("@electron/remote/main");

remote.initialize();

const windows = new Set();
const files = new Map();

app.on("will-finish-launching", () => {
  app.on("open-file", (event, file) => {
    const win = createWindow();
    win.once("ready-to-show", () => {
      openFile(win, file);
    });
  });
});

app.on("ready", () => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return false;
  app.quit();
});

app.on("activate", (event, hasVisibleWindows) => {
  if (!hasVisibleWindows) createWindow();
});

const stopWatchingFile = (targetWindow) => {
  const file = files.get(targetWindow);
  if (file) {
    file.stop();
    files.delete(targetWindow);
  }
};

const startWatchingFile = (targetWindow, file) => {
  stopWatchingFile(targetWindow);

  const watcher = fs.watchFile(file, () => {
    const text = fs.readFileSync(file).toString();
    targetWindow.webContents.send("file-changed", file, text);
  });

  files.set(targetWindow, watcher);
};

const createWindow = () => {
  let x, y;

  const currentWindow = BrowserWindow.getFocusedWindow();

  if (currentWindow) {
    const [currentWindowX, currentWindowY] = currentWindow.getPosition();
    x = currentWindowX + 10;
    y = currentWindowY + 10;
  }

  let newWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  let edited = false;

  remote.enable(newWindow.webContents);

  newWindow.loadFile("app/index.html");

  newWindow.once("ready-to-show", () => {
    newWindow.show();
  });

  newWindow.on("edited", (isEdited) => {
    edited = isEdited;
  });

  newWindow.on("close", (event) => {
    if (newWindow.isDocumentEdited() || edited) {
      event.preventDefault();

      const result = dialog.showMessageBoxSync(newWindow, {
        type: "warning",
        title: "Quit with unsaved changes?",
        message: "Your changes will be lost if you do not save",
        buttons: ["Quit Anyway", "Cancel"],
        defaultId: 0,
        cancelId: 1,
      });

      if (!result) newWindow.destroy();
    }
  });

  newWindow.on("closed", () => {
    windows.delete(newWindow);
    stopWatchingFile(newWindow);
    newWindow = null;
  });

  windows.add(newWindow);

  return newWindow;
};

const getFile = (targetWindow) => {
  const files = dialog.showOpenDialogSync(targetWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Text Files", extensions: ["txt"] },
      { name: "Markdown Files", extensions: ["md", "markdown"] },
    ],
  });

  if (files) openFile(targetWindow, files[0]);
};

const openFile = (targetWindow, file) => {
  startWatchingFile(targetWindow, file);
  const text = fs.readFileSync(file).toString();
  app.addRecentDocument(file);
  targetWindow.setRepresentedFilename(file);
  targetWindow.webContents.send("file-opened", file, text);
};

const saveHtml = (targetWindow, text) => {
  const file = dialog.showSaveDialogSync(targetWindow, {
    title: "Save HTML",
    defaultPath: app.getPath("documents"),
    filters: [
      {
        name: "HTML Files",
        extensions: ["html", "htm"],
      },
    ],
  });

  if (!file) return;

  fs.writeFileSync(file, text);
};

const saveMarkdown = (targetWindow, file, text) => {
  if (!file)
    file = dialog.showSaveDialogSync(targetWindow, {
      title: "Save Markdown",
      defaultPath: app.getPath("documents"),
      filters: [
        {
          name: "Markdown Files",
          extensions: ["md", "markdown"],
        },
      ],
    });

  if (!file) return;

  fs.writeFileSync(file, text);
  openFile(targetWindow, file);
};

exports.openFile = openFile;
exports.getFile = getFile;
exports.createWindow = createWindow;
exports.saveHtml = saveHtml;
exports.saveMarkdown = saveMarkdown;
