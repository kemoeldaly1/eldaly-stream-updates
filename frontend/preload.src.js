const { contextBridge, ipcRenderer } = require("electron");

const api = {
  // Window management
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),

  // Server URL Configuration
  server: {
    getUrl: () => ipcRenderer.invoke("server:getUrl"),
    setUrl: (url) => ipcRenderer.invoke("server:setUrl", url),
  },

  // Backup — نافذة التصدير/الاستيراد المشفرة (المنطق كله في الباك إند)
  backupIO: {
    export: (categories) => ipcRenderer.invoke("backup:export", categories),
    counts: () => ipcRenderer.invoke("backup:counts"),
    preview: (blob) => ipcRenderer.invoke("backup:preview", blob),
    apply: (blob, categories) =>
      ipcRenderer.invoke("backup:apply", blob, categories),
  },

  // طلبات الأغاني (ساوند كلاود)
  sr: {
    request: (method, path, body) =>
      ipcRenderer.invoke("sr:request", { method, path, body }),
  },

  // TikTok APIs
  tiktok: {
    connect: (username) => ipcRenderer.invoke("tiktok:connect", username),
    disconnect: () => ipcRenderer.invoke("tiktok:disconnect"),
    status: () => ipcRenderer.invoke("tiktok:status"),
    getAvatar: (user) => ipcRenderer.invoke("tiktok:getAvatar", user),
    onChat: (callback) =>
      ipcRenderer.on("tiktok:chat", (_, data) => callback(data)),
    onGift: (callback) =>
      ipcRenderer.on("tiktok:gift", (_, data) => callback(data)),
    onLike: (callback) =>
      ipcRenderer.on("tiktok:like", (_, data) => callback(data)),
    onFollow: (callback) =>
      ipcRenderer.on("tiktok:follow", (_, data) => callback(data)),
    onJoin: (callback) =>
      ipcRenderer.on("tiktok:join", (_, data) => callback(data)),
    onShare: (callback) =>
      ipcRenderer.on("tiktok:share", (_, data) => callback(data)),
    onSubscribe: (callback) =>
      ipcRenderer.on("tiktok:subscribe", (_, data) => callback(data)),
    onStreamEnd: (callback) =>
      ipcRenderer.on("tiktok:streamEnd", () => callback()),
    onError: (callback) =>
      ipcRenderer.on("tiktok:error", (_, msg) => callback(msg)),
  },

  // Store APIs
  store: {
    get: (key) => ipcRenderer.invoke("store:get", key),
    set: (key, value) => ipcRenderer.invoke("store:set", key, value),
  },

  // Actions APIs
  actions: {
    getAll: () => ipcRenderer.invoke("actions:getAll"),
    save: (actions) => ipcRenderer.invoke("actions:save", actions),
    execute: (actionId) => ipcRenderer.invoke("actions:execute", actionId),
    executeDelayed: (actionId, delayMs) =>
      ipcRenderer.invoke("actions:executeDelayed", actionId, delayMs),
    duplicate: (actionId) => ipcRenderer.invoke("actions:duplicate", actionId),
  },

  // Events APIs
  events: {
    getAll: () => ipcRenderer.invoke("events:getAll"),
    save: (events) => ipcRenderer.invoke("events:save", events),
    test: (eventId) => ipcRenderer.invoke("events:test", eventId),
    testDelayed: (eventId, delayMs) =>
      ipcRenderer.invoke("events:testDelayed", eventId, delayMs),
  },

  // Gifts Catalog APIs
  gifts: {
    getAll: () => ipcRenderer.invoke("gifts:getAll"),
    getLive: () => ipcRenderer.invoke("gifts:getLive"),
    onUpdated: (callback) =>
      ipcRenderer.on("gifts:updated", (_, data) => callback(data)),
  },

  // System & OS APIs
  system: {
    registerCustomHotkeys: (hotkeys) =>
      ipcRenderer.invoke("system:registerCustomHotkeys", hotkeys),
    getFonts: () => ipcRenderer.invoke("system:getFonts"),
    searchSounds: (query, page = 1) =>
      ipcRenderer.invoke("system:searchSounds", query, page),
    downloadSound: (url) =>
      ipcRenderer.invoke("system:downloadSound", url),
  },

  // Games APIs (Local PC launcher & mods)
  games: {
    getList: () => ipcRenderer.invoke("games:getList"),
    importPreset: (gameId) => ipcRenderer.invoke("games:importPreset", gameId),
    generateKey: (p1, p2, p3) =>
      ipcRenderer.invoke("games:generateKey", p1, p2, p3),
    launch: (gameId, gamePath) =>
      ipcRenderer.invoke("games:launch", gameId, gamePath),
    openLink: (url) => ipcRenderer.send("games:openLink", url),
    locateGame: () => ipcRenderer.invoke("games:locate"),
    installMod: (gameId, gamePath) =>
      ipcRenderer.invoke("games:installMod", gameId, gamePath),
  },

  // Native Dialogs
  dialog: {
    openFile: (filters) => ipcRenderer.invoke("dialog:openFile", filters),
  },

  // OBS Overlay & TTS
  overlay: {
    getUrls: () => ipcRenderer.invoke("overlay:getUrls"),
    getInfo: () => ipcRenderer.invoke("overlay:getInfo"),
    getWidgetUrl: (name, qs) =>
      ipcRenderer.invoke("overlay:getWidgetUrl", name, qs),
    onBase: (callback) =>
      ipcRenderer.on("overlay:base", (_, data) => callback(data)),
    testTTS: (text, options) =>
      ipcRenderer.invoke("overlay:testTTS", text, options),
    onPlayLocalTTS: (callback) =>
      ipcRenderer.on("play-local-tts", (_, data) => callback(data)),
  },

  // Screen Management
  screen: {
    getSettings: (screenId) =>
      ipcRenderer.invoke("screen:getSettings", screenId),
    setSettings: (screenId, settings) =>
      ipcRenderer.invoke("screen:setSettings", screenId, settings),
    getAllSettings: () => ipcRenderer.invoke("screen:getAllSettings"),
    getQueueStatus: () => ipcRenderer.invoke("screen:getQueueStatus"),
    onQueueUpdate: (callback) =>
      ipcRenderer.on("screen:queueUpdate", (_, data) => callback(data)),
  },

  // Widget Configuration
  widget: {
    setConfig: (widgetId, config) =>
      ipcRenderer.invoke("widget:setConfig", widgetId, config),
    getConfig: (widgetId) => ipcRenderer.invoke("widget:getConfig", widgetId),
    test: (widgetId, payload) =>
      ipcRenderer.invoke("widget:test", widgetId, payload),
  },

  // رفع الميديا للسحابة — XHR من الـ preload عشان نسبة التقدم تشتغل حية
  media: {
    uploadFile: (filePath, onProgress) =>
      ipcRenderer.invoke("media:getUploadTarget", filePath).then((target) => {
        if (!target || !target.ok) {
          return { ok: false, error: (target && target.error) || "unavailable" };
        }
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", target.url, true);
          xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.setRequestHeader("x-app-session", target.session);
          xhr.setRequestHeader("x-app-hwid", target.hwid);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && typeof onProgress === "function") {
              try {
                onProgress(Math.round((e.loaded / e.total) * 100));
              } catch (err) {}
            }
          };
          xhr.onload = () => {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              resolve({ ok: false, error: "bad response (" + xhr.status + ")" });
            }
          };
          xhr.onerror = () => resolve({ ok: false, error: "network error" });
          xhr.send(target.buffer);
        });
      }),
  },

  // Profile Management & Local Export/Import
  profile: {
    export: () => ipcRenderer.invoke("profile:export"),
    import: () => ipcRenderer.invoke("profile:import"),
    exportFont: () => ipcRenderer.invoke("profile:export-font"),
    exportScoreboardProfile: () =>
      ipcRenderer.invoke("scoreboard:export-profile"),
    importScoreboardProfile: () =>
      ipcRenderer.invoke("scoreboard:import-profile"),
    exportBattleProfile: () => ipcRenderer.invoke("battle:export-profile"),
    importBattleProfile: () => ipcRenderer.invoke("battle:import-profile"),
    resetActions: () => ipcRenderer.invoke("profile:resetActions"),
    resetEvents: () => ipcRenderer.invoke("profile:resetEvents"),
    resetAll: () => ipcRenderer.invoke("profile:resetAll"),
  },

  // Profiles multi-profile
  profiles: {
    list: () => ipcRenderer.invoke("profiles:list"),
    create: (name) => ipcRenderer.invoke("profiles:create", name),
    rename: (id, name) => ipcRenderer.invoke("profiles:rename", id, name),
    delete: (id) => ipcRenderer.invoke("profiles:delete", id),
    switch: (id) => ipcRenderer.invoke("profiles:switch", id),
    duplicate: (id, name) => ipcRenderer.invoke("profiles:duplicate", id, name),
  },

  // Extensions (Scoreboard, Timer, Spinner)
  ext: {
    command: (command, arg1, arg2) =>
      ipcRenderer.invoke("ext:command", command, arg1, arg2),
    scoreboard: {
      update: (side, amount) =>
        ipcRenderer.invoke("ext:scoreboard:update", side, amount),
      setScore: (left, right) =>
        ipcRenderer.invoke("ext:scoreboard:setScore", left, right),
      reset: () => ipcRenderer.invoke("ext:scoreboard:reset"),
      getState: () => ipcRenderer.invoke("ext:scoreboard:getState"),
      registerHotkeys: (hotkeys) =>
        ipcRenderer.invoke("ext:scoreboard:registerHotkeys", hotkeys),
      onState: (callback) =>
        ipcRenderer.on("ext:scoreboard:state", (_, state) => callback(state)),
    },
    timer: {
      start: (minutes) => ipcRenderer.invoke("ext:timer:start", minutes),
      stop: () => ipcRenderer.invoke("ext:timer:stop"),
      reset: (minutes) => ipcRenderer.invoke("ext:timer:reset", minutes),
      addTime: (seconds) => ipcRenderer.invoke("ext:timer:addTime", seconds),
      removeTime: (seconds) =>
        ipcRenderer.invoke("ext:timer:removeTime", seconds),
      getState: () => ipcRenderer.invoke("ext:timer:getState"),
      onState: (callback) =>
        ipcRenderer.on("ext:timer:state", (_, state) => callback(state)),
    },
  },

  // Real-time Logs & Notifications
  onLog: (callback) => ipcRenderer.on("log", (_, msg) => callback(msg)),

  // Auth & Licensing
  getHwid: () => ipcRenderer.invoke("license:getHwid"),
  register: (email, password) =>
    ipcRenderer.invoke("license:register", { email, password }),
  login: (email, password) =>
    ipcRenderer.invoke("license:login", { email, password }),
  sendPasswordReset: (email) =>
    ipcRenderer.invoke("license:sendReset", { email }),
  changePassword: (password) =>
    ipcRenderer.invoke("license:changePassword", { password }),
  getLicenseTier: () => ipcRenderer.invoke("license:getTier"),
  closeLicenseAndOpenMain: () => ipcRenderer.invoke("license:openMain"),
  copyText: (text) => ipcRenderer.invoke("license:copy", text),
  openExternal: (url) => ipcRenderer.invoke("license:openExternal", url),
  logout: () => ipcRenderer.invoke("license:logout"),
  getLicenseState: () => ipcRenderer.invoke("license:getState"),
  getPaymentLinks: () => ipcRenderer.invoke("license:getPaymentLinks"),
};

