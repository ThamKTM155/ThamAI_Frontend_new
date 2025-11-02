# Cập nhật Frontend ThamAI – Bản có Cài đặt Giọng & Âm thanh

## 1. Cách cập nhật
- Dán 3 file: index.html, style.css, script.js vào thư mục frontend hiện tại.
- Commit và push lên GitHub repo: ThachAIFrontend_fresh
- Vercel sẽ tự động redeploy.

## 2. Cách sử dụng
- Bấm ⚙️ để mở menu “Cài đặt giọng & âm thanh”
- Chọn giọng Nam/Nữ, tốc độ nói, âm lượng → bấm 💾 Lưu
- Gửi tin nhắn bằng nút “Gửi” hoặc phím Enter
- Dùng 🎙️ để ghi âm gửi lên backend Whisper
- Khi reload lại trang, ThamAI sẽ giữ nguyên giọng đã chọn

## 3. Lưu ý
- Nếu không nghe được giọng, hãy bật quyền “Microphone” và “Âm thanh” trong trình duyệt.
- Đảm bảo backend đang hoạt động tại: https://thamai-backend-new.onrender.com/
=================================================================================
───────────────────────────────
PHẦN MỞ RỘNG: GIAO DIỆN CHAT (ThamAI Chat Ultra)
───────────────────────────────

📁 Cấu trúc bổ sung:
├── chat.html
├── chat.css
└── chat.js

💬 Cách sử dụng:
1. Mở file "chat.html" để trò chuyện trực tiếp với ThamAI.
2. Trang này tự động kết nối với backend Render tại:
   → https://thamai-backend-new.onrender.com
3. Hỗ trợ:
   - Gửi tin nhắn văn bản
   - Nhận phản hồi từ AI (qua /chat)
   - Đọc giọng (TTS)
   - Gửi giọng nói (STT)
4. Nhấn nút ⚙️ để quay lại trang "Settings Ultra+".

📌 Ghi chú:
- Cả hai trang (index.html và chat.html) dùng chung file backend.
- Có thể triển khai đồng thời trên Vercel.
- Sau khi thêm file, commit lên GitHub và Vercel sẽ tự build.
───────────────────────────────
