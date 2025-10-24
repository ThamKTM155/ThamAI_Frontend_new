// ✅ ThamAI - script.js hoàn chỉnh (frontend)
const API_BASE = "https://thamai-backend-new.onrender.com"; // backend Render

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const audioPlayer = document.getElementById("audio-player");

let mediaRecorder = null;
let audioChunks = [];
let lastBotReply = "";

// 🧠 Kiểm tra kết nối backend
async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/`);
    const data = await res.json();
    if (data.message) {
      appendMessage("bot", "✅ Kết nối backend ThamAI thành công!");
    } else {
      appendMessage("bot", "⚠️ Backend phản hồi không đúng định dạng JSON.");
    }
  } catch (err) {
    appendMessage("bot", "❌ Không thể kết nối tới máy chủ backend.");
    console.error("Lỗi kết nối backend:", err);
  }
}
checkBackend();

// 💬 Gửi tin nhắn văn bản
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
      appendMessage("bot", "❌ Không nhận được phản hồi hợp lệ từ máy chủ.");
      console.error("Phản hồi không hợp lệ:", data);
    }
  } catch (err) {
    appendMessage("bot", "⚠️ Lỗi khi gửi yêu cầu tới backend.");
    console.error("Fetch chat lỗi:", err);
  }
});

// Nhấn Enter để gửi tin nhắn
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// 🎙️ Ghi âm và gửi tới Whisper (mô phỏng)
recordBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.textContent = "🎤 Ghi âm";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Lựa chọn mimeType phù hợp
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
      mimeType = "audio/webm;codecs=opus";
    else if (MediaRecorder.isTypeSupported("audio/webm"))
      mimeType = "audio/webm";
    else mimeType = "audio/wav";

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const formData = new FormData();
      formData.append("file", audioBlob, "record.webm");

      appendMessage("user", "🎙️ (Đang gửi file ghi âm...)");

      try {
        const res = await fetch(`${API_BASE}/whisper`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.text) {
          appendMessage("user", "🗣️ " + data.text);
          userInput.value = data.text;
        } else {
          appendMessage("bot", "❌ Không nhận được kết quả nhận dạng.");
        }
      } catch (err) {
        appendMessage("bot", "⚠️ Lỗi khi gửi file ghi âm.");
        console.error("Whisper lỗi:", err);
      }
    };

    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Dừng";
  } catch (err) {
    alert("Không thể truy cập micro: " + err.message);
    console.error("Micro error:", err);
  }
});

// 🔊 Phát lại giọng nói (Text-to-Speech)
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
      console.error("TTS HTTP error:", res.status);
      return;
    }

    const blob = await res.blob();
    if (!blob.type.startsWith("audio")) {
      const txt = await blob.text();
      console.error("Phản hồi TTS không hợp lệ:", txt);
      appendMessage("bot", "⚠️ Máy chủ chưa trả về âm thanh hợp lệ.");
      return;
    }

    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.hidden = false;
    await audioPlayer.play();
  } catch (err) {
    appendMessage("bot", "⚠️ Không thể phát âm thanh.");
    console.error("TTS fetch failed:", err);
  }
});

// 🪶 Hàm thêm tin nhắn vào khung chat
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
