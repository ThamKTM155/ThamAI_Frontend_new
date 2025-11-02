// script.js - ThamAI Ultra+ v1.4
// ---------------------------------
// Cấu hình: chỉnh API_BASE nếu cần
const API_BASE = "https://thamai-backend-new.onrender.com"; // <-- đổi nếu chạy local (http://127.0.0.1:5000)
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const recordBtn = document.getElementById("record-btn");
const speakBtn = document.getElementById("speak-btn");
const audioPlayer = document.getElementById("audio-player");

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const statusWrap = document.getElementById("status");
const retryBtn = document.getElementById("retry-btn");

const avatar = document.getElementById("avatar");
const mouth = document.getElementById("mouth");
const waveCanvas = document.getElementById("wave");

const voiceSelect = document.getElementById("voice-select");
const testVoiceBtn = document.getElementById("test-voice");
const autoTTSCheckbox = document.getElementById("auto-tts");
const showWaveCheckbox = document.getElementById("show-wave");
const persistVoiceCheckbox = document.getElementById("persist-voice");

// audio context / user gesture fix
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    // resume on user gesture
    audioCtx.resume().catch(()=>{});
  }
}

// small 'ting' sound using WebAudio (no file needed)
function playTing() {
  try {
    ensureAudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 1000;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    // envelope
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    o.start(now);
    o.stop(now + 0.3);
  } catch (e) {
    console.warn("Ting error:", e);
  }
}

// UI helpers
function setStatusConnected(ok) {
  if (ok) {
    statusWrap.classList.add('connected');
    statusDot.style.background = '#2ecc71';
    statusText.textContent = "✅ Kết nối backend thành công!";
    statusWrap.classList.remove('pulse');
    playTing();
    avatar.classList.add('avatar-speaking');
    setTimeout(()=> avatar.classList.remove('avatar-speaking'), 500);
  } else {
    statusWrap.classList.remove('connected');
    statusDot.style.background = '#ffbf00';
    statusText.textContent = "⚠️ Không thể kết nối máy chủ backend.";
    statusWrap.classList.add('pulse');
  }
}

// append message
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ----------------------
// checkBackend (chuẩn hóa + nút thử lại + hiệu ứng pulse)
// ----------------------
async function checkBackend(showUI=true) {
  if (showUI) {
    statusText.textContent = "⏳ Đang kiểm tra kết nối...";
    statusWrap.classList.add('pulse');
  }
  try {
    const res = await fetch(`${API_BASE}/`);
    const text = await res.text();
    // backend có thể trả HTML 404 nếu sai URL -> thử parse JSON
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }
    if (data && (data.message || data.status)) {
      setStatusConnected(true);
      if (showUI) appendMessage("bot", "✅ Kết nối backend ThamAI thành công!");
      return true;
    } else {
      // nếu backend trả HTML but status 200 -> treat as connected
      if (res.ok && text && text.trim().startsWith("<!doctype")==false) {
        setStatusConnected(true);
        if (showUI) appendMessage("bot", "✅ Kết nối backend ThamAI thành công!");
        return true;
      } else {
        setStatusConnected(false);
        if (showUI) appendMessage("bot", "⚠️ Backend phản hồi không đúng định dạng.");
        return false;
      }
    }
  } catch (err) {
    setStatusConnected(false);
    if (showUI) appendMessage("bot", "❌ Không thể kết nối tới máy chủ backend.");
    console.error("Lỗi kết nối:", err);
    return false;
  } finally {
    statusWrap.classList.remove('pulse');
  }
}
retryBtn.addEventListener('click', ()=>{ checkBackend(true); });

// gọi khi có bất kỳ thao tác người dùng (để tránh autoplay block)
document.addEventListener('click', () => { ensureAudioContext(); }, { once: true });
document.addEventListener('keydown', () => { ensureAudioContext(); }, { once: true });

// khởi động kiểm tra
checkBackend(true);

