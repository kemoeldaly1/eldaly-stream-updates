# 1) اللايف فيد (Live Feed) — التوثيق الكامل

> كل اللي بيحصل في اللايف (كومنتات/لايكات/جيفتس/فولو/دخول/مشاركة) بيوصلك بالاسم
> **وصورة** اللي عمله، لحظة بلحظة، في صفحة مستقلة في البرنامج.

---

## 1) الفكرة إزاي شغالة (المعمارية)

```
تيك توك LIVE
   │  (tiktok-live-connector v2 — أحداث protobuf خام)
   ▼
backend/src/services/tiktok.js      ← تطبيع الأحداث: بيسحب الاسم/الصورة من msg.user
   │  this.emit("chat", { user, nickname, avatar, comment, ... })
   ▼
backend/src/services/event-runner.js ← مستمعات لكل حدث: إحصائيات + إعادة بث + تريجرات أكشنز
   │  this.emit("tiktok:chat", data)
   ▼
backend/src/services/accounts.js     ← بيبث الحدث على WebSocket لجهاز العميل
   │  broadcastEvent("tiktok:chat", data)
   ▼
frontend/main.js                     ← WS client: بيحول أي حدث للرندرر
   │  webContents.send("tiktok:chat", data)
   ▼
frontend/src/renderer.js             ← addFeedItem: بي رسم الصف في الواجهة بالصورة
```

**الدرس الأهم (سبب عطل حقيقي حصل):** مكتبة `tiktok-live-connector` النسخة 2.x
بتبعت الأحداث **protobuf مدفونة**: بيانات العضو جوه `msg.user` والصورة جوه
`msg.user.profilePictureMedium.url` — مش مسطحة زي النسخة 1 (`msg.nickname` /
`msg.profilePictureUrl`). الكومنت نفسه (`msg.comment`) و`likeCount` فاضلين في
المستوى العلوي — عشان كده العطل كان "نص شغل": النص بيظهر والاسم/الصورة undefined.

---

## 2) كود الباك إند

### 2.1) `backend/src/services/tiktok.js` — طبقة التطبيع (قلب النظام)

```js
// ====== تسطيح بيانات المكتبة ======
// tiktok-live-connector v2.1.1-beta بتبعت الرسائل protobuf خام:
// بيانات العضو مدفونة في msg.user والصورة في Image.url — مش مسطحة زي v1.
// الدوال دي بتحوّل الشكلين للشكل الموحد اللي باقي البرنامج بيتوقعه
// (user / uniqueId / nickname / avatar / badges في مستوى واحد).

_imgUrl(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (Array.isArray(img.url) && img.url.length) return img.url[0];
  if (Array.isArray(img.url_list) && img.url_list.length)
    return img.url_list[0];
  return "";
}

_userOf(e) {
  const u = e && e.user && typeof e.user === "object" ? e.user : {};
  const uniqueId = u.uniqueId || e.uniqueId || "";
  const badges = [];
  let isMod = !!e.isModerator;
  const rawBadges = Array.isArray(u.badges)
    ? u.badges
    : Array.isArray(e.badges)
      ? e.badges
      : [];
  for (const b of rawBadges) {
    if (!b || typeof b !== "object") continue;
    // v2: badgeScene — 1 = أدمن/موديراتور، 4/7 = مشترك
    if (b.badgeScene === 1) {
      badges.push("moderator");
      isMod = true;
    } else if (b.badgeScene === 4 || b.badgeScene === 7) {
      badges.push("subscriber");
    } else if (typeof b.type === "string") {
      badges.push(b.type);
      if (b.type.includes("moderator")) isMod = true;
    }
  }
  const isSubscriber = !!(u.isSubscribe || e.isSubscriber);
  if (isSubscriber && !badges.includes("subscriber"))
    badges.push("subscriber");
  const isFollower = !!(u.isFollower || e.isFollower);
  if (isFollower && !badges.includes("follower")) badges.push("follower");
  return {
    user: uniqueId,
    uniqueId,
    nickname: u.nickname || e.nickname || "",
    userId: String(u.userId || u.idStr || e.userId || ""),
    avatar:
      this._imgUrl(u.profilePictureMedium) ||
      this._imgUrl(u.profilePicture) ||
      this._imgUrl(u.profilePictureLarge) ||
      this._imgUrl(u.avatarJpg) ||
      this._imgUrl(u.avatarThumb) ||
      (typeof u.profilePictureUrl === "string" ? u.profilePictureUrl : "") ||
      (typeof e.profilePictureUrl === "string" ? e.profilePictureUrl : ""),
    isFollower,
    isSubscriber,
    isModerator: isMod,
    badges,
  };
}
```

