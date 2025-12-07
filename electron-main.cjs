const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const Database = require('better-sqlite3');
const ElectronStore = require('electron-store');

// Initialize electron-store for settings
const store = new ElectronStore.default();

// Database instance
let db = null;

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

// ----------------------------------------------------
// Database Initialization
// ----------------------------------------------------
function initDatabase(filePath) {
  try {
    console.log('[DB] Initializing database at:', filePath);

    // Close existing connection if any
    if (db) {
      db.close();
    }

    db = new Database(filePath);

    // Enable WAL mode for better concurrency and OneDrive compatibility
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000'); // 5 second timeout for locks

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        customer TEXT,
        location TEXT,
        full_location TEXT,
        street_address TEXT,
        city TEXT,
        state TEXT,
        postcode TEXT,
        country TEXT DEFAULT 'Australia',
        gps_coordinates TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_position TEXT,
        contact_phone1 TEXT,
        contact_phone2 TEXT,
        active INTEGER DEFAULT 1,
        logo TEXT,
        type TEXT DEFAULT 'Mine',
        type_detail TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        weigher TEXT,
        last_cal TEXT,
        frequency INTEGER,
        due_date TEXT,
        remaining INTEGER,
        active INTEGER DEFAULT 1,
        op_status TEXT,
        op_note TEXT,
        op_note_timestamp TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS specifications (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        weigher TEXT,
        alt_code TEXT,
        scale_type TEXT,
        integrator_controller TEXT,
        billet_weight_type TEXT,
        billet_weight_size TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL,
        parent_type TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        archived INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        asset_id TEXT,
        asset_name TEXT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT,
        status TEXT DEFAULT 'Open',
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT,
        file_name TEXT,
        job_number TEXT,
        report_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS asset_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT NOT NULL,
        date TEXT NOT NULL,
        action TEXT NOT NULL,
        user TEXT,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS spec_notes (
        id TEXT PRIMARY KEY,
        spec_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (spec_id) REFERENCES specifications(id) ON DELETE CASCADE
      );
    `);

    console.log('[DB] Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('[DB] Initialization error:', error);
    return { success: false, error: error.message };
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

    // Set Content Security Policy for development
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' http://localhost:5173 ws://localhost:5173 data: blob:; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com']
        }
      });
    });

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

    // Set Content Security Policy for production
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: blob:; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com data:; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; connect-src \'self\' https://fonts.googleapis.com; img-src \'self\' data: blob: https:;']
        }
      });
    });
  }

  mainWindow.on('close', (e) => {
    if (isQuitting) {
      return;
    }
    e.preventDefault();
    mainWindow.webContents.send('app-close-request');
  });
}

app.whenReady().then(async () => {
  // Install React DevTools in Development
  if (isDev) {
    try {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
      const name = await installExtension(REACT_DEVELOPER_TOOLS);
      console.log(`[DevTools] Added Extension: ${name}`);
    } catch (err) {
      console.log('[DevTools] Error loading React DevTools:', err);
    }
  }

  // Initialize database if path is saved
  const dbPath = store.get('dbPath');
  if (dbPath) {
    console.log('[DB] Initializing database from saved path:', dbPath);
    initDatabase(dbPath);
  } else {
    console.log('[DB] No database path found. User will need to select location.');
  }

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

// ----------------------------------------------------
// Database IPC Handlers
// ----------------------------------------------------

// Get current database path
ipcMain.handle('get-db-path', () => {
  const dbPath = store.get('dbPath', null);
  console.log('[DB] Get path:', dbPath);
  return dbPath;
});

// Select database location
ipcMain.handle('select-db-location', async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Select Database Location',
      defaultPath: 'maintenance.db',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['createDirectory']
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const result = initDatabase(filePath);
    if (result.success) {
      store.set('dbPath', filePath);
      console.log('[DB] Database path saved:', filePath);
      return { success: true, path: filePath };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('[DB] Select location error:', error);
    return { success: false, error: error.message };
  }
});

// Load all sites with related data
ipcMain.handle('db-get-all-sites', () => {
  if (!db) {
    console.warn('[DB] Database not initialized');
    return [];
  }

  try {
    const sites = db.prepare('SELECT * FROM sites').all();
    console.log(`[DB] Loading ${sites.length} sites`);

    // Load related data for each site
    return sites.map(site => {
      // Load assets
      const assets = db.prepare('SELECT * FROM assets WHERE site_id = ?').all(site.id);
      const serviceData = assets.filter(a => a.asset_type === 'service');
      const rollerData = assets.filter(a => a.asset_type === 'roller');

      // Load specifications
      const specs = db.prepare('SELECT * FROM specifications WHERE site_id = ?').all(site.id);

      // Load site notes
      const siteNotes = db.prepare('SELECT * FROM notes WHERE parent_id = ? AND parent_type = ?').all(site.id, 'site');

      // Load issues
      const issues = db.prepare('SELECT * FROM issues WHERE site_id = ?').all(site.id);

      // Load reports and history for each asset
      const loadAssetData = (asset) => {
        const reports = db.prepare('SELECT * FROM reports WHERE asset_id = ?').all(asset.id);
        const history = db.prepare('SELECT * FROM asset_history WHERE asset_id = ?').all(asset.id);

        return {
          ...asset,
          active: Boolean(asset.active),
          reports: reports.map(r => ({
            ...r,
            data: r.report_data ? JSON.parse(r.report_data) : {}
          })),
          history
        };
      };

      // Load spec notes for each spec
      const loadSpecData = (spec) => {
        const specNotes = db.prepare('SELECT * FROM spec_notes WHERE spec_id = ?').all(spec.id);
        return {
          ...spec,
          notes: specNotes
        };
      };

      return {
        ...site,
        active: Boolean(site.active),
        serviceData: serviceData.map(loadAssetData),
        rollerData: rollerData.map(loadAssetData),
        specData: specs.map(loadSpecData),
        notes: siteNotes,
        issues
      };
    });
  } catch (error) {
    console.error('[DB] Error loading sites:', error);
    return [];
  }
});

// Save site (insert or update)
ipcMain.handle('db-save-site', (event, siteData) => {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const transaction = db.transaction(() => {
      // Upsert site
      const siteStmt = db.prepare(`
        INSERT OR REPLACE INTO sites (
          id, name, customer, location, full_location, street_address,
          city, state, postcode, country, gps_coordinates,
          contact_name, contact_email, contact_position,
          contact_phone1, contact_phone2, active, logo, type, type_detail,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      siteStmt.run(
        siteData.id, siteData.name, siteData.customer, siteData.location,
        siteData.fullLocation, siteData.streetAddress, siteData.city,
        siteData.state, siteData.postcode, siteData.country,
        siteData.gpsCoordinates, siteData.contactName, siteData.contactEmail,
        siteData.contactPosition, siteData.contactPhone1, siteData.contactPhone2,
        siteData.active ? 1 : 0, siteData.logo, siteData.type, siteData.typeDetail
      );

      // Delete existing assets for this site (we'll re-insert them)
      db.prepare('DELETE FROM assets WHERE site_id = ?').run(siteData.id);

      // Save assets
      const assetStmt = db.prepare(`
        INSERT INTO assets (
          id, site_id, asset_type, name, code, weigher, last_cal,
          frequency, due_date, remaining, active, op_status, op_note,
          op_note_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      (siteData.serviceData || []).forEach(asset => {
        assetStmt.run(
          asset.id, siteData.id, 'service', asset.name, asset.code,
          asset.weigher, asset.lastCal, asset.frequency, asset.dueDate,
          asset.remaining, asset.active ? 1 : 0, asset.opStatus,
          asset.opNote, asset.opNoteTimestamp
        );

        // Save asset history
        const historyStmt = db.prepare(`
          INSERT OR REPLACE INTO asset_history (id, asset_id, date, action, user)
          VALUES (?, ?, ?, ?, ?)
        `);
        (asset.history || []).forEach((h, idx) => {
          const historyId = `${asset.id}-h-${idx}`;
          historyStmt.run(historyId, asset.id, h.date, h.action, h.user);
        });

        // Save asset reports
        const reportStmt = db.prepare(`
          INSERT OR REPLACE INTO reports (id, asset_id, date, type, file_name, job_number, report_data)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        (asset.reports || []).forEach(report => {
          reportStmt.run(
            report.id, asset.id, report.date, report.type,
            report.fileName, report.jobNumber,
            JSON.stringify(report.data || {})
          );
        });
      });

      (siteData.rollerData || []).forEach(asset => {
        assetStmt.run(
          asset.id, siteData.id, 'roller', asset.name, asset.code,
          asset.weigher, asset.lastCal, asset.frequency, asset.dueDate,
          asset.remaining, asset.active ? 1 : 0, asset.opStatus,
          asset.opNote, asset.opNoteTimestamp
        );

        // Save asset history
        const historyStmt = db.prepare(`
          INSERT OR REPLACE INTO asset_history (id, asset_id, date, action, user)
          VALUES (?, ?, ?, ?, ?)
        `);
        (asset.history || []).forEach((h, idx) => {
          const historyId = `${asset.id}-h-${idx}`;
          historyStmt.run(historyId, asset.id, h.date, h.action, h.user);
        });

        // Save asset reports
        const reportStmt = db.prepare(`
          INSERT OR REPLACE INTO reports (id, asset_id, date, type, file_name, job_number, report_data)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        (asset.reports || []).forEach(report => {
          reportStmt.run(
            report.id, asset.id, report.date, report.type,
            report.fileName, report.jobNumber,
            JSON.stringify(report.data || {})
          );
        });
      });

      // Save specifications
      db.prepare('DELETE FROM specifications WHERE site_id = ?').run(siteData.id);
      const specStmt = db.prepare(`
        INSERT INTO specifications (
          id, site_id, weigher, alt_code, scale_type,
          integrator_controller, billet_weight_type, billet_weight_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (siteData.specData || []).forEach(spec => {
        specStmt.run(
          spec.id, siteData.id, spec.weigher, spec.altCode,
          spec.scaleType, spec.integratorController,
          spec.billetWeightType, spec.billetWeightSize
        );

        // Save spec notes
        const specNoteStmt = db.prepare(`
          INSERT OR REPLACE INTO spec_notes (id, spec_id, content, author, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `);
        (spec.notes || []).forEach(note => {
          specNoteStmt.run(note.id, spec.id, note.content, note.author, note.timestamp);
        });
      });

      // Save site notes
      db.prepare('DELETE FROM notes WHERE parent_id = ? AND parent_type = ?').run(siteData.id, 'site');
      const noteStmt = db.prepare(`
        INSERT INTO notes (id, parent_id, parent_type, content, author, timestamp, archived)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      (siteData.notes || []).forEach(note => {
        noteStmt.run(
          note.id, siteData.id, 'site', note.content,
          note.author, note.timestamp, note.archived ? 1 : 0
        );
      });

      // Save issues
      db.prepare('DELETE FROM issues WHERE site_id = ?').run(siteData.id);
      const issueStmt = db.prepare(`
        INSERT INTO issues (
          id, site_id, asset_id, asset_name, title, description,
          priority, status, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (siteData.issues || []).forEach(issue => {
        issueStmt.run(
          issue.id, siteData.id, issue.assetId, issue.assetName,
          issue.title, issue.description, issue.priority,
          issue.status, issue.completedAt
        );
      });
    });

    transaction();
    console.log('[DB] Site saved successfully:', siteData.id);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error saving site:', error);
    return { success: false, error: error.message };
  }
});

// Delete site
ipcMain.handle('db-delete-site', (event, siteId) => {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    db.prepare('DELETE FROM sites WHERE id = ?').run(siteId);
    console.log('[DB] Site deleted:', siteId);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error deleting site:', error);
    return { success: false, error: error.message };
  }
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
