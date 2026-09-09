const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  globalShortcut,
  shell,
  clipboard,
  protocol,
  session: electronSession,
} = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFileSync, execFile, exec } = require("child_process");
const { WebSocket } = require("ws");

const KeyboardService = require("./src/services/keyboard");
const LocalOverlayServer = require("./src/services/local-overlay-server");
const secureAssets = require("./src/services/secure-assets");

// بروتوكول الصفحات المشفرة — لازم يتسجل قبل ما التطبيق يجهز
// الصفحات بتتحمل من eldaly://app/... والـ HTML/CSS بيتفك تشفيره في الذاكرة
protocol.registerSchemesAsPrivileged([
  {
    scheme: "eldaly",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// Single instance lock
app.commandLine.appendSwitch("disable-gpu");
app.disableHardwareAcceleration();
app.setAppUserModelId("com.eldaly.stream");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
const keyboardService = new KeyboardService();

// Configurable Backend Server URL
let BACKEND_URL = process.env.BACKEND_URL || "https://kemoeldaly.onrender.com";
const OVERLAY_BASE = process.env.OVERLAY_BASE || "https://overlay.eldalystream.com"; // دومين الأوفرلاي والويدجت
const configFilePath = path.join(app.getPath("userData"), "server_config.json");
let overlayToken = null; // التوكن السداسي بتاع الحساب — بيحمي روابط الأوفرلاي
let appSessionToken = null; // جلسة الـ API مع الباك إند
// قفل الاستيلاء: لو الحساب اتفتح من جهاز/مكان تاني — الجهاز ده يتقفل بالكامل
let kickedLock = false;

function loadLocalConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const cfg = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
      if (cfg.backendUrl) BACKEND_URL = cfg.backendUrl;
      if (cfg.overlayToken) overlayToken = cfg.overlayToken;
    }
  } catch (e) {}
}
loadLocalConfig();

function saveLocalConfig() {
  try {
    fs.writeFileSync(
      configFilePath,
      JSON.stringify(
        { backendUrl: BACKEND_URL, overlayToken: overlayToken },
        null,
        2,
      ),
    );
  } catch (e) {}
}

function getHwid() {
  let uuidOutput = "";
  try {
    uuidOutput = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_ComputerSystemProduct).UUID",
      ],
      {
        encoding: "utf8",
        timeout: 8000,
      },
    );
  } catch (e) {
    uuidOutput = "";
  }
  const uuid = String(uuidOutput || "").trim();
  return uuid || "unknown-hwid";
}

const localHwid = getHwid();

// قفل الجهاز لما الحساب يتفتح من مكان تاني: شاشة حجب + قطع الـ WS
// + منع أي restore تلقائي — والمستخدم يقدر يسجل دخول تاني (آخر واحد يكسب)
function lockKicked(reason) {
  kickedLock = true;
  if (wsClient) {
    try {
      wsClient.removeAllListeners();
      wsClient.close();
    } catch (e) {}
    wsClient = null;
  }
  loadLicensePage(reason || "الحساب مفتوح على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة");
}

// Helper for calling Backend REST API
async function apiFetch(endpoint, options = {}, _retried = false) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    // الجهاز مرتبط بالجلسة — السيرفر بيرفض التوكن من جهاز تاني
    ...(localHwid ? { "x-app-hwid": localHwid } : {}),
    ...(appSessionToken ? { "x-app-session": appSessionToken } : {}),
    ...(options.headers || {}),
  };
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    // الجهاز اتطرد (الحساب اتفتح من مكان تاني): قفل فوري + منع أي restore
    const probe = res.clone();
    const probeJson = await probe.json().catch(() => null);
    if (probeJson && probeJson.kicked) {
      lockKicked(probeJson.reason);
    } else if (
      kickedLock &&
      res.ok &&
      probeJson &&
      (probeJson.ok === true || probeJson.loggedIn === true || probeJson.success === true)
    ) {
      kickedLock = false; // رجع مسيطر بالجلسة (مثلاً عمل login من الشاشة المقفولة)
    }
    // الجلسة بقت غير صحيحة (مثلاً السيرفر اتعمل restart) — استعادة فورية وإعادة المحاولة مرة واحدة
    if (
      res.status === 401 &&
      !_retried &&
      appSessionToken &&
      !kickedLock &&
      !endpoint.startsWith("/api/auth/")
    ) {
      const restored = await apiFetch(
        "/api/auth/restore-session",
        { method: "POST", body: JSON.stringify({ hwid: localHwid }) },
        true,
      );
      if (restored && restored.sessionToken) {
        consumeAuthTokens(restored);
        return apiFetch(endpoint, options, true);
      }
    }
    return probeJson || (await res.json().catch(() => ({})));
  } catch (err) {
    console.error(`[API Fetch Error] ${endpoint}:`, err.message);
    return {
      ok: false,
      success: false,
      error: "Failed to connect to backend server: " + err.message,
    };
  }
}

// ==========================================================================
// Local Overlay Server — صفحات OBS بتتقدم من جهاز المستخدم نفسه
// ==========================================================================
const widgetConfigCache = new Map();
let widgetConfigFetching = new Map();

