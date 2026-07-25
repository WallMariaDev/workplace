const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  syncHotkeys: (config) => {
    try {
      ipcRenderer.send('sync-global-hotkeys', config);
    } catch (e) {
      console.warn('Failed to send sync-global-hotkeys IPC:', e);
    }
  },
  onGlobalShortcut: (callback) => {
    try {
      ipcRenderer.removeAllListeners('global-shortcut-triggered');
      ipcRenderer.on('global-shortcut-triggered', (_event, data) => callback(data));
    } catch (e) {
      console.warn('Failed to register global-shortcut-triggered listener:', e);
    }
  },
  minimizeToTray: () => {
    try {
      ipcRenderer.send('minimize-to-tray');
    } catch (e) {
      console.warn('Failed to send minimize-to-tray IPC:', e);
    }
  },
  showAppWindow: () => {
    try {
      ipcRenderer.send('show-app-window');
    } catch (e) {
      console.warn('Failed to send show-app-window IPC:', e);
    }
  },
  hideOverlayWindow: () => {
    try {
      ipcRenderer.send('hide-overlay-window');
    } catch (e) {
      console.warn('Failed to send hide-overlay-window IPC:', e);
    }
  },
});
