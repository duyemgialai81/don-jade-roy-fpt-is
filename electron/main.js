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
// CẤU HÌNH TÀI KHOẢN LẤY TOKEN (TÀI KHOẢN HIẾU)
// ==========================================
const TOKEN_EMAIL = 'hieult35@fpt.com.vn'; 
const TOKEN_PASS = 'MAT_KHAU_CUA_HIEU_O_DAY'; // 🔴 SỬA MẬT KHẨU CỦA HIẾU Ở ĐÂY 🔴

// ==========================================
// HÀM LẤY TOKEN NGẦM TỪ TRANG ECONTRACT (1 BƯỚC)
// ==========================================
async function fetchMasterToken(executablePath) {
  const browser = await puppeteer.launch({
    executablePath: executablePath,
    headless: true, // Chạy ngầm 100%
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  try {
    const page = await browser.newPage();
    // Dùng trang đăng nhập mới của FPT
    await page.goto('https://econtract.fpt.com/op/login', { waitUntil: 'networkidle2' });

    // 1. Điền Email của Hiếu
    await page.waitForSelector('input[type="email"], input[type="text"]', { visible: true, timeout: 10000 });
    await page.type('input[type="email"], input[type="text"]', TOKEN_EMAIL, { delay: 50 });

    // 2. Điền Mật khẩu của Hiếu
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.type('input[type="password"]', TOKEN_PASS, { delay: 50 });

    // 3. Click nút Đăng nhập
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.innerText.toLowerCase().includes('đăng nhập'));
      if (loginBtn) loginBtn.click();
    });

    // 4. Chờ load xong và moi Token
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    let token = await page.evaluate(() => {
      return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || localStorage.getItem('token');
    });

    if (!token) {
      const cookies = await page.cookies();
      const tokenCookie = cookies.find(c => c.name === 'access_token' || c.name.includes('token'));
      if (tokenCookie) token = tokenCookie.value;
    }

    await browser.close();
    if (!token) throw new Error("Không thể trích xuất token sau khi đăng nhập.");
    return token;
  } catch (error) {
    await browser.close();
    throw new Error(`Lỗi đăng nhập ngầm tài khoản ${TOKEN_EMAIL}: ${error.message}`);
  }
}

// ==========================================
// KÊNH GIAO TIẾP VỚI GIAO DIỆN REACT (IPC)
// ==========================================

// --- PHẦN 1: CẬP NHẬT PHẦN MỀM (AUTO-UPDATE) ---
ipcMain.on('start-download', async () => {
  try {
    await autoUpdater.checkForUpdates();
    autoUpdater.downloadUpdate();
  } catch (error) {
    if (win) win.webContents.send('update-error', 'Lỗi hệ thống: ' + error.message);
  }
});

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall(true, true); 
});

