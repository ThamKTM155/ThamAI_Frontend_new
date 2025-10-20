// ==================== CẤU HÌNH CƠ BẢN ====================
const BACKEND_URL = "https://thamai-backend-new.onrender.com";

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");

let isRecording = false;
let mediaRecorder;
let audioChunks = [];

// ==================== HÀM HIỂN THỊ TIN NHẮN ====================
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==================== GỬI VĂN BẢN TỚI BACKEND ====================
async function sendTextToBackend(text) {
  appendMessage("user", text);

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    if (data && data.reply) {
      appendMessage("ai", data.reply);
      speakText(data.reply); // GỌI TTS NGAY KHI AI TRẢ LỜI
    } else {
      appendMessage("ai", "⚠️ Không nhận được phản hồi từ máy chủ.");
    }
  } catch (err) {
    console.error(err);
    appendMessage("ai", "⚠️ Lỗi kết nối với backend.");
  }
}

// ==================== XỬ LÝ NÚT GỬI VĂN BẢN ====================
sendBtn.addEventListener("click", () => {
  const text = userInput.value.trim();
  if (text) {
    sendTextToBackend(text);
    userInput.value = "";
  }
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

// ==================== GHI ÂM & GỬI ÂM THANH TỚI BACKEND (WHISPER) ====================
recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    // Bắt đầu ghi âm
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;
      recordBtn.textContent = "⏹️ Dừng";
      appendMessage("ai", "🎙️ Đang nghe...");
    } catch (err) {
      console.error("Không thể ghi âm:", err);
      appendMessage("ai", "❌ Trình duyệt không cho phép ghi âm.");
    }
  } else {
    // Dừng ghi âm
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = "🎙️ Ghi âm";
    appendMessage("ai", "⏳ Đang xử lý âm thanh...");
  }
});

// ==================== GỬI ÂM THANH LÊN BACKEND (Whisper miễn phí HuggingFace) ====================
async function sendAudioToBackend(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "speech.webm");

  try {
    const res = await fetch(`${BACKEND_URL}/speech-to-text`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data && data.text) {
      appendMessage("user", `🗣️ ${data.text}`);
      sendTextToBackend(data.text);
    } else {
      appendMessage("ai", "⚠️ Không thể nhận diện giọng nói.");
    }
  } catch (err) {
    console.error("Lỗi gửi audio:", err);
    appendMessage("ai", "⚠️ Lỗi khi gửi âm thanh lên server.");
  }
}

// ==================== PHÁT ÂM THANH (TTS – TEXT TO SPEECH) ====================
function speakText(text) {
  if (!window.speechSynthesis) {
    console.warn("Trình duyệt không hỗ trợ TTS.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
}
