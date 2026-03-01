import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Info, X, Mail, Terminal, Loader2, Rocket } from 'lucide-react';

const ipcRenderer = typeof window !== 'undefined' && window.require 
  ? window.require('electron').ipcRenderer 
  : null;

// ==========================================
// BỘ NHỚ TẠM (CACHE) 
// ==========================================
let cachedData = {
  emails: '',
  statusLogs: [] as {type: string, msg: string}[]
};

type ModalType = 'alert' | 'confirm';
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const AutoLogin = () => {
  const [emails, setEmails] = useState(cachedData.emails);
  const [statusLogs, setStatusLogs] = useState<{type: string, msg: string}[]>(cachedData.statusLogs);
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  useEffect(() => { cachedData.emails = emails; }, [emails]);
  useEffect(() => { cachedData.statusLogs = statusLogs; }, [statusLogs]);

  const [modal, setModal] = useState<ModalState>({
    isOpen: false, type: 'alert', title: '', message: ''
  });

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'alert', title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (!ipcRenderer) return;

    const handleStatus = (_event: any, data: {type: string, msg: string}) => {
      setStatusLogs(prev => [...prev, data]);
      
      if (data.msg === 'Hoàn tất quá trình đăng nhập hàng loạt!' || data.msg === 'Hoàn tất quá trình đăng nhập!' || data.msg.includes('Không tìm thấy Cốc Cốc')) {
        setIsLoading(false);
        setTimeout(() => showAlert("Thông báo hệ thống", data.msg), 300);
      }
    };

    ipcRenderer.on('auto-login-status', handleStatus);
    return () => {
      ipcRenderer.removeAllListeners('auto-login-status');
    };
  }, []);

  const executeLogin = (emailList: string[]) => {
    closeModal();
    setIsLoading(true);
    setStatusLogs([]);
    cachedData.statusLogs = []; 
    ipcRenderer.send('auto-login-coccoc', { emails: emailList });
  };

  const handleStartLogin = () => {
    if (!ipcRenderer) {
      showAlert("Lỗi môi trường", "Tính năng Auto Login chỉ hoạt động trên Ứng dụng Desktop (Electron)!");
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
      `Hệ thống sẽ tự động chạy ngầm để lấy Token, sau đó mở ${emailList.length} tài khoản Cốc Cốc.\nBạn có chắc chắn muốn bắt đầu?`,
      () => executeLogin(emailList)
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-violet-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="relative z-10">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
          <Terminal size={28} className="text-indigo-600" />
            Nhập Danh Sách Email Khách Hàng
        </h2>
        
        <div className="space-y-6">
          <div className="group">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between items-end">
              <span>Danh sách Email khách hàng</span>
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Mỗi dòng 1 mail (Tối đa 5)</span>
            </label>
            <div className="relative">
              <div className="absolute top-3.5 left-0 pl-3.5 pointer-events-none">
                <Mail size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <textarea 
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="khachhang1@gmail.com&#10;khachhang2@yahoo.com"
                rows={5}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-sm text-slate-700 shadow-sm resize-none leading-relaxed"
              />
            </div>
          </div>

          <button 
            onClick={handleStartLogin}
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
              isLoading 
                ? 'bg-indigo-400 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Hệ thống đang thao tác, vui lòng đợi...
              </>
            ) : (
              <>
                <Rocket size={20} />
                Bắt đầu Auto Login
              </>
            )}
          </button>

          <AnimatePresence>
            {statusLogs.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 bg-slate-900 rounded-xl border border-slate-800 shadow-inner overflow-hidden flex flex-col"
              >
                <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-slate-400 ml-2 font-mono">Process Logs</span>
                </div>
                <div className="p-4 h-40 overflow-y-auto font-mono text-sm space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {statusLogs.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-600 mr-2">{'>'}</span>
                      {log.msg}
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden border border-slate-100"
            >
              <div className={`p-5 flex items-center gap-3 ${modal.type === 'alert' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                {modal.type === 'alert' ? (
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                    <AlertCircle size={24} />
                  </div>
                ) : (
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
                    <Info size={24} />
                  </div>
                )}
                <h3 className="font-bold text-slate-800 text-lg flex-1">{modal.title}</h3>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-slate-600 whitespace-pre-line leading-relaxed text-[15px]">
                  {modal.message}
                </p>
              </div>

              <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                {modal.type === 'confirm' && (
                  <button onClick={closeModal} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
                    Hủy bỏ
                  </button>
                )}
                <button 
                  onClick={modal.type === 'confirm' ? modal.onConfirm : closeModal}
                  className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm ${
                    modal.type === 'confirm' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5' 
                      : 'bg-amber-500 hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5'
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