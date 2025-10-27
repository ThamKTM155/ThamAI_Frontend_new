📂 1. Cấu trúc thư mục
ThachAIFrontend_fresh/
│
├── index.html
├── style.css
└── script.js     ← (bản mới nhất có lưu giọng và sửa lỗi Enter, ghi âm)
⚙️ 2. Kết nối backend

File script.js mặc định đã trỏ tới backend trên Render:

const API_BASE = "https://thamai-backend-new.onrender.com";


➡️ Nếu anh triển khai backend khác, chỉ cần đổi dòng này cho khớp.

💡 3. Các chức năng hiện có
Tính năng	Mô tả chi tiết
💬 ChatGPT	Gửi tin nhắn văn bản tới /chat → phản hồi bằng GPT-4o hoặc GPT-5.
🔊 Phát giọng nói	TTS (Text-to-Speech) dùng Web Speech API – không tốn API key.
🔄 Đổi giọng Nam/Nữ	Bấm nút “Đổi giọng” → chuyển giọng và lưu vào localStorage.
💾 Nhớ giọng	Lần sau mở lại trang vẫn giữ giọng đã chọn trước đó.
🎤 Ghi âm	Ghi âm từ micro và gửi tới /whisper (mô phỏng, không dùng API thật).
⌨️ Enter để gửi	Nhấn Enter trong ô chat để gửi nhanh.
🤖 Chào lại	Khi tải lại trang, ThamAI tự giới thiệu theo giọng đã lưu.
🧠 4. Cách sử dụng trên trình duyệt

Mở trang frontend (Vercel hoặc local)

Trình duyệt sẽ hỏi quyền truy cập micro → chọn Allow / Cho phép

Khi trang khởi động, ThamAI sẽ nói chào:

“Xin chào, tôi là ThamAI giọng nữ (hoặc nam) đã sẵn sàng!”

Gõ câu hỏi vào ô chat → Enter hoặc bấm Gửi

ThamAI trả lời bằng giọng nói đã chọn

Bấm Đổi giọng để chuyển sang giọng khác

Bấm Ghi âm để nói thử → ThamAI nhận diện và hiển thị lại câu nói

🧰 5. Kiểm tra và gỡ lỗi
✅ Kiểm tra kết nối backend

Mở Console (F12 → tab Console)

Nếu thấy dòng:

✅ Kết nối backend ThamAI thành công!


→ backend hoạt động bình thường.

Nếu hiện lỗi như:

SyntaxError: Unexpected token '<'


→ Thường là do URL /chat bị sai hoặc backend chưa deploy xong.

✅ Kiểm tra micro

Nếu không ghi âm được:

Vào Chrome → Settings → Privacy → Site settings → Microphone

Kiểm tra xem trang của anh (Vercel) có đang bị chặn hay không

Reload lại trang và cho phép micro.

✅ Kiểm tra phát giọng

Nếu ThamAI không nói:

Kiểm tra trong tab Console xem có dòng cảnh báo “no voices found”.

Sau đó reload lại trang → trình duyệt sẽ tự nạp lại các giọng nói.

Một số trình duyệt cần reload 1–2 lần lần đầu tiên.

💾 6. Cách commit lên GitHub

Nếu anh đang trong thư mục frontend C:\Users\Administrator\Documents\ThachAIFrontend_fresh, chạy lệnh:

git add .
git commit -m "Cập nhật script.js và hướng dẫn README_frontend"
git push


Sau khi push xong, Vercel sẽ tự redeploy trang web mới.

🧪 7. Cách test hoàn chỉnh

Mở trang ThamAI trên Vercel

Đợi bot chào và phát giọng

Thử nhập:

“Hôm nay bạn thế nào?”

Sau khi nghe phản hồi, bấm “Đổi giọng”

Reload lại trang → giọng phải giữ nguyên như trước

Thử “Ghi âm” nói: “Xin chào ThamAI”

Bot hiển thị câu nói mô phỏng và sẵn sàng phản hồi.

💬 8. Gợi ý mở rộng trong tương lai

✅ Thêm giọng thật bằng API /speak (gTTS hoặc OpenAI TTS)

✅ Thêm biểu cảm avatar (cười, gật đầu, nháy mắt) theo cảm xúc

✅ Cho phép chọn giọng qua menu thả xuống

✅ Tự động phát nhạc nền nhẹ khi nói chuyện

✅ Lưu lịch sử hội thoại (localStorage hoặc database)