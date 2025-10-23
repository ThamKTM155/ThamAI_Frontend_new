const API_BASE = "https://thamai-backend-new.onrender.com";
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const audioPlayer = document.getElementById("audio-player");

let mediaRecorder;
let audioChunks = [];

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
// Ghi âm → Whisper
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
// TTS - Text → Giọng nói
// ----------------------
let lastBotReply = "";

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

    if (!res.ok) throw new Error("Lỗi phát âm thanh");

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;
    audioPlayer.hidden = false;
    audioPlayer.play();
  } catch (err) {
    alert("⚠️ Không thể phát âm thanh: " + err.message);
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