autoUpdater.on('download-progress', (progressObj) => {
  if (win) win.webContents.send('download-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
  if (win) win.webContents.send('update-downloaded');
});

autoUpdater.on('error', (error) => {
  if (win) win.webContents.send('update-error', error.message);
});


// --- PHẦN 2: TỰ ĐỘNG ĐĂNG NHẬP CỐC CỐC ---
ipcMain.on('auto-login-coccoc', async (event, { emails }) => {
  const emailsToProcess = emails.filter(e => e.trim() !== '').slice(0, 5);
  
  if (emailsToProcess.length === 0) return;

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

  let masterToken = '';
  
  // BƯỚC 1: LẤY TOKEN NGẦM BẰNG TÀI KHOẢN HIẾU
  try {
    if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Đang đăng nhập ngầm tài khoản ${TOKEN_EMAIL} để lấy Token...` });
    masterToken = await fetchMasterToken(executablePath);
    if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `Lấy Token thành công! Bắt đầu xử lý ${emailsToProcess.length} tài khoản khách...` });
  } catch (error) {
    if (win) win.webContents.send('auto-login-status', { type: 'error', msg: `Lấy Token tự động thất bại: ${error.message}` });
    return; // Ngừng chạy nếu không có token
  }

  // BƯỚC 2: XỬ LÝ TỪNG TÀI KHOẢN KHÁCH VÀ LÓT ĐƯỜNG
  for (let i = 0; i < emailsToProcess.length; i++) {
    const email = emailsToProcess[i].trim();
    try {
      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Đang gọi API lấy token cho khách: ${email}...` });

      // 1. Lấy Token của khách hàng từ API FPT bằng Token của Hiếu
      const response = await axios.get(`https://econtract.fpt.com/app/services/uaa/api/authentication/internal?login=${email}`, {
        headers: { Authorization: `Bearer ${masterToken}` }
      });
      const guestToken = response.data.access_token;
      if (!guestToken) throw new Error("Không lấy được access_token từ API");

      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Đang mở Cốc Cốc lót đường bằng Customer Support...` });

      // ====================================================================
      // 2. MỞ CỐC CỐC ẨN DANH (THU NHỎ DƯỚI TASKBAR)
      // ====================================================================
      const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: false, 
        defaultViewport: null, 
        args: ['--start-minimized']
      });

      const pages = await browser.pages();
      const page = pages[0];

      // 3. TRUY CẬP TRANG LOGIN CŨ ĐỂ LÓT ĐƯỜNG
      await page.goto('https://eaccount.kyta.fpt.com/login', { waitUntil: 'networkidle2' });

      // 4. KỊCH BẢN TỰ ĐỘNG GÕ PHÍM ĐĂNG NHẬP BẰNG CUSTOMER SUPPORT (2 BƯỚC)
      await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { visible: true });
      await page.type('input[type="email"], input[placeholder*="email" i]', 'customersuport@gmail.com', { delay: 50 });

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.innerText.toLowerCase().includes('tiếp tục'));
        if (nextBtn) nextBtn.click();
      });

      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 5000 });
      await page.type('input[type="password"]', 'thads@2025', { delay: 50 });

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const loginBtn = btns.find(b => b.innerText.toLowerCase().includes('tiếp tục') || b.innerText.toLowerCase().includes('đăng nhập'));
        if (loginBtn) loginBtn.click();
      });

      // Đợi trang chuyển hướng vào bên trong
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Bơm Token của khách (${email}) vào Cookies...` });

      // 5. TIÊM TOKEN VÀO COOKIES
      await page.setCookie({
        name: 'access_token',
        value: guestToken,
        domain: '.fpt.com', 
        path: '/',
        secure: true,      
        httpOnly: true     
      });

      await page.setCookie({
        name: 'access_token',
        value: guestToken,
        domain: 'eaccount.kyta.fpt.com',
        path: '/',
        secure: true,
        httpOnly: true
      });

      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 6. RELOAD VÀ VÀO THẲNG TRANG PROFILE CỦA KHÁCH
      await page.goto('https://eaccount.kyta.fpt.com/account-profile', { waitUntil: 'networkidle2' });
      
      // ====================================================================
      // 7. PHÓNG TO VÀ GỌI CỬA SỔ LÊN TRÊN CÙNG MÀN HÌNH
      // ====================================================================
      try {
        const session = await page.target().createCDPSession();
        const { windowId } = await session.send('Browser.getWindowForTarget');
        // Ép Cốc Cốc phải Phóng to toàn màn hình
        await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
        // Kéo cửa sổ lên trên cùng để đè lên các ứng dụng khác
        await page.bringToFront(); 
      } catch (err) {
        console.error("Không thể phóng to cửa sổ:", err);
      }

      if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `Mở thành công tài khoản: ${email}` });

    } catch (error) {
      if (win) win.webContents.send('auto-login-status', { type: 'error', msg: `Lỗi tài khoản ${email}: ${error.message}` });
    }
  }
  
  if (win) win.webContents.send('auto-login-status', { type: 'success', msg: 'Hoàn tất quá trình đăng nhập hàng loạt!' });
});