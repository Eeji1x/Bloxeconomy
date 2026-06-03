// BloxEconomy Desktop Client
// Registers `bloxeconomy://` so the website can launch the client and deep-link
// straight into a game (e.g. bloxeconomy://game/sword-fight?u=<userId>).
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const PROTOCOL = 'bloxeconomy';
const WEB_BASE = 'https://bloxeco.lovable.app';

// Register custom URL scheme
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let mainWindow = null;

function urlFromArgs(argv) {
  const arg = (argv || []).find((a) => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`));
  if (!arg) return null;
  // bloxeconomy://game/sword-fight?u=xxx  -> /games/sword-fight?u=xxx&client=desktop
  try {
    const url = new URL(arg);
    const host = url.hostname;            // "game"
    const pathPart = url.pathname || '';  // "/sword-fight"
    const search = url.search ? `${url.search}&client=desktop` : '?client=desktop';
    if (host === 'game') return `${WEB_BASE}/games${pathPart}${search}`;
    return `${WEB_BASE}/${host}${pathPart}${search}`;
  } catch {
    return null;
  }
}

function createWindow(initialUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'BloxEconomy Client',
    backgroundColor: '#0a0a1a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(initialUrl || `${WEB_BASE}/games`);

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Single instance — second launch (via protocol) routes to the running window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = urlFromArgs(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (deepLink) mainWindow.loadURL(deepLink);
    }
  });

  app.whenReady().then(() => {
    const deepLink = urlFromArgs(process.argv);
    createWindow(deepLink);
  });
}

// macOS deep-link handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  const target = urlFromArgs([url]);
  if (mainWindow && target) mainWindow.loadURL(target);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
