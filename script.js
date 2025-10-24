// =============================
// ⚙️ Cấu hình kết nối Backend
// =============================
const API_BASE = "https://thamai-backend-new.onrender.com";

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const audioPlayer = document.getElementById("audio-player");

let mediaRecorder = null;
let audioChunks = [];
let lastBotReply = "";

// ----------------------
// 🔄 Kiểm tra kết nối Backend
// ----------------------
async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/test`);
    const data = await res.json();
    if (data.status === "ok") {
      appendMessage("bot", data.message);
    } else {
      appendMessage("bot", "⚠️ Backend phản hồi không đúng định dạng.");
    }
  } catch (err) {
    appendMessage("bot", "❌ Không thể kết nối tới máy chủ backend.");
    console.error("Lỗi kết nối:", err);
  }
}
checkBackend();

// ----------------------
// 💬 Gửi tin nhắn Chat
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

// ✅ Gửi bằng Enter
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ----------------------
// 🎙️ Ghi âm → Whisper
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

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob, "record.webm");

      appendMessage("user", "🎙️ (Đang gửi file ghi âm...)");

      try {
        const res = await fetch(`${API_BASE}/whisper`, { method: "POST", body: formData });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Whisper HTTP error:", res.status, errText);
          appendMessage("bot", `⚠️ Whisper lỗi HTTP (${res.status}).`);
          return;
        }

        const data = await res.json();
        if (data.text) {
          appendMessage("user", "🗣️ " + data.text);
          userInput.value = data.text;
        } else {
          appendMessage("bot", "❌ Không nhận dạng được giọng nói.");
          console.error("Whisper error:", data);
        }
      } catch (err) {
        appendMessage("bot", "⚠️ Lỗi khi gửi file ghi âm.");
        console.error("Whisper fetch failed:", err);
      }
    };

    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Dừng ghi";
  } catch (err) {
    alert("Không thể truy cập micro: " + err.message);
    console.error(err);
  }
});

// ----------------------
// 🔊 Speak - Text to Speech
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
      const txt = await res.text();
      console.error("TTS HTTP error:", res.status, txt);
      appendMessage("bot", "⚠️ Lỗi khi yêu cầu phát âm thanh.");
      return;
    }

    const blob = await res.blob();
    if (!blob.type.startsWith("audio")) {
      const txt = await blob.text();
      console.error("TTS invalid response:", txt);
      appendMessage("bot", "⚠️ Máy chủ chưa trả về âm thanh hợp lệ.");
      return;
    }

    const audioUrl = URL.createObjectURL(blob);
    audioPlayer.src = audioUrl;
    audioPlayer.hidden = false;
    await audioPlayer.play();

  } catch (err) {
    appendMessage("bot", "⚠️ Không thể phát âm thanh.");
    console.error(err);
  }
});

// ----------------------
// 💬 Hiển thị hội thoại
// ----------------------
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
