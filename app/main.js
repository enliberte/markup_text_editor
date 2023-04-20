const { app, BrowserWindow, dialog, webContents } = require("electron");
const fs = require("fs");
const remote = require("@electron/remote/main");

remote.initialize();

let mainWindow = null;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  remote.enable(mainWindow.webContents);

  mainWindow.loadFile("app/index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

const getFile = () => {
  const files = dialog.showOpenDialogSync(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Text Files", extensions: ["txt"] },
      { name: "Markdown Files", extensions: ["md", "markdown"] },
    ],
  });

  if (files) openFile(files[0]);
};

const openFile = (file) => {
  const text = fs.readFileSync(file).toString();
  mainWindow.webContents.send("file-opened", file, text);
};

exports.getFile = getFile;
