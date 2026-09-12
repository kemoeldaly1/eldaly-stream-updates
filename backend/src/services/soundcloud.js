/**
 * ELDALY STREAM — SoundCloud Song Requests (multi-account)
 * نظام طلب الأغاني من ساوند كلاود عبر أوامر الشات
 * - بحث بالاسم عبر api-v2 (مفتاح يتم اكتشافه تلقائياً من موقع ساوند كلاود)
 * - روابط مباشرة عبر resolve
 * - حالة معزولة لكل حساب: طابور + تاريخ + نقاط منفصلة — مفيش تداخل بين اللايفات
 * - التشغيل على أوفرلاي OBS عبر المشغل الرسمي (Widget API)
 * - تحكم التشغيل (pause/resume/restart) من لوحة التحكم عبر sr-control
 *
 * البنية: createSongSystem(accountKey) بيرجّع نظام أغاني كامل مستقل لكل حساب —
 * البحث واكتشاف مفتاح ساوند كلاود مشتركين على مستوى الموديول (مفتاح واحد
 * لكل الموقع)، لكن الطابور والتاريخ والنقاط والبث لكل حساب لوحده.
 */
const fs = require("fs");
const path = require("path");

const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/536",
  Accept: "application/json",
};

const DATA_DIR =
  process.env.ELDALY_DATA_DIR ||
  (process.env.APPDATA ? path.join(process.env.APPDATA, "ELDALY STREAM") : path.join(__dirname, "data"));

// ---------------------------------------------------------------- مفتاح ساوند كلاود (مشترك)
let clientId = null;
let clientIdAt = 0;
let searchAvailable = false;
let clientIdPromise = null;
// إشعار كل أنظمة الأغاني (كل حساب) عند تغيّر توفر البحث — المفتاح مشترك
const searchStateListeners = new Set();
function notifySearchState() {
  for (const fn of searchStateListeners) {
    try { fn(); } catch (e) {}
  }
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
        } catch {
          /* تجاهل */
        }
      }
      for (const cid of candidates) {
        try {
          const r = await fetch(
            `https://api-v2.soundcloud.com/search/tracks?q=test&client_id=${cid}&limit=1`,
            { headers: UA, signal: AbortSignal.timeout(12000) },
          );
          if (r.ok) {
            clientId = cid;
            clientIdAt = Date.now();
            searchAvailable = true;
            notifySearchState();
            return cid;
          }
        } catch {
          /* جرب التالي */
        }
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
function safePart(key) {
  return String(key).replace(/[^a-zA-Z0-9_-]/g, "_");
}
function histFile(key) {
  return path.join(DATA_DIR, "songhistory-" + safePart(key) + ".json");
}
function pointsFile(key) {
  return path.join(DATA_DIR, "points-" + safePart(key) + ".json");
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function createSongSystem(accountKey) {
  const k = String(accountKey || "default");
  let broadcast = () => {};
  let getConfig = () => ({});
  let fallbackCache = null;

  const st = {
    queue: [],
    current: null,
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

  function broadcastSearchState() {
    broadcast({ topic: "songstate", searchAvailable });
  }

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
      { headers: UA, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) throw new Error("فشل البحث في ساوند كلاود");
    const data = await res.json();
    return (data.collection || []).map(normalizeTrack).filter(Boolean);
  }

  async function resolve(url) {
    const cid = await ensureClientId();
    const res = await fetch(
      `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${cid}`,
      { headers: UA, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) throw new Error("اللينك غير صالح أو الأغنية غير متاحة");
    let data = await res.json();
    if (data && data.track) data = data.track;
    const track = normalizeTrack(data);
    if (!track) throw new Error("اللينك مش أغنية قابلة للتشغيل");
    return track;
  }

  // ---------------------------------------------------------------- النقاط
  function getPoints(user) {
    return st.points.get(String(user).toLowerCase()) || 0;
  }

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
    st.history.unshift({
      date: new Date().toISOString(),
      user,
      track: trackTitle,
      status,
    });
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

  function broadcastQueue() {
    broadcast({ topic: "songqueue", ...queueState() });
  }

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
    if (isUrl) {
      track = await resolve(query.trim());
    } else {
      const results = await search(query.trim());
      if (!results.length) throw new Error("مفيش نتيجة للبحث ده");
      track = results[0];
    }
    const cfg = getConfig().songrequests || {};
    if (!cfg.allowExplicit && track.explicit) throw new Error("المحتوى الصريح ممنوع بإعدادات البث");
    const err = validateAdd(track, user);
    if (err) throw new Error(err);
    st.queue.push({
      ...track,
      requestedBy: user,
      requestedAt: new Date().toISOString(),
    });
    if (!st.current) {
      const first = st.queue.shift();
      st.current = { track: first, startedAt: Date.now() };
    }
    broadcastQueue();
    return track;
  }

  async function playNext() {
    const next = st.queue.shift() || null;
    if (next) {
      st.current = { track: next, startedAt: Date.now() };
    } else {
      const fb = getConfig().songrequests?.fallbackUrl;
      if (fb) {
        try {
          if (!fallbackCache || fallbackCache.url !== fb) {
            fallbackCache = { url: fb, track: await resolve(fb) };
          }
          st.current = {
            track: { ...fallbackCache.track, id: fallbackCache.track.id + "#fb", requestedBy: "Auto" },
            startedAt: Date.now(),
          };
        } catch {
          st.current = null;
        }
      } else {
        st.current = null;
      }
    }
    broadcastQueue();
  }

  function trackEnded() {
    if (!st.current) return;
    pushHistory(st.current.track.requestedBy, `${st.current.track.title} - ${st.current.track.artist}`, "played");
    playNext();
  }

  // تحكم التشغيل من لوحة التحكم: pause | resume | restart
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

  function clearQueue() {
    st.queue = [];
    broadcastQueue();
    return { ok: true };
  }

  function hasUserQueued(user) {
    return st.queue.some((q) => q.requestedBy.toLowerCase() === user.toLowerCase());
  }

  function getHistory() {
    return st.history;
  }

  return {
    key: k,
    init,
    dispose() {
      searchStateListeners.delete(broadcastSearchState);
      persist();
    },
    search,
    resolve,
    addTrack,
    trackEnded,
    control,
    skip,
    revoke,
    removeById,
    clearQueue,
    queueState,
    broadcastQueue,
    earnPoints,
    getPoints,
    pushHistory,
    hasUserQueued,
    getHistory,
    broadcastSearchState,
    get searchAvailable() {
      return searchAvailable;
    },
  };
}

module.exports = { createSongSystem };
