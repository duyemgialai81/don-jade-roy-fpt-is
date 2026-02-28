import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './Card';

interface ConsoleLogProps {
  logs: string[];
  title?: string;
  className?: string;
}

export const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs, title = "Console Output", className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={cn("bg-[#1e1e1e] border border-slate-700 rounded-xl overflow-hidden shadow-inner font-mono text-xs flex flex-col", className)}>
      {title && (
        <div className="bg-[#2d2d2d] px-4 py-2 text-slate-400 border-b border-slate-700 flex items-center justify-between select-none">
          <span className="font-bold">{title}</span>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
        </div>
      )}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-1 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <span className="text-slate-500 select-none">
                {new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className={
                log.toLowerCase().includes('error') ? 'text-red-400' :
                log.toLowerCase().includes('success') ? 'text-emerald-400' :
                log.toLowerCase().includes('warning') ? 'text-amber-400' :
                'text-slate-300'
              }>
                {log.startsWith('>') ? (
                  <span className="text-blue-400 mr-1">$</span>
                ) : (
                  <span className="text-slate-500 mr-1">›</span>
                )}
                {log}
              </span>
            </motion.div>
          ))}
          <div className="animate-pulse text-blue-500 font-bold ml-1">_</div>
        </AnimatePresence>
      </div>
    </div>
  );
};
