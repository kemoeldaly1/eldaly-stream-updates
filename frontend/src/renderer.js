(() => {
  if (typeof document === "undefined") {
    return;
  }
  const vLSuidoverlaypositionfi = "\n    .uid-overlay{position:fixed;inset:0;background:rgba(4,4,6,.62);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s ease}\n    .uid-overlay.uid-in{opacity:1}\n    .uid-card{width:min(400px,calc(100vw - 48px));background:#131318;border:1px solid rgba(255,255,255,.07);border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.6),0 0 0 1px rgba(212,175,55,.07);overflow:hidden;transform:scale(.95);transition:transform .16s cubic-bezier(.34,1.4,.64,1)}\n    .uid-overlay.uid-in .uid-card{transform:scale(1)}\n    .uid-top{height:2px;background:linear-gradient(90deg,transparent,#d4af37,transparent)}\n    .uid-body{padding:26px 26px 22px}\n    .uid-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}\n    .uid-ico{width:38px;height:38px;flex:0 0 38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(212,175,55,.10);border:1px solid rgba(212,175,55,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}\n    .uid-ico.uid-danger{background:rgba(198,90,84,.10);border-color:rgba(198,90,84,.4)}\n    .uid-title{font-family:'Cinzel','Manrope',serif;font-size:15px;font-weight:700;letter-spacing:.8px;color:#ecd28a}\n    .uid-msg{font-size:13.5px;line-height:1.9;color:#a6a198;white-space:pre-line;unicode-bidi:plaintext;text-align:center;direction:rtl;margin-bottom:24px}\n    .uid-row{display:flex;gap:10px;justify-content:center;direction:rtl}\n    .uid-btn{flex:1;max-width:170px;padding:10px 16px;border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:800;letter-spacing:.4px;cursor:pointer;transition:all .18s cubic-bezier(.4,0,.2,1);border:none}\n    .uid-ok{background:linear-gradient(180deg,#e8ca74,#c69c2d);color:#201803;box-shadow:0 2px 10px rgba(212,175,55,.22),inset 0 1px 0 rgba(255,255,255,.25)}\n    .uid-ok:hover{filter:brightness(1.08);box-shadow:0 4px 16px rgba(212,175,55,.3),inset 0 1px 0 rgba(255,255,255,.25)}\n    .uid-ok.uid-danger{background:linear-gradient(180deg,#d97a74,#b04a44);color:#2a0f0d;box-shadow:0 2px 10px rgba(198,90,84,.25),inset 0 1px 0 rgba(255,255,255,.2)}\n    .uid-cancel{background:rgba(255,255,255,.03);color:#a6a198;border:1px solid rgba(255,255,255,.1)}\n    .uid-cancel:hover{border-color:rgba(255,255,255,.2);color:#ece9e1}\n  ";
  const v = document.createElement("style");
  v.id = "uid-style";
  v.textContent = vLSuidoverlaypositionfi;
  document.head.appendChild(v);
  // ===== روابط الأوفرلاي المحلية — بتتولد بالتوكن السداسي بتاع الحساب =====
  let wBase = "http://127.0.0.1:7330";
  let wToken = "";
  function widgetUrl(name, qs) {
    const path = wToken ? "/widget/" + wToken + "/" + name : "/widget/" + name;
    return wBase + path + (qs ? "?" + qs : "");
  }
  function rewriteWidgetUrlInputs() {
    document.querySelectorAll("input[readonly]").forEach(inp => {
      const val = inp.value || "";
      const m = val.match(/\/widget\/([a-z0-9-]+)\?(.+)$/i);
      if (m && !val.includes("/" + wToken + "/")) {
        inp.value = widgetUrl(m[1], m[2]);
      }
    });
  }
  function applyOverlayBase(info) {
    if (info && info.base) {
      wBase = info.base;
      wToken = info.token || "";
      rewriteWidgetUrlInputs();
    }
  }
  try {
    api.overlay.onBase(applyOverlayBase);
    api.overlay.getInfo().then(applyOverlayBase).catch(() => {});
  } catch (e) {}
  const vA = [];
  let v2 = null;
  const v3 = /delete|حذف|reset|مسح|warning|تحذير/i;
  function f(p, p2 = {}) {
    return new Promise(p3 => {
      vA.push({
        msg: String(p),
        opts: p2,
        resolve: p3
      });
      if (!v2) {
        f2();
      }
    });
  }
  function f2() {
    const v4 = vA.shift();
    if (!v4) {
      v2 = null;
      return;
    }
    v2 = v4;
    const {
      msg: r1,
      opts: r2,
      resolve: r3
    } = v4;
    const v5 = r2.kind === "confirm";
    const v6 = r2.danger !== undefined ? !!r2.danger : v3.test(r1);
    const divEl = document.createElement("div");
    divEl.className = "uid-overlay";
    const divEl2 = document.createElement("div");
    divEl2.className = "uid-card";
    divEl2.setAttribute("role", "dialog");
    divEl2.setAttribute("aria-modal", "true");
    const divEl3 = document.createElement("div");
    divEl3.className = "uid-top";
    const divEl4 = document.createElement("div");
    divEl4.className = "uid-body";
    const divEl5 = document.createElement("div");
    divEl5.className = "uid-head";
    const divEl6 = document.createElement("div");
    divEl6.className = "uid-ico" + (v6 ? " uid-danger" : "");
    divEl6.textContent = r2.icon || (v6 ? "⚠" : "✦");
    const divEl7 = document.createElement("div");
    divEl7.className = "uid-title";
    divEl7.textContent = r2.title || (v5 ? "تأكيد" : "تنبيه");
    divEl5.appendChild(divEl6);
    divEl5.appendChild(divEl7);
    const divEl8 = document.createElement("div");
    divEl8.className = "uid-msg";
    divEl8.textContent = r1;
    const divEl9 = document.createElement("div");
    divEl9.className = "uid-row";
    let v16 = null;
    if (v5) {
      v16 = document.createElement("button");
      v16.className = "uid-btn uid-cancel";
      v16.dataset.r = "0";
      v16.textContent = r2.cancelText || "إلغاء";
      divEl9.appendChild(v16);
    }
    const buttonEl = document.createElement("button");
    buttonEl.className = "uid-btn uid-ok" + (v6 && v5 ? " uid-danger" : "");
    buttonEl.dataset.r = "1";
    buttonEl.textContent = r2.okText || (v5 ? v6 ? "حذف" : "تأكيد" : "تمام");
    divEl9.appendChild(buttonEl);
    divEl4.appendChild(divEl5);
    divEl4.appendChild(divEl8);
    divEl4.appendChild(divEl9);
    divEl2.appendChild(divEl3);
    divEl2.appendChild(divEl4);
    divEl.appendChild(divEl2);
    let v18 = false;
    const vF = p4 => {
      if (v18) {
        return;
      }
      if (p4.key === "Enter") {
        p4.preventDefault();
        f3(true);
      } else if (p4.key === "Escape") {
        f3(v5 ? false : true);
      }
    };
    document.addEventListener("keydown", vF);
    function f3(p5) {
      if (v18) {
        return;
      }
      v18 = true;
      document.removeEventListener("keydown", vF);
      divEl.classList.remove("uid-in");
      divEl.style.pointerEvents = "none";
      setTimeout(() => divEl.remove(), 160);
      r3(p5);
      v2 = null;
      f2();
    }
    buttonEl.addEventListener("click", () => f3(true));
    if (v16) {
      v16.addEventListener("click", () => f3(false));
    }
    divEl.addEventListener("mousedown", event => {
      if (event.target === divEl) {
        f3(v5 ? false : true);
      }
    });
    document.body.appendChild(divEl);
    requestAnimationFrame(() => requestAnimationFrame(() => divEl.classList.add("uid-in")));
    setTimeout(() => buttonEl.focus(), 80);
  }
  window.uiAlert = (p7, p8) => f(p7, Object.assign({}, p8, {
    kind: "alert"
  }));
  window.uiConfirm = (p9, p10) => f(p9, Object.assign({}, p10, {
    kind: "confirm"
  }));
})();
let stats = {
  likes: 0,
  comments: 0,
  gifts: 0,
  followers: 0
};
let isConnected = false;
let currentTier = "free";
let tierLimits = {
  tier: "free",
  label: "Free",
  profiles: 1,
  actions: 7,
  overlay: false,
  premiumWidgets: false
};
async function initTier() {
  try {
    const getLicenseStateResult = await api.getLicenseState();
    if (getLicenseStateResult) {
      currentTier = getLicenseStateResult.tier || "free";
      tierLimits = getLicenseStateResult;
    }
  } catch {
    currentTier = "free";
    tierLimits = {
      tier: "free",
      label: "Free",
      profiles: 1,
      actions: 7,
      overlay: false,
      premiumWidgets: false
    };
  }
  applyTierLimits();
  loadOverlayUrls();
}
initTier();
if (window.api && typeof api.onUpdateReady === "function") {
  api.onUpdateReady(p11 => {
    try {
      addFeedItem("system", "ELDALY STREAM", "Update " + (p11 || "") + " downloaded — it will be installed when you close the app.", "🔄");
    } catch (e) {}
  });
}
function lockCard(p12, p13) {
  const v20 = document.getElementById(p12);
  if (!v20) {
    return;
  }
  v20.style.position = "relative";
  v20.style.overflow = "hidden";
  const divEl10 = document.createElement("div");
  divEl10.className = "lock-overlay";
  divEl10.innerHTML = "<div style=\"text-align:center;\">\n    <div style=\"font-size:34px;margin-bottom:10px;\">&#128274;</div>\n    <div style=\"font-weight:800;font-size:15px;letter-spacing:1px;color:#ecd28a;\">PREMIUM FEATURE</div>\n    <div style=\"font-size:12px;color:#a6a198;margin-top:6px;\">Required tier: " + p13 + "</div>\n  </div>";
  if (!document.getElementById("lock-css")) {
    const styleEl = document.createElement("style");
    styleEl.id = "lock-css";
    styleEl.innerHTML = "\n      .lock-overlay {\n        position: absolute; top: 0; left: 0; width: 100%; height: 100%;\n        background: rgba(10, 10, 12, 0.88); backdrop-filter: blur(4px);\n        display: flex; align-items: center; justify-content: center;\n        z-index: 100; border-radius: inherit;\n      }\n    ";
    document.head.appendChild(styleEl);
  }
  v20.appendChild(divEl10);
  v20.querySelectorAll("input, select, button").forEach(item => item.disabled = true);
}
function applyTierLimits() {
  if (currentTier === "free") {
    lockCard("card-image-goal", "PRO");
    lockCard("card-firework", "PRO");
    lockCard("card-hearts", "PRO");
    lockCard("card-liquid-heart-goal", "PRO");
    lockCard("card-tiktok-goal", "PRO");
    lockCard("card-water-image-goal", "PRO");
    lockCard("card-last-liker", "PRO");
    lockCard("card-new-follower", "PRO");
    lockCard("card-speedometer", "PRO");
    lockCard("card-battle-royale", "PRO");
    lockCard("card-battle", "PRO");
    lockCard("card-auction", "PRO");
    lockCard("card-gift-spinner", "PRO");
    lockCard("card-scoreboard", "PRO");
    lockCard("page-hotkeys", "PRO");
    document.querySelectorAll("#page-extensions .profile-card").forEach((item, index) => {
      if (!item.id) {
        item.id = "locked-ext-" + index;
      }
      lockCard(item.id, "PRO");
    });
  }
}
document.getElementById("btn-change-pass")?.addEventListener("click", async () => {
  const v23 = await showInputDialog("كلمة المرور الجديدة (6 حروف على الأقل)", "");
  if (!v23) {
    return;
  }
  const v24 = await showInputDialog("تأكيد كلمة المرور الجديدة", "");
  if (!v24) {
    return;
  }
  if (v23 !== v24) {
    uiAlert("الباسورد وتأكيده مش متطابقين");
    return;
  }
  const changePasswordResult = await api.changePassword(v23);
  if (changePasswordResult.ok) {
    uiAlert("تم تغيير كلمة المرور بنجاح ✔ جربها المرة الجاية تسجل بيها");
  } else {
    uiAlert(changePasswordResult.reason || "تعذر تغيير الباسورد — جرب تاني");
  }
});
document.getElementById("btn-logout")?.addEventListener("click", async () => {
  const v26 = await showConfirmDialog("تسجيل خروج", "هتخرج من حسابك الحالي وترجع لشاشة الدخول. اشتراكك محفوظ على السيرفر وتقدر تدخل تاني بنفس الإيميل في أي وقت.", "تسجيل خروج", "إلغاء");
  if (!v26) {
    return;
  }
  try {
    await api.tiktok.disconnect();
  } catch (err) {}
  try {
    await api.logout();
  } catch (err) {}
});
document.querySelectorAll(".sidebar-item[data-page]").forEach(item => {
  item.addEventListener("click", () => {
    const v27 = item.dataset.page;
    document.querySelectorAll(".sidebar-item").forEach(item => item.classList.remove("active"));
    item.classList.add("active");
    document.querySelectorAll(".page").forEach(item => item.classList.remove("active"));
    document.getElementById("page-" + v27).classList.add("active");
    // رجّع السكرول لفوق مع كل تنقل — الصفحة تفتح من أولها
    const mainEl = document.querySelector(".main-content");
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
    if (window.skMaybeShow) window.skMaybeShow(v27);
  });
});

// ═══════════════ Page Skeletons — هيكل كل صفحة في كل زيارة ═══════════════
// أول ما تفتح أي صفحة: الهيكل بيظهر مكان المحتوى (بستمه 600ms على الأقل)
// ويختفي أول ما البيانات ترسم — أو مع صمام أمان زمني
(function () {
  const SK_MAX = { dashboard: 2500, tts: 3000, default: 4000 };
  const SK_MIN = 600;
  const skTimers = {};
  const skEl = (p) => document.getElementById("sk-" + p);
  const readyCheck = {
    dashboard: () => ((document.getElementById("username-input") || {}).value || "").length > 0,
    logs: () => true,
    support: () => true,
    actions: () => document.querySelectorAll("#actions-tbody tr").length,
    hotkeys: () => document.querySelectorAll("#page-hotkeys tbody tr").length,
    widgets: () => document.querySelectorAll('#page-widgets [class*="widget-group"]').length,
    extensions: () => document.querySelectorAll("#page-extensions .ext-card").length,
    tts: () => Array.from(document.querySelectorAll("#page-tts .form-input")).some((i) => (i.value || "").length > 0),
    songs: () => (document.getElementById("sr-queue-list") || {}).childElementCount,
    profile: () => ((document.querySelector(".profiles-list") || {}).childElementCount || 0)
  };
  function skStop(page) {
    if (skTimers[page]) { clearInterval(skTimers[page]); delete skTimers[page]; }
    const el = skEl(page);
    if (el) el.style.display = "none";
    const sec = document.getElementById("page-" + page);
    if (sec) sec.classList.remove("sk-loading");
  }
  window.skMaybeShow = function (page) {
    const el = skEl(page);
    if (!el) return;
    skStop(page);
    el.style.display = "block";
    const sec = document.getElementById("page-" + page);
    if (sec) sec.classList.add("sk-loading");
    const check = readyCheck[page];
    const t0 = Date.now();
    const max = SK_MAX[page] || SK_MAX.default;
    skTimers[page] = setInterval(() => {
      let ready = false;
      try { ready = !check || !!check(); } catch (e) { ready = false; }
      const elapsed = Date.now() - t0;
      if ((ready && elapsed >= SK_MIN) || elapsed > max) skStop(page);
    }, 150);
  };
  skMaybeShow("dashboard");
})();

document.getElementById("btn-export-profile")?.addEventListener("click", () => openBackupModal("export"));
document.getElementById("btn-import-profile")?.addEventListener("click", () => openBackupModal("import"));

// ═══════════════ Export / Import — encrypted backup (.tfc) ═══════════════
// التشفير والفك كله في السيرفر — الفرونت بيستلم/يبعت blob مشفر بس
(function () {
  const $ = (id) => document.getElementById(id);
  const escB = (s) => { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; };
  const CATEGORIES = [
    { id: "actions",    label: "Actions" },
    { id: "events",     label: "Events" },
    { id: "hotkeys",    label: "Hotkeys" },
    { id: "widgets",    label: "Widgets" },
    { id: "tts",        label: "TTS Settings" },
    { id: "songs",      label: "Song Settings" },
    { id: "connection", label: "TikTok Username" },
  ];
  function bytesToB64(buf) {
    const b = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const s = atob(b64);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  let importBlob = null; // بيانات الملف المشفرة — بتتقري في المعاينة وتتستخدم في التطبيق
  function chkRow(id, label, count, checked) {
    return '<label class="chk bk-chk"><input type="checkbox" data-bk="' + escB(id) + '"' + (checked ? " checked" : "") + ' style="width:16px;height:16px;accent-color:#d4af37;cursor:pointer;flex:0 0 16px"> <span style="flex:1">' + escB(label) + '</span> <b style="color:#d4af37;font-size:12px">(' + count + ')</b></label>';
  }

  window.openBackupModal = function (mode) {
    const body = $("modal-body"), foot = $("modal-footer");
    if (mode === "export") {
      $("modal-title").textContent = "📤 Export";
      body.innerHTML = '<div class="widget-desc" style="margin-bottom:10px">Select what you want to include in the encrypted backup file:</div>'
        + '<div class="bk-list" id="bkx-list"><div class="widget-desc">Loading your data...</div></div>';
      foot.innerHTML = '<button class="btn btn-ghost" id="bkx-cancel">Cancel</button><button class="btn btn-primary" id="bkx-go">📥 Export</button>';
      showModal();
      // بنجيب العدادات الأول — والتصنيف اللي مفيهوش حاجة مبيظهرش خالص
      (async () => {
        const r = await api.backupIO.counts();
        const list = $("bkx-list");
        if (!r || !r.ok || !r.counts) { list.innerHTML = '<div class="widget-desc">⚠ Could not load your data — try again</div>'; return; }
        const withData = CATEGORIES.filter((c) => (r.counts[c.id] || 0) > 0);
        if (!withData.length) {
          list.innerHTML = '<div class="widget-desc">No data to export yet</div>';
          const go = $("bkx-go");
          if (go) { go.disabled = true; go.style.opacity = ".5"; }
          return;
        }
        list.innerHTML = withData.map((c) => chkRow(c.id, c.label, r.counts[c.id], true)).join("");
      })();
      $("bkx-cancel").addEventListener("click", closeModal);
      $("bkx-go").addEventListener("click", async () => {
        const go = $("bkx-go");
        const checked = Array.from($("bkx-list").querySelectorAll("input[data-bk]:checked")).map((cb) => cb.dataset.bk);
        if (!checked.length) { go.textContent = "Check at least one category"; return; }
        go.disabled = true;
        go.textContent = "Encrypting...";
        const r = await api.backupIO.export(checked);
        go.disabled = false;
        go.textContent = "📥 Export";
        if (!r || !r.ok) { go.textContent = (r && r.error) || "Export failed"; return; }
        const bytes = b64ToBytes(r.blob);
        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "eldaly-backup-" + new Date().toISOString().slice(0, 10) + ".tfc";
        a.click();
        URL.revokeObjectURL(a.href);
        closeModal();
        addFeedItem("system", "Backup", "Exported " + r.items + " items (encrypted)", "📦");
      });
    } else {
      $("modal-title").textContent = "📂 Import";
      body.innerHTML = '<div class="widget-desc" style="margin-bottom:10px">Choose your encrypted backup file (.tfc) — we will show you what is inside, then select what to import:</div>'
        + '<input type="file" id="bki-file" accept=".tfc,.eldalybak" style="color:var(--text-muted);margin-bottom:12px">'
        + '<div class="bk-list" id="bki-list" style="display:none"></div>';
      foot.innerHTML = '<button class="btn btn-ghost" id="bki-cancel">Cancel</button><button class="btn btn-primary" id="bki-go" disabled style="opacity:.5">📤 Import</button>';
      showModal();
      $("bki-cancel").addEventListener("click", closeModal);
      $("bki-file").addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const list = $("bki-list");
        list.innerHTML = '<div class="widget-desc">Reading & decrypting... (up to a minute if the server is waking up)</div>';
        const go = $("bki-go");
        try {
          const buf = await f.arrayBuffer();
          const blob = bytesToB64(buf);
                  importBlob = blob;
          const r = await api.backupIO.preview(blob);
          if (!r || !r.ok) { list.innerHTML = '<div class="widget-desc" style="color:var(--accent-red)">' + escB((r && r.error) || "Invalid or corrupted backup file") + '</div>'; return; }
          if (!r.categories || !r.categories.length) { list.innerHTML = '<div class="widget-desc">No known categories in this file</div>'; return; }
          list.style.display = "block";
          list.innerHTML = r.categories.map((x) => chkRow(x.id, x.label, x.count, true)).join("");
          go.disabled = false;
          go.style.opacity = "1";
        } catch (err) {
          list.innerHTML = '<div class="widget-desc" style="color:var(--accent-red)">Could not read the file</div>';
        }
      });
      $("bki-go").addEventListener("click", async () => {
        const go = $("bki-go");
        const checked = Array.from($("bki-list").querySelectorAll("input[data-bk]:checked")).map((cb) => cb.dataset.bk);
        if (!checked.length) { go.textContent = "Check at least one category"; return; }
        go.disabled = true;
        go.textContent = "Importing...";
        const r = await api.backupIO.apply(importBlob, checked);
        go.disabled = false;
        go.style.opacity = "1";
        go.textContent = "📤 Import";
        if (!r || !r.ok) { go.textContent = (r && r.error) || "Import failed"; return; }
        closeModal();
        actionsData = (await api.actions.getAll()) || [];
        eventsData = (await api.events.getAll()) || [];
        renderActions();
        renderEvents();
        updateProfileStats();
        addFeedItem("system", "Backup", "Imported " + r.imported + " items" + (r.failed ? " (" + r.failed + " failed)" : ""), "📥");
      });
    }
  };
})();









const connectBtn = document.getElementById("connect-btn");
const usernameInput = document.getElementById("username-input");
const statusEl = document.getElementById("connection-status");
const statsGrid = document.getElementById("stats-grid");
const indicator = document.getElementById("connection-indicator");
async function loadSavedConnectionSettings() {
  const getResult = await api.store.get("connection.username");
  if (getResult) {
    usernameInput.value = getResult;
  }
  updateConnectionAvatar(getResult);
}
loadSavedConnectionSettings();
const AVATAR_PLACEHOLDER_SVG = "<svg width=\"44\" height=\"44\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" opacity=\"0.4\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2\"/></svg>";
let avatarFetchTimer = null;
let avatarShownFor = null;
function showAvatarPlaceholder() {
  const v29 = document.getElementById("connection-avatar");
  if (!v29) {
    return;
  }
  v29.innerHTML = AVATAR_PLACEHOLDER_SVG;
  v29.classList.remove("has-photo");
}
async function updateConnectionAvatar(p20) {
  const v30 = document.getElementById("connection-avatar");
  if (!v30) {
    return;
  }
  const v31 = String(p20 || "").trim().replace(/^@+/, "");
  if (!v31) {
    avatarShownFor = null;
    showAvatarPlaceholder();
    return;
  }
  if (avatarShownFor === v31) {
    return;
  }
  try {
    const getAvatarResult = await api.tiktok.getAvatar(v31);
    const v33 = usernameInput.value.trim().replace(/^@+/, "");
    if (v33 !== v31) {
      return;
    }
    const v34 = document.querySelector(".connection-card .input-label");
    if (getAvatarResult && getAvatarResult.ok && (getAvatarResult.url || getAvatarResult.name)) {
      avatarShownFor = v31;
      if (getAvatarResult.url) {
        v30.innerHTML = "<img src=\"" + getAvatarResult.url + "\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover;border-radius:inherit;\" onerror=\"this.remove()\">";
        v30.classList.add("has-photo");
      } else {
        v30.innerHTML = AVATAR_PLACEHOLDER_SVG;
        v30.classList.remove("has-photo");
        setTimeout(async () => {
          try {
            if (avatarShownFor !== v31) {
              return;
            }
            if (usernameInput.value.trim().replace(/^@+/, "") !== v31) {
              return;
            }
            const getAvatarResult2 = await api.tiktok.getAvatar(v31);
            if (avatarShownFor !== v31) {
              return;
            }
            if (getAvatarResult2 && getAvatarResult2.ok && getAvatarResult2.url) {
              v30.innerHTML = "<img src=\"" + getAvatarResult2.url + "\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover;border-radius:inherit;\" onerror=\"this.remove()\">";
              v30.classList.add("has-photo");
            }
          } catch (err) {}
        }, 2500);
      }
      if (v34) {
        v34.textContent = getAvatarResult.name ? getAvatarResult.name : "TikTok Username";
      }
      v30.title = getAvatarResult.name ? getAvatarResult.name + " (@" + v31 + ")" : "@" + v31;
    } else {
      avatarShownFor = null;
      showAvatarPlaceholder();
      if (v34) {
        v34.textContent = "TikTok Username";
      }
      v30.title = "";
    }
  } catch (err) {}
}
if (usernameInput) {
  usernameInput.addEventListener("input", () => {
    if (avatarFetchTimer) {
      clearTimeout(avatarFetchTimer);
    }
    avatarFetchTimer = setTimeout(() => updateConnectionAvatar(usernameInput.value), 1000);
  });
}
connectBtn.addEventListener("click", async () => {
  const v36 = usernameInput.value.trim();
  if (!v36) {
    statusEl.textContent = "Please enter a username";
    statusEl.className = "connection-status error";
    return;
  }
  if (isConnected) {
    await api.tiktok.disconnect();
    setDisconnected();
    return;
  }
  connectBtn.querySelector(".btn-text").textContent = "Connecting...";
  connectBtn.querySelector(".btn-loader").style.display = "inline-block";
  statusEl.textContent = "Connecting to @" + v36 + "...";
  statusEl.className = "connection-status";
  const connectResult = await api.tiktok.connect(v36);
  connectBtn.querySelector(".btn-loader").style.display = "none";
  if (connectResult.success) {
    setConnected(v36, connectResult.roomInfo);
    addFeedItem("system", "System", "Connected to @" + v36, "⚡");
  } else {
    statusEl.textContent = connectResult.error || "⚠️ Not connected — you are not LIVE right now. Start your TikTok LIVE and try again.";
    statusEl.className = "connection-status error";
    connectBtn.querySelector(".btn-text").textContent = "Connect";
  }
});
function setConnected(p21, p22) {
  isConnected = true;
  try {
    new Audio("sounds/connect.wav").play();
  } catch (err) {}
  connectBtn.querySelector(".btn-text").textContent = "Disconnect";
  connectBtn.style.background = "rgba(239,68,68,0.15)";
  connectBtn.style.boxShadow = "none";
  statusEl.textContent = "Connected to @" + p21;
  statusEl.className = "connection-status success";
  statsGrid.style.display = "grid";
  indicator.querySelector(".connection-dot").classList.add("connected");
  indicator.querySelector(".connection-text").textContent = "Live";
  stats = {
    likes: 0,
    comments: 0,
    gifts: 0,
    followers: 0
  };
  updateStats();
  const v38 = document.getElementById("connection-avatar");
  const v39 = p22?.profilePictureUrl;
  if (v39 && v38) {
    v38.innerHTML = "<img src=\"" + v39 + "\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%;\" onerror=\"this.parentElement.innerHTML='<svg width=48 height=48 viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' opacity=\\'0.4\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2\\'/></svg>'\">";
  }
}
function setDisconnected() {
  if (isConnected) {
    try {
      new Audio("sounds/disconnect.wav").play();
    } catch (err) {}
  }
  isConnected = false;
  connectBtn.querySelector(".btn-text").textContent = "Connect";
  connectBtn.style.background = "";
  connectBtn.style.boxShadow = "";
  statusEl.textContent = "Disconnected";
  statusEl.className = "connection-status";
  indicator.querySelector(".connection-dot").classList.remove("connected");
  indicator.querySelector(".connection-text").textContent = "Offline";
  const v40 = document.getElementById("connection-avatar");
  if (v40) {
    v40.innerHTML = "<svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" opacity=\"0.4\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2\"/></svg>";
  }
}
function updateStats() {
  document.getElementById("stat-likes").textContent = stats.likes.toLocaleString();
  document.getElementById("stat-comments").textContent = stats.comments.toLocaleString();
  document.getElementById("stat-gifts").textContent = stats.gifts.toLocaleString();
  document.getElementById("stat-followers").textContent = stats.followers.toLocaleString();
}
api.tiktok.onChat(p23 => {
  stats.comments++;
  updateStats();
  addFeedItem("chat", p23.nickname || p23.user, p23.comment, "💬");
});
api.tiktok.onGift(p24 => {
  stats.gifts += p24.repeatCount || 1;
  updateStats();
  addFeedItem("gift", p24.nickname || p24.user, p24.giftName + " x" + p24.repeatCount, "🎁");
});
api.tiktok.onLike(p25 => {
  stats.likes += p25.likeCount || 1;
  updateStats();
  addFeedItem("like", p25.nickname || p25.user, p25.likeCount + " likes", "❤️");
});
api.tiktok.onFollow(p26 => {
  stats.followers++;
  updateStats();
  addFeedItem("follow", p26.nickname || p26.user, "New follower", "➕");
});
api.tiktok.onJoin(p27 => {
  addFeedItem("join", p27.nickname || p27.user, "Joined the stream", "👋");
});
api.tiktok.onShare(p28 => {
  addFeedItem("system", p28.nickname || p28.user, "Shared the stream", "🔄");
});
api.tiktok.onSubscribe(p29 => {
  addFeedItem("system", p29.nickname || p29.user, "Subscribed!", "⭐");
});
api.tiktok.onStreamEnd(() => {
  setDisconnected();
  addFeedItem("system", "System", "Stream ended", "🔴");
});

// ===== رسالة الإدارة (تظهر لكل المستخدمين) =====
const ANNOUNCEMENT_URL = "https://firestore.googleapis.com/v1/projects/eldaly-stream/databases/(default)/documents/config/announcement";
let dismissedAnnouncementText = null;

// ===== الدعم الفني (واتساب + ديسكورد) =====
const SUPPORT_WHATSAPP_URL = "https://wa.me/201558345646";
const SUPPORT_DISCORD_URL = "https://discordapp.com/users/860940128939409408";
document.getElementById("supportWhatsappBtn")?.addEventListener("click", () => {
  api.games.openLink(SUPPORT_WHATSAPP_URL);
});
document.getElementById("supportDiscordBtn")?.addEventListener("click", () => {
  api.games.openLink(SUPPORT_DISCORD_URL);
});
document.getElementById("supportWhatsappCopy")?.addEventListener("click", () => {
  navigator.clipboard.writeText("01558345646");
  uiAlert("تم نسخ رقم الواتساب ✓");
});
document.getElementById("supportDiscordCopy")?.addEventListener("click", () => {
  navigator.clipboard.writeText("KEMOELDALY");
  uiAlert("تم نسخ معرف الديسكورد ✓");
});
function hideAnnouncement() {
  const banner = document.getElementById("announce-banner");
  if (banner) banner.style.display = "none";
}
async function checkAnnouncement() {
  try {
    const response = await fetch(ANNOUNCEMENT_URL);
    if (!response.ok) return hideAnnouncement();
    const body = await response.json();
    const fields = body.fields || {};
    const text = fields.text ? fields.text.stringValue : "";
    const endAt = fields.endAt ? new Date(fields.endAt.timestampValue) : null;
    if (!text || !endAt || endAt.getTime() < Date.now()) return hideAnnouncement();
    if (dismissedAnnouncementText === text) return;
    document.getElementById("announce-text").textContent = text;
    document.getElementById("announce-banner").style.display = "flex";
  } catch (err) {}
}
document.getElementById("announce-close").addEventListener("click", () => {
  dismissedAnnouncementText = document.getElementById("announce-text").textContent;
  hideAnnouncement();
});
checkAnnouncement();
setInterval(checkAnnouncement, 60000);
api.tiktok.onError(p30 => {
  addFeedItem("system", "Error", p30, "⚠️");
});
api.onLog(p31 => {
  addFeedItem("system", "Action", p31, "⚡");
});
document.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    const v41 = document.getElementById("action-modal");
    if (v41 && v41.style.display === "flex") {
      const v42 = document.getElementById("m-save-action");
      if (v42 && !v42.disabled) {
        v42.click();
      }
    }
    const v43 = document.getElementById("event-modal");
    if (v43 && v43.style.display === "flex") {
      if (document.activeElement && document.activeElement.tagName === "TEXTAREA") {
        return;
      }
      const v44 = document.getElementById("m-save-event");
      if (v44 && !v44.disabled) {
        v44.click();
      }
    }
  }
});
const localTtsQueue = [];
let localTtsSpeaking = false;
api.overlay.onPlayLocalTTS(p33 => {
  localTtsQueue.push(p33);
  processLocalTTSQueue();
});
function processLocalTTSQueue() {
  if (localTtsSpeaking || localTtsQueue.length === 0) {
    return;
  }
  localTtsSpeaking = true;
  const v45 = localTtsQueue.shift();
  if (v45.audioBase64 || v45.url) {
    const audio = new Audio(v45.audioBase64 ? "data:audio/mp3;base64," + v45.audioBase64 : v45.url);
    let vLN1 = 1;
    if (v45.config && v45.config.volume !== undefined) {
      vLN1 = v45.config.volume;
    } else if (v45.volume !== undefined) {
      vLN1 = v45.volume;
    }
    audio.volume = vLN1;
    audio.onended = () => {
      localTtsSpeaking = false;
      setTimeout(processLocalTTSQueue, 500);
    };
    audio.onerror = p34 => {
      console.error("Local TTS Error:", p34);
      localTtsSpeaking = false;
      setTimeout(processLocalTTSQueue, 500);
    };
    audio.play().catch(err => {
      console.error("Local TTS playback prevented", err);
      localTtsSpeaking = false;
      setTimeout(processLocalTTSQueue, 500);
    });
  } else {
    localTtsSpeaking = false;
    processLocalTTSQueue();
  }
}
const mcPlayerInput = document.getElementById("mc-player");
const mcIpInput = document.getElementById("mc-ip");
const mcPortInput = document.getElementById("mc-port");
const mcPassInput = document.getElementById("mc-password");
const mcTestBtn = document.getElementById("mc-test-btn");
const mcStatus = document.getElementById("mc-status");
async function loadMinecraftConfig() {
  const v47 = (await api.store.get("minecraft")) || {};
  if (v47.player) {
    mcPlayerInput.value = v47.player;
  }
  if (v47.ip) {
    mcIpInput.value = v47.ip;
  }
  if (v47.port) {
    mcPortInput.value = v47.port;
  }
  if (v47.password) {
    mcPassInput.value = v47.password;
  }
}
loadMinecraftConfig();
mcTestBtn.addEventListener("click", async () => {
  const vO = {
    player: mcPlayerInput.value.trim(),
    ip: mcIpInput.value.trim() || "127.0.0.1",
    port: mcPortInput.value.trim() || "4567",
    password: mcPassInput.value
  };
  await api.store.set("minecraft", vO);
  mcStatus.textContent = "Testing...";
  mcStatus.style.color = "inherit";
  try {
    const v48 = await fetch("http://" + vO.ip + ":" + vO.port + "/v1/server/exec", {
      method: "POST",
      headers: {
        key: vO.password,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "command=say TikFinity Connected!"
    });
    if (v48.ok) {
      mcStatus.textContent = "Success! Connected to ServerTap.";
      mcStatus.style.color = "var(--accent-green)";
    } else {
      mcStatus.textContent = "Error: " + v48.statusText;
      mcStatus.style.color = "var(--accent-red)";
    }
  } catch (err) {
    mcStatus.textContent = "Connection failed: " + err.message;
    mcStatus.style.color = "var(--accent-red)";
  }
});
const feedList = document.getElementById("feed-list");
let feedCount = 0;
function addFeedItem(p36, p37, p38, p39) {
  if (feedCount === 0) {
    feedList.innerHTML = "";
  }
  feedCount++;
  const divEl11 = document.createElement("div");
  divEl11.className = "feed-item";
  const v50 = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  divEl11.innerHTML = "\n    <div class=\"feed-item-icon " + p36 + "\">" + p39 + "</div>\n    <div class=\"feed-item-content\">\n      <div class=\"feed-item-user\">" + escapeHtml(p37) + "</div>\n      <div class=\"feed-item-text\">" + escapeHtml(p38) + "</div>\n    </div>\n    <div class=\"feed-item-time\">" + v50 + "</div>";
  feedList.prepend(divEl11);
  if (feedList.children.length > 200) {
    feedList.lastChild.remove();
  }
  const v51 = document.getElementById("dashboard-feed");
  if (v51) {
    v51.prepend(divEl11.cloneNode(true));
    while (v51.children.length > 8) {
      v51.lastChild.remove();
    }
  }
}
let actionsData = [];
async function loadActions() {
  actionsData = (await api.actions.getAll()) || [];
  renderActions();
}
function renderActions(p40 = "") {
  const v52 = document.getElementById("actions-tbody");
  const v53 = p40 ? actionsData.filter(item => item.name.toLowerCase().includes(p40.toLowerCase())) : actionsData;
  if (v53.length === 0) {
    v52.innerHTML = "<tr class=\"empty-row\"><td colspan=\"6\"><div class=\"empty-state\"><p>No actions defined yet</p><span>Click \"Create Action\" to get started</span></div></td></tr>";
    return;
  }
  v52.innerHTML = v53.map(item => {
    const v54 = item.opts || {};
    const vA2 = [];
    if (v54.anim_enabled) {
      vA2.push("Anim");
    }
    if (v54.picture_enabled) {
      vA2.push("Pic");
    }
    if (v54.audio_enabled) {
      vA2.push("Audio");
    }
    if (v54.video_enabled) {
      vA2.push("Video");
    }
    if (v54.alert_enabled) {
      vA2.push("Alert");
    }
    if (v54.tts_enabled) {
      vA2.push("TTS");
    }
    if (v54.keys_enabled) {
      vA2.push("Keys");
    }
    if (v54.webhook_enabled) {
      vA2.push("Hook");
    }
    const v55 = vA2.map(item => "<span class=\"badge badge-purple\">" + item + "</span>").join(" ") || "<span class=\"badge badge-purple\">—</span>";
    const v56 = item.keys || item.tts_text || (item.audio_path ? (/^https?:/i.test(item.audio_path) ? "☁ cloud" : item.audio_path.split(/[\/]/).pop()) : "—");
    return "<tr data-id=\"" + item.id + "\">\n      <td class=\"drag-handle\">⋮⋮</td>\n      <td style=\"color:var(--text-primary);font-weight:600\">" + escapeHtml(item.name) + "</td>\n      <td>" + v55 + "</td>\n      <td>" + escapeHtml(v56.substring(0, 30)) + "</td>\n      <td>" + (item.cooldown || 0) + "s</td>\n      <td><div class=\"table-actions\">\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"editAction('" + item.id + "')\">Edit</button>\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"duplicateAction('" + item.id + "')\" title=\"Duplicate\">Copy</button>\n        <button class=\"btn btn-danger btn-sm\" onclick=\"deleteAction('" + item.id + "')\">Delete</button>\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"api.actions.execute('" + item.id + "')\" title=\"Play now\">▶</button>\n        <button class=\"btn btn-ghost btn-sm btn-delayed\" onclick=\"executeDelayed('" + item.id + "')\" title=\"Play in 5s\">▶<span class=\"delay-label\">+5</span></button>\n      </div></td></tr>";
  }).join("");
  const v57 = document.querySelectorAll(".action-select");
  v57.forEach(item => {
    const v58 = item.value;
    item.innerHTML = "<option value=\"\">-- None --</option>" + actionsData.map(item => "<option value=\"" + item.id + "\">" + escapeHtml(item.name) + "</option>").join("");
    item.value = v58;
  });
}
document.getElementById("actions-search").addEventListener("input", event => renderActions(event.target.value));
document.getElementById("create-action-btn").addEventListener("click", () => openActionModal());
function openActionModal(p47 = null) {
  const v59 = !!p47;
  if (!v59 && actionsData.length >= tierLimits.actions) {
    uiAlert(tierLimits.tier === "free" ? "الوضع المجاني يسمح بـ " + tierLimits.actions + " أكشن فقط. اشترك لفتح المزيد!" : "باقتك (" + tierLimits.label + ") تسمح بـ " + tierLimits.actions + " أكشن كحد أقصى. يرجى الترقية!");
    return;
  }
  const v60 = p47?.opts || {};
  document.getElementById("modal-title").textContent = v59 ? "Edit Action" : "New Action";
  document.getElementById("modal-body").innerHTML = "\n    <div class=\"form-group\"><label class=\"form-label\">Action Name</label><input class=\"form-input\" id=\"m-name\" value=\"" + escapeAttr(p47?.name || "") + "\" placeholder=\"My Action\"></div>\n    <div class=\"divider\"></div>\n    <h3 class=\"form-section-title\">Action Types</h3>\n    " + actionCheckbox("anim", "Show Animation", "🎬", v60.anim_enabled, "\n      <button class=\"form-file-btn\" onclick=\"pickFile('m-anim-path',['gif','webp','mp4','webm'])\">📁 Choose Animation</button>\n      <div class=\"form-file-path\" id=\"m-anim-path\">" + mediaDisplayPath(p47?.anim_path) + "</div>") + "\n    " + actionCheckbox("picture", "Show Picture / GIF", "🖼️", v60.picture_enabled, "\n      <button class=\"form-file-btn\" onclick=\"pickFile('m-picture-path',['png','jpg','jpeg','gif','webp'])\">📁 Choose Image</button>\n      <div class=\"form-file-path\" id=\"m-picture-path\">" + mediaDisplayPath(p47?.picture_path) + "</div>") + "\n    " + actionCheckbox("audio", "Play Audio", "🔊", v60.audio_enabled, "\n      <div style=\"display:flex; flex-direction:column; gap:8px;\">\n        <button class=\"form-file-btn\" style=\"background:var(--bg-secondary,#1a1a2e);border:1px solid var(--border,#333);color:var(--text-primary);\" onclick=\"openSoundLibrary('m-audio-path')\">🎵 Open Sound Library</button>\n        <div style=\"display:flex; align-items:center; gap:8px;\">\n          <button class=\"form-file-btn\" onclick=\"pickFile('m-audio-path',['mp3','wav','ogg'])\">📁 Select file</button>\n          <span style=\"font-size:11px;color:var(--text-muted);\">or Drop file here</span>\n        </div>\n        <div class=\"form-file-path\" id=\"m-audio-path\">" + mediaDisplayPath(p47?.audio_path) + "</div>\n      </div>") + "\n    " + actionCheckbox("video", "Play Video File", "🎥", v60.video_enabled, "\n      <button class=\"form-file-btn\" onclick=\"pickFile('m-video-path',['mp4','webm','avi','mov'])\">📁 Choose Video</button>\n      <div class=\"form-file-path\" id=\"m-video-path\">" + mediaDisplayPath(p47?.video_path) + "</div>") + "\n    " + actionCheckbox("alert", "Show Alert (User + Text)", "🔔", v60.alert_enabled, "\n      <label class=\"form-label\">Alert Text — {username} = @handle &nbsp;|&nbsp; {nickname} = display name</label>\n      <input class=\"form-input\" id=\"m-alert-text\" value=\"" + escapeAttr(p47?.alert_text || "{user} triggered an alert!") + "\">\n      <label style=\"display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;font-weight:700;color:var(--text-secondary,#a6a198);cursor:pointer\"><input type=\"checkbox\" id=\"m-alert-sender\" " + (p47?.alert_show_sender !== false ? "checked" : "") + " style=\"width:16px;height:16px;accent-color:#d4af37;cursor:pointer\">إظهار اسم وصورة المرسل (Show sender name & photo)</label>\n      <div class=\"form-row\" style=\"margin-top:8px\">\n        <div class=\"form-group\"><label class=\"form-label\">Font Size</label>\n          <input class=\"form-input\" id=\"m-alert-size\" type=\"number\" min=\"12\" max=\"48\" value=\"" + (p47?.alert_font_size || 22) + "\"></div>\n        <div class=\"form-group\"><label class=\"form-label\">Photo Size</label>\n          <input class=\"form-input\" id=\"m-alert-photo-size\" type=\"number\" min=\"32\" max=\"220\" value=\"" + (p47?.alert_photo_size || 64) + "\"></div>\n        <div class=\"form-group\"><label class=\"form-label\">User Color</label><input type=\"color\" class=\"form-input\" id=\"m-alert-user-color\" value=\"" + (p47?.alert_user_color || "#30D5C8") + "\" style=\"height:36px;padding:2px\"></div>\n        <div class=\"form-group\"><label class=\"form-label\">Text Color</label><input type=\"color\" class=\"form-input\" id=\"m-alert-text-color\" value=\"" + (p47?.alert_text_color || "#30D5C8") + "\" style=\"height:36px;padding:2px\"></div>\n      </div>") + "\n    " + actionCheckbox("tts", "Read Text (TTS)", "🗣️", v60.tts_enabled, "\n      <label class=\"form-label\">TTS Text (use {user}, {gift}, {comment})</label>\n      <input class=\"form-input\" id=\"m-tts-text\" value=\"" + escapeAttr(p47?.tts_text || "") + "\">\n      <div class=\"form-row\" style=\"margin-top:8px\">\n        <div class=\"form-group\"><label class=\"form-label\">Language</label>\n          <select class=\"form-select\" id=\"m-tts-lang\">\n            <option value=\"ar\" " + (p47?.tts_lang === "ar" ? "selected" : "") + ">Arabic</option>\n            <option value=\"en\" " + (p47?.tts_lang === "en" || !p47?.tts_lang ? "selected" : "") + ">English</option>\n            <option value=\"fr\" " + (p47?.tts_lang === "fr" ? "selected" : "") + ">French</option>\n            <option value=\"de\" " + (p47?.tts_lang === "de" ? "selected" : "") + ">German</option>\n            <option value=\"es\" " + (p47?.tts_lang === "es" ? "selected" : "") + ">Spanish</option>\n          </select></div>\n      </div>") + "\n    " + actionCheckbox("keys", "Simulate Keystrokes", "⌨️", v60.keys_enabled, "\n      <button class=\"btn btn-ghost btn-sm\" onclick=\"openKeystrokeConfig()\" type=\"button\">⌨️ Select Keystroke</button>\n      <input type=\"hidden\" id=\"m-keys\" value=\"" + escapeAttr(p47?.keys || "") + "\">\n      <div class=\"ks-preview\" id=\"m-keys-preview\">" + (p47?.keys ? "🔑 " + p47.keys : "No keystroke configured") + "</div>\n      <div class=\"form-row\" style=\"margin-top:8px\">\n        <div class=\"form-group\"><label class=\"form-label\">Key Hold Duration (ms)</label>\n          <input class=\"form-input\" id=\"m-key-delay\" type=\"number\" min=\"0\" value=\"" + (p47?.key_delay || 100) + "\"></div>\n      </div>") + "\n    " + actionCheckbox("webhook", "Trigger WebHook", "🌐", v60.webhook_enabled, "\n      <label class=\"form-label\">Webhook URL</label>\n      <input class=\"form-input\" id=\"m-webhook-url\" value=\"" + escapeAttr(p47?.webhook_url || "") + "\">\n      <label class=\"form-label\" style=\"margin-top:8px\">Custom JSON Body (optional)</label>\n      <input class=\"form-input\" id=\"m-webhook-body\" placeholder='{\"key\":\"value\"}' value=\"" + escapeAttr(p47?.webhook_body || "") + "\">") + "\n    " + actionCheckbox("minecraft", "Exec Minecraft Command", "⛏️", v60.minecraft_enabled, "\n      <label class=\"form-label\">Command (without /)</label>\n      <textarea class=\"form-input\" id=\"m-mc-cmd\" rows=\"3\" placeholder=\"say {user} sent a gift!\">" + escapeAttr(p47?.mc_cmd || "") + "</textarea>\n      <p class=\"ks-params\"><b>Placeholders:</b> {playername} {username} {nickname} {comment} {giftname} {coins} {repeatcount} {likecount} {totallikecount}</p>\n      <p class=\"ks-params\"><b>Helper Commands:</b> delay &lt;ms&gt;, break_delays, skip_delays</p>") + "\n    " + actionCheckbox("multiplier", "Multiplier Mode (2x, 3x)", "🔥", v60.multiplier_enabled, "\n      <div style=\"display: flex; gap: 10px;\">\n        <div style=\"flex: 1;\">\n          <label class=\"form-label\">Multiplier Factor</label>\n          <input class=\"form-input\" id=\"m-multiplier-factor\" type=\"number\" min=\"2\" max=\"100\" value=\"" + (p47?.opts?.multiplier_factor || 2) + "\">\n        </div>\n        <div style=\"flex: 1;\">\n          <label class=\"form-label\">Duration (seconds)</label>\n          <input class=\"form-input\" id=\"m-multiplier-duration\" type=\"number\" min=\"1\" value=\"" + (p47?.opts?.multiplier_duration || 60) + "\">\n        </div>\n      </div>\n      <p class=\"ks-params\" style=\"margin-top:5px\">When this action runs, ALL future actions will be multiplied by this factor for the duration.</p>") + "\n\n    <div class=\"divider\"></div>\n    <h3 class=\"form-section-title\">Additional Settings</h3>\n    <div class=\"form-row\">\n      <div class=\"form-group\"><label class=\"form-label\">Display Duration (sec)</label>\n        <input class=\"form-input\" id=\"m-duration\" type=\"number\" min=\"0\" value=\"" + (p47?.duration || 5) + "\"></div>\n      <div class=\"form-group\"><label class=\"form-label\">Overlay Screen</label>\n        <select class=\"form-select\" id=\"m-screen\">" + Array.from({
    length: 10
  }, (p48, p49) => "<option value=\"" + (p49 + 1) + "\" " + (String(p47?.screen) == String(p49 + 1) ? "selected" : "") + ">Screen " + (p49 + 1) + "</option>").join("") + "</select></div>\n    </div>\n    <div class=\"form-row\">\n      <div class=\"form-group\"><label class=\"form-label\">Global Cooldown (sec)</label>\n        <input class=\"form-input\" id=\"m-cooldown\" type=\"number\" min=\"0\" value=\"" + (p47?.cooldown || 0) + "\"></div>\n      <div class=\"form-group\"><label class=\"form-label\">User Cooldown (sec)</label>\n        <input class=\"form-input\" id=\"m-user-cooldown\" type=\"number\" min=\"0\" value=\"" + (p47?.user_cooldown || 0) + "\"></div>\n    </div>\n    <div class=\"form-group\"><label class=\"form-label\">Media Volume</label>\n      <input type=\"range\" class=\"form-range\" id=\"m-volume\" min=\"0\" max=\"100\" value=\"" + (p47?.volume ?? 80) + "\" style=\"width:100%\">\n      <span class=\"form-range-value\" id=\"m-volume-val\">" + (p47?.volume ?? 80) + "%</span></div>\n    <div class=\"form-checkbox-group\"><input type=\"checkbox\" class=\"form-checkbox\" id=\"m-fade\" " + (p47?.fade_enabled !== false ? "checked" : "") + "><label class=\"form-checkbox-label\" for=\"m-fade\">Enable Fade-In/Out</label></div>\n    <div class=\"form-checkbox-group\"><input type=\"checkbox\" class=\"form-checkbox\" id=\"m-repeat-gift\" " + (p47?.repeat_gift ? "checked" : "") + "><label class=\"form-checkbox-label\" for=\"m-repeat-gift\">Repeat with gift combos</label></div>";
  const vA3 = ["anim", "picture", "audio", "video", "alert", "tts", "keys", "webhook", "minecraft", "multiplier"];
  vA3.forEach(item => {
    const v61 = document.getElementById("m-" + item + "-enabled");
    if (v61) {
      v61.addEventListener("change", event => {
        const v62 = document.getElementById("m-" + item + "-group");
        if (v62) {
          v62.style.display = event.target.checked ? "block" : "none";
        }
      });
    }
  });
  const v63 = document.getElementById("m-volume");
  if (v63) {
    v63.addEventListener("input", event => document.getElementById("m-volume-val").textContent = event.target.value + "%");
  }
  document.getElementById("modal-footer").innerHTML = "\n    <button class=\"btn btn-ghost\" onclick=\"closeModal()\">Cancel</button>\n    <button class=\"btn btn-primary\" id=\"m-save\">Save Action</button>";
  document.getElementById("m-save").addEventListener("click", async () => {
    if (window.__uploading) {
      uiAlert("استنى شوية — لسه بنرفع الملفات للسحابة، خليها تخلص الأول");
      return;
    }
    const v64 = document.getElementById("m-name").value.trim();
    if (!v64) {
      return;
    }
    const vF2 = p53 => {
      const v65 = document.getElementById(p53);
      if (v65) {
        return v65.value;
      } else {
        return "";
      }
    };
    const vF3 = p54 => {
      const v66 = document.getElementById(p54);
      if (v66 && v66.textContent !== "No file selected") {
        return v66.textContent;
      } else {
        return "";
      }
    };
    const vF4 = p55 => {
      const v67 = document.getElementById(p55);
      if (v67) {
        return v67.checked;
      } else {
        return false;
      }
    };
    const vO2 = {
      id: p47?.id || "act_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      name: v64,
      cooldown: parseInt(vF2("m-cooldown")) || 0,
      user_cooldown: parseInt(vF2("m-user-cooldown")) || 0,
      duration: parseInt(vF2("m-duration")) || 5,
      screen: vF2("m-screen"),
      volume: parseInt(vF2("m-volume")) || 80,
      fade_enabled: vF4("m-fade"),
      repeat_gift: vF4("m-repeat-gift"),
      keys: vF2("m-keys"),
      key_delay: parseInt(vF2("m-key-delay")) || 0,
      tts_text: vF2("m-tts-text"),
      tts_lang: vF2("m-tts-lang"),
      alert_text: vF2("m-alert-text"),
      alert_font_size: parseInt(vF2("m-alert-size")) || 22,
      alert_photo_size: parseInt(vF2("m-alert-photo-size")) || 64,
      alert_user_color: vF2("m-alert-user-color"),
      alert_text_color: vF2("m-alert-text-color"),
      alert_show_sender: vF4("m-alert-sender"),
      audio_path: vF3("m-audio-path"),
      video_path: vF3("m-video-path"),
      picture_path: vF3("m-picture-path"),
      anim_path: vF3("m-anim-path"),
      webhook_url: vF2("m-webhook-url"),
      webhook_body: vF2("m-webhook-body"),
      mc_cmd: vF2("m-mc-cmd"),
      opts: {
        anim_enabled: vF4("m-anim-enabled"),
        picture_enabled: vF4("m-picture-enabled"),
        audio_enabled: vF4("m-audio-enabled"),
        video_enabled: vF4("m-video-enabled"),
        alert_enabled: vF4("m-alert-enabled"),
        tts_enabled: vF4("m-tts-enabled"),
        keys_enabled: vF4("m-keys-enabled"),
        webhook_enabled: vF4("m-webhook-enabled"),
        minecraft_enabled: vF4("m-minecraft-enabled"),
        multiplier_enabled: vF4("m-multiplier-enabled"),
        multiplier_factor: parseInt(vF2("m-multiplier-factor")) || 2,
        multiplier_duration: parseInt(vF2("m-multiplier-duration")) || 60
      }
    };
    if (v59) {
      const v68 = actionsData.findIndex(item => item.id === p47.id);
      const v69 = actionsData[v68];
      actionsData[v68] = vO2;
      if (await saveActionsData()) {
        renderActions();
        closeModal();
      } else {
        actionsData[v68] = v69;
      }
    } else {
      actionsData.push(vO2);
      if (await saveActionsData()) {
        renderActions();
        closeModal();
      } else {
        actionsData.pop();
        renderActions();
      }
    }
  });
  showModal();
}
async function saveActionsData() {
  const saveResult = await api.actions.save(actionsData);
  if (saveResult && saveResult.ok === false) {
    if (saveResult.reason === "limit") {
      uiAlert(tierLimits.tier === "free" ? "الوضع المجاني يسمح بـ " + saveResult.limit + " أكشن فقط. اشترك لفتح المزيد!" : "باقتك (" + tierLimits.label + ") تسمح بـ " + saveResult.limit + " أكشن كحد أقصى. يرجى الترقية!");
    } else {
      // فشل مش متعلق بالباقة (اتصال/جلسة) — رسالة صادقة بدل "يرجى الترقية"
      uiAlert("تعذر حفظ الأكشنات" + (saveResult.error ? " — " + saveResult.error : saveResult.reason ? " (" + saveResult.reason + ")" : " — اتأكد من الاتصال بالسيرفر وحاول تاني"));
    }
    return false;
  }
  return true;
}
function actionCheckbox(p57, p58, p59, p60, p61) {
  return "<div class=\"action-type-block\">\n    <div class=\"form-checkbox-group\"><input type=\"checkbox\" class=\"form-checkbox\" id=\"m-" + p57 + "-enabled\" " + (p60 ? "checked" : "") + "><label class=\"form-checkbox-label\" for=\"m-" + p57 + "-enabled\"><span class=\"action-emoji\">" + p59 + "</span> " + p58 + "</label></div>\n    <div class=\"action-sub-panel\" id=\"m-" + p57 + "-group\" style=\"display:" + (p60 ? "block" : "none") + ";padding:8px 0 8px 32px\">" + p61 + "</div>\n  </div>";
}
function showConfirmDialog(p62, p63, p64 = "حذف", p65 = "إلغاء") {
  return new Promise(p66 => {
    const divEl12 = document.createElement("div");
    divEl12.className = "ks-overlay";
    divEl12.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width: 420px; text-align: center; padding: 28px; animation: modalIn 0.2s ease;\">\n      <div style=\"font-size: 40px; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.4));\">⚠️</div>\n      <h3 style=\"font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;\">" + p62 + "</h3>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; direction: rtl; text-align: center;\">" + p63 + "</p>\n      <div style=\"display: flex; gap: 12px; justify-content: center;\">\n        <button class=\"btn btn-danger\" id=\"confirm-yes-btn\" style=\"min-width: 110px; justify-content: center; font-weight: 700;\">" + p64 + "</button>\n        <button class=\"btn btn-ghost\" id=\"confirm-no-btn\" style=\"min-width: 110px; justify-content: center;\">" + p65 + "</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl12);
    const vF5 = p67 => {
      document.removeEventListener("keydown", vF6, true);
      divEl12.remove();
      p66(p67);
    };
    const vF6 = p68 => {
      if (p68.key === "Enter") {
        p68.preventDefault();
        p68.stopPropagation();
        vF5(true);
      } else if (p68.key === "Escape") {
        p68.preventDefault();
        p68.stopPropagation();
        vF5(false);
      }
    };
    document.addEventListener("keydown", vF6, true);
    document.getElementById("confirm-yes-btn").onclick = () => vF5(true);
    document.getElementById("confirm-no-btn").onclick = () => vF5(false);
    divEl12.onclick = p69 => {
      if (p69.target === divEl12) {
        vF5(false);
      }
    };
  });
}
window.showConfirmDialog = showConfirmDialog;
window.editAction = p70 => {
  const v72 = actionsData.find(item => item.id === p70);
  if (v72) {
    openActionModal(v72);
  }
};
window.deleteAction = async p72 => {
  const v73 = actionsData.find(item => item.id === p72);
  const v74 = v73 ? v73.name : "هذا الأكشن";
  const v75 = await showConfirmDialog("حذف الأكشن", "هل أنت متأكد من رغبتك في حذف الأكشن \"" + v74 + "\"؟");
  if (!v75) {
    return;
  }
  actionsData = actionsData.filter(item => item.id !== p72);
  await saveActionsData();
  renderActions();
};
// شريط تقدم الرفع — بينزل تحت عنصر المسار مباشرة ويعرض النسبة المئوية
window.__mediaBar = (elId, pct) => {
  const el = document.getElementById(elId);
  if (!el) return;
  let bar = document.getElementById(elId + "__upbar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = elId + "__upbar";
    bar.style.cssText = "margin-top:6px;display:flex;align-items:center;gap:8px";
    const track = document.createElement("div");
    track.style.cssText = "flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden";
    const fill = document.createElement("div");
    fill.id = elId + "__upfill";
    fill.style.cssText = "height:100%;width:0%;border-radius:5px;background:linear-gradient(90deg,#e8ca74,#c69c2d);transition:width .2s";
    track.appendChild(fill);
    const label = document.createElement("span");
    label.id = elId + "__uplabel";
    label.style.cssText = "font-size:11.5px;font-weight:800;color:#ecd28a;min-width:44px;text-align:center;direction:ltr";
    label.textContent = "0%";
    bar.appendChild(track);
    bar.appendChild(label);
    el.parentNode.insertBefore(bar, el.nextSibling);
  }
  const fill = document.getElementById(elId + "__upfill");
  const label = document.getElementById(elId + "__uplabel");
  if (pct >= 100) {
    if (fill) fill.style.width = "100%";
    if (label) { label.textContent = "✓ 100%"; label.style.color = "#57a273"; }
    setTimeout(() => { const b = document.getElementById(elId + "__upbar"); if (b) b.remove(); }, 1500);
  } else {
    if (fill) fill.style.width = pct + "%";
    if (label) label.textContent = pct + "%";
  }
};

// رفع ملف ميديا محلي للسحابة — بيرجع الرابط السحابي أو المسار المحلي لو الرفع فشل
window.__cloudUpload = async (localPath, barId, onText) => {
  const ext = (String(localPath).split(".").pop() || "").toLowerCase();
  if (!["mp3", "wav", "ogg", "m4a", "mp4", "webm", "mov", "gif", "png", "jpg", "jpeg", "webp"].includes(ext)) {
    return localPath;
  }
  window.__uploading = true;
  try {
    const up = await api.media.uploadFile(localPath, (pct) => {
      window.__mediaBar(barId, pct);
      if (typeof onText === "function") onText(pct);
    });
    if (up && up.ok) {
      window.__uploading = false;
      window.__mediaBar(barId, 100);
      return up.url;
    }
    // الرفع فشل — نعرض السبب بدل الصمت
    if (barId) {
      const el = document.getElementById(barId);
      if (el) {
        el.textContent = "⚠ فشل رفع الملف" + (up && up.error ? " — " + up.error : "") + " — سيتم استخدام النسخة المحلية";
        el.style.color = "#d97a74";
        setTimeout(() => { el.style.color = ""; }, 6000);
      }
    }
  } catch (e) {}
  window.__uploading = false;
  return localPath; // الرفع فشل — نكمل بالمسار المحلي (الأوفرلاي المحلي يقدر يشغله)
};
window.pickFile = async (p75, p76) => {
  const openFileResult = await api.dialog.openFile({
    filters: [{
      name: "File",
      extensions: p76
    }]
  });
  if (openFileResult) {
    const el = document.getElementById(p75);
    const finalPath = await window.__cloudUpload(openFileResult, p75, (pct) => {
      if (el) el.textContent = "⬆ رفع للسحابة: " + pct + "%";
    });
    if (el) el.textContent = finalPath;
  }
};
let hotkeysData = [];
const hotkeyStoreKey = () => activeProfileId ? "hotkeys." + activeProfileId : "hotkeys.__default";
async function loadHotkeys() {
  hotkeysData = (await api.store.get(hotkeyStoreKey())) || [];
  if (!hotkeysData.length && !activeProfileId) {
    const getResult2 = await api.store.get("hotkeys");
    if (Array.isArray(getResult2) && getResult2.length) {
      hotkeysData = getResult2;
    }
  } else if (!hotkeysData.length) {
    const getResult3 = await api.store.get("hotkeys.__migrated");
    if (!getResult3) {
      const getResult4 = await api.store.get("hotkeys");
      if (Array.isArray(getResult4) && getResult4.length) {
        hotkeysData = getResult4;
        await api.store.set(hotkeyStoreKey(), hotkeysData);
      }
      await api.store.set("hotkeys.__migrated", true);
    }
  }
  renderHotkeys();
  await api.system.registerCustomHotkeys(hotkeysData);
}
function renderHotkeys() {
  const v80 = document.getElementById("hotkeys-tbody");
  if (!hotkeysData.length) {
    v80.innerHTML = "<tr class=\"empty-row\"><td colspan=\"4\"><div class=\"empty-state\"><p>No hotkeys defined yet</p><span>Click \"Create Hotkey\" to bind a keyboard shortcut</span></div></td></tr>";
    return;
  }
  v80.innerHTML = hotkeysData.map(item => {
    let v81 = item.targetId;
    if (item.targetType === "action") {
      const v82 = actionsData.find(item => item.id === item.targetId);
      if (v82) {
        v81 = v82.name;
      }
    } else if (item.targetType === "extension") {
      if (item.targetId === "gift-spinner") {
        v81 = "🎡 All Spinners (Test Spin)";
      } else if (item.targetId.startsWith("gift-spinner-")) {
        const v83 = item.targetId.replace("gift-spinner-", "");
        const v84 = window.__giftSpinnersCache || [];
        const v85 = v84.find(item => item.id === v83);
        v81 = v85 ? "🎡 " + v85.name : "🎡 Spinner (" + v83 + ")";
      }
    }
    return "<tr>\n      <td><kbd style=\"padding:4px 8px;background:var(--bg-secondary);border-radius:4px;border:1px solid var(--border-color)\">" + escapeHtml(item.key) + "</kbd></td>\n      <td>" + (item.targetType === "action" ? "⚡ Action" : "🧩 Extension") + "</td>\n      <td>" + escapeHtml(v81) + "</td>\n      <td><div class=\"table-actions\">\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"editHotkey('" + item.id + "')\">Edit</button>\n        <button class=\"btn btn-danger btn-sm\" onclick=\"deleteHotkey('" + item.id + "')\">Delete</button>\n      </div></td>\n    </tr>";
  }).join("");
}
document.getElementById("create-hotkey-btn")?.addEventListener("click", () => openHotkeyModal());
function openHotkeyModal(p80 = null) {
  const v86 = !!p80;
  document.getElementById("modal-title").textContent = v86 ? "Edit Hotkey" : "New Hotkey";
  const joined = actionsData.map(item => "<option value=\"" + item.id + "\" " + (p80?.targetId === item.id ? "selected" : "") + ">" + escapeHtml(item.name) + "</option>").join("");
  let vLS = "";
  const v88 = window.__giftSpinnersCache || [];
  if (v88.length > 0) {
    vLS = v88.map(item => "<option value=\"gift-spinner-" + item.id + "\" " + (p80?.targetId === "gift-spinner-" + item.id ? "selected" : "") + ">🎡 " + escapeHtml(item.name) + "</option>").join("");
  } else {
    vLS = "<option value=\"gift-spinner\" " + (p80?.targetId === "gift-spinner" ? "selected" : "") + ">🎡 Gift Spinner (Test Spin)</option>";
  }
  document.getElementById("modal-body").innerHTML = "\n    <div class=\"form-group\">\n      <label class=\"form-label\">Keyboard Shortcut</label>\n      <input type=\"text\" class=\"form-input\" id=\"m-hk-key\" value=\"" + escapeHtml(p80?.key || "") + "\" placeholder=\"Press any key...\" readonly style=\"cursor:pointer; text-align:center; font-weight:bold; letter-spacing:1px;\">\n      <p style=\"font-size:11px;color:var(--text-muted);margin-top:4px;\">Click the box above and press the key you want to bind.</p>\n    </div>\n    <div class=\"form-group\">\n      <label class=\"form-label\">Target Type</label>\n      <select class=\"form-select\" id=\"m-hk-type\">\n        <option value=\"action\" " + (p80?.targetType === "action" ? "selected" : "") + ">⚡ Trigger Action</option>\n        <option value=\"extension\" " + (p80?.targetType === "extension" ? "selected" : "") + ">🧩 Trigger Extension</option>\n      </select>\n    </div>\n    <div class=\"form-group\" id=\"hk-action-sel\" style=\"display:" + (p80?.targetType === "extension" ? "none" : "block") + "\">\n      <label class=\"form-label\">Select Action</label>\n      <select class=\"form-select\" id=\"m-hk-action-id\">" + joined + "</select>\n    </div>\n    <div class=\"form-group\" id=\"hk-ext-sel\" style=\"display:" + (p80?.targetType === "extension" ? "block" : "none") + "\">\n      <label class=\"form-label\">Select Spinner (اختر السبينر)</label>\n      <select class=\"form-select\" id=\"m-hk-ext-id\">" + vLS + "</select>\n    </div>\n  ";
  document.getElementById("modal-footer").innerHTML = "\n    <button class=\"btn btn-ghost\" onclick=\"closeModal()\">Cancel</button>\n    <button class=\"btn btn-primary\" id=\"m-hk-save\">Save Hotkey</button>";
  const v89 = document.getElementById("m-hk-key");
  v89.addEventListener("keydown", event => {
    event.preventDefault();
    event.stopPropagation();
    let v90 = event.code;
    if (v90 === "Space") {
      v90 = "Space";
    }
    v89.value = v90;
  });
  document.getElementById("m-hk-type").addEventListener("change", event => {
    const v91 = event.target.value;
    document.getElementById("hk-action-sel").style.display = v91 === "action" ? "block" : "none";
    document.getElementById("hk-ext-sel").style.display = v91 === "extension" ? "block" : "none";
  });
  document.getElementById("m-hk-save").addEventListener("click", async () => {
    const v92 = document.getElementById("m-hk-key").value;
    if (!v92) {
      return;
    }
    const v93 = document.getElementById("m-hk-type").value;
    const v94 = v93 === "action" ? document.getElementById("m-hk-action-id").value : document.getElementById("m-hk-ext-id").value;
    if (!v94) {
      return;
    }
    const vO3 = {
      id: p80?.id || "hk_" + Date.now().toString(36),
      key: v92,
      targetType: v93,
      targetId: v94
    };
    if (v86) {
      const v95 = hotkeysData.findIndex(item => item.id === p80.id);
      if (v95 >= 0) {
        hotkeysData[v95] = vO3;
      }
    } else {
      hotkeysData.push(vO3);
    }
    await api.store.set(hotkeyStoreKey(), hotkeysData);
    await api.system.registerCustomHotkeys(hotkeysData);
    renderHotkeys();
    closeModal();
  });
  showModal();
}
window.editHotkey = p86 => {
  const v96 = hotkeysData.find(item => item.id === p86);
  if (v96) {
    openHotkeyModal(v96);
  }
};
window.deleteHotkey = async p88 => {
  hotkeysData = hotkeysData.filter(item => item.id !== p88);
  await api.store.set(hotkeyStoreKey(), hotkeysData);
  await api.system.registerCustomHotkeys(hotkeysData);
  renderHotkeys();
};
let eventsData = [];
async function loadEvents() {
  eventsData = (await api.events.getAll()) || [];
  renderEvents();
}
function getCoinRangeForEvent(p90) {
  const v97 = eventsData.find(item => item.id === p90);
  if (!v97 || v97.trigger?.type !== "gift_coins") {
    return {
      min: 0,
      max: 0,
      label: "—"
    };
  }
  const v98 = v97.trigger.coins || 0;
  if (v98 <= 0) {
    return {
      min: 0,
      max: 0,
      label: "0"
    };
  }
  const v99 = [...new Set(eventsData.filter(item => item.trigger?.type === "gift_coins" && (item.trigger?.coins || 0) > 0).map(item => item.trigger.coins))].sort((a, b) => a - b);
  const v100 = v99.indexOf(v98);
  const v101 = v100 <= 0 ? 1 : v99[v100 - 1] + 1;
  const v102 = v101 === v98 ? v98 + " coins" : v101 + "–" + v98 + " coins";
  return {
    min: v101,
    max: v98,
    label: v102
  };
}
function getCoinRangePreview(p96, p97) {
  const v103 = parseInt(p96) || 0;
  if (v103 <= 0) {
    return "Enter a coin value to see the range";
  }
  const v104 = [...new Set(eventsData.filter(item => item.trigger?.type === "gift_coins" && (item.trigger?.coins || 0) > 0 && item.id !== p97).map(item => item.trigger.coins))].sort((a, b) => a - b);
  const v105 = [...new Set([...v104, v103])].sort((a, b) => a - b);
  const v106 = v105.indexOf(v103);
  const v107 = v106 <= 0 ? 1 : v105[v106 - 1] + 1;
  if (v107 === v103) {
    return "⚡ This event triggers for gifts worth exactly " + v103 + " coin(s)";
  }
  return "⚡ This event triggers for gifts worth " + v107 + " – " + v103 + " coins";
}
function renderEvents(p104 = "") {
  const v108 = document.getElementById("events-tbody");
  const v109 = p104 ? eventsData.filter(item => (item.trigger?.type || "").includes(p104.toLowerCase())) : eventsData;
  if (v109.length === 0) {
    v108.innerHTML = "<tr class=\"empty-row\"><td colspan=\"6\"><div class=\"empty-state\"><p>No events defined yet</p><span>Click \"Create Event\" to link triggers to actions</span></div></td></tr>";
    return;
  }
  v108.innerHTML = v109.map(item => {
    const v110 = item.trigger || {};
    let v111 = v110.type === "gift" ? "Gift: " + (v110.gift || "Any") : v110.type === "gift_coins" ? "💰 " + getCoinRangeForEvent(item.id).label : v110.type === "like" ? (v110.likes || 0) + "+ Likes" : v110.type?.startsWith("total_") ? "📈 Total " + v110.type.split("_")[1] + ": " + v110.target : v110.type || "join";
    const v112 = {
      join: "blue",
      comment: "cyan",
      like: "pink",
      gift: "purple",
      gift_coins: "cyan",
      follow: "green"
    }[v110.type] || (v110.type?.startsWith("total_") ? "blue" : "purple");
    const v113 = item.who?.type === "specific" ? "@" + item.who.username : "Everyone";
    let v114 = "<span class=\"badge badge-" + v112 + "\">" + escapeHtml(v111) + "</span>";
    if (v110.type === "gift" && v110.gift) {
      const v115 = v110.giftId && giftCatalog.find(item => item.id === v110.giftId) || giftCatalog.find(item => item.name === v110.gift && (v110.giftCoins ? item.coins == v110.giftCoins : true)) || giftCatalog.find(item => item.name === v110.gift);
      if (v115 && v115.img) {
        v114 = "<span class=\"badge badge-" + v112 + "\"><img src=\"" + v115.img + "\" class=\"gift-badge-img\"> " + escapeHtml(v110.gift) + " (" + (v110.giftCoins || v115.coins) + "c)</span>";
      } else if (v115 && v115.emoji) {
        v114 = "<span class=\"badge badge-" + v112 + "\">" + v115.emoji + " " + escapeHtml(v110.gift) + " (" + (v110.giftCoins || v115.coins) + "c)</span>";
      }
    }
    const v116 = (item.actions_all || []).map(item => {
      const v117 = actionsData.find(item => item.id === item);
      if (v117) {
        return v117.name;
      } else {
        return item;
      }
    });
    const v118 = (item.actions_random || []).map(item => {
      const v119 = actionsData.find(item => item.id === item);
      if (v119) {
        return v119.name;
      } else {
        return item;
      }
    });
    let vLS2 = "";
    if (v116.length > 0) {
      vLS2 += v116.join(", ");
    }
    if (v118.length > 0) {
      vLS2 += (vLS2 ? " | " : "") + "🎲 " + v118.join(", ");
    }
    if (!vLS2) {
      vLS2 = "—";
    }
    return "<tr data-id=\"" + item.id + "\">\n      <td class=\"drag-handle\">⋮⋮</td>\n      <td><label class=\"toggle\"><input type=\"checkbox\" " + (item.active ? "checked" : "") + " onchange=\"toggleEvent('" + item.id + "', this.checked)\"><span class=\"toggle-slider\"></span></label></td>\n      <td>" + escapeHtml(v113) + "</td>\n      <td>" + v114 + "</td>\n      <td style=\"max-width:200px;overflow:hidden;text-overflow:ellipsis\">" + escapeHtml(vLS2) + "</td>\n      <td><div class=\"table-actions\">\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"testEvent('" + item.id + "')\" title=\"Test now\" style=\"color:var(--accent-cyan);\">▶ Test</button>\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"testEventDelayed('" + item.id + "')\" title=\"Test after 5 seconds\" style=\"color:#ffd64d;\">⏱ 5s</button>\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"editEvent('" + item.id + "')\">Edit</button>\n        <button class=\"btn btn-danger btn-sm\" onclick=\"deleteEvent('" + item.id + "')\">Delete</button>\n      </div></td></tr>";
  }).join("");
}
document.getElementById("events-search").addEventListener("input", event => renderEvents(event.target.value));
document.getElementById("create-event-btn").addEventListener("click", () => openEventModal());
let giftCatalog = [];
async function loadGifts() {
  giftCatalog = (await api.gifts.getAll()) || [];
}
loadGifts();
async function refreshLiveGifts() {
  const getLiveResult = await api.gifts.getLive();
  if (getLiveResult && getLiveResult.length > 0) {
    giftCatalog = getLiveResult;
  }
}
api.gifts.onUpdated(async () => {
  giftCatalog = (await api.gifts.getAll()) || [];
  addFeedItem("system", "System", "Gifts updated: " + giftCatalog.length + " gifts with real images", "🎁");
  renderEvents();
});
function openEventModal(p115 = null) {
  const v121 = !!p115;
  if (!v121 && eventsData.length >= tierLimits.actions) {
    uiAlert(tierLimits.tier === "free" ? "الوضع المجاني يسمح بـ " + tierLimits.actions + " حدث فقط. اشترك لفتح المزيد!" : "باقتك (" + tierLimits.label + ") تسمح بـ " + tierLimits.actions + " حدث كحد أقصى. يرجى الترقية!");
    return;
  }
  const joined2 = actionsData.map(item => "<option value=\"" + item.id + "\" " + ((p115?.actions_all || []).includes(item.id) ? "selected" : "") + ">" + escapeHtml(item.name) + "</option>").join("");
  const joined3 = actionsData.map(item => "<option value=\"" + item.id + "\" " + ((p115?.actions_random || []).includes(item.id) ? "selected" : "") + ">" + escapeHtml(item.name) + "</option>").join("");
  document.getElementById("modal-title").textContent = v121 ? "Edit Event" : "New Event";
  document.getElementById("modal-body").innerHTML = "\n    <div class=\"form-group\"><label class=\"form-label\">Trigger Type</label>\n      <select class=\"form-select\" id=\"m-trigger-type\">\n        <option value=\"join\" " + (p115?.trigger?.type === "join" ? "selected" : "") + ">👋 Join</option>\n        <option value=\"comment\" " + (p115?.trigger?.type === "comment" ? "selected" : "") + ">💬 Comment</option>\n        <option value=\"like\" " + (p115?.trigger?.type === "like" ? "selected" : "") + ">❤️ Like</option>\n        <option value=\"gift\" " + (p115?.trigger?.type === "gift" ? "selected" : "") + ">🎁 Gift</option>\n        <option value=\"gift_coins\" " + (p115?.trigger?.type === "gift_coins" ? "selected" : "") + ">💰 Gift (Coins Range)</option>\n        <option value=\"follow\" " + (p115?.trigger?.type === "follow" ? "selected" : "") + ">👤 Follow</option>\n        <option value=\"share\" " + (p115?.trigger?.type === "share" ? "selected" : "") + ">🔄 Share</option>\n        <option value=\"subscribe\" " + (p115?.trigger?.type === "subscribe" ? "selected" : "") + ">⭐ Subscribe</option>\n        <option value=\"total_likes\" " + (p115?.trigger?.type === "total_likes" ? "selected" : "") + ">📈 Total Likes</option>\n        <option value=\"total_follow\" " + (p115?.trigger?.type === "total_follow" ? "selected" : "") + ">📈 Total Follows</option>\n        <option value=\"total_share\" " + (p115?.trigger?.type === "total_share" ? "selected" : "") + ">📈 Total Shares</option>\n        <option value=\"total_coins\" " + (p115?.trigger?.type === "total_coins" ? "selected" : "") + ">📈 Total Coins</option>\n        <!-- <option value=\"webhook\" " + (p115?.trigger?.type === "webhook" ? "selected" : "") + ">🌐 External Alert Link</option> -->\n      </select></div>\n    <div class=\"form-group\" id=\"m-webhook-group\" style=\"display:" + (p115?.trigger?.type === "webhook" ? "block" : "none") + "\">\n      <label class=\"form-label\">External Alert Link (Streamlabs, etc.)</label>\n      <input class=\"form-input\" type=\"text\" id=\"m-webhook-path\" placeholder=\"https://streamlabs.com/alert-box/v3/...\" value=\"" + escapeAttr(p115?.trigger?.webhookPath || "") + "\" style=\"font-family: monospace;\">\n      <small style=\"color:var(--text-muted); display:block; margin-top:5px;\">Paste the alert URL here. The app will monitor this link in the background and trigger the action when an alert plays.</small>\n    </div>\n    <div class=\"form-group\" id=\"m-gift-group\" style=\"display:" + (p115?.trigger?.type === "gift" ? "block" : "none") + "\">\n      <label class=\"form-label\">Choose a Gift</label>\n      <input type=\"hidden\" id=\"m-gift\" value=\"" + escapeAttr(p115?.trigger?.gift || "") + "\">\n      <input type=\"hidden\" id=\"m-gift-coins\" value=\"" + (p115?.trigger?.giftCoins || "") + "\">\n      <input type=\"hidden\" id=\"m-gift-id\" value=\"" + escapeAttr(p115?.trigger?.giftId || "") + "\">\n      <div class=\"gift-picker-trigger\" id=\"gift-picker-trigger\" onclick=\"toggleGiftPicker()\">\n        <span id=\"gift-picker-label\">" + (() => {
    if (!p115?.trigger?.gift) {
      return "Select a gift...";
    }
    const v124 = giftCatalog.find(item => item.name === p115.trigger.gift && (p115.trigger.giftCoins ? item.coins == p115.trigger.giftCoins : true)) || giftCatalog.find(item => item.name === p115.trigger.gift);
    const v125 = v124?.img ? "<img class=\"gift-img-sm\" src=\"" + v124.img + "\" style=\"width:18px;height:18px;vertical-align:middle\">" : v124?.emoji || "🎁";
    return v125 + " " + escapeHtml(p115.trigger.gift) + " (" + (p115.trigger.giftCoins || v124?.coins || "?") + " coins)";
  })() + "</span>\n        <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"/></svg>\n      </div>\n      <div class=\"gift-picker-dropdown\" id=\"gift-picker-dropdown\" style=\"display:none\">\n        <input class=\"gift-picker-search\" id=\"gift-search\" placeholder=\"Search gifts...\" oninput=\"filterGifts(this.value)\">\n        <div class=\"gift-picker-list\" id=\"gift-picker-list\"></div>\n      </div>\n    </div>\n    <div class=\"form-group\" id=\"m-likes-group\" style=\"display:" + (p115?.trigger?.type === "like" ? "block" : "none") + "\">\n      <label class=\"form-label\">Likes Threshold</label>\n      <input class=\"form-input\" id=\"m-likes\" type=\"number\" min=\"0\" value=\"" + (p115?.trigger?.likes || 0) + "\"></div>\n    <div class=\"form-group\" id=\"m-totals-group\" style=\"display:" + (p115?.trigger?.type?.startsWith("total_") ? "block" : "none") + "\">\n      <label class=\"form-label\">Total Target Number (e.g. 10000)</label>\n      <input class=\"form-input\" id=\"m-totals-target\" type=\"number\" min=\"1\" value=\"" + (p115?.trigger?.target || 1000) + "\">\n      <small style=\"color:var(--text-muted); display:block; margin-top:5px;\">When the total number reaches this target in the livestream, the action will trigger and the counter will reset to trigger again at the next milestone.</small>\n    </div>\n    <div class=\"form-group\" id=\"m-comment-group\" style=\"display:" + (p115?.trigger?.type === "comment" ? "block" : "none") + "\">\n      <label class=\"form-label\">Keyword Filter (optional)</label>\n      <input class=\"form-input\" id=\"m-comment-kw\" value=\"" + escapeAttr(p115?.trigger?.keyword || "") + "\" placeholder=\"Leave empty for all comments\"></div>\n    <div class=\"form-group\" id=\"m-coins-group\" style=\"display:" + (p115?.trigger?.type === "gift_coins" ? "block" : "none") + "\">\n      <label class=\"form-label\">Maximum Coins Value</label>\n      <input class=\"form-input\" id=\"m-coins-value\" type=\"number\" min=\"1\" value=\"" + (p115?.trigger?.coins || 1) + "\" placeholder=\"e.g. 5, 10, 100\">\n      <div id=\"m-coins-range-preview\" style=\"margin-top:8px;padding:10px 14px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:8px;font-size:13px;color:var(--accent-purple);line-height:1.5\"></div>\n    </div>\n    <div class=\"divider\"></div>\n    <div class=\"form-group\"><label class=\"form-label\">Who Can Trigger</label>\n      <select class=\"form-select\" id=\"m-who-type\">\n        <option value=\"everyone\" " + (p115?.who?.type !== "specific" ? "selected" : "") + ">Everyone</option>\n        <option value=\"specific\" " + (p115?.who?.type === "specific" ? "selected" : "") + ">Specific User</option>\n      </select></div>\n    <div class=\"form-group\" id=\"m-who-user-group\" style=\"display:" + (p115?.who?.type === "specific" ? "block" : "none") + "\">\n      <label class=\"form-label\">Username</label>\n      <input class=\"form-input\" id=\"m-who-user\" value=\"" + escapeAttr(p115?.who?.username || "") + "\"></div>\n    <div class=\"divider\"></div>\n    <div class=\"form-group\">\n      <label class=\"form-label\">Trigger all of these actions</label>\n      <div class=\"tag-select\" id=\"ts-all\" onclick=\"openTagDropdown('all')\">\n        <span class=\"tag-placeholder\" id=\"ts-all-ph\">Click to add actions...</span>\n      </div>\n      <div class=\"tag-dropdown\" id=\"td-all\" style=\"display:none\"></div>\n      <div class=\"tag-list\" id=\"tl-all\"></div>\n    </div>\n    <div class=\"form-group\">\n      <label class=\"form-label\">Trigger one of these actions (random)</label>\n      <div class=\"tag-select\" id=\"ts-random\" onclick=\"openTagDropdown('random')\">\n        <span class=\"tag-placeholder\" id=\"ts-random-ph\">Click to add actions...</span>\n      </div>\n      <div class=\"tag-dropdown\" id=\"td-random\" style=\"display:none\"></div>\n      <div class=\"tag-list\" id=\"tl-random\"></div>\n    </div>";
  document.getElementById("m-trigger-type").addEventListener("change", event => {
    document.getElementById("m-gift-group").style.display = event.target.value === "gift" ? "block" : "none";
    document.getElementById("m-likes-group").style.display = event.target.value === "like" ? "block" : "none";
    document.getElementById("m-comment-group").style.display = event.target.value === "comment" ? "block" : "none";
    document.getElementById("m-coins-group").style.display = event.target.value === "gift_coins" ? "block" : "none";
    document.getElementById("m-webhook-group").style.display = event.target.value === "webhook" ? "block" : "none";
    const v126 = document.getElementById("m-totals-group");
    if (v126) {
      v126.style.display = event.target.value.startsWith("total_") ? "block" : "none";
    }
    if (event.target.value === "gift_coins") {
      f4();
    }
  });
  document.getElementById("m-who-type").addEventListener("change", event => {
    document.getElementById("m-who-user-group").style.display = event.target.value === "specific" ? "block" : "none";
  });
  document.getElementById("modal-footer").innerHTML = "\n    <button class=\"btn btn-ghost\" onclick=\"closeModal()\">Cancel</button>\n    <button class=\"btn btn-primary\" id=\"m-save-event\">Save Event</button>";
  initTagSelector("all", p115?.actions_all || []);
  initTagSelector("random", p115?.actions_random || []);
  const v127 = p115?.id || null;
  function f4() {
    const v128 = document.getElementById("m-coins-range-preview");
    const v129 = document.getElementById("m-coins-value");
    if (!v128 || !v129) {
      return;
    }
    v128.textContent = getCoinRangePreview(v129.value, v127);
  }
  window.updateCoinsPreview = f4;
  const v130 = document.getElementById("m-coins-value");
  if (v130) {
    v130.addEventListener("input", f4);
    if (p115?.trigger?.type === "gift_coins") {
      f4();
    }
  }
  document.getElementById("m-save-event").addEventListener("click", () => {
    const v131 = selectedTags.all || [];
    const v132 = selectedTags.random || [];
    if (v131.length === 0 && v132.length === 0) {
      return;
    }
    const vO4 = {
      id: p115?.id || "ev_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      active: p115?.active !== false,
      trigger: {
        type: document.getElementById("m-trigger-type").value,
        gift: document.getElementById("m-gift").value,
        giftCoins: parseInt(document.getElementById("m-gift-coins")?.value) || 0,
        giftId: document.getElementById("m-gift-id")?.value || "",
        likes: parseInt(document.getElementById("m-likes").value) || 0,
        keyword: document.getElementById("m-comment-kw")?.value || "",
        coins: parseInt(document.getElementById("m-coins-value")?.value) || 0,
        webhookPath: document.getElementById("m-webhook-path")?.value || "",
        target: parseInt(document.getElementById("m-totals-target")?.value) || 1000
      },
      who: {
        type: document.getElementById("m-who-type").value,
        username: document.getElementById("m-who-user").value
      },
      actions_all: v131,
      actions_random: v132
    };
    if (v121) {
      const v133 = eventsData.findIndex(item => item.id === p115.id);
      if (v133 >= 0) {
        eventsData[v133] = vO4;
      }
    } else {
      eventsData.push(vO4);
    }
    api.events.save(eventsData);
    renderEvents();
    closeModal();
  });
  showModal();
}
window.editEvent = p123 => {
  const v134 = eventsData.find(item => item.id === p123);
  if (v134) {
    openEventModal(v134);
  }
};
window.testEvent = async p125 => {
  await api.events.test(p125);
  addFeedItem("system", "Test", "Event tested — all actions executed", "▶️");
};
window.testEventDelayed = async p126 => {
  await api.events.testDelayed(p126, 5);
  addFeedItem("system", "Test", "Event will execute in 5 seconds...", "⏱️");
};
window.deleteEvent = async p127 => {
  const v135 = eventsData.find(item => item.id === p127);
  let vLS3 = "هذا الحدث";
  if (v135 && v135.trigger) {
    const v136 = v135.trigger;
    if (v136.type === "gift") {
      vLS3 = "حدث الهدية (" + (v136.gift || "أي هدية") + ")";
    } else if (v136.type === "gift_coins") {
      vLS3 = "حدث العملات (" + (v136.coins || 0) + " عملة)";
    } else if (v136.type === "like") {
      vLS3 = "حدث اللايكات (" + (v136.likes || 0) + " لايك)";
    } else if (v136.type === "follow") {
      vLS3 = "حدث المتابعة الجديدة";
    } else if (v136.type === "comment") {
      vLS3 = "حدث التعليق الجديد";
    } else if (v136.type === "join") {
      vLS3 = "حدث الانضمام للبث";
    } else {
      vLS3 = "حدث (" + v136.type + ")";
    }
  }
  const v137 = await showConfirmDialog("حذف الحدث", "هل أنت متأكد من رغبتك في حذف " + vLS3 + "؟");
  if (!v137) {
    return;
  }
  eventsData = eventsData.filter(item => item.id !== p127);
  await api.events.save(eventsData);
  renderEvents();
};
window.toggleEvent = async (p130, p131) => {
  const v138 = eventsData.find(item => item.id === p130);
  if (v138) {
    v138.active = p131;
    await api.events.save(eventsData);
  }
};
function showModal() {
  document.getElementById("modal-overlay").style.display = "flex";
}
function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}
window.closeModal = closeModal;
// منع قفل صفحة الأكشن أثناء رفع الملفات للسحابة (يعمل كمان على زرار Cancel)
const __origCloseModal = closeModal;
window.closeModal = function () {
  if (window.__uploading) return;
  __origCloseModal();
};
document.getElementById("modal-close").addEventListener("click", () => {
  if (window.__uploading) return;
  closeModal();
});
function escapeHtml(p133) {
  const divEl13 = document.createElement("div");
  divEl13.textContent = p133 || "";
  return divEl13.innerHTML;
}

// ===== رسالة التحديث — بنفس ستايل البرنامج (ذهبي/داكن/سينزل) =====
let __updateShown = false;
if (api.update && api.update.onReady) {
  api.update.onReady((version) => {
    if (__updateShown) return;
    __updateShown = true;
    const overlay = document.createElement("div");
    overlay.id = "update-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(4,4,6,.82);backdrop-filter:blur(6px);z-index:200000;display:flex;align-items:center;justify-content:center;font-family:'Cairo','Segoe UI',sans-serif";
    overlay.innerHTML = `
      <div style="width:min(430px,calc(100vw - 40px));background:linear-gradient(180deg,rgba(212,175,55,.08),transparent 40%),#101015;border:1px solid rgba(212,175,55,.35);border-radius:20px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.75),0 0 0 1px rgba(212,175,55,.08);animation:updPop .25s ease">
        <div style="height:3px;background:linear-gradient(90deg,transparent,#d4af37 30%,#f6e7a8 50%,#d4af37 70%,transparent)"></div>
        <div style="padding:30px 30px 24px;text-align:center">
          <div style="width:66px;height:66px;margin:0 auto 16px;border-radius:18px;background:linear-gradient(135deg,rgba(212,175,55,.2),rgba(212,175,55,.05));border:1px solid rgba(212,175,55,.45);display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 8px 30px rgba(212,175,55,.15)">⬆️</div>
          <div style="font-family:'Cinzel','Cairo',serif;font-size:20px;font-weight:700;letter-spacing:2px;background:linear-gradient(135deg,#f6e7a8,#d4af37 55%,#a17c1e);-webkit-background-clip:text;-webkit-text-fill-color:transparent">ELDALY STREAM</div>
          <div style="font-size:15.5px;font-weight:800;color:#ece9e1;margin-top:12px">نسخة جديدة ${version ? "(" + version + ")" : ""} جاهزة للتثبيت</div>
          <div style="font-size:12.5px;color:#a6a198;line-height:1.9;margin-top:8px">اختار «حدّث الآن» والبرنامج هيقفل ويرجع يفتح لوحده على النسخة الجديدة،<br>أو خليه يثبّت لوحده أول ما تقفل البرنامج</div>
          <div style="display:flex;gap:10px;margin-top:24px">
            <button id="upd-later" style="flex:1;padding:12px;font-family:Cairo,sans-serif;font-size:12.5px;font-weight:800;border-radius:10px;background:rgba(255,255,255,.03);color:#a6a198;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .15s">بعد ما أقفل البرنامج</button>
            <button id="upd-now" style="flex:1.4;padding:12px;font-family:Cairo,sans-serif;font-size:13px;font-weight:800;border-radius:10px;background:linear-gradient(180deg,#ecca72,#c69c2d);color:#201803;border:none;cursor:pointer;box-shadow:0 3px 16px rgba(212,175,55,.25),inset 0 1px 0 rgba(255,255,255,.3);transition:all .15s">⚡ حدّث الآن</button>
          </div>
        </div>
      </div>
      <style>@keyframes updPop{from{transform:scale(.93);opacity:0}to{transform:scale(1);opacity:1}}</style>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#upd-now").addEventListener("click", () => {
      overlay.querySelector("#upd-now").textContent = "...جاري التحديث";
      try { api.update.installNow(); } catch (e) {}
    });
    overlay.querySelector("#upd-later").addEventListener("click", () => overlay.remove());
  });
}
function escapeAttr(p134) {
  return (p134 || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// عرض مسار الميديا: اللينكات السحابية تظهر كاسم ملف بس (اللينك الكامل ممنوع يظهر للمستخدم)
function mediaDisplayPath(p) {
  if (!p) return "No file selected";
  // اللينكات السحابية مبتظهرش تفاصيلها نهائياً
  if (/^https?:/i.test(String(p))) return "☁ Media from cloud ✓";
  return p;
}

// ===== بداية نظيفة: عند الترقية من نسخة قديمة، البروفايلات والأكشنات
// القديمة بتتصفّر مرة واحدة والعميل يبدأ من جديد — مفيش ترحيل ولا رفع قديم =====
(async () => {
  try {
    if (localStorage.getItem("freshStart2026")) return;
    localStorage.setItem("freshStart2026", "1");
    await api.actions.save([]);
    await api.events.save([]);
    const pr = await api.profiles.list();
    const list = (pr && pr.profiles) || [];
    if (list.length) {
      await api.profiles.switch(list[0].id);
      for (const p of list.slice(1)) {
        try { await api.profiles.delete(p.id); } catch (e) {}
      }
    }
  } catch (e) {}
})();
loadActions();
loadEvents();
loadHotkeys();
loadOverlayUrls();
async function loadOverlayUrls() {
  const getUrlsResult = await api.overlay.getUrls();
  const v141 = document.getElementById("overlay-urls-list");
  if (!v141) {
    return;
  }
  if (tierLimits.overlay === false || !getUrlsResult || getUrlsResult.length === 0) {
    v141.innerHTML = "\n    <div class=\"screen-item\" style=\"background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.25);padding:26px 18px;border-radius:12px;text-align:center;\">\n      <div style=\"font-size:38px;margin-bottom:10px;\">🔒</div>\n      <div style=\"font-weight:800;font-size:16px;color:#ecd28a;margin-bottom:8px;\">شاشات الأوفرلاي والويدجت — باقة مدفوعة</div>\n      <p style=\"font-size:13px;color:var(--text-secondary);line-height:1.8;margin:0 0 16px;\">\n        اشترك في Normal أو Pro أو VIP لتفعيل كل شاشات الأوفرلاي والويدجت في OBS.<br>\n        بعد الدفع، فعّل اشتراكك من شاشة الدخول بالإيميل اللي دفعت بيه.\n      </p>\n      <div style=\"display:flex;gap:10px;justify-content:center;flex-wrap:wrap;\">\n        <button class=\"btn btn-primary btn-sm\" id=\"upgrade-pay-btn\" style=\"width:auto;\">💎 اشترك الآن</button>\n      </div>\n    </div>";
    const v142 = document.getElementById("upgrade-pay-btn");
    if (v142) {
      v142.addEventListener("click", async () => {
        try {
          const getPaymentLinksResult = await api.getPaymentLinks();
          const v144 = getPaymentLinksResult && (getPaymentLinksResult.cardUrl || getPaymentLinksResult.walletUrl || getPaymentLinksResult.patreonUrl) || "";
          if (v144) {
            api.openExternal(v144);
          } else {
            uiAlert("روابط الدفع لم تُضبط بعد — تواصل مع الدعم للاشتراك.");
          }
        } catch (err) {
          uiAlert("تعذر فتح صفحة الدفع — تواصل مع الدعم.");
        }
      });
    }
    return;
  }
  v141.innerHTML = getUrlsResult.map(item => {
    return "\n    <div class=\"screen-item\" style=\"background:rgba(255,255,255,0.05);padding:10px 14px;border-radius:8px;margin-bottom:2px;\">\n      <div style=\"display:flex;align-items:center;gap:10px;margin-bottom:6px;\">\n        <div style=\"font-weight:600;min-width:70px;color:var(--text-primary)\">Screen " + item.screen + "</div>\n        <input type=\"text\" class=\"form-input\" style=\"flex:1;padding:4px 8px;font-size:12px;\" value=\"" + item.url + "\" readonly>\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"navigator.clipboard.writeText('" + item.url + "'); this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy',2000);\">Copy</button>\n      </div>\n    </div>";
  }).join("");
  refreshQueueCounts();
}
async function refreshQueueCounts() {
  try {
    const getQueueStatusResult = await api.screen.getQueueStatus();
    for (const [v146, v147] of Object.entries(getQueueStatusResult)) {
      const v148 = document.getElementById("sq-count-" + v146);
      if (v148) {
        v148.textContent = v147.length + " queued";
      }
    }
  } catch (err) {}
}
api.screen.onQueueUpdate(p136 => {
  for (const [v149, v150] of Object.entries(p136)) {
    const v151 = document.getElementById("sq-count-" + v149);
    if (v151) {
      v151.textContent = v150.length + " queued";
    }
  }
});
window.executeDelayed = p137 => {
  api.actions.executeDelayed(p137, 5);
  addFeedItem("system", "Timer", "Action will execute in 5 seconds...", "⏱");
};
window.duplicateAction = async p138 => {
  const duplicateResult = await api.actions.duplicate(p138);
  if (duplicateResult) {
    actionsData = duplicateResult;
    renderActions();
    addFeedItem("system", "System", "Action duplicated", "📋");
  }
};
let selectedTags = {
  all: [],
  random: []
};
function initTagSelector(p139, p140) {
  selectedTags[p139] = [...p140];
  renderTags(p139);
}
window.openTagDropdown = p141 => {
  const v153 = document.getElementById("td-" + p141);
  if (v153.style.display !== "none") {
    v153.style.display = "none";
    return;
  }
  const v154 = actionsData.filter(item => !selectedTags[p141].includes(item.id));
  const vF7 = (p143 = "") => {
    const v155 = v154.filter(item => item.name.toLowerCase().includes(p143.toLowerCase()));
    return v155.map(item => "<div class=\"tag-dd-item\" onclick=\"addTag('" + p141 + "','" + item.id + "')\">" + escapeHtml(item.name) + "</div>").join("") || "<div class=\"tag-dd-item\" style=\"color:var(--text-muted)\">No actions available</div>";
  };
  window.filterTagDropdown = (p146, p147) => {
    const v156 = document.getElementById("tag-container-" + p146);
    if (v156) {
      v156.innerHTML = vF7(p147);
    }
  };
  v153.innerHTML = "\n    <div style=\"padding: 6px;\">\n      <input type=\"text\" id=\"tag-search-" + p141 + "\" placeholder=\"Search actions...\" style=\"width:100%; padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:var(--bg-tertiary); color:#fff; outline:none; font-family:inherit;\" onkeyup=\"window.filterTagDropdown('" + p141 + "', this.value)\" onclick=\"event.stopPropagation()\">\n    </div>\n    <div id=\"tag-container-" + p141 + "\" style=\"max-height:220px; overflow-y:auto;\">\n      " + vF7() + "\n    </div>\n  ";
  v153.style.display = "block";
  setTimeout(() => {
    const v157 = document.getElementById("tag-search-" + p141);
    if (v157) {
      v157.focus();
    }
  }, 50);
};
window.addTag = (p148, p149) => {
  if (!selectedTags[p148].includes(p149)) {
    selectedTags[p148].push(p149);
  }
  document.getElementById("td-" + p148).style.display = "none";
  renderTags(p148);
};
window.removeTag = (p150, p151) => {
  selectedTags[p150] = selectedTags[p150].filter(item => item !== p151);
  renderTags(p150);
};
function renderTags(p153) {
  const v158 = document.getElementById("tl-" + p153);
  const v159 = document.getElementById("ts-" + p153 + "-ph");
  if (selectedTags[p153].length === 0) {
    v158.innerHTML = "";
    if (v159) {
      v159.style.display = "inline";
    }
    return;
  }
  if (v159) {
    v159.style.display = "none";
  }
  v158.innerHTML = selectedTags[p153].map(item => {
    const v160 = actionsData.find(item => item.id === item);
    return "<span class=\"tag-chip\">" + escapeHtml(v160?.name || item) + " <span class=\"tag-x\" onclick=\"removeTag('" + p153 + "','" + item + "')\">&times;</span></span>";
  }).join("");
}
let giftBatchSize = 15;
let giftRendered = 0;
let giftFiltered = [];
window.toggleGiftPicker = async () => {
  const v161 = document.getElementById("gift-picker-dropdown");
  if (v161.style.display === "none") {
    v161.style.display = "block";
    if (isConnected) {
      await refreshLiveGifts();
    }
    giftFiltered = [...giftCatalog].sort((a, b) => a.coins - b.coins);
    giftRendered = 0;
    document.getElementById("gift-picker-list").innerHTML = "";
    renderGiftBatch();
    document.getElementById("gift-search").value = "";
    document.getElementById("gift-search").focus();
  } else {
    v161.style.display = "none";
  }
};
function renderGiftBatch() {
  const v162 = document.getElementById("gift-picker-list");
  const v163 = giftFiltered.slice(giftRendered, giftRendered + giftBatchSize);
  v163.forEach(item => {
    const divEl14 = document.createElement("div");
    divEl14.className = "gift-item";
    divEl14.onclick = () => selectGift(item);
    const v165 = item.img ? "<img class=\"gift-img\" src=\"" + item.img + "\" alt=\"" + item.name + "\" onerror=\"this.textContent='🎁';this.style.fontSize='28px'\">" : "<span class=\"gift-emoji\">" + (item.emoji || "🎁") + "</span>";
    divEl14.innerHTML = v165 + "<div class=\"gift-info\"><span class=\"gift-name\">" + escapeHtml(item.name) + "</span><span class=\"gift-coins\">" + item.coins + " Coins</span></div>";
    v162.appendChild(divEl14);
  });
  giftRendered += v163.length;
  if (giftRendered < giftFiltered.length) {
    let v166 = v162.querySelector(".gift-loader");
    if (!v166) {
      v166 = document.createElement("div");
      v166.className = "gift-loader";
      v166.textContent = "Scroll for more...";
      v162.appendChild(v166);
    }
  } else {
    const v167 = v162.querySelector(".gift-loader");
    if (v167) {
      v167.remove();
    }
  }
}
document.addEventListener("scroll", event => {
  const v168 = document.getElementById("gift-picker-list");
  if (!v168) {
    return;
  }
  if (event.target === v168 || v168.contains(event.target)) {
    if (v168.scrollTop + v168.clientHeight >= v168.scrollHeight - 40) {
      renderGiftBatch();
    }
  }
}, true);
function selectGift(p160) {
  document.getElementById("m-gift").value = p160.name;
  document.getElementById("m-gift-coins").value = p160.coins || "";
  document.getElementById("m-gift-id").value = p160.id || "";
  const v169 = p160.img ? "<img class=\"gift-img-sm\" src=\"" + p160.img + "\" style=\"width:18px;height:18px;vertical-align:middle\">" : p160.emoji || "🎁";
  document.getElementById("gift-picker-label").innerHTML = v169 + " " + p160.name + " (" + p160.coins + " coins)";
  document.getElementById("gift-picker-dropdown").style.display = "none";
}
window.filterGifts = p161 => {
  const v170 = p161.trim().toLowerCase();
  giftFiltered = giftCatalog.filter(item => {
    if (item.name.toLowerCase().includes(v170)) {
      return true;
    }
    if (String(item.coins) === v170 || String(item.diamond_count) === v170) {
      return true;
    }
    return false;
  }).sort((a, b) => (a.coins || a.diamond_count || 0) - (b.coins || b.diamond_count || 0));
  giftRendered = 0;
  document.getElementById("gift-picker-list").innerHTML = "";
  renderGiftBatch();
};
window.openKeystrokeConfig = () => {
  const v171 = document.getElementById("m-keys")?.value || "";
  const parts = v171.split("+");
  const v173 = parts.includes("ctrl");
  const v174 = parts.includes("alt");
  const v175 = parts.includes("shift");
  const joined4 = parts.filter(item => !["ctrl", "alt", "shift"].includes(item)).join("");
  const divEl15 = document.createElement("div");
  divEl15.className = "ks-overlay";
  divEl15.innerHTML = "\n  <div class=\"ks-popup glass-card\">\n    <div class=\"ks-header\"><h3>Keystroke Configurator</h3><button class=\"modal-close\" id=\"ks-close\">&times;</button></div>\n    <div class=\"ks-modifiers\">\n      <label class=\"ks-mod\"><input type=\"checkbox\" id=\"ks-ctrl\" " + (v173 ? "checked" : "") + "> CTRL</label>\n      <label class=\"ks-mod\"><input type=\"checkbox\" id=\"ks-alt\" " + (v174 ? "checked" : "") + "> ALT</label>\n      <label class=\"ks-mod\"><input type=\"checkbox\" id=\"ks-shift\" " + (v175 ? "checked" : "") + "> SHIFT</label>\n    </div>\n    <label class=\"form-label\">Keys, letters or numbers to be pressed in sequence:</label>\n    <textarea class=\"form-input ks-textarea\" id=\"ks-text\" rows=\"3\" placeholder=\"Type keys here...\">" + joined4 + "</textarea>\n    <p class=\"ks-params\"><b>Placeholders:</b> {username} {nickname} {giftname} {repeatcount} {coins} {likecount} {totallikecount} {comment} {submonth}</p>\n    <div class=\"ks-buttons\">\n      <button class=\"ks-btn\" onclick=\"ksAdd('[Left Mouse Click]')\">Left Mouse Click</button>\n      <button class=\"ks-btn\" onclick=\"ksAdd('[Right Mouse Click]')\">Right Mouse Click</button>\n    </div>\n    <div class=\"ks-grid\">\n      " + ["ENTER", "SPACE", "ESC", "TAB", "BACKSPACE", "BREAK", "CAPS LOCK", "DELETE", "UP", "RIGHT", "DOWN", "LEFT", "HOME", "END", "INSERT", "PAGEUP", "PAGEDOWN", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].map(item => "<button class=\"ks-key\" onclick=\"ksAdd('[" + item + "]')\">" + item + "</button>").join("") + "\n    </div>\n    <div class=\"ks-footer\">\n      <button class=\"btn btn-primary\" id=\"ks-save\">✓ Save</button>\n      <button class=\"btn btn-ghost\" id=\"ks-cancel\">✕ Cancel</button>\n    </div>\n  </div>";
  document.body.appendChild(divEl15);
  document.getElementById("ks-close").onclick = () => divEl15.remove();
  document.getElementById("ks-cancel").onclick = () => divEl15.remove();
  divEl15.addEventListener("click", event => {
    if (event.target === divEl15) {
      divEl15.remove();
    }
  });
  document.getElementById("ks-save").onclick = () => {
    const vA4 = [];
    if (document.getElementById("ks-ctrl").checked) {
      vA4.push("ctrl");
    }
    if (document.getElementById("ks-alt").checked) {
      vA4.push("alt");
    }
    if (document.getElementById("ks-shift").checked) {
      vA4.push("shift");
    }
    const v178 = document.getElementById("ks-text").value.trim();
    const joined5 = [...vA4, v178].filter(Boolean).join("+");
    document.getElementById("m-keys").value = joined5;
    document.getElementById("m-keys-preview").textContent = joined5 ? "🔑 " + joined5 : "No keystroke configured";
    divEl15.remove();
  };
};
window.ksAdd = p168 => {
  const v180 = document.getElementById("ks-text");
  if (v180) {
    v180.value += (v180.value ? " " : "") + p168;
    v180.focus();
  }
};
let currentProfiles = [];
let activeProfileId = "";
function showInputDialog(p169, p170 = "") {
  return new Promise(p171 => {
    const divEl16 = document.createElement("div");
    divEl16.className = "ks-overlay";
    divEl16.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:400px\">\n      <div class=\"ks-header\"><h3>" + p169 + "</h3><button class=\"modal-close\" id=\"inp-close\">&times;</button></div>\n      <input type=\"text\" class=\"form-input\" id=\"inp-value\" value=\"" + escapeAttr(p170) + "\" autofocus style=\"margin-bottom:16px\">\n      <div class=\"ks-footer\">\n        <button class=\"btn btn-primary\" id=\"inp-ok\">✓ OK</button>\n        <button class=\"btn btn-ghost\" id=\"inp-cancel\">Cancel</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl16);
    const v182 = document.getElementById("inp-value");
    v182.focus();
    v182.select();
    const vF8 = p172 => {
      divEl16.remove();
      p171(p172);
    };
    document.getElementById("inp-ok").onclick = () => vF8(v182.value.trim());
    document.getElementById("inp-cancel").onclick = () => vF8(null);
    document.getElementById("inp-close").onclick = () => vF8(null);
    divEl16.addEventListener("click", event => {
      if (event.target === divEl16) {
        vF8(null);
      }
    });
    v182.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        vF8(v182.value.trim());
      }
      if (event.key === "Escape") {
        vF8(null);
      }
    });
  });
}
function showGiftPickerDialog() {
  return new Promise(p175 => {
    if (!giftCatalog || giftCatalog.length === 0) {
      showInputDialog("Gift Name", "").then(result => {
        if (result) {
          p175({
            name: result,
            img: ""
          });
        } else {
          p175(null);
        }
      });
      return;
    }
    const divEl17 = document.createElement("div");
    divEl17.className = "ks-overlay";
    divEl17.style.zIndex = "10010";
    const v184 = [...giftCatalog].sort((a, b) => (a.coins || 0) - (b.coins || 0));
    divEl17.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:600px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;\">\n      <div class=\"ks-header\"><h3>🎁 Choose a Gift</h3><button class=\"modal-close\" id=\"gp-close\">&times;</button></div>\n      <input type=\"text\" class=\"form-input\" id=\"gp-search\" placeholder=\"Search by name or coin value...\" style=\"margin:12px 16px 8px;flex-shrink:0;\">\n      <div id=\"gp-grid\" style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;padding:8px 16px 16px;overflow-y:auto;flex:1;\">\n        " + v184.map(item => "\n          <div class=\"gp-item\" data-name=\"" + escapeAttr(item.name) + "\" data-img=\"" + escapeAttr(item.img || "") + "\" data-coins=\"" + (item.coins || 0) + "\" style=\"display:flex;flex-direction:column;align-items:center;padding:8px;border-radius:8px;background:rgba(255,255,255,.05);cursor:pointer;transition:background .2s;\">\n            <img src=\"" + (item.img || "") + "\" style=\"width:48px;height:48px;object-fit:contain;\" onerror=\"this.style.display='none'\">\n            <span style=\"font-size:10px;margin-top:4px;text-align:center;color:var(--text-secondary);line-height:1.2;word-break:break-word;\">" + escapeHtml(item.name) + "</span>\n            " + (item.coins ? "<span style=\"font-size:9px;color:#ffd64d;margin-top:2px;\">" + item.coins + "💰</span>" : "") + "\n          </div>").join("") + "\n      </div>\n    </div>";
    document.body.appendChild(divEl17);
    const vF9 = p180 => {
      divEl17.remove();
      p175(p180);
    };
    document.getElementById("gp-close").onclick = () => vF9(null);
    divEl17.addEventListener("click", event => {
      if (event.target === divEl17) {
        vF9(null);
      }
    });
    divEl17.querySelectorAll(".gp-item").forEach(item => {
      item.addEventListener("mouseenter", () => item.style.background = "rgba(139,92,246,.25)");
      item.addEventListener("mouseleave", () => item.style.background = "rgba(255,255,255,.05)");
      item.onclick = () => vF9({
        name: item.dataset.name,
        img: item.dataset.img,
        coins: parseInt(item.dataset.coins) || 0
      });
    });
    document.getElementById("gp-search").oninput = p183 => {
      const v185 = p183.target.value.trim().toLowerCase();
      const v186 = v185.length > 0 ? parseInt(v185) : NaN;
      divEl17.querySelectorAll(".gp-item").forEach(item => {
        const v187 = item.dataset.name.toLowerCase().includes(v185);
        const v188 = !isNaN(v186) && parseInt(item.dataset.coins) === v186;
        item.style.display = v187 || v188 ? "" : "none";
      });
    };
    document.getElementById("gp-search").focus();
  });
}
async function loadProfiles() {
  try {
    const listResult = await api.profiles.list();
    currentProfiles = listResult.profiles || [];
    activeProfileId = listResult.activeId || "";
    renderProfilesList();
    loadHotkeys();
  } catch (err) {
    console.error("loadProfiles error:", err);
  }
}
function renderProfilesList() {
  const v190 = document.getElementById("profiles-list");
  if (!v190) {
    return;
  }
  if (currentProfiles.length === 0) {
    v190.innerHTML = "<div style=\"color:var(--text-muted);padding:12px;text-align:center\">No profiles yet</div>";
    return;
  }
  v190.innerHTML = currentProfiles.map(item => {
    const v191 = item.id === activeProfileId;
    return "<div class=\"profile-item " + (v191 ? "active" : "") + "\">\n      <div class=\"profile-item-left\" onclick=\"switchProfile('" + item.id + "')\">\n        <span class=\"profile-item-dot " + (v191 ? "active" : "") + "\"></span>\n        <span class=\"profile-item-name\">" + escapeHtml(item.name) + "</span>\n        " + (v191 ? "<span class=\"profile-item-badge\">ACTIVE</span>" : "") + "\n      </div>\n      <div class=\"profile-item-actions\">\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"event.stopPropagation(); renameProfile('" + item.id + "')\" title=\"Rename\">✏️</button>\n        <button class=\"btn btn-ghost btn-sm\" onclick=\"event.stopPropagation(); dupProfile('" + item.id + "')\" title=\"Duplicate\">Copy</button>\n        <button class=\"btn btn-danger btn-sm\" onclick=\"event.stopPropagation(); delProfile('" + item.id + "')\" title=\"Delete\">Del</button>\n      </div>\n    </div>";
  }).join("");
}
window.switchProfile = async p186 => {
  if (p186 === activeProfileId) {
    return;
  }
  const switchResult = await api.profiles.switch(p186);
  activeProfileId = p186;
  actionsData = switchResult.actions || [];
  eventsData = switchResult.events || [];
  renderActions();
  renderEvents();
  renderProfilesList();
  updateProfileStats();
  loadHotkeys();
  const v193 = currentProfiles.find(item => item.id === p186);
  addFeedItem("system", "Profile", "Switched to: " + (v193?.name || p186), "🔄");
};
window.renameProfile = async p188 => {
  const v194 = currentProfiles.find(item => item.id === p188);
  const v195 = await showInputDialog("Rename Profile", v194?.name || "");
  if (!v195) {
    return;
  }
  currentProfiles = await api.profiles.rename(p188, v195);
  renderProfilesList();
  addFeedItem("system", "Profile", "Profile renamed to: " + v195, "✏️");
};
window.dupProfile = async p190 => {
  const v196 = tierLimits.profiles;
  if (currentProfiles.length >= v196) {
    uiAlert("باقتك (" + tierLimits.label + ") تسمح بـ " + (v196 === 9999 ? "عدد غير محدود من" : v196) + " بروفايل كحد أقصى.");
    return;
  }
  const v197 = currentProfiles.find(item => item.id === p190);
  const v198 = await showInputDialog("Duplicate Profile — Enter name", (v197?.name || "") + " (Copy)");
  if (!v198) {
    return;
  }
  const duplicateResult2 = await api.profiles.duplicate(p190, v198);
  if (duplicateResult2 && duplicateResult2.ok === false) {
    if (duplicateResult2.reason === "limit") {
      uiAlert("باقتك (" + tierLimits.label + ") تسمح بـ " + duplicateResult2.limit + " بروفايل كحد أقصى. يرجى الترقية!");
    } else {
      uiAlert("تعذر عمل نسخة من البروفايل" + (duplicateResult2.error ? " — " + duplicateResult2.error : duplicateResult2.reason ? " (" + duplicateResult2.reason + ")" : " — حاول تاني"));
    }
    return;
  }
  currentProfiles = duplicateResult2.profiles;
  renderProfilesList();
  addFeedItem("system", "Profile", "Profile duplicated: " + v198, "📋");
};
window.delProfile = async p192 => {
  const v200 = currentProfiles.find(item => item.id === p192);
  if (currentProfiles.length <= 1) {
    uiAlert("Cannot delete the last profile!");
    return;
  }
  if (!(await uiConfirm("Delete profile \"" + v200?.name + "\"?\nAll its actions and events will be lost!"))) {
    return;
  }
  const deleteResult = await api.profiles.delete(p192);
  if (deleteResult.error) {
    uiAlert(deleteResult.error);
    return;
  }
  currentProfiles = deleteResult.profiles;
  activeProfileId = deleteResult.activeId;
  actionsData = (await api.actions.getAll()) || [];
  eventsData = (await api.events.getAll()) || [];
  renderActions();
  renderEvents();
  renderProfilesList();
  updateProfileStats();
  addFeedItem("system", "Profile", "Profile deleted", "🗑️");
};
window.createNewProfile = async () => {
  const v202 = tierLimits.profiles;
  if (currentProfiles.length >= v202) {
    uiAlert("باقتك (" + tierLimits.label + ") تسمح بـ " + (v202 === 9999 ? "عدد غير محدود من" : v202) + " بروفايل كحد أقصى.");
    return;
  }
  const v203 = await showInputDialog("Create New Profile");
  if (!v203) {
    return;
  }
  const createResult = await api.profiles.create(v203);
  if (createResult && createResult.ok === false) {
    uiAlert("باقتك (" + tierLimits.label + ") تسمح بـ " + createResult.limit + " بروفايل كحد أقصى. يرجى الترقية!");
    return;
  }
  currentProfiles = createResult.profiles;
  renderProfilesList();
  addFeedItem("system", "Profile", "Profile created: " + v203, "➕");
};
document.getElementById("btn-create-profile")?.addEventListener("click", () => window.createNewProfile());
function updateProfileStats() {
  const v205 = document.getElementById("profile-actions-count");
  const v206 = document.getElementById("profile-events-count");
  const v207 = document.getElementById("profile-gifts-count");
  if (v205) {
    v205.textContent = actionsData.length;
  }
  if (v206) {
    v206.textContent = eventsData.length;
  }
  if (v207) {
    v207.textContent = giftCatalog.length;
  }
  const v208 = document.getElementById("profile-name");
  const v209 = document.getElementById("profile-status");
  if (isConnected && v208) {
    v208.textContent = "@" + (document.getElementById("username-input")?.value || "User");
    if (v209) {
      v209.textContent = "🟢 Connected";
      v209.style.color = "var(--accent-green)";
    }
  }
}
document.getElementById("nav-profile")?.addEventListener("click", () => {
  loadProfiles();
  updateProfileStats();
});
loadProfiles();

document.getElementById("btn-reset-actions")?.addEventListener("click", async () => {
  if (!(await uiConfirm("Are you sure you want to delete all actions? This cannot be undone!"))) {
    return;
  }
  await api.profile.resetActions();
  actionsData = [];
  renderActions();
  updateProfileStats();
  addFeedItem("system", "Profile", "All actions have been reset", "⚠️");
});
document.getElementById("btn-reset-events")?.addEventListener("click", async () => {
  if (!(await uiConfirm("Are you sure you want to delete all events? This cannot be undone!"))) {
    return;
  }
  await api.profile.resetEvents();
  eventsData = [];
  renderEvents();
  updateProfileStats();
  addFeedItem("system", "Profile", "All events have been reset", "⚠️");
});
document.getElementById("btn-reset-all")?.addEventListener("click", async () => {
  if (!(await uiConfirm("⚠️ WARNING: This will delete ALL your data (actions, events, gifts cache, connection). Are you absolutely sure?"))) {
    return;
  }
  await api.profile.resetAll();
  actionsData = [];
  eventsData = [];
  giftCatalog = [];
  renderActions();
  renderEvents();
  updateProfileStats();
  document.getElementById("profile-name").textContent = "Not Connected";
  document.getElementById("profile-status").textContent = "Connect to TikTok to see your profile";
  addFeedItem("system", "Profile", "All data has been reset", "🗑️");
});
async function applyWidgetConfig(p194, p195) {
  const v214 = document.getElementById("w-" + p194 + "-apply");
  if (!v214) {
    return;
  }
  const v215 = v214.textContent;
  v214.textContent = "Applying...";
  const v216 = document.getElementById("w-" + p194 + "-target");
  const vO5 = {
    title: document.getElementById("w-" + p194 + "-title")?.value || "",
    c1: document.getElementById("w-" + p194 + "-c1")?.value || "#000000",
    c2: document.getElementById("w-" + p194 + "-c2")?.value || "#ffffff",
    style: document.getElementById("w-" + p194 + "-style")?.value || "style-1",
    action: document.getElementById("w-" + p194 + "-action")?.value || "",
    behavior: document.getElementById("w-" + p194 + "-behavior")?.value || "none"
  };
  if (v216) {
    vO5.goal = v216.value;
  }
  await api.widget.setConfig(p195, vO5);
  v214.textContent = "Applied!";
  setTimeout(() => v214.textContent = v215, 2000);
}
document.getElementById("w-likes-apply")?.addEventListener("click", () => applyWidgetConfig("likes", "likes-goal"));
document.getElementById("w-follows-apply")?.addEventListener("click", () => applyWidgetConfig("follows", "follows-goal"));
document.getElementById("w-top-gifter-apply")?.addEventListener("click", () => applyWidgetConfig("top-gifter", "top-gifter"));
document.getElementById("w-top-liker-apply")?.addEventListener("click", () => applyWidgetConfig("top-liker", "top-liker"));
document.getElementById("w-last-follower-apply")?.addEventListener("click", () => applyWidgetConfig("last-follower", "last-follower"));
document.getElementById("w-last-gift-apply")?.addEventListener("click", () => applyWidgetConfig("last-gift", "last-gift"));
let heartGoalImg = "";
document.getElementById("w-heart-goaltype")?.addEventListener("change", p196 => {
  document.getElementById("w-heart-gift-group").style.display = p196.target.value === "gift" ? "block" : "none";
});
document.getElementById("w-heart-upload-img")?.addEventListener("click", async () => {
  const openFileResult2 = await api.dialog.openFile({
    filters: [{
      name: "Image",
      extensions: ["png", "jpg", "jpeg", "webp"]
    }]
  });
  if (openFileResult2) {
    const el2 = document.getElementById("w-heart-img-path");
    const finalPath2 = await window.__cloudUpload(openFileResult2, "w-heart-img-path", (pct) => {
      if (el2) el2.textContent = "⬆ رفع للسحابة: " + pct + "%";
    });
    heartGoalImg = finalPath2;
    if (el2) el2.textContent = finalPath2;
    heartLivePreview();
  }
});
function buildHeartConfig() {
  const v218 = document.getElementById("w-heart-goaltype").value;
  return {
    goal: document.getElementById("w-heart-target").value,
    title: document.getElementById("w-heart-title").value,
    goalType: v218,
    giftName: v218 === "gift" ? document.getElementById("w-heart-giftname").value : "",
    image: heartGoalImg || "",
    imageSize: parseInt(document.getElementById("w-heart-img-size").value) || 250,
    imageScale: parseFloat(document.getElementById("w-heart-img-scale").value) || 1,
    counterStyle: document.getElementById("w-heart-counter-style").value || "classic",
    titleY: parseInt(document.getElementById("w-heart-title-y").value) || 0,
    counterY: parseInt(document.getElementById("w-heart-counter-y").value) || 0
  };
}
let heartLiveTimer = null;
function heartLivePreview() {
  clearTimeout(heartLiveTimer);
  heartLiveTimer = setTimeout(async () => {
    const vBuildHeartConfig = buildHeartConfig();
    await api.widget.setConfig("heart-goal", vBuildHeartConfig);
        document.getElementById("w-heart-url").value = widgetUrl("goal-heart", "type=" + vBuildHeartConfig.goalType + "&id=heart-goal");
  }, 150);
}
document.querySelectorAll("#w-heart-target, #w-heart-title, #w-heart-goaltype, #w-heart-giftname, #w-heart-img-size, #w-heart-img-scale, #w-heart-counter-style, #w-heart-title-y, #w-heart-counter-y").forEach(item => {
  item?.addEventListener("input", heartLivePreview);
  item?.addEventListener("change", heartLivePreview);
});
document.getElementById("w-heart-apply")?.addEventListener("click", async () => {
  const v219 = document.getElementById("w-heart-apply");
  const v220 = v219.textContent;
  v219.textContent = "Applying...";
  await api.widget.setConfig("heart-goal", buildHeartConfig());
  v219.textContent = "Applied!";
  setTimeout(() => v219.textContent = v220, 2000);
});
document.getElementById("w-heart-test")?.addEventListener("click", async () => {
  const v221 = parseInt(document.getElementById("w-heart-test-value").value) || 10;
  await api.ext.command("heart-goal", "test", {
    value: v221
  });
});
document.getElementById("w-heart-reset")?.addEventListener("click", async () => {
  await api.ext.command("heart-goal", "reset", {});
});
document.getElementById("w-giftgoal-apply")?.addEventListener("click", async () => {
  const v222 = document.getElementById("w-giftgoal-apply");
  const v223 = v222.textContent;
  v222.textContent = "Applying...";
  const vO6 = {
    goal: document.getElementById("w-giftgoal-target").value,
    title: document.getElementById("w-giftgoal-title").value,
    c1: document.getElementById("w-giftgoal-c1").value,
    c2: document.getElementById("w-giftgoal-c2").value,
    style: document.getElementById("w-giftgoal-style").value,
    goalType: "gift",
    giftName: document.getElementById("w-giftgoal-giftname").value
  };
  await api.widget.setConfig("gift-goal", vO6);
  v222.textContent = "Applied!";
  setTimeout(() => v222.textContent = v223, 2000);
});
function hexToRgb(p198) {
  const vParseInt = parseInt(p198.slice(1, 3), 16);
  const vParseInt2 = parseInt(p198.slice(3, 5), 16);
  const vParseInt3 = parseInt(p198.slice(5, 7), 16);
  return {
    r: vParseInt,
    g: vParseInt2,
    b: vParseInt3
  };
}
document.getElementById("w-lheart-goaltype")?.addEventListener("change", p199 => {
  document.getElementById("w-lheart-gift-group").style.display = p199.target.value === "gift" ? "block" : "none";
});
document.getElementById("w-lheart-apply")?.addEventListener("click", async () => {
  const v224 = document.getElementById("w-lheart-apply");
  const v225 = v224.textContent;
  v224.textContent = "Applying...";
  const vHexToRgb = hexToRgb(document.getElementById("w-lheart-color").value);
  const v226 = document.getElementById("w-lheart-goaltype").value;
  const vO7 = {
    goal: document.getElementById("w-lheart-target").value,
    title: document.getElementById("w-lheart-title").value,
    goalType: v226,
    giftName: v226 === "gift" ? document.getElementById("w-lheart-giftname").value : "",
    accentR: vHexToRgb.r,
    accentG: vHexToRgb.g,
    accentB: vHexToRgb.b,
    waveSpeed: document.getElementById("w-lheart-waveSpeed").value,
    starSpeed: document.getElementById("w-lheart-starSpeed").value,
    starSize: document.getElementById("w-lheart-starSize").value,
    labelTop: document.getElementById("w-lheart-labelTop").value,
    counterBottom: document.getElementById("w-lheart-counterBottom").value,
    labelSize: document.getElementById("w-lheart-labelSize").value,
    counterSize: document.getElementById("w-lheart-counterSize").value
  };
  await api.widget.setConfig("liquid-heart-goal", vO7);
          document.getElementById("w-lheart-url").value = widgetUrl("goal-liquid-heart", "type=" + v226 + "&id=liquid-heart-goal");
  v224.textContent = "Applied!";
  setTimeout(() => v224.textContent = v225, 2000);
});
document.getElementById("w-lheart-test")?.addEventListener("click", async () => {
  const v227 = parseInt(document.getElementById("w-lheart-test-value").value) || 10;
  await api.ext.command("liquid-heart-goal", "test", {
    value: v227
  });
});
document.getElementById("w-lheart-reset")?.addEventListener("click", async () => {
  await api.ext.command("liquid-heart-goal", "reset", {});
});
document.getElementById("w-tiktok-goaltype")?.addEventListener("change", p200 => {
  const v228 = document.getElementById("w-tiktok-gift-group");
  if (v228) {
    v228.style.display = p200.target.value === "gift" ? "block" : "none";
  }
});
document.getElementById("w-tiktok-apply")?.addEventListener("click", async () => {
  const v229 = document.getElementById("w-tiktok-apply");
  const v230 = v229.textContent;
  v229.textContent = "Applying...";
  const v231 = document.getElementById("w-tiktok-goaltype").value;
  const vO8 = {
    goal: document.getElementById("w-tiktok-target").value,
    title: document.getElementById("w-tiktok-title").value,
    goalType: v231,
    giftName: v231 === "gift" ? document.getElementById("w-tiktok-giftname").value : "",
    waveSpeed: document.getElementById("w-tiktok-waveSpeed").value,
    bubbleSpeed: document.getElementById("w-tiktok-bubbleSpeed").value,
    bubbleSize: document.getElementById("w-tiktok-bubbleSize").value,
    titleMargin: document.getElementById("w-tiktok-titleMargin").value,
    counterMargin: document.getElementById("w-tiktok-counterMargin").value,
    titleSize: document.getElementById("w-tiktok-titleSize").value,
    counterSize: document.getElementById("w-tiktok-counterSize").value
  };
  await api.widget.setConfig("tiktok-goal", vO8);
          document.getElementById("w-tiktok-url").value = widgetUrl("goal-tiktok", "type=" + v231 + "&id=tiktok-goal");
  v229.textContent = "Applied!";
  setTimeout(() => v229.textContent = v230, 2000);
});
document.getElementById("w-tiktok-test")?.addEventListener("click", async () => {
  const v232 = parseInt(document.getElementById("w-tiktok-test-value").value) || 10;
  await api.ext.command("tiktok-goal", "test", {
    value: v232
  });
});
document.getElementById("w-tiktok-reset")?.addEventListener("click", async () => {
  await api.ext.command("tiktok-goal", "reset", {});
});
document.getElementById("w-lastliker-apply")?.addEventListener("click", async () => {
  const v233 = document.getElementById("w-lastliker-apply");
  const v234 = v233.textContent;
  v233.textContent = "Applying...";
  const vO9 = {
    message: document.getElementById("w-lastliker-message").value,
    showDuration: parseInt(document.getElementById("w-lastliker-duration").value) || 5000,
    frequency: parseInt(document.getElementById("w-lastliker-frequency").value) || 1
  };
  await api.widget.setConfig("last-liker-alert", vO9);
  v233.textContent = "Applied!";
  setTimeout(() => v233.textContent = v234, 2000);
});
document.getElementById("w-lastliker-test")?.addEventListener("click", async () => {
  await api.widget.test("last-liker-alert");
});
document.getElementById("w-newfollower-apply")?.addEventListener("click", async () => {
  const v235 = document.getElementById("w-newfollower-apply");
  const v236 = v235.textContent;
  v235.textContent = "Applying...";
  const vO10 = {
    message: document.getElementById("w-newfollower-message").value,
    showDuration: parseInt(document.getElementById("w-newfollower-duration").value) || 6000
  };
  await api.widget.setConfig("new-follower-alert", vO10);
  v235.textContent = "Applied!";
  setTimeout(() => v235.textContent = v236, 2000);
});
document.getElementById("w-newfollower-test")?.addEventListener("click", async () => {
  await api.widget.test("new-follower-alert");
});
let waterImagePath = "";
document.getElementById("w-waterimg-goaltype")?.addEventListener("change", p201 => {
  document.getElementById("w-waterimg-gift-group").style.display = p201.target.value === "gift" ? "block" : "none";
});
document.getElementById("w-waterimg-browse")?.addEventListener("click", async () => {
  const openFileResult3 = await api.dialog.openFile({
    filters: [{
      name: "Images",
      extensions: ["png", "webp", "svg"]
    }]
  });
  if (openFileResult3) {
    const btn3 = document.getElementById("w-waterimg-browse");
    if (btn3) btn3.textContent = "⬆ جاري الرفع...";
    const finalPath3 = await window.__cloudUpload(openFileResult3, "w-waterimg-browse");
    waterImagePath = finalPath3;
    if (btn3) btn3.textContent = "✅ " + finalPath3.split(/[/\\]/).pop().slice(0, 60);
  }
});
document.getElementById("w-waterimg-apply")?.addEventListener("click", async () => {
  const v238 = document.getElementById("w-waterimg-apply");
  const v239 = v238.textContent;
  v238.textContent = "Applying...";
  const v240 = document.getElementById("w-waterimg-goaltype").value;
  const vO11 = {
    goal: document.getElementById("w-waterimg-target").value,
    title: document.getElementById("w-waterimg-title").value,
    goalType: v240,
    giftName: v240 === "gift" ? document.getElementById("w-waterimg-giftname").value : "",
    liquidColor: document.getElementById("w-waterimg-color").value,
    imageUrl: waterImagePath || "",
    waveSpeed: document.getElementById("w-waterimg-waveSpeed").value,
    particleSpeed: document.getElementById("w-waterimg-particleSpeed").value,
    particleSize: document.getElementById("w-waterimg-particleSize").value,
    particleCount: document.getElementById("w-waterimg-particleCount").value,
    counterTop: document.getElementById("w-waterimg-counterTop").value,
    titleMargin: document.getElementById("w-waterimg-titleMargin").value,
    counterSize: document.getElementById("w-waterimg-counterSize").value,
    titleSize: document.getElementById("w-waterimg-titleSize").value
  };
  await api.widget.setConfig("water-image-goal", vO11);
          document.getElementById("w-waterimg-url").value = widgetUrl("goal-water-image", "type=" + v240 + "&id=water-image-goal");
  v238.textContent = "Applied!";
  setTimeout(() => v238.textContent = v239, 2000);
});
document.getElementById("w-waterimg-test")?.addEventListener("click", async () => {
  const v241 = parseInt(document.getElementById("w-waterimg-test-value").value) || 10;
  await api.ext.command("water-image-goal", "test", {
    value: v241
  });
});
document.getElementById("w-waterimg-reset")?.addEventListener("click", async () => {
  await api.ext.command("water-image-goal", "reset", {});
});
async function loadWidgetConfigs() {
  const vA5 = [{
    prefix: "likes",
    id: "likes-goal",
    def: {
      target: 1000,
      title: "Likes Goal",
      c1: "#00d2ff",
      c2: "#3a7bd5"
    }
  }, {
    prefix: "follows",
    id: "follows-goal",
    def: {
      target: 100,
      title: "New Followers",
      c1: "#ff2d55",
      c2: "#a855f7"
    }
  }, {
    prefix: "top-gifter",
    id: "top-gifter",
    def: {
      title: "Top Gifter",
      c1: "#ffd700",
      c2: "#ff8c00"
    }
  }, {
    prefix: "top-liker",
    id: "top-liker",
    def: {
      title: "Top Liker",
      c1: "#ff2d55",
      c2: "#ff8c00"
    }
  }, {
    prefix: "last-follower",
    id: "last-follower",
    def: {
      title: "Last Follow",
      c1: "#00d2ff",
      c2: "#3a7bd5"
    }
  }, {
    prefix: "last-gift",
    id: "last-gift",
    def: {
      title: "Last Gift",
      c1: "#a855f7",
      c2: "#ff2d55"
    }
  }];
  for (const v242 of vA5) {
    const getResult5 = await api.store.get("widget_" + v242.id);
    if (getResult5) {
      const v244 = document.getElementById("w-" + v242.prefix + "-target");
      if (v244 && getResult5.goal) {
        v244.value = getResult5.goal;
      }
      const v245 = document.getElementById("w-" + v242.prefix + "-title");
      if (v245) {
        v245.value = getResult5.title || v242.def.title;
      }
      const v246 = document.getElementById("w-" + v242.prefix + "-c1");
      if (v246) {
        v246.value = getResult5.c1 || v242.def.c1;
      }
      const v247 = document.getElementById("w-" + v242.prefix + "-c2");
      if (v247) {
        v247.value = getResult5.c2 || v242.def.c2;
      }
      const v248 = document.getElementById("w-" + v242.prefix + "-style");
      if (v248) {
        v248.value = getResult5.style || "style-1";
      }
      const v249 = document.getElementById("w-" + v242.prefix + "-action");
      if (v249) {
        v249.value = getResult5.action || "";
      }
      const v250 = document.getElementById("w-" + v242.prefix + "-behavior");
      if (v250) {
        v250.value = getResult5.behavior || "none";
      }
      await api.widget.setConfig(v242.id, getResult5);
    }
  }
  const getConfigResult = await api.widget.getConfig("firework");
  if (getConfigResult) {
    await api.widget.setConfig("firework", getConfigResult);
  }
  const getConfigResult2 = await api.widget.getConfig("hearts");
  if (getConfigResult2) {
    await api.widget.setConfig("hearts", getConfigResult2);
  }
  const getConfigResult3 = await api.widget.getConfig("heart-goal");
  if (getConfigResult3) {
    const vF10 = p202 => document.getElementById(p202);
    if (vF10("w-heart-target") && getConfigResult3.goal) {
      vF10("w-heart-target").value = getConfigResult3.goal;
    }
    if (vF10("w-heart-title")) {
      vF10("w-heart-title").value = getConfigResult3.title || "Goal";
    }
    if (vF10("w-heart-goaltype")) {
      vF10("w-heart-goaltype").value = getConfigResult3.goalType || "likes";
      document.getElementById("w-heart-gift-group").style.display = getConfigResult3.goalType === "gift" ? "block" : "none";
    }
    if (vF10("w-heart-giftname")) {
      vF10("w-heart-giftname").value = getConfigResult3.giftName || "";
    }
    if (vF10("w-heart-img-size")) {
      vF10("w-heart-img-size").value = getConfigResult3.imageSize || 250;
    }
    if (vF10("w-heart-img-scale")) {
      vF10("w-heart-img-scale").value = getConfigResult3.imageScale || 1;
    }
    if (vF10("w-heart-counter-style")) {
      vF10("w-heart-counter-style").value = getConfigResult3.counterStyle || "classic";
    }
    if (vF10("w-heart-title-y")) {
      vF10("w-heart-title-y").value = getConfigResult3.titleY || 0;
    }
    if (vF10("w-heart-counter-y")) {
      vF10("w-heart-counter-y").value = getConfigResult3.counterY || 0;
    }
    if (vF10("w-heart-action")) {
      vF10("w-heart-action").value = getConfigResult3.action || "";
    }
    if (vF10("w-heart-behavior")) {
      vF10("w-heart-behavior").value = getConfigResult3.behavior || "none";
    }
    if (getConfigResult3.image) {
      heartGoalImg = getConfigResult3.image;
      if (vF10("w-heart-img-path")) {
        vF10("w-heart-img-path").textContent = getConfigResult3.image;
      }
    }
    if (vF10("w-heart-url")) {
          vF10("w-heart-url").value = widgetUrl("goal-heart", "type=" + (getConfigResult3.goalType || "likes") + "&id=heart-goal");
    }
    await api.widget.setConfig("heart-goal", getConfigResult3);
  }
  const getConfigResult4 = await api.widget.getConfig("gift-goal");
  if (getConfigResult4) {
    const vF11 = p203 => document.getElementById(p203);
    if (vF11("w-giftgoal-target") && getConfigResult4.goal) {
      vF11("w-giftgoal-target").value = getConfigResult4.goal;
    }
    if (vF11("w-giftgoal-title")) {
      vF11("w-giftgoal-title").value = getConfigResult4.title || "Gift Goal";
    }
    if (vF11("w-giftgoal-c1")) {
      vF11("w-giftgoal-c1").value = getConfigResult4.c1 || "#a855f7";
    }
    if (vF11("w-giftgoal-c2")) {
      vF11("w-giftgoal-c2").value = getConfigResult4.c2 || "#ff2d55";
    }
    if (vF11("w-giftgoal-style")) {
      vF11("w-giftgoal-style").value = getConfigResult4.style || "style-1";
    }
    if (vF11("w-giftgoal-giftname")) {
      vF11("w-giftgoal-giftname").value = getConfigResult4.giftName || "";
    }
    if (vF11("w-giftgoal-action")) {
      vF11("w-giftgoal-action").value = getConfigResult4.action || "";
    }
    if (vF11("w-giftgoal-behavior")) {
      vF11("w-giftgoal-behavior").value = getConfigResult4.behavior || "none";
    }
    await api.widget.setConfig("gift-goal", getConfigResult4);
  }
  const getConfigResult5 = await api.widget.getConfig("liquid-heart-goal");
  if (getConfigResult5) {
    const vF12 = p204 => document.getElementById(p204);
    if (vF12("w-lheart-target") && getConfigResult5.goal) {
      vF12("w-lheart-target").value = getConfigResult5.goal;
    }
    if (vF12("w-lheart-title")) {
      vF12("w-lheart-title").value = getConfigResult5.title || "Follow Goal";
    }
    if (vF12("w-lheart-goaltype")) {
      vF12("w-lheart-goaltype").value = getConfigResult5.goalType || "follows";
    }
    if (vF12("w-lheart-giftname")) {
      vF12("w-lheart-giftname").value = getConfigResult5.giftName || "";
    }
    if (getConfigResult5.goalType === "gift") {
      document.getElementById("w-lheart-gift-group").style.display = "block";
    }
    if (vF12("w-lheart-color") && getConfigResult5.accentR !== undefined) {
      const v256 = "#" + [getConfigResult5.accentR, getConfigResult5.accentG, getConfigResult5.accentB].map(item => (item || 0).toString(16).padStart(2, "0")).join("");
      vF12("w-lheart-color").value = v256;
    }
    if (vF12("w-lheart-waveSpeed") && getConfigResult5.waveSpeed) {
      vF12("w-lheart-waveSpeed").value = getConfigResult5.waveSpeed;
    }
    if (vF12("w-lheart-starSpeed") && getConfigResult5.starSpeed) {
      vF12("w-lheart-starSpeed").value = getConfigResult5.starSpeed;
    }
    if (vF12("w-lheart-starSize") && getConfigResult5.starSize) {
      vF12("w-lheart-starSize").value = getConfigResult5.starSize;
    }
    if (vF12("w-lheart-labelTop") && getConfigResult5.labelTop) {
      vF12("w-lheart-labelTop").value = getConfigResult5.labelTop;
    }
    if (vF12("w-lheart-counterBottom") && getConfigResult5.counterBottom) {
      vF12("w-lheart-counterBottom").value = getConfigResult5.counterBottom;
    }
    if (vF12("w-lheart-labelSize") && getConfigResult5.labelSize) {
      vF12("w-lheart-labelSize").value = getConfigResult5.labelSize;
    }
    if (vF12("w-lheart-counterSize") && getConfigResult5.counterSize) {
      vF12("w-lheart-counterSize").value = getConfigResult5.counterSize;
    }
    await api.widget.setConfig("liquid-heart-goal", getConfigResult5);
  }
  const getConfigResult6 = await api.widget.getConfig("tiktok-goal");
  if (getConfigResult6) {
    const vF13 = p206 => document.getElementById(p206);
    if (vF13("w-tiktok-target") && getConfigResult6.goal) {
      vF13("w-tiktok-target").value = getConfigResult6.goal;
    }
    if (vF13("w-tiktok-title")) {
      vF13("w-tiktok-title").value = getConfigResult6.title || "Gift Goal";
    }
    if (vF13("w-tiktok-goaltype")) {
      vF13("w-tiktok-goaltype").value = getConfigResult6.goalType || "gift";
    }
    if (vF13("w-tiktok-giftname")) {
      vF13("w-tiktok-giftname").value = getConfigResult6.giftName || "";
    }
    const v258 = document.getElementById("w-tiktok-gift-group");
    if (v258) {
      v258.style.display = getConfigResult6.goalType === "gift" ? "block" : "none";
    }
    if (vF13("w-tiktok-waveSpeed") && getConfigResult6.waveSpeed) {
      vF13("w-tiktok-waveSpeed").value = getConfigResult6.waveSpeed;
    }
    if (vF13("w-tiktok-bubbleSpeed") && getConfigResult6.bubbleSpeed) {
      vF13("w-tiktok-bubbleSpeed").value = getConfigResult6.bubbleSpeed;
    }
    if (vF13("w-tiktok-bubbleSize") && getConfigResult6.bubbleSize) {
      vF13("w-tiktok-bubbleSize").value = getConfigResult6.bubbleSize;
    }
    if (vF13("w-tiktok-titleMargin") && getConfigResult6.titleMargin !== undefined) {
      vF13("w-tiktok-titleMargin").value = getConfigResult6.titleMargin;
    }
    if (vF13("w-tiktok-counterMargin") && getConfigResult6.counterMargin !== undefined) {
      vF13("w-tiktok-counterMargin").value = getConfigResult6.counterMargin;
    }
    if (vF13("w-tiktok-titleSize") && getConfigResult6.titleSize) {
      vF13("w-tiktok-titleSize").value = getConfigResult6.titleSize;
    }
    if (vF13("w-tiktok-counterSize") && getConfigResult6.counterSize) {
      vF13("w-tiktok-counterSize").value = getConfigResult6.counterSize;
    }
    await api.widget.setConfig("tiktok-goal", getConfigResult6);
  }
  const getConfigResult7 = await api.widget.getConfig("last-liker-alert");
  if (getConfigResult7) {
    const vF14 = p207 => document.getElementById(p207);
    if (vF14("w-lastliker-message")) {
      vF14("w-lastliker-message").value = getConfigResult7.message || "أعجب بالبث";
    }
    if (vF14("w-lastliker-duration")) {
      vF14("w-lastliker-duration").value = getConfigResult7.showDuration || 5000;
    }
    if (vF14("w-lastliker-frequency")) {
      vF14("w-lastliker-frequency").value = getConfigResult7.frequency || 1;
    }
    await api.widget.setConfig("last-liker-alert", getConfigResult7);
  }
  const getConfigResult8 = await api.widget.getConfig("new-follower-alert");
  if (getConfigResult8) {
    const vF15 = p208 => document.getElementById(p208);
    if (vF15("w-newfollower-message")) {
      vF15("w-newfollower-message").value = getConfigResult8.message || "متابع جديد 🎉";
    }
    if (vF15("w-newfollower-duration")) {
      vF15("w-newfollower-duration").value = getConfigResult8.showDuration || 6000;
    }
    await api.widget.setConfig("new-follower-alert", getConfigResult8);
  }
  const getConfigResult9 = await api.widget.getConfig("water-image-goal");
  if (getConfigResult9) {
    const vF16 = p209 => document.getElementById(p209);
    if (vF16("w-waterimg-target") && getConfigResult9.goal) {
      vF16("w-waterimg-target").value = getConfigResult9.goal;
    }
    if (vF16("w-waterimg-title")) {
      vF16("w-waterimg-title").value = getConfigResult9.title || "Follow Goal";
    }
    if (vF16("w-waterimg-goaltype")) {
      vF16("w-waterimg-goaltype").value = getConfigResult9.goalType || "follows";
    }
    if (vF16("w-waterimg-giftname")) {
      vF16("w-waterimg-giftname").value = getConfigResult9.giftName || "";
    }
    if (getConfigResult9.goalType === "gift") {
      document.getElementById("w-waterimg-gift-group").style.display = "block";
    }
    if (vF16("w-waterimg-color") && getConfigResult9.liquidColor) {
      vF16("w-waterimg-color").value = getConfigResult9.liquidColor;
    }
    if (getConfigResult9.imageUrl) {
      waterImagePath = getConfigResult9.imageUrl;
      if (vF16("w-waterimg-browse")) {
        vF16("w-waterimg-browse").textContent = "✅ " + getConfigResult9.imageUrl.split(/[/\\]/).pop();
      }
    }
    if (vF16("w-waterimg-waveSpeed") && getConfigResult9.waveSpeed) {
      vF16("w-waterimg-waveSpeed").value = getConfigResult9.waveSpeed;
    }
    if (vF16("w-waterimg-particleSpeed") && getConfigResult9.particleSpeed) {
      vF16("w-waterimg-particleSpeed").value = getConfigResult9.particleSpeed;
    }
    if (vF16("w-waterimg-particleSize") && getConfigResult9.particleSize) {
      vF16("w-waterimg-particleSize").value = getConfigResult9.particleSize;
    }
    if (vF16("w-waterimg-particleCount") && getConfigResult9.particleCount) {
      vF16("w-waterimg-particleCount").value = getConfigResult9.particleCount;
    }
    if (vF16("w-waterimg-counterTop") && getConfigResult9.counterTop) {
      vF16("w-waterimg-counterTop").value = getConfigResult9.counterTop;
    }
    if (vF16("w-waterimg-titleMargin") && getConfigResult9.titleMargin !== undefined) {
      vF16("w-waterimg-titleMargin").value = getConfigResult9.titleMargin;
    }
    if (vF16("w-waterimg-counterSize") && getConfigResult9.counterSize) {
      vF16("w-waterimg-counterSize").value = getConfigResult9.counterSize;
    }
    if (vF16("w-waterimg-titleSize") && getConfigResult9.titleSize) {
      vF16("w-waterimg-titleSize").value = getConfigResult9.titleSize;
    }
    await api.widget.setConfig("water-image-goal", getConfigResult9);
  }
}
loadWidgetConfigs();
(function () {
  const v262 = document.getElementById("widget-settings-overlay");
  const v263 = document.getElementById("widget-settings-title");
  const v264 = document.getElementById("widget-settings-body");
  const v265 = document.getElementById("widget-settings-close");
  const v266 = document.getElementById("widget-settings-test");
  const v267 = document.getElementById("widget-settings-apply");
  let v268 = null;
  let vO12 = {};
  const vO13 = {
    firework: {
      title: "🎆 Firework Settings",
      defaults: {
        posXMin: 20,
        posXMax: 80,
        posYMin: 25,
        posYMax: 55,
        rocketSize: 60,
        particles: 80,
        spread: 200,
        particleSize: 8,
        textSize: 40,
        launchSpeed: 1.5
      },
      fields: [{
        type: "range",
        keyMin: "posXMin",
        keyMax: "posXMax",
        label: "Horizontal Range (X)",
        min: 0,
        max: 100,
        step: 1,
        suffix: "%",
        presets: [{
          label: "Left Half",
          valMin: 5,
          valMax: 45
        }, {
          label: "Center",
          valMin: 35,
          valMax: 65
        }, {
          label: "Right Half",
          valMin: 55,
          valMax: 95
        }, {
          label: "Full Width",
          valMin: 10,
          valMax: 90
        }]
      }, {
        type: "range",
        keyMin: "posYMin",
        keyMax: "posYMax",
        label: "Height Range (Y)",
        min: 10,
        max: 90,
        step: 1,
        suffix: "%",
        presets: [{
          label: "High",
          valMin: 15,
          valMax: 35
        }, {
          label: "Mid",
          valMin: 30,
          valMax: 55
        }, {
          label: "Low",
          valMin: 50,
          valMax: 75
        }, {
          label: "Spread",
          valMin: 20,
          valMax: 70
        }]
      }, {
        key: "rocketSize",
        label: "Rocket Size",
        min: 30,
        max: 120,
        step: 5,
        suffix: "px"
      }, {
        key: "particles",
        label: "Particle Count",
        min: 20,
        max: 200,
        step: 10,
        suffix: ""
      }, {
        key: "spread",
        label: "Explosion Spread",
        min: 50,
        max: 500,
        step: 10,
        suffix: "px"
      }, {
        key: "particleSize",
        label: "Particle Size",
        min: 3,
        max: 20,
        step: 1,
        suffix: "px"
      }, {
        key: "textSize",
        label: "Username Text Size",
        min: 16,
        max: 80,
        step: 2,
        suffix: "px"
      }, {
        key: "launchSpeed",
        label: "Launch Speed",
        min: 0.5,
        max: 3,
        step: 0.1,
        suffix: "s"
      }]
    },
    hearts: {
      title: "💖 Hearts Settings",
      defaults: {
        posX: 50,
        spread: 200,
        areaW: 200,
        size: 30,
        speed: 3,
        height: 80,
        max: 20
      },
      fields: [{
        key: "posX",
        label: "Position X",
        min: 0,
        max: 100,
        step: 1,
        suffix: "%",
        presets: [{
          label: "Left",
          val: 10
        }, {
          label: "Center",
          val: 50
        }, {
          label: "Right",
          val: 90
        }]
      }, {
        key: "spread",
        label: "Spread Width",
        min: 50,
        max: 1000,
        step: 10,
        suffix: "px"
      }, {
        key: "areaW",
        label: "Area Width",
        min: 50,
        max: 1500,
        step: 10,
        suffix: "px"
      }, {
        key: "size",
        label: "Heart Size",
        min: 10,
        max: 80,
        step: 2,
        suffix: "px"
      }, {
        key: "speed",
        label: "Float Speed",
        min: 1,
        max: 8,
        step: 0.5,
        suffix: "s"
      }, {
        key: "height",
        label: "Float Height",
        min: 30,
        max: 100,
        step: 5,
        suffix: "%"
      }, {
        key: "max",
        label: "Max Hearts / Burst",
        min: 1,
        max: 50,
        step: 1,
        suffix: ""
      }]
    }
  };
  function f5(p210, p211) {
    let vLSdivClassformgroupSty = "<div class=\"form-group\" style=\"margin-bottom:16px;\">";
    vLSdivClassformgroupSty += "<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;\">";
    vLSdivClassformgroupSty += "<label class=\"form-label\" style=\"margin:0; text-transform:uppercase; font-size:11px; letter-spacing:0.8px;\">" + p210.label + "</label>";
    vLSdivClassformgroupSty += "<span style=\"font-weight:700; color:var(--accent-red); font-size:12px;\" id=\"wval-" + p210.key + "\">" + p211 + p210.suffix + "</span>";
    vLSdivClassformgroupSty += "</div>";
    vLSdivClassformgroupSty += "<input type=\"range\" class=\"form-input\" id=\"wopt-" + p210.key + "\" min=\"" + p210.min + "\" max=\"" + p210.max + "\" step=\"" + p210.step + "\" value=\"" + p211 + "\" ";
    vLSdivClassformgroupSty += "style=\"width:100%; height:6px; -webkit-appearance:none; appearance:none; background:rgba(255,255,255,0.08); border-radius:4px; outline:none; cursor:pointer;\">";
    if (p210.presets) {
      vLSdivClassformgroupSty += "<div style=\"display:flex; gap:6px; margin-top:8px;\">";
      for (const v269 of p210.presets) {
        const v270 = p211 == v269.val ? "background:rgba(168,85,247,0.2);border-color:rgba(168,85,247,0.4);color:#a855f7;" : "";
        vLSdivClassformgroupSty += "<button class=\"btn btn-ghost widget-preset-btn\" data-key=\"" + p210.key + "\" data-val=\"" + v269.val + "\" style=\"flex:1;padding:6px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;" + v270 + "\">" + v269.label + "</button>";
      }
      vLSdivClassformgroupSty += "</div>";
    }
    vLSdivClassformgroupSty += "</div>";
    return vLSdivClassformgroupSty;
  }
  function f6(p212, p213, p214) {
    let vLSdivClassformgroupSty2 = "<div class=\"form-group\" style=\"margin-bottom:16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:12px;\">";
    vLSdivClassformgroupSty2 += "<label class=\"form-label\" style=\"margin:0 0 10px 0; text-transform:uppercase; font-size:11px; letter-spacing:0.8px; display:block;\">" + p212.label + "</label>";
    vLSdivClassformgroupSty2 += "<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;\">";
    vLSdivClassformgroupSty2 += "<span style=\"font-size:10px; color:var(--text-muted); text-transform:uppercase;\">Min</span>";
    vLSdivClassformgroupSty2 += "<span style=\"font-weight:700; color:#25f4ee; font-size:12px;\" id=\"wval-" + p212.keyMin + "\">" + p213 + p212.suffix + "</span>";
    vLSdivClassformgroupSty2 += "</div>";
    vLSdivClassformgroupSty2 += "<input type=\"range\" class=\"form-input\" id=\"wopt-" + p212.keyMin + "\" min=\"" + p212.min + "\" max=\"" + p212.max + "\" step=\"" + p212.step + "\" value=\"" + p213 + "\" ";
    vLSdivClassformgroupSty2 += "style=\"width:100%; height:6px; -webkit-appearance:none; appearance:none; background:rgba(255,255,255,0.08); border-radius:4px; outline:none; cursor:pointer; margin-bottom:10px;\">";
    vLSdivClassformgroupSty2 += "<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;\">";
    vLSdivClassformgroupSty2 += "<span style=\"font-size:10px; color:var(--text-muted); text-transform:uppercase;\">Max</span>";
    vLSdivClassformgroupSty2 += "<span style=\"font-weight:700; color:#ff2d55; font-size:12px;\" id=\"wval-" + p212.keyMax + "\">" + p214 + p212.suffix + "</span>";
    vLSdivClassformgroupSty2 += "</div>";
    vLSdivClassformgroupSty2 += "<input type=\"range\" class=\"form-input\" id=\"wopt-" + p212.keyMax + "\" min=\"" + p212.min + "\" max=\"" + p212.max + "\" step=\"" + p212.step + "\" value=\"" + p214 + "\" ";
    vLSdivClassformgroupSty2 += "style=\"width:100%; height:6px; -webkit-appearance:none; appearance:none; background:rgba(255,255,255,0.08); border-radius:4px; outline:none; cursor:pointer;\">";
    if (p212.presets) {
      vLSdivClassformgroupSty2 += "<div style=\"display:flex; gap:5px; margin-top:10px;\">";
      for (const v271 of p212.presets) {
        vLSdivClassformgroupSty2 += "<button class=\"btn btn-ghost widget-range-preset\" data-kmin=\"" + p212.keyMin + "\" data-kmax=\"" + p212.keyMax + "\" data-vmin=\"" + v271.valMin + "\" data-vmax=\"" + v271.valMax + "\" style=\"flex:1;padding:5px 0;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;\">" + v271.label + "</button>";
      }
      vLSdivClassformgroupSty2 += "</div>";
    }
    vLSdivClassformgroupSty2 += "</div>";
    return vLSdivClassformgroupSty2;
  }
  async function f7(p215) {
    const v272 = vO13[p215];
    if (!v272) {
      return;
    }
    v268 = p215;
    const getConfigResult10 = await api.widget.getConfig(p215);
    vO12 = {
      ...v272.defaults,
      ...(getConfigResult10 || {})
    };
    v263.textContent = v272.title;
    let vLS4 = "";
    for (const v274 of v272.fields) {
      if (v274.type === "range") {
        vLS4 += f6(v274, vO12[v274.keyMin], vO12[v274.keyMax]);
      } else {
        vLS4 += f5(v274, vO12[v274.key]);
      }
    }
    v264.innerHTML = vLS4;
    for (const v275 of v272.fields) {
      if (v275.type === "range") {
        const v276 = document.getElementById("wopt-" + v275.keyMin);
        const v277 = document.getElementById("wval-" + v275.keyMin);
        if (v276) {
          v276.addEventListener("input", () => {
            let vParseFloat = parseFloat(v276.value);
            const v278 = document.getElementById("wopt-" + v275.keyMax);
            if (v278 && vParseFloat > parseFloat(v278.value)) {
              vParseFloat = parseFloat(v278.value);
              v276.value = vParseFloat;
            }
            vO12[v275.keyMin] = vParseFloat;
            v277.textContent = vParseFloat + v275.suffix;
          });
        }
        const v279 = document.getElementById("wopt-" + v275.keyMax);
        const v280 = document.getElementById("wval-" + v275.keyMax);
        if (v279) {
          v279.addEventListener("input", () => {
            let vParseFloat2 = parseFloat(v279.value);
            const v281 = document.getElementById("wopt-" + v275.keyMin);
            if (v281 && vParseFloat2 < parseFloat(v281.value)) {
              vParseFloat2 = parseFloat(v281.value);
              v279.value = vParseFloat2;
            }
            vO12[v275.keyMax] = vParseFloat2;
            v280.textContent = vParseFloat2 + v275.suffix;
          });
        }
      } else {
        const v282 = document.getElementById("wopt-" + v275.key);
        const v283 = document.getElementById("wval-" + v275.key);
        if (v282) {
          v282.addEventListener("input", () => {
            const vParseFloat3 = parseFloat(v282.value);
            vO12[v275.key] = vParseFloat3;
            v283.textContent = vParseFloat3 + v275.suffix;
          });
        }
      }
    }
    v264.querySelectorAll(".widget-preset-btn").forEach(item => {
      item.addEventListener("click", () => {
        const v284 = item.dataset.key;
        const vParseFloat4 = parseFloat(item.dataset.val);
        vO12[v284] = vParseFloat4;
        const v285 = document.getElementById("wopt-" + v284);
        const v286 = document.getElementById("wval-" + v284);
        if (v285) {
          v285.value = vParseFloat4;
        }
        if (v286) {
          const v287 = v272.fields.find(item => item.key === v284);
          v286.textContent = vParseFloat4 + (v287?.suffix || "");
        }
        v264.querySelectorAll(".widget-preset-btn[data-key=\"" + v284 + "\"]").forEach(item => {
          if (item.dataset.val == vParseFloat4) {
            item.style.background = "rgba(168,85,247,0.2)";
            item.style.borderColor = "rgba(168,85,247,0.4)";
            item.style.color = "#a855f7";
          } else {
            item.style.background = "";
            item.style.borderColor = "";
            item.style.color = "";
          }
        });
      });
    });
    v264.querySelectorAll(".widget-range-preset").forEach(item => {
      item.addEventListener("click", () => {
        const v288 = item.dataset.kmin;
        const v289 = item.dataset.kmax;
        const vParseFloat5 = parseFloat(item.dataset.vmin);
        const vParseFloat6 = parseFloat(item.dataset.vmax);
        vO12[v288] = vParseFloat5;
        vO12[v289] = vParseFloat6;
        const v290 = document.getElementById("wopt-" + v288);
        const v291 = document.getElementById("wopt-" + v289);
        const v292 = document.getElementById("wval-" + v288);
        const v293 = document.getElementById("wval-" + v289);
        if (v290) {
          v290.value = vParseFloat5;
        }
        if (v291) {
          v291.value = vParseFloat6;
        }
        const v294 = v272.fields.find(item => item.keyMin === v288);
        const v295 = v294?.suffix || "";
        if (v292) {
          v292.textContent = vParseFloat5 + v295;
        }
        if (v293) {
          v293.textContent = vParseFloat6 + v295;
        }
        v264.querySelectorAll(".widget-range-preset[data-kmin=\"" + v288 + "\"]").forEach(item => {
          if (item === item) {
            item.style.background = "rgba(168,85,247,0.2)";
            item.style.borderColor = "rgba(168,85,247,0.4)";
            item.style.color = "#a855f7";
          } else {
            item.style.background = "";
            item.style.borderColor = "";
            item.style.color = "";
          }
        });
      });
    });
    v262.style.display = "flex";
  }
  function f8() {
    v262.style.display = "none";
    v268 = null;
  }
  v265.addEventListener("click", f8);
  v262.addEventListener("click", event => {
    if (event.target === v262) {
      f8();
    }
  });
  v266.addEventListener("click", async () => {
    if (!v268) {
      return;
    }
    await api.widget.setConfig(v268, vO12);
    await api.widget.test(v268);
    v266.textContent = "✅ Sent!";
    setTimeout(() => {
      v266.textContent = "🎯 Test";
    }, 1500);
  });
  v267.addEventListener("click", async () => {
    if (!v268) {
      return;
    }
    await api.widget.setConfig(v268, vO12);
    v267.textContent = "✅ Saved!";
    setTimeout(() => {
      v267.textContent = "Apply & Save";
    }, 1500);
  });
  document.getElementById("btn-firework-settings")?.addEventListener("click", () => f7("firework"));
  document.getElementById("btn-hearts-settings")?.addEventListener("click", () => f7("hearts"));
})();
(function () {
  document.addEventListener("keydown", event => {
    const v296 = document.activeElement;
    if (v296 && v296.dataset.listening === "1") {
      event.preventDefault();
      v296.value = event.code;
      v296.dataset.listening = "0";
    }
  });
  let vO14 = {};
  document.getElementById("btn-auction-settings")?.addEventListener("click", () => f9());
  async function f9() {
    vO14 = (await api.widget.getConfig("auction")) || {};
    let v297 = vO14.timeExtGifts || [];
    if (v297.length === 0 && vO14.timeExtGift) {
      v297 = [{
        name: vO14.timeExtGift,
        img: "",
        seconds: vO14.timeExtSec || 10
      }];
    }
    const divEl18 = document.createElement("div");
    divEl18.className = "ks-overlay";
    divEl18.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:640px;max-height:88vh;overflow-y:auto;\">\n      <div class=\"ks-header\"><h3>🎯 Auction Settings</h3><button class=\"modal-close\" id=\"auc-close\">&times;</button></div>\n      <div style=\"padding:16px;display:flex;flex-direction:column;gap:14px;\">\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Style</label>\n            <select class=\"form-input\" id=\"auc-style\"><option value=\"style-1\">Dark Glass</option><option value=\"style-2\">Neon Glow</option><option value=\"style-3\">Gradient</option></select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Title</label><input class=\"form-input\" id=\"auc-title\" value=\"" + escapeAttr(vO14.title || "") + "\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Duration (sec)</label><input type=\"number\" class=\"form-input\" id=\"auc-duration\" value=\"" + (vO14.duration || 60) + "\" min=\"10\" max=\"3600\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Max Participants</label>\n            <select class=\"form-input\" id=\"auc-slots\"><option value=\"3\">3</option><option value=\"5\">5</option><option value=\"10\">10</option></select></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Winner Display (sec)</label><input type=\"number\" class=\"form-input\" id=\"auc-winner-time\" value=\"" + (vO14.winnerTime || 10) + "\" min=\"3\" max=\"60\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Auto Repeat</label>\n            <select class=\"form-input\" id=\"auc-auto-repeat\"><option value=\"yes\">Yes</option><option value=\"no\">No</option></select></div>\n        </div>\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;\">⏱️ Time Extension</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Mode</label>\n            <select class=\"form-input\" id=\"auc-time-mode\"><option value=\"none\">None</option><option value=\"any-gift\">Any Gift</option><option value=\"specific-gift\">Specific Gift</option><option value=\"coin-threshold\">Coin Threshold</option></select></div>\n          <div class=\"form-group\" id=\"auc-anygift-sec-grp\" style=\"display:none;\"><label class=\"form-label\">Seconds to Add</label><input type=\"number\" class=\"form-input\" id=\"auc-time-sec\" value=\"" + (vO14.timeExtSec || 10) + "\" min=\"1\" max=\"300\"></div>\n          <div class=\"form-group\" id=\"auc-coins-grp\" style=\"display:none;\"><label class=\"form-label\">Coins Threshold</label><input type=\"number\" class=\"form-input\" id=\"auc-time-coins\" value=\"" + (vO14.timeExtCoins || 100) + "\" min=\"1\"></div>\n        </div>\n        <div id=\"auc-coins-sec-grp\" style=\"display:none;\">\n          <div class=\"form-row\">\n            <div class=\"form-group\"><label class=\"form-label\">Seconds to Add</label><input type=\"number\" class=\"form-input\" id=\"auc-coins-time-sec\" value=\"" + (vO14.timeExtSec || 10) + "\" min=\"1\" max=\"300\"></div>\n          </div>\n        </div>\n        <div id=\"auc-gift-grp\" style=\"display:none;\">\n          <div id=\"auc-gift-list\" class=\"ext-gift-list\"></div>\n          <button class=\"btn btn-ghost btn-sm\" id=\"auc-add-gift\" style=\"margin-top:6px;\">+ Add Gift</button>\n        </div>\n      </div>\n      <div class=\"ks-footer\">\n        <button class=\"btn btn-primary\" id=\"auc-save\">💾 Apply & Save</button>\n        <button class=\"btn btn-ghost\" id=\"auc-cancel\">Cancel</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl18);
    document.getElementById("auc-style").value = vO14.style || "style-1";
    document.getElementById("auc-slots").value = vO14.slots || "5";
    document.getElementById("auc-auto-repeat").value = vO14.autoRepeat || "yes";
    document.getElementById("auc-time-mode").value = vO14.timeExtMode || "none";
    function f10() {
      const v299 = document.getElementById("auc-gift-list");
      if (!v299) {
        return;
      }
      v299.innerHTML = v297.map((item, index) => "\n        <div style=\"display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;\">\n          " + (item.img ? "<img src=\"" + item.img + "\" style=\"width:28px;height:28px;object-fit:contain;\">" : "<span>🎁</span>") + "\n          <span style=\"flex:1;font-weight:600;font-size:13px;\">" + escapeHtml(item.name) + "</span>\n          <span style=\"color:#25f4ee;font-weight:700;font-size:12px;\">+" + item.seconds + "s</span>\n          <button class=\"btn btn-danger btn-sm\" data-idx=\"" + index + "\" style=\"padding:4px 8px;font-size:11px;\">✕</button>\n        </div>").join("");
      v299.querySelectorAll(".btn-danger").forEach(item => {
        item.onclick = () => {
          v297.splice(parseInt(item.dataset.idx), 1);
          f10();
        };
      });
    }
    f10();
    document.getElementById("auc-add-gift").onclick = async () => {
      const v300 = await showGiftPickerDialog();
      if (!v300) {
        return;
      }
      const v301 = await showInputDialog("Seconds to Add (عدد الثواني)", "10");
      if (!v301) {
        return;
      }
      v297.push({
        name: v300.name,
        img: v300.img || "",
        seconds: parseInt(v301) || 10
      });
      f10();
    };
    const vF17 = () => {
      const v302 = document.getElementById("auc-time-mode").value;
      document.getElementById("auc-gift-grp").style.display = v302 === "specific-gift" ? "block" : "none";
      document.getElementById("auc-coins-grp").style.display = v302 === "coin-threshold" ? "block" : "none";
      document.getElementById("auc-coins-sec-grp").style.display = v302 === "coin-threshold" ? "block" : "none";
      document.getElementById("auc-anygift-sec-grp").style.display = v302 === "any-gift" ? "block" : "none";
    };
    vF17();
    document.getElementById("auc-time-mode").addEventListener("change", vF17);
    const vF18 = () => divEl18.remove();
    document.getElementById("auc-close").onclick = vF18;
    document.getElementById("auc-cancel").onclick = vF18;
    document.getElementById("auc-save").onclick = async () => {
      const v303 = document.getElementById("auc-time-mode").value;
      const vO15 = {
        style: document.getElementById("auc-style").value,
        title: document.getElementById("auc-title").value,
        duration: parseInt(document.getElementById("auc-duration").value) || 60,
        slots: document.getElementById("auc-slots").value,
        winnerTime: parseInt(document.getElementById("auc-winner-time").value) || 10,
        autoRepeat: document.getElementById("auc-auto-repeat").value,
        timeExtMode: v303,
        timeExtSec: parseInt(document.getElementById(v303 === "coin-threshold" ? "auc-coins-time-sec" : "auc-time-sec").value) || 10,
        timeExtGift: v297.length > 0 ? v297[0].name : "",
        timeExtGifts: v297,
        timeExtCoins: parseInt(document.getElementById("auc-time-coins")?.value) || 100
      };
      await api.widget.setConfig("auction", vO15);
      addFeedItem("system", "Extension", "Auction settings saved", "🎯");
      vF18();
    };
  }
  const v304 = document.getElementById("ext-auc-start");
  const v305 = document.getElementById("ext-auc-reset");
  v304?.addEventListener("click", async () => {
    await api.ext.command("auction", "start");
    v304.textContent = "✅ Started!";
    setTimeout(() => v304.textContent = "▶ Start", 2000);
  });
  v305?.addEventListener("click", async () => {
    await api.ext.command("auction", "reset");
    v305.textContent = "✅ Reset!";
    setTimeout(() => v305.textContent = "⟲ Reset", 2000);
  });
  (async () => {
    const getConfigResult11 = await api.widget.getConfig("auction");
    if (getConfigResult11) {
      await api.widget.setConfig("auction", getConfigResult11);
    }
  })();
  let vA6 = [];
  let vLN2 = 2;
  document.getElementById("btn-battle-settings")?.addEventListener("click", () => f11());
  async function f11() {
    const v307 = (await api.widget.getConfig("battle")) || {};
    function f12(p227) {
      if (!p227) {
        return "";
      }
      if (p227.startsWith("http") || p227.startsWith("data:") || p227.startsWith("file://")) {
        return p227;
      }
      return "file:///" + p227.replace(/\\/g, "/");
    }
    vLN2 = v307.teamsCount || 2;
    if (v307.teams && v307.teams.length > 0) {
      vA6 = JSON.parse(JSON.stringify(v307.teams));
    } else {
      vA6 = [{
        title: v307.leftTitle || "🔴 Red Team",
        color: v307.leftColor || "#ff0000",
        gifts: v307.leftGifts || []
      }, {
        title: v307.rightTitle || "🔵 Blue Team",
        color: v307.rightColor || "#008dff",
        gifts: v307.rightGifts || []
      }];
    }
    while (vA6.length < 4) {
      vA6.push({
        title: "Team " + (vA6.length + 1),
        color: "#ffffff",
        gifts: []
      });
    }
    const divEl19 = document.createElement("div");
    divEl19.className = "ks-overlay";
    divEl19.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:700px;max-height:88vh;overflow-y:auto;\">\n      <div class=\"ks-header\" style=\"display:flex; align-items:center; justify-content:space-between;\">\n        <h3 style=\"margin:0;\">⚔️ Battle Settings</h3>\n        <div style=\"display:flex; gap:8px; align-items:center;\">\n          <button class=\"btn\" id=\"bat-export-btn\" style=\"background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:6px 12px; font-size:12px; border-radius:6px; cursor:pointer; display:flex; gap:6px; align-items:center;\">📤 Export Profile</button>\n          <button class=\"btn\" id=\"bat-import-btn\" style=\"background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:6px 12px; font-size:12px; border-radius:6px; cursor:pointer; display:flex; gap:6px; align-items:center;\">📥 Import Profile</button>\n          <button class=\"modal-close\" id=\"bat-close\" style=\"margin-left:8px;\">&times;</button>\n        </div>\n      </div>\n      <div style=\"padding:16px;display:flex;flex-direction:column;gap:14px;\">\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Battle Style</label>\n          <select class=\"form-input\" id=\"bat-style\">\n            <option value=\"style-1\">Tug of War (Default)</option>\n            <option value=\"style-2\">Fixed Size (Separated Bars)</option>\n          </select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Duration (sec)</label><input type=\"number\" class=\"form-input\" id=\"bat-duration\" value=\"180\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Number of Teams</label>\n          <select class=\"form-input\" id=\"bat-teams-count\">\n            <option value=\"2\">2 Teams</option>\n            <option value=\"3\">3 Teams</option>\n            <option value=\"4\">4 Teams</option>\n          </select></div>\n        </div>\n\n        <div id=\"bat-teams-container\"></div>\n\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 8px 0;\"></div>\n\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Bar Gradient Style</label>\n          <select class=\"form-input\" id=\"bat-bar-gradient-style\">\n            <option value=\"mixed\">Mixed (Fade Edges, Flat Center)</option>\n            <option value=\"flat\">Flat (Solid Gradient for All)</option>\n            <option value=\"horizontal\">Horizontal (Fade from Edges for All)</option>\n          </select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Bar Color</label><input type=\"color\" class=\"form-input\" id=\"bat-bar-color\" style=\"padding:0;height:38px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Bar Height (px)</label><input type=\"number\" class=\"form-input\" id=\"bat-bar-height\" value=\"50\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Score Font Size (px)</label><input type=\"number\" class=\"form-input\" id=\"bat-score-size\" value=\"24\"></div>\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Winner Display Time (sec)</label><input type=\"number\" class=\"form-input\" id=\"bat-winner-time\" value=\"10\"></div>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <label class=\"switch\"><input type=\"checkbox\" id=\"bat-like-enabled\"><span class=\"slider\"></span></label>\n          <span style=\"font-size:13px;\">Allow joining team by double tap (Likes) / Chat numbers</span>\n        </div>\n        <div class=\"form-row\" style=\"margin-top: 8px;\">\n          <div class=\"form-group\"><label class=\"form-label\">Likes Count (e.g. 10)</label><input type=\"number\" class=\"form-input\" id=\"bat-likes-needed\" value=\"1\" min=\"1\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Points to Add (e.g. 1)</label><input type=\"number\" class=\"form-input\" id=\"bat-likes-points\" value=\"1\" min=\"1\"></div>\n        </div>\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 8px 0;\"></div>\n        <h4 style=\"color:var(--primary-color); margin-bottom: -6px;\">ℹ️ Join Instructions Text</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Hide Text</label><label class=\"switch\" style=\"margin-top:6px;\"><input type=\"checkbox\" id=\"bat-hide-like-info\"><span class=\"slider\"></span></label></div>\n          <div class=\"form-group\"><label class=\"form-label\">Color</label><input type=\"color\" class=\"form-input\" id=\"bat-like-info-color\" value=\"#ffffff\" style=\"padding:0;height:24px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-like-info-y\" value=\"0\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\" style=\"flex:2;\"><label class=\"form-label\">Custom Text</label><input type=\"text\" class=\"form-input\" id=\"bat-like-info-text\" value=\"Double Tap = Likes\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Font Size</label><input type=\"number\" class=\"form-input\" id=\"bat-like-info-size\" value=\"12\"></div>\n        </div>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <label class=\"switch\"><input type=\"checkbox\" id=\"bat-auto-repeat\"><span class=\"slider\"></span></label>\n          <span style=\"font-size:13px;\">Auto-repeat battle after finish</span>\n        </div>\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 8px 0;\"></div>\n        <h4 style=\"color:var(--primary-color); margin-bottom: -6px;\">🎁 Marquee & Points Settings</h4>\n        \n        <div class=\"form-row\" style=\"margin-top: 16px;\">\n          <label class=\"switch\"><input type=\"checkbox\" id=\"bat-hide-marquee-pts\"><span class=\"slider\"></span></label>\n          <span style=\"font-size:13px; margin-right: 15px;\">Hide Points Under Gifts</span>\n        </div>\n\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 16px 0;\"></div>\n        <h4 style=\"color:var(--primary-color); margin-bottom: -6px;\">👥 Team Display Settings</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Display Style</label>\n            <select class=\"form-input\" id=\"bat-team-display\">\n              <option value=\"full\">Full Box (Name, Members, Gifts)</option>\n              <option value=\"name-members\">Name & Members Only</option>\n              <option value=\"name-only\">Name Only (No Box)</option>\n              <option value=\"hidden\">Hide Completely</option>\n            </select>\n          </div>\n          <div class=\"form-group\"><label class=\"form-label\">Font Family</label><input type=\"text\" list=\"bat-fonts-list\" class=\"form-input\" id=\"bat-team-font\" placeholder=\"e.g. Arial\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Font Size</label><input type=\"number\" class=\"form-input\" id=\"bat-team-font-size\" value=\"24\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-team-y\" value=\"0\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Team Image Size (Global)</label><input type=\"number\" class=\"form-input\" id=\"bat-team-img-size\" value=\"64\"></div>\n        </div>\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 8px 0;\"></div>\n        <h4 style=\"color:var(--primary-color); margin-bottom: -6px;\">🎁 Marquee Gifts & 🏆 Wins Counter</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Gifts Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-gift-y\" value=\"-60\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Gifts Size</label><input type=\"number\" class=\"form-input\" id=\"bat-gift-size\" value=\"48\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Marquee Speed</label><input type=\"number\" class=\"form-input\" id=\"bat-marquee-speed\" value=\"5\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Gifts BG</label><label class=\"switch\" style=\"margin-top:6px;\"><input type=\"checkbox\" id=\"bat-gift-bg\"><span class=\"slider\"></span></label></div>\n          <div class=\"form-group\"><label class=\"form-label\">Hide Points</label><label class=\"switch\" style=\"margin-top:6px;\"><input type=\"checkbox\" id=\"bat-hide-marquee-pts\"><span class=\"slider\"></span></label></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Wins Label</label><input type=\"text\" class=\"form-input\" id=\"bat-wins-label\" value=\"Wins:\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Wins Color</label><input type=\"color\" class=\"form-input\" id=\"bat-wins-color\" value=\"#ffd700\" style=\"padding:0;height:38px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Wins Size</label><input type=\"number\" class=\"form-input\" id=\"bat-wins-size\" value=\"14\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Wins X Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-wins-x\" value=\"0\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Wins Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-wins-y\" value=\"60\"></div>\n        </div>\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 8px 0;\"></div>\n        <h4 style=\"color:var(--primary-color); margin-bottom: -6px;\">⏱ Timer & 💎 Top 3</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Timer Font</label><input type=\"text\" list=\"bat-fonts-list\" class=\"form-input\" id=\"bat-timer-font\" placeholder=\"e.g. Arial\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer Size</label><input type=\"number\" class=\"form-input\" id=\"bat-timer-size\" value=\"24\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer Color</label><input type=\"color\" class=\"form-input\" id=\"bat-timer-color\" value=\"#ffffff\" style=\"padding:0;height:38px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer BG Color</label><input type=\"color\" class=\"form-input\" id=\"bat-timer-bg-color\" value=\"#1e2332\" style=\"padding:0;height:38px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer BG</label><label class=\"switch\" style=\"margin-top:6px;\"><input type=\"checkbox\" id=\"bat-timer-bg\" checked><span class=\"slider\"></span></label></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Timer Border Size</label><input type=\"number\" class=\"form-input\" id=\"bat-timer-border-size\" value=\"1\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer Border Color</label><input type=\"color\" class=\"form-input\" id=\"bat-timer-border-color\" value=\"#ffffff\" style=\"padding:0;height:38px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer X Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-timer-x\" value=\"0\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Timer Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-timer-y\" value=\"0\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Top 3 Size</label><input type=\"number\" class=\"form-input\" id=\"bat-top3-size\" value=\"48\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Top 3 Box Width</label><input type=\"number\" class=\"form-input\" id=\"bat-top3-box-width\" value=\"150\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Top 3 Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-top3-y\" value=\"100\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Show Top 3</label><label class=\"switch\" style=\"margin-top:6px;\"><input type=\"checkbox\" id=\"bat-show-top3\" checked><span class=\"slider\"></span></label></div>\n        </div>\n        <div style=\"border-top:1px solid rgba(255,255,255,0.1); margin: 8px 0;\"></div>\n        <h4 style=\"color:var(--primary-color); margin-bottom: -6px;\">ℹ️ Status Text</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Hide Text</label><label class=\"switch\" style=\"margin-top:6px;\"><input type=\"checkbox\" id=\"bat-hide-status\"><span class=\"slider\"></span></label></div>\n          <div class=\"form-group\"><label class=\"form-label\">Text Size</label><input type=\"number\" class=\"form-input\" id=\"bat-status-size\" value=\"16\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Text Color</label><input type=\"color\" class=\"form-input\" id=\"bat-status-color\" value=\"#cbd5e1\" style=\"padding:0;height:38px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Y Offset</label><input type=\"number\" class=\"form-input\" id=\"bat-status-y\" value=\"-30\"></div>\n        </div>\n        <datalist id=\"bat-fonts-list\">\n          <option value=\"Arial\"><option value=\"Tajawal\"><option value=\"Cairo\"><option value=\"Almarai\"><option value=\"Impact\"><option value=\"Comic Sans MS\"><option value=\"Courier New\"><option value=\"Tahoma\"><option value=\"Trebuchet MS\"><option value=\"Verdana\"><option value=\"Times New Roman\"><option value=\"Georgia\">\n        </datalist>\n      </div>\n      <div class=\"ks-footer\" style=\"justify-content:flex-end;\">\n        <button class=\"btn btn-ghost\" id=\"bat-close-btn\" style=\"color:var(--text-secondary)\">Cancel</button>\n        <button class=\"btn btn-primary\" id=\"bat-save-btn\">Apply & Save</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl19);
    document.getElementById("bat-style").value = v307.style || "style-1";
    document.getElementById("bat-duration").value = v307.duration || 180;
    document.getElementById("bat-teams-count").value = vLN2;
    document.getElementById("bat-bar-gradient-style").value = v307.barGradientStyle || "mixed";
    document.getElementById("bat-bar-color").value = v307.barColor || "#0c1226";
    document.getElementById("bat-bar-height").value = v307.barHeight || 50;
    document.getElementById("bat-score-size").value = v307.scoreSize || 24;
    document.getElementById("bat-hide-marquee-pts").checked = !!v307.hideMarqueePts;
    document.getElementById("bat-auto-repeat").checked = v307.autoRepeat !== "no";
    document.getElementById("bat-winner-time").value = v307.winnerTime || 10;
    document.getElementById("bat-like-enabled").checked = v307.likeEnabled !== false;
    document.getElementById("bat-likes-needed").value = v307.likesNeeded || 1;
    document.getElementById("bat-likes-points").value = v307.likesPoints || 1;
    document.getElementById("bat-hide-like-info").checked = !!v307.hideLikeInfo;
    document.getElementById("bat-like-info-color").value = v307.likeInfoColor || "#ffffff";
    document.getElementById("bat-like-info-y").value = v307.likeInfoY || 0;
    document.getElementById("bat-like-info-text").value = v307.likeInfoText !== undefined ? v307.likeInfoText : "Double Tap = Likes";
    document.getElementById("bat-like-info-size").value = v307.likeInfoSize || 12;
    document.getElementById("bat-team-display").value = v307.teamDisplay || (v307.hideGiftBoxes ? "hidden" : "full");
    document.getElementById("bat-team-font").value = v307.teamFont || "";
    document.getElementById("bat-team-font-size").value = v307.teamFontSize || 24;
    document.getElementById("bat-team-y").value = v307.teamY || 0;
    document.getElementById("bat-team-img-size").value = v307.teamImgSize || 64;
    document.getElementById("bat-gift-y").value = v307.giftY !== undefined ? v307.giftY : -60;
    document.getElementById("bat-gift-size").value = v307.giftSize || 48;
    document.getElementById("bat-marquee-speed").value = v307.marqueeSpeed || 5;
    document.getElementById("bat-gift-bg").checked = !!v307.giftBg;
    document.getElementById("bat-wins-label").value = v307.winsLabel || "Wins:";
    document.getElementById("bat-wins-color").value = v307.winsColor || "#ffd700";
    document.getElementById("bat-wins-size").value = v307.winsSize || 14;
    document.getElementById("bat-wins-x").value = v307.winsX || 0;
    document.getElementById("bat-wins-y").value = v307.winsY !== undefined ? v307.winsY : 60;
    document.getElementById("bat-timer-font").value = v307.timerFont || "";
    document.getElementById("bat-timer-size").value = v307.timerSize || 24;
    document.getElementById("bat-timer-color").value = v307.timerColor || "#ffffff";
    document.getElementById("bat-timer-bg-color").value = v307.timerBgColor || "#1e2332";
    document.getElementById("bat-timer-bg").checked = v307.timerBg !== false;
    document.getElementById("bat-timer-border-size").value = v307.timerBorderSize !== undefined ? v307.timerBorderSize : 1;
    document.getElementById("bat-timer-border-color").value = v307.timerBorderColor || "#ffffff";
    document.getElementById("bat-timer-x").value = v307.timerX || 0;
    document.getElementById("bat-timer-y").value = v307.timerY || 0;
    document.getElementById("bat-top3-size").value = v307.top3Size || 48;
    document.getElementById("bat-top3-box-width").value = v307.top3BoxWidth || 150;
    document.getElementById("bat-top3-y").value = v307.top3Y !== undefined ? v307.top3Y : 100;
    document.getElementById("bat-show-top3").checked = v307.showTop3 !== false;
    document.getElementById("bat-hide-status").checked = !!v307.hideStatus;
    document.getElementById("bat-status-size").value = v307.statusSize || 16;
    document.getElementById("bat-status-color").value = v307.statusColor || "#cbd5e1";
    document.getElementById("bat-status-y").value = v307.statusY !== undefined ? v307.statusY : -30;
    const v309 = document.getElementById("bat-teams-container");
    function f13(p228) {
      const v310 = vA6[p228].gifts;
      let vLS5 = "";
      v310.forEach((item, index) => {
        vLS5 += "<div style=\"display:flex;gap:8px;margin-bottom:8px;align-items:center;\">\n          <img src=\"" + escapeAttr(item.img) + "\" style=\"width:30px;height:30px;object-fit:contain;\">\n          <div style=\"flex:1;font-size:12px;\">" + escapeHtml(item.name) + " <span style=\"color:#ffd700\">(+" + item.points + ")</span></div>\n          <button class=\"btn btn-ghost btn-sm btn-bat-del\" data-idx=\"" + p228 + "\" data-gidx=\"" + index + "\" style=\"color:#ff2d55;padding:0 8px;\">Del</button>\n        </div>";
      });
      const v311 = document.getElementById("bat-gifts-list-" + p228);
      if (v311) {
        v311.innerHTML = vLS5;
      }
      const v312 = document.querySelectorAll(".btn-bat-del[data-idx=\"" + p228 + "\"]");
      v312.forEach(item => {
        item.onclick = () => {
          const vParseInt4 = parseInt(item.dataset.gidx);
          vA6[p228].gifts.splice(vParseInt4, 1);
          f13(p228);
          f16();
        };
      });
    }
    function f14() {
      let vLS6 = "";
      for (let vLN0 = 0; vLN0 < vLN2; vLN0++) {
        const v313 = vA6[vLN0];
        vLS6 += "\n        <div style=\"border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: rgba(255,255,255,0.02);\">\n          <div class=\"form-row\" style=\"align-items:flex-end;\">\n            <div class=\"form-group\" style=\"flex:1;\"><label class=\"form-label\">Team " + (vLN0 + 1) + " Title</label><input class=\"form-input bat-team-title\" data-idx=\"" + vLN0 + "\" value=\"" + escapeAttr(v313.title) + "\"></div>\n            <div class=\"form-group\" style=\"max-width:80px;\"><label class=\"form-label\">Color</label><input type=\"color\" class=\"form-input bat-team-color\" data-idx=\"" + vLN0 + "\" value=\"" + v313.color + "\" style=\"padding:0;height:38px;\"></div>\n            <div class=\"form-group\" style=\"max-width:40px; position:relative;\">\n              <button class=\"btn btn-ghost bat-team-img-btn\" data-idx=\"" + vLN0 + "\" style=\"height:38px;padding:0 8px; position:relative; overflow:hidden;\" title=\"Set Team Image\">\n                " + (v313.image ? "<img src=\"" + f12(v313.image) + "\" style=\"width:24px;height:24px;object-fit:contain;pointer-events:none;\">" : "🖼️") + "\n              </button>\n              " + (v313.image ? "<button class=\"bat-team-img-clear\" data-idx=\"" + vLN0 + "\" style=\"position:absolute; top:-4px; right:-4px; background:#ff4757; color:#fff; border:none; border-radius:50%; width:16px; height:16px; font-size:10px; line-height:16px; text-align:center; cursor:pointer; padding:0; z-index:2;\" title=\"Remove Image\">✖</button>" : "") + "\n            </div>\n          </div>\n          <div class=\"form-row\" style=\"margin-top:8px;\">\n            <div class=\"form-group\"><label class=\"form-label\">Image X, Y</label>\n              <div style=\"display:flex;gap:4px;\">\n                <input type=\"number\" class=\"form-input bat-t-img-x\" data-idx=\"" + vLN0 + "\" value=\"" + (v313.imgX || 0) + "\" placeholder=\"X\">\n                <input type=\"number\" class=\"form-input bat-t-img-y\" data-idx=\"" + vLN0 + "\" value=\"" + (v313.imgY !== undefined ? v313.imgY : 60) + "\" placeholder=\"Y\">\n              </div>\n            </div>\n            <div class=\"form-group\" style=\"max-width:80px;\"><label class=\"form-label\">Out Color</label><input type=\"color\" class=\"form-input bat-t-out-color\" data-idx=\"" + vLN0 + "\" value=\"" + (v313.outColor || "#ffffff") + "\" style=\"padding:0;height:38px;\"></div>\n            <div class=\"form-group\" style=\"max-width:80px;\"><label class=\"form-label\">Out Size</label><input type=\"number\" class=\"form-input bat-t-out-size\" data-idx=\"" + vLN0 + "\" value=\"" + (v313.outSize !== undefined ? v313.outSize : 2) + "\"></div>\n          </div>\n          <div style=\"margin-top:12px;margin-bottom:8px;font-size:13px;color:var(--text-secondary);display:flex;justify-content:space-between;align-items:center;\">\n            <span>Gifts (Team " + (vLN0 + 1) + ")</span>\n            <button class=\"btn btn-ghost btn-sm btn-bat-add\" data-idx=\"" + vLN0 + "\" style=\"height:26px;font-size:11px;\">+ Add Gift</button>\n          </div>\n          <div id=\"bat-gifts-list-" + vLN0 + "\"></div>\n        </div>\n        ";
      }
      v309.innerHTML = vLS6;
      v309.querySelectorAll(".bat-team-title").forEach(item => {
        item.addEventListener("input", event => {
          vA6[event.target.dataset.idx].title = event.target.value;
          f16();
        });
      });
      v309.querySelectorAll(".bat-team-color").forEach(item => {
        item.addEventListener("input", event => {
          vA6[event.target.dataset.idx].color = event.target.value;
          f16();
        });
      });
      v309.querySelectorAll(".bat-t-img-x").forEach(item => {
        item.addEventListener("input", event => {
          vA6[event.target.dataset.idx].imgX = parseInt(event.target.value) || 0;
          f16();
        });
      });
      v309.querySelectorAll(".bat-t-img-y").forEach(item => {
        item.addEventListener("input", event => {
          vA6[event.target.dataset.idx].imgY = parseInt(event.target.value) || 0;
          f16();
        });
      });
      v309.querySelectorAll(".bat-t-out-color").forEach(item => {
        item.addEventListener("input", event => {
          vA6[event.target.dataset.idx].outColor = event.target.value;
          f16();
        });
      });
      v309.querySelectorAll(".bat-t-out-size").forEach(item => {
        item.addEventListener("input", event => {
          vA6[event.target.dataset.idx].outSize = parseInt(event.target.value) || 0;
          f16();
        });
      });
      v309.querySelectorAll(".bat-team-img-btn").forEach(item => {
        item.addEventListener("click", async event => {
          const v314 = event.currentTarget.dataset.idx;
          const openFileResult4 = await api.dialog.openFile({
            filters: [{
              name: "Image",
              extensions: ["png", "jpg", "jpeg", "webp"]
            }]
          });
          if (openFileResult4) {
            vA6[v314].image = openFileResult4;
            f14();
            f16();
          }
        });
        item.addEventListener("contextmenu", event => {
          event.preventDefault();
          const v316 = event.currentTarget.dataset.idx;
          if (vA6[v316].image) {
            delete vA6[v316].image;
            f14();
            f16();
          }
        });
      });
      v309.querySelectorAll(".bat-team-img-clear").forEach(item => {
        item.addEventListener("click", event => {
          event.stopPropagation();
          const v317 = event.currentTarget.dataset.idx;
          if (vA6[v317].image) {
            delete vA6[v317].image;
            f14();
            f16();
          }
        });
      });
      v309.querySelectorAll(".btn-bat-add").forEach(item => {
        item.addEventListener("click", async event => {
          const v318 = event.target.dataset.idx;
          const v319 = await showGiftPickerDialog();
          if (!v319) {
            return;
          }
          const v320 = v319.coins || v319.diamond_count || 1;
          vA6[v318].gifts.push({
            name: v319.name,
            img: v319.img || v319.icon,
            points: parseInt(v320) || 1
          });
          f13(v318);
          f16();
        });
      });
      for (let vLN02 = 0; vLN02 < vLN2; vLN02++) {
        f13(vLN02);
      }
    }
    f14();
    document.getElementById("bat-teams-count").addEventListener("change", event => {
      vLN2 = parseInt(event.target.value) || 2;
      f14();
      f16();
    });
    const vF19 = () => divEl19.remove();
    document.getElementById("bat-close").onclick = vF19;
    document.getElementById("bat-close-btn").onclick = vF19;
    document.getElementById("bat-export-btn").onclick = async () => {
      const s101 = f15();
      await api.widget.setConfig("battle", s101);
      const exportBattleProfileResult = await api.profile.exportBattleProfile();
      if (exportBattleProfileResult && exportBattleProfileResult.success) {
        uiAlert("Profile exported successfully to:\n" + exportBattleProfileResult.filePath);
      } else if (exportBattleProfileResult && exportBattleProfileResult.error) {
        uiAlert("Failed to export: " + exportBattleProfileResult.error);
      }
    };
    document.getElementById("bat-import-btn").onclick = async () => {
      const importBattleProfileResult = await api.profile.importBattleProfile();
      if (importBattleProfileResult && importBattleProfileResult.success) {
        uiAlert("Profile imported successfully!");
        vF19();
        f11();
      } else if (importBattleProfileResult && importBattleProfileResult.error) {
        uiAlert("Failed to import: " + importBattleProfileResult.error);
      }
    };
    function f15() {
      const v323 = vA6[0];
      const v324 = vA6[1];
      return {
        style: document.getElementById("bat-style").value,
        duration: parseInt(document.getElementById("bat-duration").value) || 180,
        teamsCount: vLN2,
        teams: vA6,
        leftTitle: v323.title,
        rightTitle: v324.title,
        leftColor: v323.color,
        rightColor: v324.color,
        leftGifts: v323.gifts,
        rightGifts: v324.gifts,
        barGradientStyle: document.getElementById("bat-bar-gradient-style").value,
        barColor: document.getElementById("bat-bar-color").value,
        barHeight: parseInt(document.getElementById("bat-bar-height").value) || 50,
        scoreSize: parseInt(document.getElementById("bat-score-size").value) || 24,
        autoRepeat: document.getElementById("bat-auto-repeat").checked ? "yes" : "no",
        winnerTime: parseInt(document.getElementById("bat-winner-time").value) || 10,
        likeEnabled: document.getElementById("bat-like-enabled").checked,
        likesNeeded: parseInt(document.getElementById("bat-likes-needed").value) || 1,
        likesPoints: parseInt(document.getElementById("bat-likes-points").value) || 1,
        hideLikeInfo: document.getElementById("bat-hide-like-info").checked,
        likeInfoColor: document.getElementById("bat-like-info-color").value,
        likeInfoY: parseInt(document.getElementById("bat-like-info-y").value) || 0,
        likeInfoText: document.getElementById("bat-like-info-text").value,
        likeInfoSize: parseInt(document.getElementById("bat-like-info-size").value) || 12,
        hideMarqueePts: document.getElementById("bat-hide-marquee-pts").checked,
        teamDisplay: document.getElementById("bat-team-display").value,
        teamFont: document.getElementById("bat-team-font").value,
        teamFontSize: parseInt(document.getElementById("bat-team-font-size").value) || 24,
        teamY: parseInt(document.getElementById("bat-team-y").value) || 0,
        teamImgSize: parseInt(document.getElementById("bat-team-img-size").value) || 64,
        giftY: parseInt(document.getElementById("bat-gift-y").value) || 0,
        giftSize: parseInt(document.getElementById("bat-gift-size").value) || 48,
        marqueeSpeed: parseInt(document.getElementById("bat-marquee-speed").value) || 5,
        giftBg: document.getElementById("bat-gift-bg").checked,
        winsLabel: document.getElementById("bat-wins-label").value,
        winsColor: document.getElementById("bat-wins-color").value,
        winsSize: parseInt(document.getElementById("bat-wins-size").value) || 14,
        winsX: parseInt(document.getElementById("bat-wins-x").value) || 0,
        winsY: parseInt(document.getElementById("bat-wins-y").value) || 0,
        timerFont: document.getElementById("bat-timer-font").value,
        timerSize: parseInt(document.getElementById("bat-timer-size").value) || 24,
        timerColor: document.getElementById("bat-timer-color").value,
        timerBgColor: document.getElementById("bat-timer-bg-color").value,
        timerBg: document.getElementById("bat-timer-bg").checked,
        timerBorderSize: parseInt(document.getElementById("bat-timer-border-size").value) || 0,
        timerBorderColor: document.getElementById("bat-timer-border-color").value,
        timerX: parseInt(document.getElementById("bat-timer-x").value) || 0,
        timerY: parseInt(document.getElementById("bat-timer-y").value) || 0,
        top3Size: parseInt(document.getElementById("bat-top3-size").value) || 48,
        top3BoxWidth: parseInt(document.getElementById("bat-top3-box-width").value) || 150,
        top3Y: parseInt(document.getElementById("bat-top3-y").value) || 0,
        showTop3: document.getElementById("bat-show-top3").checked,
        hideStatus: document.getElementById("bat-hide-status").checked,
        statusSize: parseInt(document.getElementById("bat-status-size").value) || 16,
        statusColor: document.getElementById("bat-status-color").value,
        statusY: parseInt(document.getElementById("bat-status-y").value) || 0
      };
    }
    function f16() {
      api.widget.setConfig("battle", f15(), true);
    }
    document.getElementById("bat-save-btn").onclick = async () => {
      const vF152 = f15();
      await api.widget.setConfig("battle", vF152);
      vF19();
    };
    const v325 = divEl19.querySelectorAll("input:not(.bat-team-title):not(.bat-team-color), select");
    v325.forEach(item => item.addEventListener("input", f16));
  }
  const v326 = document.getElementById("ext-bat-start");
  const v327 = document.getElementById("ext-bat-reset");
  v326?.addEventListener("click", async () => {
    await api.ext.command("battle", "start");
    v326.textContent = "✅ Started!";
    setTimeout(() => v326.textContent = "▶ Start", 2000);
  });
  v327?.addEventListener("click", async () => {
    await api.ext.command("battle", "reset");
    v327.textContent = "✅ Reset!";
    setTimeout(() => v327.textContent = "⟲ Reset", 2000);
  });
  document.getElementById("ext-bat-test-1")?.addEventListener("click", async () => {
    const v328 = parseInt(document.getElementById("ext-bat-test-value")?.value) || 10;
    await api.ext.command("battle", "test", {
      side: "team1",
      value: v328
    });
  });
  document.getElementById("ext-bat-test-2")?.addEventListener("click", async () => {
    const v329 = parseInt(document.getElementById("ext-bat-test-value")?.value) || 10;
    await api.ext.command("battle", "test", {
      side: "team2",
      value: v329
    });
  });
  document.getElementById("ext-bat-test-3")?.addEventListener("click", async () => {
    const v330 = parseInt(document.getElementById("ext-bat-test-value")?.value) || 10;
    await api.ext.command("battle", "test", {
      side: "team3",
      value: v330
    });
  });
  document.getElementById("ext-bat-test-4")?.addEventListener("click", async () => {
    const v331 = parseInt(document.getElementById("ext-bat-test-value")?.value) || 10;
    await api.ext.command("battle", "test", {
      side: "team4",
      value: v331
    });
  });
  document.getElementById("ext-bat-test-left")?.addEventListener("click", async () => {
    const v332 = parseInt(document.getElementById("ext-bat-test-value")?.value) || 10;
    await api.ext.command("battle", "test", {
      side: "left",
      value: v332
    });
  });
  document.getElementById("ext-bat-test-right")?.addEventListener("click", async () => {
    const v333 = parseInt(document.getElementById("ext-bat-test-value")?.value) || 10;
    await api.ext.command("battle", "test", {
      side: "right",
      value: v333
    });
  });
  (async () => {
    const getConfigResult12 = await api.widget.getConfig("battle");
    if (getConfigResult12) {
      await api.widget.setConfig("battle", getConfigResult12);
    }
  })();
  let vA7 = [];
  let vA8 = [];
  document.getElementById("btn-spd-settings")?.addEventListener("click", () => f17());
  async function f17() {
    const v335 = (await api.widget.getConfig("speedometer")) || {};
    vA7 = v335.redGifts || [];
    vA8 = v335.greenGifts || [];
    const divEl20 = document.createElement("div");
    divEl20.className = "ks-overlay";
    divEl20.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:700px;max-height:88vh;overflow-y:auto;\">\n      <div class=\"ks-header\"><h3>⚡ Speedometer Settings</h3><button class=\"modal-close\" id=\"spd-close\">&times;</button></div>\n      <div style=\"padding:16px;display:flex;flex-direction:column;gap:14px;\">\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Style</label>\n            <select class=\"form-input\" id=\"spd-style\"><option value=\"\">Classic</option><option value=\"style-2\">Neon</option><option value=\"style-3\">Bold</option></select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Title</label><input class=\"form-input\" id=\"spd-title\" value=\"" + escapeAttr(v335.title || "") + "\" placeholder=\"Optional title above meter\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Max Value</label><input type=\"number\" class=\"form-input\" id=\"spd-max\" value=\"" + (v335.maxValue || 1000) + "\" min=\"10\" max=\"100000\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Red Label (Left)</label><input class=\"form-input\" id=\"spd-red-label\" value=\"" + escapeAttr(v335.redLabel || "مخربين") + "\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Green Label (Right)</label><input class=\"form-input\" id=\"spd-green-label\" value=\"" + escapeAttr(v335.greenLabel || "مساعدين") + "\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Red Color</label><input type=\"color\" class=\"form-input\" id=\"spd-red-color\" value=\"" + (v335.redColor || "#ff4444") + "\" style=\"height:36px;padding:2px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Green Color</label><input type=\"color\" class=\"form-input\" id=\"spd-green-color\" value=\"" + (v335.greenColor || "#10b981") + "\" style=\"height:36px;padding:2px;\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;\">📐 Position & Size</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Gauge Y Offset</label><input type=\"number\" class=\"form-input\" id=\"spd-gauge-y\" value=\"" + (v335.gaugeY || 0) + "\" min=\"-500\" max=\"500\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Needle Length</label><input type=\"number\" class=\"form-input\" id=\"spd-needle-len\" value=\"" + (v335.needleLength || 150) + "\" min=\"50\" max=\"300\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Red Label Y / X Offset</label>\n            <div style=\"display:flex;gap:4px;\"><input type=\"number\" class=\"form-input\" id=\"spd-red-y\" value=\"" + (v335.redY || 0) + "\" title=\"Y Offset (Up/Down)\"><input type=\"number\" class=\"form-input\" id=\"spd-red-x\" value=\"" + (v335.redX || 0) + "\" title=\"X Offset (Left/Right)\"></div>\n          </div>\n          <div class=\"form-group\"><label class=\"form-label\">Green Label Y / X Offset</label>\n            <div style=\"display:flex;gap:4px;\"><input type=\"number\" class=\"form-input\" id=\"spd-green-y\" value=\"" + (v335.greenY || 0) + "\" title=\"Y Offset (Up/Down)\"><input type=\"number\" class=\"form-input\" id=\"spd-green-x\" value=\"" + (v335.greenX || 0) + "\" title=\"X Offset (Left/Right)\"></div>\n          </div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Status Pill Y / X Offset</label>\n            <div style=\"display:flex;gap:4px;\"><input type=\"number\" class=\"form-input\" id=\"spd-status-y\" value=\"" + (v335.statusY || 0) + "\" title=\"Y Offset (Up/Down)\"><input type=\"number\" class=\"form-input\" id=\"spd-status-x\" value=\"" + (v335.statusX || 0) + "\" title=\"X Offset (Left/Right)\"></div>\n          </div>\n          <div class=\"form-group\"><label class=\"form-label\">Needle Color</label><input type=\"color\" class=\"form-input\" id=\"spd-needle-color\" value=\"" + (v335.needleColor || "#e0e0e0") + "\" style=\"height:36px;padding:2px;\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"spd-hide-status\" " + (v335.hideStatus ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"spd-hide-status\">Hide Status Pill</label>\n          </div></div>\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"spd-hide-gifts\" " + (v335.hideGifts ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"spd-hide-gifts\">Hide Gifts</label>\n          </div></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Center Circle Size</label><input type=\"number\" class=\"form-input\" id=\"spd-cap-radius\" value=\"" + (v335.capRadius || 16) + "\" min=\"8\" max=\"60\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;\">🖼️ Images</h4>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <div class=\"form-group\"><label class=\"form-label\">Center Circle Image</label>\n            <button class=\"btn btn-ghost btn-sm\" id=\"spd-upload-cap\" style=\"width:100%;height:34px;\">📁 Upload Image</button>\n            <div id=\"spd-cap-path\" style=\"font-size:10px;color:var(--text-muted);margin-top:4px;\">" + (v335.capImage || "No image") + "</div></div>\n          <div class=\"form-group\"><button class=\"btn btn-danger btn-sm\" id=\"spd-clear-cap\" style=\"width:100%;height:34px;\">Clear</button></div>\n        </div>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <div class=\"form-group\"><label class=\"form-label\">Background Image</label>\n            <button class=\"btn btn-ghost btn-sm\" id=\"spd-upload-bg\" style=\"width:100%;height:34px;\">📁 Upload Background</button>\n            <div id=\"spd-bg-path\" style=\"font-size:10px;color:var(--text-muted);margin-top:4px;\">" + (v335.bgImage || "No background") + "</div></div>\n          <div class=\"form-group\"><button class=\"btn btn-danger btn-sm\" id=\"spd-clear-bg\" style=\"width:100%;height:34px;\">Clear</button></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">BG Width (%)</label><input type=\"number\" class=\"form-input\" id=\"spd-bg-w\" value=\"" + (v335.bgW || 100) + "\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">BG Height (%)</label><input type=\"number\" class=\"form-input\" id=\"spd-bg-h\" value=\"" + (v335.bgH || 100) + "\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">BG Pos X (px)</label><input type=\"number\" class=\"form-input\" id=\"spd-bg-x\" value=\"" + (v335.bgX || 0) + "\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">BG Pos Y (px)</label><input type=\"number\" class=\"form-input\" id=\"spd-bg-y\" value=\"" + (v335.bgY || 0) + "\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Center Point X Offset</label><input type=\"number\" class=\"form-input\" id=\"spd-cap-x\" value=\"" + (v335.capX || 0) + "\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Center Point Y Offset</label><input type=\"number\" class=\"form-input\" id=\"spd-cap-y\" value=\"" + (v335.capY || 0) + "\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"spd-transparent\" " + (v335.transparent ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"spd-transparent\">Transparent Mode</label>\n          </div></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;\">🔴 Red Team Gifts</h4>\n        <div id=\"spd-red-gifts-list\" class=\"ext-gift-list\"></div>\n        <button class=\"btn btn-ghost btn-sm\" id=\"spd-add-red\">+ Add Red Gift</button>\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;\">🟢 Green Team Gifts</h4>\n        <div id=\"spd-green-gifts-list\" class=\"ext-gift-list\"></div>\n        <button class=\"btn btn-ghost btn-sm\" id=\"spd-add-green\">+ Add Green Gift</button>\n      </div>\n      <div class=\"ks-footer\">\n        <button class=\"btn btn-primary\" id=\"spd-save\">💾 Apply & Save</button>\n        <button class=\"btn btn-ghost\" id=\"spd-cancel\">Cancel</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl20);
    document.getElementById("spd-style").value = v335.style || "";
    let v337 = v335.capImage || "";
    let v338 = v335.bgImage || "";
    function f18(p253) {
      const v339 = p253 === "red" ? vA7 : vA8;
      const v340 = document.getElementById(p253 === "red" ? "spd-red-gifts-list" : "spd-green-gifts-list");
      if (!v340) {
        return;
      }
      v340.innerHTML = v339.map((item, index) => "\n        <div style=\"display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;\">\n          " + (item.img ? "<img src=\"" + item.img + "\" style=\"width:28px;height:28px;object-fit:contain;\">" : "<span>🎁</span>") + "\n          <span style=\"flex:1;font-weight:600;font-size:13px;\">" + escapeHtml(item.name) + "</span>\n          <span style=\"color:#ffd64d;font-weight:700;font-size:12px;\">+" + item.value + "</span>\n          <button class=\"btn btn-danger btn-sm\" data-side=\"" + p253 + "\" data-idx=\"" + index + "\" style=\"padding:4px 8px;font-size:11px;\">✕</button>\n        </div>").join("");
      v340.querySelectorAll(".btn-danger").forEach(item => {
        item.onclick = () => {
          const v341 = item.dataset.side;
          const vParseInt5 = parseInt(item.dataset.idx);
          if (v341 === "red") {
            vA7.splice(vParseInt5, 1);
          } else {
            vA8.splice(vParseInt5, 1);
          }
          f18(v341);
        };
      });
    }
    f18("red");
    f18("green");
    document.getElementById("spd-add-red").onclick = async () => {
      const v342 = await showGiftPickerDialog();
      if (!v342) {
        return;
      }
      const v343 = await showInputDialog("Value", "10");
      if (!v343) {
        return;
      }
      vA7.push({
        name: v342.name,
        img: v342.img || "",
        value: parseInt(v343) || 1
      });
      f18("red");
    };
    document.getElementById("spd-add-green").onclick = async () => {
      const v344 = await showGiftPickerDialog();
      if (!v344) {
        return;
      }
      const v345 = await showInputDialog("Value", "10");
      if (!v345) {
        return;
      }
      vA8.push({
        name: v344.name,
        img: v344.img || "",
        value: parseInt(v345) || 1
      });
      f18("green");
    };
    document.getElementById("spd-upload-cap").onclick = async () => {
      const openFileResult5 = await api.dialog.openFile({
        filters: [{
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp"]
        }]
      });
      if (openFileResult5) {
        v337 = openFileResult5;
        document.getElementById("spd-cap-path").textContent = openFileResult5;
      }
    };
    document.getElementById("spd-clear-cap").onclick = () => {
      v337 = "";
      document.getElementById("spd-cap-path").textContent = "No image";
    };
    document.getElementById("spd-upload-bg").onclick = async () => {
      const openFileResult6 = await api.dialog.openFile({
        filters: [{
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp"]
        }]
      });
      if (openFileResult6) {
        v338 = openFileResult6;
        document.getElementById("spd-bg-path").textContent = openFileResult6;
      }
    };
    document.getElementById("spd-clear-bg").onclick = () => {
      v338 = "";
      document.getElementById("spd-bg-path").textContent = "No background";
    };
    function f19() {
      return {
        style: document.getElementById("spd-style").value,
        title: document.getElementById("spd-title").value,
        maxValue: parseInt(document.getElementById("spd-max").value) || 1000,
        redLabel: document.getElementById("spd-red-label").value,
        greenLabel: document.getElementById("spd-green-label").value,
        redColor: document.getElementById("spd-red-color").value,
        greenColor: document.getElementById("spd-green-color").value,
        gaugeY: parseInt(document.getElementById("spd-gauge-y").value) || 0,
        redY: parseInt(document.getElementById("spd-red-y").value) || 0,
        redX: parseInt(document.getElementById("spd-red-x").value) || 0,
        greenY: parseInt(document.getElementById("spd-green-y").value) || 0,
        greenX: parseInt(document.getElementById("spd-green-x").value) || 0,
        statusY: parseInt(document.getElementById("spd-status-y").value) || 0,
        statusX: parseInt(document.getElementById("spd-status-x").value) || 0,
        needleColor: document.getElementById("spd-needle-color").value,
        hideStatus: document.getElementById("spd-hide-status").checked,
        hideGifts: document.getElementById("spd-hide-gifts").checked,
        needleLength: parseInt(document.getElementById("spd-needle-len").value) || 150,
        capRadius: parseInt(document.getElementById("spd-cap-radius").value) || 16,
        capX: parseInt(document.getElementById("spd-cap-x").value) || 0,
        capY: parseInt(document.getElementById("spd-cap-y").value) || 0,
        capImage: v337 || "",
        bgImage: v338 || "",
        bgW: parseInt(document.getElementById("spd-bg-w").value) || 100,
        bgH: parseInt(document.getElementById("spd-bg-h").value) || 100,
        bgX: parseInt(document.getElementById("spd-bg-x").value) || 0,
        bgY: parseInt(document.getElementById("spd-bg-y").value) || 0,
        transparent: document.getElementById("spd-transparent").checked,
        redGifts: vA7,
        greenGifts: vA8
      };
    }
    let v348 = null;
    function f20() {
      clearTimeout(v348);
      v348 = setTimeout(async () => {
        await api.widget.setConfig("speedometer", f19());
      }, 150);
    }
    divEl20.querySelectorAll("input, select").forEach(item => {
      item.addEventListener("input", f20);
      item.addEventListener("change", f20);
    });
    const vF20 = () => divEl20.remove();
    document.getElementById("spd-close").onclick = vF20;
    document.getElementById("spd-cancel").onclick = vF20;
    document.getElementById("spd-save").onclick = async () => {
      await api.widget.setConfig("speedometer", f19());
      addFeedItem("system", "Extension", "Speedometer settings saved", "⚡");
      vF20();
    };
  }
  const v349 = document.getElementById("ext-spd-reset");
  v349?.addEventListener("click", async () => {
    await api.ext.command("speedometer", "reset");
    v349.textContent = "✅ Reset!";
    setTimeout(() => v349.textContent = "⟲ Reset", 2000);
  });
  document.getElementById("ext-spd-test-red")?.addEventListener("click", async () => {
    const v350 = parseInt(document.getElementById("ext-spd-test-value").value) || 100;
    await api.ext.command("speedometer", "test", {
      side: "red",
      value: v350
    });
  });
  document.getElementById("ext-spd-test-green")?.addEventListener("click", async () => {
    const v351 = parseInt(document.getElementById("ext-spd-test-value").value) || 100;
    await api.ext.command("speedometer", "test", {
      side: "green",
      value: v351
    });
  });
  (async () => {
    const getConfigResult13 = await api.widget.getConfig("speedometer");
    if (getConfigResult13) {
      await api.widget.setConfig("speedometer", getConfigResult13);
    }
  })();
})();
(function () {
  document.getElementById("btn-scoreboard-settings")?.addEventListener("click", () => f21());
  (async () => {
    try {
      const getStateResult = await api.ext.scoreboard.getState();
      if (getStateResult) {
        const v354 = document.getElementById("ext-sb-score-left");
        const v355 = document.getElementById("ext-sb-score-right");
        if (v354) {
          v354.value = getStateResult.left;
        }
        if (v355) {
          v355.value = getStateResult.right;
        }
      }
    } catch (err) {}
  })();
  api.ext.scoreboard.onState(p258 => {
    const v356 = document.getElementById("ext-sb-score-left");
    const v357 = document.getElementById("ext-sb-score-right");
    if (v356) {
      v356.value = p258.left;
    }
    if (v357) {
      v357.value = p258.right;
    }
  });
  document.getElementById("ext-sb-apply-score")?.addEventListener("click", async () => {
    const v358 = parseInt(document.getElementById("ext-sb-score-left").value) || 0;
    const v359 = parseInt(document.getElementById("ext-sb-score-right").value) || 0;
    await api.ext.scoreboard.setScore(v358, v359);
    const v360 = document.getElementById("ext-sb-apply-score");
    if (v360) {
      const v361 = v360.textContent;
      v360.textContent = "✅ Applied successfully! (تم تطبيق النقاط)";
      v360.style.color = "#4ade80";
      setTimeout(() => {
        v360.textContent = v361;
        v360.style.color = "";
      }, 2000);
    }
  });
  let vO16 = {};
  let vLS7 = "";
  let vLS8 = "";
  let vLS9 = "";
  async function f21() {
    vO16 = (await api.widget.getConfig("scoreboard")) || {};
    const v362 = (await api.store.get("ext_scoreboard_hotkeys")) || {};
    vLS7 = vO16.bgImage || "";
    vLS8 = vO16.incrementSound || "";
    vLS9 = vO16.decrementSound || "";
    const divEl21 = document.createElement("div");
    divEl21.className = "ks-overlay";
    divEl21.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:780px;max-height:88vh;overflow-y:auto;\">\n      <div class=\"ks-header\" style=\"display:flex;align-items:center;justify-content:space-between;width:100%;\">\n        <h3 style=\"margin:0;\">🏆 Scoreboard Settings (إعدادات العداد)</h3>\n        <div style=\"display:flex;gap:8px;margin-right:16px;\">\n          <button class=\"btn btn-ghost btn-sm\" id=\"sb-export-profile-btn\" style=\"height:32px;font-size:11px;padding:0 12px;border:1px solid var(--border,#333);\">📤 Export Profile</button>\n          <button class=\"btn btn-ghost btn-sm\" id=\"sb-import-profile-btn\" style=\"height:32px;font-size:11px;padding:0 12px;border:1px solid var(--border,#333);\">📥 Import Profile</button>\n        </div>\n        <button class=\"modal-close\" id=\"sb-close\" style=\"margin-left:0;\">&times;</button>\n      </div>\n      <div style=\"padding:16px;display:flex;flex-direction:column;gap:14px;\">\n        <!-- General Layout & Scoring Section -->\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-weight:700;\">⚙️ General Settings (إعدادات عامة)</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Style (الشكل)</label>\n            <select class=\"form-input\" id=\"sb-style\"><option value=\"style-1\">Classic</option><option value=\"style-2\">Neon</option><option value=\"style-3\">Minimal</option></select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Mode (الوضع)</label>\n            <select class=\"form-input\" id=\"sb-mode\"><option value=\"dual\">Dual</option><option value=\"left-only\">Left Only</option><option value=\"right-only\">Right Only</option></select></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Target Score (الهدف - مثلاً 100)</label><input type=\"number\" class=\"form-input\" id=\"sb-target-score\" value=\"" + (vO16.targetScore || 100) + "\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Increment Step (خطوة الزيادة)</label><input type=\"number\" class=\"form-input\" id=\"sb-step\" value=\"" + (vO16.step || 1) + "\"></div>\n        </div>\n        <div class=\"form-row\" style=\"margin-top:-10px;\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"sb-enable-target\" " + (vO16.enableTarget ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"sb-enable-target\">Enable Target Display (تفعيل إظهار الهدف مثل 50/100)</label>\n          </div></div>\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"sb-auto-increase-target\" " + (vO16.autoIncreaseTarget ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"sb-auto-increase-target\">Auto Increase Target (زيادة الهدف تلقائياً)</label>\n          </div></div>\n        </div>\n\n        <!-- Two Columns: Left Side vs Right Side -->\n        <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px;\">\n          <!-- LEFT SIDE PANEL -->\n          <div class=\"glass-card\" style=\"padding: 16px; border: 1px solid rgba(255, 45, 85, 0.25); background: rgba(255, 45, 85, 0.04); border-radius: 12px; display:flex; flex-direction:column; gap:12px;\">\n            <h4 style=\"color:#ff2d55; font-size:13px; text-transform:uppercase; letter-spacing:1px; margin: 0 0 4px 0; display: flex; align-items: center; gap: 6px; font-weight: bold; border-bottom: 1px solid rgba(255, 45, 85, 0.15); padding-bottom: 6px;\">\n              👈 Left Side (العداد الأيسر)\n            </h4>\n            \n            <div class=\"form-group\">\n              <label class=\"form-label\" style=\"color: #ff2d55; font-weight: 600;\">Left Name (الاسم)</label>\n              <input class=\"form-input\" id=\"sb-left-name\" value=\"" + escapeAttr(vO16.leftName || "Team A") + "\" style=\"border-color: rgba(255, 45, 85, 0.2);\">\n            </div>\n\n            <div class=\"form-row\" style=\"display:flex; gap:10px; margin-bottom:0;\">\n              <div class=\"form-group\" style=\"flex:1;\"><label class=\"form-label\" style=\"font-size:11px;\">Name Color (الاسم)</label><input type=\"color\" class=\"form-input\" id=\"sb-left-name-color\" value=\"" + (vO16.leftNameColor || vO16.nameColor || "#ffffff") + "\" style=\"height:34px;padding:2px; border-color: rgba(255, 45, 85, 0.2);\"></div>\n              <div class=\"form-group\" style=\"flex:1;\"><label class=\"form-label\" style=\"font-size:11px;\">Score Color (العداد)</label><input type=\"color\" class=\"form-input\" id=\"sb-left-score-color\" value=\"" + (vO16.leftScoreColor || vO16.scoreColor || "#ffffff") + "\" style=\"height:34px;padding:2px; border-color: rgba(255, 45, 85, 0.2);\"></div>\n            </div>\n\n            <div style=\"background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); display:flex; flex-direction:column; gap:8px;\">\n              <div style=\"font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase;\">✏️ Name Position (موقع الاسم)</div>\n              <div class=\"form-row\" style=\"display:flex; gap:10px; margin-bottom:0;\">\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Left/Right (يمين/يسار)</label><input type=\"number\" class=\"form-input\" id=\"sb-left-name-x\" value=\"" + (vO16.leftNameX || 0) + "\" min=\"-500\" max=\"500\" style=\"height:30px; font-size:12px;\"></div>\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Up/Down (فوق/تحت)</label><input type=\"number\" class=\"form-input\" id=\"sb-left-name-y\" value=\"" + (vO16.leftNameY || 0) + "\" min=\"-200\" max=\"200\" style=\"height:30px; font-size:12px;\"></div>\n              </div>\n            </div>\n\n            <div style=\"background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); display:flex; flex-direction:column; gap:8px;\">\n              <div style=\"font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase;\">🔢 Score Position (موقع العداد)</div>\n              <div class=\"form-row\" style=\"display:flex; gap:10px; margin-bottom:0;\">\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Left/Right (يمين/يسار)</label><input type=\"number\" class=\"form-input\" id=\"sb-left-score-x\" value=\"" + (vO16.leftScoreX || 0) + "\" min=\"-500\" max=\"500\" style=\"height:30px; font-size:12px;\"></div>\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Up/Down (فوق/تحت)</label><input type=\"number\" class=\"form-input\" id=\"sb-left-score-y\" value=\"" + (vO16.leftScoreY || 0) + "\" min=\"-200\" max=\"200\" style=\"height:30px; font-size:12px;\"></div>\n              </div>\n            </div>\n          </div>\n\n          <!-- RIGHT SIDE PANEL -->\n          <div class=\"glass-card\" style=\"padding: 16px; border: 1px solid rgba(37, 244, 238, 0.25); background: rgba(37, 244, 238, 0.04); border-radius: 12px; display:flex; flex-direction:column; gap:12px;\">\n            <h4 style=\"color:#25f4ee; font-size:13px; text-transform:uppercase; letter-spacing:1px; margin: 0 0 4px 0; display: flex; align-items: center; gap: 6px; font-weight: bold; border-bottom: 1px solid rgba(37, 244, 238, 0.15); padding-bottom: 6px;\">\n              👉 Right Side (العداد الأيمن)\n            </h4>\n            \n            <div class=\"form-group\">\n              <label class=\"form-label\" style=\"color: #25f4ee; font-weight: 600;\">Right Name (الاسم)</label>\n              <input class=\"form-input\" id=\"sb-right-name\" value=\"" + escapeAttr(vO16.rightName || "Team B") + "\" style=\"border-color: rgba(37, 244, 238, 0.2);\">\n            </div>\n\n            <div class=\"form-row\" style=\"display:flex; gap:10px; margin-bottom:0;\">\n              <div class=\"form-group\" style=\"flex:1;\"><label class=\"form-label\" style=\"font-size:11px;\">Name Color (الاسم)</label><input type=\"color\" class=\"form-input\" id=\"sb-right-name-color\" value=\"" + (vO16.rightNameColor || vO16.nameColor || "#ffffff") + "\" style=\"height:34px;padding:2px; border-color: rgba(37, 244, 238, 0.2);\"></div>\n              <div class=\"form-group\" style=\"flex:1;\"><label class=\"form-label\" style=\"font-size:11px;\">Score Color (العداد)</label><input type=\"color\" class=\"form-input\" id=\"sb-right-score-color\" value=\"" + (vO16.rightScoreColor || vO16.scoreColor || "#ffffff") + "\" style=\"height:34px;padding:2px; border-color: rgba(37, 244, 238, 0.2);\"></div>\n            </div>\n\n            <div style=\"background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); display:flex; flex-direction:column; gap:8px;\">\n              <div style=\"font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase;\">✏️ Name Position (موقع الاسم)</div>\n              <div class=\"form-row\" style=\"display:flex; gap:10px; margin-bottom:0;\">\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Left/Right (يمين/يسار)</label><input type=\"number\" class=\"form-input\" id=\"sb-right-name-x\" value=\"" + (vO16.rightNameX || 0) + "\" min=\"-500\" max=\"500\" style=\"height:30px; font-size:12px;\"></div>\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Up/Down (فوق/تحت)</label><input type=\"number\" class=\"form-input\" id=\"sb-right-name-y\" value=\"" + (vO16.rightNameY || 0) + "\" min=\"-200\" max=\"200\" style=\"height:30px; font-size:12px;\"></div>\n              </div>\n            </div>\n\n            <div style=\"background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.04); display:flex; flex-direction:column; gap:8px;\">\n              <div style=\"font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase;\">🔢 Score Position (موقع العداد)</div>\n              <div class=\"form-row\" style=\"display:flex; gap:10px; margin-bottom:0;\">\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Left/Right (يمين/يسار)</label><input type=\"number\" class=\"form-input\" id=\"sb-right-score-x\" value=\"" + (vO16.rightScoreX || 0) + "\" min=\"-500\" max=\"500\" style=\"height:30px; font-size:12px;\"></div>\n                <div class=\"form-group\" style=\"flex:1; margin-bottom:0;\"><label class=\"form-label\" style=\"font-size:10px; color:var(--text-muted);\">Up/Down (فوق/تحت)</label><input type=\"number\" class=\"form-input\" id=\"sb-right-score-y\" value=\"" + (vO16.rightScoreY || 0) + "\" min=\"-200\" max=\"200\" style=\"height:30px; font-size:12px;\"></div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Typography Section -->\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;font-weight:700;\">✏️ Font & Typography (الخطوط والكتابة)</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Font Family (نوع الخط)</label>\n            <div id=\"sb-font-picker\" style=\"position:relative;\">\n              <input class=\"form-input\" id=\"sb-font-family\" value=\"" + escapeAttr(vO16.fontFamily || "Inter") + "\" placeholder=\"Search fonts...\" autocomplete=\"off\">\n              <div id=\"sb-font-dropdown\" style=\"display:none;position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:var(--bg-secondary,#1a1a2e);border:1px solid var(--border,#333);border-radius:8px;z-index:9999;margin-top:2px;\"></div>\n            </div></div>\n          <div class=\"form-group\"><label class=\"form-label\">Name Font Size (حجم خط الاسم)</label><input type=\"number\" class=\"form-input\" id=\"sb-name-size\" value=\"" + (vO16.nameSize || 22) + "\" min=\"10\" max=\"80\"></div>\n        </div>\n        <div class=\"form-row\" style=\"margin-top:-6px;\">\n          <div class=\"form-group\" style=\"flex:1;\">\n            <button class=\"btn btn-ghost btn-sm\" id=\"sb-export-font\" style=\"width:100%;height:32px;font-size:11px;\">📤 Export Custom Font File (تصدير ملف خط مخصص)</button>\n          </div>\n          <div class=\"form-group\" style=\"flex:1;display:flex;align-items:center;font-size:11px;color:var(--text-muted);\" id=\"sb-export-font-status\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Score Font Size (حجم خط العداد)</label><input type=\"number\" class=\"form-input\" id=\"sb-score-size\" value=\"" + (vO16.scoreSize || 64) + "\" min=\"20\" max=\"200\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Text Align (محاذاة النص)</label>\n            <select class=\"form-input\" id=\"sb-text-align\"><option value=\"center\">Center</option><option value=\"left\">Left</option><option value=\"right\">Right</option></select></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Text Glow Style (تأثير النص المضيء)</label>\n            <select class=\"form-input\" id=\"sb-text-effect\">\n              <option value=\"classic\">Classic (كلاسيك)</option>\n              <option value=\"bold\">Bold (بولد)</option>\n              <option value=\"glowing\">Glowing (مضيء)</option>\n              <option value=\"neon\">Neon (نيون)</option>\n            </select></div>\n          <div class=\"form-group\"></div>\n        </div>\n\n        <!-- VS Badge Settings -->\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;font-weight:700;\">⚔️ VS Badge Settings (إعدادات أيقونة VS)</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"sb-hide-vs\" " + (vO16.hideVs ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"sb-hide-vs\">Hide VS Badge (إخفاء الشارة)</label>\n          </div></div>\n          <div class=\"form-group\"><label class=\"form-label\">Badge Size (الحجم)</label><input type=\"number\" class=\"form-input\" id=\"sb-vs-size\" value=\"" + (vO16.vsSize || 80) + "\" min=\"20\" max=\"300\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">VS Badge: Left ⟷ Right (يمين/يسار)</label><input type=\"number\" class=\"form-input\" id=\"sb-vs-x\" value=\"" + (vO16.vsX || 0) + "\" min=\"-500\" max=\"500\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">VS Badge: Up ↕ Down (فوق/تحت)</label><input type=\"number\" class=\"form-input\" id=\"sb-vs-y\" value=\"" + (vO16.vsY || 0) + "\" min=\"-500\" max=\"500\"></div>\n        </div>\n\n        <!-- Hotkey Controls -->\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;font-weight:700;\">⌨️ Hotkey Controls (أزرار التحكم السريعة للكيبورد)</h4>\n        <p style=\"color:var(--text-muted);font-size:11px;margin-bottom:4px;\">Click a field then press any key to bind it.</p>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Left +</label><input class=\"form-input\" id=\"sb-hk-left-up\" value=\"" + (v362.leftUp || "Numpad7") + "\" readonly style=\"cursor:pointer;\" onclick=\"this.value='Press...';this.dataset.listening='1';\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Left −</label><input class=\"form-input\" id=\"sb-hk-left-down\" value=\"" + (v362.leftDown || "Numpad4") + "\" readonly style=\"cursor:pointer;\" onclick=\"this.value='Press...';this.dataset.listening='1';\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Right +</label><input class=\"form-input\" id=\"sb-hk-right-up\" value=\"" + (v362.rightUp || "Numpad9") + "\" readonly style=\"cursor:pointer;\" onclick=\"this.value='Press...';this.dataset.listening='1';\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Right −</label><input class=\"form-input\" id=\"sb-hk-right-down\" value=\"" + (v362.rightDown || "Numpad6") + "\" readonly style=\"cursor:pointer;\" onclick=\"this.value='Press...';this.dataset.listening='1';\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Reset (إعادة تصفير العداد)</label><input class=\"form-input\" id=\"sb-hk-reset\" value=\"" + (v362.reset || "Numpad8") + "\" readonly style=\"cursor:pointer;\" onclick=\"this.value='Press...';this.dataset.listening='1';\"></div>\n          <div class=\"form-group\"></div>\n        </div>\n\n        <!-- Sound Effects -->\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;font-weight:700;\">🔊 Sound Effects (المؤثرات الصوتية)</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"sb-sound-enabled\" " + (vO16.soundEnabled !== false ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"sb-sound-enabled\">Enable Sounds (تفعيل الأصوات)</label>\n          </div></div>\n        </div>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <div class=\"form-group\"><label class=\"form-label\">🔼 Increment Sound</label>\n            <button class=\"btn btn-ghost btn-sm\" id=\"sb-upload-inc-sound\" style=\"width:100%;height:34px;\">📁 Choose Sound</button>\n            <div id=\"sb-inc-sound-path\" style=\"font-size:10px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">" + (vLS8 ? vLS8.split(/[\\\/]/).pop() : "Default (built-in)") + "</div></div>\n          <div class=\"form-group\"><label class=\"form-label\">&nbsp;</label>\n            <button class=\"btn btn-danger btn-sm\" id=\"sb-clear-inc-sound\" style=\"width:100%;height:34px;\">Reset Default</button></div>\n        </div>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <div class=\"form-group\"><label class=\"form-label\">🔽 Decrement Sound</label>\n            <button class=\"btn btn-ghost btn-sm\" id=\"sb-upload-dec-sound\" style=\"width:100%;height:34px;\">📁 Choose Sound</button>\n            <div id=\"sb-dec-sound-path\" style=\"font-size:10px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">" + (vLS9 ? vLS9.split(/[\\\/]/).pop() : "Default (built-in)") + "</div></div>\n          <div class=\"form-group\"><label class=\"form-label\">&nbsp;</label>\n            <button class=\"btn btn-danger btn-sm\" id=\"sb-clear-dec-sound\" style=\"width:100%;height:34px;\">Reset Default</button></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\" style=\"flex:1;\">\n            <label class=\"form-label\">🎚️ Volume: <span id=\"sb-sound-vol-label\">" + (vO16.soundVolume ?? 70) + "%</span></label>\n            <input type=\"range\" class=\"form-input\" id=\"sb-sound-volume\" min=\"0\" max=\"100\" value=\"" + (vO16.soundVolume ?? 70) + "\" style=\"width:100%;cursor:pointer;\">\n          </div>\n        </div>\n\n        <!-- Background Section -->\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;font-weight:700;\">🖼️ Background (الخلفية)</h4>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <div class=\"form-group\"><button class=\"btn btn-ghost\" id=\"sb-upload-bg\" style=\"width:100%;height:36px;\">📁 Choose Image</button>\n            <div id=\"sb-bg-path\" style=\"font-size:10px;color:var(--text-muted);margin-top:4px;\">" + (vLS7 || "No background") + "</div></div>\n          <div class=\"form-group\"><button class=\"btn btn-danger btn-sm\" id=\"sb-clear-bg\" style=\"width:100%;height:36px;\">Clear</button></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Image Scale (مقياس الصورة)</label><input type=\"number\" class=\"form-input\" id=\"sb-bg-scale\" value=\"" + (vO16.bgScale || 1) + "\" min=\"0.1\" max=\"5\" step=\"0.1\"></div>\n          <div class=\"form-group\"></div>\n        </div>\n      </div>\n      <div class=\"ks-footer\">\n        <button class=\"btn btn-primary\" id=\"sb-save\">💾 Apply & Save (تطبيق وحفظ)</button>\n        <button class=\"btn btn-ghost\" id=\"sb-cancel\">Cancel</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl21);
    document.getElementById("sb-style").value = vO16.style || "style-1";
    document.getElementById("sb-mode").value = vO16.mode || "dual";
    document.getElementById("sb-text-align").value = vO16.textAlign || "center";
    document.getElementById("sb-text-effect").value = vO16.textEffect || "glowing";
    const vF21 = p259 => {
      const v364 = document.activeElement;
      if (v364 && v364.dataset.listening === "1") {
        p259.preventDefault();
        v364.value = p259.code;
        v364.dataset.listening = "0";
      }
    };
    document.addEventListener("keydown", vF21);
    document.getElementById("sb-upload-inc-sound").onclick = async () => {
      const openFileResult7 = await api.dialog.openFile({
        filters: [{
          name: "Audio",
          extensions: ["mp3", "wav", "ogg"]
        }]
      });
      if (openFileResult7) {
        vLS8 = openFileResult7;
        document.getElementById("sb-inc-sound-path").textContent = openFileResult7.split(/[\\\/]/).pop();
      }
    };
    document.getElementById("sb-clear-inc-sound").onclick = () => {
      vLS8 = "";
      document.getElementById("sb-inc-sound-path").textContent = "Default (built-in)";
    };
    document.getElementById("sb-upload-dec-sound").onclick = async () => {
      const openFileResult8 = await api.dialog.openFile({
        filters: [{
          name: "Audio",
          extensions: ["mp3", "wav", "ogg"]
        }]
      });
      if (openFileResult8) {
        vLS9 = openFileResult8;
        document.getElementById("sb-dec-sound-path").textContent = openFileResult8.split(/[\\\/]/).pop();
      }
    };
    document.getElementById("sb-clear-dec-sound").onclick = () => {
      vLS9 = "";
      document.getElementById("sb-dec-sound-path").textContent = "Default (built-in)";
    };
    document.getElementById("sb-sound-volume").addEventListener("input", () => {
      document.getElementById("sb-sound-vol-label").textContent = document.getElementById("sb-sound-volume").value + "%";
    });
    {
      const v367 = document.getElementById("sb-font-family");
      const v368 = document.getElementById("sb-font-dropdown");
      let vA9 = [];
      let v369 = false;
      let v370 = v367.value;
      api.system.getFonts().then(result => {
        vA9 = result || [];
      });
      function f22(p261) {
        const s102 = f25();
        s102.fontFamily = p261;
        api.widget.setConfig("scoreboard", s102);
      }
      function f23() {
        const s103 = f25();
        s103.fontFamily = v370;
        api.widget.setConfig("scoreboard", s103);
      }
      function f24(p262) {
        const v371 = (p262 || "").toLowerCase();
        const v372 = v371 ? vA9.filter(item => item.toLowerCase().includes(v371)) : vA9;
        v368.innerHTML = "";
        if (v372.length === 0) {
          v368.innerHTML = "<div style=\"padding:8px 12px;color:var(--text-muted,#888);font-size:12px;\">No fonts found</div>";
          return;
        }
        const v373 = document.createDocumentFragment();
        v372.slice(0, 80).forEach(item => {
          const divEl22 = document.createElement("div");
          divEl22.textContent = item;
          divEl22.style.cssText = "padding:6px 12px;cursor:pointer;font-size:13px;font-family:\"" + item + "\",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary,#eee);transition:background .15s;";
          divEl22.addEventListener("mouseenter", () => {
            divEl22.style.background = "var(--accent,#6c5ce7)";
            divEl22.style.color = "#fff";
            f22(item);
          });
          divEl22.addEventListener("mouseleave", () => {
            divEl22.style.background = "transparent";
            divEl22.style.color = "var(--text-primary,#eee)";
          });
          divEl22.addEventListener("mousedown", event => {
            event.preventDefault();
            v370 = item;
            v367.value = item;
            v368.style.display = "none";
            v369 = false;
            f26();
          });
          v373.appendChild(divEl22);
        });
        if (v372.length > 80) {
          const divEl23 = document.createElement("div");
          divEl23.textContent = "... and " + (v372.length - 80) + " more (type to filter)";
          divEl23.style.cssText = "padding:6px 12px;color:var(--text-muted,#888);font-size:11px;font-style:italic;";
          v373.appendChild(divEl23);
        }
        v368.appendChild(v373);
      }
      v367.addEventListener("focus", () => {
        v370 = v367.value;
        v369 = true;
        f24(v367.value);
        v368.style.display = "block";
      });
      v367.addEventListener("input", () => {
        f24(v367.value);
        v368.style.display = "block";
      });
      v368.addEventListener("mouseleave", () => {
        f23();
      });
      v367.addEventListener("blur", () => {
        setTimeout(() => {
          v368.style.display = "none";
          v369 = false;
          f23();
        }, 200);
      });
    }
    document.getElementById("sb-upload-bg").onclick = async () => {
      const openFileResult9 = await api.dialog.openFile({
        filters: [{
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp"]
        }]
      });
      if (openFileResult9) {
        vLS7 = openFileResult9;
        document.getElementById("sb-bg-path").textContent = openFileResult9;
      }
    };
    document.getElementById("sb-clear-bg").onclick = () => {
      vLS7 = "";
      document.getElementById("sb-bg-path").textContent = "No background";
    };
    document.getElementById("sb-export-font").onclick = async p266 => {
      p266.preventDefault();
      const v377 = document.getElementById("sb-export-font-status");
      v377.textContent = "Searching font file...";
      v377.style.color = "var(--text-secondary)";
      const exportFontResult = await api.profile.exportFont();
      if (exportFontResult.success) {
        v377.textContent = "✅ Exported: " + exportFontResult.fileName;
        v377.style.color = "var(--accent-green)";
        addFeedItem("system", "Font", "Exported font: " + exportFontResult.fileName, "📤");
      } else if (exportFontResult.reason === "Google Font / Web Safe Font") {
        v377.textContent = "ℹ️ Cloud font (needs no export!)";
        v377.style.color = "var(--accent)";
      } else {
        v377.textContent = "❌ " + (exportFontResult.error || "Failed");
        v377.style.color = "var(--accent-red)";
      }
    };
    document.getElementById("sb-export-profile-btn").onclick = async p267 => {
      p267.preventDefault();
      const s104 = f25();
      await api.widget.setConfig("scoreboard", s104);
      const exportScoreboardProfileResult = await api.profile.exportScoreboardProfile();
      if (exportScoreboardProfileResult.success) {
        addFeedItem("system", "Export", "Exported scoreboard profile successfully", "📤");
      } else if (exportScoreboardProfileResult.error) {
        uiAlert("❌ Failed to export profile: " + exportScoreboardProfileResult.error);
      }
    };
    document.getElementById("sb-import-profile-btn").onclick = async p268 => {
      p268.preventDefault();
      const importScoreboardProfileResult = await api.profile.importScoreboardProfile();
      if (importScoreboardProfileResult.success) {
        addFeedItem("system", "Import", "Imported scoreboard profile successfully", "📥");
        vF22();
        f21();
      } else if (importScoreboardProfileResult.error) {
        uiAlert("❌ Failed to import profile: " + importScoreboardProfileResult.error);
      }
    };
    function f25() {
      return {
        style: document.getElementById("sb-style").value,
        mode: document.getElementById("sb-mode").value,
        enableTarget: document.getElementById("sb-enable-target").checked,
        autoIncreaseTarget: document.getElementById("sb-auto-increase-target").checked,
        targetScore: parseInt(document.getElementById("sb-target-score").value) || 100,
        step: parseInt(document.getElementById("sb-step").value) || 1,
        leftName: document.getElementById("sb-left-name").value,
        rightName: document.getElementById("sb-right-name").value,
        fontFamily: document.getElementById("sb-font-family").value,
        nameSize: parseInt(document.getElementById("sb-name-size").value) || 22,
        scoreSize: parseInt(document.getElementById("sb-score-size").value) || 64,
        textAlign: document.getElementById("sb-text-align").value,
        textEffect: document.getElementById("sb-text-effect").value,
        nameColor: document.getElementById("sb-left-name-color").value,
        scoreColor: document.getElementById("sb-left-score-color").value,
        leftNameColor: document.getElementById("sb-left-name-color").value,
        rightNameColor: document.getElementById("sb-right-name-color").value,
        leftScoreColor: document.getElementById("sb-left-score-color").value,
        rightScoreColor: document.getElementById("sb-right-score-color").value,
        leftNameX: parseInt(document.getElementById("sb-left-name-x").value) || 0,
        leftNameY: parseInt(document.getElementById("sb-left-name-y").value) || 0,
        rightNameX: parseInt(document.getElementById("sb-right-name-x").value) || 0,
        rightNameY: parseInt(document.getElementById("sb-right-name-y").value) || 0,
        leftScoreX: parseInt(document.getElementById("sb-left-score-x").value) || 0,
        leftScoreY: parseInt(document.getElementById("sb-left-score-y").value) || 0,
        rightScoreX: parseInt(document.getElementById("sb-right-score-x").value) || 0,
        rightScoreY: parseInt(document.getElementById("sb-right-score-y").value) || 0,
        hideVs: document.getElementById("sb-hide-vs").checked,
        vsSize: parseInt(document.getElementById("sb-vs-size").value) || 80,
        vsX: parseInt(document.getElementById("sb-vs-x").value) || 0,
        vsY: parseInt(document.getElementById("sb-vs-y").value) || 0,
        bgImage: vLS7 || "",
        bgScale: parseFloat(document.getElementById("sb-bg-scale").value) || 1,
        soundEnabled: document.getElementById("sb-sound-enabled").checked,
        incrementSound: vLS8 || "",
        decrementSound: vLS9 || "",
        soundVolume: parseInt(document.getElementById("sb-sound-volume").value) ?? 70
      };
    }
    let v381 = null;
    function f26() {
      clearTimeout(v381);
      v381 = setTimeout(async () => {
        await api.widget.setConfig("scoreboard", f25());
      }, 150);
    }
    divEl21.querySelectorAll("input:not([readonly]), select").forEach(item => {
      item.addEventListener("input", f26);
      item.addEventListener("change", f26);
    });
    const vF22 = () => {
      divEl21.remove();
    };
    document.getElementById("sb-close").onclick = vF22;
    document.getElementById("sb-cancel").onclick = vF22;
    document.getElementById("sb-save").onclick = async () => {
      const vF25 = f25();
      await api.widget.setConfig("scoreboard", vF25);
      const vO17 = {
        leftUp: document.getElementById("sb-hk-left-up").value,
        leftDown: document.getElementById("sb-hk-left-down").value,
        rightUp: document.getElementById("sb-hk-right-up").value,
        rightDown: document.getElementById("sb-hk-right-down").value,
        reset: document.getElementById("sb-hk-reset").value
      };
      await api.store.set("ext_scoreboard_hotkeys", vO17);
      await api.ext.scoreboard.registerHotkeys(vO17);
      addFeedItem("system", "Extension", "Scoreboard settings saved", "🏆");
      vF22();
    };
  }
  async function f27() {
    const getConfigResult14 = await api.widget.getConfig("scoreboard");
    if (getConfigResult14) {
      await api.widget.setConfig("scoreboard", getConfigResult14);
    }
    const getResult6 = await api.store.get("ext_scoreboard_hotkeys");
    if (getResult6) {
      await api.ext.scoreboard.registerHotkeys(getResult6);
    }
  }
  f27();
})();
(function () {
  let vA10 = [];
  document.getElementById("ext-br-start")?.addEventListener("click", async () => {
    await api.ext.command("battle-royale", "start");
    const v384 = document.getElementById("ext-br-start");
    v384.textContent = "✅ Started!";
    setTimeout(() => v384.textContent = "▶ Start", 2000);
  });
  document.getElementById("ext-br-reset")?.addEventListener("click", async () => {
    await api.ext.command("battle-royale", "reset");
    const v385 = document.getElementById("ext-br-reset");
    v385.textContent = "✅ Reset!";
    setTimeout(() => v385.textContent = "⟲ Reset", 2000);
  });
  document.getElementById("ext-br-test")?.addEventListener("click", async () => {
    await api.ext.command("battle-royale", "test");
    const v386 = document.getElementById("ext-br-test");
    v386.textContent = "✅ Sent!";
    setTimeout(() => v386.textContent = "🎯 Test", 2000);
  });
  document.getElementById("ext-br-add-manual")?.addEventListener("click", async () => {
    const v387 = document.getElementById("ext-br-manual-name");
    const v388 = v387?.value?.trim();
    if (!v388) {
      return;
    }
    await api.ext.command("battle-royale", "add-manual", {
      name: v388
    });
    v387.value = "";
  });
  document.getElementById("btn-br-settings")?.addEventListener("click", () => f28());
  async function f28() {
    const v389 = (await api.widget.getConfig("battle-royale")) || {};
    vA10 = v389.levels || [];
    let v390 = v389.frameImage || "";
    const divEl24 = document.createElement("div");
    divEl24.className = "ks-overlay";
    divEl24.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:720px;max-height:88vh;overflow-y:auto;\">\n      <div class=\"ks-header\"><h3>🎮 Battle Royale Settings</h3><button class=\"modal-close\" id=\"br-close\">&times;</button></div>\n      <div style=\"padding:16px;display:flex;flex-direction:column;gap:14px;\">\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;\">⚙️ Game Mode</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Mode</label>\n            <select class=\"form-input\" id=\"br-mode\">\n              <option value=\"manual\">Manual Gift</option>\n              <option value=\"levels\">Level System</option>\n            </select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Round Time (sec)</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-round-time\" value=\"" + (v389.roundTime || 20) + "\" min=\"5\" max=\"300\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Pause Between Rounds (sec)</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-pause\" value=\"" + (v389.pauseBetweenRounds || 3) + "\" min=\"1\" max=\"30\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Rounds Per Level</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-rounds-per-level\" value=\"" + (v389.roundsPerLevel || 10) + "\" min=\"1\" max=\"100\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;\">🎁 Manual Gift</h4>\n        <div class=\"form-row\" id=\"br-manual-gift-section\">\n          <div class=\"form-group\"><label class=\"form-label\">Current Gift</label>\n            <button class=\"btn btn-ghost btn-sm\" id=\"br-pick-manual-gift\" style=\"width:100%;height:36px;\">🎁 Pick Gift</button>\n            <div id=\"br-manual-gift-display\" style=\"font-size:11px;color:var(--text-muted);margin-top:4px;display:flex;align-items:center;gap:6px;\">\n              " + (v389.manualGift?.name ? "<img src=\"" + (v389.manualGift.img || "") + "\" style=\"width:20px;height:20px;\"><span>" + escapeHtml(v389.manualGift.name) + " (🪙" + v389.manualGift.diamonds + ")</span>" : "No gift selected") + "\n            </div></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;\">📊 Level System</h4>\n        <div id=\"br-levels-list\" class=\"ext-gift-list\"></div>\n        <button class=\"btn btn-ghost btn-sm\" id=\"br-add-level\" style=\"color:#a855f7;border-color:#a855f7;\">+ Add Level</button>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;\">🖼️ Frame & Display</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Frame Shape</label>\n            <select class=\"form-input\" id=\"br-frame-shape\">\n              <option value=\"square\">Square</option>\n              <option value=\"rect\">Rectangle</option>\n              <option value=\"transparent\">Transparent</option>\n            </select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Participant Shape</label>\n            <select class=\"form-input\" id=\"br-part-shape\">\n              <option value=\"circle\">Circle</option>\n              <option value=\"square\">Square</option>\n              <option value=\"rect\">Rectangle</option>\n            </select></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Frame Width</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-frame-w\" value=\"" + (v389.frameWidth || 600) + "\" min=\"200\" max=\"1200\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Frame Height</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-frame-h\" value=\"" + (v389.frameHeight || 600) + "\" min=\"200\" max=\"1200\"></div>\n        </div>\n        <div class=\"form-row\" style=\"align-items:center;\">\n          <div class=\"form-group\"><label class=\"form-label\">Frame Image</label>\n            <button class=\"btn btn-ghost btn-sm\" id=\"br-upload-frame\" style=\"width:100%;height:34px;\">📁 Upload Frame</button>\n            <div id=\"br-frame-path\" style=\"font-size:10px;color:var(--text-muted);margin-top:4px;\">" + (v390 || "No frame image") + "</div></div>\n          <div class=\"form-group\"><label class=\"form-label\">&nbsp;</label>\n            <button class=\"btn btn-danger btn-sm\" id=\"br-clear-frame\" style=\"width:100%;height:34px;\">Clear</button></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;\">🎁 Gift Display</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"br-show-gift-img\" " + (v389.showGiftImage !== false ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"br-show-gift-img\">Show Gift Image</label>\n          </div></div>\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"br-show-gift-name\" " + (v389.showGiftName !== false ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"br-show-gift-name\">Show Gift Name</label>\n          </div></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"br-show-gift-coins\" " + (v389.showGiftCoins !== false ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"br-show-gift-coins\">Show Coins</label>\n          </div></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Gift Bar X Offset</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-gift-x\" value=\"" + (v389.giftPosX || 0) + "\" min=\"-500\" max=\"500\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Gift Bar Y Offset</label>\n            <input type=\"number\" class=\"form-input\" id=\"br-gift-y\" value=\"" + (v389.giftPosY || 0) + "\" min=\"-500\" max=\"500\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;\">🔊 Sound Effects (الأصوات)</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><div class=\"form-checkbox-group\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"br-sound-enabled\" " + (v389.soundEnabled !== false ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"br-sound-enabled\">Enable Sounds</label>\n          </div></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\" style=\"flex:1;\">\n            <label class=\"form-label\">Volume: <span id=\"br-vol-label\">" + (v389.soundVolume ?? 70) + "%</span></label>\n            <input type=\"range\" class=\"form-input\" id=\"br-sound-volume\" min=\"0\" max=\"100\" value=\"" + (v389.soundVolume ?? 70) + "\" style=\"width:100%;cursor:pointer;\">\n          </div>\n        </div>\n      </div>\n      <div class=\"ks-footer\">\n        <button class=\"btn btn-primary\" id=\"br-save\">💾 Apply & Save</button>\n        <button class=\"btn btn-ghost\" id=\"br-cancel\">Cancel</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl24);
    document.getElementById("br-mode").value = v389.mode || "manual";
    document.getElementById("br-frame-shape").value = v389.frameShape || "square";
    document.getElementById("br-part-shape").value = v389.participantShape || "circle";
    function f29() {
      const v392 = document.getElementById("br-levels-list");
      if (!v392) {
        return;
      }
      v392.innerHTML = vA10.map((item, index) => "\n        <div style=\"display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;\">\n          <span style=\"font-weight:800;font-size:11px;color:#a855f7;min-width:50px;\">LVL " + (index + 1) + "</span>\n          " + (item.img ? "<img src=\"" + item.img + "\" style=\"width:28px;height:28px;object-fit:contain;\">" : "<span>🎁</span>") + "\n          <span style=\"flex:1;font-weight:600;font-size:13px;\">" + escapeHtml(item.name) + "</span>\n          <span style=\"color:#ffd64d;font-weight:700;font-size:12px;\">🪙 " + item.diamonds + "</span>\n          <button class=\"btn btn-danger btn-sm\" data-idx=\"" + index + "\" style=\"padding:4px 8px;font-size:11px;\">✕</button>\n        </div>").join("");
      v392.querySelectorAll(".btn-danger").forEach(item => {
        item.onclick = () => {
          vA10.splice(parseInt(item.dataset.idx), 1);
          f29();
        };
      });
    }
    f29();
    document.getElementById("br-add-level").onclick = async () => {
      const v393 = await showGiftPickerDialog();
      if (!v393) {
        return;
      }
      vA10.push({
        name: v393.name,
        img: v393.img || "",
        diamonds: v393.coins || 1
      });
      f29();
    };
    document.getElementById("br-pick-manual-gift").onclick = async () => {
      const v394 = await showGiftPickerDialog();
      if (!v394) {
        return;
      }
      const v395 = v394.coins || 1;
      v389.manualGift = {
        name: v394.name,
        img: v394.img || "",
        diamonds: v395
      };
      document.getElementById("br-manual-gift-display").innerHTML = "<img src=\"" + (v394.img || "") + "\" style=\"width:20px;height:20px;\"><span>" + escapeHtml(v394.name) + " (🪙" + v395 + ")</span>";
    };
    document.getElementById("br-upload-frame").onclick = async () => {
      const openFileResult10 = await api.dialog.openFile({
        filters: [{
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp"]
        }]
      });
      if (openFileResult10) {
        v390 = openFileResult10;
        document.getElementById("br-frame-path").textContent = openFileResult10;
      }
    };
    document.getElementById("br-clear-frame").onclick = () => {
      v390 = "";
      document.getElementById("br-frame-path").textContent = "No frame image";
    };
    document.getElementById("br-sound-volume").addEventListener("input", () => {
      document.getElementById("br-vol-label").textContent = document.getElementById("br-sound-volume").value + "%";
    });
    function f30() {
      return {
        mode: document.getElementById("br-mode").value,
        roundTime: parseInt(document.getElementById("br-round-time").value) || 20,
        pauseBetweenRounds: parseInt(document.getElementById("br-pause").value) || 3,
        roundsPerLevel: parseInt(document.getElementById("br-rounds-per-level").value) || 10,
        manualGift: v389.manualGift || null,
        levels: vA10,
        frameShape: document.getElementById("br-frame-shape").value,
        participantShape: document.getElementById("br-part-shape").value,
        frameWidth: parseInt(document.getElementById("br-frame-w").value) || 600,
        frameHeight: parseInt(document.getElementById("br-frame-h").value) || 600,
        frameImage: v390 || "",
        showGiftImage: document.getElementById("br-show-gift-img").checked,
        showGiftName: document.getElementById("br-show-gift-name").checked,
        showGiftCoins: document.getElementById("br-show-gift-coins").checked,
        giftPosX: parseInt(document.getElementById("br-gift-x").value) || 0,
        giftPosY: parseInt(document.getElementById("br-gift-y").value) || 0,
        soundEnabled: document.getElementById("br-sound-enabled").checked,
        soundVolume: parseInt(document.getElementById("br-sound-volume").value) ?? 70
      };
    }
    let v397 = null;
    function f31() {
      clearTimeout(v397);
      v397 = setTimeout(async () => {
        await api.widget.setConfig("battle-royale", f30());
      }, 200);
    }
    divEl24.querySelectorAll("input, select").forEach(item => {
      item.addEventListener("input", f31);
      item.addEventListener("change", f31);
    });
    const vF23 = () => divEl24.remove();
    document.getElementById("br-close").onclick = vF23;
    document.getElementById("br-cancel").onclick = vF23;
    document.getElementById("br-save").onclick = async () => {
      await api.widget.setConfig("battle-royale", f30());
      addFeedItem("system", "Extension", "Battle Royale settings saved", "🎮");
      vF23();
    };
  }
  (async () => {
    const getConfigResult15 = await api.widget.getConfig("battle-royale");
    if (getConfigResult15) {
      await api.widget.setConfig("battle-royale", getConfigResult15);
    }
  })();
})();
(function () {
  let vA11 = [];
  function f32() {
    return "spinner_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  }
  function f33(p274) {
    return {
      id: f32(),
      name: p274 || "Spinner " + (vA11.length + 1),
      triggerGifts: [],
      totalLuck: 1000,
      spinTime: 5,
      winnerTime: 10,
      winnerText: "WINNER!",
      hideWinnerText: false,
      width: 800,
      height: 140,
      style: "standard",
      boxColor: "#1a1a2e",
      arrowColor: "#ffb100",
      arrowSize: 40,
      imageShape: "normal",
      gifts: []
    };
  }
  async function f34() {
    const vO18 = {
      spinners: vA11
    };
    await api.store.set("widget_gift-spinners", vO18);
    for (const v399 of vA11) {
      await api.widget.setConfig("gift-spinner-" + v399.id, v399);
    }
  }
  async function f35() {
    const getConfigResult16 = await api.widget.getConfig("gift-spinner");
    if (getConfigResult16 && getConfigResult16.triggerGift !== undefined) {
      const vO19 = {
        ...f33("Spinner 1"),
        ...getConfigResult16
      };
      vO19.id = f32();
      vO19.name = "Spinner 1";
      if (getConfigResult16.triggerGift) {
        vO19.triggerGifts = [{
          name: getConfigResult16.triggerGift,
          img: getConfigResult16.triggerGiftImg || ""
        }];
      } else {
        vO19.triggerGifts = [];
      }
      delete vO19.triggerGift;
      delete vO19.triggerGiftImg;
      vA11 = [vO19];
      await f34();
      await api.widget.setConfig("gift-spinner-" + vO19.id, vO19);
    }
  }
  function f36() {
    window.__giftSpinnersCache = vA11;
    const v401 = document.getElementById("gift-spinner-list");
    if (!v401) {
      return;
    }
    if (vA11.length === 0) {
      v401.innerHTML = "\n        <div class=\"glass-card profile-card\" style=\"text-align:center;padding:40px;\">\n          <p style=\"color:var(--text-muted);font-size:14px;margin-bottom:16px;\">No spinners yet. Click \"+ New Spinner\" to create one.</p>\n        </div>";
      return;
    }
    v401.innerHTML = vA11.map((item, index) => {
      const v402 = (item.triggerGifts || []).map(item => item.name).join(", ") || "No trigger set";
          const v403 = widgetUrl("gift-spinner", "id=gift-spinner-" + item.id);
      return "\n        <div class=\"glass-card profile-card\" data-spinner-idx=\"" + index + "\" style=\"position:relative;\">\n          <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;\">\n            <div style=\"flex:1;\">\n              <div style=\"display:flex;align-items:center;gap:10px;margin-bottom:4px;\">\n                <h3 class=\"form-section-title\" style=\"margin-bottom:0;\">🎡 " + escapeHtml(item.name) + "</h3>\n                <span style=\"font-size:11px;color:var(--text-muted);background:rgba(168,85,247,0.15);padding:2px 8px;border-radius:4px;font-weight:600;\">\n                  " + (item.gifts?.length || 0) + " items\n                </span>\n              </div>\n              <p style=\"color:var(--text-secondary);font-size:12px;margin:0;\">\n                <span style=\"color:#ffd64d;\">🎁 Triggers:</span> " + escapeHtml(v402) + "\n              </p>\n            </div>\n            <button class=\"btn btn-danger btn-sm gs-delete-spinner\" data-idx=\"" + index + "\" style=\"padding:6px 10px;font-size:11px;margin-left:12px;\" title=\"Delete Spinner\">🗑️</button>\n          </div>\n\n          <div class=\"form-row\" style=\"align-items:center; margin-bottom:12px;\">\n            <input type=\"text\" class=\"form-input\" readonly style=\"flex:1;font-size:12px;padding:8px;\" value=\"" + v403 + "\">\n            <button class=\"btn btn-ghost gs-copy-url\" style=\"margin-left:8px; height:34px; line-height:1;\" data-url=\"" + v403 + "\">Copy URL</button>\n          </div>\n\n          <button class=\"btn btn-primary gs-open-settings\" data-idx=\"" + index + "\" style=\"width:100%; height:44px; margin-bottom:10px;\">⚙️ Settings & Gifts Configuration</button>\n\n          <div class=\"form-row\" style=\"margin-bottom:0;\">\n            <div class=\"form-group\" style=\"display:flex; gap:8px;\">\n              <button class=\"btn btn-ghost gs-test-spin\" data-idx=\"" + index + "\" style=\"flex:1; height:40px; color:var(--accent-cyan); border-color:var(--accent-cyan);\">🎯 Test Spin</button>\n            </div>\n          </div>\n        </div>";
    }).join("");
    v401.querySelectorAll(".gs-copy-url").forEach(item => {
      item.onclick = () => {
        navigator.clipboard.writeText(item.dataset.url);
        item.textContent = "Copied!";
        setTimeout(() => item.textContent = "Copy URL", 2000);
      };
    });
    v401.querySelectorAll(".gs-open-settings").forEach(item => {
      item.onclick = () => f37(parseInt(item.dataset.idx));
    });
    v401.querySelectorAll(".gs-test-spin").forEach(item => {
      item.onclick = async () => {
        const vParseInt6 = parseInt(item.dataset.idx);
        const v404 = vA11[vParseInt6];
        if (v404) {
          await api.ext.command("gift-spinner", "test", {
            spinnerId: v404.id
          });
          const v405 = item.textContent;
          item.textContent = "✅ Sent!";
          setTimeout(() => item.textContent = v405, 2000);
        }
      };
    });
    v401.querySelectorAll(".gs-delete-spinner").forEach(item => {
      item.onclick = async () => {
        const vParseInt7 = parseInt(item.dataset.idx);
        const v406 = vA11[vParseInt7];
        if (v406 && (await uiConfirm("Delete \"" + v406.name + "\"? This cannot be undone."))) {
          vA11.splice(vParseInt7, 1);
          await f34();
          f36();
          addFeedItem("system", "Extension", "Spinner \"" + v406.name + "\" deleted", "🗑️");
        }
      };
    });
  }
  document.getElementById("btn-add-spinner")?.addEventListener("click", async () => {
    const vF33 = f33();
    vA11.push(vF33);
    await f34();
    f36();
    addFeedItem("system", "Extension", "New spinner \"" + vF33.name + "\" created", "🎡");
    f37(vA11.length - 1);
  });
  let vA12 = [];
  let vA13 = [];
  async function f37(p282) {
    const v407 = vA11[p282];
    if (!v407) {
      return;
    }
    vA12 = JSON.parse(JSON.stringify(v407.gifts || []));
    vA13 = JSON.parse(JSON.stringify(v407.triggerGifts || []));
    const divEl25 = document.createElement("div");
    divEl25.className = "ks-overlay";
    divEl25.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:750px;max-height:88vh;overflow-y:auto;\">\n      <div class=\"ks-header\"><h3>🎡 " + escapeHtml(v407.name) + " — Settings</h3><button class=\"modal-close\" id=\"gs-close\">&times;</button></div>\n      <div style=\"padding:16px;display:flex;flex-direction:column;gap:14px;\">\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;\">📝 Spinner Name</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Name</label>\n            <input type=\"text\" class=\"form-input\" id=\"gs-spinner-name\" value=\"" + escapeAttr(v407.name) + "\" placeholder=\"Spinner name\">\n          </div>\n          <div class=\"form-group\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;\">🎁 Trigger Gifts (هدايا التشغيل)</h4>\n        <p style=\"color:var(--text-muted);font-size:11px;margin:-8px 0 0 0;\">Any of these gifts will trigger this spinner when sent by a viewer.</p>\n        <div id=\"gs-trigger-list\" style=\"display:flex;flex-wrap:wrap;gap:8px;min-height:36px;padding:8px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px dashed rgba(255,255,255,0.1);\"></div>\n        <button class=\"btn btn-ghost btn-sm\" id=\"gs-add-trigger\" style=\"color:#ffd64d;border-color:#ffd64d;align-self:flex-start;\">🎁 + Add Trigger Gift</button>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:4px;\">⚙️ General Configuration</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Total Luck Pool</label>\n            <input type=\"number\" class=\"form-input\" id=\"gs-total-luck\" value=\"" + (v407.totalLuck || 1000) + "\" min=\"100\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Spin Time (sec)</label>\n            <input type=\"number\" class=\"form-input\" id=\"gs-spin-time\" value=\"" + (v407.spinTime || 5) + "\" min=\"1\" max=\"20\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Winner Display Time (sec)</label>\n            <input type=\"number\" class=\"form-input\" id=\"gs-winner-time\" value=\"" + (v407.winnerTime || 10) + "\" min=\"1\" max=\"60\"></div>\n          <div class=\"form-group\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;\">🎨 Appearance</h4>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Winner Text</label>\n            <input type=\"text\" class=\"form-input\" id=\"gs-winner-text\" value=\"" + (v407.winnerText !== undefined ? escapeAttr(v407.winnerText) : "WINNER!") + "\"></div>\n          <div class=\"form-group\"><div class=\"form-checkbox-group\" style=\"margin-top:28px;\">\n            <input type=\"checkbox\" class=\"form-checkbox\" id=\"gs-hide-winner-text\" " + (v407.hideWinnerText ? "checked" : "") + ">\n            <label class=\"form-checkbox-label\" for=\"gs-hide-winner-text\">Hide Winner Text</label>\n          </div></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Width (px)</label>\n            <input type=\"number\" class=\"form-input\" id=\"gs-width\" value=\"" + (v407.width || 800) + "\" min=\"200\" max=\"1920\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Height (px)</label>\n            <input type=\"number\" class=\"form-input\" id=\"gs-height\" value=\"" + (v407.height || 140) + "\" min=\"50\" max=\"500\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Bar Style</label>\n            <select class=\"form-input\" id=\"gs-style\">\n              <option value=\"standard\">Standard</option>\n              <option value=\"glow\">Glow</option>\n              <option value=\"neon\">Neon</option>\n              <option value=\"transparent\">Transparent</option>\n            </select></div>\n          <div class=\"form-group\"><label class=\"form-label\">Box Background Color</label>\n            <input type=\"color\" class=\"form-input\" id=\"gs-box-color\" value=\"" + (v407.boxColor || "#1a1a2e") + "\" style=\"height:36px;padding:2px;\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Arrow Color</label>\n            <input type=\"color\" class=\"form-input\" id=\"gs-arrow-color\" value=\"" + (v407.arrowColor || "#ffb100") + "\" style=\"height:36px;padding:2px;\"></div>\n          <div class=\"form-group\"><label class=\"form-label\">Arrow Size (px)</label>\n            <input type=\"number\" class=\"form-input\" id=\"gs-arrow-size\" value=\"" + (v407.arrowSize || 40) + "\" min=\"10\" max=\"150\"></div>\n        </div>\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Item Image Shape</label>\n            <select class=\"form-input\" id=\"gs-image-shape\">\n              <option value=\"normal\">Normal</option>\n              <option value=\"square\">Square</option>\n              <option value=\"circle\">Circle</option>\n            </select></div>\n          <div class=\"form-group\"></div>\n        </div>\n\n        <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;\">🎁 Spinner Items</h4>\n        <div id=\"gs-items-list\" class=\"ext-gift-list\"></div>\n        <button class=\"btn btn-ghost btn-sm\" id=\"gs-add-item\" style=\"color:#a855f7;border-color:#a855f7;\">+ Add Item (إضافة عنصر)</button>\n\n      </div>\n      <div class=\"ks-footer\">\n        <button class=\"btn btn-primary\" id=\"gs-save\">💾 Apply & Save</button>\n        <button class=\"btn btn-ghost\" id=\"gs-cancel\">Cancel</button>\n      </div>\n    </div>";
    document.body.appendChild(divEl25);
    document.getElementById("gs-style").value = v407.style || "standard";
    document.getElementById("gs-image-shape").value = v407.imageShape || "normal";
    function f38() {
      const v409 = document.getElementById("gs-trigger-list");
      if (!v409) {
        return;
      }
      if (vA13.length === 0) {
        v409.innerHTML = "<span style=\"color:var(--text-muted);font-size:12px;font-style:italic;\">No trigger gifts added yet — click \"+ Add Trigger Gift\" below</span>";
        return;
      }
      v409.innerHTML = vA13.map((item, index) => "\n        <div style=\"display:flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;background:rgba(255,215,77,0.1);border:1px solid rgba(255,215,77,0.25);border-radius:20px;\">\n          " + (item.img ? "<img src=\"" + item.img + "\" style=\"width:22px;height:22px;object-fit:contain;border-radius:4px;\">" : "<span style=\"font-size:14px;\">🎁</span>") + "\n          <span style=\"font-size:12px;font-weight:600;color:#ffd64d;\">" + escapeHtml(item.name) + "</span>\n          <button class=\"gs-remove-trigger\" data-idx=\"" + index + "\" style=\"background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:14px;padding:0 2px;line-height:1;\" title=\"Remove\">✕</button>\n        </div>\n      ").join("");
      v409.querySelectorAll(".gs-remove-trigger").forEach(item => {
        item.onclick = () => {
          vA13.splice(parseInt(item.dataset.idx), 1);
          f38();
          f40();
        };
      });
    }
    f38();
    document.getElementById("gs-add-trigger").onclick = async () => {
      const v410 = await showGiftPickerDialog();
      if (v410) {
        const v411 = vA13.some(item => item.name.toLowerCase() === v410.name.toLowerCase());
        if (!v411) {
          vA13.push({
            name: v410.name,
            img: v410.img || ""
          });
          f38();
          f40();
        }
      }
    };
    const joined6 = actionsData.map(item => "<option value=\"" + item.id + "\">" + escapeHtml(item.name) + "</option>").join("");
    function f39() {
      const v413 = document.getElementById("gs-items-list");
      if (!v413) {
        return;
      }
      v413.innerHTML = vA12.map((item, index) => {
        const v414 = item.img ? item.img.startsWith("http") || item.img.startsWith("data:") ? item.img : "file:///" + item.img.replace(/\\/g, "/") : "";
        return "\n        <div style=\"display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;flex-wrap:wrap;\">\n          " + (v414 ? "<img src=\"" + v414 + "\" style=\"width:28px;height:28px;object-fit:contain;background:rgba(0,0,0,0.2);border-radius:4px;\">" : "<span style=\"font-size:20px;width:28px;text-align:center;\">🎁</span>") + "\n          <button class=\"btn btn-ghost btn-sm\" style=\"padding:2px 6px;font-size:10px;\" onclick=\"uploadGsItemImage(" + index + ")\" title=\"Upload Image\">📁</button>\n          \n          <input type=\"text\" class=\"form-input\" style=\"flex:1;height:28px;padding:0 6px;font-size:12px;min-width:80px;\" value=\"" + escapeAttr(item.name) + "\" onchange=\"updateGsItem(" + index + ", 'name', this.value)\" placeholder=\"Gift Name\">\n          \n          <div style=\"display:flex;align-items:center;gap:4px;\">\n            <label style=\"font-size:11px;color:var(--text-muted);\">Luck:</label>\n            <input type=\"number\" class=\"form-input\" style=\"width:60px;height:28px;padding:0 6px;font-size:11px;\" value=\"" + item.luck + "\" onchange=\"updateGsItem(" + index + ", 'luck', this.value)\">\n          </div>\n          <div style=\"display:flex;align-items:center;gap:4px;\">\n            <label style=\"font-size:11px;color:var(--text-muted);\">Action:</label>\n            <select class=\"form-input\" style=\"width:120px;height:28px;padding:0 6px;font-size:11px;\" onchange=\"updateGsItem(" + index + ", 'actionId', this.value)\">\n              <option value=\"\">None</option>\n              " + joined6 + "\n            </select>\n          </div>\n          <button class=\"btn btn-danger btn-sm\" data-idx=\"" + index + "\" style=\"padding:4px 8px;font-size:11px;\">✕</button>\n        </div>";
      }).join("");
      v413.querySelectorAll("select").forEach((item, index) => {
        item.value = vA12[index].actionId || "";
      });
      v413.querySelectorAll(".btn-danger").forEach(item => {
        item.onclick = () => {
          vA12.splice(parseInt(item.dataset.idx), 1);
          f39();
          f40();
        };
      });
    }
    window.updateGsItem = (p293, p294, p295) => {
      if (vA12[p293]) {
        vA12[p293][p294] = p294 === "luck" ? parseFloat(p295) || 0 : p295;
        f40();
      }
    };
    window.uploadGsItemImage = async p296 => {
      const openFileResult11 = await api.dialog.openFile({
        filters: [{
          name: "Image",
          extensions: ["png", "jpg", "jpeg", "webp"]
        }]
      });
      if (openFileResult11 && vA12[p296]) {
        vA12[p296].img = openFileResult11;
        f39();
        f40();
      }
    };
    f39();
    let v416 = null;
    function f40() {
      clearTimeout(v416);
      v416 = setTimeout(async () => {
        const s105 = f41();
        await api.widget.setConfig("gift-spinner-" + v407.id, s105);
      }, 200);
    }
    divEl25.querySelectorAll("input, select").forEach(item => {
      item.addEventListener("input", f40);
      item.addEventListener("change", f40);
    });
    document.getElementById("gs-add-item").onclick = () => {
      vA12.push({
        name: "New Item",
        img: "",
        luck: 10,
        actionId: ""
      });
      f39();
      f40();
    };
    function f41() {
      return {
        id: v407.id,
        name: document.getElementById("gs-spinner-name").value || v407.name,
        triggerGifts: vA13,
        totalLuck: parseInt(document.getElementById("gs-total-luck").value) || 1000,
        spinTime: parseInt(document.getElementById("gs-spin-time").value) || 5,
        winnerTime: parseInt(document.getElementById("gs-winner-time").value) || 10,
        winnerText: document.getElementById("gs-winner-text").value,
        hideWinnerText: document.getElementById("gs-hide-winner-text").checked,
        width: parseInt(document.getElementById("gs-width").value) || 800,
        height: parseInt(document.getElementById("gs-height").value) || 140,
        style: document.getElementById("gs-style").value,
        boxColor: document.getElementById("gs-box-color").value,
        arrowColor: document.getElementById("gs-arrow-color").value,
        arrowSize: parseInt(document.getElementById("gs-arrow-size").value) || 40,
        imageShape: document.getElementById("gs-image-shape").value,
        gifts: vA12
      };
    }
    const vF24 = () => {
      delete window.updateGsItem;
      delete window.uploadGsItemImage;
      divEl25.remove();
    };
    document.getElementById("gs-close").onclick = vF24;
    document.getElementById("gs-cancel").onclick = vF24;
    document.getElementById("gs-save").onclick = async () => {
      const vF41 = f41();
      vA11[p282] = vF41;
      await f34();
      f36();
      addFeedItem("system", "Extension", "Spinner \"" + vF41.name + "\" settings saved", "🎡");
      vF24();
    };
  }
  (async () => {
    const getResult7 = await api.store.get("widget_gift-spinners");
    if (getResult7 && getResult7.spinners && getResult7.spinners.length > 0) {
      vA11 = getResult7.spinners;
    } else {
      await f35();
    }
    for (const v418 of vA11) {
      await api.widget.setConfig("gift-spinner-" + v418.id, v418);
    }
    f36();
  })();
(function () {
  document.getElementById("ext-timer-start")?.addEventListener("click", async () => {
    const v419 = parseInt(document.getElementById("ext-timer-minutes")?.value) || 60;
    await api.ext.timer.start(v419);
    addFeedItem("system", "Timer", "Started " + v419 + " minute timer", "⏱️");
  });
  document.getElementById("ext-timer-stop")?.addEventListener("click", async () => {
    await api.ext.timer.stop();
    addFeedItem("system", "Timer", "Timer paused", "⏸");
  });
  document.getElementById("ext-timer-reset")?.addEventListener("click", async () => {
    const v420 = parseInt(document.getElementById("ext-timer-minutes")?.value) || 60;
    await api.ext.timer.reset(v420);
    addFeedItem("system", "Timer", "Timer reset", "⟲");
  });
  document.getElementById("ext-timer-test-add")?.addEventListener("click", async () => {
    const v421 = parseInt(document.getElementById("ext-timer-test-sec")?.value) || 30;
    await api.ext.timer.addTime(v421);
  });
  document.getElementById("ext-timer-test-remove")?.addEventListener("click", async () => {
    const v422 = parseInt(document.getElementById("ext-timer-test-sec")?.value) || 30;
    await api.ext.timer.removeTime(v422);
  });
  api.ext.timer.onState(p298 => {
    const v423 = document.getElementById("ext-timer-status");
    if (!v423) {
      return;
    }
    if (p298.running) {
      v423.innerHTML = "<span style=\"color:#10b981\">▶ Running</span> — <span style=\"color:#fff;font-size:18px;\">" + p298.display + "</span>";
    } else if (p298.remainingMs > 0) {
      v423.innerHTML = "<span style=\"color:#f59e0b\">⏸ Paused</span> — <span style=\"color:#fff;font-size:18px;\">" + p298.display + "</span>";
    } else {
      v423.innerHTML = "<span style=\"color:var(--text-muted)\">⏱ Stopped</span> — 00:00";
    }
  });
  (async () => {
    const getStateResult2 = await api.ext.timer.getState();
    const v425 = document.getElementById("ext-timer-status");
    if (v425 && getStateResult2) {
      if (getStateResult2.running) {
        v425.innerHTML = "<span style=\"color:#10b981\">▶ Running</span> — <span style=\"color:#fff;font-size:18px;\">" + getStateResult2.display + "</span>";
      } else if (getStateResult2.remainingMs > 0) {
        v425.innerHTML = "<span style=\"color:#f59e0b\">⏸ Paused</span> — <span style=\"color:#fff;font-size:18px;\">" + getStateResult2.display + "</span>";
      }
    }
  })();
  document.getElementById("btn-timer-settings")?.addEventListener("click", () => f42());
  async function f42() {
    let v426 = (await api.widget.getConfig("gift-timer")) || {};
    const v427 = (await api.system.getFonts()) || [];
    const joined7 = ["Inter", "Roboto", "Cairo", "Tajawal", "Almarai", "Lalezar", ...v427.filter(item => !["Inter", "Roboto", "Cairo", "Tajawal", "Almarai", "Lalezar"].includes(item))].map(item => "<option value=\"" + item + "\" " + (v426.fontFamily === item ? "selected" : "") + ">" + item + "</option>").join("");
    const divEl26 = document.createElement("div");
    divEl26.className = "ks-overlay";
    divEl26.innerHTML = "\n    <div class=\"ks-popup glass-card\" style=\"width:680px;max-height:85vh;overflow-y:auto;padding:24px;\">\n      <div class=\"ks-header\"><h3 style=\"margin:0\">⏱️ Gift Timer Settings</h3><button class=\"modal-close\" id=\"timer-cfg-close\">&times;</button></div>\n\n      <div class=\"divider\"></div>\n      <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;\">⏱ Timer</h4>\n      <div class=\"form-row\">\n        <div class=\"form-group\"><label class=\"form-label\">Initial Time (minutes)</label>\n          <input class=\"form-input\" type=\"number\" id=\"tcfg-minutes\" value=\"" + (v426.initialMinutes || 60) + "\" min=\"1\">\n        </div>\n      </div>\n\n      <div class=\"divider\"></div>\n      <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;\">🎁 Gift Mode (وضع الهدايا)</h4>\n      <div class=\"form-group\">\n        <select class=\"form-select\" id=\"tcfg-gift-mode\">\n          <option value=\"none\" " + ((v426.giftMode || "none") === "none" ? "selected" : "") + ">❌ Disabled (معطل)</option>\n          <option value=\"all-add\" " + (v426.giftMode === "all-add" ? "selected" : "") + ">➕ All Gifts Add Time (كل الهدايا تزيد)</option>\n          <option value=\"all-remove\" " + (v426.giftMode === "all-remove" ? "selected" : "") + ">➖ All Gifts Remove Time (كل الهدايا تقلل)</option>\n          <option value=\"custom\" " + (v426.giftMode === "custom" ? "selected" : "") + ">🎯 Custom (هدايا مخصصة)</option>\n        </select>\n      </div>\n\n      <div id=\"tcfg-ratio-section\" style=\"display:" + (v426.giftMode && v426.giftMode !== "none" ? "block" : "none") + "\">\n        <div class=\"form-row\">\n          <div class=\"form-group\" id=\"tcfg-add-ratio-group\" style=\"display:" + (v426.giftMode === "all-remove" ? "none" : "block") + "\">\n            <label class=\"form-label\">➕ Add: 1 Coin = X Seconds (كل عملة تزيد كام ثانية)</label>\n            <input class=\"form-input\" type=\"number\" id=\"tcfg-add-ratio\" value=\"" + (v426.addSecondsPerCoin || 1) + "\" min=\"0.1\" step=\"0.1\">\n          </div>\n          <div class=\"form-group\" id=\"tcfg-remove-ratio-group\" style=\"display:" + (v426.giftMode === "all-add" ? "none" : "block") + "\">\n            <label class=\"form-label\">➖ Remove: 1 Coin = X Seconds (كل عملة تقلل كام ثانية)</label>\n            <input class=\"form-input\" type=\"number\" id=\"tcfg-remove-ratio\" value=\"" + (v426.removeSecondsPerCoin || 1) + "\" min=\"0.1\" step=\"0.1\">\n          </div>\n        </div>\n      </div>\n\n      <div id=\"tcfg-custom-section\" style=\"display:" + (v426.giftMode === "custom" ? "block" : "none") + "\">\n        <div class=\"form-row\">\n          <div class=\"form-group\" style=\"flex:1\">\n            <label class=\"form-label\" style=\"color:#10b981\">➕ Add Time Gifts (هدايا تزيد الوقت)</label>\n            <div id=\"tcfg-add-gifts\" style=\"display:flex;flex-wrap:wrap;gap:6px;min-height:40px;padding:8px;border:1px dashed rgba(16,185,129,.3);border-radius:8px;margin-bottom:6px;\"></div>\n            <button class=\"btn btn-ghost btn-sm\" id=\"tcfg-add-gift-btn\" style=\"color:#10b981;border-color:#10b981;width:100%\">+ Add Gift</button>\n          </div>\n          <div class=\"form-group\" style=\"flex:1\">\n            <label class=\"form-label\" style=\"color:#ff4444\">➖ Remove Time Gifts (هدايا تقلل الوقت)</label>\n            <div id=\"tcfg-remove-gifts\" style=\"display:flex;flex-wrap:wrap;gap:6px;min-height:40px;padding:8px;border:1px dashed rgba(255,68,68,.3);border-radius:8px;margin-bottom:6px;\"></div>\n            <button class=\"btn btn-ghost btn-sm\" id=\"tcfg-remove-gift-btn\" style=\"color:#ff4444;border-color:#ff4444;width:100%\">+ Add Gift</button>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"divider\"></div>\n      <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;\">🖼 End Image (صورة النهاية)</h4>\n      <div class=\"form-row\">\n        <div class=\"form-group\" style=\"flex:2\">\n          <label class=\"form-label\">Image (optional)</label>\n          <div style=\"display:flex;gap:8px\">\n            <input class=\"form-input\" id=\"tcfg-end-image\" value=\"" + escapeAttr(v426.endImage || "") + "\" placeholder=\"No image selected\" readonly style=\"flex:1\">\n            <button class=\"btn btn-ghost btn-sm\" id=\"tcfg-end-image-btn\">Browse</button>\n            <button class=\"btn btn-ghost btn-sm\" id=\"tcfg-end-image-clear\" style=\"color:#ff4444\">✕</button>\n          </div>\n        </div>\n        <div class=\"form-group\" style=\"flex:1\">\n          <label class=\"form-label\">Duration (sec)</label>\n          <input class=\"form-input\" type=\"number\" id=\"tcfg-end-duration\" value=\"" + (v426.endImageDuration || 10) + "\" min=\"1\">\n        </div>\n      </div>\n\n      <div class=\"divider\"></div>\n      <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;\">🎨 Appearance (الشكل)</h4>\n      <div class=\"form-row\">\n        <div class=\"form-group\" style=\"flex:2\"><label class=\"form-label\">Font (خط)</label>\n          <select class=\"form-select tcfg-live\" id=\"tcfg-font\">" + joined7 + "</select>\n        </div>\n      </div>\n      <div class=\"form-row\">\n        <div class=\"form-group\"><label class=\"form-label\">Font Size</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-font-size\" value=\"" + (v426.fontSize || 72) + "\" min=\"12\" max=\"300\">\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Text Color</label>\n          <input class=\"form-input tcfg-live\" type=\"color\" id=\"tcfg-text-color\" value=\"" + (v426.textColor || "#ffffff") + "\" style=\"height:38px;padding:2px\">\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Label (optional)</label>\n          <input class=\"form-input tcfg-live\" id=\"tcfg-label\" value=\"" + escapeAttr(v426.label || "") + "\" placeholder=\"e.g. Time Left\">\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Label Size</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-label-size\" value=\"" + (v426.labelSize || 16) + "\" min=\"8\" max=\"100\">\n        </div>\n      </div>\n\n      <div class=\"divider\"></div>\n      <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;\">📷 Background (الخلفية)</h4>\n      <div class=\"form-row\">\n        <div class=\"form-group\" style=\"flex:1\">\n          <label class=\"form-label\">Timer Style (شكل العداد)</label>\n          <select class=\"form-select tcfg-live\" id=\"tcfg-timer-style\">\n            <option value=\"transparent\" " + ((v426.timerStyle || "transparent") === "transparent" ? "selected" : "") + ">🔲 Transparent (بدون خلفية — نص فقط)</option>\n            <option value=\"box\" " + (v426.timerStyle === "box" ? "selected" : "") + ">🟦 Colored Box (جوا مستطيل ملون)</option>\n          </select>\n        </div>\n      </div>\n      <div id=\"tcfg-box-settings\" style=\"display:" + (v426.timerStyle === "box" ? "block" : "none") + "\">\n        <div class=\"form-row\">\n          <div class=\"form-group\"><label class=\"form-label\">Box Color (لون المستطيل)</label>\n            <input class=\"form-input tcfg-live\" type=\"color\" id=\"tcfg-bg-color\" value=\"" + (v426.bgColor || "#1a1a2e") + "\" style=\"height:38px;padding:2px\">\n          </div>\n          <div class=\"form-group\"><label class=\"form-label\">Border Radius (استدارة)</label>\n            <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-border-radius\" value=\"" + (v426.borderRadius || 16) + "\" min=\"0\">\n          </div>\n          <div class=\"form-group\"><label class=\"form-label\">Padding (مسافة داخلية)</label>\n            <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-padding\" value=\"" + (v426.padding || 20) + "\" min=\"0\">\n          </div>\n        </div>\n      </div>\n      <div class=\"form-row\" style=\"margin-top:8px\">\n        <div class=\"form-group\" style=\"flex:2\">\n          <label class=\"form-label\">Background Image (صورة خلفية — اختياري)</label>\n          <div style=\"display:flex;gap:8px\">\n            <input class=\"form-input\" id=\"tcfg-bg-image\" value=\"" + escapeAttr(v426.bgImage || "") + "\" placeholder=\"No image\" readonly style=\"flex:1\">\n            <button class=\"btn btn-ghost btn-sm\" id=\"tcfg-bg-image-btn\">Browse</button>\n            <button class=\"btn btn-ghost btn-sm\" id=\"tcfg-bg-image-clear\" style=\"color:#ff4444\">✕</button>\n          </div>\n        </div>\n      </div>\n      <div class=\"form-row\">\n        <div class=\"form-group\"><label class=\"form-label\">Image Scale (حجم الصورة)</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-bg-scale\" value=\"" + (v426.bgScale || 1) + "\" min=\"0.1\" max=\"10\" step=\"0.1\">\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Image X (موقع أفقي)</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-bg-pos-x\" value=\"" + (v426.bgPosX || 0) + "\">\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Image Y (موقع رأسي)</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-bg-pos-y\" value=\"" + (v426.bgPosY || 0) + "\">\n        </div>\n      </div>\n\n      <div class=\"divider\"></div>\n      <h4 style=\"color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;\">📍 Position (موقع النص فقط)</h4>\n      <p style=\"color:var(--text-muted);font-size:11px;margin-bottom:8px;\">يحرك نص العداد فقط — الصورة تتحرك من Image X/Y</p>\n      <div class=\"form-row\">\n        <div class=\"form-group\"><label class=\"form-label\">Timer X</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-pos-x\" value=\"" + (v426.posX || 0) + "\">\n        </div>\n        <div class=\"form-group\"><label class=\"form-label\">Timer Y</label>\n          <input class=\"form-input tcfg-live\" type=\"number\" id=\"tcfg-pos-y\" value=\"" + (v426.posY || 0) + "\">\n        </div>\n      </div>\n\n      <div class=\"divider\"></div>\n      <button class=\"btn btn-primary\" id=\"tcfg-save\" style=\"width:100%;height:44px;margin-top:8px\">💾 Save Settings</button>\n    </div>";
    document.body.appendChild(divEl26);
    const v430 = document.getElementById("tcfg-gift-mode");
    v430.addEventListener("change", () => {
      const v431 = v430.value;
      document.getElementById("tcfg-ratio-section").style.display = v431 !== "none" ? "block" : "none";
      document.getElementById("tcfg-custom-section").style.display = v431 === "custom" ? "block" : "none";
      document.getElementById("tcfg-add-ratio-group").style.display = v431 === "all-remove" ? "none" : "block";
      document.getElementById("tcfg-remove-ratio-group").style.display = v431 === "all-add" ? "none" : "block";
    });
    const v432 = document.getElementById("tcfg-timer-style");
    v432.addEventListener("change", () => {
      document.getElementById("tcfg-box-settings").style.display = v432.value === "box" ? "block" : "none";
      f46();
    });
    let vA14 = [...(v426.addGifts || [])];
    let vA15 = [...(v426.removeGifts || [])];
    function f43(p301, p302, p303) {
      const v433 = document.getElementById(p301);
      if (!v433) {
        return;
      }
      v433.innerHTML = p302.map((item, index) => "\n        <div style=\"display:flex;align-items:center;gap:4px;padding:4px 8px;background:rgba(255,255,255,.08);border-radius:6px;font-size:11px;\">\n          " + (item.img ? "<img src=\"" + item.img + "\" style=\"width:20px;height:20px;object-fit:contain\">" : "🎁") + "\n          <span>" + escapeHtml(item.name) + " (" + item.coins + "c)</span>\n          <button data-idx=\"" + index + "\" style=\"cursor:pointer;color:#ff4444;font-weight:bold;margin-left:4px;background:none;border:none;font-size:13px;padding:0 2px;\">✕</button>\n        </div>\n      ").join("");
      v433.querySelectorAll("[data-idx]").forEach(item => {
        item.onclick = p307 => {
          p307.stopPropagation();
          p303(parseInt(item.dataset.idx));
        };
      });
    }
    function f44() {
      f43("tcfg-add-gifts", vA14, p308 => {
        vA14.splice(p308, 1);
        f44();
      });
    }
    function f45() {
      f43("tcfg-remove-gifts", vA15, p309 => {
        vA15.splice(p309, 1);
        f45();
      });
    }
    f44();
    f45();
    document.getElementById("tcfg-add-gift-btn").onclick = async () => {
      const v434 = await showGiftPickerDialog();
      if (v434) {
        vA14.push(v434);
        f44();
      }
    };
    document.getElementById("tcfg-remove-gift-btn").onclick = async () => {
      const v435 = await showGiftPickerDialog();
      if (v435) {
        vA15.push(v435);
        f45();
      }
    };
    document.getElementById("tcfg-end-image-btn").onclick = async () => {
      const openFileResult12 = await api.dialog.openFile({
        filters: [{
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp"]
        }]
      });
      if (openFileResult12) {
        document.getElementById("tcfg-end-image").value = openFileResult12;
        f46();
      }
    };
    document.getElementById("tcfg-end-image-clear").onclick = () => {
      document.getElementById("tcfg-end-image").value = "";
      f46();
    };
    document.getElementById("tcfg-bg-image-btn").onclick = async () => {
      const openFileResult13 = await api.dialog.openFile({
        filters: [{
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp"]
        }]
      });
      if (openFileResult13) {
        document.getElementById("tcfg-bg-image").value = openFileResult13;
        f46();
      }
    };
    document.getElementById("tcfg-bg-image-clear").onclick = () => {
      document.getElementById("tcfg-bg-image").value = "";
      f46();
    };
    let v438 = null;
    function f46() {
      clearTimeout(v438);
      v438 = setTimeout(() => {
        const s106 = f47();
        api.widget.setConfig("gift-timer", s106);
      }, 150);
    }
    divEl26.querySelectorAll(".tcfg-live").forEach(item => {
      item.addEventListener("input", f46);
      item.addEventListener("change", f46);
    });
    document.getElementById("timer-cfg-close").onclick = () => divEl26.remove();
    divEl26.addEventListener("click", event => {
      if (event.target === divEl26) {
        divEl26.remove();
      }
    });
    function f47() {
      return {
        initialMinutes: parseInt(document.getElementById("tcfg-minutes").value) || 60,
        giftMode: document.getElementById("tcfg-gift-mode").value,
        addSecondsPerCoin: parseFloat(document.getElementById("tcfg-add-ratio").value) || 1,
        removeSecondsPerCoin: parseFloat(document.getElementById("tcfg-remove-ratio").value) || 1,
        addGifts: vA14,
        removeGifts: vA15,
        endImage: document.getElementById("tcfg-end-image").value,
        endImageDuration: parseInt(document.getElementById("tcfg-end-duration").value) || 10,
        fontFamily: document.getElementById("tcfg-font").value,
        fontSize: parseInt(document.getElementById("tcfg-font-size").value) || 72,
        textColor: document.getElementById("tcfg-text-color").value,
        label: document.getElementById("tcfg-label").value,
        labelSize: parseInt(document.getElementById("tcfg-label-size").value) || 16,
        timerStyle: document.getElementById("tcfg-timer-style").value,
        bgImage: document.getElementById("tcfg-bg-image").value,
        bgScale: parseFloat(document.getElementById("tcfg-bg-scale").value) || 1,
        bgPosX: parseInt(document.getElementById("tcfg-bg-pos-x").value) || 0,
        bgPosY: parseInt(document.getElementById("tcfg-bg-pos-y").value) || 0,
        bgColor: document.getElementById("tcfg-bg-color").value,
        borderRadius: parseInt(document.getElementById("tcfg-border-radius").value) || 0,
        padding: parseInt(document.getElementById("tcfg-padding").value) || 20,
        posX: parseInt(document.getElementById("tcfg-pos-x").value) || 0,
        posY: parseInt(document.getElementById("tcfg-pos-y").value) || 0
      };
    }
    document.getElementById("tcfg-save").onclick = async () => {
      const vF47 = f47();
      await api.widget.setConfig("gift-timer", vF47);
      addFeedItem("system", "Timer", "Settings saved ✅", "⏱️");
      divEl26.remove();
    };
  }
})();
(function () {
  const vF26 = (p312, p313) => {
    document.getElementById(p312)?.addEventListener("click", async () => {
      await api.widget.test("activity-feed", {
        eventType: p313
      });
      const v439 = document.getElementById(p312);
      const v440 = v439.textContent;
      v439.textContent = "✅ Sent!";
      setTimeout(() => {
        v439.textContent = v440;
      }, 1500);
    });
  };
  vF26("ext-activityfeed-test-chat", "chat");
  vF26("ext-activityfeed-test-gift", "gift");
  vF26("ext-activityfeed-test-follow", "follow");
  vF26("ext-activityfeed-test-share", "share");
  vF26("ext-activityfeed-test-sub", "subscribe");
  vF26("ext-activityfeed-test-join", "join");
})();
(function () {
  function f48(p314) {
    const map2 = new Map();
    Array.from(p314.children).forEach(item => {
      if (!item.classList.contains("empty-row") && !item.classList.contains("drag-ghost")) {
        map2.set(item, item.getBoundingClientRect());
      }
    });
    return map2;
  }
  function f49(p316, p317) {
    const map3 = new Map();
    Array.from(p317.children).forEach(item => {
      if (!item.classList.contains("empty-row") && !item.classList.contains("drag-ghost")) {
        map3.set(item, item.getBoundingClientRect());
      }
    });
    p316.forEach((item, index) => {
      const v443 = map3.get(index);
      if (!v443) {
        return;
      }
      const v444 = item.top - v443.top;
      if (v444 !== 0) {
        index.style.transition = "none";
        index.style.transform = "translateY(" + v444 + "px)";
        index.offsetHeight;
        index.style.transition = "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)";
        index.style.transform = "translateY(0)";
        setTimeout(() => {
          index.style.transition = "";
          index.style.transform = "";
        }, 220);
      }
    });
  }
  function f50(p321, p322) {
    const set2 = new Set(p322);
    const vA16 = [];
    p321.forEach((item, index) => {
      if (set2.has(item.id)) {
        vA16.push(index);
      }
    });
    const map4 = new Map();
    p322.forEach((item, index) => {
      const v447 = p321.find(item => item.id === item);
      if (v447) {
        map4.set(vA16[index], v447);
      }
    });
    return p321.map((item, index) => {
      if (map4.has(index)) {
        return map4.get(index);
      }
      return item;
    });
  }
  function f51(p330, p331) {
    const v448 = document.getElementById(p330);
    if (!v448) {
      return;
    }
    v448.addEventListener("mousedown", event => {
      const v449 = event.target.closest(".drag-handle");
      if (!v449) {
        return;
      }
      const v450 = v449.closest("tr");
      if (!v450 || v450.classList.contains("empty-row")) {
        return;
      }
      event.preventDefault();
      const v451 = v450.getBoundingClientRect();
      const v452 = event.clientY;
      const v453 = event.clientX;
      const v454 = v451.top;
      const v455 = v451.left;
      const tableEl = document.createElement("table");
      tableEl.className = "data-table drag-clone-table";
      tableEl.style.width = v451.width + "px";
      tableEl.style.position = "fixed";
      tableEl.style.top = v451.top + "px";
      tableEl.style.left = v451.left + "px";
      tableEl.style.pointerEvents = "none";
      const v457 = v450.cloneNode(true);
      const v458 = v450.querySelectorAll("td");
      const v459 = v457.querySelectorAll("td");
      v458.forEach((item, index) => {
        if (v459[index]) {
          v459[index].style.width = item.getBoundingClientRect().width + "px";
        }
      });
      const tbodyEl = document.createElement("tbody");
      tbodyEl.appendChild(v457);
      tableEl.appendChild(tbodyEl);
      document.body.appendChild(tableEl);
      v450.classList.add("drag-ghost");
      document.body.style.cursor = "grabbing";
      function f52(p335) {
        const v461 = p335.clientY - v452;
        const v462 = p335.clientX - v453;
        tableEl.style.top = v454 + v461 + "px";
        tableEl.style.left = v455 + v462 + "px";
        const v463 = p335.clientY;
        const v464 = Array.from(v448.children).filter(item => !item.classList.contains("empty-row"));
        const vF48 = f48(v448);
        for (let vLN03 = 0; vLN03 < v464.length; vLN03++) {
          const v465 = v464[vLN03];
          if (v465 === v450) {
            continue;
          }
          const v466 = v465.getBoundingClientRect();
          const v467 = v466.top + v466.height / 2;
          if (v463 > v466.top && v463 < v466.bottom) {
            if (v463 < v467) {
              if (v450.nextElementSibling !== v465) {
                v448.insertBefore(v450, v465);
                f49(vF48, v448);
                break;
              }
            } else if (v465.nextElementSibling !== v450) {
              v448.insertBefore(v450, v465.nextElementSibling);
              f49(vF48, v448);
              break;
            }
          }
        }
      }
      function f53() {
        document.removeEventListener("mousemove", f52);
        document.removeEventListener("mouseup", f53);
        document.body.style.cursor = "";
        tableEl.style.transform = "scale(0.95) rotate(0deg)";
        tableEl.style.opacity = "0";
        tableEl.style.transition = "all 0.15s ease";
        setTimeout(() => {
          tableEl.remove();
        }, 150);
        v450.classList.remove("drag-ghost");
        const v468 = Array.from(v448.children).filter(item => !item.classList.contains("empty-row")).map(item => item.dataset.id);
        p331(v468);
      }
      document.addEventListener("mousemove", f52);
      document.addEventListener("mouseup", f53);
    });
    v448.addEventListener("touchstart", event => {
      const v469 = event.target.closest(".drag-handle");
      if (!v469) {
        return;
      }
      const v470 = v469.closest("tr");
      if (!v470 || v470.classList.contains("empty-row")) {
        return;
      }
      const v471 = event.touches[0];
      const v472 = v470.getBoundingClientRect();
      const v473 = v471.clientY;
      const v474 = v471.clientX;
      const v475 = v472.top;
      const v476 = v472.left;
      const tableEl2 = document.createElement("table");
      tableEl2.className = "data-table drag-clone-table";
      tableEl2.style.width = v472.width + "px";
      tableEl2.style.position = "fixed";
      tableEl2.style.top = v472.top + "px";
      tableEl2.style.left = v472.left + "px";
      tableEl2.style.pointerEvents = "none";
      const v478 = v470.cloneNode(true);
      const v479 = v470.querySelectorAll("td");
      const v480 = v478.querySelectorAll("td");
      v479.forEach((item, index) => {
        if (v480[index]) {
          v480[index].style.width = item.getBoundingClientRect().width + "px";
        }
      });
      const tbodyEl2 = document.createElement("tbody");
      tbodyEl2.appendChild(v478);
      tableEl2.appendChild(tbodyEl2);
      document.body.appendChild(tableEl2);
      v470.classList.add("drag-ghost");
      function f54(p342) {
        if (p342.touches.length === 0) {
          return;
        }
        const v482 = p342.touches[0];
        const v483 = v482.clientY - v473;
        const v484 = v482.clientX - v474;
        tableEl2.style.top = v475 + v483 + "px";
        tableEl2.style.left = v476 + v484 + "px";
        const v485 = v482.clientY;
        const v486 = Array.from(v448.children).filter(item => !item.classList.contains("empty-row"));
        const vF482 = f48(v448);
        for (let vLN04 = 0; vLN04 < v486.length; vLN04++) {
          const v487 = v486[vLN04];
          if (v487 === v470) {
            continue;
          }
          const v488 = v487.getBoundingClientRect();
          const v489 = v488.top + v488.height / 2;
          if (v485 > v488.top && v485 < v488.bottom) {
            if (v485 < v489) {
              if (v470.nextElementSibling !== v487) {
                v448.insertBefore(v470, v487);
                f49(vF482, v448);
                break;
              }
            } else if (v487.nextElementSibling !== v470) {
              v448.insertBefore(v470, v487.nextElementSibling);
              f49(vF482, v448);
              break;
            }
          }
        }
      }
      function f55() {
        document.removeEventListener("touchmove", f54);
        document.removeEventListener("touchend", f55);
        tableEl2.style.transform = "scale(0.95) rotate(0deg)";
        tableEl2.style.opacity = "0";
        tableEl2.style.transition = "all 0.15s ease";
        setTimeout(() => {
          tableEl2.remove();
        }, 150);
        v470.classList.remove("drag-ghost");
        const v490 = Array.from(v448.children).filter(item => !item.classList.contains("empty-row")).map(item => item.dataset.id);
        p331(v490);
      }
      document.addEventListener("touchmove", f54, {
        passive: true
      });
      document.addEventListener("touchend", f55);
    }, {
      passive: true
    });
  }
  f51("actions-tbody", p346 => {
    actionsData = f50(actionsData, p346);
    saveActionsData();
    const v491 = document.getElementById("actions-search")?.value || "";
    renderActions(v491);
  });
  f51("events-tbody", p347 => {
    eventsData = f50(eventsData, p347);
    api.events.save(eventsData);
    const v492 = document.getElementById("events-search")?.value || "";
    renderEvents(v492);
  });
})();
const gamesGrid = document.getElementById("games-grid");
async function loadGames(p348 = false) {
  if (!gamesGrid) {
    return;
  }
  const v493 = document.querySelector(".main-content") || document.documentElement;
  const v494 = v493.scrollTop || window.scrollY;
  gamesGrid.innerHTML = "";
  const getListResult = await api.games.getList();
  for (const v496 of getListResult) {
    const v497 = (await api.store.get("license.key")) || "default";
    const v498 = (await api.store.get("game_" + v496.id)) || {};
    const getResult8 = await api.store.get("game_" + v496.id + "_" + v497 + "_key");
    v498.key = getResult8;
    const divEl27 = document.createElement("div");
    divEl27.className = "glass-card profile-card";
    let vLS10 = "";
    if (v498.gamePath) {
      vLS10 = "\n        <button class=\"btn btn-primary\" onclick=\"launchGame('" + v496.id + "')\">▶ Play</button>\n        <button class=\"btn btn-secondary\" onclick=\"importGamePreset('" + v496.id + "')\">📥 Preset</button>\n      ";
    } else {
      vLS10 = "\n        <button class=\"btn btn-ghost\" onclick=\"api.games.openLink('" + v496.downloadLink + "')\">📥 Download</button>\n        <button class=\"btn btn-primary\" onclick=\"locateGame('" + v496.id + "')\">📂 Locate Game.exe</button>\n        <button class=\"btn btn-secondary\" onclick=\"importGamePreset('" + v496.id + "')\">📥 Preset</button>\n      ";
    }
    let vLS11 = "";
    if (v498.key) {
      if (v496.id === "subnautica" || v496.id === "aow") {
        vLS11 = "\n          <div style=\"margin-top:15px; padding:10px; background:rgba(0,128,0,0.1); border:1px solid #4ade80; border-radius:8px;\">\n            <label class=\"form-label\" style=\"color:#4ade80; font-weight:bold;\">✅ Key Generated Successfully (30 Days)</label>\n            <div style=\"margin-top:10px; display:flex; gap:10px;\">\n              <input type=\"text\" class=\"input\" value=\"" + v498.key + "\" readonly onclick=\"this.select()\" style=\"flex:1; cursor:pointer;\">\n              <button class=\"btn btn-primary\" onclick=\"navigator.clipboard.writeText('" + v498.key + "'); uiAlert('Key copied to clipboard!');\">Copy</button>\n            </div>\n          </div>\n        ";
      } else {
        vLS11 = "\n          <div style=\"margin-top:15px; padding:10px; background:rgba(0,128,0,0.1); border:1px solid #4ade80; border-radius:8px;\">\n            <label class=\"form-label\" style=\"color:#4ade80; font-weight:bold;\">✅ Game Activated Automatically!</label>\n            <div style=\"font-size:12px; color:#aaa; margin-top:5px;\">Your license key has been saved to the game folder.</div>\n          </div>\n        ";
      }
    } else if (v498.gamePath) {
      vLS11 = "\n        <div style=\"margin-top:15px;\">\n          <label class=\"form-label\">Game HWID</label>\n          <div class=\"input-group\">\n            <input type=\"text\" class=\"input\" id=\"hwid_" + v496.id + "\" placeholder=\"Enter HWID from the game\">\n            <button class=\"btn btn-primary btn-glow\" id=\"btn_activate_" + v496.id + "\" onclick=\"generateGameKey('" + v496.id + "')\">Activate</button>\n          </div>\n        </div>\n      ";
    } else {
      vLS11 = "\n        <div style=\"margin-top:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; text-align:center;\">\n          <span style=\"color:#aaa; font-size:13px;\">Please locate the Game.exe first to activate.</span>\n        </div>\n      ";
    }
    divEl27.innerHTML = "\n      <img src=\"" + v496.cover + "\" style=\"width:100%; height:auto; aspect-ratio: 3160/1220; object-fit:cover; border-radius:8px; margin-bottom:15px;\">\n      <h3 class=\"form-section-title\">" + v496.name + "</h3>\n      <div style=\"display:flex; gap:10px; margin-top:15px;\">\n        " + vLS10 + "\n      </div>\n      " + vLS11 + "\n    ";
    gamesGrid.appendChild(divEl27);
  }
  if (p348) {
    requestAnimationFrame(() => {
      if (v493.scrollTop !== undefined) {
        v493.scrollTop = v494;
      }
      window.scrollTo(0, v494);
    });
  }
}
window.locateGame = async p349 => {
  const locateGameResult = await api.games.locateGame();
  if (locateGameResult) {
    const v502 = (await api.store.get("game_" + p349)) || {};
    v502.gamePath = locateGameResult;
    await api.store.set("game_" + p349, v502);
    const installModResult = await api.games.installMod(p349, locateGameResult);
    if (installModResult && !installModResult.success) {
      uiAlert("Warning: Game located, but failed to install mod files automatically: " + installModResult.error);
    } else if (p349 === "subnautica") {
      uiAlert("Game located and mod files installed successfully!");
    }
    loadGames();
  }
};
window.launchGame = async p350 => {
  const v504 = (await api.store.get("game_" + p350)) || {};
  if (!v504.gamePath) {
    uiAlert("Game executable not found in settings.");
    return;
  }
  const launchResult = await api.games.launch(v504.gamePath);
  if (!launchResult.success) {
    if (await uiConfirm("Failed to launch game: " + launchResult.error + "\n\nWould you like to locate the game executable again?")) {
      window.locateGame(p350);
    }
  }
};
window.importGamePreset = async p351 => {
  const v506 = event.currentTarget;
  const v507 = v506.innerHTML;
  v506.innerHTML = "Importing...";
  v506.disabled = true;
  const importPresetResult = await api.games.importPreset(p351);
  if (importPresetResult.success) {
    uiAlert("Preset imported successfully!\nAdded " + importPresetResult.counts.actions + " actions, " + importPresetResult.counts.events + " events, and " + importPresetResult.counts.widgets + " widgets.");
    if (typeof loadActionsData === "function") {
      loadActionsData();
    }
    if (typeof loadEventsData === "function") {
      loadEventsData();
    }
    if (typeof loadProfiles === "function") {
      loadProfiles();
    }
  } else {
    uiAlert("Failed to import preset: " + importPresetResult.error);
  }
  v506.innerHTML = v507;
  v506.disabled = false;
};
window.generateGameKey = async p352 => {
  const v509 = document.getElementById("btn_activate_" + p352);
  const v510 = v509 ? v509.textContent : "Activate";
  if (v509) {
    v509.textContent = "Generating...";
    v509.disabled = true;
  }
  const v511 = document.getElementById("hwid_" + p352).value.trim();
  if (!v511) {
    if (v509) {
      v509.textContent = v510;
      v509.disabled = false;
    }
    return uiAlert("Please enter HWID");
  }
  const v512 = (await api.store.get("game_" + p352)) || {};
  if (!v512.gamePath) {
    if (v509) {
      v509.textContent = v510;
      v509.disabled = false;
    }
    return uiAlert("Please locate the game executable first!");
  }
  const v513 = (await api.store.get("license.key")) || "default";
  const generateKeyResult = await api.games.generateKey(p352, v511, v512.gamePath);
  if (generateKeyResult.success) {
    await api.store.set("game_" + p352 + "_" + v513 + "_key", generateKeyResult.key);
    loadGames(true);
  } else {
    v509.textContent = v510;
    v509.disabled = false;
    uiAlert("Key generation failed: " + generateKeyResult.error);
  }
};
loadGames();
let activeAudio = null;
async function openSoundLibrary(p353) {
  const divEl28 = document.createElement("div");
  divEl28.className = "ks-overlay";
  divEl28.innerHTML = "\n  <div class=\"ks-popup glass-card\" style=\"width: 700px; max-height: 85vh; display: flex; flex-direction: column; padding: 20px;\">\n    <div class=\"ks-header\" style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;\">\n      <h3 style=\"margin:0;\">🎵 Sound Library</h3>\n      <button class=\"modal-close\" id=\"sl-close\">&times;</button>\n    </div>\n    \n    <div style=\"display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px;\">\n      <div style=\"flex:1; position:relative;\">\n        <span style=\"position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:0.5;\">🔍</span>\n        <input type=\"text\" id=\"sl-search\" class=\"form-input\" placeholder=\"Search sounds...\" style=\"padding-left:36px; width:100%; border:1px solid #14b8a6;\">\n      </div>\n      <div style=\"font-size: 11px; color: var(--text-muted);\">\n        Sounds provided by <a href=\"#\" target=\"_blank\" style=\"color: #14b8a6; text-decoration: none;\">ELDALY</a>\n      </div>\n    </div>\n\n    <div id=\"sl-results\" style=\"flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 8px;\">\n      <div style=\"text-align:center; padding:30px; color:var(--text-muted);\"><span class=\"btn-loader\" style=\"display:inline-block; border-color:#14b8a6; border-right-color:transparent;\"></span> Loading sounds...</div>\n    </div>\n  </div>";
  document.body.appendChild(divEl28);
  const vF27 = () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    divEl28.remove();
  };
  document.getElementById("sl-close").onclick = vF27;
  divEl28.addEventListener("click", event => {
    if (event.target === divEl28) {
      vF27();
    }
  });
  const v516 = document.getElementById("sl-search");
  const v517 = document.getElementById("sl-results");
  let vLN05 = 0;
  let vLS12 = "";
  let vLN12 = 1;
  let v518 = false;
  let v519 = false;
  function f56(p355) {
    const divEl29 = document.createElement("div");
    divEl29.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border,#333); border-radius:8px;";
    divEl29.innerHTML = "\n      <div style=\"font-size:13px; font-weight:500; color:var(--text-primary); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:12px;\">\n        " + p355.name + "\n      </div>\n      <div style=\"display:flex; gap:8px;\">\n        <button class=\"btn btn-ghost btn-sm sl-play-btn\" data-url=\"" + p355.sound + "\" style=\"width:80px; display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid var(--border,#333);\">\n          ▶ Play\n        </button>\n        <button class=\"btn btn-ghost btn-sm sl-apply-btn\" data-url=\"" + p355.sound + "\" style=\"width:80px; display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid var(--border,#333);\">\n          ✔️ Apply\n        </button>\n      </div>\n    ";
    const v521 = divEl29.querySelector(".sl-play-btn");
    v521.addEventListener("click", () => {
      if (activeAudio) {
        activeAudio.pause();
      }
      v517.querySelectorAll(".sl-play-btn").forEach(item => {
        item.innerHTML = "▶ Play";
        item.style.borderColor = "var(--border,#333)";
        item.style.color = "var(--text-primary)";
      });
      activeAudio = new Audio(v521.getAttribute("data-url"));
      activeAudio.volume = 0.5;
      const vF28 = () => {
        v521.innerHTML = "▶ Play";
        v521.style.borderColor = "var(--border,#333)";
        v521.style.color = "var(--text-primary)";
      };
      activeAudio.onerror = () => {
        vF28();
        uiAlert("الصوت ده مش متاح دلوقتي من السيرفر — جرّب صوت تاني 🔊");
      };
      const v522 = activeAudio.play();
      if (v522 && v522.then) {
        v522.then(() => {
          v521.innerHTML = "⏹ Stop";
          v521.style.borderColor = "#ff4444";
          v521.style.color = "#ff4444";
        }).catch(() => {
          vF28();
          uiAlert("مش قادر يشغّل الصوت — شوف النت وجرّب تاني 🔊");
        });
      } else {
        v521.innerHTML = "⏹ Stop";
        v521.style.borderColor = "#ff4444";
        v521.style.color = "#ff4444";
      }
      activeAudio.onended = () => {
        v521.innerHTML = "▶ Play";
        v521.style.borderColor = "var(--border,#333)";
        v521.style.color = "var(--text-primary)";
      };
    });
    const v523 = divEl29.querySelector(".sl-apply-btn");
    v523.addEventListener("click", () => {
      const v524 = v523.getAttribute("data-url");
      const v525 = document.getElementById(p353);
      if (!v525) return;
      v523.textContent = "⏳ ...";
      // بينزّل الصوت ملف محلي — التشغيل في البث مضمون بدون أي موقع
      api.system.downloadSound(v524).then((r2) => {
        if (r2 && r2.ok && r2.path) {
          v525.textContent = r2.path;
          vF27();
          addFeedItem("system", "Sound Library", "Sound saved locally ✓", "🎧");
        } else {
          v525.textContent = v524; // fallback: اللينك نفسه
          vF27();
          uiAlert("تعذر تنزيل الصوت — الاتصال باللينك نفسه (ممكن ميشتغلش في البث) ⚠");
        }
      });
    });
    return divEl29;
  }
  async function f57(p357, p358 = false) {
    if (!p358) {
      vLN05++;
      vLS12 = p357;
      vLN12 = 1;
      v518 = false;
      v517.innerHTML = "<div style=\"text-align:center; padding:30px; color:var(--text-muted);\"><span class=\"btn-loader\" style=\"display:inline-block; border-color:#14b8a6; border-right-color:transparent;\"></span> Loading sounds...</div>";
    } else {
      vLN12++;
      v519 = true;
      const divEl30 = document.createElement("div");
      divEl30.id = "sl-more-loader";
      divEl30.style.cssText = "text-align:center; padding:20px; color:var(--text-muted);";
      divEl30.innerHTML = "<span class=\"btn-loader\" style=\"display:inline-block; border-color:#14b8a6; border-right-color:transparent; width:16px; height:16px;\"></span>";
      v517.appendChild(divEl30);
    }
    const vVLN05 = vLN05;
    const searchSoundsResult = await api.system.searchSounds(p357, vLN12);
    if (vLN05 !== vVLN05) {
      return;
    }
    if (!p358) {
      v517.innerHTML = "";
    } else {
      const v528 = document.getElementById("sl-more-loader");
      if (v528) {
        v528.remove();
      }
      v519 = false;
    }
    if (searchSoundsResult.error) {
      if (!p358) {
        v517.innerHTML = "<div style=\"text-align:center; padding:30px; color:#ff4444;\">❌ Error: " + searchSoundsResult.error + "</div>";
      }
      return;
    }
    v518 = !!searchSoundsResult.next;
    const v529 = searchSoundsResult.results || [];
    if (v529.length === 0 && !p358) {
      v517.innerHTML = "<div style=\"text-align:center; padding:30px; color:var(--text-muted);\">No sounds found for \"" + p357 + "\".</div>";
      return;
    }
    v529.forEach(item => {
      v517.appendChild(f56(item));
    });
  }
  v517.addEventListener("scroll", () => {
    if (v519 || !v518) {
      return;
    }
    if (v517.scrollTop + v517.clientHeight >= v517.scrollHeight - 60) {
      f57(vLS12, true);
    }
  });
  let v530;
  v516.addEventListener("input", () => {
    clearTimeout(v530);
    v530 = setTimeout(() => {
      f57(v516.value.trim());
    }, 400);
  });
  setTimeout(() => v516.focus(), 100);
  f57("");
}
window.openSoundLibrary = openSoundLibrary;
async function initTTS() {
  const v531 = document.getElementById("tts-enabled");
  const v532 = document.getElementById("tts-voice-select");
  const v533 = document.getElementById("tts-random-voice");
  const v534 = document.getElementById("tts-speed");
  const v535 = document.getElementById("tts-pitch");
  const v536 = document.getElementById("tts-volume");
  const v537 = document.getElementById("tts-save-btn");
  const v538 = document.getElementById("tts-test-btn");
  const v539 = document.getElementById("tts-test-input");
  const v540 = document.getElementById("tts-perm-all");
  const v541 = document.getElementById("tts-perm-followers");
  const v542 = document.getElementById("tts-perm-subscribers");
  const v543 = document.getElementById("tts-perm-moderators");
  const v544 = document.getElementById("tts-perm-likes");
  const v545 = document.getElementById("tts-perm-coins");
  const v546 = document.getElementById("tts-cooldown");
  const v547 = document.getElementById("tts-max-queue");
  const v548 = document.getElementById("tts-max-len");
  const v549 = document.getElementById("tts-filter-letter");
  const v550 = document.getElementById("tts-filter-mentions");
  const v551 = document.getElementById("tts-filter-cmds");
  const v552 = document.getElementById("tts-blacklist");
  if (!v531) {
    return;
  }
  const vA17 = [{
    value: "ar-EG-SalmaNeural",
    text: "Egyptian (Female) - Salma"
  }, {
    value: "ar-EG-ShakirNeural",
    text: "Egyptian (Male) - Shakir"
  }, {
    value: "ar-SA-ZariyahNeural",
    text: "Saudi (Female) - Zariyah"
  }, {
    value: "ar-SA-HamedNeural",
    text: "Saudi (Male) - Hamed"
  }, {
    value: "ar-AE-FatimaNeural",
    text: "Emirati (Female) - Fatima"
  }, {
    value: "ar-AE-HamdanNeural",
    text: "Emirati (Male) - Hamdan"
  }, {
    value: "ar-JO-SanaNeural",
    text: "Jordanian (Female) - Sana"
  }, {
    value: "ar-JO-TaimNeural",
    text: "Jordanian (Male) - Taim"
  }, {
    value: "ar-SY-AmanyNeural",
    text: "Syrian (Female) - Amany"
  }, {
    value: "ar-SY-LaithNeural",
    text: "Syrian (Male) - Laith"
  }, {
    value: "ar-QA-AmalNeural",
    text: "Qatari (Female) - Amal"
  }, {
    value: "ar-QA-AliNeural",
    text: "Qatari (Male) - Ali"
  }, {
    value: "ar-KW-NouraNeural",
    text: "Kuwaiti (Female) - Noura"
  }, {
    value: "ar-KW-FahedNeural",
    text: "Kuwaiti (Male) - Fahed"
  }, {
    value: "ar-MA-MounaNeural",
    text: "Moroccan (Female) - Mouna"
  }, {
    value: "ar-MA-JamalNeural",
    text: "Moroccan (Male) - Jamal"
  }, {
    value: "ar-DZ-AminaNeural",
    text: "Algerian (Female) - Amina"
  }, {
    value: "ar-DZ-IsmaelNeural",
    text: "Algerian (Male) - Ismael"
  }, {
    value: "ar-TN-ReemNeural",
    text: "Tunisian (Female) - Reem"
  }, {
    value: "ar-TN-HediNeural",
    text: "Tunisian (Male) - Hedi"
  }, {
    value: "ar-IQ-RanaNeural",
    text: "Iraqi (Female) - Rana"
  }, {
    value: "ar-IQ-BasselNeural",
    text: "Iraqi (Male) - Bassel"
  }];
  function f58() {
    v532.innerHTML = "<option value=\"\">Default (Random Voice)</option>";
    vA17.forEach(item => {
      const optionEl = document.createElement("option");
      optionEl.value = item.value;
      optionEl.textContent = item.text;
      v532.appendChild(optionEl);
    });
  }
  f58();
  let v554 = (await api.store.get("widget_tts")) || {};
  v531.checked = v554.enabled || false;
  v533.checked = v554.randomVoice !== false;
  v534.value = v554.speed || 1;
  v535.value = v554.pitch || 1;
  v536.value = v554.volume || 1;
  v540.checked = v554.permAll !== false;
  v541.checked = v554.permFollowers !== false;
  v542.checked = v554.permSubscribers !== false;
  v543.checked = v554.permModerators !== false;
  v544.value = v554.permLikes || 0;
  v545.value = v554.permCoins || 0;
  v546.value = v554.cooldown !== undefined ? v554.cooldown : 5;
  v547.value = v554.maxQueue || 5;
  v548.value = v554.maxLen || 150;
  v549.checked = v554.filterLetter !== false;
  v550.checked = v554.filterMentions !== false;
  v551.checked = v554.filterCmds !== false;
  v552.value = v554.blacklist || "";
  setTimeout(() => {
    if (v554.voiceURI) {
      v532.value = v554.voiceURI;
    }
  }, 100);
  v537.addEventListener("click", async () => {
    const vO20 = {
      enabled: v531.checked,
      voiceURI: v532.value,
      randomVoice: v533.checked,
      speed: parseFloat(v534.value),
      pitch: parseFloat(v535.value),
      volume: parseFloat(v536.value),
      permAll: v540.checked,
      permFollowers: v541.checked,
      permSubscribers: v542.checked,
      permModerators: v543.checked,
      permLikes: parseInt(v544.value) || 0,
      permCoins: parseInt(v545.value) || 0,
      cooldown: parseInt(v546.value) || 0,
      maxQueue: parseInt(v547.value) || 5,
      maxLen: parseInt(v548.value) || 150,
      filterLetter: v549.checked,
      filterMentions: v550.checked,
      filterCmds: v551.checked,
      blacklist: v552.value
    };
    await api.store.set("widget_tts", vO20);
    const v555 = v537.textContent;
    v537.textContent = "Saved!";
    setTimeout(() => v537.textContent = v555, 2000);
  });
  v538.addEventListener("click", async () => {
    const v556 = v539.value.trim();
    if (!v556) {
      v539.style.borderColor = "#e05252";
      v539.placeholder = "اكتب نص هنا الأول ثم اضغط Test Voice";
      setTimeout(() => {
        v539.style.borderColor = "";
      }, 1600);
      return;
    }
    v538.disabled = true;
    const v557 = v538.textContent;
    v538.textContent = "Generating...";
    try {
      let v558 = v532.value;
      if (!v558 || v533.checked) {
        v558 = vA17[Math.floor(Math.random() * vA17.length)].value;
      }
      const v559 = Math.round(((parseFloat(v534.value) || 1) - 1) * 100);
      const v560 = (v559 >= 0 ? "+" : "") + v559 + "%";
      const v561 = Math.round(((parseFloat(v535.value) || 1) - 1) * 50);
      const v562 = (v561 >= 0 ? "+" : "") + v561 + "Hz";
      const v563 = Math.round(((parseFloat(v536.value) || 1) - 1) * 100);
      const v564 = (v563 >= 0 ? "+" : "") + v563 + "%";
      await api.overlay.testTTS(v556, {
        voice: v558,
        rate: v560,
        pitch: v562,
        volume: v564
      });
    } catch (err) {
      console.error("TTS Generation Error:", err);
    }
    v538.textContent = v557;
    v538.disabled = false;
  });
}
initTTS();
(function initUpdatePrompt() {
  if (typeof window.api?.onUpdateReady !== "function") {
    return;
  }
  let v565 = null;
  window.api.onUpdateReady(async p361 => {
    if (v565 === p361) {
      return;
    }
    v565 = p361;
    const v566 = await uiConfirm("🔄 فيه تحديث جديد جاهز (النسخة " + p361 + ").\nتحب نحدّث البرنامج دلوقتي؟\nلو اخترت «لاحقًا» — التحديث هيتسطب تلقائيًا أول ما تقفل البرنامج من غير ما تعمل حاجة.", {
      title: "تحديث جديد",
      icon: "🔄",
      okText: "حدّث دلوقتي",
      cancelText: "لاحقًا عند القفل"
    });
    if (v566) {
      try {
        await window.api.installUpdateNow();
      } catch (err) {}
    }
  });
})();
async function checkSubscriptionBanner() {
  try {
    const vLSSubexpirybanner = "sub-expiry-banner";
    let v567 = document.getElementById(vLSSubexpirybanner);
    const getLicenseStateResult2 = await api.getLicenseState();
    if (!getLicenseStateResult2 || getLicenseStateResult2.tier === "free" || !getLicenseStateResult2.expiresAt) {
      if (v567) {
        v567.remove();
      }
      return;
    }
    const date = new Date(getLicenseStateResult2.expiresAt);
    if (isNaN(date.getTime())) {
      return;
    }
    const v570 = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (v570 > 3 || v570 < 0) {
      if (v567) {
        v567.remove();
      }
      return;
    }
    if (v567) {
      v567.querySelector(".sub-days").textContent = String(v570);
      return;
    }
    v567 = document.createElement("div");
    v567.id = vLSSubexpirybanner;
    v567.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9000;display:flex;align-items:center;justify-content:center;gap:14px;padding:10px 16px;background:linear-gradient(180deg,#3a2f10,#2a2109);border-bottom:1px solid rgba(212,175,55,.45);color:#ecd28a;font-size:13px;font-weight:700;box-shadow:0 4px 18px rgba(0,0,0,.4)";
    v567.innerHTML = "⏳ اشتراكك PRO هيخلص خلال <span class=\"sub-days\">" + v570 + "</span> " + (v570 === 1 ? "يوم واحد" : "أيام") + " — جدّد دلوقتي عشان البرنامج ميتقطعش عليك\n      <button class=\"sub-renew\" style=\"background:linear-gradient(180deg,#e8ca74,#c69c2d);color:#201803;border:none;border-radius:6px;padding:6px 14px;font-weight:800;cursor:pointer;font-family:inherit;font-size:12.5px\">💎 تجديد</button>\n      <button class=\"sub-close\" style=\"background:transparent;color:#a6a198;border:none;cursor:pointer;font-size:15px;padding:4px 6px\">✕</button>";
    document.body.appendChild(v567);
    v567.querySelector(".sub-close").addEventListener("click", () => v567.remove());
    v567.querySelector(".sub-renew").addEventListener("click", async () => {
      try {
        const getPaymentLinksResult2 = await api.getPaymentLinks();
        if (getPaymentLinksResult2.paypalUrl) {
          try {
            api.openExternal(getPaymentLinksResult2.paypalUrl);
          } catch (err) {}
        }
        const v572 = getPaymentLinksResult2.vodafoneCash || "01558345646";
        try {
          api.copyText(v572);
        } catch (err) {}
        uiAlert("للتجديد: حوّل على الرقم " + v572 + " (كاش بأي شبكة) وابعته واتساب وهنفّل حسابك خلال دقائق 💎");
      } catch (err) {
        uiAlert("تواصل مع الدعم للتجديد: Discord — KEMOELDALY 💎");
      }
    });
  } catch (err) {}
}
checkSubscriptionBanner();
setInterval(checkSubscriptionBanner, 1800000);
(function initLocalTTSPlayback() {
  if (typeof api.overlay?.onPlayLocalTTS !== "function") {
    return;
  }
  let v573 = null;
  const vF29 = p362 => {
    if (typeof p362 === "number") {
      return Math.max(0, Math.min(1, p362));
    }
    if (typeof p362 === "string") {
      const vParseFloat7 = parseFloat(p362.replace("%", ""));
      if (!isNaN(vParseFloat7)) {
        return Math.max(0, Math.min(1, 1 + vParseFloat7 / 100));
      }
    }
    return 1;
  };
  api.overlay.onPlayLocalTTS(p363 => {
    try {
      if (v573) {
        try {
          v573.pause();
        } catch (err) {}
      }
      let v574 = null;
      if (p363.audioBase64) {
        v574 = "data:audio/mp3;base64," + p363.audioBase64;
      } else if (p363.url) {
        v574 = p363.url;
      }
      if (!v574) {
        return;
      }
      v573 = new Audio(v574);
      v573.volume = vF29(p363.config && p363.config.volume);
      v573.play().catch(() => {});
    } catch (err) {}
  });
})();
})();
// ═══════════════ Song Requests — ELDALY STREAM ═══════════════
(function () {
  if (!document.getElementById("page-songs")) return;
  const $ = (id) => document.getElementById(id);
  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function fmt(ms) { const sec = Math.max(0, Math.round(ms / 1000)); return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }

  async function srReq(method, path, body) {
    try { return await api.sr.request(method, path, body); } catch (e) { return { ok: false, error: e.message }; }
  }

  function srApply(st) {
    if (!st) return;
    const sc = $("sr-sc-status");
    if (sc) {
      sc.textContent = st.searchAvailable ? "Connected ✓" : "Unavailable ✗";
      sc.className = "sr-sc " + (st.searchAvailable ? "ok" : "fail");
    }
    const stateEl = $("sr-state");
    if (stateEl) {
      stateEl.textContent = st.settings && st.settings.enabled ? "Online" : "Offline";
      stateEl.style.color = st.settings && st.settings.enabled ? "#57a273" : "#d97a74";
    }
    renderQueue(st);
  }

  function renderQueue(st) {
    const list = $("sr-queue-list");
    if (!list) return;
    const all = (st.current ? [st.current] : []).concat(st.queue || []);
    if (!all.length) {
      list.innerHTML = '<div class="sr-empty">No songs in the queue — viewers type !play in chat 🎧</div>';
      return;
    }
    let startIn = 0;
    list.innerHTML = all.map((q, i) => {
      const now = i === 0 && q.startedAt;
      const elapsed = now ? Math.min(Date.now() - q.startedAt, q.durationMs || 0) : 0;
      let line;
      if (now) { line = '<span class="now-tag">NOW </span>' + fmt(elapsed) + ' / ' + fmt(q.durationMs || 0); startIn = Math.max(0, (q.durationMs || 0) - elapsed); }
      else { line = 'Starts in ' + fmt(startIn) + ' • ' + esc(q.requestedBy || ''); startIn += q.durationMs || 0; }
      return '<div class="sr-q' + (now ? ' now' : '') + '">'
        + (q.artwork ? '<img src="' + esc(q.artwork) + '" alt="">' : '')
        + '<div class="sr-q-info"><div class="sr-q-t">' + esc(q.title) + ' — ' + esc(q.artist || '') + '</div><div class="sr-q-s">' + line + '</div></div>'
        + '<button class="btn btn-danger btn-sm" data-sr-del="' + esc(q.id) + '" title="Remove">✕</button>'
        + '</div>';
    }).join("");
    list.querySelectorAll("[data-sr-del]").forEach((b) =>
      b.addEventListener("click", async () => { await srReq("POST", "remove", { id: b.dataset.srDel }); srRefresh(); }));
  }

  async function srRefresh() {
    try {
      const r = await srReq("GET", "state");
      // الميزة حصرية لباقة Pro — المجاني يشوف قفل ترقية بدل قايمة فاضية
      if (r && r.proRequired) {
        const st = $("sr-state");
        if (st) { st.textContent = "PRO"; st.style.color = "#d4af37"; }
        const q = $("sr-queue-list");
        if (q) {
          q.innerHTML =
            '<div class="sr-empty" style="text-align:center;padding:26px 14px;border:1px dashed rgba(212,175,55,.4);border-radius:12px">'
            + '<div style="font-size:30px;margin-bottom:8px">🔒</div>'
            + '<div style="font-weight:800;color:#ecd28a;margin-bottom:6px">Song Requests is a PRO feature</div>'
            + '<div style="font-size:12.5px;color:var(--text-muted,#a6a198)">طلب الأغاني متاح لمشتركي الباقة المدفوعة (Pro) — رقّي باقتك لتفعيلها</div>'
            + '</div>';
        }
        return;
      }
      srApply(r);
    } catch (e) {}
  }

  function fillSettings(s) {
    if (!s) return;
    const map = {
      "sr-enabled": s.enabled !== false,
      "sr-play-enabled": s.playEnabled !== false,
      "sr-play-cost": s.playCost ?? 0,
      "sr-skip-enabled": s.skipEnabled !== false,
      "sr-skip-cost": s.skipCost ?? 1,
      "sr-allow-skip-own": s.allowSkipRequested !== false,
      "sr-allow-explicit": s.allowExplicit !== false,
      "sr-max-queue": s.maxQueue ?? 20,
      "sr-max-user": s.maxQueuePerUser ?? 2,
      "sr-permanent": s.overlayPermanent !== false,
      "sr-volume": s.volume ?? 80,
      "sr-scale": s.overlayScale ?? 100,
      "sr-points": s.pointsPerMessage ?? 1,
    };
    for (const [id, val] of Object.entries(map)) {
      const el = $(id);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!val;
      else { el.value = val; el.dispatchEvent(new Event("input")); }
    }
    const fb = $("sr-fallback"); if (fb) fb.value = s.fallbackUrl || "";
    const ra = $("sr-roles-all"); if (ra) ra.checked = (s.allowedFor || {}).all !== false;
    const rs = $("sr-roles-subs"); if (rs) rs.checked = !!(s.allowedFor || {}).subs;
    const rm = $("sr-roles-mods"); if (rm) rm.checked = (s.allowedFor || {}).mods !== false;
    const cp = $("sr-cmd-play"); if (cp) cp.textContent = s.playCmd || "!play";
    const cs = $("sr-cmd-skip"); if (cs) cs.textContent = s.skipCmd || "!skip";
  }

  async function loadSettings() {
    try { const r = await srReq("GET", "settings"); if (r && r.settings) fillSettings(r.settings); } catch (e) {}
  }

  async function loadHistory() {
    try {
      const q = ($("sr-hist-search") || {}).value || "";
      const r = await srReq("GET", "history?q=" + encodeURIComponent(q));
      const body = $("sr-hist-body");
      if (!body) return;
      const hist = (r && r.history) || [];
      if (!hist.length) { body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted,#6d6960)">No data</td></tr>'; return; }
      body.innerHTML = hist.map((h) =>
        '<tr><td>' + esc(new Date(h.date).toLocaleString("en-GB")) + '</td>'
        + '<td style="direction:ltr;text-align:left">' + esc(h.user) + '</td>'
        + '<td style="font-weight:700">' + esc(h.track) + '</td>'
        + '<td class="st-' + esc(h.status) + '">' + esc(h.status) + '</td></tr>'
      ).join("");
    } catch (e) {}
  }

  // ===== Event wiring =====
  // الصوت والمقاس بيتبعتوا لحظيًا أثناء التحريك — السيرفر بيحفظ ويبث sr-settings
  // للمشغل في نفس اللحظة (debounce قصير عشان سحبة سلايدر واحدة = طلب واحد)
  let srAutoSaveTimer = null;
  function autoSaveSrSettings() {
    clearTimeout(srAutoSaveTimer);
    srAutoSaveTimer = setTimeout(async () => {
      try { await srReq("POST", "settings", collectSrSettings()); } catch (e) {}
    }, 250);
  }
  const vol = $("sr-volume"), volVal = $("sr-volume-val");
  // isTrusted: الحفظ اللحظي للاستخدام الحقيقي بس — ملء الإعدادات البرمجي مبيعملش حفظ زائد
  if (vol && volVal) vol.addEventListener("input", (e) => { volVal.textContent = vol.value; if (e.isTrusted) autoSaveSrSettings(); });
  const scale = $("sr-scale"), scaleVal = $("sr-scale-val");
  if (scale && scaleVal) scale.addEventListener("input", (e) => { scaleVal.textContent = scale.value + "%"; if (e.isTrusted) autoSaveSrSettings(); });

  const ctrl = async (action) => { await srReq("POST", "control", { action }); };
  const bp = $("sr-pause"), br = $("sr-resume"), brs = $("sr-restart");
  if (bp) bp.addEventListener("click", () => ctrl("pause"));
  if (br) br.addEventListener("click", () => ctrl("resume"));
  if (brs) brs.addEventListener("click", () => ctrl("restart"));

  function collectSrSettings() {
    return {
      enabled: ($("sr-enabled") || {}).checked !== false,
      playEnabled: ($("sr-play-enabled") || {}).checked !== false,
      playCost: parseInt(($("sr-play-cost") || {}).value, 10) || 0,
      skipEnabled: ($("sr-skip-enabled") || {}).checked !== false,
      skipCost: parseInt(($("sr-skip-cost") || {}).value, 10) || 0,
      allowSkipRequested: ($("sr-allow-skip-own") || {}).checked !== false,
      allowExplicit: ($("sr-allow-explicit") || {}).checked !== false,
      maxQueue: parseInt(($("sr-max-queue") || {}).value, 10) || 20,
      maxQueuePerUser: parseInt(($("sr-max-user") || {}).value, 10) || 2,
      overlayPermanent: ($("sr-permanent") || {}).checked !== false,
      volume: Math.max(0, Math.min(100, parseInt(($("sr-volume") || {}).value, 10) || 80)),
      overlayScale: Math.max(40, Math.min(200, parseInt(($("sr-scale") || {}).value, 10) || 100)),
      fallbackUrl: (($("sr-fallback") || {}).value || "").trim(),
      pointsPerMessage: parseInt(($("sr-points") || {}).value, 10) || 0,
      allowedFor: {
        all: ($("sr-roles-all") || {}).checked !== false,
        subs: ($("sr-roles-subs") || {}).checked !== false,
        mods: ($("sr-roles-mods") || {}).checked !== false,
      },
    };
  }

  $("sr-save").addEventListener("click", async () => {
    const r = await srReq("POST", "settings", collectSrSettings());
    const msg = $("sr-save-msg");
    if (msg) {
      msg.textContent = r && r.ok ? "✅ Saved — applied instantly" : "⚠ Save failed" + (r && r.error ? " — " + r.error : "");
      msg.className = "msg " + (r && r.ok ? "ok" : "bad");
    }
    srRefresh();
  });

  $("sr-test-add").addEventListener("click", async () => {
    const q = ($("sr-test-name") || {}).value.trim();
    const msg = $("sr-test-msg");
    if (!q) { if (msg) { msg.textContent = "Type a song name first"; msg.className = "msg bad"; } return; }
    if (msg) { msg.textContent = "Searching SoundCloud..."; msg.className = "msg info"; }
    const r = await srReq("POST", "test", { query: q });
    if (r && r.ok) {
      if (msg) { msg.textContent = "✅ Added: " + ((r.track || {}).title || ""); msg.className = "msg ok"; }
      $("sr-test-name").value = "";
      srRefresh();
    } else if (msg) { msg.textContent = "⚠ " + ((r && r.error) || "failed"); msg.className = "msg bad"; }
  });

  const skipNow = $("sr-skip-now");
  if (skipNow) skipNow.addEventListener("click", async () => { await srReq("POST", "skip"); srRefresh(); });
  const clearBtn = $("sr-clear");
  if (clearBtn) clearBtn.addEventListener("click", async () => { await srReq("POST", "clear"); srRefresh(); });
  const histSearch = $("sr-hist-search");
  if (histSearch) histSearch.addEventListener("input", loadHistory);

  // Overlay URL
  (async () => {
    try {
      const info = await api.overlay.getInfo();
      const el = $("sr-ov-url");
      const url = await api.overlay.getWidgetUrl('overlay-music');
      if (el && url) el.textContent = url;
      const cp = $("sr-ov-copy");
      if (cp) cp.addEventListener("click", () => {
        navigator.clipboard.writeText(el.textContent).then(() => {
          cp.textContent = "✅ Copied";
          setTimeout(() => (cp.textContent = "📋 Copy Overlay URL"), 2000);
        });
      });
    } catch (e) {}
  })();

  // Init
  loadSettings();
  srRefresh();
  loadHistory();
  // 15 ثانية بدل 3 — السيرفر بيعدّ الطلبات، والتحديث الفوري بييجي من
  // الإجراءات نفسها (skip/clear/test بيطلبوا srRefresh على طول)
  setInterval(() => srRefresh(), 15000);
})();

