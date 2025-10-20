// === Cấu hình địa chỉ backend ===
const BACKEND_URL = "https://thamai-backend-new.onrender.com";

// === Các phần tử HTML ===
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// === Hiển thị tin nhắn trong khung chat ===
function appendMessage(sender, text) {
  const message = document.createElement("div");
  message.className = sender === "user" ? "message user" : "message ai";
  message.textContent = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// === Gửi tin nhắn văn bản ===
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (response.ok) {
      appendMessage("ai", data.reply);
    } else {
      appendMessage("ai", "⚠️ Lỗi phản hồi từ server: " + (data.error || "Không rõ"));
    }
  } catch (error) {
    appendMessage("ai", "⚠️ Không thể kết nối tới server.");
    console.error("Lỗi khi gửi chat:", error);
  }
}

// === Ghi âm giọng nói ===
recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;
      recordBtn.textContent = "🛑 Dừng ghi";
      appendMessage("ai", "🎤 Đang ghi âm, hãy nói gì đó...");
    } catch (err) {
      console.error("Lỗi ghi âm:", err);
      appendMessage("ai", "❌ Không thể truy cập micro!");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = "🎙️ Ghi âm";
  }
});

// === Gửi audio đến backend (Whisper HuggingFace) ===
async function sendAudioToBackend(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice.wav");

    const response = await fetch(`${BACKEND_URL}/speech-to-text`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      const text = data.text || "(Không nhận dạng được)";
      appendMessage("user", "🎧 " + text);

      // Sau khi có text → gọi lại /chat để AI phản hồi
      const chatResponse = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const chatData = await chatResponse.json();
      if (chatResponse.ok) {
        appendMessage("ai", chatData.reply);
      } else {
        appendMessage("ai", "⚠️ Lỗi khi phản hồi giọng nói.");
      }
    } else {
      appendMessage("ai", "⚠️ Lỗi server: " + (data.error || "Không rõ"));
      console.error("Server error:", data);
    }
  } catch (error) {
    appendMessage("ai", "⚠️ Không gửi được âm thanh tới server!");
    console.error("Lỗi khi gửi audio:", error);
  }
}

// === Gửi khi nhấn Enter hoặc nút gửi ===
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
