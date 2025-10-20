const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const recordBtn = document.getElementById("recordBtn");
const clearBtn = document.getElementById("clearBtn");
const statusArea = document.getElementById("statusArea");
const voiceSelect = document.getElementById("voiceSelect");
const speedSelect = document.getElementById("speedSelect");
const emotionSelect = document.getElementById("emotionSelect");

let recognition;
let isRecording = false;
let isSpeaking = false;

// ✅ Tải danh sách giọng nói
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}
window.speechSynthesis.onvoiceschanged = loadVoices;

// ✅ Hiển thị tin nhắn
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ Gửi tin nhắn văn bản
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";
  statusArea.textContent = "⏳ Đang xử lý...";

  try {
    const res = await fetch("https://thamai-backend-new.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    appendMessage("bot", data.reply);
    speakResponse(data.reply);
  } catch {
    appendMessage("bot", "⚠️ Lỗi kết nối máy chủ!");
  } finally {
    statusArea.textContent = "";
  }
}

// ✅ Nói phản hồi bằng TTS
function speakResponse(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const selectedVoice = voices[voiceSelect.value] || voices[0];
  utterance.voice = selectedVoice;
  utterance.rate = parseFloat(speedSelect.value);

  // Cảm xúc
  const emotion = emotionSelect.value;
  if (emotion === "auto") {
    if (text.includes("chào") || text.includes("vui")) utterance.rate += 0.1;
  } else if (emotion === "vui") utterance.rate += 0.15;
  else if (emotion === "nghiem") utterance.rate -= 0.1;
  else if (emotion === "nhe") utterance.rate -= 0.05;

  utterance.onstart = () => {
    isSpeaking = true;
    statusArea.textContent = "🔊 Đang nói...";
    statusArea.classList.add("speaking");
  };
  utterance.onend = () => {
    isSpeaking = false;
    statusArea.textContent = "";
    statusArea.classList.remove("speaking");
    setTimeout(() => {
      if (!isRecording) speakResponse("Anh còn muốn hỏi thêm gì không?");
    }, 5000);
  };

  speechSynthesis.speak(utterance);
}

// ✅ Ghi âm giọng nói (Whisper)
recordBtn.addEventListener("click", async () => {
  if (isSpeaking) {
    speechSynthesis.cancel();
    statusArea.textContent = "🛑 Đã tắt giọng nói để ghi âm.";
  }

  if (isRecording) {
    recognition.stop();
    isRecording = false;
    recordBtn.textContent = "🎤 Ghi âm";
    statusArea.textContent = "Đã dừng ghi âm.";
    return;
  }

  if (!("webkitSpeechRecognition" in window)) {
    alert("Trình duyệt không hỗ trợ ghi âm!");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    recordBtn.textContent = "⏹ Dừng";
    statusArea.textContent = "🎙️ Đang ghi âm...";
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };

  recognition.onerror = () => {
    statusArea.textContent = "⚠️ Lỗi ghi âm!";
  };

  recognition.onend = () => {
    isRecording = false;
    recordBtn.textContent = "🎤 Ghi âm";
  };

  recognition.start();
});

// ✅ Sự kiện gửi
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ✅ Xóa hội thoại
clearBtn.addEventListener("click", () => {
  chatBox.innerHTML = "";
});
