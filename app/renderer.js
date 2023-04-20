const { remote, ipcRenderer } = require("electron");
const { marked } = require("marked");
const mainProcess = require("@electron/remote").require("./main");

const markdownView = document.querySelector("#markdown");
const htmlView = document.querySelector("#html");
const newFileButton = document.querySelector("#new-file");
const openFileButton = document.querySelector("#open-file");
const saveMarkdownButton = document.querySelector("#save-markdown");
const revertButton = document.querySelector("#revert");
const saveHtmlButton = document.querySelector("#save-html");
const showFileButton = document.querySelector("#show-file");
const openInDefaultButton = document.querySelector("#open-in-default");

const renderMarkdownToHtml = (markdown) => {
  htmlView.innerHTML = marked(markdown, { sanitize: true });
};

markdownView.addEventListener("keyup", (event) => {
  const currentContent = event.target.value;
  renderMarkdownToHtml(currentContent);
});

openFileButton.addEventListener("click", () => {
  mainProcess.getFile();
});

ipcRenderer.on("file-opened", (event, file, text) => {
  markdownView.innerHTML = text;
  renderMarkdownToHtml(text);
});
