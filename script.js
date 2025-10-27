const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const recordBtn = document.getElementById('record-btn');
const speakToggle = document.getElementById('speak-toggle');
const settingsBtn = document.getElementById('settings-btn');

// Popup cài đặt
const popup = document.getElementById('settings-popup');
const closeSettings = document.getElementById('close-settings');
const saveSettings = document.getElementById('save-settings');
const voiceSelect = document.getElementById('voice-select');
const rateSlider = document.getElementById('rate-slider');
const volumeSlider = document.getElementById('volume-slider');

// Biến lưu cấu hình
let voiceGender = localStorage.getItem('voiceGender') || 'female';
let speechRate = parseFloat(localStorage.getItem('speechRate')) || 1;
let speechVolume = parseFloat(localStorage.getItem('speechVolume')) || 1;

voiceSelect.value = voiceGender;
rateSlider.value = speechRate;
volumeSlider.value = speechVolume;

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.textContent = `${sender}: ${text}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  appendMessage("Bạn", text);
  userInput.value = "";

  try {
    const res = await fetch("https://thamai-backend-new.onrender.com/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    appendMessage("ThamAI", data.reply);

    // Phát giọng
    speakText(data.reply);

  } catch (err) {
    appendMessage("Lỗi", "Không kết nối được tới server.");
  }
}

// Chuyển văn bản thành giọng nói
function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v =>
    voiceGender === 'male' ? v.name.includes('Nam') || v.name.includes('Male') : v.name.includes('Nữ') || v.name.includes('Female')
  ) || voices[0];
  utterance.rate = speechRate;
  utterance.volume = speechVolume;
  speechSynthesis.speak(utterance);
}

// Ghi âm (Whisper)
let mediaRecorder;
let audioChunks = [];

recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.textContent = "🎙️ Ghi âm";
  } else {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Dừng";
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", blob, "record.wav");

      try {
        const res = await fetch("https://thamai-backend-new.onrender.com/whisper", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        userInput.value = data.transcription;
        appendMessage("🎧 Whisper", data.transcription);
      } catch (err) {
        appendMessage("Lỗi", "Không gửi được âm thanh đến backend.");
      }
    };
  }
};

// Nút gửi và Enter
sendBtn.onclick = sendMessage;
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

// Mở / đóng popup
settingsBtn.onclick = () => popup.style.display = "flex";
closeSettings.onclick = () => popup.style.display = "none";

// Lưu cài đặt
saveSettings.onclick = () => {
  voiceGender = voiceSelect.value;
  speechRate = parseFloat(rateSlider.value);
  speechVolume = parseFloat(volumeSlider.value);

  localStorage.setItem('voiceGender', voiceGender);
  localStorage.setItem('speechRate', speechRate);
  localStorage.setItem('speechVolume', speechVolume);

  alert("✅ Đã lưu cài đặt giọng & âm thanh!");
  popup.style.display = "none";
};
