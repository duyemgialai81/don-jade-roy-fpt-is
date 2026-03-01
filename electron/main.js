import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkgUpdater from 'electron-updater';
const { autoUpdater } = pkgUpdater;

// THÊM: Các thư viện dùng cho tính năng Tự động đăng nhập Cốc Cốc
import axios from 'axios';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';

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

// --- PHẦN 1: CẬP NHẬT PHẦN MỀM (AUTO-UPDATE) ---

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


// --- PHẦN 2: TỰ ĐỘNG ĐĂNG NHẬP CỐC CỐC ---

ipcMain.on('auto-login-coccoc', async (event, { emails, masterToken }) => {
  // Lọc email rỗng và giới hạn tối đa 5 tài khoản cùng lúc để tránh treo máy
  const emailsToProcess = emails.filter(e => e.trim() !== '').slice(0, 5);
  
  if (emailsToProcess.length === 0) {
    if (win) win.webContents.send('auto-login-status', { type: 'error', msg: 'Danh sách email trống!' });
    return;
  }

  // Tìm đường dẫn file chạy của Cốc Cốc trên Windows
  const username = os.userInfo().username;
  const cocCocPaths = [
    `C:\\Users\\${username}\\AppData\\Local\\CocCoc\\Browser\\Application\\browser.exe`,
    `C:\\Program Files\\CocCoc\\Browser\\Application\\browser.exe`,
    `C:\\Program Files (x86)\\CocCoc\\Browser\\Application\\browser.exe`
  ];
  const executablePath = cocCocPaths.find(fs.existsSync);

  if (!executablePath) {
    if (win) win.webContents.send('auto-login-status', { type: 'error', msg: 'Không tìm thấy Cốc Cốc trên máy tính này!' });
    return;
  }

  if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Bắt đầu xử lý ${emailsToProcess.length} tài khoản...` });

  // Xử lý từng tài khoản
  for (let i = 0; i < emailsToProcess.length; i++) {
    const email = emailsToProcess[i].trim();
    try {
      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Đang lấy token cho: ${email}...` });

      // 1. Gọi API để lấy Token của khách
      const response = await axios.get(`https://econtract.fpt.com/app/services/uaa/api/authentication/internal?login=${email}`, {
        headers: { Authorization: `Bearer ${masterToken}` }
      });
      const guestToken = response.data.access_token;

      if (!guestToken) throw new Error("Không lấy được access_token từ API");

      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Mở trình duyệt cho: ${email}...` });

      // 2. Mở một cửa sổ Cốc Cốc hoàn toàn mới
      const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: false, // Bật giao diện (false) để nhìn thấy web mở lên
        defaultViewport: null, // Mở full size nội dung
        args: ['--start-maximized'] // Mở to cửa sổ
      });

      const pages = await browser.pages();
      const page = pages[0];

      // 3. Truy cập vào trang web để khởi tạo Local Storage
      await page.goto('https://eaccount.kyta.fpt.com/account-profile', { waitUntil: 'domcontentloaded' });

      // 4. Bơm Token thẳng vào Local Storage bằng DevTools ngầm
      await page.evaluate((token) => {
        // LƯU Ý: Nếu Tên key lưu trong F12 của web FPT không phải là 'access_token' (vd: 'jhi-authenticationToken', 'token'...), 
        // bạn hãy đổi chữ 'access_token' dưới đây cho khớp nhé!
        localStorage.setItem('access_token', token); 
      }, guestToken);

      // 5. Load lại trang để web nhận Token vừa bơm và tự động nhảy vào giao diện bên trong
      await page.reload({ waitUntil: 'networkidle2' });
      
      if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `Mở thành công tài khoản: ${email}` });

    } catch (error) {
      if (win) win.webContents.send('auto-login-status', { type: 'error', msg: `Lỗi tài khoản ${email}: ${error.message}` });
    }
  }
  
  if (win) win.webContents.send('auto-login-status', { type: 'success', msg: 'Hoàn tất quá trình đăng nhập hàng loạt!' });
});