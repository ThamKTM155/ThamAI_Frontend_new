// script.js - ThamAI Chat Ultra+ v1.2
const API_BASE = "https://thamai-backend-new.onrender.com"; // <-- đổi thành URL backend của anh

/* -----------------------
   DOM
-----------------------*/
const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const voiceSelect = document.getElementById("voice-select");
const langSelect = document.getElementById("lang-select");
const testVoiceBtn = document.getElementById("test-voice");
const saveSettingsBtn = document.getElementById("save-settings");
const retryBtn = document.getElementById("retry-btn");
const backendStatus = document.getElementById("backend-status");
const statusText = document.getElementById("status-text");
const statusIcon = document.getElementById("status-icon");
const audioPlayer = document.getElementById("audio-player");
const tingAudio = document.getElementById("ting-audio");
const waveCanvas = document.getElementById("wave-canvas");
const mouthEl = document.getElementById("mouth");
const avatarImg = document.getElementById("avatar-img");
const tingSound = new Audio('assets/ting.mp3');
const avatarNormal = 'assets/avatar.png';
const avatarSmile = 'assets/avatar_smile.png';
const waveGif = 'assets/wave.gif';

let mediaRecorder = null;
let audioChunks = [];
let lastBotReply = "";
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let animationId = null;
let isRecording = false;

/* -----------------------
   Utility
-----------------------*/
function appendMessage(sender, text) {
  const el = document.createElement("div");
  el.className = `message ${sender === "user" ? "user" : "bot"}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* -----------------------
   Backend check with pulse + ping sound
-----------------------*/
async function updateStatus(connected) {
  if (connected) {
    backendStatus.classList.remove("disconnected");
    backendStatus.classList.add("connected");
    statusText.textContent = "Backend ThamAI hoạt động tốt!";
    statusIcon.textContent = "✅";
    // ping sound
    try {
      await tingAudio.play();
    } catch (e) {
      // autoplay locked — ignore
    }
    // avatar pulse
    avatarImg.style.transform = "scale(1.02)";
    setTimeout(()=> avatarImg.style.transform = "", 500);
  } else {
    backendStatus.classList.remove("connected");
    backendStatus.classList.add("disconnected");
    statusText.textContent = "Không thể kết nối máy chủ backend.";
    statusIcon.textContent = "⚠️";
  }
}

async function checkBackend() {
  backendStatus.classList.add("checking");
  statusText.textContent = "Đang kiểm tra...";
  statusIcon.textContent = "⏳";
  try {
    const res = await fetch(`${API_BASE}/test`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const ok = data && (data.status === "ok" || data.message);
    await updateStatus(Boolean(ok));
    return ok;
  } catch (err) {
    console.error("Lỗi kết nối:", err);
    await updateStatus(false);
    return false;
  } finally {
    backendStatus.classList.remove("checking");
  }
}
retryBtn.addEventListener("click", () => checkBackend());

checkBackend(); // on load

/* -----------------------
   Persist settings (localStorage)
-----------------------*/
const SETTINGS_KEY = "thamai_settings_v1";
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.voice) voiceSelect.value = s.voice;
    if (s.lang) langSelect.value = s.lang;
    if (s.autoplay !== undefined) document.getElementById("autoplay-tts").checked = s.autoplay;
  } catch (e) { console.warn("Load settings failed", e); }
}
function saveSettings() {
  const s = {
    voice: voiceSelect.value,
    lang: langSelect.value,
    autoplay: document.getElementById("autoplay-tts").checked
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  appendMessage("bot", "⚙️ Đã lưu cài đặt giọng.");
}
saveSettingsBtn.addEventListener("click", saveSettings);
loadSettings();

/* -----------------------
   Waveform + mouth animation setup
-----------------------*/
function createAudioContext() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  return audioCtx;
}

function attachSourceFromMediaElement(el) {
  createAudioContext();
  try {
    if (sourceNode) sourceNode.disconnect();
    sourceNode = audioCtx.createMediaElementSource(el);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination); // to allow audio to play through page
  } catch (e) {
    console.warn("attachSourceFromMediaElement failed:", e);
  }
}

function attachSourceFromStream(stream) {
  createAudioContext();
  try {
    if (sourceNode) sourceNode.disconnect();
    sourceNode = audioCtx.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    // do not connect analyser to destination for mic (we don't want feedback)
  } catch (e) {
    console.warn("attachSourceFromStream failed:", e);
  }
}

function startVisuals() {
  const canvas = waveCanvas;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const ctx = canvas.getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(9,161,122,0.8)";
    ctx.beginPath();
    const sliceWidth = canvas.clientWidth / bufferLength;
    let x = 0;
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0 - 1.0;
      const y = (canvas.clientHeight / 2) + v * (canvas.clientHeight / 3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
      sum += Math.abs(v);
    }
    ctx.stroke();

    // mouth animation: compute RMS-like value
    const rms = sum / bufferLength;
    const mouthScale = Math.min(1.8, 1 + rms * 10);
    mouthEl.style.transform = `scaleY(${Math.max(0.6, mouthScale)})`;
    if (rms > 0.06) mouthEl.classList.add("smile"); else mouthEl.classList.remove("smile");

    // subtle avatar brightness
    avatarImg.style.filter = `brightness(${1 + Math.min(0.2, rms)})`;
  }

  if (!animationId) draw();
}

function stopVisuals() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  const canvas = waveCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.clientWidth, canvas.clientHeight);
  mouthEl.style.transform = "";
  avatarImg.style.filter = "";
}

/* -----------------------
   Chat: /chat
-----------------------*/
sendBtn.addEventListener("click", async () => {
  const message = userInput.value.trim();
  if (!message) return;
  appendMessage("user", message);
  userInput.value = "";
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    if (!res.ok) {
      appendMessage("bot", `⚠️ Lỗi chat HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    if (data.reply) {
      appendMessage("bot", data.reply);
      lastBotReply = data.reply;
      if (document.getElementById("autoplay-tts").checked) speakBtn.click();
    } else {
      appendMessage("bot", "❌ Phản hồi không hợp lệ từ backend.");
    }
  } catch (e) {
    console.error("Chat fetch failed:", e);
    appendMessage("bot", "⚠️ Không thể kết nối máy chủ backend.");
  }
});

