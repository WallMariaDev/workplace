const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Boot the bundled Express backend server
try {
  require(path.join(__dirname, 'dist', 'server.cjs'));
} catch (err) {
  console.error('Express server initialization note:', err);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'QuickKeys AI Studio',
    autoHideMenuBar: true,
    backgroundColor: '#0F1115',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Attempt loading localhost server, fallback to static dist if needed
  const startUrl = 'http://localhost:3000';
  
  const attemptLoad = (attempts = 0) => {
    win.loadURL(startUrl).catch((err) => {
      if (attempts < 15) {
        setTimeout(() => attemptLoad(attempts + 1), 300);
      } else {
        console.warn('Falling back to static HTML file:', err);
        win.loadFile(path.join(__dirname, 'dist', 'index.html'));
      }
    });
  };

  attemptLoad();

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
