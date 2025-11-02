const backendUrl = "https://thamai-backend-new.onrender.com";

// Gọi kiểm tra backend khi trang tải
window.addEventListener("load", checkBackend);

async function checkBackend() {
  const statusEl = document.getElementById("backendStatus");
  statusEl.className = "status-box checking";
  statusEl.innerText = "🔄 Đang kiểm tra backend...";

  try {
    const res = await fetch(`${backendUrl}/test`);
    if (!res.ok) throw new Error("Không phản hồi");
    const data = await res.text();

    if (data.includes("ok") || data.includes("success")) {
      statusEl.className = "status-box success";
      statusEl.innerText = "✅ Backend ThamAI hoạt động tốt!";
      document.getElementById("successSound").play();
      avatarSmile();
    } else {
      throw new Error("Sai phản hồi");
    }
  } catch (err) {
    statusEl.className = "status-box error";
    statusEl.innerText = "❌ Không thể kết nối backend.";
  }
}

// Hiệu ứng avatar cười nhẹ khi kết nối
function avatarSmile() {
  const avatar = document.getElementById("avatar");
  avatar.style.filter = "brightness(1.5)";
  setTimeout(() => (avatar.style.filter = "brightness(1)"), 1200);
}

// Gửi tin nhắn
document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("userInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";

  // Hiệu ứng đang gõ
  const typingEl = addMessage("bot", "ThamAI đang suy nghĩ...");
  typingEl.classList.add("typing");

  try {
    const res = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    typingEl.remove();
    addMessage("bot", data.reply || "(Không có phản hồi)");
    document.getElementById("successSound").play();
    avatarSmile();
  } catch {
    typingEl.remove();
    addMessage("bot", "❌ Lỗi khi kết nối đến backend.");
  }
}

// Thêm tin nhắn vào khung
function addMessage(sender, text) {
  const box = document.getElementById("chatBox");
  const msg = document.createElement("div");
  msg.classList.add("msg", sender);
  msg.innerText = text;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
  return msg;
}

// Nút thử lại kết nối
document.getElementById("retryBtn").addEventListener("click", checkBackend);

// Nút mở trang cài đặt
document.getElementById("settingsBtn").addEventListener("click", () => {
  window.location.href = "settings.html";
});
