import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkgUpdater from 'electron-updater';
const { autoUpdater } = pkgUpdater;

// Các thư viện dùng cho tính năng Tự động đăng nhập Cốc Cốc
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
// CẤU HÌNH TÀI KHOẢN LẤY TOKEN (TÀI KHOẢN HIẾU)
// ==========================================
const TOKEN_EMAIL = 'hieult35@fpt.com.vn'; 
const TOKEN_PASS = 'Lehieu1993'; 

// ==========================================
// BỘ NHỚ TẠM (CACHE) CHO MASTER TOKEN - LƯU 5 PHÚT
// ==========================================
let globalMasterToken = null;
let lastTokenTime = 0;
const TOKEN_LIFESPAN_MS = 5 * 60 * 1000; // 5 Phút

// ==========================================
// HÀM LẤY TOKEN NGẦM (CHẠY ẨN 100%)
// ==========================================
async function fetchMasterToken(executablePath) {
  const browser = await puppeteer.launch({
    executablePath: executablePath,
    headless: true, // Chạy ngầm hoàn toàn, không mở UI
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1280,800',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setCacheEnabled(false);
    
    await page.goto('https://econtract.fpt.com/op/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000)); 

    await page.waitForSelector('#email', { visible: true, timeout: 15000 });
    await page.type('#email', TOKEN_EMAIL, { delay: 10 }); // Gõ nhanh hơn vì đang chạy ngầm

    await page.waitForSelector('#pass', { visible: true });
    await page.type('#pass', TOKEN_PASS, { delay: 10 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('đăng nhập'));
      if (loginBtn) loginBtn.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000)); 

    const cookies = await page.cookies();
    const tokenCookie = cookies.find(c => c.name === 'access_token');

    await browser.close();
    
    if (!tokenCookie || !tokenCookie.value) {
      throw new Error("Không tìm thấy Cookie access_token! Kiểm tra lại thông tin đăng nhập.");
    }

    return tokenCookie.value;
  } catch (error) {
    if (browser) await browser.close();
    throw new Error(`Lỗi đăng nhập: ${error.message}`);
  }
}

// ==========================================
// KÊNH GIAO TIẾP VỚI GIAO DIỆN REACT (IPC)
// ==========================================

ipcMain.on('start-download', async () => {
  try {
    await autoUpdater.checkForUpdates();
    autoUpdater.downloadUpdate();
  } catch (error) {
    if (win) win.webContents.send('update-error', 'Lỗi hệ thống: ' + error.message);
  }
});

ipcMain.on('quit-and-install', () => autoUpdater.quitAndInstall(true, true));
autoUpdater.on('download-progress', (progressObj) => win && win.webContents.send('download-progress', progressObj.percent));
autoUpdater.on('update-downloaded', () => win && win.webContents.send('update-downloaded'));
autoUpdater.on('error', (error) => win && win.webContents.send('update-error', error.message));

// --- TỰ ĐỘNG ĐĂNG NHẬP CỐC CỐC ---
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
    if (win) win.webContents.send('auto-login-status', { type: 'error', msg: 'Không tìm thấy Cốc Cốc trên máy tính!' });
    return;
  }
  
  // BƯỚC 1: KIỂM TRA CACHE HOẶC LẤY TOKEN MỚI CỦA HIẾU
  const now = Date.now();
  if (globalMasterToken && (now - lastTokenTime < TOKEN_LIFESPAN_MS)) {
    if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `Sử dụng lại Token cũ (còn hạn trong 5 phút). Bắt đầu xử lý khách...` });
  } else {
    try {
      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `Token hết hạn/Chưa có. Đang lấy Token ngầm mới...` });
      globalMasterToken = await fetchMasterToken(executablePath);
      lastTokenTime = Date.now(); // Cập nhật lại thời gian
      if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `Lấy Token thành công! Cập nhật cache 5 phút.` });
    } catch (error) {
      if (win) win.webContents.send('auto-login-status', { type: 'error', msg: `Lấy Token thất bại: ${error.message}` });
      return; 
    }
  }

  // BƯỚC 2: XỬ LÝ TỪNG TÀI KHOẢN KHÁCH VÀ LÓT ĐƯỜNG NGẦM
  for (let i = 0; i < emailsToProcess.length; i++) {
    const email = emailsToProcess[i].trim();
    try {
      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `[${email}] Đang gọi API lấy token...` });

      const response = await axios.get(`https://econtract.fpt.com/app/services/uaa/api/authentication/internal?login=${email}`, {
        headers: { 
          'Authorization': `Bearer ${globalMasterToken}`,
          'Accept': 'application/json, text/plain, */*'
        }
      });
      const guestToken = response.data.access_token;
      if (!guestToken) throw new Error("Không lấy được access_token từ API");

      if (win) win.webContents.send('auto-login-status', { type: 'info', msg: `[${email}] Đang thiết lập phiên đăng nhập ngầm...` });

      // GIẤU CỬA SỔ LÓT ĐƯỜNG: Đẩy tọa độ ra ngoài màn hình (-10000, -10000)
      const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: false, 
        defaultViewport: null, 
        args: [
          '--window-position=-10000,-10000', 
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const pages = await browser.pages();
      const page = pages[0];

      // Thao tác gõ phím này diễn ra ở cửa sổ ngoài màn hình, bạn sẽ không thấy
      await page.goto('https://eaccount.kyta.fpt.com/login', { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { visible: true });
      await page.type('input[type="email"], input[placeholder*="email" i]', 'customersuport@gmail.com', { delay: 10 });
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.innerText.toLowerCase().includes('tiếp tục'));
        if (nextBtn) nextBtn.click();
      });

      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 5000 });
      await page.type('input[type="password"]', 'thads@2025', { delay: 10 });
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const loginBtn = btns.find(b => b.innerText.toLowerCase().includes('tiếp tục') || b.innerText.toLowerCase().includes('đăng nhập'));
        if (loginBtn) loginBtn.click();
      });

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

      // TIÊM TOKEN VÀ VÀO TRANG PROFILE
      await page.setCookie(
        { name: 'access_token', value: guestToken, domain: '.fpt.com', path: '/', secure: true, httpOnly: true },
        { name: 'access_token', value: guestToken, domain: 'eaccount.kyta.fpt.com', path: '/', secure: true, httpOnly: true }
      );
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      
      await page.goto('https://eaccount.kyta.fpt.com/account-profile', { waitUntil: 'networkidle2' });
      
      // GỌI CỬA SỔ VỀ LẠI MÀN HÌNH CHÍNH VÀ PHÓNG TO LÊN
      try {
        const session = await page.target().createCDPSession();
        const { windowId } = await session.send('Browser.getWindowForTarget');
        await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
        await page.bringToFront(); 
      } catch (err) {}

      if (win) win.webContents.send('auto-login-status', { type: 'success', msg: `[${email}] Trình duyệt đã sẵn sàng!` });

    } catch (error) {
      if (win) win.webContents.send('auto-login-status', { type: 'error', msg: `[${email}] Lỗi: ${error.message}` });
    }
  }
  
  if (win) win.webContents.send('auto-login-status', { type: 'success', msg: 'Hoàn tất quá trình đăng nhập hàng loạt!' });
});