const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const status = document.getElementById("status");

// API backend mới
const apiUrl = "https://thamai-backend-new.onrender.com/chat";

// Thêm tin nhắn vào khung chat
function appendMessage(sender, text) {
  const el = document.createElement("div");
  el.className = "message " + sender;
  el.innerText = text;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Hiệu ứng gõ chữ cho bot
function typeMessage(sender, text, speed = 30) {
  const el = document.createElement("div");
  el.className = "message " + sender;
  el.innerText = "";
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;

  let index = 0;
  function typeChar() {
    if (index < text.length) {
      el.innerText += text.charAt(index);
      index++;
      chatBox.scrollTop = chatBox.scrollHeight;
      setTimeout(typeChar, speed);
    }
  }
  typeChar();
}

// Gửi tin nhắn
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
      appendMessage("bot", "⚠️ Lỗi server: " + res.status);
      status.innerText = "Lỗi: " + res.status;
      return;
    }

    const data = await res.json();
    if (data.reply) {
      typeMessage("bot", data.reply);
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
  }
}

// Sự kiện click gửi
sendButton.addEventListener("click", sendMessage);

// Enter gửi tin, Shift+Enter xuống dòng
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
