import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkgUpdater from 'electron-updater';
const { autoUpdater } = pkgUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  // Ẩn thanh menu mặc định của Windows
  win.setMenu(null); 
  // win.maximize();

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
  
  autoUpdater.autoDownload = false; // Tắt tải tự động, chờ React gọi
  autoUpdater.autoInstallOnAppQuit = true;
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// KÊNH GIAO TIẾP VỚI GIAO DIỆN REACT (IPC)
// ==========================================

// 1. Nhận lệnh tải cập nhật
ipcMain.on('start-download', async () => {
  try {
    await autoUpdater.checkForUpdates();
    autoUpdater.downloadUpdate();
  } catch (error) {
    if (win) win.webContents.send('update-error', 'Lỗi hệ thống: ' + error.message);
  }
});

// 2. Nhận lệnh cài đặt (isSilent = true để cài ngầm mượt mà)
ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall(true, true); 
});

// 3. Gửi phần trăm tải xuống
autoUpdater.on('download-progress', (progressObj) => {
  if (win) win.webContents.send('download-progress', progressObj.percent);
});

// 4. Báo hiệu tải hoàn tất
autoUpdater.on('update-downloaded', () => {
  if (win) win.webContents.send('update-downloaded');
});

// 5. Bắt lỗi
autoUpdater.on('error', (error) => {
  if (win) win.webContents.send('update-error', error.message);
});