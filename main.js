// main.js
const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');


const HISTORY_LIMIT = 100;
const POLL_MS = 800;

// Rutas de almacenamiento
const userData = app.getPath('userData'); // ~/Library/Application Support/ClipMenu
const historyFile = path.join(userData, 'history.json');
const imagesDir = path.join(userData, 'images');

// Estado
let mainWindow = null;
let tray = null;
let history = []; // [{id, type: 'text'|'image', content|path, signature?, when}]
let lastSignature = ''; // para evitar duplicados consecutivos
let lastApp = null;

// --- Utilidades de persistencia ---
function ensureDirs() {
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
}

function loadHistory() {
  try {
    const raw = fs.readFileSync(historyFile, 'utf-8');
    history = JSON.parse(raw);
  } catch {
    history = [];
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, HISTORY_LIMIT)), 'utf-8');
  } catch (e) {
    console.error('No se pudo guardar el historial:', e);
  }
}

// --- Generar hash de imagen ---
function getImageSignature(image) {
  const png = image.toPNG();
  return crypto.createHash('sha1').update(png).digest('hex');
}

// --- Agregar item al historial ---
function pushHistory(item) {
  let sig;
  if (item.type === 'text') {
    sig = `text:${item.content}`;
  } else if (item.type === 'image') {
    sig = item.signature;
  }

  // Evita duplicados consecutivos
  if (sig === lastSignature) return;
  lastSignature = sig;

  // Remover duplicados previos del historial
  if (item.type === 'text') {
    history = history.filter(h => !(h.type === 'text' && h.content === item.content));
  } else if (item.type === 'image') {
    history = history.filter(h => !(h.type === 'image' && h.signature === item.signature));
  }

  item.id = Date.now();
  item.when = new Date().toISOString();
  history.unshift(item);
  if (history.length > HISTORY_LIMIT) history.pop();
  saveHistory();
  if (mainWindow) mainWindow.webContents.send('history-updated', history);
}

// --- Poll del portapapeles ---
function pollClipboard() {
  const text = clipboard.readText();
  if (text && text.trim().length) {
    pushHistory({ type: 'text', content: text });
    return;
  }

  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    try {
      const sig = getImageSignature(image);

      // Evita duplicado consecutivo
      if (sig === lastSignature) return;

      const png = image.toPNG();
      const filename = `img-${Date.now()}.png`;
      const filepath = path.join(imagesDir, filename);
      fs.writeFileSync(filepath, png);

      const item = { type: 'image', path: filepath, signature: sig };
      pushHistory(item);
    } catch (e) {
      console.error('Error guardando imagen del portapapeles:', e);
    }
  }
}

// --- Ventana flotante del historial ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 560,
    show: false,
    resizable: false,
    alwaysOnTop: true,
    //titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    if (mainWindow && mainWindow.isVisible()) mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow.hide();
  })
}

// --- Bandeja (barra de menú) ---
function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('ClipMenu – Clipboard Manager');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar historial (⌘⇧V)', click: toggleWindow },
    { type: 'separator' },
    {
      label: 'Abrir al iniciar sesión',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
      }
    },
    { type: 'separator' },
    { label: 'Salir', role: 'quit' }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    getActiveApp(() => {
      mainWindow.center();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('history-updated', history);
    });
  }
}

// --- Atajo global ---
function registerShortcut() {
  const ok = globalShortcut.register('CommandOrControl+Shift+V', () => {
    toggleWindow();
  });
  if (!ok) {
    console.error('No se pudo registrar ⌘⇧V. Puede estar en uso por otra app.');
  }
}

function cleanupOldHistory(days = 2) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // Filtrar historial (solo lo más nuevo)
  const fresh = history.filter(item => {
    const ts = new Date(item.when).getTime();
    return ts > cutoff;
  });

  // Encontrar imágenes huérfanas
  const validPaths = new Set(fresh.filter(i => i.type === 'image').map(i => i.path));
  for (const file of fs.readdirSync(imagesDir)) {
    const full = path.join(imagesDir, file);
    if (!validPaths.has(full)) {
      try { fs.unlinkSync(full); } catch (e) { console.error("Error borrando img:", e); }
    }
  }

  history = fresh;
  saveHistory();

  if (mainWindow) {
    mainWindow.webContents.send('history-updated', history);
  }
}


// --- Single instance ---
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// --- App ready ---
app.whenReady().then(() => {
  ensureDirs();
  loadHistory();
  cleanupOldHistory(2);
  createWindow();
  createTray();
  registerShortcut();


  if (process.platform === 'darwin'){
    app.dock.hide(); //Ocultar app en el dock
  }

  const login = app.getLoginItemSettings();
  if (!login.openAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  setInterval(pollClipboard, POLL_MS);
});

// Evitar que la app se cierre al cerrar ventanas
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

// Limpieza
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// --- IPC ---
ipcMain.handle('get-history', () => history);

function getActiveApp(callback) {
  exec(
    `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`,
    (err, stdout) => {
      if (!err && stdout) {
        lastApp = stdout.trim();
      }
      if (callback) callback();
    }
  );
}


ipcMain.on('use-item', async (_evt, itemId) => {
  const item = history.find(h => h.id === itemId);
  if (!item) return;

  // Copiar al portapapeles
  if (item.type === 'text') {
    clipboard.writeText(item.content);
  } else if (item.type === 'image') {
    const img = nativeImage.createFromPath(item.path);
    clipboard.writeImage(img);
  }

  // Reinsertar en el historial (lo sube arriba otra vez)
  pushHistory(item);

  // Ocultar ventana para devolver foco a la app anterior
  if (mainWindow) mainWindow.hide();

  // 👇 aquí devolvemos el foco a la app original y mandamos Cmd+V
  if (process.platform === "darwin" && lastApp) {
    setTimeout(() => {
    exec(`osascript -e '
      tell application "${lastApp}" to activate
      tell application "System Events" to keystroke "v" using {command down}
      '`);
}, 200); // darle tiempo a Electron para ocultarse
  }
});

ipcMain.on('delete-item', (_evt, id) => {
  const idx = history.findIndex(h => h.id === id);
  if (idx !== -1) {
    const [removed] = history.splice(idx, 1);

    // Si es imagen, borrar archivo
    if (removed.type === 'image' && fs.existsSync(removed.path)) {
      try { fs.unlinkSync(removed.path); } catch (e) { console.error("Error borrando img:", e); }
    }

    saveHistory();

    if (mainWindow) mainWindow.webContents.send('history-updated', history);
  }
});



ipcMain.on('clear-history', () => {
  history = [];
  saveHistory();
  if (mainWindow) mainWindow.webContents.send('history-updated', history);
});
