import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertCircle, XCircle, Play, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { ConsoleLog } from '../ui/ConsoleLog';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { motion, animate } from 'motion/react';
import { CONFIG, EnvType, getHeaders } from '../../../utils/config';

interface CheckResult {
  email: string;
  userId: string;
  status: 'Complete' | 'Partial' | 'Missing';
  details: string;
}

interface StatusCheckerProps {
    globalToken: string;
    currentEnv: EnvType;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1, ease: "easeOut", onUpdate: (latest) => setDisplayValue(Math.round(latest))
    });
    return () => controls.stop();
  }, [value]);
  return <span>{displayValue}</span>;
};

export const StatusChecker: React.FC<StatusCheckerProps> = ({ globalToken, currentEnv }) => {
  const [emails, setEmails] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [logs, setLogs] = useState<string[]>(['Sẵn sàng kiểm tra.']);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Complete' | 'Partial' | 'Missing' | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const handleCheck = async () => {
    if (!globalToken) return addLog("❌ Cần Token Admin từ Tab 'Quản lý Dashboard'!");
    const emailList = emails.split('\n').filter(e => e.trim());
    if (emailList.length === 0) return addLog('⚠ Danh sách email trống.');

    setIsChecking(true);
    addLog(`🔎 Bắt đầu kiểm tra ${emailList.length} user trên ${currentEnv}...`);
    setResults([]);

    const baseUrl = CONFIG.env[currentEnv].baseUrl;
    const authUrl = CONFIG.env[currentEnv].authUrl;
    
    // [FIX] Sử dụng trực tiếp baseUrl (bao gồm cả path /workspace/services) như file JS gốc
    // Không tách domain bằng new URL() nữa để tránh lỗi 404
    const uaaBase = baseUrl; 
    
    const newResults: CheckResult[] = [];

    for (const email of emailList) {
        addLog(`Checking ${email}...`);
        let userId = 'Unknown';
        let status: CheckResult['status'] = 'Missing';
        let details = '';

        try {
            // --- BƯỚC 1: Lấy User ID (Dùng Admin Token) ---
            // URL: .../workspace/services/uaa/api/users/login...
            const idRes = await fetch(`${uaaBase}/uaa/api/users/login?login=${encodeURIComponent(email)}`, {
                headers: getHeaders(globalToken)
            });
            
            const idText = await idRes.text(); // Đọc text trước
            
            if (!idRes.ok) {
                let errMsg = `Lỗi lấy ID (${idRes.status})`;
                // Cố gắng đọc lỗi từ JSON nếu có
                try {
                    const errObj = JSON.parse(idText);
                    if(errObj.message) errMsg += `: ${errObj.message}`;
                } catch(e) {
                    errMsg += `: ${idText.substring(0, 50)}...`;
                }
                throw new Error(errMsg);
            }

            // Parse ID
            let userData;
            try {
                userData = JSON.parse(idText);
            } catch (e) {
                throw new Error("Phản hồi ID không phải JSON hợp lệ.");
            }
            userId = userData.id;

            // --- BƯỚC 2: Login với tư cách User (Pass mặc định) ---
            const loginRes = await fetch(`${authUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password: CONFIG.commonPass, rememberMe: true })
            });

            const loginText = await loginRes.text();
            if (!loginRes.ok) {
                 throw new Error(`Login User thất bại (${loginRes.status})`);
            }
            
            let loginData;
            try {
                loginData = JSON.parse(loginText);
            } catch (e) {
                throw new Error("Phản hồi Login không phải JSON.");
            }
            
            const userToken = loginData.access_token || loginData.token;

            // --- BƯỚC 3: Lấy danh sách Dashboard của User ---
            // URL: .../workspace/services/workspace/api/dashboards...
            const dashRes = await fetch(`${baseUrl}/workspace/api/dashboards?t=${Date.now()}`, {
                 headers: getHeaders(userToken)
            });
            
            const dashText = await dashRes.text();
            if(!dashRes.ok) throw new Error(`Lỗi lấy Dashboard (${dashRes.status})`);
            
            let userDashboards;
            try {
                userDashboards = JSON.parse(dashText);
            } catch (e) {
                throw new Error("Phản hồi Dashboard không phải JSON.");
            }

            // --- BƯỚC 4: So sánh ---
            const foundIds: string[] = [];
            if (Array.isArray(userDashboards)) {
                userDashboards.forEach((d: any) => {
                    const id = d.oldDashboardId || d.id;
                    if (CONFIG.dashboards.find(c => c.id === id)) foundIds.push(id);
                });
            }

            if (foundIds.length === CONFIG.dashboards.length) {
                status = 'Complete';
                details = 'Đầy đủ dashboard';
            } else if (foundIds.length > 0) {
                status = 'Partial';
                details = `Thiếu (${foundIds.length}/${CONFIG.dashboards.length})`;
            } else {
                status = 'Missing';
                details = 'Chưa có dashboard nào';
            }

        } catch (err: any) {
            details = err.message;
            // Xử lý thông báo lỗi đẹp hơn nếu là lỗi HTML
            if (details.includes("Unexpected token") || details.includes("JSON")) {
                details = "Lỗi Server (Trả về HTML thay vì JSON)";
            }
            addLog(`❌ Error ${email}: ${details}`);
        }

        const result: CheckResult = { email, userId, status, details };
        newResults.push(result);
        setResults([...newResults]); // Cập nhật UI từng dòng
    }

    setIsChecking(false);
    addLog('✅ Kiểm tra hoàn tất.');
  };

  const openModal = (type: typeof modalType) => {
    setModalType(type);
    setModalOpen(true);
  };

  const getFilteredResults = () => modalType ? results.filter(r => r.status === modalType) : [];

  const stats = {
    total: results.length,
    complete: results.filter(r => r.status === 'Complete').length,
    partial: results.filter(r => r.status === 'Partial').length,
    missing: results.filter(r => r.status === 'Missing').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Column */}
        <div className="lg:col-span-1 h-full">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-indigo-600">
                <Search size={20} className="text-indigo-500" />
                Input Checking
              </CardTitle>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col">
              <div className="flex-1 mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Danh sách Email</label>
                <textarea
                  className="w-full h-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none transition-all shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="user@domain.com..."
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                />
              </div>
              <Button onClick={handleCheck} isLoading={isChecking} className="w-full" icon={Play}>
                Quét Ngay
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsBox label="Tổng User" value={stats.total} icon={Users} color="blue" />
            <StatsBox label="Đầy đủ" value={stats.complete} icon={CheckCircle} color="green" onClick={() => openModal('Complete')} />
            <StatsBox label="Thiếu" value={stats.partial} icon={AlertCircle} color="orange" onClick={() => openModal('Partial')} />
            <StatsBox label="Chưa có" value={stats.missing} icon={XCircle} color="red" onClick={() => openModal('Missing')} />
          </div>

          {results.length > 0 && (
            <Card className="max-h-[400px] flex flex-col">
              <CardHeader><CardTitle className="text-slate-700">Kết quả chi tiết</CardTitle></CardHeader>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    <tr>
                      <th className="px-5 py-3.5 border-b border-slate-100">Email</th>
                      <th className="px-5 py-3.5 border-b border-slate-100">User ID</th>
                      <th className="px-5 py-3.5 border-b border-slate-100">Trạng Thái</th>
                      <th className="px-5 py-3.5 border-b border-slate-100">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.map((row, index) => (
                      <motion.tr key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-indigo-50/20">
                        <td className="px-5 py-3 font-medium text-slate-700">{row.email}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{row.userId}</td>
                        <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                        <td className="px-5 py-3 text-slate-500 text-xs truncate max-w-[150px]">{row.details}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-3.5 bg-slate-900 border-slate-800">
          <CardTitle className="text-slate-200 text-sm">Processing Log</CardTitle>
        </CardHeader>
        <div className="p-0">
          <ConsoleLog logs={logs} title="" className="rounded-t-none border-0 h-48 bg-[#0a0a0a]" />
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Danh sách ${modalType}`}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
           {getFilteredResults().map((item, idx) => (
             <div key={idx} className="py-2 px-3 hover:bg-slate-50 rounded flex justify-between items-center border-b border-slate-50">
                <span className="text-sm">{item.email}</span>
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{item.userId}</span>
             </div>
           ))}
        </div>
      </Modal>
    </div>
  );
};

// --- Sub Components ---

const StatsBox = ({ label, value, icon: Icon, color, onClick }: any) => {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    green: "bg-emerald-50 text-emerald-600 shadow-emerald-100",
    orange: "bg-amber-50 text-amber-600 shadow-amber-100",
    red: "bg-rose-50 text-rose-600 shadow-rose-100",
  };
  return (
    <motion.div 
      whileHover={onClick ? { scale: 1.05 } : {}} 
      onClick={onClick} 
      className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]} shadow-inner`}>
        <Icon size={26} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-extrabold text-slate-800"><AnimatedNumber value={value} /></h3>
      </div>
    </motion.div>
  );
};

const StatusBadge = ({ status }: { status: CheckResult['status'] }) => {
  const styles = { 
    Complete: "bg-emerald-100 text-emerald-700 border border-emerald-200", 
    Partial: "bg-amber-100 text-amber-700 border border-amber-200", 
    Missing: "bg-rose-100 text-rose-700 border border-rose-200" 
  };
  const icons = { Complete: CheckCircle, Partial: AlertCircle, Missing: XCircle };
  const Icon = icons[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
      <Icon size={12} /> 
      {status === 'Complete' ? 'Đầy đủ' : status === 'Partial' ? 'Thiếu' : 'Chưa có'}
    </span>
  );
};