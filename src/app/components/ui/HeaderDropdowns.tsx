import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Settings, User, LogOut, Moon, Volume2, Check, X, Shield, Info, DownloadCloud } from 'lucide-react';

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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

// --- Thêm interface cho UpdateInfo ---
export interface UpdateInfo {
  version: string;
  notes: string;
  downloadUrl: string;
}

interface NotificationsListProps {
  updateAvailable?: UpdateInfo | null;
}

export const NotificationsList: React.FC<NotificationsListProps> = ({ updateAvailable }) => {
  const notifications = [
    { id: 1, title: 'Hệ thống bảo trì', desc: 'Dự kiến bảo trì vào 02:00 AM ngày mai.', time: '5m ago', type: 'warning', read: false },
    { id: 2, title: 'Token hết hạn', desc: 'Token của bạn sẽ hết hạn trong 1 giờ.', time: '1h ago', type: 'error', read: false },
    { id: 3, title: 'Đồng bộ hoàn tất', desc: 'Đã đồng bộ 150 user mới.', time: '2h ago', type: 'success', read: true },
    { id: 4, title: 'Chào mừng quay lại', desc: 'Hệ thống hoạt động bình thường.', time: '1d ago', type: 'info', read: true },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <div className="p-2 bg-amber-100 text-amber-600 rounded-full"><Shield size={16} /></div>;
      case 'error': return <div className="p-2 bg-red-100 text-red-600 rounded-full"><Bell size={16} /></div>;
      case 'success': return <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><Check size={16} /></div>;
      default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Info size={16} /></div>;
    }
  };

  return (
    <div className="divide-y divide-slate-50">
      {/* --- BANNER UPDATE MỚI (CHỈ HIỂN THỊ KHI CÓ UPDATE) --- */}
      {updateAvailable && (
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
            <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{updateAvailable.notes}</p>
            <a 
               href={updateAvailable.downloadUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="block text-center w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Tải xuống bản cài đặt
            </a>
          </div>
        </div>
      )}

      {/* --- DANH SÁCH THÔNG BÁO CŨ --- */}
      {notifications.map((item) => (
        <div key={item.id} className={`p-4 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative group ${!item.read ? 'bg-indigo-50/30' : ''}`}>
          <div className="flex-shrink-0 mt-1">
            {getIcon(item.type)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h5 className={`text-sm font-semibold ${!item.read ? 'text-slate-800' : 'text-slate-600'}`}>{item.title}</h5>
              <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
          </div>
          {!item.read && (
            <div className="absolute top-4 right-2 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>
      ))}
      <button className="w-full py-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-t border-slate-100 transition-colors">
        Xem tất cả thông báo
      </button>
    </div>
  );
};

export const SettingsList = () => {
  // Khởi tạo state cho các cài đặt
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(true);

  // Lấy trạng thái từ localStorage khi component vừa load
  useEffect(() => {
    setIsDarkMode(localStorage.getItem('app_theme') === 'dark');
    setIsSoundEnabled(localStorage.getItem('app_sound') !== 'disabled');
    setIsAutoUpdateEnabled(localStorage.getItem('app_auto_update') !== 'disabled');
  }, []);

  // Các hàm toggle
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

  // Nút gạt Toggle nhỏ dùng chung
  const Switch = ({ enabled }: { enabled: boolean }) => (
    <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-indigo-500' : 'bg-slate-200'}`}>
      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${enabled ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  );

  return (
    <div className="p-2 space-y-1">
      {/* Tài khoản */}
      <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl text-left transition-colors group">
        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
          <User size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Tài khoản</p>
          <p className="text-[10px] text-slate-400">Quản lý profile & bảo mật</p>
        </div>
      </button>

      {/* Âm thanh */}
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

      {/* Giao diện tối */}
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

      {/* Tự động cập nhật */}
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

      {/* Đăng xuất */}
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