/* -----------------------
   Whisper (recording) -> /whisper
   - when recording stops: send file, backend returns JSON {text}
   - attach mic stream to analyser for live visuals
-----------------------*/
recordBtn.addEventListener("click", async () => {
  try {
    if (isRecording) {
      // stop
      mediaRecorder.stop();
      isRecording = false;
      recordBtn.textContent = "🎤 Ghi âm";
      stopVisuals();
      if (audioCtx && audioCtx.state !== "closed") audioCtx.suspend().catch(()=>{});
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    attachSourceFromStream(stream);
    startVisuals();

    // choose supported mimeType
    let mime = "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mime = "audio/webm;codecs=opus";
    else if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
    else if (MediaRecorder.isTypeSupported("audio/wav")) mime = "audio/wav";

    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: audioChunks[0]?.type || "audio/webm" });
      appendMessage("user", "🎙️ (Đang gửi file ghi âm...)");

      const fd = new FormData();
      fd.append("file", blob, "record.webm");

      try {
        const res = await fetch(`${API_BASE}/whisper`, { method: "POST", body: fd });
        if (!res.ok) {
          const txt = await res.text();
          console.error("Whisper HTTP error", res.status, txt);
          appendMessage("bot", `⚠️ Whisper lỗi HTTP (${res.status}).`);
          return;
        }
        const data = await res.json();
        if (data.text) {
          appendMessage("user", "🗣️ " + data.text);
          userInput.value = data.text;
        } else {
          appendMessage("bot", "❌ Không nhận dạng được giọng nói.");
          console.error("Whisper unexpected:", data);
        }
      } catch (err) {
        console.error("Whisper fetch failed:", err);
        appendMessage("bot", "⚠️ Lỗi khi gửi file ghi âm.");
      }
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = "⏹️ Dừng";

    // resume audio context if suspended
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(()=>{});
  } catch (e) {
    console.error("Ghi âm failed:", e);
    appendMessage("bot", "⚠️ Không thể truy cập micro: " + (e.message || e));
  }
});

/* -----------------------
   TTS speak -> /speak
   - get blob audio and play via audio element
   - attach audio element to analyser to show waveform
-----------------------*/
speakBtn.addEventListener("click", async () => {
  const text = lastBotReply || userInput.value.trim();
  if (!text) {
    appendMessage("bot", "Chưa có nội dung để ThamAI nói.");
    return;
  }

  try {
    const gender = voiceSelect.value || "female";
    const lang = langSelect.value || "vi";
    const res = await fetch(`${API_BASE}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, gender, lang })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("TTS HTTP error:", res.status, txt);
      appendMessage("bot", "⚠️ Lỗi khi yêu cầu phát âm thanh.");
      return;
    }

    const blob = await res.blob();
    if (!blob.type.startsWith("audio")) {
      const txt = await blob.text();
      console.error("Phản hồi TTS không phải âm thanh:", txt);
      appendMessage("bot", "⚠️ Máy chủ chưa trả về âm thanh hợp lệ.");
      return;
    }

    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.hidden = false;

    // attach analyser to this audio element to visualize TTS
    try {
      // create audio context and attach
      createAudioContext();
      attachSourceFromMediaElement(audioPlayer);
      startVisuals();
      audioPlayer.play().catch(e => console.warn("Audio play prevented:", e));
      // when audio ends, stop visuals
      audioPlayer.onended = () => {
        stopVisuals();
        if (audioCtx && audioCtx.state !== "suspended") audioCtx.suspend().catch(()=>{});
      };
    } catch (e) {
      console.warn("Attach TTS to visuals failed:", e);
    }

  } catch (err) {
    console.error("TTS fetch failed:", err);
    appendMessage("bot", "⚠️ Không thể phát âm thanh.");
  }
});

/* -----------------------
   Settings UI
-----------------------*/
settingsBtn.addEventListener("click", ()=> settingsPanel.classList.toggle("hidden"));
testVoiceBtn.addEventListener("click", async () => {
  // quick test phrase
  lastBotReply = (langSelect.value === "en") ? "Hello, this is ThachAI speaking." : "Xin chào, đây là bản thử giọng ThạchAI.";
  await speakBtn.click();
});

/* enable Enter key to send */
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

/* -----------------------
   On load: set UI from saved settings
-----------------------*/
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
});
