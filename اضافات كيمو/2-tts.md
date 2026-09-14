# 2) قراءة الكومنتات صوتياً (TTS) — التوثيق الكامل

> الكومنتات بتتقرا بصوت طبيعي (أصوات عربية/عالمية) على جهاز اللي بيبث وأيضاً
> على أوفرلاي OBS — مع صلاحيات (فولو/سب/مود/لايكات/كوينز)، فلاتر (بلاك ليست/
> أوامر/سبام/منشن)، كولداون لكل مستخدم، ومنع التراكم والسكتة الفورية عند الفصل.

---

## 1) الفكرة إزاي شغالة (المعمارية)

```
كومنت جديد من التيك توك
   ▼
backend event-runner.processTtsForComment()
   1. إعدادات TTS مفعلة؟
   2. صلاحيات: الجميع/فولو/سب/مود/عدد لايكات/عدد كوينز
   3. كتم مؤقت؟ (أول 8 ثواني بعد الكونكت = دفعة شات قديم، أو بعد الفصل)
   4. فلاتر: بلاك ليست + أوامر (!) + سبام حروف + المنشن @
   5. كولداون لكل مستخدم (5 ثواني افتراضي)
   6. سقف تزامن (2 كحد أقصى في نفس اللحظة — الزيادة تتشال)
   7. توليد الصوت: EdgeTTS → ملف mp3 مؤقت → base64
   ▼
emit("play-local-tts", { text, audioBase64, config })
   ├──→ للبرنامج (WS) → الرندرر يشغله بطابور منظم (أقصى 2 مستنيين)
   └──→ للأوفرلاي (overlayServer.queueTTS) → صفحة OBS تشغّله هي كمان
```

**دروس مستفادة من أعطال حقيقية (مهم جداً قبل النقل):**
- `const comment` وبتتعدل في نفس الدالة = crash يسقط السيرفر كله (أي كومنت فيه @)
- العداد الحامي من التراكم لو اترفع **قبل** الـ early-returns بيتسرب ويقفل TTS للأبد
- **مشغلين** لنفس الصوت في نفس الصفحة = صوتين فوق بعض (كانت أشهر شكوى)
- أول الكونكت تيك توك بيبعت دفعة الكومنتات القديمة — من غير كتم بيقراهم ورا بعض

---

## 2) كود الباك إند — `backend/src/services/event-runner.js`

### 2.1) الحقول في الكونستركتور

```js
this.ttsTempDir = path.join(process.cwd(), "temp_tts");
this._ensureTtsDir();
this._ttsCooldowns = {};   // آخر مرة اتقرا كل مستخدم
this._ttsMuteUntil = 0;    // كتم مؤقت (بعد الكونكت / بعد الفصل)
this._ttsPending = 0;      // عداد التوليدات الجارية — سقف التزامن
```

### 2.2) الدالة الرئيسية (كاملة كما هي)

