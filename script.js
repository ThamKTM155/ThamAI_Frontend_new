const API_BASE = "https://thamai-backend-new.onrender.com";
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const audioPlayer = document.getElementById("audio-player");

let mediaRecorder;
let audioChunks = [];
let lastBotReply = "";

// ----------------------
// Gửi tin nhắn Chat
// ----------------------
sendBtn.addEventListener("click", async () => {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    if (data.reply) {
      appendMessage("bot", data.reply);
      lastBotReply = data.reply;
    } else {
      appendMessage("bot", "❌ Lỗi phản hồi từ máy chủ.");
    }
  } catch (err) {
    appendMessage("bot", "⚠️ Không thể kết nối máy chủ backend.");
    console.error(err);
  }
});

// ----------------------
// Ghi âm → Whisper (Speech-to-Text)
// ----------------------
recordBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.textContent = "🎤 Ghi âm";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "record.wav");

      appendMessage("user", "🎙️ (Đang gửi file ghi âm...)");

      const res = await fetch(`${API_BASE}/whisper`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.text) {
        appendMessage("user", "🗣️ " + data.text);
        userInput.value = data.text;
      } else {
        appendMessage("bot", "❌ Không nhận dạng được giọng nói.");
      }
    };

    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Dừng";
  } catch (err) {
    alert("Không thể truy cập micro: " + err.message);
  }
});

// ----------------------
// TTS - Text → Giọng nói (Speech synthesis)
// ----------------------
speakBtn.addEventListener("click", async () => {
  if (!lastBotReply) {
    alert("Chưa có nội dung để ThamAI nói.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lastBotReply }),
    });

    if (!res.ok) {
      appendMessage("bot", "⚠️ Lỗi khi yêu cầu phát âm thanh.");
      return;
    }

    // ✅ Đọc dữ liệu dưới dạng blob để phát âm thanh
    const blob = await res.blob();

    // Kiểm tra loại MIME (đề phòng Render trả về HTML)
    if (blob.type !== "audio/mpeg") {
      const text = await blob.text();
      console.error("Phản hồi không hợp lệ:", text);
      appendMessage("bot", "⚠️ Máy chủ chưa trả về âm thanh hợp lệ.");
      return;
    }

    const audioUrl = URL.createObjectURL(blob);
    audioPlayer.src = audioUrl;
    audioPlayer.hidden = false;
    audioPlayer.play().catch(err => console.error("Lỗi khi phát âm thanh:", err));

  } catch (err) {
    alert("⚠️ Không thể phát âm thanh: " + err.message);
    console.error(err);
  }
});

// ----------------------
// Hiển thị hội thoại
// ----------------------
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
