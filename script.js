const backendUrl = "https://thamai-backend-new.onrender.com";

const statusDiv = document.getElementById("status");
const avatar = document.getElementById("avatar");
const waveCanvas = document.getElementById("waveCanvas");
const ctx = waveCanvas.getContext("2d");
const tingSound = new Audio("assets/ting.mp3");
const audioEl = document.getElementById("ttsAudio");

const voiceSelect = document.getElementById("voiceSelect");
const showWave = document.getElementById("showWave");
let voices = [];
let selectedVoice = localStorage.getItem("selectedVoice") || "";
let speaking = false;

// 🌊 Vẽ sóng âm theo dữ liệu thật
function drawWave(dataArray) {
  if (!showWave.checked) return;
  ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
  ctx.beginPath();
  ctx.moveTo(0, waveCanvas.height / 2);
  for (let i = 0; i < dataArray.length; i++) {
    const y = (dataArray[i] / 255.0) * waveCanvas.height;
    ctx.lineTo(i, y);
  }
  ctx.strokeStyle = "#007bff";
  ctx.stroke();
}

// 👂 Theo dõi biên độ mic để làm sóng & miệng động
async function startMicVisualization() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function animate() {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a,b)=>a+b,0)/dataArray.length;
    avatar.classList.toggle("smiling", avg > 40);
    drawWave(dataArray.slice(0, waveCanvas.width));
    requestAnimationFrame(animate);
  }
  animate();
}

// 🗣️ Nói TTS và hiển thị hiệu ứng
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = voices.find(v => v.name === selectedVoice) || voices[0];
  utter.lang = "vi-VN";
  utter.onstart = () => { speaking = true; avatar.classList.add("smiling"); };
  utter.onend = () => { speaking = false; avatar.classList.remove("smiling"); };
  speechSynthesis.speak(utter);
}

// 🌐 Kiểm tra backend
async function checkBackend() {
  statusDiv.textContent = "🔄 Đang kiểm tra kết nối...";
  try {
    const res = await fetch(`${backendUrl}/`);
    if (res.ok) {
      tingSound.play();
      statusDiv.textContent = "✅ Đã kết nối backend thành công!";
      statusDiv.style.color = "green";
      avatar.classList.add("smiling");
      setTimeout(()=>avatar.classList.remove("smiling"),1500);
    } else {
      statusDiv.textContent = "❌ Kết nối lỗi!";
      statusDiv.style.color = "red";
    }
  } catch {
    statusDiv.textContent = "❌ Không thể kết nối backend!";
    statusDiv.style.color = "red";
  }
}

// 🎙️ Gửi tin nhắn
document.getElementById("sendBtn").addEventListener("click", async () => {
  const msg = document.getElementById("userInput").value.trim();
  if (!msg) return;
  const res = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
  });
  const data = await res.json();
  if (data.reply) speak(data.reply);
});

// ⚙️ Cài đặt
document.getElementById("settingsBtn").addEventListener("click", () => {
  document.getElementById("settingsPanel").classList.toggle("hidden");
});

document.getElementById("closeSettings").addEventListener("click", () => {
  document.getElementById("settingsPanel").classList.add("hidden");
});

// 🔊 Thử giọng
document.getElementById("testVoice").addEventListener("click", () => {
  speak("Xin chào, tôi là ThạchAI – trợ lý của bạn đây!");
});

// 🧠 Khởi tạo danh sách giọng
function loadVoices() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = v.name;
    if (v.name === selectedVoice) opt.selected = true;
    voiceSelect.appendChild(opt);
  });
}

voiceSelect.addEventListener("change", () => {
  selectedVoice = voiceSelect.value;
  localStorage.setItem("selectedVoice", selectedVoice);
});

speechSynthesis.onvoiceschanged = loadVoices;
checkBackend();
startMicVisualization();
