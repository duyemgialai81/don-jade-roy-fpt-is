import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, FileJson, Play, Square, Copy, RefreshCw, Send, Terminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { ConsoleLog } from '../ui/ConsoleLog';
import { Button } from '../ui/Button';
import { motion } from 'motion/react';
// Import config và sampleData
import { getHeaders } from '../../../utils/config';
import { SAMPLE_ENFORCEMENT_DATA } from '../../../utils/sampleData';

interface DataPusherProps {
  globalToken: string;
}

export const DataPusher: React.FC<DataPusherProps> = ({ globalToken }) => {
  const [apiUrl, setApiUrl] = useState('https://econtract.fpt.com/app/services/thads-tctha/api/enforcements/save-internal');
  const [pushToken, setPushToken] = useState('');
  const [assignees, setAssignees] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState<string[]>(['Ready to push data.']);
  
  const stopRef = useRef(false);

  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    setJsonData(JSON.stringify(SAMPLE_ENFORCEMENT_DATA, null, 2));
  };

  const handleCopyToken = () => {
    if (globalToken) {
      setPushToken(globalToken);
      setLogs(prev => [...prev, '✔ Token copied from Dashboard Manager tab.']);
    } else {
      setLogs(prev => [...prev, '⚠ Warning: No token available in Dashboard Manager tab.']);
    }
  };

  const handleStartPush = async () => {
    const emails = assignees.split('\n').filter(e => e.trim());
    let dataPayload: any[];

    try {
        dataPayload = JSON.parse(jsonData);
        if(!Array.isArray(dataPayload)) dataPayload = [dataPayload];
    } catch(e) {
        return setLogs(prev => [...prev, '❌ JSON Payload lỗi!']);
    }

    if (emails.length === 0) return setLogs(prev => [...prev, '⚠ Chưa nhập danh sách email (Assignees).']);
    if (!pushToken) return setLogs(prev => [...prev, '⚠ Chưa có Token.']);

    setIsPushing(true);
    stopRef.current = false;
    const totalOps = emails.length * dataPayload.length;
    setStats({ total: totalOps, success: 0, failed: 0 });
    setProgress(0);
    setLogs(prev => [...prev, `🚀 Bắt đầu đẩy ${totalOps} records...`]);

    let processedCount = 0;

    for (const email of emails) {
      if (stopRef.current) break;
      setLogs(prev => [...prev, `\n--- User: ${email} ---`]);
      
      for (let i = 0; i < dataPayload.length; i++) {
          if (stopRef.current) break;
          
          const record = JSON.parse(JSON.stringify(dataPayload[i]));
          // Logic gốc: Gán assignee bằng email hiện tại trong loop
          if (record.enforcement) {
             record.enforcement.assignee = email;
          }

          try {
              // Sử dụng getHeaders để đảm bảo header chuẩn
              const res = await fetch(apiUrl, {
                  method: "POST",
                  headers: getHeaders(pushToken), 
                  body: JSON.stringify(record)
              });

              // Đọc text trước để tránh lỗi "Unexpected token" nếu server trả về HTML
              const text = await res.text();

              if (res.ok) {
                  setStats(p => ({ ...p, success: p.success + 1 }));
                  setLogs(prev => [...prev, `✔ Record ${i+1}: Success`]);
              } else {
                  setStats(p => ({ ...p, failed: p.failed + 1 }));
                  // Cố gắng parse message lỗi từ JSON server trả về, nếu không in raw text
                  let errorDetails = text;
                  try {
                      const errJson = JSON.parse(text);
                      errorDetails = errJson.message || errJson.error || text;
                  } catch (e) {
                      errorDetails = text.substring(0, 100);
                  }
                  setLogs(prev => [...prev, `❌ Record ${i+1}: Failed ${res.status} - ${errorDetails}`]);
              }
          } catch (err: any) {
              setStats(p => ({ ...p, failed: p.failed + 1 }));
              setLogs(prev => [...prev, `❌ Network/CORS Error: ${err.message}`]);
          }

          processedCount++;
          setProgress(Math.round((processedCount / totalOps) * 100));
          
          // Delay nhỏ để tránh spam quá nhanh (giống script gốc chạy async nhưng fetch browser nhanh hơn)
          await new Promise(r => setTimeout(r, 200));
      }
    }

    setIsPushing(false);
    setLogs(prev => [...prev, stopRef.current ? '⏹ Đã dừng.' : '🏁 Hoàn tất đẩy dữ liệu.']);
  };

  const handleStopPush = () => {
    stopRef.current = true;
    setLogs(prev => [...prev, 'Stopping...']);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Card */}
        <Card className="h-full flex flex-col">
          <CardHeader><CardTitle className="text-indigo-600"><Settings size={20} /> Cấu Hình Push</CardTitle></CardHeader>
          <CardBody className="space-y-5 flex-1">
             <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase">API Endpoint</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Send size={16}/></div>
                    <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm" />
                </div>
             </div>
             <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-slate-500 uppercase">Push Token</label>
                <textarea value={pushToken} onChange={(e) => setPushToken(e.target.value)} className="w-full h-24 p-3 bg-slate-50 border rounded-xl text-xs font-mono" placeholder="Bearer token..." />
                <div className="flex justify-end mt-2">
                    <Button variant="ghost" size="sm" onClick={handleCopyToken} icon={Copy} className="text-indigo-600">Lấy từ Tab Dashboard</Button>
                </div>
             </div>
          </CardBody>
        </Card>

        {/* Assignees Card */}
        <Card className="h-full flex flex-col">
          <CardHeader><CardTitle className="text-indigo-600"><Users size={20} /> Người nhận (Assignees)</CardTitle></CardHeader>
          <CardBody className="flex-1">
             <textarea value={assignees} onChange={(e) => setAssignees(e.target.value)} className="w-full h-full min-h-[160px] p-4 bg-slate-50 border rounded-xl text-sm" placeholder="Danh sách email người nhận..." />
          </CardBody>
        </Card>
      </div>

      {/* Payload Editor */}
      <Card>
        <CardHeader>
            <CardTitle className="text-indigo-600"><FileJson size={20} /> JSON Payload</CardTitle>
            <Button variant="outline" size="sm" onClick={loadSampleData} icon={RefreshCw}>Reset Mẫu</Button>
        </CardHeader>
        <div className="p-0 bg-[#0d1117] rounded-b-2xl">
            <textarea value={jsonData} onChange={(e) => setJsonData(e.target.value)} className="w-full h-64 p-4 bg-transparent text-slate-300 font-mono text-sm border-0 resize-none" spellCheck={false} />
        </div>
      </Card>

      {/* Stats & Actions */}
      <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-xl">
         <CardBody>
             <div className="flex items-center justify-between mb-4">
                 <div className="flex gap-3">
                     <span className="px-3 py-1 rounded-full bg-white/10 text-xs">Tổng: <b>{stats.total}</b></span>
                     <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Thành công: <b>{stats.success}</b></span>
                     <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs">Lỗi: <b>{stats.failed}</b></span>
                 </div>
                 <span className="text-indigo-200 font-mono font-bold text-lg">{progress}%</span>
             </div>
             <div className="w-full h-3 bg-slate-800/50 rounded-full mb-8 relative border border-white/5">
                 <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
             </div>
             <div className="flex justify-end gap-4">
                 <Button variant="outline" onClick={handleStopPush} disabled={!isPushing} icon={Square} className="border-white/20 text-white hover:bg-white/10">Dừng</Button>
                 <Button onClick={handleStartPush} disabled={isPushing} icon={Play} className="bg-white text-indigo-900 hover:bg-indigo-50">Bắt đầu đẩy dữ liệu</Button>
             </div>
         </CardBody>
      </Card>

       <Card>
        <CardHeader className="py-3.5 bg-slate-900 border-slate-800"><CardTitle className="text-slate-200 text-sm"><Terminal size={16} /> Push Process Log</CardTitle></CardHeader>
        <div className="p-0"><ConsoleLog logs={logs} title="" className="rounded-t-none border-0 h-48 bg-[#0a0a0a]" /></div>
      </Card>
    </div>
  );
};