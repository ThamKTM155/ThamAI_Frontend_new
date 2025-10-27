// ThamAI Settings Ultra+ (frontend)
// - paste vào file script.js trong project frontend
// - API_BASE trỏ tới backend (Render hoặc local)
const API_BASE = "https://thamai-backend-new.onrender.com"; // <- đổi nếu cần

// --- DOM ---
const backendIndicator = document.getElementById("backend-indicator");
const backendText = document.getElementById("backend-text");
const backendIcon = document.getElementById("backend-icon");
const retryBtn = document.getElementById("retry-backend");
const avatarFace = document.getElementById("avatar-face");
const eyes = document.querySelectorAll(".eye");
const mouth = document.querySelector(".mouth");
const waveCanvas = document.getElementById("wave-canvas");
const ctx = waveCanvas.getContext("2d");

const voiceGender = document.getElementById("voice-gender");
const voiceList = document.getElementById("voice-list");
const voiceListLabel = document.getElementById("voice-list-label");
const testVoiceBtn = document.getElementById("test-voice");
const startRecBtn = document.getElementById("start-record");
const stopRecBtn = document.getElementById("stop-record");
const recStatus = document.getElementById("rec-status");
const autoPlayCheckbox = document.getElementById("auto-play-tts");

// audio visualizer setup
let audioCtx = null;
let analyser = null;
let dataArray = null;
let sourceNode = null;
let rafId = null;

// media recorder
let mediaRecorder = null;
let recordedChunks = [];

// load saved settings
const savedGender = localStorage.getItem("thamai_gender") || "female";
voiceGender.value = savedGender;
const savedVoiceName = localStorage.getItem("thamai_voiceName") || "";
autoPlayCheckbox.checked = localStorage.getItem("thamai_autoPlay") === "true";

// helper: set backend status display
function setBackendStatus(state, text){
  backendIndicator.classList.remove("checking","ok");
  if(state === "checking"){
    backendIndicator.classList.add("checking");
    backendIcon.textContent = "🔄";
    backendText.textContent = text || "Đang kiểm tra kết nối...";
  } else if(state === "ok"){
    backendIndicator.classList.add("ok");
    backendIcon.textContent = "✅";
    backendText.textContent = text || "Đã kết nối tới backend";
    playTing();
    avatarFace.classList.add("glow");
    setTimeout(()=>avatarFace.classList.remove("glow"), 700);
  } else {
    backendText.textContent = text || "Không thể kết nối backend";
    backendIcon.textContent = "⚠️";
  }
}

// little ting sound on success
function playTing(){
  try {
    const o = new Audio();
    // tiny beep dataURI (short sine)
    o.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAAAB3AQACABAAZGF0YQAAAAA=";
    o.volume = 0.4;
    o.play().catch(()=>{});
  } catch(e){}
}

// check backend endpoint "/test" or "/"
async function checkBackend(){
  setBackendStatus("checking","Đang kiểm tra kết nối...");
  try{
    const res = await fetch(`${API_BASE}/test`, {cache:"no-store"});
    if(!res.ok){
      // try root
      const res2 = await fetch(`${API_BASE}/`, {cache:"no-store"});
      if(!res2.ok){
        setBackendStatus("error","Backend trả lỗi 404");
        return;
      } else {
        const d = await res2.json();
        setBackendStatus("ok", d.message || "Backend hoạt động");
        return;
      }
    }
    const data = await res.json();
    if(data && (data.status === "ok" || data.message)){
      setBackendStatus("ok", data.message || "Kết nối thành công");
    } else {
      setBackendStatus("ok","Kết nối (phản hồi khác)");
    }
  } catch(err){
    console.error("checkBackend error:", err);
    setBackendStatus("error","Không thể kết nối tới backend");
  }
}
retryBtn.addEventListener("click", checkBackend);
checkBackend();

// ==========================
// Avatar state helpers
// ==========================
function avatarIdle(){
  mouth.style.height = "18px";
  eyes.forEach(e => e.style.background = "black");
}
function avatarListening(){
  mouth.style.height = "34px";
  eyes.forEach(e => e.style.background = "#1f8cff");
}
function avatarSpeaking(){
  mouth.style.height = "40px";
  eyes.forEach(e => e.style.background = "#00e0a8");
}

