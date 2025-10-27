// ===============================
// ThamAI Assistant Frontend Script
// ===============================

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("sendBtn");
const recordBtn = document.getElementById("recordBtn");
const toggleVoiceBtn = document.getElementById("toggleVoiceBtn");

let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let currentVoiceGender = "female"; // Giọng mặc định
let selectedVoice = null;

// ====== Hàm hiển thị tin nhắn ======
function appendMessage(sender, text) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    msg.textContent = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ====== Hàm chọn giọng nói theo giới tính ======
function setVoiceByGender(gender) {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    if (!voices.length) {
        synth.onvoiceschanged = () => setVoiceByGender(gender);
        return;
    }

    selectedVoice = voices.find(v =>
        gender === "female"
            ? v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman")
            : v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("man")
    );

    if (!selectedVoice) {
        selectedVoice = voices[0];
    }

    console.log(`✅ Giọng hiện tại: ${selectedVoice.name}`);
}

// ====== Hàm phát giọng nói ======
function speakText(text) {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

// ====== Nút Gửi tin nhắn ======
sendBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (!text) return;
    appendMessage("user", text);
    userInput.value = "";

    // Giả lập phản hồi (test)
    setTimeout(() => {
        const reply = `ThamAI (${currentVoiceGender === "female" ? "nữ" : "nam"}) trả lời: ${text}`;
        appendMessage("bot", reply);
        speakText(reply);
    }, 700);
});

// ====== Nút Đổi giọng ======
toggleVoiceBtn.addEventListener("click", () => {
    currentVoiceGender = currentVoiceGender === "female" ? "male" : "female";
    setVoiceByGender(currentVoiceGender);

    const msg =
        currentVoiceGender === "female"
            ? "Xin chào, tôi là ThamAI giọng nữ!"
            : "Xin chào, tôi là ThamAI giọng nam!";
    appendMessage("bot", msg);
    speakText(msg);
});

// ====== Tải sẵn giọng khi mở trang ======
window.speechSynthesis.onvoiceschanged = () => {
    setVoiceByGender(currentVoiceGender);
};
