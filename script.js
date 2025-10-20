// =================== CẤU HÌNH CƠ BẢN ===================
const backendURL = "https://thamai-backend-new.onrender.com"; // URL backend Flask của anh
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const voiceSelect = document.getElementById("voice-select");
const speedSelect = document.getElementById("speed-select");
const emotionSelect = document.getElementById("emotion-select");
const speakingStatus = document.getElementById("speaking-status");

let isSpeaking = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let autoAskTimeout = null;

// =================== HIỂN THỊ TIN NHẮN ===================
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// =================== GỬI TIN NHẮN VĂN BẢN ===================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  addMessage("ai", "⏳ Đang trả lời...");

  try {
    const res = await fetch(`${backendURL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    const reply = data.reply || "Xin lỗi, tôi chưa hiểu ý anh.";
    addMessage("ai", reply);
    speak(reply);
  } catch (err) {
    console.error("Lỗi chat:", err);
    addMessage("ai", "⚠️ Lỗi khi gửi yêu cầu tới server.");
  }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// =================== PHÁT GIỌNG NÓI (TTS) ===================
function speak(text) {
  if (!window.speechSynthesis) {
    addMessage("ai", "⚠️ Trình duyệt không hỗ trợ phát giọng nói.");
    return;
  }

  window.speechSynthesis.cancel(); // đảm bảo không bị đè giọng
  const utterance = new SpeechSynthesisUtterance(text);

  // Giọng
  const voices = window.speechSynthesis.getVoices();
  if (voiceSelect.value === "male") {
    utterance.voice = voices.find(v => v.name.toLowerCase().includes("male")) || voices[0];
  } else if (voiceSelect.value === "female") {
    utterance.voice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
  }

  // Tốc độ
  utterance.rate = speedSelect.value === "slow" ? 0.9 :
                   speedSelect.value === "fast" ? 1.3 : 1.0;

  // Cảm xúc (tự động hoặc thủ công)
  const emotion = emotionSelect.value;
  if (emotion === "auto") {
    if (text.includes("!")) {
      utterance.pitch = 1.3; utterance.rate += 0.2;
    } else if (text.includes("?")) {
      utterance.pitch = 1.1;
    } else {
      utterance.pitch = 1.0;
    }
  } else if (emotion === "happy") {
    utterance.pitch = 1.3; utterance.rate += 0.2;
  } else if (emotion === "calm") {
    utterance.pitch = 0.9; utterance.rate -= 0.1;
  } else if (emotion === "serious") {
    utterance.pitch = 0.8; utterance.rate = 0.9;
  }

  // Sự kiện hiển thị
  utterance.onstart = () => {
    isSpeaking = true;
    speakingStatus.innerHTML = "🔊 Đang nói...";
  };
  utterance.onend = () => {
    isSpeaking = false;
    speakingStatus.innerHTML = "";
    clearTimeout(autoAskTimeout);
    autoAskTimeout = setTimeout(() => {
      if (!isRecording) speak("Anh còn muốn hỏi thêm gì không?");
    }, 6000);
  };

  window.speechSynthesis.speak(utterance);
}

// =================== GHI ÂM VÀ GỬI LÊN BACKEND ===================
recordBtn.addEventListener("click", async () => {
  if (isRecording) {
    // Dừng ghi
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstart = () => {
      isRecording = true;
      recordBtn.textContent = "⏹️ Dừng";
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      addMessage("ai", "🎧 Đang ghi âm...");
    };

    mediaRecorder.onstop = async () => {
      isRecording = false;
      recordBtn.textContent = "🎤 Ghi âm";
      addMessage("ai", "⏳ Đang xử lý âm thanh...");

      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");

      try {
        const resp = await fetch(`${backendURL}/speech-to-text`, {
          method: "POST",
          body: fd,
        });

        if (!resp.ok) {
          const txt = await resp.text();
          console.error("speech-to-text server error:", resp.status, txt);
          addMessage("ai", `⚠️ Lỗi server STT: ${resp.status}`);
          return;
        }

        const data = await resp.json();
        const recognized = data.text ?? data.transcript ?? "";
        if (!recognized) {
          addMessage("ai", "⚠️ Không nhận diện được giọng nói.");
          return;
        }

        addMessage("user", recognized);

        const chatRes = await fetch(`${backendURL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: recognized }),
        });
        const chatData = await chatRes.json();
        const reply = chatData.reply || "Xin lỗi, tôi chưa hiểu.";
        addMessage("ai", reply);
        speak(reply);
      } catch (err) {
        console.error("Lỗi gửi audio:", err);
        addMessage("ai", "⚠️ Lỗi khi gửi âm thanh lên server.");
      }
    };

    mediaRecorder.start();
  } catch (err) {
    console.error("Không thể mở micro:", err);
    addMessage("ai", "❌ Không thể truy cập micro. Vui lòng kiểm tra quyền micro.");
  }
});

// =================== KHỞI TẠO ===================
window.speechSynthesis.onvoiceschanged = () => {
  console.log("Đã tải danh sách giọng:", window.speechSynthesis.getVoices());
};

addMessage("ai", "🤖 Xin chào! Tôi là ThamAI – Trợ lý ảo của anh Thắm.");
