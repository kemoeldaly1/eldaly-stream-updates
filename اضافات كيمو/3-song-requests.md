# 3) طلبات الأغاني (Song Requests) — التوثيق الكامل

> المشاهد يكتب في شات التيك توك `!sr اسم أغنية` أو `!sr <لينك ساوند كلاود>`
> → الأغنية بتتبحث وتتضاف للطابور → بتتشغل **تلقائياً** على أوفرلاي OBS بصوت
> مباشر (MP3/HLS) — مع نقاط ولاء، أسعار طلب/تخطي، حد طابور لكل مستخدم،
> أغنية احتياطية لما الطابور يفضى، وحارس ضد علوص الطابور.

---

## 1) الفكرة إزاي شغالة (المعمارية)

```
مشاهد يكتب "!sr shape of you" في شات التيك توك
   ▼
backend tiktok.js → حدث "chat" (بعد طباعة _userOf — شوف ملف اللايف فيد)
   ▼
accounts.js bindChatHook()          ← ⚠️ لازم يتسجل بعد كل setupTikTokListeners()
   ▼                                  (لأنها بتعمل removeAllListeners)
server.js handleSongCommands()       ← يفهم الأمر: !sr / !play / !skip / !revoke / !queue / !points
   ▼
soundcloud.js createSongSystem()     ← محرك الأغاني (معزول لكل حساب):
   بحث api-v2 → validateAdd (طابور/نقاط/صريح) → addTrack للطابور
   → attachStreamUrl (رابط تشغيل مباشر MP3 أو HLS) → broadcastQueue
   ▼
SSE/WS → أوفرلاي OBS (overlay-music.html)
   <audio> يشغل streamUrl مباشر (autoplay شغال في OBS من غير ضغطة)
   أو hls.js لو الرابط m3u8 — و iframe ساوند كلاود كبديل أخير
   ▼
onended / FINISH → trackEnded → الأغنية اللي بعدها (+ watchdog ضد العلوص)
```

---

## 2) كود الباك إند

### 2.1) `backend/src/services/soundcloud.js` — محرك الأغاني (الملف كامل)

```js
/**
 * نظام طلب الأغاني من ساوند كلاود عبر أوامر الشات
 * - بحث بالاسم عبر api-v2 (مفتاح client_id بيتكشف تلقائياً من موقع ساوند كلاود)
 * - روابط مباشرة عبر resolve
 * - حالة معزولة لكل حساب: طابور + تاريخ + نقاط منفصلة
 * - التشغيل على أوفرلاي OBS عبر مشغل مباشر (MP3/HLS)
 */
const fs = require("fs");
const path = require("path");

const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/536",
  Accept: "application/json",
};

const DATA_DIR = process.env.ELDALY_DATA_DIR ||
  (process.env.APPDATA ? path.join(process.env.APPDATA, "ELDALY STREAM") : path.join(__dirname, "data"));

// ---------------------------------------------------------------- مفتاح ساوند كلاود (مشترك)
// ساوند كلاود مش بيدّي مفتاح ثابت — بنكشفه من كود موقعهم نفسه ونختبره،
// وبيصح لنفسه 6 ساعات. بدون مفتاح صالح مفيش بحث ولا تشغيل.
let clientId = null;
let clientIdAt = 0;
let searchAvailable = false;
let clientIdPromise = null;
const searchStateListeners = new Set();
function notifySearchState() {
  for (const fn of searchStateListeners) { try { fn(); } catch (e) {} }
}

async function ensureClientId() {
  if (clientId && Date.now() - clientIdAt < 6 * 60 * 60 * 1000) return clientId;
  if (clientIdPromise) return clientIdPromise;
  clientIdPromise = (async () => {
    try {
      const html = await (await fetch("https://soundcloud.com/", { headers: UA, signal: AbortSignal.timeout(15000) })).text();
      const scripts = [...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
      const candidates = new Set();
      for (const m of html.matchAll(/client_id["'=:\s]{1,4}([a-zA-Z0-9]{32})/g)) candidates.add(m[1]);
      for (const s of scripts) {
        try {
          const js = await (await fetch(s, { headers: UA, signal: AbortSignal.timeout(20000) })).text();
          for (const m of js.matchAll(/client_id["'=:\s]{1,4}([a-zA-Z0-9]{32})/g)) candidates.add(m[1]);
          if (candidates.size >= 2) break;
        } catch { /* تجاهل */ }
      }
      for (const cid of candidates) {
        try {
          const r = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=test&client_id=${cid}&limit=1`,
            { headers: UA, signal: AbortSignal.timeout(12000) });
          if (r.ok) {
            clientId = cid; clientIdAt = Date.now(); searchAvailable = true;
            notifySearchState();
            return cid;
          }
        } catch { /* جرب التالي */ }
      }
      searchAvailable = false;
      notifySearchState();
      throw new Error("تعذر الوصول لساوند كلاود");
    } finally {
      clientIdPromise = null;
    }
  })();
  return clientIdPromise;
}

