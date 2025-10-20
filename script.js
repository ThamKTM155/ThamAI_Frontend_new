// ==========================
// ThamAI - Frontend Script v7.0
// ==========================

const API_BASE = "https://thamai-backend-new.onrender.com";
const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const userInput = document.getElementById("user-input");

const voiceSelect = document.getElementById("voiceSelect");
const rateSelect = document.getElementById("rateSelect");
const emotionSelect = document.getElementById("emotionSelect");
const speakingIndicator = document.getElementById("speakingIndicator");

let mediaRecorder;
let audioChunks = [];
let isSpeaking = false;
let silenceTimer = null;

// ==========================
// 1️⃣ Thêm tin nhắn vào khung chat
// ==========================
function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add(sender === "user" ? "user-msg" : "ai-msg");
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================
// 2️⃣ Gửi tin nhắn văn bản
// ==========================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    const reply = data.reply || "Xin lỗi, tôi chưa hiểu câu hỏi của anh.";

    // AI phản hồi
    addMessage("ai", reply);

    // Tự phát giọng có cảm xúc
    const autoEmotion = detectEmotion(reply);
    speakText(reply, autoEmotion);

  } catch (error) {
    addMessage("ai", "⚠️ Không nhận được phản hồi từ máy chủ.");
    console.error(error);
  }
}

// ==========================
// 3️⃣ Ghi âm giọng nói
// ==========================
recordBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.textContent = "🎤 Ghi âm";
    return;
  }

  // Nếu đang nói thì tắt giọng nói
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    speakingIndicator.style.display = "none";
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = sendAudioToBackend;

    mediaRecorder.start();
    recordBtn.textContent = "⏹ Dừng";
    addMessage("ai", "🎧 Đang nghe...");
  } catch (err) {
    addMessage("ai", "Không thể truy cập micro!");
  }
});

// ==========================
// 4️⃣ Gửi âm thanh đến backend (Whisper)
// ==========================
async function sendAudioToBackend() {
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  const formData = new FormData();
  formData.append("audio", audioBlob, "voice.webm");

  addMessage("ai", "⏳ Đang xử lý âm thanh...");

  try {
    const res = await fetch(`${API_BASE}/speech-to-text`, { method: "POST", body: formData });
    const data = await res.json();

    if (data.text) {
      addMessage("user", data.text);

      const chatRes = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: data.text }),
      });

      const chatData = await chatRes.json();
      const reply = chatData.reply || "Xin lỗi, tôi chưa hiểu câu nói của anh.";
      addMessage("ai", reply);

      const autoEmotion = detectEmotion(reply);
      speakText(reply, autoEmotion);
    } else {
      addMessage("ai", "⚠️ Không thể nhận diện giọng nói.");
    }
  } catch (err) {
    addMessage("ai", "⚠️ Lỗi khi gửi âm thanh.");
  } finally {
    recordBtn.textContent = "🎤 Ghi âm";
  }
}

// ==========================
// 5️⃣ Hàm phát giọng nói (TTS) có cảm xúc
// ==========================
function speakText(text, autoEmotion = null) {
  const synth = window.speechSynthesis;
  if (!synth) {
    addMessage("ai", "⚠️ Trình duyệt không hỗ trợ giọng nói!");
    return;
  }

  const voices = synth.getVoices();
  const selectedVoice = voices.find(v => v.name === voiceSelect.value) || voices[0];
  const selectedEmotion = autoEmotion || emotionSelect.value;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = selectedVoice;
  utterance.lang = "vi-VN";

  // Áp dụng cảm xúc tự động
  switch (selectedEmotion) {
    case "vui":
      utterance.rate = parseFloat(rateSelect.value) + 0.3;
      utterance.pitch = 1.3;
      break;
    case "nhẹ":
      utterance.rate = parseFloat(rateSelect.value) - 0.1;
      utterance.pitch = 1.1;
      break;
    case "nghiem":
      utterance.rate = parseFloat(rateSelect.value) - 0.2;
      utterance.pitch = 0.9;
      break;
    default:
      utterance.rate = parseFloat(rateSelect.value);
      utterance.pitch = 1.0;
  }

  speakingIndicator.style.display = "block";
  isSpeaking = true;

  utterance.onend = () => {
    isSpeaking = false;
    speakingIndicator.style.display = "none";

    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (!isSpeaking && (!mediaRecorder || mediaRecorder.state !== "recording")) {
        const reminder = "Anh còn muốn hỏi thêm gì không?";
        addMessage("ai", reminder);
        speakText(reminder, "nhẹ");
      }
    }, 5000);
  };

  synth.speak(utterance);
}

// ==========================
// 6️⃣ Tự phát hiện cảm xúc từ nội dung
// ==========================
function detectEmotion(text) {
  const vui = ["vui", "thích", "tốt", "hay quá", "tuyệt", "haha", "cười"];
  const nghiem = ["chú ý", "quan trọng", "cảnh báo", "nghiêm túc", "lỗi"];
  const lower = text.toLowerCase();

  if (vui.some(w => lower.includes(w))) return "vui";
  if (nghiem.some(w => lower.includes(w))) return "nghiem";
  return "nhẹ";
}

// ==========================
// 7️⃣ Cập nhật danh sách giọng nói
// ==========================
function populateVoiceList() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();

  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    if (v.lang.startsWith("vi") || v.name.toLowerCase().includes("vietnam")) {
      const option = document.createElement("option");
      option.value = v.name;
      option.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(option);
    }
  });
}

if (typeof speechSynthesis !== "undefined") {
  populateVoiceList();
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

// ==========================
// 8️⃣ Gửi khi nhấn Enter
// ==========================
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

sendBtn.addEventListener("click", sendMessage);
