import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, ListChecks, Trash2, Plus, Play, UserCog, Terminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { ConsoleLog } from '../ui/ConsoleLog';
import { Button } from '../ui/Button';
import { motion } from 'motion/react';
// Lưu ý: Kiểm tra lại đường dẫn import này cho đúng với cấu trúc thư mục của bạn (thường là ../../utils/config)
import { CONFIG, EnvType, getHeaders } from '../../../utils/config';

interface DashboardManagerProps {
  onTokenUpdate: (token: string) => void;
  currentEnv: EnvType;
}

// --- THÊM LOGIC LƯU TOKEN 5 PHÚT ---
const TOKEN_LIFETIME = 5 * 60 * 1000; // 5 phút tính bằng milliseconds
const getStorageKey = (env: EnvType) => `dashboard_auth_token_${env}`;

export const DashboardManager: React.FC<DashboardManagerProps> = ({ onTokenUpdate, currentEnv }) => {
  const [username, setUsername] = useState('customersuport@gmail.com');
  const [password, setPassword] = useState('thads@2025');
  const [token, setToken] = useState('');
  const [selectedPresets, setSelectedPresets] = useState<string[]>(CONFIG.dashboards.map(p => p.id));
  const [logs, setLogs] = useState<string[]>(['System initialized.']);
  const [tableRows, setTableRows] = useState<{id: string, email: string}[]>([{id: '', email: ''}]);
  const [bulkEmails, setBulkEmails] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  // --- Tự động lấy token khi mở tab / chuyển Env ---
  useEffect(() => {
    const storageKey = getStorageKey(currentEnv);
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      try {
        const { token: savedToken, expiresAt } = JSON.parse(storedData);
        
        // Kiểm tra xem token còn hạn 5 phút không
        if (Date.now() < expiresAt) {
          setToken(savedToken);
          onTokenUpdate(savedToken);
          addLog(`🔄 Khôi phục phiên đăng nhập (${currentEnv.toUpperCase()}).`);

          // Đặt bộ đếm ngược để tự động đăng xuất khi hết 5 phút
          const timeRemaining = expiresAt - Date.now();
          const timeoutId = setTimeout(() => {
            setToken('');
            onTokenUpdate('');
            localStorage.removeItem(storageKey);
            addLog("⏳ Phiên đăng nhập 5 phút đã hết hạn. Vui lòng đăng nhập lại.");
          }, timeRemaining);

          return () => clearTimeout(timeoutId); // Cleanup timer khi component unmount
        } else {
          // Đã quá 5 phút
          localStorage.removeItem(storageKey);
          setToken('');
          addLog("⏳ Phiên đăng nhập đã quá 5 phút. Vui lòng đăng nhập lại.");
        }
      } catch (e) {
        localStorage.removeItem(storageKey);
      }
    } else {
      // Đổi môi trường hoặc chưa có token thì reset
      setToken('');
    }
  }, [currentEnv, onTokenUpdate]);

  // --- API 1: Đăng nhập ---
  const handleLogin = async () => {
    if (!username || !password) return addLog("⚠ Vui lòng nhập user/pass");
    setIsLoggingIn(true);
    addLog(`Đang đăng nhập vào ${currentEnv.toUpperCase()}...`);

    try {
      const url = `${CONFIG.env[currentEnv].authUrl}/auth/login`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe: true })
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      const newToken = data.access_token || data.id_token || data.token || data.accessToken;

      if (newToken) {
        // Lưu token vào localStorage cùng với thời gian hết hạn
        const expiresAt = Date.now() + TOKEN_LIFETIME;
        localStorage.setItem(
          getStorageKey(currentEnv), 
          JSON.stringify({ token: newToken, expiresAt })
        );

        setToken(newToken);
        onTokenUpdate(newToken);
        addLog(`✅ Đăng nhập thành công! Token lưu trong 5 phút.`);
      } else {
        addLog(`❌ Không tìm thấy token trong phản hồi.`);
      }
    } catch (err: any) {
      addLog(`❌ Lỗi đăng nhập: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- API 2: Scan IDs ---
  const handleScanIds = async () => {
    if (!token) return addLog("Cần đăng nhập lấy Token trước!");
    
    const emailsToScan = tableRows.filter(r => r.email.trim() !== '');
    if (emailsToScan.length === 0) return addLog("⚠ Danh sách email trống!");

    addLog("🔎 Đang quét ID người dùng...");
    const updatedRows = [...tableRows];
    
    const baseUrl = CONFIG.env[currentEnv].baseUrl;

    for (let i = 0; i < updatedRows.length; i++) {
      const email = updatedRows[i].email.trim();
      if (!email) continue;
      
      try {
        const url = `${baseUrl}/uaa/api/users/login?login=${encodeURIComponent(email)}`;
        
        const res = await fetch(url, {
          headers: getHeaders(token)
        });
        
        const text = await res.text();
        
        if (res.ok) {
          try {
            const data = JSON.parse(text);
            if (data && data.id) {
              updatedRows[i].id = data.id;
              addLog(`✅ ${email} => ID: ${data.id}`);
            } else {
               addLog(`⚠ ${email}: Không tìm thấy ID (Data rỗng).`);
            }
          } catch (e) {
             addLog(`⚠ ${email}: Phản hồi không phải JSON.`);
             console.error("Raw response:", text);
          }
        } else {
          let errorMsg = `HTTP ${res.status}`;
          try {
              const errJson = JSON.parse(text);
              if (errJson.error) errorMsg += ` - ${errJson.error}`;
              if (errJson.message) errorMsg += ` (${errJson.message})`;
          } catch (e) {
              errorMsg += `: ${text.substring(0, 100)}...`;
          }
          addLog(`❌ Lỗi quét ${email}: ${errorMsg}`);
        }
      } catch (err: any) {
        addLog(`❌ Lỗi mạng/kết nối ${email}: ${err.message}`);
      }
    }
    setTableRows(updatedRows);
  };

  // --- API 3: Tạo Dashboard ---
  const handleCreateDashboard = async () => {
    if (!token) return addLog("⚠ Thiếu Token!");
    if (selectedPresets.length === 0) return addLog("⚠ Chưa chọn Dashboard nào!");
    const users = tableRows.filter(r => r.id && r.email);
    if (users.length === 0) return addLog("⚠ Chưa có User hợp lệ (cần ID và Email)!");

    setIsCreating(true);
    addLog(`🚀 Bắt đầu tạo dashboard cho ${users.length} user...`);
    
    const baseUrl = CONFIG.env[currentEnv].baseUrl;

    for (const dashboardId of selectedPresets) {
        for (const user of users) {
            try {
                const url = `${baseUrl}/workspace/api/dashboards/create?dashboardId=${dashboardId}&t=${Date.now()}`;
                
                const payload = [{ id: parseInt(user.id), email: user.email }];

                const res = await fetch(url, {
                    method: "POST",
                    headers: getHeaders(token),
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    addLog(`✅ Tạo ${dashboardId} cho ${user.email} OK.`);
                } else {
                    const errText = await res.text();
                    addLog(`❌ Thất bại ${user.email}: ${res.status} - ${errText}`);
                }
            } catch (err: any) {
                addLog(`❌ Lỗi: ${err.message}`);
            }
        }
    }
    setIsCreating(false);
    addLog("🎉 Hoàn tất tạo Dashboard.");
  };

  // --- API 4: Xóa Dashboard ---
  const handleDeleteDashboard = async () => {
      if (!token) return addLog("⚠ Thiếu Token!");
      const users = tableRows.filter(r => r.id && r.email).map(u => ({ id: parseInt(u.id), email: u.email }));
      if (users.length === 0) return addLog("⚠ Chưa có User hợp lệ!");

      setIsDeleting(true);
      addLog("🗑 Đang xóa dashboard...");
      
      const baseUrl = CONFIG.env[currentEnv].baseUrl;
      try {
          const res = await fetch(`${baseUrl}/workspace/api/dashboards/delete?t=${Date.now()}`, {
              method: "POST",
              headers: getHeaders(token),
              body: JSON.stringify(users)
          });
          
          const text = await res.text();
          if(res.ok) {
             addLog(`✅ Xóa thành công: ${text}`);
          } else {
             addLog(`❌ Xóa thất bại: ${res.status} - ${text}`);
          }
      } catch (err: any) {
          addLog(`❌ Lỗi: ${err.message}`);
      } finally {
          setIsDeleting(false);
      }
  };

  // --- Helper UI Functions ---
  const togglePreset = (id: string) => {
    setSelectedPresets(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const addRow = () => setTableRows([...tableRows, { id: '', email: '' }]);
  const removeRow = (index: number) => setTableRows(tableRows.filter((_, i) => i !== index));
  const updateRow = (index: number, field: 'id' | 'email', value: string) => {
    const newRows = [...tableRows];
    newRows[index][field] = value;
    setTableRows(newRows);
  };

  const handleBulkEmailProcess = () => {
      if (!bulkEmails.trim()) return;
      const emails = bulkEmails.split('\n').filter(e => e.trim());
      const newRows = emails.map(email => ({ id: '', email: email.trim() }));
      setTableRows([...tableRows, ...newRows]);
      setBulkEmails('');
      addLog(`➕ Đã thêm ${emails.length} email.`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Section */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-indigo-600">
              <ShieldCheck size={20} className="text-indigo-500" />
              Xác Thực Hệ Thống ({currentEnv.toUpperCase()})
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-5 flex-1">
            <div className="group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 group-focus-within:text-indigo-600 transition-colors">Tên đăng nhập</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 group-focus-within:text-indigo-600 transition-colors">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleLogin}
              isLoading={isLoggingIn}
              className="w-full justify-center mt-2"
              size="lg"
            >
              Đăng nhập & Lấy Token
            </Button>
            
            {token && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4"
              >
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Access Token</label>
                <div className="relative group">
                  <textarea
                    readOnly
                    value={token}
                    className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono text-green-400 resize-none focus:outline-none shadow-inner"
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-bold uppercase border border-slate-700">Read Only</div>
                </div>
              </motion.div>
            )}
          </CardBody>
        </Card>

        {/* Config Section */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-indigo-600">
              <ListChecks size={20} className="text-indigo-500" />
              Cấu Hình Dashboard
            </CardTitle>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 shadow-sm">
              {selectedPresets.length} Selected
            </span>
          </CardHeader>
          <CardBody className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {CONFIG.dashboards.map((preset, index) => (
                <motion.label
                  key={preset.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                    selectedPresets.includes(preset.id)
                      ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200 shadow-sm shadow-indigo-100'
                      : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${
                    selectedPresets.includes(preset.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                  }`}>
                      {selectedPresets.includes(preset.id) && <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></motion.svg>}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedPresets.includes(preset.id)}
                    onChange={() => togglePreset(preset.id)}
                  />
                  <span className={`text-sm font-medium ${selectedPresets.includes(preset.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                    {preset.label}
                  </span>
                </motion.label>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-indigo-600">
            <UserCog size={20} className="text-indigo-500" />
            Danh Sách Người Dùng
          </CardTitle>
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleScanIds}
          >
             Scan IDs
          </Button>
        </CardHeader>
        <CardBody className="space-y-6">
          <div>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner"
              rows={2}
              placeholder="Nhập email hàng loạt (mỗi email một dòng) để xử lý nhanh..."
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              onBlur={handleBulkEmailProcess}
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-1/3">ID Hệ Thống</th>
                  <th className="px-5 py-3.5">Email Tài Khoản</th>
                  <th className="px-5 py-3.5 w-20 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tableRows.map((row, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index} 
                    className="group hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="p-3 pl-5">
                      <input
                        type="text"
                        value={row.id}
                        onChange={(e) => updateRow(index, 'id', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-transparent group-hover:bg-white group-hover:border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono text-sm"
                        placeholder="Nhập ID..."
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.email}
                        onChange={(e) => updateRow(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-transparent group-hover:bg-white group-hover:border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="Nhập Email..."
                      />
                    </td>
                    <td className="p-3 pr-5 text-center">
                      <button
                        onClick={() => removeRow(index)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all transform hover:scale-110"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer" onClick={addRow}>
              <button className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-1.5">
                <Plus size={16} /> Thêm dòng
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-2">
            <Button
              variant="danger"
              onClick={handleDeleteDashboard}
              isLoading={isDeleting}
              icon={Trash2}
              className="bg-white text-red-600 border border-red-200 shadow-none hover:shadow-sm hover:border-red-300 hover:bg-red-50"
            >
              Xóa Dashboard
            </Button>
            <Button
              onClick={handleCreateDashboard}
              isLoading={isCreating}
              icon={Play}
            >
              Tạo Dashboard
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="py-3.5 bg-slate-900 border-slate-800">
          <CardTitle className="text-slate-200 text-sm">
            <Terminal size={16} className="text-green-400" />
            Nhật Ký Hệ Thống
          </CardTitle>
        </CardHeader>
        <div className="p-0">
          <ConsoleLog logs={logs} title="" className="rounded-t-none border-0 h-48 bg-[#0a0a0a]" />
        </div>
      </Card>
    </div>
  );
};