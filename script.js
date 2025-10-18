// ==========================
// Cấu hình API backend
// ==========================
const API_URL = "https://thamai-backend-new.onrender.com";

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const viewLogsBtn = document.getElementById("view-logs");
const clearLogsBtn = document.getElementById("clear-logs");
const toggleTtsBtn = document.getElementById("toggle-tts");
const voiceSelect = document.getElementById("voice-select");

let ttsEnabled = true;
let recognition; // Web Speech API recognition

// ==========================
// Hàm thêm tin nhắn vào khung chat
// ==========================
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  const avatar = document.createElement("img");
  avatar.classList.add("avatar", sender);
  avatar.src =
    sender === "user"
      ? "https://cdn-icons-png.flaticon.com/512/1946/1946429.png"
      : "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  if (sender === "user") {
    msg.appendChild(bubble);
    msg.appendChild(avatar);
  } else {
    msg.appendChild(avatar);
    msg.appendChild(bubble);
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================
// Gửi tin nhắn văn bản tới backend
// ==========================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    const reply = data.reply || "[Lỗi: không có phản hồi]";
    addMessage("bot", reply);

    if (ttsEnabled) speakText(reply);
  } catch (err) {
    addMessage("bot", "❌ Lỗi kết nối backend.");
    console.error(err);
  }
}

// ==========================
// 🎙️ Voice Input (MediaRecorder -> backend Whisper)
// ==========================
(() => {
  const recordBtn = document.getElementById("btn-record");
  const stopBtn = document.getElementById("btn-stop");
  const statusSpan = document.getElementById("record-status");
  const resultDiv = document.getElementById("stt-result");

  const BACKEND_SPEECH_TO_TEXT = `${API_URL}/speech-to-text`;

  let mediaRecorder = null;
  let audioChunks = [];

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size) audioChunks.push(e.data);
      });

      mediaRecorder.addEventListener("start", () => {
        statusSpan.textContent = "🎧 Đang ghi âm...";
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      });

      mediaRecorder.addEventListener("stop", async () => {
        statusSpan.textContent = "🌀 Đang xử lý âm thanh...";
        recordBtn.disabled = false;
        stopBtn.disabled = true;

        const blob = new Blob(audioChunks, {
          type: audioChunks[0]?.type || "audio/webm",
        });
        await sendAudioToBackend(blob);
      });

      mediaRecorder.start();
    } catch (err) {
      console.error("Không thể truy cập micro:", err);
      statusSpan.textContent = "⚠️ Lỗi: không thể truy cập micro.";
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
  }

  async function sendAudioToBackend(blob) {
    try {
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");

      statusSpan.textContent = "🚀 Đang gửi âm thanh tới server...";

      const resp = await fetch(BACKEND_SPEECH_TO_TEXT, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Server trả lỗi:", resp.status, txt);
        statusSpan.textContent = `Lỗi server: ${resp.status}`;
        return;
      }

      const data = await resp.json();
      const recognized = data.text ?? data.transcript ?? "";
      resultDiv.textContent = recognized || "[Không nhận diện được giọng nói]";
      statusSpan.textContent = "✅ Hoàn tất nhận diện.";

      // Sau khi nhận được text -> tự động gửi như tin nhắn chat
      if (recognized) {
        userInput.value = recognized;
        sendMessage();
      }
    } catch (err) {
      console.error("Lỗi gửi audio:", err);
      statusSpan.textContent = "❌ Lỗi khi gửi âm thanh.";
    }
  }

  recordBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
})();

// ==========================
// 🗣️ Voice Input dự phòng (Web Speech API – trình duyệt)
// ==========================
function initSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt không hỗ trợ SpeechRecognition.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    userInput.value = text;
    sendMessage();
  };

  recognition.onerror = (event) =>
    console.error("SpeechRecognition error:", event.error);
}

voiceBtn.addEventListener("click", () => {
  if (!recognition) initSpeechRecognition();
  recognition.start();
});

// ==========================
// 🔊 Voice Output (Text-to-Speech)
// ==========================
function speakText(text) {
  if (!window.speechSynthesis) {
    console.warn("Trình duyệt không hỗ trợ speechSynthesis.");
    return;
  }

  const voices = speechSynthesis.getVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";

  // Chọn giọng
  if (voiceSelect.value === "female") {
    utterance.voice =
      voices.find(
        (v) => v.lang === "vi-VN" && v.name.toLowerCase().includes("female")
      ) || null;
  } else if (voiceSelect.value === "male") {
    utterance.voice =
      voices.find(
        (v) => v.lang === "vi-VN" && v.name.toLowerCase().includes("male")
      ) || null;
  }

  // Fallback: nếu chưa có giọng phù hợp
  if (!utterance.voice && voices.length > 0) {
    utterance.voice = voices.find((v) => v.lang === "vi-VN") || voices[0];
  }

  speechSynthesis.speak(utterance);
}

toggleTtsBtn.addEventListener("click", () => {
  ttsEnabled = !ttsEnabled;
  toggleTtsBtn.textContent = ttsEnabled ? "🔊 Tắt tiếng" : "🔈 Bật tiếng";
});

// ==========================
// 📜 Xem / Xóa lịch sử chat
// ==========================
async function fetchLogs() {
  try {
    const res = await fetch(`${API_URL}/logs`);
    const data = await res.json();

    addMessage("bot", "📜 Lịch sử hội thoại:");
    data.forEach((entry) => {
      addMessage("user", entry.user);
      addMessage("bot", entry.bot);
    });
  } catch (err) {
    addMessage("bot", "❌ Lỗi tải lịch sử.");
    console.error(err);
  }
}

async function clearLogs() {
  try {
    const res = await fetch(`${API_URL}/logs/clear`, { method: "DELETE" });
    const data = await res.json();
    addMessage("bot", data.message || "🗑️ Lịch sử đã được xóa.");
  } catch (err) {
    addMessage("bot", "❌ Lỗi khi xóa lịch sử.");
    console.error(err);
  }
}

// ==========================
// ⚙️ Sự kiện giao diện
// ==========================
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
viewLogsBtn.addEventListener("click", fetchLogs);
clearLogsBtn.addEventListener("click", clearLogs);

// Load danh sách giọng nói khi sẵn sàng
speechSynthesis.onvoiceschanged = () => {};
