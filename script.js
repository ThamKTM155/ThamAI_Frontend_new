// script.js - ThamAI Settings Pro+
// expects backend endpoints: /chat, /whisper, /speak
const API_BASE = "https://thamai-backend-new.onrender.com"; // update if needed

// DOM
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const audioPlayer = document.getElementById("audio-player");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeSettings = document.getElementById("close-settings");
const saveSettingsBtn = document.getElementById("save-settings");
const testVoiceBtn = document.getElementById("test-voice");
const resetSettingsBtn = document.getElementById("reset-settings");

const genderSelect = document.getElementById("gender-select");
const langSelect = document.getElementById("lang-select");
const rateInput = document.getElementById("rate");
const pitchInput = document.getElementById("pitch");
const rateVal = document.getElementById("rate-val");
const pitchVal = document.getElementById("pitch-val");
const toggleVisual = document.getElementById("toggle-visual");
const toggleAvatar = document.getElementById("toggle-avatar");

const avatarEl = document.getElementById("avatar");
const vizCanvas = document.getElementById("vizCanvas");

// state
let mediaRecorder = null;
let audioChunks = [];
let lastBotReply = "";
let audioCtx = null;
let analyser = null;
let vizAnimationId = null;
let micStream = null;

// default settings
const DEFAULTS = {
  gender: "female", lang: "vi", rate: 1.0, pitch: 1.0,
  showVisual: true, showAvatar: true
};

function loadSettings(){
  try {
    const raw = localStorage.getItem("thamai_settings_v1");
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {...DEFAULTS, ...parsed};
  } catch (e) {
    console.error("loadSettings error:", e);
    return DEFAULTS;
  }
}

function saveSettings(obj){
  localStorage.setItem("thamai_settings_v1", JSON.stringify(obj));
}

function applySettingsToUI(s){
  genderSelect.value = s.gender;
  langSelect.value = s.lang;
  rateInput.value = s.rate;
  pitchInput.value = s.pitch;
  rateVal.textContent = s.rate;
  pitchVal.textContent = s.pitch;
  toggleVisual.checked = !!s.showVisual;
  toggleAvatar.checked = !!s.showAvatar;
  vizCanvas.style.display = s.showVisual ? "block" : "none";
  avatarEl.style.display = s.showAvatar ? "block" : "none";
}

let settings = loadSettings();
applySettingsToUI(settings);

// settings modal
settingsBtn.addEventListener("click", ()=> settingsModal.classList.remove("hidden"));
closeSettings.addEventListener("click", ()=> settingsModal.classList.add("hidden"));

rateInput.addEventListener("input", ()=> rateVal.textContent = rateInput.value);
pitchInput.addEventListener("input", ()=> pitchVal.textContent = pitchInput.value);

saveSettingsBtn.addEventListener("click", ()=>{
  settings = {
    gender: genderSelect.value,
    lang: langSelect.value,
    rate: parseFloat(rateInput.value),
    pitch: parseFloat(pitchInput.value),
    showVisual: toggleVisual.checked,
    showAvatar: toggleAvatar.checked
  };
  saveSettings(settings);
  applySettingsToUI(settings);
  appendMessage("bot", "✅ Lưu cài đặt thành công.");
  settingsModal.classList.add("hidden");
});

resetSettingsBtn.addEventListener("click", ()=>{
  settings = DEFAULTS;
  saveSettings(settings);
  applySettingsToUI(settings);
  appendMessage("bot", "🔄 Đã đặt lại cài đặt mặc định.");
});

