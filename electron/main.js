import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
// Thêm thư viện cập nhật ngầm
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
  
  // LỆNH NÀY GIÚP XÓA THANH MENU (File, Edit, View, Window, Help...)
  win.setMenu(null); 

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
  
  autoUpdater.autoDownload = false;
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

// 1. Nhận lệnh báo tải bản cập nhật từ React (ĐÃ SỬA LỖI "Check update first")
ipcMain.on('start-download', async () => {
  try {
    // Bắt buộc phải kiểm tra ngầm trước khi tải
    await autoUpdater.checkForUpdates();
    // Sau đó mới tiến hành tải xuống
    autoUpdater.downloadUpdate();
  } catch (error) {
    if (win) win.webContents.send('update-error', 'Lỗi hệ thống: ' + error.message);
  }
});

// 2. Nhận lệnh báo Cài đặt và Khởi động lại từ React
ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true); 
});

// 3. Gửi phần trăm tải về cho React để làm thanh tiến trình
autoUpdater.on('download-progress', (progressObj) => {
  if (win) win.webContents.send('download-progress', progressObj.percent);
});

// 4. Báo cho React biết đã tải xong file .exe vào bộ nhớ tạm
autoUpdater.on('update-downloaded', () => {
  if (win) win.webContents.send('update-downloaded');
});

// 5. Báo lỗi nếu có
autoUpdater.on('error', (error) => {
  if (win) win.webContents.send('update-error', error.message);
});