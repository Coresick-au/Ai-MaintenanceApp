const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

// Check if we're in development mode
const isDev = process.env.IS_DEV === 'true';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this example
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
