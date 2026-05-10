/* ================================================
   🎤 ThamAI Ultra+ v3.0 – Gemini Stable
   ================================================ */

const BACKEND_URL = "https://thamai-backend-new.onrender.com/chat";

const textInput = document.getElementById("text-input");
const sendBtn = document.getElementById("send-btn");
const chatLog = document.getElementById("chat-log");
const micBtn = document.getElementById("mic-btn");
const switchVoiceBtn = document.getElementById("switch-voice");

const avatar = document.getElementById("avatar");
const mouth = document.getElementById("mouth");
const wave = document.getElementById("wave");
const bars = wave.querySelectorAll(".bar");

let currentVoice = "female";
let isSpeaking = false;
let recognition;
let analyser, micStream, audioContext;
let mouthTimer;

/* ======================================================
   💬 GỬI TIN NHẮN
====================================================== */
sendBtn.addEventListener("click", async () => {

  const text = textInput.value.trim();

  if (!text) return;

  addMessage(text, "user");

  textInput.value = "";

  addMessage("⏳ ThamAI đang suy nghĩ...", "system");

  try {

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text
      })
    });

    // XÓA dòng loading
    removeLastSystemMessage();

    if (!response.ok) {
      addMessage(`❌ Lỗi server: ${response.status}`, "system");
      return;
    }

    const data = await response.json();

    const reply =
      data.reply ||
      "⚠️ AI không trả lời.";

    addMessage(reply, "system");

    speakText(reply);

  } catch (error) {

    console.error("CHAT ERROR:", error);

    removeLastSystemMessage();

    addMessage(
      "❌ Không kết nối được backend AI.",
      "system"
    );
  }
});

/* ======================================================
   🎙️ SPEECH RECOGNITION
====================================================== */
micBtn.addEventListener("click", () => {

  if (recognition && recognition.recognizing) {
    recognition.stop();
    micBtn.innerText = "🎤 Nói";
    return;
  }

  startListening();
});

function startListening() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Trình duyệt không hỗ trợ Speech Recognition");
    return;
  }

  recognition = new SpeechRecognition();

  recognition.lang = "vi-VN";

  recognition.interimResults = false;

  recognition.onstart = () => {
    micBtn.innerText = "🛑 Dừng";
  };

  recognition.onresult = async (e) => {

    const text = e.results[0][0].transcript;

    addMessage(text, "user");

    addMessage("⏳ ThamAI đang suy nghĩ...", "system");

    try {

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text
        })
      });

      removeLastSystemMessage();

      if (!response.ok) {
        addMessage(`❌ Lỗi server: ${response.status}`, "system");
        return;
      }

      const data = await response.json();

      const reply =
        data.reply ||
        "⚠️ AI không phản hồi.";

      addMessage(reply, "system");

      speakText(reply);

    } catch (error) {

      console.error(error);

      removeLastSystemMessage();

      addMessage(
        "❌ Không kết nối được AI backend.",
        "system"
      );
    }
  };

  recognition.onend = () => {
    micBtn.innerText = "🎤 Nói";
  };

  recognition.start();
}

/* ======================================================
   🗣️ TEXT TO SPEECH
====================================================== */
function speakText(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = "vi-VN";

  utter.rate = 1.0;

  utter.pitch =
    currentVoice === "female"
      ? 1.2
      : 0.9;

  const voices =
    window.speechSynthesis.getVoices();

  const vnVoices =
    voices.filter(v => v.lang === "vi-VN");

  if (vnVoices.length > 0) {

    utter.voice =
      vnVoices[
        currentVoice === "female"
          ? 0
          : 1
      ];
  }

  utter.onstart = () => {

    isSpeaking = true;

    startLipSync();

    setEmotion("happy");
  };

  utter.onend = () => {

    isSpeaking = false;

    stopLipSync();

    setEmotion("neutral");
  };

  window.speechSynthesis.speak(utter);
}

/* ======================================================
   🔊 LIPSYNC
====================================================== */
function startLipSync() {

  mouth.classList.add("speaking");

  clearInterval(mouthTimer);

  mouthTimer = setInterval(() => {

    if (!isSpeaking) return;

    const rand = Math.random();

    mouth.style.transform =
      `translateX(-50%) scaleY(${1 + rand * 1.2})`;

    mouth.style.boxShadow =
      `0 0 ${15 + rand * 20}px rgba(255,150,150,0.8)`;

    bars.forEach(bar => {
      bar.style.height =
        `${5 + Math.random() * 25}px`;
    });

  }, 120);
}

function stopLipSync() {

  mouth.classList.remove("speaking");

  clearInterval(mouthTimer);

  bars.forEach(bar => {
    bar.style.height = "10px";
  });
}

/* ======================================================
   💫 EMOTION
====================================================== */
function setEmotion(state) {

  avatar.classList.remove(
    "happy",
    "sad",
    "surprised"
  );

  if (state === "happy")
    avatar.classList.add("happy");

  else if (state === "sad")
    avatar.classList.add("sad");

  else if (state === "surprised")
    avatar.classList.add("surprised");
}

/* ======================================================
   🔄 SWITCH VOICE
====================================================== */
switchVoiceBtn.addEventListener("click", () => {

  currentVoice =
    currentVoice === "female"
      ? "male"
      : "female";

  switchVoiceBtn.innerText =
    `Đổi giọng: ${
      currentVoice === "female"
        ? "👩"
        : "👨"
    }`;
});

/* ======================================================
   💌 HELPER
====================================================== */
function addMessage(text, sender) {

  const msg = document.createElement("div");

  msg.className = `msg ${sender}`;

  msg.textContent = text;

  chatLog.appendChild(msg);

  chatLog.scrollTop =
    chatLog.scrollHeight;
}

function removeLastSystemMessage() {

  const msgs =
    document.querySelectorAll(".msg.system");

  if (msgs.length > 0) {

    const last =
      msgs[msgs.length - 1];

    if (
      last.textContent.includes("đang suy nghĩ")
    ) {
      last.remove();
    }
  }
}