// ==========================
// Visualizer: connect Microphone or Audio element
// ==========================
function ensureAudioContext(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function createAnalyser(){
  ensureAudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.fftSize;
  dataArray = new Uint8Array(bufferLength);
}
function startVisualizerFromStream(stream){
  stopVisualizer();
  createAnalyser();
  sourceNode = audioCtx.createMediaStreamSource(stream);
  sourceNode.connect(analyser);
  renderLoop();
}
function startVisualizerFromAudioElement(audioEl){
  stopVisualizer();
  createAnalyser();
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  renderLoop();
}
function stopVisualizer(){
  if(rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if(analyser) analyser.disconnect();
  if(sourceNode) try{ sourceNode.disconnect(); }catch(e){}
  analyser = null; sourceNode = null; dataArray = null;
  clearCanvas();
}

// render visual
function clearCanvas(){ ctx.clearRect(0,0,waveCanvas.width,waveCanvas.height); }
function renderLoop(){
  if(!analyser) return;
  analyser.getByteTimeDomainData(dataArray);
  const width = waveCanvas.width;
  const height = waveCanvas.height;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.clearRect(0,0,width,height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,200,150,0.9)";
  ctx.beginPath();
  const sliceWidth = width / dataArray.length;
  let x=0;
  let sum=0;
  for(let i=0;i<dataArray.length;i++){
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    x += sliceWidth;
    sum += Math.abs(dataArray[i]-128);
  }
  ctx.lineTo(width, height/2);
  ctx.stroke();

  // amplitude -> mouth scale
  const avg = sum / dataArray.length;
  const mouthH = Math.min(60, 18 + avg * 0.5); // tweak sensitivity
  mouth.style.height = mouthH + "px";

  // glow avatar when speaking
  if(avg > 6) avatarFace.classList.add("glow"); else avatarFace.classList.remove("glow");

  rafId = requestAnimationFrame(renderLoop);
}

// ==========================
// Microphone recording (and visualize)
// ==========================
async function startRecording(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // create audio context for visualizer
    ensureAudioContext();
    startVisualizerFromStream(stream);
    avatarListening();
    recStatus.textContent = "Đang ghi âm...";
    startRecBtn.disabled = true; stopRecBtn.disabled = false;
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorder.ondataavailable = (e) => { if(e.data && e.data.size>0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      recStatus.textContent = "Đã dừng ghi âm.";
      avatarIdle();
      stopVisualizer();
      startRecBtn.disabled = false; stopRecBtn.disabled = true;

      // build blob & send to backend /whisper
      const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || "audio/webm" });
      try {
        const fd = new FormData();
        fd.append("file", blob, "record.webm");
        const res = await fetch(`${API_BASE}/whisper`, { method:"POST", body: fd });
        if(!res.ok){
          const txt = await res.text();
          console.error("Whisper HTTP error:", res.status, txt);
          alert("Whisper lỗi: " + res.status);
          return;
        }
        const data = await res.json();
        if(data.text){
          // auto fill UI (if exists)
          alert("Whisper kết quả: " + data.text);
        } else {
          alert("Whisper không trả text.");
        }
      } catch(err){
        console.error("Whisper fetch failed:", err);
        alert("Lỗi gửi file ghi âm.");
      }
    };
    mediaRecorder.start();
  } catch(err){
    console.error("startRecording error:", err);
    alert("Không thể truy cập micro: " + err.message);
  }
}
function stopRecording(){
  if(mediaRecorder && mediaRecorder.state === "recording"){
    mediaRecorder.stop();
    // stop tracks
    try {
      mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    } catch(e){}
  }
}
startRecBtn.addEventListener("click", startRecording);
stopRecBtn.addEventListener("click", stopRecording);

