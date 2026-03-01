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
      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Đang lấy token API cho: ${email}...` });

      // 1. Lấy Token của khách hàng từ API FPT
      const response = await axios.get(`https://econtract.fpt.com/app/services/uaa/api/authentication/internal?login=${email}`, {
        headers: { Authorization: `Bearer ${masterToken}` }
      });
      const guestToken = response.data.access_token;
      if (!guestToken) throw new Error("Không lấy được access_token từ API");

      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Đang mượn tài khoản Master để lót đường...` });

      // 2. Mở trình duyệt Cốc Cốc
      const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: false, // Bật giao diện (false) để nhìn thấy web mở lên
        defaultViewport: null, 
        args: ['--start-maximized'] 
      });

      const pages = await browser.pages();
      const page = pages[0];

      // 3. TRUY CẬP TRANG LOGIN
      await page.goto('https://eaccount.kyta.fpt.com/login', { waitUntil: 'networkidle2' });

      // =========================================================================
      // 4. KỊCH BẢN TỰ ĐỘNG GÕ PHÍM ĐĂNG NHẬP
      // =========================================================================
      
      // 4.1. Đợi ô nhập Email xuất hiện
      await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { visible: true });
      
      // 🔴 SỬA TÀI KHOẢN Ở ĐÂY 🔴 (Thay hiennx3@fpt.com thành email của bạn)
      await page.type('input[type="email"], input[placeholder*="email" i]', 'customersuport@gmail.com', { delay: 50 });

      // Tìm và bấm nút "Tiếp tục"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.innerText.toLowerCase().includes('tiếp tục'));
        if (nextBtn) nextBtn.click();
      });

      // 4.2. Chờ chuyển cảnh và hiện ô gõ mật khẩu
      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 5000 });
      
      // 🔴 SỬA MẬT KHẨU Ở ĐÂY 🔴 (Thay Fpt@1234 thành mật khẩu của bạn)
      await page.type('input[type="password"]', 'thads@2025', { delay: 50 });

      // Tìm và bấm nút "Đăng nhập" (Hoặc "Tiếp tục" lần 2)
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const loginBtn = btns.find(b => b.innerText.toLowerCase().includes('tiếp tục') || b.innerText.toLowerCase().includes('đăng nhập'));
        if (loginBtn) loginBtn.click();
      });

      // 4.3. Đợi trang chuyển hướng vào bên trong (Thành công mượn Session)
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Bơm Token của ${email} vào bộ nhớ...` });

      // 5. PHÉP THUẬT: TRÁO ĐỔI TOKEN VÀO LOCAL STORAGE
      await page.evaluate((token) => {
        // Lưu ý: Đa số web FPT yêu cầu token lưu dạng chuỗi JSON có ngoặc kép
        localStorage.setItem('access_token', `"${token}"`); 
        
        // NẾU CHẠY MÀ BỊ VĂNG RA LOGIN THÌ XÓA DÒNG TRÊN VÀ MỞ DÒNG NÀY:
        // localStorage.setItem('access_token', token);
      }, guestToken);

      // 6. RELOAD VÀ VÀO THẲNG TRANG PROFILE (Lúc này web đã tưởng bạn là email khách hàng)
      await page.goto('https://eaccount.kyta.fpt.com/account-profile', { waitUntil: 'networkidle2' });
      
      if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `Mở thành công tài khoản: ${email}` });

    } catch (error) {
      if (win) win.webContents.send('auto-login-status', { type: 'error', msg: `Lỗi tài khoản ${email}: ${error.message}` });
    }
  }
  
  if (win) win.webContents.send('auto-login-status', { type: 'success', msg: 'Hoàn tất quá trình đăng nhập hàng loạt!' });
});