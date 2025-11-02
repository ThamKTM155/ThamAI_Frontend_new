ThamAI Chat Ultra+ v1.2 — HƯỚNG DẪN NGẮN
======================================

1) Mục đích
- Frontend này có chat, ghi âm->whisper, TTS (speak), sóng âm động (mic + TTS), miệng avatar động.
- Lưu lựa chọn giọng (localStorage).

2) Files cần có (frontend)
- chat.html        (giao diện)
- style.css        (giao diện & animation)
- script.js        (logic)
- assets/avatar.png (avatar image)
- assets/ting.mp3   (âm thanh "ting" khi kết nối thành công)

3) Cấu hình trước khi chạy
- Mở file script.js, chỉnh biến API_BASE cho đúng backend của anh, ví dụ:
  const API_BASE = "https://thamai-backend-new.onrender.com";

- Backend phải có 3 endpoint:
  /test  (GET) -> trả JSON {status:"ok"} hoặc {message:"..."}
  /chat  (POST JSON {message}) -> trả JSON {reply}
  /whisper (POST FormData 'file') -> trả JSON {text}
  /speak (POST JSON {text, gender?, lang?}) -> trả file audio (audio/mpeg)

- Backend phải bật CORS cho frontend domain. Nếu /speak trả audio mà muốn render waveform bằng MediaElementSource,
  backend phải trả header CORS phù hợp (Access-Control-Allow-Origin: *).

4) Thay thế file cũ
- Ghi đè file `chat.html`, `style.css`, `script.js` hiện tại trong repo frontend.
- Thêm thư mục assets/ với avatar.png và ting.mp3.
- Commit & push lên GitHub, redeploy trên Vercel (nếu dùng).

5) Kiểm tra nhanh
- Mở trang, chờ hiển thị "Backend ThamAI hoạt động tốt!" (hoặc click 🔁 Thử lại kết nối).
- Gõ tin nhắn → Gửi → kiểm tra phản hồi.
- Nhấn Ghi âm → nói → Dừng → kiểm tra transcript trả về.
- Nhấn "ThamAI nói" hoặc "Thử giọng" → nghe TTS; khi TTS đang phát, sẽ thấy sóng âm và miệng avatar động.

6) Lưu ý kỹ thuật
- Một số trình duyệt chặn autoplay audio: người dùng cần tương tác (click) trước để bật AudioContext.
- Nếu TTS không hiện sóng âm, kiểm tra CORS / Access-Control-Allow-Origin nếu audio fetch từ domain khác.
- Nếu gặp lỗi “Failed to fetch”, kiểm tra console network và render logs backend (Render/Vercel).
- Để dùng Web Speech API (nếu mở rộng), đảm bảo HTTPS khi deploy.

7) Muốn mở rộng
- Thêm lựa chọn pitch, rate trong UI -> truyền về backend /speak hoặc dùng Web Speech API local.
- Lưu bản ghi âm tạm, upload cloud storage, lưu lịch sử.

Kết thúc — Chúc anh triển khai suôn sẻ. Nếu anh muốn, em sẽ gửi bản backend example (Flask gTTS + mock whisper + Chat) tương thích với bản frontend này.
====================================================
Ghi chú kỹ thuật & kiểm tra nhanh (nhỏ, quan trọng)

CORS và audio: Nếu backend /speak trả file audio từ domain khác, phải có header Access-Control-Allow-Origin: * để createMediaElementSource hoạt động. Nếu không, sóng TTS vẫn có thể hiển thị bằng tạm thời (nhưng attach sẽ fail).

Autoplay: Chrome đặt giới hạn autoplay — audioContext phải được resume sau hành động người dùng (click). Script đã cố gắng resume khi user ghi âm hoặc bấm nút.

Back-end URL: Đừng để API_BASE trống — nhiều lỗi fetch bắt nguồn từ URL sai hoặc 404 (anh đã thấy lỗi Unexpected token '<' trước đó, nghĩa là fetch trả HTML 404 trang).

Test nhanh: Sau dán file, chạy checkBackend() bằng nút 🔁; nút test voice dùng lastBotReply hoặc câu test.