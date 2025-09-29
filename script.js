```javascript
// ==========================
// CẤU HÌNH CÁC BIẾN TOÀN CỤC
// ==========================
const API_BASE = "http://localhost:5000"; // backend Flask
const chatBox = document.getElementById("chatBox");
const inputField = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const voiceButton = document.getElementById("voiceBtn");
const muteButton = document.getElementById("muteBtn");
const voiceSelect = document.getElementById("voiceSelect");

let isMuted = false;
let recognition;
let synth = window.speechSynthesis;

// ==========================
// HÀM HIỂN THỊ TIN NHẮN
// ==========================
function appendMessage(role, content, timestamp = null) {
  const msgDiv = document.createElement("div");
  msgDiv.className = role === "user" ? "user-message" : "bot-message";
  msgDiv.textContent = timestamp
    ? `[${timestamp}] ${role}: ${content}`
    : `${role}: ${content}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================
// GỬI TIN NHẮN USER → BACKEND
// ==========================
async function sendMessage() {
  const text = inputField.value.trim();
  if (!text) return;

  appendMessage("user", text);
  inputField.value = "";

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await response.json();
    const botReply = data.reply || "(Không có phản hồi)";
    appendMessage("bot", botReply);

    if (!isMuted) speak(botReply);
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error);
    appendMessage("bot", "⚠️ Lỗi kết nối backend!");
  }
}

// ==========================
// VOICE OUTPUT (Text-to-Speech)
// ==========================
function speak(text) {
  if (!synth) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = voiceSelect.value;

  const voices = synth.getVoices();
  const voice = voices.find(v => v.name === selectedVoice);
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
}

// ==========================
// VOICE INPUT (Speech-to-Text)
// ==========================
function initRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt không hỗ trợ SpeechRecognition!");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = event => {
    const transcript = event.results[0][0].transcript;
    inputField.value = transcript;
    sendMessage();
  };

  recognition.onerror = event => {
    console.error("Lỗi voice input:", event.error);
  };
}

// ==========================
// LẤY DANH SÁCH GIỌNG ĐỌC
// ==========================
function loadVoices() {
  const voices = synth.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    const option = document.createElement("option");
    option.value = v.name;
    option.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(option);
  });
}
window.speechSynthesis.onvoiceschanged = loadVoices;

// ==========================
// XEM LỊCH SỬ LOGS (GET /logs)
// ==========================
async function fetchLogs() {
  try {
    const response = await fetch(`${API_BASE}/logs`);
    const logs = await response.json();
    chatBox.innerHTML = "";
    logs.forEach(msg => {
      appendMessage(msg.role, msg.content, msg.timestamp);
    });
  } catch (error) {
    console.error("Không lấy được logs:", error);
    appendMessage("bot", "⚠️ Không tải được lịch sử chat!");
  }
}

// ==========================
// GÁN SỰ KIỆN CHO NÚT
// ==========================
sendButton.addEventListener("click", sendMessage);
inputField.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

voiceButton.addEventListener("click", () => {
  if (!recognition) initRecognition();
  recognition.start();
});

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? "🔇 Bật tiếng" : "🔊 Tắt tiếng";
});

document.getElementById("showLogs").addEventListener("click", fetchLogs);

// ==========================
// KHỞI TẠO
// ==========================
loadVoices();
initRecognition();
```