contextBridge.exposeInMainWorld("api", api);
// نفس الواجهة متاحة لكود الرندر المشفّر اللي بيشتغل في العالم المعزول
globalThis.api = api;

// ==========================================================================
// تحميل كود الرندر المشفّر (V8 bytecode) — النسخة المبنية فقط
// ==========================================================================
// ملفات renderer.js / license-renderer.js الأصلية بتتشال من الباكج النهائي،
// والكود بييجي كـ .jsc محمّل هنا في العالم المعزول (contextIsolation شغّال).
// الدوال اللي الكود بيعرّفها على window لازم تشوفها الصفحة نفسها عشان
// الـ onclick في HTML يشتغل — فبنعيد كشفها للعالم الرئيسي عبر contextBridge.
(function secureBootstrap() {
  let path, fs;
  try {
    path = require("path");
    fs = require("fs");
  } catch (e) {
    return;
  }

  let page = "";
  try {
    page = String(location && location.href || "");
  } catch (e) {
    page = "";
  }

  let jscFile = null;
  if (/license\.html(\?|$)/.test(page)) {
    jscFile = path.join(__dirname, "src", "license-renderer.jsc");
  } else if (/index\.html(\?|$)/.test(page)) {
    jscFile = path.join(__dirname, "src", "renderer.jsc");
  }
  if (!jscFile) return;

  let hasJsc = false;
  try {
    hasJsc = fs.existsSync(jscFile);
  } catch (e) {
    hasJsc = false;
  }
  if (!hasJsc) return; // وضع التطوير — الصفحة بتحمّل السكريبت العادي

  try {
    require("bytenode");
  } catch (e) {
    return;
  }

  const snapshot = new Set(Object.getOwnPropertyNames(globalThis));
  const exposeNewGlobals = () => {
    try {
      for (const key of Object.getOwnPropertyNames(globalThis)) {
        if (snapshot.has(key)) continue;
        const val = globalThis[key];
        if (typeof val !== "function") continue;
        snapshot.add(key);
        try {
          contextBridge.exposeInMainWorld(key, val);
        } catch (e) {}
      }
    } catch (e) {}
  };

  // كود الرندر بيشتغل بعد ما الـ DOM يخلص تحميل — زي سكريبت آخر الصفحة بالظبط
  const runJsc = () => {
    try {
      delete require.cache[require.resolve(jscFile)];
    } catch (e) {}
    try {
      require(jscFile);
    } catch (e) {
      console.error("secure renderer load failed:", e);
    }
    exposeNewGlobals();
    // نمرّة إضافية دورية عشان الدوال المتعرّفة لاحقًا (بعد await)
    let rounds = 0;
    const timer = setInterval(() => {
      exposeNewGlobals();
      rounds++;
      if (rounds >= 60) clearInterval(timer);
    }, 1000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runJsc, { once: true });
  } else {
    runJsc();
  }
})();