### 2.2) نفس الملف — مستمعات الأحداث (كل حدث بيستخدم `_userOf`)

```js
_setupListeners(options) {
  if (!this.client) return;

  this.client.on("chat", (msg) => {
    this.emit("chat", { ...this._userOf(msg), comment: msg.comment });
  });

  this.client.on("like", (like) => {
    this.emit("like", {
      ...this._userOf(like),
      likeCount: like.likeCount,
      totalLikeCount: like.totalLikeCount,
    });
  });

  this.client.on("follow", (follow) => {
    this.emit("follow", this._userOf(follow));
  });

  this.client.on("member", (member) => {          // انضمام للبث
    this.emit("join", this._userOf(member));
  });

  this.client.on("share", (share) => {
    this.emit("share", this._userOf(share));
  });

  // v2 ما بتبعتش حدث "subscribe" مستقل — رسالة social من نوع اشتراك بنحولها
  this.client.on("social", (soc) => {
    try {
      const dt = soc?.common?.displayText?.displayType || "";
      if (String(dt).includes("subscribe")) {
        this.emit("subscribe", this._userOf(soc));
      }
    } catch (e) {}
  });

  this.client.on("subscribe", (sub) => {
    this.emit("subscribe", this._userOf(sub));
  });

  // (الجيفتات ليها معالجة خاصة — streaks + بيانات الجيفت من giftDetails —
  //  موثقة في ملف السونج ريكويست لأنها بتغذي النقاط)
}
```

### 2.3) `backend/src/services/event-runner.js` — استقبال الأحداث وإعادة بثها

```js
setupTikTokListeners() {
  const ts = this.tiktokService;
  ts.removeAllListeners();   // ⚠️ مهم: بتمسح كل المستمعات — أي hook تاني لازم يتسجل بعدها

  ts.on("chat", (data) => {
    this.globalStats.comments++;
    // ... تراكم topCommenters للويدجت ...
    this.overlayServer.broadcastStats(this.globalStats);
    this.overlayServer.broadcastEvent("chat", data);   // للأوفرلاي
    this.emit("tiktok:chat", data);                    // للبرنامج (اللايف فيد)
    this.executeEventTriggers("comment", data);        // أكشنز المستخدم
    try { this.processTtsForComment(data); } catch (e) { /* TTS ما يوقعش السيرفر */ }
  });

  ts.on("like", (data) => {
    this.globalStats.likes += data.likeCount || 1;
    // ... topLikers ...
    this.overlayServer.broadcastStats(this.globalStats);
    this.overlayServer.broadcastEvent("like", data);
    this.emit("tiktok:like", data);
    this.executeEventTriggers("like", data);
    this.checkTotalEventTriggers("likes", data.likeCount || 1, data);
    this.checkWidgetGoals("likes", data.likeCount || 1, data);
  });

  ts.on("gift", (data)  => { /* نفس النمط: gifts + totalCoins + topGifters + emit */ });
  ts.on("follow", (data)=> { /* followers++ + emit */ });
  ts.on("member", (data)=> { /* emit tiktok:join */ });
  ts.on("share", (data) => { /* shares++ + emit */ });
  ts.on("subscribe", (data) => { /* emit tiktok:subscribe */ });
}
```

### 2.4) `backend/src/services/accounts.js` — بث الحدث لجهاز العميل

```js
_wireRunner() {
  const runnerEvents = [
    "connection-status",
    "tiktok:chat", "tiktok:gift", "tiktok:like", "tiktok:follow",
    "tiktok:join", "tiktok:share", "tiktok:subscribe", "tiktok:streamEnd",
    "tiktok:error",
    // ... أحداث تانية (ext/tts/webhook) ...
  ];
  for (const ev of runnerEvents) {
    this.eventRunner.on(ev, (data) => this.broadcastEvent(ev, data));
  }
}

broadcastEvent(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const client of this.wsClients) {
    if (client.readyState === WebSocket.OPEN && !client._guest) {
      try { client.send(msg); } catch (e) {}
    }
  }
}
```

