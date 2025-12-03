const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

// Check if we're in development mode
const isDev = process.env.IS_DEV === 'true';

// Enable auto-reload for main process files in development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit',
      // Watch main process files
      ignored: /node_modules|[\/\\]\.|dist|build/
    });
  } catch (err) {
    console.log('electron-reload not available');
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,        // Disabled for security
      contextIsolation: true,         // Enabled for security
      sandbox: true,                  // Additional security layer
    },
  });

  // Load the appropriate URL based on environment
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');

    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from dist folder
    const startUrl = url.format({
      pathname: path.join(__dirname, 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true
    });
    mainWindow.loadURL(startUrl);
  }
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
