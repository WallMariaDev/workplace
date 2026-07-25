const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let serverProcess = null;

// Start server (either bundled production server or tsx dev server)
function startBackendServer() {
  const distServer = path.join(__dirname, 'dist', 'server.cjs');
  
  if (fs.existsSync(distServer)) {
    try {
      require(distServer);
      console.log('Loaded bundled production backend server.');
    } catch (err) {
      console.error('Error loading dist/server.cjs:', err);
    }
  } else {
    console.log('Starting development server using tsx server.ts...');
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    serverProcess = spawn(cmd, ['tsx', 'server.ts'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to spawn dev server:', err);
    });
  }
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

  const startUrl = 'http://localhost:3000';
  
  const attemptLoad = (attempts = 0) => {
    win.loadURL(startUrl).catch((err) => {
      if (attempts < 20) {
        setTimeout(() => attemptLoad(attempts + 1), 500);
      } else {
        console.warn('Fallback to static file or server connection lost:', err);
        const staticHtml = path.join(__dirname, 'dist', 'index.html');
        if (fs.existsSync(staticHtml)) {
          win.loadFile(staticHtml);
        }
      }
    });
  };

  attemptLoad();

  // Open external links in user default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      // Ignore cleanup error
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
