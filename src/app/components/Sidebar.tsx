import React from 'react';
import { LayoutDashboard, Activity, Rocket, Server, Box, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { motion } from 'motion/react';
import { EnvType } from '../../utils/config';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentEnv: EnvType;
  onEnvChange: (env: EnvType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentEnv, onEnvChange }) => {
  const menuItems = [
    { id: 'create', label: 'Quản lý Dashboard', icon: LayoutDashboard },
    { id: 'check', label: 'Kiểm tra trạng thái', icon: Activity },
    { id: 'push', label: 'Đẩy dữ liệu', icon: Rocket },
  ];

  return (
    <aside className="w-[280px] bg-white/60 backdrop-blur-2xl border-r border-slate-200/50 flex flex-col h-full flex-shrink-0 relative z-20 shadow-[8px_0_24px_-12px_rgba(0,0,0,0.02)]">
      {/* Logo Section */}
      <div className="p-6">
        <div className="flex items-center gap-3.5 px-2">
          <div className="relative group flex-shrink-0">
            <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="relative w-10 h-10 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
              <Box size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 text-base leading-tight tracking-tight">FPT IS</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="px-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-4 mt-2">
          Menu Chính
        </div>
        <nav className="space-y-1 relative">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group outline-none ${
                  isActive 
                    ? 'text-indigo-700' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50 z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="flex items-center gap-3.5 relative z-10">
                  <Icon 
                    size={18} 
                    className={`transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{item.label}</span>
                </div>

                {isActive && (
                   <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 text-indigo-400">
                     <ChevronRight size={16} strokeWidth={2.5} />
                   </motion.div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Settings */}
      <div className="p-4 space-y-3">
        {/* Environment Selector */}
        <div className="bg-slate-100/50 rounded-xl p-1.5 border border-slate-200/50 flex flex-col">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pt-2 pb-1">
            <Server size={12} /> Môi trường
          </label>
          <div className="relative group">
            <select 
              className="w-full pl-3 pr-8 py-2 bg-transparent text-sm text-slate-700 font-semibold focus:outline-none appearance-none cursor-pointer"
              value={currentEnv}
              onChange={(e) => onEnvChange(e.target.value as EnvType)}
            >
              <option value="dev">Development</option>
              <option value="demo">Demo Environment</option>
              <option value="prod">Production</option>
            </select>
            <ChevronsUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100/50 transition-colors cursor-pointer border border-transparent">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center text-sm font-bold border border-indigo-300/50">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-slate-700 truncate leading-tight">Admin User</p>
            <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">System Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
};