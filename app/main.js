const { app, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const remote = require("@electron/remote/main");

remote.initialize();

const windows = new Set();

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

  remote.enable(newWindow.webContents);

  newWindow.loadFile("app/index.html");

  newWindow.once("ready-to-show", () => {
    newWindow.show();
  });

  newWindow.on("closed", () => {
    windows.delete(newWindow);
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
  const text = fs.readFileSync(file).toString();
  targetWindow.webContents.send("file-opened", file, text);
};

exports.getFile = getFile;
exports.createWindow = createWindow;