// ==========================
// TTS: Test voice (two modes):
// - if "browser" selected -> use Web Speech (speechSynthesis)
// - else -> call backend /speak to get audio file and play, and visualize it
// ==========================
function getSelectedGender(){
  return voiceGender.value || "female";
}
async function testVoice(){
  const gender = getSelectedGender();
  const sample = gender === "male" ? "Xin chào, tôi là ThạchAI — giọng nam miền Bắc." :
                 gender === "female" ? "Xin chào, tôi là ThạchAI — giọng nữ miền Bắc." :
                 "Xin chào, tôi là ThạchAI - thử voice của trình duyệt.";

  // save setting
  localStorage.setItem("thamai_gender", gender);
  localStorage.setItem("thamai_autoPlay", autoPlayCheckbox.checked ? "true" : "false");

  if(gender === "browser"){
    // use Web Speech API
    const ut = new SpeechSynthesisUtterance(sample);
    // try to set voice if saved
    const savedName = localStorage.getItem("thamai_voiceName");
    if(savedName){
      const voices = speechSynthesis.getVoices();
      const match = voices.find(v=>v.name===savedName);
      if(match) ut.voice = match;
    }
    ut.lang = "vi-VN";
    avatarSpeaking();
    speechSynthesis.speak(ut);
    ut.onend = ()=> avatarIdle();
    return;
  }

  // call backend /speak to get audio (gTTS)
  try {
    avatarSpeaking();
    const res = await fetch(`${API_BASE}/speak`, {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ text: sample, gender })
    });
    if(!res.ok){
      const txt = await res.text();
      console.error("speak HTTP error:", res.status, txt);
      alert("TTS lỗi: " + res.status);
      avatarIdle();
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    // connect to analyser to visualize playback
    ensureAudioContext();
    // resume context if needed
    if(audioCtx.state === "suspended") await audioCtx.resume();
    startVisualizerFromAudioElement(audio);
    audio.play().catch(err=>console.error("audio play err:",err));
    audio.onended = ()=>{
      stopVisualizer();
      avatarIdle();
      URL.revokeObjectURL(url);
    };
  } catch(err){
    console.error("Test voice failed:", err);
    avatarIdle();
    alert("Không thể gọi TTS backend.");
  }
}
testVoiceBtn.addEventListener("click", testVoice);

// when voiceGender toggles -> show voice list if browser voice
voiceGender.addEventListener("change", ()=> {
  const v = voiceGender.value;
  if(v === "browser"){
    voiceList.style.display = ""; voiceListLabel.style.display="";
    populateBrowserVoices();
  } else { voiceList.style.display="none"; voiceListLabel.style.display="none"; }
});

// populate browser voices
function populateBrowserVoices(){
  const voices = speechSynthesis.getVoices();
  voiceList.innerHTML = "";
  voices.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v.name; opt.textContent = `${v.name} — ${v.lang}`;
    if(v.name === localStorage.getItem("thamai_voiceName")) opt.selected = true;
    voiceList.appendChild(opt);
  });
}
speechSynthesis.onvoiceschanged = populateBrowserVoices;
voiceList.addEventListener("change", ()=> {
  localStorage.setItem("thamai_voiceName", voiceList.value);
});

// restore UI voice list if needed
if(voiceGender.value === "browser") {
  voiceList.style.display=""; voiceListLabel.style.display="";
  populateBrowserVoices();
}

// store changes when checkbox toggled
autoPlayCheckbox.addEventListener("change", ()=> localStorage.setItem("thamai_autoPlay", autoPlayCheckbox.checked ? "true":"false"));

// avatar small idle blink (random)
setInterval(()=>{
  const h = Math.random();
  if(h>0.94){
    eyes.forEach(e => e.style.height="2px");
    setTimeout(()=>eyes.forEach(e=>e.style.height="22px"), 150);
  }
}, 1300);

// ensure canvas fits container
function resizeCanvas(){
  waveCanvas.width = waveCanvas.clientWidth * (window.devicePixelRatio || 1);
  waveCanvas.height = waveCanvas.clientHeight * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}
window.addEventListener("resize", ()=> { clearCanvas(); resizeCanvas(); });
resizeCanvas();

// Save default gender at load
localStorage.setItem("thamai_gender", voiceGender.value || "female");

// automatic small demo: if backend ok and autoPlay is true, play tiny greeting
(async function autoGreeting(){
  try {
    await checkBackend();
    if(localStorage.getItem("thamai_autoPlay")==="true"){
      // short delay to let voices load
      setTimeout(()=> testVoice(), 700);
    }
  } catch(e){}
})();
