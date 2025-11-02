ThamAI Ultra+ v1.4 — Hướng dẫn cài đặt & kiểm tra nhanh
--------------------------------------------------------

1) Mô tả
- Frontend: index.html, style.css, script.js
- Backend: app.py (Flask), dùng gTTS cho TTS, mô phỏng Whisper (mặc định).
- Endpoints:
    GET  /            -> kiểm tra (status)
    POST /chat        -> { "message": "..." } -> trả { "reply": "..." }
    POST /whisper     -> form-data 'file' -> trả { "text": "..." } (mặc định mô phỏng)
    POST /speak       -> { "text": "...", "gender": "female"|"male" } -> trả audio/mp3

2) Cài backend
- Tạo file .env từ .env.sample (điền OPENAI_API_KEY nếu muốn gọi OpenAI thật).
- (Tuỳ chọn) Bật USE_REAL_WHISPER=1 trong .env nếu muốn dùng OpenAI transcription (cần API key + quota).
- Cài dependencies:
    pip install -r requirements.txt
- Chạy local:
    python app.py
  Sau đó backend lắng nghe http://127.0.0.1:5000

3) Cấu hình frontend
- Mở script.js, chỉnh biến API_BASE nếu backend chạy local:
    const API_BASE = "http://127.0.0.1:5000";
  Nếu dùng Render/Vercel, để URL Render: https://thamai-backend-new.onrender.com

4) Test nhanh
- Mở index.html (hoặc deploy frontend).
- Kiểm tra status: nếu hiện "✅ Kết nối backend thành công!" là ok.
- Ghi âm: bấm "🎤 Ghi âm", nói, bấm "⏹️ Dừng" → file sẽ gửi về /whisper (mô phỏng trả "Xin chào, tôi là ThạchAI đây!")
- Chat: nhập tin nhắn và bấm Gửi -> gọi /chat
- TTS: bấm "🔊 Thử giọng" trong Settings hoặc bấm "ThamAI nói"

5) Lưu lựa chọn giọng
- Mục "Lưu lựa chọn giọng" bật sẽ ghi vào localStorage, tự động giữ sau reload.

6) Vấn đề thường gặp & cách fix
- Lỗi "Unexpected token '<'..." => API_BASE sai (trỏ tới HTML 404). Kiểm tra URL backend.
- Lỗi autoplay (Audio play blocked) => cần tương tác (click) vào trang ít nhất một lần để resume AudioContext. Page đã cố gắng resume khi người dùng click.
- Lỗi OpenAI 429 (quota) => tắt USE_REAL_WHISPER, hoặc đợi nạp thêm quota.
- CORS: backend đã bật flask-cors. Nếu bị lỗi CORS, kiểm tra header, hoặc chạy frontend & backend cùng domain.

7) Deploy Render
- Đặt repo backend chứa app.py, requirements.txt, .env (không commit .env with secret).
- Render sẽ chạy gunicorn tự động nếu cấu hình. Hoặc dùng "Web Service -> Manual Deploy".

8) Assets
- Index dùng avatar Base64 inline. Nếu muốn dùng file rời, thay src của logo bằng đường dẫn file.

9) Ghi chú
- Mô phỏng Whisper giúp phát triển frontend mà không tốn OpenAI quota.
- Khi sẵn sàng dùng OpenAI thực, đặt OPENAI_API_KEY đầy đủ và USE_REAL_WHISPER=1 (cẩn thận với chi phí).

Kết thúc.