> ⚠️ **فخ مهم:** `setupTikTokListeners()` بتعمل `removeAllListeners()` — لو عندك
> hook على خدمة تيك توك (زي أوامر الأغاني) لازم يتسجل **بعد** كل نداء ليها
> (شوف ملف السونج ريكويست — bindChatHook).

---

## 3) كود الفرونت إند (Electron)

### 3.1) `frontend/main.js` — استقبال أحداث السيرفر وإحالتها للواجهة

```js
wsClient.on("message", (raw) => {
  try {
    const msg = JSON.parse(raw);
    if (!msg || !msg.type) return;
    if (msg.type === "client:pressKeys" && msg.data) { /* ضغطات كيبورد محلية */ }
    else if (msg.type === "client:webhook" && msg.data) { /* ويب هوك محلي */ }
    else if (msg.type === "play-local-tts") { mainWindow?.webContents.send("play-local-tts", msg.data); }
    else if (msg.type?.startsWith("ov:")) { handleOverlayEvent(msg.type, msg.data); }
    else {
      // ✅ أي حدث تاني (tiktok:chat / tiktok:like / ...) يوصل للرندرر بنفس اسمه
      mainWindow?.webContents.send(msg.type, msg.data);
    }
  } catch (e) {}
});
```

### 3.2) `frontend/preload.src.js` — الجسور الآمنة للرندرر

```js
tiktok: {
  connect: (username) => ipcRenderer.invoke("tiktok:connect", username),
  disconnect: () => ipcRenderer.invoke("tiktok:disconnect"),
  status: () => ipcRenderer.invoke("tiktok:status"),
  getAvatar: (user) => ipcRenderer.invoke("tiktok:getAvatar", user),
  onChat: (cb) => ipcRenderer.on("tiktok:chat", (_, data) => cb(data)),
  onGift: (cb) => ipcRenderer.on("tiktok:gift", (_, data) => cb(data)),
  onLike: (cb) => ipcRenderer.on("tiktok:like", (_, data) => cb(data)),
  onFollow: (cb) => ipcRenderer.on("tiktok:follow", (_, data) => cb(data)),
  onJoin: (cb) => ipcRenderer.on("tiktok:join", (_, data) => cb(data)),
  onShare: (cb) => ipcRenderer.on("tiktok:share", (_, data) => cb(data)),
  onSubscribe: (cb) => ipcRenderer.on("tiktok:subscribe", (_, data) => cb(data)),
  onStreamEnd: (cb) => ipcRenderer.on("tiktok:streamEnd", () => cb()),
  onError: (cb) => ipcRenderer.on("tiktok:error", (_, msg) => cb(msg)),
},
```

### 3.3) `frontend/src/renderer.js` — رسم الفيد (بالصورة + fallback للإيموجي)

```js
api.tiktok.onChat(p => {
  stats.comments++;
  updateStats();
  addFeedItem("chat", p.nickname || p.user, p.comment, "💬", p.avatar);
});
api.tiktok.onGift(p => {
  stats.gifts += p.repeatCount || 1;
  updateStats();
  addFeedItem("gift", p.nickname || p.user, p.giftName + " x" + p.repeatCount, "🎁", p.avatar);
});
api.tiktok.onLike(p => {
  stats.likes += p.likeCount || 1;
  updateStats();
  addFeedItem("like", p.nickname || p.user, (p.likeCount || 1) + " likes", "❤️", p.avatar);
});
api.tiktok.onFollow(p => {
  stats.followers++;
  updateStats();
  addFeedItem("follow", p.nickname || p.user, "New follower", "➕", p.avatar);
});
api.tiktok.onJoin(p  => addFeedItem("join",   p.nickname || p.user, "Joined the stream", "👋", p.avatar));
api.tiktok.onShare(p => addFeedItem("system", p.nickname || p.user, "Shared the stream", "🔄", p.avatar));
api.tiktok.onSubscribe(p => addFeedItem("system", p.nickname || p.user, "Subscribed!", "⭐", p.avatar));
api.tiktok.onStreamEnd(() => {
  setDisconnected();
  addFeedItem("system", "System", "Stream ended", "🔴");
});

const feedList = document.getElementById("feed-list");
let feedCount = 0;
function addFeedItem(type, user, text, emoji, avatarUrl) {
  if (feedCount === 0) feedList.innerHTML = "";
  feedCount++;
  const item = document.createElement("div");
  item.className = "feed-item";
  const time = new Date().toLocaleTimeString("en-US",
    { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  // الصورة بتغطي الإيموجي — ولو فشل تحميلها الإيموجي بيرجع تلقائيًا
  const avatar = avatarUrl
    ? '<img class="feed-item-avatar" src="' + escapeAttr(avatarUrl) + '" alt="" loading="lazy" ' +
      'referrerpolicy="no-referrer" onerror="this.remove();var s=this.parentNode&&' +
      "this.parentNode.querySelector('.feed-item-emoji');if(s)s.classList.remove('hidden')\">"
    : "";
  item.innerHTML =
    '<div class="feed-item-icon ' + type + '">' + avatar +
    '<span class="feed-item-emoji' + (avatarUrl ? " hidden" : "") + '">' + emoji + '</span></div>' +
    '<div class="feed-item-content">' +
      '<div class="feed-item-user">' + escapeHtml(user) + '</div>' +
      '<div class="feed-item-text">' + escapeHtml(text) + '</div>' +
    '</div>' +
    '<div class="feed-item-time">' + time + '</div>';
  feedList.prepend(item);
  if (feedList.children.length > 200) feedList.lastChild.remove();  // سقف ذاكرة
}
```