async function getWidgetConfig(id) {
  if (widgetConfigCache.has(id)) return widgetConfigCache.get(id);
  if (widgetConfigFetching.has(id)) return widgetConfigFetching.get(id);
  const promise = (async () => {
    try {
      const res = await apiFetch(
        `/api/widgets/${encodeURIComponent(id)}/config`,
      );
      const cfg = res && res !== null && !res.error ? res : null;
      widgetConfigCache.set(id, cfg || {});
      return cfg || {};
    } catch (e) {
      widgetConfigCache.set(id, {});
      return {};
    } finally {
      widgetConfigFetching.delete(id);
    }
  })();
  widgetConfigFetching.set(id, promise);
  return promise;
}

const localOverlay = new LocalOverlayServer({
  getConfig: getWidgetConfig,
  readAsset: secureAssets.readAsset,
  onQueueUpdate: (status) => {
    mainWindow?.webContents.send("screen:queueUpdate", status);
  },
});

// ==========================================================================
// بروتوكول eldaly:// — تقديم صفحات التطبيق (مشفرة في النسخة المبنية)
// ==========================================================================
function registerAppProtocol() {
  const srcRoot = path.join(__dirname, "src");
  protocol.handle("eldaly", async (request) => {
    try {
      const url = new URL(request.url);
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rel) rel = "index.html";
      const filePath = path.resolve(srcRoot, rel);
      if (filePath !== srcRoot && !filePath.startsWith(srcRoot + path.sep)) {
        return new Response("Not found", { status: 404 });
      }
      const data = await secureAssets.readAsset(filePath);
      if (!data) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(data, {
        headers: { "Content-Type": secureAssets.mimeFor(filePath) },
      });
    } catch (e) {
      return new Response("Error", { status: 500 });
    }
  });
}

// تحميل صفحات التطبيق عبر البروتوكول المشفر بدل file://
function loadAppPage(page, query) {
  if (!mainWindow) return Promise.resolve(false);
  const qs = query ? "?" + query : "";
  return mainWindow
    .loadURL("eldaly://app/" + page + qs)
    .then(() => true)
    .catch(() => false);
}

function loadLicensePage(banReason) {
  return loadAppPage(
    "license.html",
    banReason ? "ban=" + encodeURIComponent(banReason) : null,
  );
}

function applyOverlayAuth(token) {
  overlayToken = token || null;
  localOverlay.setToken(overlayToken);
  saveLocalConfig();
  if (overlayToken) {
    mainWindow?.webContents.send("overlay:base", {
      base: OVERLAY_BASE, // روابط سحابية — OBS بيحمّل من الدومين مباشرة بتوكن الحساب
      token: overlayToken,
    });
  }
}

// يستخرج التوكنات من ردود تسجيل الدخول/استعادة الجلسة
function consumeAuthTokens(result) {
  if (!result || typeof result !== "object") return;
  if (result.sessionToken && result.sessionToken !== appSessionToken) {
    appSessionToken = result.sessionToken;
    // اتصل فورًا بالـ WebSocket بالجلسة الجديدة بدل انتظار إعادة المحاولة
    connectBackendWebSocket();
  }
  if (result.overlayToken && result.overlayToken !== overlayToken) {
    applyOverlayAuth(result.overlayToken);
  }
}

// WebSocket Connection to Backend Server
let wsClient = null;
let wsReconnectTimer = null;

function runLocalMinecraft(payload) {
  const mc = payload?.mc || {};
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  const actionName = payload?.actionName || "minecraft";
  const ip = String(mc.ip || "127.0.0.1").trim() || "127.0.0.1";
  const port = String(mc.port || "4567").trim() || "4567";
  const password = mc.password || "";
  const send = (command) => {
    const body = new URLSearchParams({ command }).toString();
    fetch(`http://${ip}:${port}/v1/server/exec`, {
      method: "POST",
      headers: {
        key: password,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })
      .then((res) => {
        if (!res.ok) {
          console.error(
            `[Local Minecraft] ${actionName} HTTP ${res.status} /${command}`,
          );
        } else {
          console.log(`[Local Minecraft] ${actionName} → /${command}`);
        }
      })
      .catch((err) => {
        console.error(`[Local Minecraft] ${actionName} failed: ${err.message}`);
      });
  };
  for (const job of jobs) {
    const command = String(job?.command || "").trim();
    if (!command) continue;
    const delay = Math.max(0, parseInt(job.delay, 10) || 0);
    if (delay > 0) setTimeout(() => send(command), delay);
    else send(command);
  }
}

function connectBackendWebSocket() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }

  // اقفل أي اتصال قديم قبل فتح الجديد — منع تراكم الـ sockets (تسريب ذاكرة)
  if (wsClient) {
    try {
      wsClient.removeAllListeners();
      wsClient.close();
    } catch (e) {}
    wsClient = null;
  }

  // الجلسة معانا في الـ URL — الباك إند بيرفض أي اتصال من غيرها أو من جهاز تاني
  const wsUrl =
    BACKEND_URL.replace(/^http/, "ws") +
    "/ws" +
    (appSessionToken
      ? "?session=" +
        appSessionToken +
        (localHwid ? "&hwid=" + encodeURIComponent(localHwid) : "")
      : "");
  try {
    wsClient = new WebSocket(wsUrl);

    wsClient.on("open", () => {
      console.log(`[WS Client] Connected to backend at ${wsUrl}`);
      mainWindow?.webContents.send("backend:status", {
        connected: true,
        url: BACKEND_URL,
      });
    });

    wsClient.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (!msg || !msg.type) return;

        // Handle local execution requests
        if (msg.type === "client:pressKeys" && msg.data) {
          const { keys, delay, actionName } = msg.data;
          keyboardService.sendKeys(keys, delay);
          console.log(
            `[Local Keyboard] KeySender executed for ${actionName}: ${keys}`,
          );
        } else if (msg.type === "client:minecraft" && msg.data) {
          runLocalMinecraft(msg.data);
        } else if (msg.type === "play-local-tts") {
          mainWindow?.webContents.send("play-local-tts", msg.data);
        } else if (msg.type && msg.type.startsWith("ov:")) {
          handleOverlayEvent(msg.type, msg.data);
        } else {
          // Forward all other events to renderer
          mainWindow?.webContents.send(msg.type, msg.data);
        }
      } catch (e) {}
    });

    wsClient.on("close", () => {
      console.log("[WS Client] Disconnected from backend. Retrying in 3s...");
      mainWindow?.webContents.send("backend:status", {
        connected: false,
        url: BACKEND_URL,
      });
      // لو الجهاز مقفول (الحساب اتفتح من مكان تاني) — مفيش إعادة اتصال
      if (kickedLock) return;
      wsReconnectTimer = setTimeout(connectBackendWebSocket, 3000);
    });

    wsClient.on("error", () => {
      wsClient.close();
    });
  } catch (err) {
    wsReconnectTimer = setTimeout(connectBackendWebSocket, 5000);
  }
}

