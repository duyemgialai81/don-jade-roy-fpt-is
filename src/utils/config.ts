export type EnvType = 'dev' | 'demo' | 'prod';

export const CONFIG = {
  env: {
    dev: {
      baseUrl: "http://10.14.121.10/eworkspace/services",
      authUrl: "http://10.14.121.10/eaccount"
    },
    demo: {
      baseUrl: "https://demo.workspace.kyta.fpt.com/services",
      authUrl: "https://demo.eaccount.kyta.fpt.com"
    },
    prod: {
      // Giống hệt biến domainMap.prod trong script.js
      baseUrl: "https://erequest.kyta.fpt.com/workspace/services",
      authUrl: "https://eaccount.kyta.fpt.com"
    }
  },
  commonPass: "thads@2025", 
  dashboards: [
    { id: '00006DzIyP8MIxDDXbLOV', label: 'Trang chủ' },
    { id: '0000615IDXR0u6QQ0RKmy', label: 'Văn bản cần ký' },
    { id: '0000663IdbMsv1Kzq68r', label: 'Văn bản chờ PH' },
    { id: '00006OWIJ13CJp4Rk04r', label: 'Văn bản bị trả lại' },
    { id: '00006bBImoXiQr10xDM0', label: 'Văn bản đã PH' },
    { id: '00006BXIkLoigM4523Wq', label: 'TN chưa xong' },
    { id: '00006N1IK56uNoy40lnw', label: 'TN đã xong' },
    { id: '00006owIP6pAHollW1xKR', label: 'Hồ sơ đang TH' },
    { id: '00006lKI663u08na2OVa', label: 'HDSD' },
    { id: '00006nPIRbvJfbWQJgQNB', label: 'Lãnh đạo eQĐ' },
    { id: '00006MgIJDplUlqWVRz0B', label: 'CHV eQĐ' },
    { id: '00006pyIpmlWFEOmW3Pqv', label: 'Chánh VP eQĐ' },
  ]
};

export const getHeaders = (token?: string) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token) {
    // Script gốc dùng Cookie cho getID và Bearer cho các cái khác.
    // Tuy nhiên fetch không cho set Cookie, ta dùng Bearer cho tất cả (thường server FPT chấp nhận cả 2)
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};