testVoiceBtn.addEventListener("click", async ()=>{
  const sample = settings.lang === "en" ? "Hello, this is ThamAI speaking." : "Xin chào, đây là ThạchAI. Tôi đang thử giọng.";
  // Use /speak to test TTS on backend
  try {
    const res = await fetch(`${API_BASE}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sample, gender: settings.gender })
    });
    if (!res.ok) {
      const t = await res.text(); console.error("TTS HTTP error:", res.status, t);
      appendMessage("bot","⚠️ Lỗi khi thử giọng.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    playAudioUrl(url);
  } catch (e) {
    console.error("testVoice failed:", e);
    appendMessage("bot","⚠️ Lỗi khi gọi TTS thử giọng.");
  }
});

// ---- Chat logic ----
sendBtn.addEventListener("click", sendMessage);
clearBtn.addEventListener("click", ()=>{ chatBox.innerHTML = ""; });

userInput.addEventListener("keypress", (e)=>{
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
});

async function sendMessage(){
  const text = userInput.value.trim();
  if (!text) return;
  appendMessage("user", text);
  userInput.value = "";
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    if (!res.ok) {
      const t = await res.text(); console.error("/chat HTTP:", res.status, t);
      appendMessage("bot", "⚠️ Lỗi khi gọi /chat.");
      return;
    }
    const data = await res.json();
    if (data.reply) {
      appendMessage("bot", data.reply);
      lastBotReply = data.reply;
    } else {
      appendMessage("bot", "❌ Phản hồi /chat không đúng.");
      console.error("chat unexpected:", data);
    }
  } catch (e) {
    console.error("chat fetch failed:", e);
    appendMessage("bot", "⚠️ Không thể kết nối server /chat.");
  }
}

// ---- Recording / Whisper ----
recordBtn.addEventListener("click", async ()=>{
  if (mediaRecorder && mediaRecorder.state === "recording") {
    // stop
    mediaRecorder.stop();
    recordBtn.textContent = "🎤 Ghi âm";
    stopMicVisualizer();
    return;
  }

  // start recording
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream = stream;
    // start mic visualizer
    if (settings.showVisual) startMicVisualizer(stream);

    // pick supported mime
    let mime = "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mime = "audio/webm;codecs=opus";
    else if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
    else if (MediaRecorder.isTypeSupported("audio/wav")) mime = "audio/wav";

    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size>0) audioChunks.push(e.data); };

    mediaRecorder.onstop = async ()=>{
      // assemble blob
      const blob = new Blob(audioChunks, { type: audioChunks[0]?.type || "audio/webm" });
      const fd = new FormData();
      fd.append("file", blob, "recording.webm"); // backend expects 'file'
      appendMessage("user","🎙️ (Đang gửi file ghi âm...)");

      try {
        const res = await fetch(`${API_BASE}/whisper`, { method: "POST", body: fd });
        if (!res.ok) {
          const txt = await res.text();
          console.error("Whisper HTTP error:", res.status, txt);
          appendMessage("bot", `⚠️ Whisper lỗi HTTP (${res.status}).`);
          return;
        }
        const data = await res.json();
        if (data.text) {
          appendMessage("user", "🗣️ " + data.text);
          userInput.value = data.text;
        } else {
          appendMessage("bot", "❌ Không nhận dạng được giọng nói.");
          console.error("whisper unexpected:", data);
        }
      } catch (err) {
        console.error("Whisper fetch failed:", err);
        appendMessage("bot", "⚠️ Lỗi khi gửi file ghi âm.");
      } finally {
        // cleanup mic
        if (micStream) { micStream.getTracks().forEach(t=>t.stop()); micStream = null; }
        stopMicVisualizer();
      }
    };

    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Dừng";
    appendMessage("bot","🔴 Đang ghi âm — bấm lại để dừng.");
  } catch (err) {
    console.error("getUserMedia error:", err);
    appendMessage("bot","⚠️ Không thể truy cập micro. Kiểm tra quyền trình duyệt.");
  }
});

// ---- TTS speak: call backend /speak (passes gender + text) ----
speakBtn.addEventListener("click", async ()=>{
  const text = lastBotReply || userInput.value.trim();
  if (!text) { alert("Chưa có nội dung để ThamAI nói."); return; }

  try {
    const res = await fetch(`${API_BASE}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, gender: settings.gender })
    });
    if (!res.ok) {
      const t = await res.text(); console.error("TTS HTTP error:", res.status, t);
      appendMessage("bot","⚠️ Lỗi khi yêu cầu phát âm thanh.");
      return;
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("audio")) {
      const txt = await blob.text();
      console.error("TTS not audio:", txt);
      appendMessage("bot","⚠️ Server chưa trả về âm thanh hợp lệ.");
      return;
    }
    const url = URL.createObjectURL(blob);
    playAudioUrl(url);
  } catch (err) {
    console.error("TTS fetch failed:", err);
    appendMessage("bot","⚠️ Không thể phát âm thanh (lỗi mạng).");
  }
});

