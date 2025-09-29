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
let recognition;

// ==========================
// Thêm tin nhắn vào khung chat
// ==========================
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  const avatar = document.createElement("img");
  avatar.classList.add("avatar", sender);
  avatar.src = sender === "user"
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
// Gửi tin nhắn
// ==========================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message: text})
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
// Voice Input
// ==========================
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt không hỗ trợ SpeechRecognition");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    userInput.value = text;
    sendMessage();
  };

  recognition.onerror = (event) => console.error("SpeechRecognition error:", event.error);
}

voiceBtn.addEventListener("click", () => {
  if (!recognition) initSpeechRecognition();
  recognition.start();
});

// ==========================
// Voice Output (speakText fallback)
// ==========================
function speakText(text) {
  if (!window.speechSynthesis) {
    console.warn("Trình duyệt không hỗ trợ speechSynthesis.");
    return;
  }

  const voices = speechSynthesis.getVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";

  if (voiceSelect.value === "female") {
    utterance.voice = voices.find(v => v.lang === "vi-VN" && v.name.toLowerCase().includes("female")) || null;
  } else if (voiceSelect.value === "male") {
    utterance.voice = voices.find(v => v.lang === "vi-VN" && v.name.toLowerCase().includes("male")) || null;
  }

  // Fallback: nếu chưa có voice nào thì vẫn đọc bằng mặc định
  if (!utterance.voice && voices.length > 0) {
    utterance.voice = voices.find(v => v.lang === "vi-VN") || voices[0];
  }

  speechSynthesis.speak(utterance);
}

toggleTtsBtn.addEventListener("click", () => {
  ttsEnabled = !ttsEnabled;
  toggleTtsBtn.textContent = ttsEnabled ? "🔊 Tắt tiếng" : "🔈 Bật tiếng";
});

// ==========================
// Fetch Logs
// ==========================
async function fetchLogs() {
  try {
    const res = await fetch(`${API_URL}/logs`);
    const data = await res.json();

    addMessage("bot", "📜 Lịch sử hội thoại:");
    data.forEach(entry => {
      addMessage("user", entry.user);
      addMessage("bot", entry.bot);
    });
  } catch (err) {
    addMessage("bot", "❌ Lỗi tải lịch sử.");
    console.error(err);
  }
}

// ==========================
// Clear Logs
// ==========================
async function clearLogs() {
  try {
    const res = await fetch(`${API_URL}/logs/clear`, {method: "DELETE"});
    const data = await res.json();
    addMessage("bot", data.message || "🗑️ Lịch sử đã được xóa.");
  } catch (err) {
    addMessage("bot", "❌ Lỗi khi xóa lịch sử.");
    console.error(err);
  }
}

// ==========================
// Event Listeners
// ==========================
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
viewLogsBtn.addEventListener("click", fetchLogs);
clearLogsBtn.addEventListener("click", clearLogs);

// Load voices khi sẵn sàng
speechSynthesis.onvoiceschanged = () => {};