// ---------------------------------------------------------------- نظام أغاني لكل حساب
function safePart(key) { return String(key).replace(/[^a-zA-Z0-9_-]/g, "_"); }
function histFile(key)  { return path.join(DATA_DIR, "songhistory-" + safePart(key) + ".json"); }
function pointsFile(key){ return path.join(DATA_DIR, "points-" + safePart(key) + ".json"); }
function loadJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } }

function createSongSystem(accountKey) {
  const k = String(accountKey || "default");
  let broadcast = () => {};
  let getConfig = () => ({});
  let fallbackCache = null;

  const st = {
    queue: [],
    current: null,   // { track, startedAt }
    history: loadJson(histFile(k), []),
    points: new Map(Object.entries(loadJson(pointsFile(k), {}))),
  };

  function persist() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(histFile(k), JSON.stringify(st.history.slice(0, 200)), "utf8");
      fs.writeFileSync(pointsFile(k), JSON.stringify(Object.fromEntries(st.points)), "utf8");
    } catch (e) {}
  }

  function init(broadcastFn, getConfigFn) {
    broadcast = broadcastFn || broadcast;
    getConfig = getConfigFn || getConfig;
    searchStateListeners.add(broadcastSearchState);
    ensureClientId().catch(() => {});
  }

  function broadcastSearchState() { broadcast({ topic: "songstate", searchAvailable }); }

  // ---------------------------------------------------------------- البحث والتحويل
  function normalizeTrack(t) {
    if (!t || t.kind !== "track") return null;
    if (t.policy === "BLOCK" || t.policy === "SNIPPET") return null;
    return {
      id: String(t.id),
      title: t.title || "بدون اسم",
      artist: (t.user && t.user.username) || "غير معروف",
      artwork: (t.artwork_url || (t.user && t.user.avatar_url) || "").replace("-large", "-t200x200"),
      durationMs: t.full_duration || t.duration || 0,
      permalink: t.permalink_url,
      explicit: !!t.explicit,
    };
  }

  async function search(q) {
    const cid = await ensureClientId();
    const res = await fetch(
      `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${cid}&limit=10`,
      { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("فشل البحث في ساوند كلاود");
    const data = await res.json();
    return (data.collection || []).map(normalizeTrack).filter(Boolean);
  }

  async function resolve(url) {
    const cid = await ensureClientId();
    const res = await fetch(
      `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${cid}`,
      { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("اللينك غير صالح أو الأغنية غير متاحة");
    let data = await res.json();
    if (data && data.track) data = data.track;
    const track = normalizeTrack(data);
    if (!track) throw new Error("اللينك مش أغنية قابلة للتشغيل");
    return track;
  }

  // ---------------------------------------------------------------- التشغيل المباشر
  // رابط MP3 مباشر (progressive) — لو مش متاح HLS (بتشغل عبر hls.js في الويدجت)
  const streamUrlCache = new Map(); // trackId -> url
  async function getStreamUrl(trackId) {
    const cached = streamUrlCache.get(String(trackId));
    if (cached) return cached;
    const cid = await ensureClientId();
    const res = await fetch(
      `https://api-v2.soundcloud.com/tracks/${encodeURIComponent(String(trackId))}?client_id=${cid}`,
      { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("track fetch failed");
    const data = await res.json();
    const transcodings = (data.media && data.media.transcodings) || [];
    const progressive = transcodings.find(
      (t) => t.format && t.format.protocol === "progressive" && /mpeg|mp3/i.test(t.format.mime || ""));
    let target = progressive && progressive.url;
    if (!target) {
      const hls = transcodings.find((t) => t.format && t.format.protocol === "hls");
      if (!hls || !hls.url) throw new Error("no playable stream");
      target = hls.url;
    }
    const r2 = await fetch(target + (target.includes("?") ? "&" : "?") + "client_id=" + cid,
      { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!r2.ok) throw new Error("stream url failed");
    const j2 = await r2.json();
    if (!j2.url) throw new Error("no stream url");
    streamUrlCache.set(String(trackId), j2.url);
    return j2.url;
  }

  // إرفاق رابط التشغيل قبل العرض — فشله مش بيمنع الطابور (الويدجت بيرجع للـ iframe)
  async function attachStreamUrl(track) {
    if (!track || track.streamUrl) return track;
    try { track.streamUrl = await getStreamUrl(track.id); }
    catch (e) { track.streamUrl = null; }
    return track;
  }

  // ---------------------------------------------------------------- النقاط
  function getPoints(user) { return st.points.get(String(user).toLowerCase()) || 0; }
  function earnPoints(user) {
    const rate = Number(getConfig().songrequests?.pointsPerMessage ?? 0);
    if (rate <= 0) return;
    const key = String(user).toLowerCase();
    st.points.set(key, (st.points.get(key) || 0) + rate);
    if (st.points.size % 25 === 0) persist();
  }
  function spendPoints(user, amount) {
    const key = String(user).toLowerCase();
    if ((st.points.get(key) || 0) < amount) return false;
    st.points.set(key, (st.points.get(key) || 0) - amount);
    persist();
    return true;
  }

  // ---------------------------------------------------------------- الطابور
  function pushHistory(user, trackTitle, status) {
    st.history.unshift({ date: new Date().toISOString(), user, track: trackTitle, status });
    st.history = st.history.slice(0, 200);
    persist();
    broadcast({ topic: "songhistory", history: st.history });
  }

  function queueState() {
    return {
      current: st.current ? { ...st.current.track, startedAt: st.current.startedAt } : null,
      queue: st.queue,
      searchAvailable,
    };
  }

  // =========================================================================
  // حارس الأغنية الحالية — لو مشغّل الأوفرلاي وقع أو الـ autoplay اتحجب،
  // إشارة trackEnded عمرها ما توصل والطابور يفضل عالق للأبد.
  // المؤقت بيجبر التقدم بعد المدة المتوقعة + 90 ثانية سماح.
  // =========================================================================
  let currentWatchdog = null;
  function setCurrent(track) {
    st.current = track;
    if (currentWatchdog) { clearTimeout(currentWatchdog); currentWatchdog = null; }
    if (!track) return;
    const dur = Number(track.durationMs) || 0;
    const cap = dur > 0 ? dur + 90000 : 10 * 60 * 1000;
    currentWatchdog = setTimeout(() => { try { trackEnded(); } catch (e) {} }, cap);
  }

  function broadcastQueue() { broadcast({ topic: "songqueue", ...queueState() }); }

  function validateAdd(track, user) {
    const cfg = getConfig().songrequests || {};
    if (st.queue.length >= (cfg.maxQueue ?? 20)) return "الطابور مليان — استنى لحد ما يفضى";
    const perUser = st.queue.filter((q) => q.requestedBy.toLowerCase() === user.toLowerCase());
    if (perUser.length >= (cfg.maxQueuePerUser ?? 2)) return "وصلت الحد الأقصى من الطلبات في الطابور";
    if (st.queue.some((q) => q.id === track.id)) return "الأغنية دي موجودة في الطابور بالفعل";
    const cost = Number(cfg.playCost ?? 0);
    if (cost > 0 && !spendPoints(user, cost)) return `محتاج ${cost} نقطة للطلب ومفيش عندك كفاية`;
    return null;
  }

  async function addTrack(user, query) {
    let track;
    const isUrl = /soundcloud\.com/i.test(query);
    if (isUrl) track = await resolve(query.trim());
    else {
      const results = await search(query.trim());
      if (!results.length) throw new Error("مفيش نتيجة للبحث ده");
      track = results[0];
    }
    const cfg = getConfig().songrequests || {};
    if (!cfg.allowExplicit && track.explicit) throw new Error("المحتوى الصريح ممنوع بإعدادات البث");
    const err = validateAdd(track, user);
    if (err) throw new Error(err);
    st.queue.push({ ...track, requestedBy: user, requestedAt: new Date().toISOString() });
    if (!st.current) {
      const first = st.queue.shift();
      await attachStreamUrl(first);
      setCurrent({ track: first, startedAt: Date.now() });
    }
    broadcastQueue();
    return track;
  }

  async function playNext() {
    const next = st.queue.shift() || null;
    if (next) {
      await attachStreamUrl(next);
      setCurrent({ track: next, startedAt: Date.now() });
    } else {
      // أغنية احتياطية لما الطابور يفضى (اختياري من الإعدادات)
      const fb = getConfig().songrequests?.fallbackUrl;
      if (fb) {
        try {
          if (!fallbackCache || fallbackCache.url !== fb) {
            fallbackCache = { url: fb, track: await resolve(fb) };
          }
          setCurrent({ track: { ...fallbackCache.track, id: fallbackCache.track.id + "#fb", requestedBy: "Auto" }, startedAt: Date.now() });
        } catch { setCurrent(null); }
      } else setCurrent(null);
    }
    broadcastQueue();
  }

  function trackEnded() {
    if (!st.current) return;
    pushHistory(st.current.track.requestedBy, `${st.current.track.title} - ${st.current.track.artist}`, "played");
    playNext();
  }

  function control(action) {
    const a = String(action || "");
    if (!["pause", "resume", "restart"].includes(a)) return { ok: false, error: "unknown action" };
    broadcast({ topic: "sr-control", action: a });
    return { ok: true };
  }

  function skip(byUser, isDashboard) {
    if (!st.current) return { ok: false, error: "مفيش أغنية شغالة دلوقتي" };
    const cfg = getConfig().songrequests || {};
    const isRequester = st.current.track.requestedBy.toLowerCase() === String(byUser || "").toLowerCase();
    if (!isDashboard) {
      const skipCost = Number(cfg.skipCost ?? 0);
      const freeOwn = cfg.allowSkipRequested !== false && isRequester;
      if (!freeOwn && skipCost > 0 && !spendPoints(byUser, skipCost)) {
        return { ok: false, error: `التخطي محتاج ${skipCost} نقطة ومفيش عندك كفاية` };
      }
    }
    pushHistory(st.current.track.requestedBy, `${st.current.track.title} - ${st.current.track.artist}`, "skipped");
    playNext();
    return { ok: true };
  }

  function revoke(user) {
    const idx = [...st.queue].reverse().findIndex((q) => q.requestedBy.toLowerCase() === user.toLowerCase());
    if (idx === -1) return { ok: false, error: "مفيش طلب ليك في الطابور تلغيها" };
    const realIdx = st.queue.length - 1 - idx;
    const [removed] = st.queue.splice(realIdx, 1);
    const cost = Number(getConfig().songrequests?.playCost ?? 0);
    if (cost > 0) {
      const key = user.toLowerCase();
      st.points.set(key, (st.points.get(key) || 0) + cost);
    }
    persist();
    broadcastQueue();
    pushHistory(user, `${removed.title} - ${removed.artist}`, "revoked");
    return { ok: true, removed };
  }

  function removeById(id) {
    if (st.current && st.current.track.id === id) return skip(null, true);
    const idx = st.queue.findIndex((q) => q.id === id);
    if (idx === -1) return { ok: false, error: "مش موجودة" };
    const [removed] = st.queue.splice(idx, 1);
    broadcastQueue();
    return { ok: true, removed };
  }

  function clearQueue() { st.queue = []; broadcastQueue(); return { ok: true }; }
  function hasUserQueued(user) { return st.queue.some((q) => q.requestedBy.toLowerCase() === user.toLowerCase()); }
  function getHistory() { return st.history; }

  return {
    key: k, init,
    dispose() { searchStateListeners.delete(broadcastSearchState); persist(); },
    search, resolve, getStreamUrl, addTrack, trackEnded, control, skip, revoke,
    removeById, clearQueue, queueState, broadcastQueue, earnPoints, getPoints,
    pushHistory, hasUserQueued, getHistory, broadcastSearchState,
    get searchAvailable() { return searchAvailable; },
  };
}

module.exports = { createSongSystem };
```

### 2.2) `backend/src/server.js` — أوامر الشات (!sr ورفاقها)

```js
function handleSongCommands(ctx, username, badges, content) {
  const sr = songSettings(ctx);
  const text = String(content || "").trim();
  if (!sr.enabled) return;
  ctx.songs.earnPoints(username); // نقاط الولاء من التفاعل
  const lower = text.toLowerCase();
  const badgeSet = new Set(badges || []);
  const isMod = badgeSet.has("moderator") || badgeSet.has("staff");
  const isBroadcaster = badgeSet.has("broadcaster");
  const isSub = badgeSet.has("subscriber");
  const canUse = isBroadcaster || sr.allowedFor?.all ||
                 (sr.allowedFor?.subs && isSub) || (sr.allowedFor?.mods && isMod);
  const argOf = (...cmds) => {
    for (const c of cmds) {
      if (lower === c) return "";
      if (lower.startsWith(c + " ")) return text.slice(c.length + 1).trim();
    }
    return null;
  };
  const songFeed = (user, msg) =>
    ctx.broadcastRaw({ topic: "event", event: { type: "song", text: user + " — " + msg } });

  // "!sr" هو الأمر الأشهر (نفس تيكفينيتي) — معه !play !song !request
  const playArg = argOf("!sr", "!play", "!song", "!request");
  if (playArg !== null) {
    if (!sr.playEnabled) return songFeed(username, "طلب الأغاني مقفول حالياً");
    if (!canUse) return songFeed(username, "أمر طلب الأغاني مش متاح لحسابك");
    if (!playArg) return songFeed(username, "اكتب اسم الأغنية أو لينك ساوند كلاود بعد الأمر");
    ctx.songs.addTrack(username, playArg)
      .then((t) => songFeed(username, "تمت الإضافة: " + t.title + " - " + t.artist))
      .catch((e) => songFeed(username, e.message));
    return;
  }
  if (argOf("!skip") !== null) {
    if (!sr.skipEnabled) return songFeed(username, "أمر التخطي مقفول");
    if (!canUse) return songFeed(username, "أمر التخطي مش متاح لحسابك");
    const r = ctx.songs.skip(username, false);
    return songFeed(username, r.ok ? "تم تخطي" : r.error);
  }
  if (lower === "!revoke") {
    const r = ctx.songs.revoke(username);
    return songFeed(username, r.ok ? "تم إلغاء: " + r.removed.title : r.error);
  }
  if (lower === "!queue" || lower === "!songqueue") {
    const st = ctx.songs.queueState();
    const lines = [];
    if (st.current) lines.push("الآن: " + st.current.title + " - " + st.current.artist);
    st.queue.slice(0, 5).forEach((q, i) =>
      lines.push(i + 1 + ". " + q.title + " - " + q.artist + " (" + q.requestedBy + ")"));
    return songFeed(username, lines.length ? lines.join(" | ") : "الطابور فاضي — ابعت !play لينك أو اسم أغنية");
  }
  if (lower === "!points") return songFeed(username, "نقاطك: " + ctx.songs.getPoints(username));
}

// ⭐ الحساس: ربط الشات بالأوامر. setupTikTokListeners() بتعمل removeAllListeners
// فالربط ده لازم يتسجل تاني بعد كل اتصال — وإلا الأوامر تموت من أول كونكت:
// (في accounts.js AccountContext)
bindChatHook() {
  try {
    this.tiktok.on("chat", (c) => {
      try { this.hooks.onChat && this.hooks.onChat(this, c); } catch (e) {}
    });
  } catch (e) {}
}
// وفي server.js عند /api/tiktok/connect:
ctx.eventRunner.setupTikTokListeners();
ctx.bindChatHook();                      // ← السطر اللي بيوصل الأوامر
const connectResult = await ctx.tiktok.connect(username, { instantGifts: true });
```

### 2.3) `backend/src/server.js` — مسارات الـ API للوحة التحكم (خلاصة)

```js
app.use("/api/songs", sessionOrRateLimiter);   // جلسة التطبيق أو 40 طلب/ربع ساعة
app.get ("/api/songs/state",    ...)  // { current, queue, settings, searchAvailable }
app.post("/api/songs/settings", ...)  // حفظ إعدادات الطلب (أسعار/حدود/صريح/حجم...)
app.post("/api/songs/control",  ...)  // pause | resume | restart (للوحة التحكم)
app.post("/api/songs/skip",     ...)  // تخطي من اللوحة (isDashboard = مجاني)
app.post("/api/songs/remove",   ...) // إزالة من الطابور
app.post("/api/songs/clear",    ...) // تفريغ الطابور
app.get ("/api/songs/search",   ...) // بحث للمعاينة في اللوحة
// + فحص PRO: المستخدم المجاني بياخد { proRequired: true }
```

النظام بيتنشأ لكل حساب هكذا:
```js
this.songs = createSongSystem(this.email);
this.songs.init(
  (obj) => this.broadcastRaw(obj),        // بث لمواضيع: songqueue/songstate/songhistory/sr-control
  () => ({ songrequests: songSettings(this) }) // إعدادات الحساب
);
```

---

## 3) كود الفرونت — أوفرلاي OBS: `backend/src/widgets/overlay-music.html`

الويدجت اللي بيتحط في OBS. **نقطتين ذهبيتين** جواه:
1. الصوت بيتشغل من `<audio>` برابط MP3 مباشر — autoplay شغال في OBS من غير ضغطة
   (iframe ساوند كلاود بيتبهدف لكن الـ autoplay بتاعه بيتحجب كتير)
2. المقارنة بـ `curKey` مش `a.src` — لأن HLS بياخد blob: داخلي فـ `a.src` عمره
   ما بيساوي رابط الأغنية والشرط القديم كان بيعيد تشغيل الأغنية من الأول كل تحديث

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
:root{--gold:#d4af37;--gold2:#f2dc93;--panel:rgba(16,14,10,.92);--border:rgba(212,175,55,.4);--txt:#ece9e1;--dim:#b7a98a}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent;font-family:'Inter',Tahoma,sans-serif;overflow:hidden}
body{width:100vw;height:100vh}
#wrap{position:absolute;bottom:2vh;right:1.5vw;width:26vw;min-width:320px;transform-origin:bottom right}
.card{position:relative;background:var(--panel);border:2px solid var(--border);border-radius:16px;padding:16px;backdrop-filter:blur(6px)}
/* مشغل ساوند كلاود مرسوم جوه الشاشة ومغطى بالكارت (خطة بديلة للصوت) */
#sc-player{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:0}
.card-cover{position:absolute;inset:0;background:rgba(16,14,10,.97);z-index:1}
.brand,#npBody,#upnext{position:relative;z-index:2}
.np{display:flex;gap:14px;align-items:center;padding:10px 0}
.art{width:84px;height:84px;border-radius:12px;object-fit:cover;border:1.5px solid var(--gold)}
.title{font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{font-size:12px;color:var(--gold2);font-weight:700}
.req{font-size:11px;color:var(--dim)}
.q-head{font-size:11px;font-weight:800;letter-spacing:1px;color:var(--dim);margin:12px 0 6px}
.q-item{display:flex;align-items:center;gap:9px;padding:6px 0;opacity:.8}
.hidden{display:none!important}
.revive{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:5;background:var(--gold);
        color:#141414;font:800 12.5px 'Inter';padding:9px 16px;border-radius:22px;cursor:pointer;display:none}
</style>
<script src="https://w.soundcloud.com/player/api.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
</head>
<body>
<div id="wrap"><div class="card">
  <div class="card-cover"></div>
  <div class="brand">ELDALY STREAM • SONG REQUESTS</div>
  <iframe id="sc-player" frameborder="no" allow="autoplay" src="about:blank"></iframe>
  <div class="np hidden" id="npBody">
    <img class="art" id="npArt"><div class="info">
      <div class="title" id="npTitle"></div><div class="artist" id="npArtist"></div>
      <div class="req" id="npReq"></div>
    </div>
  </div>
  <div class="revive" id="reviveBtn">▶ اضغط لتشغيل الأغنية</div>
  <div id="upnext"></div>
</div></div>

<script>
const D=(id)=>document.getElementById(id);
const esc=(s)=>{const d=document.createElement('div');d.textContent=s??'';return d.innerHTML;};
const fmt=(ms)=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
// توكن الحساب من رابط الصفحة /widget/<token>/overlay-music
const TOKEN=(location.pathname.split('/').filter(Boolean)[1]||'').toLowerCase();
const stateHeaders={'x-overlay-token':TOKEN};
let cfg={songrequests:{overlayPermanent:true}};
let scWidget=null; let currentVol=80; let playingOk=false; let curKey=null;

D('reviveBtn').addEventListener('click',()=>{
  try{ const a=window.__songAudio; if(a){ a.play(); } else if(scWidget){ scWidget.seekTo(0); scWidget.play(); } }catch(e){}
  D('reviveBtn').style.display='none';
});

function visibility(cur){
  const has=!!cur, permanent=cfg.songrequests?.overlayPermanent!==false;
  D('wrap').style.display=(has||permanent)?'block':'none';
  D('npBody').style.display=has?'flex':'none';
}

function renderNow(cur){
  if(!cur){
    D('npBody').classList.add('hidden');
    // إيقاف فعلي للصوت عند التخطي/التفريغ — إخفاء الكارت لوحده مش بيوقف الصوت
    try{ const a=window.__songAudio; if(a){ a.pause(); a.removeAttribute('src'); a.load(); } }catch(e){}
    try{ if(window.__hls){ window.__hls.destroy(); window.__hls=null; } }catch(e){}
    try{ D('sc-player').src='about:blank'; }catch(e){}
    curKey=null; visibility(null); return;
  }
  D('npBody').classList.remove('hidden');
  D('npArt').src=cur.artwork||'';
  D('npTitle').textContent=cur.title;
  D('npArtist').textContent=cur.artist;
  D('npReq').textContent='🎵 by '+(cur.requestedBy||'');

  // المشغل المباشر: <audio> بيشغل streamUrl في OBS تلقائياً
  playingOk=false;
  if(cur.streamUrl){
    D('sc-player').style.display='none';
    let a=window.__songAudio;
    if(!a){
      a=window.__songAudio=new Audio();
      a.onplaying=()=>{ playingOk=true; D('reviveBtn').style.display='none'; };
      a.onended=()=>{ try{ if(ws&&ws.readyState===1) ws.send(JSON.stringify({type:'trackEnded'})); }catch(e){} };
      a.onerror=()=>{ D('reviveBtn').style.display='block'; };
    }
    a.volume=Math.min(1,Math.max(0,(currentVol||80)/100));
    const key=cur.streamUrl;
    // ⭐ المقارنة بـ curKey مش a.src — HLS بياخد blob: داخلي
    if(curKey!==key){
      curKey=key;
      if(window.__hls){ try{ window.__hls.destroy(); }catch(e){} window.__hls=null; }
      if(/\.m3u8($|\?)/i.test(key) && window.Hls && window.Hls.isSupported()){
        a.src='';
        const hls=new Hls({ autoStartLoad:true });
        window.__hls=hls;
        hls.loadSource(key);
        hls.attachMedia(a);
        hls.on(Hls.Events.MANIFEST_PARSED,()=>{ try{ a.play(); }catch(e){} });
        hls.on(Hls.Events.ERROR,(_,d)=>{ if(d&&d.fatal) D('reviveBtn').style.display='block'; });
      } else {
        a.src=key;
        try{ a.play(); }catch(e){}
      }
      // autoplay اتحجب؟ زر الاسترجاع يظهر بعد 7 ثواني (ضغطة واحدة تكفي للباقي)
      setTimeout(()=>{ const s=window.__songAudio; if(s&&s.paused) D('reviveBtn').style.display='block'; },7000);
    }
  } else {
    // البديل الأخير: مشغل ساوند كلاود المخفي
    const embed='https://w.soundcloud.com/player/?url='+encodeURIComponent(cur.permalink)
      +'&auto_play=true&hide_related=true&show_comments=false&show_user=true&visual=false';
    const frame=D('sc-player');
    if(frame.src!==embed){
      frame.src=embed; frame.onload=bindWidget;
      curKey=cur.permalink||cur.title;
      setTimeout(()=>{ if(!playingOk&&D('sc-player').src===embed) D('reviveBtn').style.display='block'; },7000);
    }
  }
}

function renderUpnext(queue,cur){
  const list=(queue||[]).slice(0,5);
  let elapsed=cur?Math.max(0,(cur.durationMs||0)-(Date.now()-(cur.startedAt||Date.now()))):0;
  D('upnext').innerHTML=list.length?'<div class="q-head">UP NEXT</div>':'';
  D('upnext').innerHTML+=list.map((q,i)=>{
    const s=elapsed; elapsed+=q.durationMs||30000;
    return '<div class="q-item"><img src="'+esc(q.artwork||'')+'" style="width:36px;height:36px;border-radius:8px;object-fit:cover">'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700">'+esc(q.title)+' — '+esc(q.artist)+'</div>'
      +'<div style="font-size:10px;color:var(--dim)">Starts in '+fmt(s)+' • by '+esc(q.requestedBy||'')+'</div></div></div>';
  }).join('');
}

function applyState(data){
  const cur=data.current||null, queue=data.queue||[];
  visibility(cur); renderNow(cur); renderUpnext(queue,cur);
}

// WebSocket — وظيفته: إبلاغ السيرفر إن الأغنية خلصت (بالتوكن وإلا بيتم تجاهله)
let ws=null;
function connectWs(){
  try{
    ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws?overlay='+encodeURIComponent(TOKEN));
    ws.onclose=()=>{ ws=null; setTimeout(connectWs,3000); };
  }catch(e){ setTimeout(connectWs,3000); }
}
connectWs();

// SSE للتحديث اللحظي (songqueue + sr-settings) + polling احتياطي كل 30 ثانية
const sse=new EventSource('/widgets/stream?t='+encodeURIComponent(TOKEN)+'&v=2');
sse.onmessage=(e)=>{
  try{
    const m=JSON.parse(e.data);
    if(m.type==='reload'){ location.reload(); return; }
    if(m.topic==='songqueue'){ applyState(m); }
    else if(m.topic==='sr-settings' && m.settings){
      cfg.songrequests={...cfg.songrequests,...m.settings};
      if(m.settings.volume!==undefined){
        currentVol=m.settings.volume;
        try{ const sa=window.__songAudio; if(sa) sa.volume=Math.min(1,Math.max(0,(currentVol||80)/100)); }catch(e){}
      }
    }
  }catch(err){}
};

// التحميل الأولي
(async()=>{
  try{
    const s=await (await fetch('/api/songs/state',{headers:stateHeaders})).json();
    if(s.settings) cfg.songrequests={...cfg.songrequests,...s.settings};
    if(cfg.songrequests?.volume!==undefined) currentVol=cfg.songrequests.volume;
    if(s.current) renderNow(s.current);
    renderUpnext(s.queue||[],s.current);
    visibility(s.current);
  }catch(e){}
})();
setInterval(async()=>{ /* نفس منطق applyState من /api/songs/state */ },30000);
</script>
</body>
</html>
```

---

## 4) شكل الإعدادات (`songrequests` في الـ store)

```js
{
  enabled: true,             // نظام الأغاني شغال أصلاً؟
  playEnabled: true,         // أمر !sr شغال؟
  skipEnabled: true,         // أمر !skip شغال؟
  playCost: 0,               // سعر الطلب بالنقاط
  skipCost: 1,               // سعر التخطي
  allowSkipRequested: true,  // صاحب الطلب يلغي طلبه مجاناً
  allowExplicit: true,       // السماح بالمحتوى الصريح
  maxQueue: 20,              // أقصى طول للطابور
  maxQueuePerUser: 2,        // أقصى طلبات لكل مستخدم في الطابور
  overlayPermanent: true,    // الكارت ظاهر دايماً ولا بس لما فيه أغنية
  volume: 80,                // صوت المشغل (0-100)
  overlayScale: 100,         // حجم الكارت % (40-200)
  fallbackUrl: "",           // لينك أغنية احتياطية لما الطابور يفضى
  pointsPerMessage: 1,       // نقطة لكل رسالة شات
  allowedFor: { all: true, subs: false, mods: false }  // مين يقدر يطلب
}
```

## 5) نقاط الدمج في مشروع جديد

| الاحتياج | التفاصيل |
|---|---|
| مفتاح ساوند كلاود | `ensureClientId()` بيكتشفه تلقائياً — لو البحث وقع معناه إن ساوند كلاود غيرت كودهم (بيتعمل ذاتياً) |
| التشغيل في OBS | لازم MP3 مباشر أو HLS — iframe ساوند كلاود الـ autoplay بتاعه بيتحجب |
| مقارنة المصدر | استخدم متغير `curKey` — `audio.src` مش هيشتغل مع HLS (blob:) |
| حارس الطابور | watchdog بمدة الأغنية + 90 ثانية — بدونه أي autoplay محجوب يعلق الطابور للأبد |
| أوامر الشات | سجل الـ chat hook **بعد** أي `removeAllListeners` وإلا الأوامر تموت |
| النقاط | بتتحفظ JSON على القرص (نقطة لكل رسالة قابلة للتعديل) — في مشروعك ممكن تخليها في داتابيز |
| التخزين | history/points لكل حساب في ملفات منفصلة (`songhistory-<key>.json`) |
