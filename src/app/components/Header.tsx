import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Settings, Search, X, DownloadCloud } from 'lucide-react';
import { NotificationsList, SettingsList } from './ui/HeaderDropdowns';

// Import trực tiếp version từ package.json
// Lưu ý: Kiểm tra lại đường dẫn import này cho đúng với cấu trúc thư mục của bạn
import pkg from '../../../package.json'; 

interface HeaderProps {
    activeTab: string;
    titles: Record<string, string>;
}

// ĐÃ CẬP NHẬT THÔNG TIN REPO GITHUB MỚI CỦA BẠN
const GITHUB_OWNER = 'duyemgialai81'; 
const GITHUB_REPO = 'don-jade-roy-fpt-is'; 
const CURRENT_VERSION = `v${pkg.version}`; 

interface UpdateInfo {
    version: string;
    notes: string;
    downloadUrl: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, titles }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);

    // --- LOGIC KIỂM TRA UPDATE TỪ GITHUB ---
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
                        notes: data.body || "Đã có bản cập nhật mới mang lại trải nghiệm tốt hơn.",
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
                
                {/* Notification Button */}
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

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <>
                         <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                         <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 origin-top-right flex flex-col max-h-[500px]"
                        >
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-sm shrink-0">
                            <h4 className="font-bold text-slate-700 text-sm">Thông báo</h4>
                            <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                          
                          <div className="overflow-y-auto custom-scrollbar flex-1">
                            {/* KHỐI HIỂN THỊ BẢN CẬP NHẬT */}
                            {updateAvailable && (
                                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                                            <DownloadCloud size={20} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-slate-800">
                                                Đã có bản cập nhật mới ({updateAvailable.version})
                                            </h5>
                                            <div className="text-xs text-slate-600 mt-1 line-clamp-3 prose prose-sm">
                                                {updateAvailable.notes}
                                            </div>
                                            <a 
                                                href={updateAvailable.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex items-center justify-center w-full px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                            >
                                                Tải xuống cài đặt
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Danh sách thông báo cũ */}
                            <NotificationsList />
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Settings Button */}
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
                  
                  <AnimatePresence>
                    {isSettingsOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 origin-top-right"
                        >
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-sm">
                            <h4 className="font-bold text-slate-700 text-sm">Cài đặt nhanh</h4>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                          <div className="py-1">
                            <SettingsList />
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
            </div>
        </header>
    )
}