### 3.4) `frontend/src/index.html` — الحاوية

```html
<div id="page-livefeed" class="page">
  <div class="feed-container">
    <div id="feed-list" class="feed-list"></div>
  </div>
</div>
```

### 3.5) `frontend/src/styles/main.css` — التنسيق (بالأفاتار)

```css
.feed-container { padding: 6px; height: calc(100vh - 220px); display: flex; flex-direction: column; }
.feed-list { flex: 1; overflow-y: auto; padding: 6px; }
.feed-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 9px 12px; border-radius: var(--radius-sm);
  animation: slideIn 0.2s ease;
}
.feed-item:hover { background: var(--bg-hover); }
@keyframes slideIn { from { opacity:0; transform:translateX(-8px);} to {opacity:1; transform:none;} }

.feed-item-icon {
  width: 30px; height: 30px; min-width: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
  position: relative; overflow: hidden;
}
.feed-item-icon.chat   { background: rgba(111,191,178,.12); color: var(--accent-cyan); }
.feed-item-icon.gift   { background: rgba(212,175,55,.12);  color: var(--gold); }
.feed-item-icon.like   { background: rgba(201,93,122,.12);  color: var(--accent-pink); }
.feed-item-icon.follow { background: rgba(87,162,115,.12);  color: var(--accent-green); }
.feed-item-icon.join   { background: rgba(115,145,189,.12); color: var(--accent-blue); }
.feed-item-icon.system { background: rgba(201,162,75,.12);  color: var(--accent-yellow); }

/* صورة العضو جوه خانة الأيقونة — لو اتحملت تغطي الإيموجي */
.feed-item-icon .feed-item-avatar {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; border-radius: 8px; z-index: 1;
}
.feed-item-icon .hidden { display: none; }

.feed-item-content { flex: 1; min-width: 0; }
.feed-item-user { font-weight: 700; color: var(--text-primary); font-size: 12px; }
.feed-item-text { color: var(--text-secondary); font-size: 12px; margin-top: 1px; }
.feed-item-time { font-size: 10px; color: var(--text-muted); white-space: nowrap;
                  margin-top: 2px; font-variant-numeric: tabular-nums; }
```

---

## 4) نقاط الدمج في مشروع جديد

| الاحتياج | التفاصيل |
|---|---|
| مكتبة تيك توك | `npm i tiktok-live-connector` (استخدم v2 + طبقة `_userOf` دي بالظبط) |
| بث للأوفرلاي؟ | اختياري — اللي فوق كفاية للفيد في البرنامج |
| الاتصال بالبث | `client.connect(username, { ... })` ثم `_setupListeners()` بعد نجاح الاتصال |
| escapeHtml / escapeAttr | لازم يكونوا معرفين في الرندرر (حماية XSS من نصوص الشات) |
| صور الأفاتار | تيك توك بيوقع روابط الصور بعد فترة — `referrerpolicy="no-referrer"` مهم وعلى onerror رجّع للإيموجي |
| سقف العناصر | 200 صف كفاية — أكتر بياكل ذاكرة في اللايفات الطويلة |
