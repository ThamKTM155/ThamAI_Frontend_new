// script.js
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const status = document.getElementById("status");

// Địa chỉ backend mới
const apiUrl = "https://thamai-backend-new.onrender.com/chat";

// Hàm thêm tin nhắn vào khung chat
function appendMessage(sender, text) {
  const el = document.createElement("div");
  el.className = "message " + sender;
  el.innerText = text;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Hàm gửi tin nhắn
async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  appendMessage("user", msg);
  userInput.value = "";
  status.innerText = "⏳ Đang gửi...";

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    if (!res.ok) {
      const txt = await res.text();
      appendMessage("bot", "⚠️ Lỗi server: " + res.status);
      status.innerText = "Lỗi: " + res.status;
      console.error("Response not ok:", res.status, txt);
      return;
    }

    const data = await res.json();
    if (data.reply) {
      appendMessage("bot", data.reply);
      status.innerText = "✅ Hoàn tất";
    } else if (data.message) {
      appendMessage("bot", data.message);
      status.innerText = "✅ Hoàn tất (thông báo)";
    } else {
      appendMessage("bot", "⚠️ Phản hồi không đúng định dạng.");
      status.innerText = "⚠️ Sai định dạng phản hồi";
    }

  } catch (err) {
    appendMessage("bot", "⚠️ Lỗi kết nối: " + err.message);
    status.innerText = "⚠️ Lỗi kết nối";
    console.error(err);
  }
}

// Sự kiện khi bấm nút gửi
sendButton.addEventListener("click", sendMessage);

// Sự kiện khi nhấn Enter
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
