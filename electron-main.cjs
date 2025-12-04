const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Check if we're in development mode
const isDev = process.env.IS_DEV === 'true';

// Enable auto-reload for main process files in development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit',
      // Watch main process files
      ignored: /node_modules|[\\/\\]\\.|dist|build/
    });
  } catch (err) {
    console.log('electron-reload not available');
  }
}

// ----------------------------------------------------
// Global Exception/Rejection Handling (Securely in Main Process)
// ----------------------------------------------------
// Rationale: Relocating the uncaughtException handler from the preload script 
// to the main process addresses the SecurityWarning and maintains security 
// best practices by keeping process-level listeners out of the renderer context.
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in Main Process:', err);
  // You might want to display a user-friendly error dialog here
  // dialog.showErrorBox('Application Error', 'An unhandled exception occurred.');
});

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

  mainWindow.on('close', (e) => {
    if (isQuitting) {
      return;
    }
    e.preventDefault();
    mainWindow.webContents.send('app-close-request');
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

// IPC Handler for Print to PDF
ipcMain.handle('print-to-pdf', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    
    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Save Maintenance Report',
      defaultPath: `maintenance-report-${new Date().toISOString().split('T')[0]}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    // Generate PDF with proper options
    const pdfData = await win.webContents.printToPDF({
      marginsType: 0,
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      preferCSSPageSize: false
    });
    
    // Save to file
    await fs.promises.writeFile(filePath, pdfData);
    
    return { success: true, path: filePath };
  } catch (error) {
    console.error('PDF generation error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler for checking unsaved changes synchronously
ipcMain.on('check-unsaved-changes', (event, isDirty) => {
  if (!isDirty) {
    event.returnValue = true; // Allow close
    return;
  }

  const choice = dialog.showMessageBoxSync({
    type: 'question',
    buttons: ['Cancel', 'Exit without Saving'],
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to exit?',
    defaultId: 0,
    cancelId: 0
  });

  // choice 0 is Cancel, choice 1 is Exit
  event.returnValue = choice === 1;
});

let isQuitting = false;

ipcMain.on('app-close-approved', () => {
  isQuitting = true;
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
