import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardManager } from './components/tabs/DashboardManager';
import { StatusChecker } from './components/tabs/StatusChecker';
import { DataPusher } from './components/tabs/DataPusher';
import { EnvType } from '../utils/config';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [globalToken, setGlobalToken] = useState('');
  const [currentEnv, setCurrentEnv] = useState<EnvType>('prod');

  const titles: Record<string, string> = {
    'create': 'Quản lý Dashboard',
    'check': 'Kiểm tra trạng thái',
    'push': 'Đẩy dữ liệu hệ thống'
  };

  return (
    <div className="flex h-screen bg-slate-50/50 font-sans text-slate-900 overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-900">
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-400/10 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-400/5 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        currentEnv={currentEnv}
        onEnvChange={setCurrentEnv}
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        <Header activeTab={activeTab} titles={titles} />

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-12">
             <AnimatePresence mode="wait">
               {activeTab === 'create' && (
                 <motion.div
                   key="create"
                   initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                   animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                   exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                   transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} // Spring-like easing
                 >
                   <DashboardManager onTokenUpdate={setGlobalToken} currentEnv={currentEnv} />
                 </motion.div>
               )}
               
               {activeTab === 'check' && (
                 <motion.div
                   key="check"
                   initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                   animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                   exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                   transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                 >
                   <StatusChecker globalToken={globalToken} currentEnv={currentEnv} />
                 </motion.div>
               )}
               
               {activeTab === 'push' && (
                 <motion.div
                   key="push"
                   initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                   animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                   exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                   transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                 >
                   <DataPusher globalToken={globalToken} />
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}