const backendURL = "https://thamai-backend-new.onrender.com"; // ✅ backend Render

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const settingsBtn = document.getElementById("btnSettings");

// Hàm hiển thị tin nhắn
function appendMessage(text, sender) {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Gửi tin nhắn văn bản
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  appendMessage(text, "user");
  userInput.value = "";

  fetch(`${backendURL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  })
    .then((res) => res.json())
    .then((data) => {
      appendMessage(data.reply || "(Không có phản hồi)", "bot");
      speakText(data.reply || "");
    })
    .catch(() => appendMessage("⚠️ Lỗi kết nối backend!", "bot"));
}

// Nút quay lại Cài đặt
settingsBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// Ghi âm và gửi giọng nói
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    appendMessage("🎤 " + transcript, "user");
    userInput.value = transcript;
    sendMessage();
  };
}

voiceBtn.addEventListener("click", () => {
  if (recognition) recognition.start();
  else alert("Trình duyệt không hỗ trợ giọng nói!");
});

// Phát giọng TTS của ThamAI
function speakText(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.rate = 1;
  utter.pitch = 1.1;
  speechSynthesis.speak(utter);
}
