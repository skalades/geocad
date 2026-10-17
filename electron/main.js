import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Single Instance Lock - mencegah dual proses yang menyebabkan storage lock / blank screen
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  let mainWindow = null;

  // 2. Hardware / GPU sandbox flags to prevent crashes on Windows laptops with hybrid GPUs
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('no-sandbox');

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1366,
      height: 768,
      minWidth: 1024,
      minHeight: 640,
      title: 'GeoRoad CAD - WebGIS & Penampang Jalan',
      backgroundColor: '#0f172a', // Mengatasi blank putih: latar belakang awal selalu gelap
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        backgroundThrottling: false,
      },
      show: false,
    });

    // Tampilkan jendela setelah konten siap dirender
    mainWindow.once('ready-to-show', () => {
      mainWindow.maximize();
      mainWindow.show();
    });

    // Fallback: Jika event ready-to-show tertunda lebih dari 2.5 detik, paksa tampilkan
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 2500);

    Menu.setApplicationMenu(null);

    // 3. Pintasan Keyboard: F12 untuk DevTools & Ctrl+R untuk Reload
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
      if (input.control && input.key.toLowerCase() === 'r' && input.type === 'keyDown') {
        mainWindow.reload();
        event.preventDefault();
      }
    });

    // 4. Keamanan Navigasi: Buka link eksternal di browser default pengguna
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // 4. Auto-recovery jika proses Chromium renderer crash
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process crash terdeteksi:', details);
      if (details.reason !== 'clean-exit') {
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
          }
        }, 500);
      }
    });

    // 5. Auto-retry jika pemuatan file lokal index.html tertunda/gagal
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Gagal memuat index.html:', errorCode, errorDescription);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadFile(indexPath);
        }
      }, 500);
    });

    mainWindow.loadFile(indexPath);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // Jika user membuka file .exe kedua kali, fokuskan jendela yang sudah ada
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

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
}
