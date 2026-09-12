// Sahayata desktop shell.
//
// This is deliberately a THIN wrapper, not a reimplementation: it opens
// your already-deployed Sahayata site (config.json's "url") inside a
// native window. Auth cookies, Realtime updates, and the payment flows
// all work exactly as they do in a browser tab, because it IS the same
// web app — just without browser chrome, with its own taskbar icon, and
// installable as a normal Windows program.
//
// Edit config.json's "url" to your deployed Vercel URL before building.

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");
const config = require("./config.json");

function isPlaceholderUrl(url) {
  return !url || url.includes("your-sahayata-url");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 560,
    title: config.windowTitle || "Sahayata",
    icon: path.join(__dirname, "build", "icon.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#f9fafb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Links that try to open a new window (e.g. a payment gateway's
  // hosted checkout page) open in the user's real browser instead of a
  // second app window — safer, and avoids re-implementing tab chrome.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isPlaceholderUrl(config.url)) {
    win.loadFile(path.join(__dirname, "not-configured.html"));
  } else {
    win.loadURL(config.url);
  }

  const menu = Menu.buildFromTemplate([
    {
      label: "Sahayata",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