```js
async processTtsForComment(chatData) {
  const ttsCfg = this.store.get("widget_tts");
  if (!ttsCfg || !ttsCfg.enabled) return;

  const user = chatData.user || chatData.uniqueId || chatData.nickname;
  let comment = String(chatData.comment ?? "");
  const likerCount = this.globalStats._likers[user]?.count || 0;
  const gifterCount = this.globalStats._gifters[user]?.count || 0;

  // ---- الصلاحيات ----
  let allowed = false;
  if (ttsCfg.permAll) {
    allowed = true;
  } else {
    if (ttsCfg.permFollowers && chatData.isFollower) allowed = true;
    if (ttsCfg.permSubscribers && chatData.isSubscriber) allowed = true;
    if (ttsCfg.permModerators && chatData.isModerator) allowed = true;
  }
  if (!allowed) {
    if (ttsCfg.permLikes > 0 && likerCount >= ttsCfg.permLikes) allowed = true;
    if (ttsCfg.permCoins > 0 && gifterCount >= ttsCfg.permCoins) allowed = true;
  }
  if (!allowed) return;

  // أول ثواني بعد الكونكت بتجيب دفعة شات قديم من تيك توك — ما نقراهاش
  if (Date.now() < (this._ttsMuteUntil || 0)) return;

  // ---- الفلاتر ----
  let isBlocked = false;
  if (ttsCfg.blacklist && ttsCfg.blacklist.trim() !== "") {
    const blacklist = ttsCfg.blacklist.split(",").map((b) => b.trim().toLowerCase());
    const lower = comment.toLowerCase();
    for (const word of blacklist) {
      if (word && lower.includes(word)) { isBlocked = true; break; }
    }
  }

  // المنشن (@handle): علامة @ بتلخبط قارئ Edge فبتتقرا صامتة
  //   • فلتر المنشن مفعّل  → نشيل المنشن ونقرأ باقي الجملة
  //   • فلتر المنشن مقفول → نستبدل @handle بكلمة "منشن"
  //   • رسالة منشن بس من غير كلام → متتقراش
  let hasMeaningful = true;
  if (comment.includes("@")) {
    if (ttsCfg.filterMentions) {
      comment = comment.replace(/@[\w.\-]+/g, " ").replace(/\s+/g, " ").trim();
      if (!comment) hasMeaningful = false;
    } else {
      comment = comment.replace(/@[\w.\-]+/g, " منشن ").replace(/\s+/g, " ").trim();
      if (!comment.replace(/منشن/g, "").trim()) hasMeaningful = false;
    }
  }
  if (ttsCfg.filterCmds && comment.startsWith("!")) isBlocked = true;
  if (ttsCfg.filterLetter && /(.)\1{4,}/.test(comment)) isBlocked = true;

  const maxLen = ttsCfg.maxLen || 150;
  let cleanText = comment.length > maxLen ? comment.substring(0, maxLen) : comment;
  if (isBlocked || !cleanText.trim() || !hasMeaningful) return;

  // ---- الكولداون لكل مستخدم ----
  const now = Date.now();
  const lastTts = this._ttsCooldowns[user] || 0;
  const cooldownMs = (ttsCfg.cooldown || 5) * 1000;
  if (now - lastTts < cooldownMs) return;
  this._ttsCooldowns[user] = now;

  // سقف التزامن: وقت الزحمة نرمي الزيادة بدل ما الصوت يتراكم
  // (بعد كل الـ returns المبكرة — أي return بعد الزيادة لازم يعدي بالـ finally)
  if ((this._ttsPending || 0) >= 2) return;
  this._ttsPending++;

  // ---- اختيار الصوت ----
  let voice = ttsCfg.voiceURI;
  if (!voice || ttsCfg.randomVoice) {
    const arabicVoices = [
      "ar-EG-SalmaNeural", "ar-EG-ShakirNeural", "ar-SA-ZariyahNeural",
      "ar-SA-HamedNeural", "ar-AE-FatimaNeural", "ar-AE-HamdanNeural",
      "ar-JO-SanaNeural", "ar-JO-TaimNeural", "ar-SY-AmanyNeural",
      "ar-SY-LaithNeural", "ar-QA-AmalNeural", "ar-QA-AliNeural",
      "ar-KW-NouraNeural", "ar-KW-FahedNeural", "ar-MA-MounaNeural",
      "ar-MA-JamalNeural",
    ];
    voice = arabicVoices[Math.floor(Math.random() * arabicVoices.length)];
  }

  // سرعة/نبرة/صوت بصيغة EdgeTTS (+20% مثلاً)
  const rate   = (Math.round(((ttsCfg.speed || 1) - 1) * 100) >= 0 ? "+" : "") + Math.round(((ttsCfg.speed || 1) - 1) * 100) + "%";
  const pitch  = (Math.round(((ttsCfg.pitch || 1) - 1) * 50)  >= 0 ? "+" : "") + Math.round(((ttsCfg.pitch || 1) - 1) * 50)  + "Hz";
  const volume = (Math.round(((ttsCfg.volume || 1) - 1) * 100) >= 0 ? "+" : "") + Math.round(((ttsCfg.volume || 1) - 1) * 100) + "%";

  const edge = new EdgeTTS({ voice, rate, pitch, volume });
  const tempFile = path.join(this.ttsTempDir,
    `temp_tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

  try {
    await edge.ttsPromise(cleanText, tempFile);
    const audioBase64 = fs.readFileSync(tempFile, "base64");
    const ttsPayload = { text: cleanText, audioBase64, config: ttsCfg };
    this.overlayServer.queueTTS("1", ttsPayload);   // أوفرلاي OBS
    this.emit("play-local-tts", ttsPayload);        // البرنامج (WS)
  } catch (err) {
    // فشل التوليد → ابعغ النص بس (الصفحة بتستخدم speechSynthesis كبديل)
    const fallbackPayload = { text: cleanText, config: ttsCfg };
    this.overlayServer.queueTTS("1", fallbackPayload);
    this.emit("play-local-tts", fallbackPayload);
  } finally {
    this._ttsPending = Math.max(0, (this._ttsPending || 1) - 1);
    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
  }
}
```

### 2.3) الكتم والوقف (مهم جداً)

```js
// أول ثواني بعد الكونكت: دفعة الشات القديم من تيك توك ما تتقراش
onTikTokConnected() {
  this._ttsMuteUntil = Date.now() + 8000;
  this._ttsPending = 0;   // أمان إضافي — أي تسريب يمسي مع الكونكت الجديد
}

