const path = require("path");
const { ipcRenderer } = require("electron");
const { marked } = require("marked");
const remote = require("@electron/remote");

const mainProcess = remote.require("./main");

const markdownView = document.querySelector("#markdown");
const htmlView = document.querySelector("#html");
const newFileButton = document.querySelector("#new-file");
const openFileButton = document.querySelector("#open-file");
const saveMarkdownButton = document.querySelector("#save-markdown");
const revertButton = document.querySelector("#revert");
const saveHtmlButton = document.querySelector("#save-html");
const showFileButton = document.querySelector("#show-file");
const openInDefaultButton = document.querySelector("#open-in-default");

const currentWindow = remote.getCurrentWindow();

let filePath = null;
let originalText = "";
let edited = false;

const renderMarkdownToHtml = (markdown) => {
  htmlView.innerHTML = marked(markdown, { sanitize: true });
};

const updateUI = (isEdited) => {
  edited = Boolean(isEdited);
  let title = "Editor";
  if (filePath) title = `${path.basename(filePath)} - ${title}`;
  if (edited) title = `${title} (Unsaved)`;

  currentWindow.setTitle(title);
  currentWindow.setDocumentEdited(edited);
  currentWindow.emit("edited", edited);

  saveMarkdownButton.disabled = !edited;
  revertButton.disabled = !edited;
  saveHtmlButton.disabled = !htmlView.innerHTML;
};

const getDraggedFile = (event) => event.dataTransfer.items[0];

const getDroppedFile = (event) => event.dataTransfer.files[0];

const supportedFiles = new Set(["text/plain", "text/markdown"]);

const fileIsSupported = (file) => supportedFiles.has(file.type);

document.addEventListener("dragstart", (event) => event.preventDefault());
document.addEventListener("dragover", (event) => event.preventDefault());
document.addEventListener("dragleave", (event) => event.preventDefault());
document.addEventListener("drop", (event) => event.preventDefault());

markdownView.addEventListener("keyup", (event) => {
  const currentText = event.target.value;
  renderMarkdownToHtml(currentText);
  updateUI(currentText !== originalText);
});

markdownView.addEventListener("dragover", (event) => {
  const file = getDraggedFile(event);

  markdownView.classList.add(
    fileIsSupported(file) ? "drag-over" : "drag-error"
  );
});

markdownView.addEventListener("dragleave", () => {
  markdownView.classList.remove("drag-over");
  markdownView.classList.remove("drag-error");
});

markdownView.addEventListener("drop", (event) => {
  const file = getDroppedFile(event);

  if (fileIsSupported(file)) {
    mainProcess.openFile(currentWindow, file.path);
  } else {
    alert("This file type is not supported");
  }

  markdownView.classList.remove("drag-over");
  markdownView.classList.remove("drag-error");
});

openFileButton.addEventListener("click", () => {
  mainProcess.getFile(currentWindow);
});

newFileButton.addEventListener("click", () => {
  mainProcess.createWindow();
});

saveHtmlButton.addEventListener("click", () => {
  mainProcess.saveHtml(currentWindow, htmlView.innerHTML);
});

saveMarkdownButton.addEventListener("click", () => {
  mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

revertButton.addEventListener("click", () => {
  markdownView.value = originalText;
  renderMarkdownToHtml(originalText);
  updateUI();
});

const renderFile = (file, text) => {
  filePath = file;
  originalText = text;

  markdownView.value = text;
  renderMarkdownToHtml(text);

  updateUI();
};

ipcRenderer.on("file-opened", (event, file, text) => {
  if ((currentWindow.isDocumentEdited() || edited) && file !== filePath) {
    const result = remote.dialog.showMessageBoxSync(currentWindow, {
      type: "warning",
      title: "Overwrite current unsaved changes?",
      message:
        "Opening a new file in this window will overwrite unsaved changes. Open this file anyway?",
      buttons: ["Yes", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result === 1) return;
  }

  renderFile(file, text);
});

ipcRenderer.on("file-changed", (event, file, text) => {
  remote.dialog.showMessageBoxSync(currentWindow, {
    type: "warning",
    title: "File is changed",
    message: "Another application has changed this file",
  });

  renderFile(file, text);
});