// ----------------------
// Chat (gọi /chat endpoint)
// ----------------------
sendBtn.addEventListener('click', async () => {
  const message = userInput.value.trim();
  if (!message) return;
  appendMessage('user', message);
  userInput.value = '';
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message})
    });
    if (!res.ok) {
      const t = await res.text();
      appendMessage('bot', '⚠️ Lỗi phản hồi từ máy chủ.');
      console.error('chat HTTP error:', res.status, t);
      return;
    }
    const data = await res.json();
    const reply = data.reply || data.text || ("ThamAI: Không nhận được phản hồi.");
    appendMessage('bot', reply);
    if (autoTTSCheckbox.checked) {
      await speakText(reply);
    }
  } catch (err) {
    appendMessage('bot', '⚠️ Không thể kết nối máy chủ backend.');
    console.error(err);
  }
});
userInput.addEventListener('keypress', (e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } });

// ----------------------
// Ghi âm → Whisper (POST FormData 'file')
// ----------------------
let mediaRecorder = null;
let audioChunks = [];
recordBtn.addEventListener('click', async () => {
  // ensure audio context resumed
  ensureAudioContext();

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.textContent = "🎤 Ghi âm";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    // pick supported mime
    let mime = '';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime = 'audio/webm;codecs=opus';
    else if (MediaRecorder.isTypeSupported('audio/webm')) mime = 'audio/webm';
    else if (MediaRecorder.isTypeSupported('audio/wav')) mime = 'audio/wav';

    mediaRecorder = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size>0) audioChunks.push(e.data); };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: audioChunks[0]?.type || 'audio/webm' });
      appendMessage('user', '🎙️ (Đang gửi file ghi âm...)');
      const form = new FormData();
      form.append('file', audioBlob, 'record.webm'); // backend expects field 'file'
      try {
        const res = await fetch(`${API_BASE}/whisper`, { method: 'POST', body: form });
        if (!res.ok) {
          const txt = await res.text();
          appendMessage('bot', `⚠️ Whisper lỗi HTTP (${res.status}).`);
          console.error('Whisper HTTP error:', res.status, txt);
          return;
        }
        const data = await res.json();
        if (data.text) {
          appendMessage('user', '🗣️ ' + data.text);
          userInput.value = data.text;
        } else {
          appendMessage('bot', '❌ Không nhận dạng được giọng nói.');
          console.error('Whisper unexpected:', data);
        }
      } catch (err) {
        appendMessage('bot','⚠️ Lỗi khi gửi file ghi âm.');
        console.error('Whisper fetch failed:', err);
      }
    };

    mediaRecorder.start();
    recordBtn.textContent = "⏹️ Dừng";
  } catch (err) {
    alert('Không thể truy cập micro: ' + err.message);
    console.error(err);
  }
});

// ----------------------
// TTS: speakText / nút ThamAI nói
// ----------------------
async function speakText(text, gender) {
  // gender optional
  try {
    const res = await fetch(`${API_BASE}/speak`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text, gender: gender || voiceSelect.value })
    });
    if (!res.ok) {
      const t = await res.text();
      appendMessage('bot','⚠️ Lỗi khi yêu cầu phát âm thanh.');
      console.error('TTS HTTP error:', res.status, t);
      return;
    }
    const blob = await res.blob();
    if (!blob.type.startsWith('audio')) {
      const t = await blob.text();
      console.error('TTS not audio:', t);
      appendMessage('bot','⚠️ Máy chủ chưa trả về âm thanh hợp lệ.');
      return;
    }

    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.hidden = false;
    // play; ensure resumed
    await audioPlayer.play().catch(async (e)=>{
      console.warn('Audio play blocked, try resume audioCtx', e);
      ensureAudioContext();
      try { await audioPlayer.play(); } catch(e2){ console.error('play failed again', e2); appendMessage('bot','⚠️ Không thể phát âm thanh (autoplay bị chặn).'); }
    });

    // animate avatar while audio playing
    avatar.classList.add('avatar-speaking');
    audioPlayer.onended = ()=> avatar.classList.remove('avatar-speaking');

  } catch (err) {
    appendMessage('bot','⚠️ Không thể phát âm thanh.');
    console.error('speakText error:', err);
  }
}

