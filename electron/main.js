const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env.local"),
});



const { app, BrowserWindow } = require("electron");
const next = require("next");

const PORT = 3000;
const isDev = !app.isPackaged;

let mainWindow;

async function startNextServer() {
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, ".."),
  });

  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  const express = require("express");
  const server = express();

  server.use( (req, res) => {
    return handle(req, res);
  });

  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => {
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    title: "Hospital Referral - Al Rifai",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../public/icons/icon-512.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
