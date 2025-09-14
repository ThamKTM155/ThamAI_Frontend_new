/* ===== ThamAI Frontend - script.js ===== */
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const status = document.getElementById("status");

// Địa chỉ backend
const apiUrl = "https://thamai-backend-new.onrender.com/chat";

// Hàm thêm tin nhắn kèm avatar
function appendMessage(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper " + sender;

  const avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = sender === "bot" ? "assets/bot.png" : "assets/user.png";
  avatar.alt = sender;

  const msg = document.createElement("div");
  msg.className = "message " + sender;
  msg.innerText = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(msg);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Hàm gõ chữ từng ký tự
function typeMessage(sender, text, speed = 30) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper " + sender;

  const avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = sender === "bot" ? "assets/bot.png" : "assets/user.png";
  avatar.alt = sender;

  const msg = document.createElement("div");
  msg.className = "message " + sender;

  wrapper.appendChild(avatar);
  wrapper.appendChild(msg);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  let index = 0;
  function typeChar() {
    if (index < text.length) {
      msg.innerText += text.charAt(index);
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

// Sự kiện gửi
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
