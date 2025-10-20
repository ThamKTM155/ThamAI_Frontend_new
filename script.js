// ==============================
// Cấu hình kết nối Backend
// ==============================
const BACKEND_URL = "https://thamai-backend-new.onrender.com";

// ==============================
// Các phần tử giao diện
// ==============================
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const voiceSelect = document.getElementById("voice-select");
const speedSelect = document.getElementById("speed-select");
const emotionSelect = document.getElementById("emotion-select");
const statusText = document.getElementById("status");
const speakerIcon = document.getElementById("speaker-icon");

let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let isSpeaking = false;
let silenceTimer;

// ==============================
// Thêm tin nhắn vào khung chat
// ==============================
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==============================
// Gửi tin nhắn text tới backend
// ==============================
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  addMessage("user", message);
  userInput.value = "";

  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  const reply = data.reply || "❌ Lỗi phản hồi.";
  addMessage("bot", reply);
  speakText(reply);
}

// ==============================
// Nhấn Enter để gửi
// ==============================
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});
sendBtn.addEventListener("click", sendMessage);

// ==============================
// Ghi âm bằng micro (STT Whisper)
// ==============================
recordBtn.addEventListener("click", async () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = sendAudioToBackend;
    mediaRecorder.start();

    isRecording = true;
    recordBtn.textContent = "⏹ Dừng";
    stopSpeaking(); // Tắt giọng nói khi bắt đầu ghi âm
    statusText.textContent = "🎙️ Đang ghi âm...";
  } catch (err) {
    alert("Không thể truy cập micro: " + err);
  }
}

function stopRecording() {
  mediaRecorder.stop();
  isRecording = false;
  recordBtn.textContent = "🎤 Ghi âm";
  statusText.textContent = "⏳ Đang xử lý...";
}

// ==============================
// Gửi audio lên backend /speech-to-text
// ==============================
async function sendAudioToBackend() {
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  try {
    const response = await fetch(`${BACKEND_URL}/speech-to-text`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.text) {
      addMessage("user", data.text);
      const chatResponse = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: data.text })
      });
      const chatData = await chatResponse.json();
      const reply = chatData.reply || "❌ Lỗi phản hồi.";
      addMessage("bot", reply);
      speakText(reply);
    } else {
      addMessage("bot", "❌ Không nhận diện được giọng nói.");
    }
  } catch (err) {
    console.error("Lỗi gửi audio:", err);
    addMessage("bot", "⚠️ Lỗi khi xử lý âm thanh.");
  } finally {
    statusText.textContent = "";
  }
}

// ==============================
// TTS – Phát giọng nói trả lời
// ==============================
function speakText(text) {
  if (!window.speechSynthesis) return alert("Trình duyệt không hỗ trợ TTS.");

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);

  // Giọng
  const selectedVoice = voiceSelect.value;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.name.includes(selectedVoice)) || voices[0];

  // Tốc độ
  const rateMap = { slow: 0.8, normal: 1, fast: 1.3 };
  utterance.rate = rateMap[speedSelect.value] || 1;

  // Cảm xúc
  const emotion = emotionSelect.value;
  if (emotion === "auto") {
    if (text.includes("!")) utterance.pitch = 1.3; // Vui
    else if (text.includes("?")) utterance.pitch = 1.1;
    else utterance.pitch = 0.9; // Nghiêm hoặc nhẹ
  } else if (emotion === "vui") utterance.pitch = 1.3;
  else if (emotion === "nghiêm") utterance.pitch = 0.9;
  else utterance.pitch = 1.1;

  utterance.onstart = () => {
    isSpeaking = true;
    speakerIcon.style.display = "inline-block";
    statusText.textContent = "🔊 Đang nói...";
    if (silenceTimer) clearTimeout(silenceTimer);
  };

  utterance.onend = () => {
    isSpeaking = false;
    speakerIcon.style.display = "none";
    statusText.textContent = "";

    // Sau khi nói xong, chờ vài giây rồi hỏi lại
    silenceTimer = setTimeout(() => {
      if (!isRecording && !isSpeaking) {
        const prompt = "Anh còn muốn hỏi thêm gì không?";
        addMessage("bot", prompt);
        speakText(prompt);
      }
    }, 6000);
  };

  speechSynthesis.speak(utterance);
}

// ==============================
// Dừng TTS đang nói
// ==============================
function stopSpeaking() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    speakerIcon.style.display = "none";
  }
}

// Khởi tạo danh sách giọng sau khi load
window.speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
};
