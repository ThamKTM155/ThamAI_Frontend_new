const BACKEND_URL = "https://thamai-backend-new.onrender.com";
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");

let mediaRecorder, audioChunks = [];

// ---------------------
// 1️⃣ Gửi tin nhắn văn bản
// ---------------------
sendBtn.onclick = async () => {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) throw new Error("Lỗi khi gửi yêu cầu tới server");
    const data = await response.json();

    addMessage("assistant", data.reply || "(Không có phản hồi)");
  } catch (err) {
    addMessage("error", "❌ Không thể kết nối với máy chủ.");
    console.error(err);
  }
};

// ---------------------
// 2️⃣ Ghi âm và gửi tới /whisper
// ---------------------
recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.innerHTML = "🎙️";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      addMessage("user", "🎤 (Đang xử lý giọng nói...)");

      try {
        const res = await fetch(`${BACKEND_URL}/whisper`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.text) {
          addMessage("user", data.text);
          const replyRes = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: data.text }),
          });
          const replyData = await replyRes.json();
          addMessage("assistant", replyData.reply || "(Không có phản hồi)");
        } else {
          addMessage("error", "❌ Không nhận diện được giọng nói.");
        }
      } catch (err) {
        addMessage("error", "❌ Lỗi khi gửi âm thanh đến server.");
        console.error(err);
      }
    };

    mediaRecorder.start();
    recordBtn.innerHTML = "⏹️";
  } catch (err) {
    addMessage("error", "❌ Không thể truy cập micro.");
    console.error(err);
  }
};

// ---------------------
// 3️⃣ Gửi văn bản để phát âm thật
// ---------------------
speakBtn.onclick = async () => {
  const lastAssistantMsg = [...chatBox.querySelectorAll(".assistant")].pop();
  if (!lastAssistantMsg) return alert("Chưa có tin nhắn nào để đọc!");

  const text = lastAssistantMsg.textContent;

  try {
    const res = await fetch(`${BACKEND_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error("Không thể phát âm từ server");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (err) {
    addMessage("error", "❌ Lỗi khi phát âm thanh.");
    console.error(err);
  }
};

// ---------------------
// 4️⃣ Hàm hiển thị tin nhắn
// ---------------------
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = role;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
