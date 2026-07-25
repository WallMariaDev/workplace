const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, clipboard, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isQuitting = false;
let serverProcess = null;
let globalHotkeysEnabled = true;

// Convert human shortcut strings (e.g. "Ctrl + Alt + P", "Alt + Space") to Electron Accelerators
function parseToElectronAccelerator(shortcutStr) {
  if (!shortcutStr || typeof shortcutStr !== 'string') return null;
  let s = shortcutStr.trim();
  if (!s) return null;

  // Handle human key names
  s = s.replace(/\bCtrl\b/gi, 'CommandOrControl');
  s = s.replace(/\bControl\b/gi, 'CommandOrControl');
  s = s.replace(/\bAlt\b/gi, 'Alt');
  s = s.replace(/\bShift\b/gi, 'Shift');
  s = s.replace(/\bWin\b/gi, 'Super');
  s = s.replace(/\bMeta\b/gi, 'Super');
  s = s.replace(/\bSpace\b/gi, 'Space');

  // Format with plus sign without spaces
  const parts = s.split(/[\+\s]+/).filter(Boolean);
  if (parts.length === 0) return null;

  return parts.join('+');
}

// Start Express backend server
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

// Register all global OS hotkeys from app configuration
function registerGlobalOSShortcuts(config) {
  globalShortcut.unregisterAll();
  if (!globalHotkeysEnabled) return;

  const safeRegister = (shortcutStr, payload) => {
    const accel = parseToElectronAccelerator(shortcutStr);
    if (!accel) return;

    try {
      const isSuccess = globalShortcut.register(accel, () => {
        handleGlobalHotkeyTrigger(payload);
      });
      if (isSuccess) {
        console.log(`Successfully registered OS global hotkey: "${shortcutStr}" -> "${accel}"`);
      } else {
        console.warn(`Failed or already in use: "${shortcutStr}"`);
      }
    } catch (err) {
      console.warn(`Error registering shortcut "${shortcutStr}":`, err);
    }
  };

  // 1. AI Anywhere Launcher (Default Alt+Space or custom)
  const aiAnywhereShortcut = config?.aiAnywhereShortcut || 'Alt + Space';
  safeRegister(aiAnywhereShortcut, { action: 'ai_anywhere' });

  // 2. Quick Notes Scratchpad (Default Alt+N or custom)
  const quickNotesShortcut = config?.quickNotesShortcut || 'Alt + N';
  safeRegister(quickNotesShortcut, { action: 'quick_notes' });

  // 3. Web AI Overlay (Default Alt+Q)
  safeRegister('Alt + Q', { action: 'web_overlay' });

  // 4. Custom Web Overlay Profiles
  if (config?.webOverlayProfiles && Array.isArray(config.webOverlayProfiles)) {
    config.webOverlayProfiles.forEach((prof) => {
      if (prof.isEnabled && prof.shortcut) {
        safeRegister(prof.shortcut, { action: 'web_overlay_profile', profileId: prof.id });
      }
    });
  }

  // 5. Active User Hotkey Presets (Alt+1, Alt+2, Ctrl+Alt+P, etc.)
  if (config?.hotkeys && Array.isArray(config.hotkeys)) {
    config.hotkeys.forEach((preset) => {
      if (preset.isEnabled && preset.comboString) {
        safeRegister(preset.comboString, { action: 'preset', presetId: preset.id });
      }
    });
  }

  // 6. Automation Workflows
  if (config?.automations && Array.isArray(config.automations)) {
    config.automations.forEach((auto) => {
      if (auto.shortcut) {
        safeRegister(auto.shortcut, { action: 'automation', automationId: auto.id });
      }
    });
  }
}