// فصل: امسك أي TTS جاي (حتى اللي في نص تخليق) + بلّغ العملاء توقف فوري
stopTTS() {
  this._ttsMuteUntil = Date.now() + 10 * 60 * 1000;
  this.emit("stop-local-tts", {});
}
```

**وين بينادوا؟** في `server.js`:
```js
// بعد نجاح /api/tiktok/connect:
ctx.eventRunner.onTikTokConnected();

// في /api/tiktok/disconnect:
if (ctx.eventRunner) ctx.eventRunner.stopTTS();

// وفي event-runner نفسه عند انقطاع التيك توك:
ts.on("disconnected", () => { this.stopTTS(); /* ... */ });
```

### 2.4) حماية إضافية — TTS ما يوقعش السيرفر أبداً

```js
// في مستمع الشات: النيداء متغلف بـ try — أي استثناء في التوليد يتسجل ويتساهل
ts.on("chat", (data) => {
  // ...
  try { this.processTtsForComment(data); }
  catch (e) { console.warn("[TTS] skipped:", e.message); }
});
```

### 2.5) التبعية: `npm i node-edge-tts`

---

## 3) كود الفرونت إند (Electron)

### 3.1) `frontend/main.js` — تحويل حدث التشغيل للرندرر

```js
wsClient.on("message", (raw) => {
  const msg = JSON.parse(raw);
  // ...
  else if (msg.type === "play-local-tts") {
    mainWindow?.webContents.send("play-local-tts", msg.data);
  }
  // stop-local-tts بيتم تحويله تلقائياً (أي type مش معروف بيتحول بنفس اسمه)
});
```

### 3.2) `frontend/preload.src.js`

```js
overlay: {
  // ...
  onPlayLocalTTS: (callback) =>
    ipcRenderer.on("play-local-tts", (_, data) => callback(data)),
  onStopLocalTTS: (callback) =>
    ipcRenderer.on("stop-local-tts", () => callback()),
},
```

### 3.3) `frontend/src/renderer.js` — المشغل الوحيد (طابور + إيقاف)

⚠️ **درس مهم:** كان فيه مشغلين مسجلين على نفس الحدث (طابور تسلسلي + مشغل فوري
بيقطع) → كل كومنت بيتقرا مرتين بصوتين فوق بعض. **مشغل واحد بس** هو الصح.

```js
const localTtsQueue = [];
let localTtsSpeaking = false;
let localTtsCurrent = null;