speakBtn.addEventListener('click', async () => {
  // speak last bot reply or content of input
  const lastBot = [...chatBox.querySelectorAll('.message.bot')].pop();
  const toSpeak = lastBot ? lastBot.textContent : userInput.value.trim();
  if (!toSpeak) { alert('Chưa có nội dung để ThamAI nói.'); return; }
  await speakText(toSpeak, voiceSelect.value);
});

// ----------------------
// Voice selection: persist to localStorage
// ----------------------
function loadVoiceSetting() {
  try {
    const v = localStorage.getItem('thamai_voice') || 'female';
    voiceSelect.value = v;
    persistVoiceCheckbox.checked = (localStorage.getItem('thamai_persist') !== '0');
    autoTTSCheckbox.checked = (localStorage.getItem('thamai_auto_tts') === '1');
    showWaveCheckbox.checked = (localStorage.getItem('thamai_show_wave') !== '0');
  } catch(e){}
}
loadVoiceSetting();

voiceSelect.addEventListener('change', ()=>{
  if (persistVoiceCheckbox.checked) localStorage.setItem('thamai_voice', voiceSelect.value);
});
persistVoiceCheckbox.addEventListener('change', ()=>{
  if (!persistVoiceCheckbox.checked) localStorage.removeItem('thamai_voice');
  localStorage.setItem('thamai_persist', persistVoiceCheckbox.checked ? '1' : '0');
});
autoTTSCheckbox.addEventListener('change', ()=>localStorage.setItem('thamai_auto_tts', autoTTSCheckbox.checked ? '1' : '0'));
showWaveCheckbox.addEventListener('change', ()=>localStorage.setItem('thamai_show_wave', showWaveCheckbox.checked ? '1' : '0'));

// test voice button
testVoiceBtn.addEventListener('click', async ()=>{
  const sample = "Xin chào, tôi là ThạchAI. Đây là thử giọng.";
  await speakText(sample, voiceSelect.value);
});

// small avatar blink (interval)
setInterval(()=>{
  avatar.classList.add('blink');
  setTimeout(()=>avatar.classList.remove('blink'), 200);
}, 6000);

// simple waveform display (microphone amplitude)
let canvasCtx=null;
if (waveCanvas) {
  waveCanvas.width = waveCanvas.clientWidth;
  waveCanvas.height = 80;
  canvasCtx = waveCanvas.getContext('2d');
}
let analyser = null;
let micStream = null;
async function startWave() {
  if (!showWaveCheckbox.checked) { canvasCtx && canvasCtx.clearRect(0,0,waveCanvas.width,waveCanvas.height); return; }
  try {
    if (!audioCtx) ensureAudioContext();
    if (!micStream) {
      const s = await navigator.mediaDevices.getUserMedia({audio:true});
      micStream = audioCtx.createMediaStreamSource(s);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      micStream.connect(analyser);
      drawWave();
    }
  } catch(e){
    console.warn('startWave error', e);
  }
}
function drawWave() {
  if (!analyser || !canvasCtx) return;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
  canvasCtx.fillStyle = 'rgba(0,0,0,0)';
  canvasCtx.clearRect(0,0,waveCanvas.width,waveCanvas.height);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = '#46c2ff';
  canvasCtx.beginPath();
  const sliceWidth = waveCanvas.width / bufferLength;
  let x = 0;
  for (let i=0;i<bufferLength;i++){
    const v = dataArray[i]/128.0;
    const y = v * waveCanvas.height/2;
    if(i===0) canvasCtx.moveTo(x,y); else canvasCtx.lineTo(x,y);
    x += sliceWidth;
  }
  canvasCtx.lineTo(waveCanvas.width, waveCanvas.height/2);
  canvasCtx.stroke();
  requestAnimationFrame(drawWave);
}
showWaveCheckbox.addEventListener('change', ()=> { if (showWaveCheckbox.checked) startWave(); else { canvasCtx.clearRect(0,0,waveCanvas.width,waveCanvas.height); } });
if (showWaveCheckbox.checked) startWave();

// quick welcome message
appendMessage('bot','Chào bạn! ThamAI sẵn sàng.');

// ensure proper cleanup on page unload
window.addEventListener('beforeunload', ()=> {
  try { if (micStream) micStream.disconnect(); if (audioCtx) audioCtx.close(); } catch(e){}
});