// play audio and visualize & avatar animate
async function playAudioUrl(url){
  try {
    stopPlaybackVisualizer();
    audioPlayer.hidden = false;
    audioPlayer.src = url;
    await audioPlayer.play();
    // setup visualizer on audio element
    if (settings.showVisual) startPlaybackVisualizer(audioPlayer);
    if (settings.showAvatar) startAvatarSpeaking();
    audioPlayer.onended = ()=> { stopPlaybackVisualizer(); stopAvatarSpeaking(); };
  } catch (e) {
    console.error("playAudioUrl:", e);
  }
}

// ---- visualizer utilities ----
function createAudioContextIfNeeded(){
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function startMicVisualizer(stream){
  try {
    createAudioContextIfNeeded();
    stopMicVisualizer();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    drawVisualizer();
  } catch (e) {
    console.warn("startMicVisualizer failed:", e);
  }
}

function startPlaybackVisualizer(audioEl){
  try {
    createAudioContextIfNeeded();
    stopPlaybackVisualizer();
    const src = audioCtx.createMediaElementSource(audioEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawVisualizer();
  } catch (e) {
    console.warn("startPlaybackVisualizer failed:", e);
  }
}

function stopMicVisualizer(){ stopVisualizer(); }
function stopPlaybackVisualizer(){ stopVisualizer(); }

function stopVisualizer(){
  if (vizAnimationId) cancelAnimationFrame(vizAnimationId);
  vizAnimationId = null;
  if (analyser) { analyser.disconnect(); analyser = null; }
}

function drawVisualizer(){
  if (!analyser) return;
  const canvas = vizCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const bufferLen = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLen);

  function draw(){
    vizAnimationId = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = "#021827";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeStyle = "rgba(96,165,250,0.9)";
    ctx.beginPath();
    const sliceWidth = canvas.width / bufferLen;
    let x = 0;
    for (let i=0;i<bufferLen;i++){
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height/2);
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke();
  }
  draw();
}

// ---- avatar speak animation ----
let avatarTimer = null;
function startAvatarSpeaking(){
  avatarEl.classList.add("speaking");
  // small mouth ry randomization
  avatarTimer = setInterval(()=> {
    const mouth = avatarEl.querySelector("#mouth ellipse");
    if (mouth) {
      const ry = 7 + Math.random()*12;
      mouth.setAttribute("ry", ry);
    }
    // occasional eye blink while speaking
    const eyes = avatarEl.querySelectorAll("#eyes ellipse");
    if (Math.random() < 0.12) {
      eyes.forEach(e=> e.setAttribute("ry", 1));
      setTimeout(()=> eyes.forEach(e=> e.setAttribute("ry",6)), 120);
    }
  }, 120);
}
function stopAvatarSpeaking(){
  avatarEl.classList.remove("speaking");
  if (avatarTimer) { clearInterval(avatarTimer); avatarTimer = null; }
  // restore mouth
  const mouth = avatarEl.querySelector("#mouth ellipse");
  if (mouth) mouth.setAttribute("ry", 7);
  // restore eyes
  const eyes = avatarEl.querySelectorAll("#eyes ellipse");
  eyes.forEach(e=> e.setAttribute("ry",6));
}

// ---- small helpers ----
function appendMessage(sender, text){
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// check backend on load
(async function checkBackend(){
  try {
    const res = await fetch(`${API_BASE}/test`);
    // sometimes server returns HTML error page (unexpected token '<')
    const contentType = res.headers.get("Content-Type") || "";
    if (!res.ok) {
      const txt = await res.text();
      console.error("backend /test error:", res.status, txt);
      appendMessage("bot","❌ Không thể kết nối backend (HTTP "+res.status+")");
      return;
    }
    if (contentType.includes("application/json")){
      const data = await res.json();
      if (data.status === "ok") appendMessage("bot","✅ Kết nối backend ThamAI thành công!");
      else appendMessage("bot","⚠️ Backend phản hồi không đúng.");
    } else {
      const txt = await res.text();
      console.warn("backend /test returned non-json:", txt);
      appendMessage("bot","⚠️ Backend trả về nội dung không phải JSON.");
    }
  } catch (e) {
    console.error("checkBackend:", e);
    appendMessage("bot","❌ Không thể kết nối tới máy chủ backend.");
  }
})();
