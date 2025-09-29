```javascript
// ===== ThamAI Frontend - script.js (voice input/output + mic toggle) =====

// Chọn phần tử
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const micButton = document.getElementById("mic-button");
const statusEl = document.getElementById("status");

// API Backend (sửa theo URL Render của anh)
const API_URL = "https://thamai-backend-clean-1-h88m.onrender.com/chat";

// --- Hàm thêm tin nhắn vào chat-box ---
function addMessage(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${sender}`;

  const avatar = document.createElement("img");
  avatar.src = sender === "user" ? "user.png" : "bot.png";
  avatar.alt = sender;
  avatar.className = "avatar";

  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.textContent = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(message);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Gửi tin nhắn đến backend ---
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";
  statusEl.textContent = "⏳ Đang trả lời...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    const reply = data.reply || "❌ Không có phản hồi";
    addMessage("bot", reply);
    statusEl.textContent = "💬 Sẵn sàng";

    // Đọc to trả lời (voice output)
    speakText(reply);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "⚠️ Lỗi kết nối";
  }
}

// --- Voice Output (Text-to-Speech) ---
function speakText(text) {
  if ("speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "vi-VN";
    window.speechSynthesis.speak(utter);
  }
}

// --- Voice Input (Speech-to-Text) ---
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    statusEl.textContent = "🎤 Đang nghe...";
    micButton.classList.add("recording");
  };

  recognition.onend = () => {
    statusEl.textContent = "💬 Sẵn sàng";
    micButton.classList.remove("recording");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };
} else {
  statusEl.textContent = "⚠️ Trình duyệt không hỗ trợ voice input";
}

// --- Sự kiện ---
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

micButton.addEventListener("click", () => {
  if (!recognition) return;
  if (micButton.classList.contains("recording")) {
    recognition.stop();
  } else {
    recognition.start();
  }
});
```
