import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Lấy đường dẫn thư mục hiện tại (do cấu hình type: "module" trong package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  // Tạo cửa sổ ứng dụng Desktop
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../icon.ico'), // Gắn file icon.ico của bạn vào
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Tự động phóng to lấp đầy màn hình ngay khi mở app (vẫn giữ lại thanh Taskbar của Windows)
  win.maximize();

  // Kiểm tra môi trường để load giao diện
  if (app.isPackaged) {
    // Nếu ứng dụng đã được đóng gói thành file .exe -> Load file giao diện tĩnh đã build
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // Nếu đang viết code trên máy (chạy npm run electron:dev) -> Load qua server của Vite
    win.loadURL('http://localhost:5173');
  }
};

// Khi hệ thống lõi của Electron đã khởi động xong thì tiến hành mở cửa sổ
app.whenReady().then(() => {
  createWindow();

  // Dành riêng cho MacOS: Mở lại cửa sổ nếu click vào icon dưới dock mà không có cửa sổ nào đang mở
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Thoát hoàn toàn ứng dụng khi người dùng bấm dấu X đỏ (đóng tất cả cửa sổ)
app.on('window-all-closed', () => {
  // Trên MacOS, app thường vẫn chạy ngầm cho đến khi ấn Cmd + Q. Code này đảm bảo thoát hẳn trên Windows.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});