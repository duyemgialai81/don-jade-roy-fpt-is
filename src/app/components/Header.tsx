import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Settings, Search } from 'lucide-react';
import { HeaderDropdown, NotificationsList, SettingsList, UpdateInfo } from '../components/ui/HeaderDropdowns';

// Import trực tiếp version từ package.json
// LƯU Ý: Chỉnh lại số lượng ../ sao cho trỏ đúng ra file package.json gốc
import pkg from '../../../package.json'; 

interface HeaderProps {
    activeTab: string;
    titles: Record<string, string>;
}

// CẤU HÌNH GITHUB
const GITHUB_OWNER = 'duyemgialai81'; 
const GITHUB_REPO = 'don-jade-roy-fpt-is'; 
const CURRENT_VERSION = `v${pkg.version}`; 

export const Header: React.FC<HeaderProps> = ({ activeTab, titles }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);

    useEffect(() => {
        const isElectron = navigator.userAgent.toLowerCase().includes('electron');
        if (!isElectron) return; 

        const checkUpdate = async () => {
            try {
                const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
                if (!response.ok) return;

                const data = await response.json();
                const latestVersion = data.tag_name; 

                if (latestVersion && latestVersion !== CURRENT_VERSION) {
                    const exeAsset = data.assets.find((asset: any) => asset.name.endsWith('.exe'));
                    
                    setUpdateAvailable({
                        version: latestVersion,
                        notes: data.body || "Đã có bản cập nhật hệ thống mới giúp tăng hiệu suất và sửa lỗi.",
                        downloadUrl: exeAsset ? exeAsset.browser_download_url : data.html_url
                    });
                }
            } catch (error) {
                console.error("Lỗi khi kiểm tra cập nhật:", error);
            }
        };

        checkUpdate();
    }, []);

    return (
        <header className="h-20 px-8 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between flex-shrink-0 z-20 sticky top-0 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)]">
            <div>
                <motion.h2 
                  key={activeTab}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-2xl font-bold text-slate-800 tracking-tight"
                >
                  {titles[activeTab]}
                </motion.h2>
                <motion.p
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.1 }}
                   className="text-sm text-slate-500 font-medium hidden sm:block"
                >
                  Quản lý và theo dõi hệ thống Dashboard tập trung
                </motion.p>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="hidden md:flex items-center relative group">
                    <Search className="absolute left-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm..." 
                      className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64 shadow-sm hover:bg-white focus:bg-white"
                    />
                 </div>
                <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
                
                {/* NÚT THÔNG BÁO */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsSettingsOpen(false);
                    }}
                    className={`p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white bg-slate-100/50 rounded-full transition-all duration-300 shadow-sm hover:shadow active:scale-95 relative group ${isNotificationsOpen ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100' : ''}`}
                  >
                    <Bell size={20} />
                    {(updateAvailable) && (
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </button>

                  {/* Truyền updateAvailable vào NotificationsList */}
                  <HeaderDropdown isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} title="Thông báo">
                      <NotificationsList updateAvailable={updateAvailable} />
                  </HeaderDropdown>
                </div>

                {/* NÚT CÀI ĐẶT */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setIsSettingsOpen(!isSettingsOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className={`p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white bg-slate-100/50 rounded-full transition-all hover:rotate-90 duration-500 shadow-sm hover:shadow active:scale-95 ${isSettingsOpen ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100 rotate-90' : ''}`}
                  >
                    <Settings size={20} />
                  </button>
                  
                  <HeaderDropdown isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Cài đặt nhanh">
                      <SettingsList />
                  </HeaderDropdown>
                </div>
            </div>
        </header>
    )
}