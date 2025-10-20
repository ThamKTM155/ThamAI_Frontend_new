const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");

const BACKEND_URL = "https://thamai-backend-new.onrender.com/chat";

// Thêm tin nhắn vào khung chat
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Gửi tin nhắn tới backend
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text }),
});
    const data = await response.json();
    appendMessage("bot", data.reply || "Lỗi: Không có phản hồi");
    lastBotMessage = data.reply;
  } catch (error) {
    appendMessage("bot", "❌ Không thể kết nối với máy chủ.");
  }
}

// Khi nhấn Enter
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
sendBtn.addEventListener("click", sendMessage);

// 🎤 Nhận giọng nói
micBtn.addEventListener("click", () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "vi-VN";
  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    userInput.value = text;
    sendMessage();
  };

  recognition.onerror = () => {
    appendMessage("bot", "Không nhận diện được giọng nói, thử lại nhé!");
  };
});

// 🔊 Đọc lại phản hồi
let lastBotMessage = "";
speakBtn.addEventListener("click", () => {
  if (!lastBotMessage) return;
  const utterance = new SpeechSynthesisUtterance(lastBotMessage);
  utterance.lang = "vi-VN";
  speechSynthesis.speak(utterance);
});