function createOverlayWindow() {
  if (overlayWindow) return;
  overlayWindow = new BrowserWindow({
    width: 900,
    height: 700,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const startUrl = 'http://localhost:3000/?mode=overlay';
  const attemptLoad = (attempts = 0) => {
    overlayWindow.loadURL(startUrl).catch((err) => {
      if (attempts < 20) {
        setTimeout(() => attemptLoad(attempts + 1), 500);
      } else {
        const staticHtml = path.join(__dirname, 'dist', 'index.html');
        if (fs.existsSync(staticHtml)) {
          overlayWindow.loadFile(staticHtml, { query: { mode: 'overlay' } });
        }
      }
    });
  };
  attemptLoad();

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// Triggered whenever any global hotkey is pressed ANYWHERE on Windows / OS
function handleGlobalHotkeyTrigger(payload) {
  // Read current system clipboard text (useful if user highlighted text in Chrome/Word/Notepad)
  let capturedText = '';
  try {
    capturedText = clipboard.readText() || '';
  } catch (e) {
    // ignore
  }

  const isOverlayFeature = ['ai_anywhere', 'quick_notes', 'web_overlay', 'web_overlay_profile'].includes(payload.action);

  if (isOverlayFeature) {
    if (!overlayWindow) createOverlayWindow();

    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.show();
        overlayWindow.focus();
        overlayWindow.webContents.send('global-shortcut-triggered', {
          ...payload,
          capturedText,
          timestamp: Date.now(),
        });
      }
    }, 50);
  } else {
    if (!mainWindow) return;

    // Restore and bring window to focus
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();

    // Give the renderer a tiny delay to wake up if it was suspended
    setTimeout(() => {
      // Send event to React renderer via IPC
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-triggered', {
          ...payload,
          capturedText,
          timestamp: Date.now(),
        });
      }
    }, 50);
  }
}

// System Tray Setup for 24/7 Background Execution
function createSystemTray() {
  if (tray) return;

  // Create a 16x16 tray icon image or load fallback
  let icon = nativeImage.createEmpty();
  const iconPath = path.join(__dirname, 'public', 'vite.svg');
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip('QuickKeys AI - Running in Background (Global Hotkeys Active)');

  const updateContextMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '⚡ Open QuickKeys AI Studio',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: '🚀 AI Anywhere (Alt+Space)',
        click: () => handleGlobalHotkeyTrigger({ action: 'ai_anywhere' }),
      },
      {
        label: '🌐 Web AI Overlay (Alt+Q)',
        click: () => handleGlobalHotkeyTrigger({ action: 'web_overlay' }),
      },
      {
        label: '📝 Quick Notes Scratchpad (Alt+N)',
        click: () => handleGlobalHotkeyTrigger({ action: 'quick_notes' }),
      },
      { type: 'separator' },
      {
        label: globalHotkeysEnabled ? '🟢 System Hotkeys: Active' : '🔴 System Hotkeys: Paused',
        click: () => {
          globalHotkeysEnabled = !globalHotkeysEnabled;
          if (globalHotkeysEnabled) {
            registerGlobalOSShortcuts({});
          } else {
            globalShortcut.unregisterAll();
          }
          updateContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: '❌ Quit QuickKeys AI',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const startUrl = 'http://localhost:3000';

  const attemptLoad = (attempts = 0) => {
    mainWindow.loadURL(startUrl).catch((err) => {
      if (attempts < 20) {
        setTimeout(() => attemptLoad(attempts + 1), 500);
      } else {
        console.warn('Fallback to static file:', err);
        const staticHtml = path.join(__dirname, 'dist', 'index.html');
        if (fs.existsSync(staticHtml)) {
          mainWindow.loadFile(staticHtml);
        }
      }
    });
  };

  attemptLoad();

  // Close to Tray behavior (Keep running in background)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && process.platform === 'win32') {
        tray.displayBalloon({
          title: 'QuickKeys AI Studio',
          content: 'App is running in the background. Press Alt+Space or your hotkeys anytime!',
        });
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// IPC Listeners from React Renderer
ipcMain.on('sync-global-hotkeys', (_event, config) => {
  if (config) {
    registerGlobalOSShortcuts(config);
  }
});

ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('show-app-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('hide-overlay-window', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

app.whenReady().then(() => {
  startBackendServer();
  createWindow();
  createSystemTray();

  // Register default fallback shortcuts initially
  registerGlobalOSShortcuts({
    aiAnywhereShortcut: 'Alt + Space',
    quickNotesShortcut: 'Alt + N',
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      // Ignore
    }
  }
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
