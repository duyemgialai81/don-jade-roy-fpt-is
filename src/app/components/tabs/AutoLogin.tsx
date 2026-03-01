import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Info, X } from 'lucide-react';

// Khai báo an toàn ipcRenderer
const ipcRenderer = typeof window !== 'undefined' && window.require 
  ? window.require('electron').ipcRenderer 
  : null;

// ==========================================
// BỘ NHỚ TẠM (CACHE) 
// Sống sót qua việc chuyển tab, chỉ reset khi Reload App
// ==========================================
let cachedData = {
  emails: '',
  masterToken: '',
  statusLogs: [] as {type: string, msg: string}[]
};

// Khai báo kiểu dữ liệu cho Modal
type ModalType = 'alert' | 'confirm';
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const AutoLogin = () => {
  // Lấy dữ liệu từ bộ nhớ tạm để khởi tạo thay vì để trống
  const [emails, setEmails] = useState(cachedData.emails);
  const [masterToken, setMasterToken] = useState(cachedData.masterToken);
  const [statusLogs, setStatusLogs] = useState<{type: string, msg: string}[]>(cachedData.statusLogs);
  const [isLoading, setIsLoading] = useState(false);

  // Lưu lại vào bộ nhớ tạm ngay mỗi khi người dùng gõ phím
  useEffect(() => { cachedData.emails = emails; }, [emails]);
  useEffect(() => { cachedData.masterToken = masterToken; }, [masterToken]);
  useEffect(() => { cachedData.statusLogs = statusLogs; }, [statusLogs]);

  // State quản lý Cửa sổ thông báo (Modal)
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  // Hàm hiển thị Alert (Chỉ có nút Đóng)
  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'alert', title, message });
  };

  // Hàm hiển thị Confirm (Có Xác nhận & Hủy)
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (!ipcRenderer) return;

    const handleStatus = (_event: any, data: {type: string, msg: string}) => {
      setStatusLogs(prev => [...prev, data]);
      
      if (data.msg === 'Hoàn tất quá trình đăng nhập hàng loạt!' || data.msg === 'Hoàn tất quá trình đăng nhập!' || data.msg.includes('Không tìm thấy Cốc Cốc')) {
        setIsLoading(false);
        setTimeout(() => {
          showAlert("Thông báo hệ thống", data.msg);
        }, 300);
      }
    };

    ipcRenderer.on('auto-login-status', handleStatus);
    return () => {
      ipcRenderer.removeAllListeners('auto-login-status');
    };
  }, []);

  // Hàm thực thi chạy thực tế sau khi người dùng bấm "Xác nhận"
  const executeLogin = (emailList: string[]) => {
    closeModal();
    setIsLoading(true);
    setStatusLogs([]);
    cachedData.statusLogs = []; // Xóa log trong cache khi bắt đầu chạy mới
    ipcRenderer.send('auto-login-coccoc', { emails: emailList, masterToken });
  };

  const handleStartLogin = () => {
    if (!ipcRenderer) {
      showAlert("Lỗi môi trường", "Tính năng Auto Login can thiệp sâu vào hệ thống, chỉ hoạt động trên Ứng dụng Desktop (Electron). Vui lòng không dùng trên trình duyệt web!");
      return;
    }
    if (!masterToken) {
      showAlert("Thiếu thông tin", "Vui lòng nhập Master Token (Token lấy từ Postman)!");
      return;
    }
    
    const emailList = emails.split('\n').filter(e => e.trim() !== '');
    if (emailList.length === 0) {
      showAlert("Thiếu thông tin", "Vui lòng nhập ít nhất 1 email hợp lệ!");
      return;
    }

    if (emailList.length > 5) {
      showAlert("Cảnh báo quá tải", "Chỉ được phép mở tối đa 5 trình duyệt cùng lúc để tránh treo máy!");
      return;
    }

    showConfirm(
      "Xác nhận đăng nhập", 
      `Hệ thống sẽ tự động mở ${emailList.length} tài khoản Cốc Cốc.\nBạn có chắc chắn muốn bắt đầu không?`,
      () => executeLogin(emailList)
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 relative">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Mở luồng tài khoản khách (Cốc Cốc)</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Master Token (Bearer ...)</label>
          <input 
            type="text" 
            value={masterToken}
            onChange={(e) => setMasterToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Danh sách Email (Mỗi dòng 1 email, Tối đa 5)</label>
          <textarea 
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="nguyenvana@gmail.com&#10;tranvanb@yahoo.com"
            rows={5}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <button 
          onClick={handleStartLogin}
          disabled={isLoading}
          className={`w-full py-2.5 rounded-lg font-semibold text-white transition-colors shadow-sm ${isLoading ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'}`}
        >
          {isLoading ? '⏳ Đang thao tác ngầm, vui lòng đợi...' : '🚀 Bắt đầu đăng nhập hàng loạt'}
        </button>

        {statusLogs.length > 0 && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg h-32 overflow-y-auto">
            {statusLogs.map((log, idx) => (
              <div key={idx} className={`text-sm mb-1 ${
                log.type === 'error' ? 'text-red-600 font-medium' : 
                log.type === 'success' ? 'text-emerald-600 font-medium' : 'text-slate-600'
              }`}>
                • {log.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden"
            >
              <div className={`p-4 border-b flex items-center gap-3 ${modal.type === 'alert' ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                {modal.type === 'alert' ? (
                  <AlertCircle className="text-amber-500" size={24} />
                ) : (
                  <Info className="text-indigo-500" size={24} />
                )}
                <h3 className="font-bold text-slate-800 text-lg">{modal.title}</h3>
                <button onClick={closeModal} className="ml-auto text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-md transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-slate-600 whitespace-pre-line leading-relaxed text-sm">
                  {modal.message}
                </p>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-3">
                {modal.type === 'confirm' && (
                  <button 
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                  >
                    Hủy bỏ
                  </button>
                )}
                <button 
                  onClick={modal.type === 'confirm' ? modal.onConfirm : closeModal}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm ${
                    modal.type === 'confirm' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {modal.type === 'confirm' ? 'Xác nhận' : 'Đã hiểu'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};