// توجيه أحداث الأوفرلاي القادمة من الباك إند لصفحات OBS المحلية
function handleOverlayEvent(type, data) {
  if (!data || typeof data !== "object") return;
  switch (type) {
    case "ov:media":
      localOverlay.pushMedia(data.screen, data.item);
      break;
    case "ov:alert":
      localOverlay.pushAlert(data.screen, data.item);
      break;
    case "ov:tts":
      localOverlay.pushTTS(data.screen, data.item);
      break;
    case "ov:ttsq":
      localOverlay.pushTTSQueue(data.screen, data.item);
      break;
    case "ov:stats":
      localOverlay.pushStats(data.stats);
      break;
    case "ov:event":
      localOverlay.pushEvent(data.event, data.data);
      break;
    case "ov:ext":
      localOverlay.pushExt(data.event, data.data);
      break;
    case "ov:wtest":
      localOverlay.pushWidgetTest(data.id, data);
      break;
    case "ov:wcfg":
      widgetConfigCache.set(data.id, data.config || {});
      localOverlay.pushWidgetConfig(data.id, data.config || {});
      break;
  }
}

// فتح لينكات خارجية بأمان — http/https فقط (يمنع file:// وأي بروتوكول خطير)
function safeOpenExternal(url) {
  try {
    const parsed = new URL(String(url));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    shell.openExternal(parsed.href);
    return true;
  } catch (e) {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: "#080b16",
    titleBarStyle: "hidden",
    icon: path.join(__dirname, "src", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // preload محتاج يحمّل كود الرندر المشفّر (bytenode) — العزل شغال
      // والـ node مقفول على عالم الصفحة نفسها
      sandbox: false
    }
  });

  // سكيلتون التحميل — بيظهر فورًا بدل الشاشة الفاضية لحد ما
  // السيرفر يرد (مهم خصوصًا لما Render يكون صاحي من النوم)
  loadAppPage("skeleton.html").catch(() => {});

  // Check initial login state
  apiFetch("/api/auth/restore-session", {
    method: "POST",
    body: JSON.stringify({ hwid: localHwid })
  }).then(result => {
    consumeAuthTokens(result);
    if (result.loggedIn) {
      loadMainApp();
    } else if (result.banned) {
      loadLicensePage(result.reason || "");
    } else {
      loadLicensePage();
    }
  }).catch(() => {
    loadLicensePage();
  });

  if (process.env.ELDALY_D3V === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // مفيش نوافذ جديدة من جوه الصفحة — اللينكات الخارجية تفتح في المتصفح
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url);
    return { action: "deny" };
  });

  // التنقل مسموح بس داخل بروتوكول التطبيق — أي حاجة تانية بتتمنع
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!String(url).startsWith("eldaly://")) {
      event.preventDefault();
      safeOpenExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function loadMainApp() {
  if (!mainWindow) return;
  loadAppPage("index.html").then(() => {
    // الروابط السحابية جاهزة — ابعتها للرندر فور فتح التطبيق
    if (overlayToken) {
      mainWindow?.webContents.send("overlay:base", {
        base: OVERLAY_BASE,
        token: overlayToken,
      });
    }
  });
}

function startLicenseWatchdog() {
  // حارس الجلسة السريع: كل 30 ثانية يتأكد إن الجهاز ده لسه هو المسيطر —
  // لو اتطرد (الحساب اتفتح من مكان تاني) يتحقال في أقل من دقيقة
  setInterval(async () => {
    if (kickedLock || !appSessionToken || !mainWindow) return;
    try {
      const r = await fetch(BACKEND_URL + "/api/auth/check-session", {
        headers: {
          "x-app-session": appSessionToken,
          ...(localHwid ? { "x-app-hwid": localHwid } : {}),
        },
        signal: AbortSignal.timeout(10000),
      });
      const j = await r.json().catch(() => ({}));
      if (j && j.kicked) {
        lockKicked(j.reason);
      } else if (r.status === 401) {
        appSessionToken = null; // الجلسة ميتة (restart مثلًا) — الـ watchdog هيصلحها
      }
    } catch (e) {}
  }, 30000);

  setInterval(async () => {
    if (!mainWindow) return;
    if (kickedLock) {
      // مقفول: ممنوع أي restore — الشاشة المقفولة ثابتة لحد ما التاني يهدى
      loadLicensePage("الحساب مفتوح على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة");
      return;
    }
    try {
      const res = await apiFetch("/api/auth/restore-session", {
        method: "POST",
        body: JSON.stringify({ hwid: localHwid })
      });
      // الريت ليمت (429) مش معناه إن الجلسة بايظة — نتخطى دورة الفحص دي بس
      // والدورة الجاية هتعدي، بدل ما نرمي المستخدم على شاشة الدخول بالغلط
      if (res && res.rateLimited) return;
      consumeAuthTokens(res);
      if (!res.loggedIn) {
        if (res.banned) {
          loadLicensePage(res.reason || "");
        } else {
          loadLicensePage();
        }
      }
    } catch (e) {}
  }, 150000);
}

// التحديثات موقوفة بالكامل في هذا البناء — لا فحص ولا رسائل ولا تثبيت تلقائي.

// نبضة كل 10 دقايق — تمنع سيرفر Render من النوم (free tier بينام بعد 15 دقيقة
// سكون). النبضة الأولى فور التشغيل بتصرّي السيرفر فأول الاتصالات بتبقى أسرع.
function startBackendHeartbeat() {
  const ping = () => {
    fetch(BACKEND_URL + "/api/health", { signal: AbortSignal.timeout(15000) })
      .catch(() => {});
  };
  ping();
  setInterval(ping, 10 * 60 * 1000);
}

app.whenReady().then(async () => {
  // البروتوكول المشفر الأول — كل الصفحات بتتحمل منه
  registerAppProtocol();
  // نبضة السيرفر — عشان ميغلطش (بينام) والبرنامج فاتح
  startBackendHeartbeat();
  // شغّل سيرفر الأوفرلاي المحلي — كل روابط OBS هتقف عليه
  try {
    const port = await localOverlay.start();
    console.log(`[LocalOverlay] serving on http://127.0.0.1:${port}`);
  } catch (err) {
    console.error("[LocalOverlay] failed to start:", err);
  }
  applyOverlayAuth(overlayToken);

  createWindow();
  connectBackendWebSocket();
  startLicenseWatchdog();
  setupIPC();

  // أي تنزيل من التطبيق (زي ملف النسخة الاحتياطية) يفتح نافذة حفظ عادية
  // — المستخدم يختار المكان بنفسه بدل ما ينزل تلقائياً في Downloads
  electronSession.defaultSession.on("will-download", (event, item) => {
    const savePath = dialog.showSaveDialogSync(mainWindow, {
      title: "حفظ الملف",
      defaultPath: item.getFilename(),
    });
    if (savePath) item.setSavePath(savePath);
    else item.cancel();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (wsClient) {
    try { wsClient.close(); } catch (e) {}
  }
  // سيب الجلسة على السيرفر — عشان تقدر تفتح من جهاز تاني فوراً من غير انتظار
  try {
    fetch(BACKEND_URL + "/api/auth/release-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hwid: localHwid }),
    }).catch(() => {});
  } catch (e) {}
  if (process.platform !== "darwin") {
    // مهلة صغيرة عشان طلب التسريع يوصل قبل الإقفال
    setTimeout(() => app.quit(), 400);
    setTimeout(() => app.quit(), 2000); // failsafe
  }
});

function setupIPC() {
  // Window controls
  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on("window:close", () => mainWindow?.close());

  // Backend URL config
  ipcMain.handle("server:getUrl", () => BACKEND_URL);
  ipcMain.handle("server:setUrl", (event, newUrl) => {
    // مقفول في الإنتاج: لو واجهة معدّلة أو مخترقة واجهّه البرنامج لسيرفر خبيث
    // تسرق كلمة السر من شاشة الدخول — التغيير لوضع التطوير فقط
    if (process.env.ELDALY_D3V !== "1") return BACKEND_URL;
    if (newUrl) {
      try {
        const parsed = new URL(String(newUrl));
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return BACKEND_URL; // ارفض أي بروتوكول تاني
        }
        BACKEND_URL = parsed.origin + parsed.pathname.replace(/\/+$/, "");
      } catch (e) {
        return BACKEND_URL;
      }
      saveLocalConfig();
      connectBackendWebSocket();
    }
    return BACKEND_URL;
  });

  // Auth & Licensing
  ipcMain.handle("license:getHwid", () => localHwid);
  ipcMain.handle("license:register", async (event, payload) => {
    const result = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ ...(payload || {}), hwid: localHwid }) });
    consumeAuthTokens(result);
    if (result && result.ok) kickedLock = false; // دخل بنفسه = آخر واحد يكسب
    return result;
  });
  ipcMain.handle("license:login", async (event, payload) => {
    const result = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ ...(payload || {}), hwid: localHwid }) });
    consumeAuthTokens(result);
    if (result && result.ok) kickedLock = false; // دخل بنفسه = آخر واحد يكسب
    return result;
  });
  ipcMain.handle("license:sendReset", (event, payload) =>
    apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload || {}) })
  );
  ipcMain.handle("license:changePassword", (event, payload) =>
    apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify(payload || {}) })
  );
  ipcMain.handle("license:getTier", async () => {
    const res = await apiFetch("/api/auth/tier");
    return res.tier || "free";
  });
  ipcMain.handle("license:openMain", async () => {
    const res = await apiFetch("/api/auth/restore-session", {
      method: "POST",
      body: JSON.stringify({ hwid: localHwid })
    });
    consumeAuthTokens(res);
    if (res.loggedIn) {
      loadMainApp();
      return true;
    }
    if (res.banned) {
      loadLicensePage(res.reason || "");
    } else {
      loadLicensePage();
    }
    return false;
  });
  ipcMain.handle("license:logout", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    // امسح التوكنات واقفل السيرفر المحلي — مفيش أوفرلاي بعد الخروج
    appSessionToken = null;
    widgetConfigCache.clear();
    applyOverlayAuth(null);
    loadLicensePage();
    return true;
  });
  ipcMain.handle("license:getState", () => apiFetch("/api/auth/state"));
  ipcMain.handle("license:getPaymentLinks", () => apiFetch("/api/auth/payment-links"));
  ipcMain.handle("license:copy", (event, text) => {
    clipboard.writeText(text);
    return true;
  });
  ipcMain.handle("license:openExternal", (event, url) => safeOpenExternal(url));

  // TikTok Controls
  ipcMain.handle("tiktok:connect", (event, username) =>
    apiFetch("/api/tiktok/connect", { method: "POST", body: JSON.stringify({ username }) })
  );
  ipcMain.handle("tiktok:disconnect", () =>
    apiFetch("/api/tiktok/disconnect", { method: "POST" })
  );
  ipcMain.handle("tiktok:status", () => apiFetch("/api/tiktok/status"));
  ipcMain.handle("tiktok:getAvatar", (event, user) => apiFetch(`/api/tiktok/avatar/${encodeURIComponent(user)}`));

  // Store Management
  ipcMain.handle("store:get", (event, key) => apiFetch(`/api/store/${encodeURIComponent(key)}`));
  ipcMain.handle("store:set", (event, key, value) =>
    apiFetch(`/api/store/${encodeURIComponent(key)}`, { method: "POST", body: JSON.stringify({ value }) })
  );

  // Actions
  ipcMain.handle("actions:getAll", () => apiFetch("/api/actions"));
  ipcMain.handle("actions:save", (event, actions) =>
    apiFetch("/api/actions", { method: "POST", body: JSON.stringify({ actions }) })
  );
  ipcMain.handle("actions:execute", (event, actionId) =>
    apiFetch("/api/actions/execute", { method: "POST", body: JSON.stringify({ actionId }) })
  );
  ipcMain.handle("actions:executeDelayed", (event, actionId, delayMs) =>
    apiFetch("/api/actions/execute-delayed", { method: "POST", body: JSON.stringify({ actionId, delaySeconds: delayMs }) })
  );
  ipcMain.handle("actions:duplicate", (event, actionId) =>
    apiFetch("/api/actions/duplicate", { method: "POST", body: JSON.stringify({ actionId }) })
  );

  // Events
  ipcMain.handle("events:getAll", () => apiFetch("/api/events"));
  ipcMain.handle("events:save", (event, events) =>
    apiFetch("/api/events", { method: "POST", body: JSON.stringify({ events }) })
  );
  ipcMain.handle("events:test", (event, eventId) =>
    apiFetch("/api/events/test", { method: "POST", body: JSON.stringify({ eventId }) })
  );
  ipcMain.handle("events:testDelayed", (event, eventId, delayMs) =>
    apiFetch("/api/events/test-delayed", { method: "POST", body: JSON.stringify({ eventId, delaySeconds: delayMs }) })
  );

  // Gifts
  ipcMain.handle("gifts:getAll", () => apiFetch("/api/tiktok/gifts"));
  ipcMain.handle("gifts:getLive", () => apiFetch("/api/tiktok/gifts-live"));

  // Widgets & Overlays — الروابط بتتولد محليًا بالتوكن السداسي بتاع الحساب
  ipcMain.handle("widget:setConfig", async (event, widgetId, config) => {
    const result = await apiFetch(`/api/widgets/${encodeURIComponent(widgetId)}/config`, { method: "POST", body: JSON.stringify({ config }) });
    widgetConfigCache.set(widgetId, config || {});
    return result;
  });
  ipcMain.handle("widget:getConfig", (event, widgetId) =>
    apiFetch(`/api/widgets/${encodeURIComponent(widgetId)}/config`)
  );
  ipcMain.handle("widget:test", (event, widgetId, payload) =>
    apiFetch(`/api/widgets/${encodeURIComponent(widgetId)}/test`, { method: "POST", body: JSON.stringify(payload || {}) })
  );
  // روابط الأوفرلاي السحابية — من الدومين مباشرة بتوكن الحساب الفريد
  ipcMain.handle("overlay:getUrls", () => {
    if (!overlayToken) return [];
    const urls = [];
    for (let i = 1; i <= 10; i++) {
      urls.push({ screen: i, url: `${OVERLAY_BASE}/overlay/${overlayToken}/${i}` });
    }
    return urls;
  });
  ipcMain.handle("overlay:getInfo", () => ({
    base: OVERLAY_BASE,
    token: overlayToken || "",
  }));
  ipcMain.handle("overlay:getWidgetUrl", (event, name, qs) =>
    overlayToken
      ? `${OVERLAY_BASE}/widget/${overlayToken}/${String(name || "")}${qs ? "?" + qs : ""}`
      : ""
  );
  ipcMain.handle("overlay:testTTS", (event, text, options) =>
    apiFetch("/api/overlay/test-tts", { method: "POST", body: JSON.stringify({ text, options }) })
  );
  ipcMain.handle("screen:getSettings", (event, screenId) =>
    apiFetch(`/api/overlay/screens/${encodeURIComponent(screenId)}`)
  );
  ipcMain.handle("screen:setSettings", (event, screenId, settings) =>
    apiFetch(`/api/overlay/screens/${encodeURIComponent(screenId)}`, { method: "POST", body: JSON.stringify(settings || {}) })
  );
  ipcMain.handle("screen:getAllSettings", () => apiFetch("/api/overlay/screens"));
  ipcMain.handle("screen:getQueueStatus", () => localOverlay.getQueueStatus());

  // Extensions
  ipcMain.handle("ext:command", (event, command, arg1, arg2) =>
    apiFetch("/api/ext/command", { method: "POST", body: JSON.stringify({ command, arg1, arg2 }) })
  );
  ipcMain.handle("ext:scoreboard:update", (event, side, amount) =>
    apiFetch("/api/ext/scoreboard/update", { method: "POST", body: JSON.stringify({ side, amount }) })
  );
  ipcMain.handle("ext:scoreboard:setScore", (event, left, right) =>
    apiFetch("/api/ext/scoreboard/set", { method: "POST", body: JSON.stringify({ left, right }) })
  );
  ipcMain.handle("ext:scoreboard:reset", () =>
    apiFetch("/api/ext/scoreboard/reset", { method: "POST" })
  );
  ipcMain.handle("ext:scoreboard:getState", () => apiFetch("/api/ext/scoreboard"));
  ipcMain.handle("ext:timer:start", (event, minutes) =>
    apiFetch("/api/ext/timer/start", { method: "POST", body: JSON.stringify({ minutes }) })
  );
  ipcMain.handle("ext:timer:stop", () =>
    apiFetch("/api/ext/timer/stop", { method: "POST" })
  );
  ipcMain.handle("ext:timer:reset", (event, minutes) =>
    apiFetch("/api/ext/timer/reset", { method: "POST", body: JSON.stringify({ minutes }) })
  );
  ipcMain.handle("ext:timer:addTime", (event, seconds) =>
    apiFetch("/api/ext/timer/add-time", { method: "POST", body: JSON.stringify({ seconds }) })
  );
  ipcMain.handle("ext:timer:removeTime", (event, seconds) =>
    apiFetch("/api/ext/timer/remove-time", { method: "POST", body: JSON.stringify({ seconds }) })
  );
  ipcMain.handle("ext:timer:getState", () => apiFetch("/api/ext/timer"));

  // Profiles
  ipcMain.handle("profiles:list", () => apiFetch("/api/profiles"));
  ipcMain.handle("profiles:create", (event, name) =>
    apiFetch("/api/profiles/create", { method: "POST", body: JSON.stringify({ name }) })
  );
  ipcMain.handle("profiles:rename", (event, id, name) =>
    apiFetch("/api/profiles/rename", { method: "POST", body: JSON.stringify({ id, name }) })
  );
  ipcMain.handle("profiles:delete", (event, id) =>
    apiFetch(`/api/profiles/${encodeURIComponent(id)}`, { method: "DELETE" })
  );
  ipcMain.handle("profiles:switch", (event, id) =>
    apiFetch("/api/profiles/switch", { method: "POST", body: JSON.stringify({ id }) })
  );
  ipcMain.handle("profiles:duplicate", (event, id, name) =>
    apiFetch("/api/profiles/duplicate", { method: "POST", body: JSON.stringify({ id, name }) })
  );
  ipcMain.handle("profile:resetActions", () => apiFetch("/api/profiles/reset-actions", { method: "POST" }));
  ipcMain.handle("profile:resetEvents", () => apiFetch("/api/profiles/reset-events", { method: "POST" }));
  ipcMain.handle("profile:resetAll", () => apiFetch("/api/profiles/reset-all", { method: "POST" }));

  // مكتبة الأصوات: تنزيل الصوت المختار كملف محلي على جهاز العميل —
  // التشغيل بعدها محلي 100% (مفيش اعتماد على الموقع وقت البث)
  ipcMain.handle("system:downloadSound", (e, url) => {
    try {
      const dir = path.join(app.getPath("userData"), "sounds");
      fs.mkdirSync(dir, { recursive: true });
      const hash = crypto.createHash("sha1").update(String(url)).digest("hex").slice(0, 20);
      const extMatch = String(url).split("?")[0].match(/\.(mp3|wav|ogg|m4a)$/i);
      const dest = path.join(dir, "sl-" + hash + (extMatch ? extMatch[1] : ".mp3"));
      const cookieJar = path.join(dir, "myinstants.cookies");
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
      execFileSync(
        "curl",
        [
          "-sS",
          "-L",
          "--max-time",
          "30",
          "-c",
          cookieJar,
          "-b",
          cookieJar,
          "-A",
          userAgent,
          "-o",
          "NUL",
          "https://www.myinstants.com/en/",
        ],
        { encoding: "utf8" }
      );
      execFileSync(
        "curl",
        [
          "-s",
          "-f",
          "--max-time",
          "120",
          "-L",
          "-b",
          cookieJar,
          "-A",
          userAgent,
          "-H",
          "Referer: https://www.myinstants.com/",
          "-o",
          dest,
          String(url),
        ],
        { encoding: "utf8" }
      );
      const st = fs.statSync(dest);
      if (!st.size) throw new Error("empty download");
      return { ok: true, path: dest };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // مكتبة الأصوات: البحث عبر بوابة السيرفر أولًا (myinstants شالوا الـ API
  // الرسمي فالباك إند بسكرابينج صفحة البحث) — ولو السيرفر مش متاح نجرب curl محلي
  ipcMain.handle("system:searchSounds", async (event, query, page = 1) => {
    const viaServer = async () => {
      const j = await apiFetch(
        "/api/system/sounds?query=" +
          encodeURIComponent(query || "") +
          "&page=" +
          (page || 1),
      );
      if (j && j.error) return null;
      if (!j || !Array.isArray(j.results) || j.results.length === 0) return null;
      return j;
    };
    const viaCurl = () => {
      try {
        const url =
          "https://www.myinstants.com/en/search/?name=" +
          encodeURIComponent(query || "") +
          ((page || 1) > 1 ? "&page=" + page : "");
        const out = execFileSync(
          "curl",
          [
            "-s",
            "--max-time",
            "25",
            "-A",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "-H",
            "Referer: https://www.myinstants.com/",
            url,
          ],
          { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
        );
        const results = [];
        const seen = new Set();
        const re = /onclick\s*=\s*"play\(\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'([^']*)'\s*\)"[\s\S]*?title\s*=\s*"Play\s+([^\"]+)"/gi;
        let m;
        while ((m = re.exec(out)) && results.length < 50) {
          const sound = m[1].startsWith("http") ? m[1] : "https://www.myinstants.com" + m[1];
          if (seen.has(sound)) continue;
          seen.add(sound);
          results.push({ name: (m[3] || m[2] || "sound").replace(/\s+sound$/i, ""), sound });
        }
        return { results, next: results.length >= 10 ? (page || 1) + 1 : null };
      } catch (e) {
        return null;
      }
    };
    try {
      const fromServer = await viaServer();
      if (fromServer) return fromServer;
    } catch (e) {}
    const fromCurl = viaCurl();
    if (fromCurl) return fromCurl;
    return { error: "Sound library connection failed — check your internet" };
  });

  // Local System Fonts
  ipcMain.handle("system:getFonts", async () => {
    try {
      const psCmd = "[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }";
      const out = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCmd], {
        encoding: "utf8", timeout: 15000, windowsHide: true
      });
      const fonts = out.split(/\r?\n/).map(i => i.trim()).filter(i => i.length > 0);
      return fonts.sort((a, b) => a.localeCompare(b));
    } catch (err) {
      console.error("Failed to get system fonts:", err);
      return [];
    }
  });

  // طلبات الأغاني — بوابة موحدة على /api/songs/* (جلسة البرنامج نفسها)
  ipcMain.handle("sr:request", (event, payload) => {
    const { method = "GET", path: p, body } = payload || {};
    return apiFetch("/api/songs/" + String(p || "state"), {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  });

  // Local File Dialog
  ipcMain.handle("dialog:openFile", async (event, filters) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: filters?.filters || [{ name: "All Files", extensions: ["*"] }]
    });
    if (res.canceled) return null;
    return res.filePaths[0];
  });

  // هدف رفع الميديا: نقرأ الملف ونرجّع للـ preload كل اللي محتاجه للـ XHR
  // (الرفع نفسه بيحصل في الـ preload عشان نسبة التقدم تشتغل حية)
  ipcMain.handle("media:getUploadTarget", (event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "file not found" };
      const size = fs.statSync(filePath).size;
      if (size > 200 * 1024 * 1024) return { ok: false, error: "الملف أكبر من 200MB" };
      const buffer = fs.readFileSync(filePath);
      return {
        ok: true,
        url: `${BACKEND_URL}/api/media/upload?name=${encodeURIComponent(path.basename(filePath))}`,
        buffer,
        session: appSessionToken || "",
        hwid: localHwid || "",
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Backup — نافذة التصدير/الاستيراد المشفرة: كل الندوات بتمر على apiFetch
  // (جلسة + حماية kicked + الحظر) — الفرونت بيستلم/يبعت blob مشفر بس
  ipcMain.handle("backup:export", (e, categories) =>
    apiFetch("/api/backup/export", { method: "POST", body: JSON.stringify({ categories }) })
  );
  ipcMain.handle("backup:counts", () =>
    apiFetch("/api/backup/counts", { method: "POST", body: JSON.stringify({ categories: ["actions", "events", "hotkeys", "widgets", "tts", "songs", "connection"] }) })
  );
  ipcMain.handle("backup:preview", (e, blob) =>
    apiFetch("/api/backup/import", { method: "POST", body: JSON.stringify({ blob }) })
  );
  ipcMain.handle("backup:apply", (e, blob, categories) =>
    apiFetch("/api/backup/import", { method: "POST", body: JSON.stringify({ blob, apply: categories }) })
  );

  // Local Games Support
  ipcMain.handle("games:getList", () => {
    const gamesDir = path.join(__dirname, "src", "games");
    const list = [];
    if (fs.existsSync(gamesDir)) {
      const dirs = fs.readdirSync(gamesDir);
      for (const d of dirs) {
        const cfgPath = path.join(gamesDir, d, "config.json");
        if (fs.existsSync(cfgPath)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
            if (fs.existsSync(path.join(gamesDir, d, "cover.jpg"))) {
              parsed.cover = "games/" + d + "/cover.jpg";
            } else {
              parsed.cover = "games/" + d + "/cover.png";
            }
            list.push(parsed);
          } catch (e) {}
        }
      }
    }
    return list;
  });

  ipcMain.handle("games:locate", async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: "Locate Game Executable",
      properties: ["openFile"],
      filters: [{ name: "Executables", extensions: ["exe"] }]
    });
    if (res.canceled) return null;
    return res.filePaths[0];
  });

  ipcMain.handle("games:launch", (event, gameId, gamePath) => {
    return new Promise((resolve) => {
      try {
        let exeTarget = gamePath;
        if (!fs.existsSync(exeTarget)) {
          return resolve({ success: false, error: "Game executable not found" });
        }
        execFile(exeTarget, ["--launcher=tikfinty"], { cwd: path.dirname(exeTarget) }, (err) => {
          if (err) console.error("Game launch error:", err);
        });
        resolve({ success: true });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });

  ipcMain.on("games:openLink", (event, url) => {
    safeOpenExternal(url);
  });

  // Local Hotkeys Registration
  setupLocalHotkeys();
}

function setupLocalHotkeys() {
  let customHotkeys = [];
  let scoreboardHotkeys = {};
  let keyMap = new Map();
  let uiohookStarted = false;

  function convertKeyToCode(key) {
    if (!key) return undefined;
    try {
      const { UiohookKey } = require("uiohook-napi");
      if (key.startsWith("Key")) return UiohookKey[key.replace("Key", "")];
      if (key.startsWith("Digit")) return UiohookKey[key.replace("Digit", "")];
      if (UiohookKey[key] !== undefined) return UiohookKey[key];
    } catch (e) {}
    return undefined;
  }

  function registerAll() {
    globalShortcut.unregisterAll();
    keyMap.clear();

    const bindKey = (key, callback) => {
      if (!key || key === "Press...") return;
      const code = convertKeyToCode(key);
      if (code !== undefined) {
        if (!keyMap.has(code)) keyMap.set(code, []);
        keyMap.get(code).push(callback);
      } else {
        try { globalShortcut.register(key, callback); } catch (e) {}
      }
    };

    if (!uiohookStarted) {
      uiohookStarted = true;
      try {
        const { uIOhook } = require("uiohook-napi");
        uIOhook.on("keydown", (e) => {
          const cbs = keyMap.get(e.keycode);
          if (cbs) cbs.forEach(cb => cb());
        });
        uIOhook.start();
      } catch (err) {
        console.error("uIOhook failed:", err.message);
      }
    }

    if (scoreboardHotkeys.leftUp) bindKey(scoreboardHotkeys.leftUp, () => apiFetch("/api/ext/scoreboard/update", { method: "POST", body: JSON.stringify({ side: "left", amount: 1 }) }));
    if (scoreboardHotkeys.leftDown) bindKey(scoreboardHotkeys.leftDown, () => apiFetch("/api/ext/scoreboard/update", { method: "POST", body: JSON.stringify({ side: "left", amount: -1 }) }));
    if (scoreboardHotkeys.rightUp) bindKey(scoreboardHotkeys.rightUp, () => apiFetch("/api/ext/scoreboard/update", { method: "POST", body: JSON.stringify({ side: "right", amount: 1 }) }));
    if (scoreboardHotkeys.rightDown) bindKey(scoreboardHotkeys.rightDown, () => apiFetch("/api/ext/scoreboard/update", { method: "POST", body: JSON.stringify({ side: "right", amount: -1 }) }));
    if (scoreboardHotkeys.reset) bindKey(scoreboardHotkeys.reset, () => apiFetch("/api/ext/scoreboard/reset", { method: "POST" }));

    for (const hk of customHotkeys) {
      bindKey(hk.key, () => {
        if (hk.targetType === "action") {
          apiFetch("/api/actions/execute", { method: "POST", body: JSON.stringify({ actionId: hk.targetId }) });
        }
      });
    }
  }

  ipcMain.handle("system:registerCustomHotkeys", (event, hotkeys) => {
    customHotkeys = hotkeys || [];
    registerAll();
    return true;
  });

  ipcMain.handle("ext:scoreboard:registerHotkeys", (event, hotkeys) => {
    scoreboardHotkeys = hotkeys || {};
    registerAll();
    return true;
  });
}