// إيقاف فوري لكل حاجة صوتية — عند الفصل أو بإشارة من السيرفر
function stopLocalTTS() {
  localTtsQueue.length = 0;
  try {
    if (localTtsCurrent) {
      localTtsCurrent.onended = null;
      localTtsCurrent.onerror = null;
      localTtsCurrent.pause();
      localTtsCurrent.removeAttribute("src");
    }
  } catch (err) {}
  localTtsCurrent = null;
  localTtsSpeaking = false;
}

api.overlay.onPlayLocalTTS(p33 => {
  // سقف الطابور: لو زحمة كومنتات نرمي الأقدم ونقرا الأحدث بس — مفيش تراكم
  while (localTtsQueue.length >= 2) localTtsQueue.shift();
  localTtsQueue.push(p33);
  processLocalTTSQueue();
});

// إشارة توقف من السيرفر (عند disconnect أو انقطاع التيك توك)
if (typeof api.overlay?.onStopLocalTTS === "function") {
  api.overlay.onStopLocalTTS(() => stopLocalTTS());
}

function processLocalTTSQueue() {
  if (localTtsSpeaking || localTtsQueue.length === 0) return;
  localTtsSpeaking = true;
  const v45 = localTtsQueue.shift();
  if (v45.audioBase64 || v45.url) {
    const audio = new Audio(v45.audioBase64 ? "data:audio/mp3;base64," + v45.audioBase64 : v45.url);
    localTtsCurrent = audio;
    let vol = 1;
    if (v45.config && v45.config.volume !== undefined) vol = v45.config.volume;
    else if (v45.volume !== undefined) vol = v45.volume;
    audio.volume = vol;
    audio.onended = () => { localTtsSpeaking = false; setTimeout(processLocalTTSQueue, 500); };
    audio.onerror = () => { localTtsSpeaking = false; setTimeout(processLocalTTSQueue, 500); };
    audio.play().catch(err => { localTtsSpeaking = false; setTimeout(processLocalTTSQueue, 500); });
  } else {
    // مفيش صوت جاهز — الصفحة (أوفرلاي) بتستخدم speechSynthesis كبديل
    localTtsSpeaking = false;
    processLocalTTSQueue();
  }
}

// ⭐ أهم سطر: أي فصل يوقف الصوت فوراً — جوه setDisconnected الموجودة عندك
function setDisconnected() {
  try { stopLocalTTS(); } catch (err) {}
  // ... باقي منطق الفصل ...
}
```

---

## 4) شكل الإعدادات (`widget_tts` في الـ store)

```js
{
  enabled: true,
  voiceURI: "ar-EG-SalmaNeural",  // أو فاضي + randomVoice
  randomVoice: false,
  speed: 1, pitch: 1, volume: 1,   // مضاعفات
  permAll: true,                    // أو صلاحيات مفصلة:
  permFollowers: false, permSubscribers: false, permModerators: true,
  permLikes: 0,                     // عدد لايكات يفتح التحدث (0 = مقفول)
  permCoins: 0,                     // عدد كوينز يفتح التحدث
  cooldown: 5,                      // ثواني بين كل قراءة لنفس المستخدم
  maxLen: 150,                      // أقصى طول نص
  blacklist: "كلمة1,كلمة2",
  filterCmds: true,                 // تجاهل الأوامر (!)
  filterLetter: true,               // تجاهل السبام (حرف متكرر)
  filterMentions: false             // true: شيل @handle — false: اقراها "منشن"
}
```

## 5) نقاط الدمج في مشروع جديد

| الاحتياج | التفاصيل |
|---|---|
| مكتبة التوليد | `npm i node-edge-tts` (صوت مايكروسوفت نيورال مجاني بدون مفاتيح) |
| مسار مؤقت | مجلد `temp_tts` بجانب المشروع + مسح الملف بعد كل قراءة |
| قواعد ذهبية | مشغل واحد بس + طابور بسقف + stopLocalTTS في setDisconnected + try/catch حوالين التوليد |
| كتم بعد الكونكت | 8 ثواني — بيمنع قراءة دفعة الشات القديم |
| العداد `_ttsPending` | لازم يزيد **بعد** كل الـ early returns ومباشرة قبل التوليد، والخصم في `finally` |
