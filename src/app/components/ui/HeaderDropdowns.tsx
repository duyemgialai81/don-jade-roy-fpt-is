import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Settings, User, LogOut, Moon, Volume2, X, DownloadCloud } from 'lucide-react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export const HeaderDropdown: React.FC<DropdownProps> = ({ isOpen, onClose, title, children, align = 'right' }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`absolute top-full mt-2 w-80 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export interface UpdateInfo {
  version: string;
  notes: string;
  downloadUrl: string;
}

interface NotificationsListProps {
  updateAvailable?: UpdateInfo | null;
}

const ipcRenderer = typeof window !== 'undefined' && window.require 
  ? window.require('electron').ipcRenderer 
  : null;

export const NotificationsList: React.FC<NotificationsListProps> = ({ updateAvailable }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    if (!ipcRenderer) return;

    const handleProgress = (_event: any, percent: number) => {
      setDownloadProgress(Math.round(percent));
    };

    const handleDownloaded = () => {
      setDownloadProgress(100); 
      setIsDownloading(false);
      setIsReadyToInstall(true); 
    };

    const handleError = (_event: any, message: string) => {
      setIsDownloading(false);
      setUpdateError('Lỗi tải xuống: ' + message);
    };

    ipcRenderer.on('download-progress', handleProgress);
    ipcRenderer.on('update-downloaded', handleDownloaded);
    ipcRenderer.on('update-error', handleError);

    return () => {
      ipcRenderer.removeAllListeners('download-progress');
      ipcRenderer.removeAllListeners('update-downloaded');
      ipcRenderer.removeAllListeners('update-error');
    };
  }, []);

  const handleUpdateAction = () => {
    if (!ipcRenderer) {
        if (updateAvailable) window.open(updateAvailable.downloadUrl, '_blank');
        return;
    }

    if (isReadyToInstall) {
      ipcRenderer.send('quit-and-install');
    } else {
      setIsDownloading(true);
      setUpdateError('');
      ipcRenderer.send('start-download');
    }
  };

  return (
    <div className="divide-y divide-slate-50">
      {updateAvailable ? (
        <div className="p-4 flex gap-3 bg-indigo-50/80 hover:bg-indigo-50 transition-colors">
          <div className="flex-shrink-0 mt-1">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full shadow-sm">
              <DownloadCloud size={16} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h5 className="text-sm font-bold text-indigo-900">Bản cập nhật {updateAvailable.version}</h5>
              <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded font-bold animate-pulse">MỚI</span>
            </div>
            
            {!isDownloading && !isReadyToInstall && (
               <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{updateAvailable.notes}</p>
            )}

            {updateError && (
              <p className="text-xs text-red-500 font-medium mb-2">{updateError}</p>
            )}

            {(isDownloading || isReadyToInstall) && (
              <div className="mb-3 mt-2">
                <div className="flex justify-between text-xs text-indigo-600 font-medium mb-1">
                  <span>{isReadyToInstall ? 'Đã tải xong 100%' : 'Đang tải xuống...'}</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${isReadyToInstall ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button 
               onClick={handleUpdateAction}
               disabled={isDownloading && !isReadyToInstall}
               className={`mt-2 block w-full py-2 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm ${
                 isReadyToInstall 
                   ? 'bg-emerald-500 hover:bg-emerald-600 animate-pulse' 
                   : isDownloading
                     ? 'bg-indigo-400 cursor-not-allowed' 
                     : 'bg-indigo-600 hover:bg-indigo-700' 
               }`}
            >
              {isReadyToInstall 
                ? 'Khởi động lại & Cài đặt ngay' 
                : isDownloading 
                  ? 'Đang tải xuống...' 
                  : 'Tải & Cập nhật ngay'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 flex flex-col items-center justify-center text-center opacity-60">
          <Bell size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">Chưa có thông báo mới</p>
          <p className="text-xs text-slate-400 mt-1">Bạn đang dùng phiên bản mới nhất</p>
        </div>
      )}
    </div>
  );
};

export const SettingsList = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(true);

  useEffect(() => {
    setIsDarkMode(localStorage.getItem('app_theme') === 'dark');
    setIsSoundEnabled(localStorage.getItem('app_sound') !== 'disabled');
    setIsAutoUpdateEnabled(localStorage.getItem('app_auto_update') !== 'disabled');
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('app_theme', newMode ? 'dark' : 'light');
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const toggleSound = () => {
    const newSound = !isSoundEnabled;
    setIsSoundEnabled(newSound);
    localStorage.setItem('app_sound', newSound ? 'enabled' : 'disabled');
  };

  const toggleAutoUpdate = () => {
    const newAuto = !isAutoUpdateEnabled;
    setIsAutoUpdateEnabled(newAuto);
    localStorage.setItem('app_auto_update', newAuto ? 'enabled' : 'disabled');
  };

  const handleLogout = () => {
    if (window.confirm("Cảnh báo: Hành động này sẽ xóa Token đăng nhập và toàn bộ cấu hình. Tiếp tục?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const Switch = ({ enabled }: { enabled: boolean }) => (
    <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-indigo-500' : 'bg-slate-200'}`}>
      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${enabled ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  );

  return (
    <div className="p-2 space-y-1">
      <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl text-left transition-colors group">
        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
          <User size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Tài khoản</p>
          <p className="text-[10px] text-slate-400">Quản lý profile & bảo mật</p>
        </div>
      </button>

      <button onClick={toggleSound} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl text-left transition-colors group">
        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
          <Volume2 size={18} />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Âm thanh</p>
            <p className="text-[10px] text-slate-400">Hiệu ứng click & thông báo</p>
          </div>
          <Switch enabled={isSoundEnabled} />
        </div>
      </button>

      <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl text-left transition-colors group">
        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
          <Moon size={18} />
        </div>
        <div className="flex-1 flex items-center justify-between">
           <div>
            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Giao diện tối</p>
            <p className="text-[10px] text-slate-400">Chuyển sang Dark Mode</p>
          </div>
          <Switch enabled={isDarkMode} />
        </div>
      </button>

      <button onClick={toggleAutoUpdate} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl text-left transition-colors group">
        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
          <DownloadCloud size={18} />
        </div>
        <div className="flex-1 flex items-center justify-between">
           <div>
            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Tự động cập nhật</p>
            <p className="text-[10px] text-slate-400">Kiểm tra version trên GitHub</p>
          </div>
          <Switch enabled={isAutoUpdateEnabled} />
        </div>
      </button>
      
      <div className="h-px bg-slate-100 my-1 mx-2" />

      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-xl text-left transition-colors group">
        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-red-600 group-hover:shadow-sm transition-all">
          <LogOut size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 group-hover:text-red-700">Đăng xuất</p>
        </div>
      </button>
    </div>
  );
};