// src/utils/sampleData.ts
export const SAMPLE_ENFORCEMENT_DATA = [
  {
    enforcement: {
      attrs: {
        sobanan: "436/QĐST-HNGĐ",
        qd1loai: "Hôn nhân và gia đình",
        ngaybanan: "2025-08-13T17:00:00Z",
        toaan: "Thi hành án dân sự thành phố Hồ Chí Minh",
      },
      decisionId: "000061pyILrkyfEOVJv8WA",
      decisionNumber: "21101/QĐ-THADS",
      requestDate: "2025-11-25T09:48:41Z",
      type: "is_proactive",
      contentRequirements: {
        base64: null,
        html: "Án phí hôn nhân và gia đình sơ thẩm là 150.000 đồng...",
      },
      // ... (Giữ nguyên cấu trúc dữ liệu JSON dài trong file nodejs của bạn)
      // Để ngắn gọn tôi cắt bớt, bạn hãy copy paste toàn bộ mảng `hs` từ file nodejs vào đây
      totalMoney: 300000,
      remainingAmount: 300000,
      assignee: "placeholder@moj.gov.vn" // Placeholder để code thay thế
    }
    // ... Copy các object khác
  }
];