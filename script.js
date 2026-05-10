/* ================================================
   🎤 ThamAI Ultra+ v2.1 – LipSync RealTime
   ================================================ */

const textInput = document.getElementById("text-input");
const sendBtn = document.getElementById("send-btn");
const chatLog = document.getElementById("chat-log");
const micBtn = document.getElementById("mic-btn");
const switchVoiceBtn = document.getElementById("switch-voice");

const avatar = document.getElementById("avatar");
const mouth = document.getElementById("mouth");
const wave = document.getElementById("wave");
const bars = wave.querySelectorAll(".bar");

let currentVoice = "female"; // Giọng mặc định
let isSpeaking = false;
let recognition;
let analyser, micStream, audioContext;
let mouthTimer;

/* ======================================================
   💬 GỬI TIN NHẮN (USER -> SYSTEM)
====================================================== */
sendBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  textInput.value = "";
fetch("https://thamai-backend-new.onrender.com/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: text
  })
})
.then(res => res.json())
.then(data => {
  const reply = data.reply || "Không có phản hồi từ AI";
  addMessage(reply, "system");
  speakText(reply);
})
.catch(err => {
  console.error(err);
  addMessage("Lỗi kết nối tới AI backend", "system");
});
   });
/* ======================================================
   🎙️ NHẬN DẠNG GIỌNG NÓI (SpeechRecognition)
====================================================== */
micBtn.addEventListener("click", () => {
  if (recognition && recognition.recognizing) {
    recognition.stop();
    micBtn.innerText = "🎤 Nói";
    return;
  }
  startListening();
});

function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt của bạn không hỗ trợ Speech Recognition");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.interimResults = false;

  recognition.onstart = () => {
    micBtn.innerText = "🛑 Dừng";
  };

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    addMessage(text, "user");

fetch("https://thamai-backend-new.onrender.com/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: text
  })
})
.then(res => res.json())
.then(data => {
  const reply = data.reply || "Không có phản hồi từ AI";
  addMessage(reply, "system");
  speakText(reply);
})
.catch(err => {
  console.error(err);
  addMessage("Lỗi kết nối tới AI backend", "system");
});
  };

  recognition.onend = () => {
    micBtn.innerText = "🎤 Nói";
  };

  recognition.start();
}

/* ======================================================
   🗣️ PHÁT ÂM (TTS) + PHÂN TÍCH ÂM THANH (LIPSYNC)
====================================================== */
function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Trình duyệt không hỗ trợ SpeechSynthesis.");
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.rate = 1.0;
  utter.pitch = currentVoice === "female" ? 1.2 : 0.9;

  const voices = window.speechSynthesis.getVoices();
  const vnVoices = voices.filter(v => v.lang === "vi-VN");
  if (vnVoices.length > 0) utter.voice = vnVoices[currentVoice === "female" ? 0 : 1];

  utter.onstart = () => {
    isSpeaking = true;
    startLipSync();
    setEmotion("happy");
  };
  utter.onend = () => {
    isSpeaking = false;
    stopLipSync();
    setEmotion("neutral");
  };

  window.speechSynthesis.speak(utter);
}

/* ======================================================
   🔊 PHÂN TÍCH ÂM THANH (LIP SYNC + WAVE)
====================================================== */
function startLipSync() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const synthStream = audioContext.createMediaStreamDestination();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  // Do trình duyệt không cho lấy luồng synth TTS trực tiếp, ta giả lập sóng động
  mouth.classList.add("speaking");
  clearInterval(mouthTimer);
  mouthTimer = setInterval(() => {
    if (!isSpeaking) return;
    const rand = Math.random();
    mouth.style.transform = `translateX(-50%) scaleY(${1 + rand * 1.2})`;
    mouth.style.boxShadow = `0 0 ${15 + rand * 20}px rgba(255,150,150,0.8)`;
    bars.forEach((bar, i) => {
      bar.style.height = `${5 + Math.random() * 25}px`;
    });
  }, 120);
}

function stopLipSync() {
  mouth.classList.remove("speaking");
  clearInterval(mouthTimer);
  bars.forEach(bar => (bar.style.height = "10px"));
}

/* ======================================================
   💫 CẢM XÚC (Emotion State)
====================================================== */
function setEmotion(state) {
  avatar.classList.remove("happy", "sad", "surprised");
  if (state === "happy") avatar.classList.add("happy");
  else if (state === "sad") avatar.classList.add("sad");
  else if (state === "surprised") avatar.classList.add("surprised");
}

/* ======================================================
   🔄 ĐỔI GIỌNG NÓI
====================================================== */
switchVoiceBtn.addEventListener("click", () => {
  currentVoice = currentVoice === "female" ? "male" : "female";
  switchVoiceBtn.innerText = `Đổi giọng: ${currentVoice === "female" ? "👩" : "👨"}`;
});

/* ======================================================
   💌 HÀM PHỤ TRỢ
====================================================== */
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  msg.textContent = text;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function fakeResponse(input) {
  input = input.toLowerCase();
  if (input.includes("chào")) return "Xin chào, tôi là ThamAI, rất vui được gặp anh!";
  if (input.includes("buồn")) {
    setEmotion("sad");
    return "Đừng buồn nữa, anh nhé, em luôn ở đây cùng anh.";
  }
  if (input.includes("vui")) {
    setEmotion("happy");
    return "Tuyệt quá, em cũng thấy vui cùng anh!";
  }
  if (input.includes("ngạc nhiên")) {
    setEmotion("surprised");
    return "Ồ! Thật đáng ngạc nhiên đó anh ạ!";
  }
  return "Em đang nghe anh nói đây, anh muốn em làm gì tiếp nào?";
}
