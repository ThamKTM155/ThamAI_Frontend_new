# 🌟 ThamAI Frontend (Phiên bản mới)

Giao diện web tương tác dành cho **Trợ lý ảo ThamAI** — dự án cá nhân của anh **Hoàng Ngọc Thắm**.  
Phiên bản này hỗ trợ hội thoại tự nhiên bằng **giọng nói**, hiển thị cảm xúc, tốc độ, và giọng nói có thể tùy chỉnh.  

---

## ⚙️ Tính năng nổi bật

- 💬 **Chat song ngữ**: Nhập văn bản hoặc nói trực tiếp để trò chuyện với ThamAI.  
- 🎤 **Voice Input (Ghi âm)**: Nhấn 🎤 để nói — hệ thống tự động chuyển giọng nói thành văn bản (STT).  
- 🔊 **Voice Output (Phát giọng)**: ThamAI đọc lại câu trả lời bằng giọng tự nhiên (TTS).  
- 🧠 **Tự động tương tác**: Sau khi nói xong, nếu người dùng im lặng vài giây, ThamAI tự hỏi lại:  
  > “Anh còn muốn hỏi thêm gì không?”  
- ⚡ **Tuỳ chọn giọng & tốc độ**: Chọn giọng **nam/nữ**, **nhanh/chậm**, và **cảm xúc (vui/nhẹ nhàng/nghiêm)**.  
- 🎧 **Hiệu ứng sinh động**: Hiển thị “Đang nói…” hoặc biểu tượng loa rung khi ThamAI phát âm thanh.  

---

## 🧩 Cấu trúc dự án

```plaintext
📁 ThamAI_Frontend_new/
├── index.html       # Giao diện chính của trợ lý ảo
├── style.css        # Giao diện và hiệu ứng hiển thị
└── script.js        # Toàn bộ logic xử lý chat, ghi âm và phát giọng
🚀 Cách triển khai
1️⃣ Cấu hình kết nối Backend

Trong script.js, đảm bảo thay đúng URL backend:

const BACKEND_URL = "https://thamai-backend-new.onrender.com";

2️⃣ Chạy thử trên máy tính

Mở file index.html bằng trình duyệt Chrome hoặc Edge.

Cho phép quyền microphone khi được hỏi.

Nhấn nút 🎤 để ghi âm — ThamAI sẽ nghe, hiểu và trả lời bằng giọng.

Thử thay đổi giọng, tốc độ hoặc cảm xúc ngay trên giao diện.

🌐 Triển khai lên Vercel

Tạo repo GitHub (ví dụ: ThamAI_Frontend_new).

Đưa ba file (index.html, style.css, script.js) và file README.md này lên repo.

Truy cập https://vercel.com
, kết nối với GitHub, chọn repo này.

Nhấn Deploy → sau vài phút, giao diện sẽ chạy trực tiếp online.

🔧 Ghi chú kỹ thuật

STT (Speech-to-Text): Dùng Whisper (qua API miễn phí của HuggingFace).

TTS (Text-to-Speech): Dùng Web Speech API có sẵn trong trình duyệt.

Khi ghi âm, ThamAI tự tắt giọng nói để không bị ghi lại âm thanh của chính mình.

Sau khi phát xong, nếu không có phản hồi, ThamAI sẽ tự hỏi lại người dùng sau 5 giây.

🧠 Tác giả

Hoàng Ngọc Thắm (Thắm Tạo KT)
Trợ lý phát triển: ChatGPT (GPT-5)

“ThamAI – Trợ lý biết nghe, biết nói và biết quan tâm.” 💖
