const fs = require("fs");
let s = fs.readFileSync("src/renderer.js", "utf8").replace(/
/g, "
");

// 1) loadWidgetConfigs: استبدل قيدي last-follower/last-gift القدامى بالخمسة الجداد
const oldEntries = `  }, {
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
  }, {`;
const newEntries = `  }, {
    prefix: "top-gifter",
    id: "top-gifter",
    def: {
      title: "Top Gifters",
      c1: "#d4af37",
      c2: "#ffb84d"
    }
  }, {
    prefix: "top-liker",
    id: "top-liker",
    def: {
      title: "Top Likers",
      c1: "#ff3b5c",
      c2: "#ff8c69"
    }
  }, {
    prefix: "latest-like",
    id: "latest-like",
    def: {
      title: "آخر لايك",
      desc: "",
      layout: "royal",
      c1: "#ff3b5c",
      c2: "#ff8c69"
    }
  }, {
    prefix: "latest-follow",
    id: "latest-follow",
    def: {
      title: "متابعة جديدة",
      desc: "بدأ يتابعك الآن ✨",
      layout: "royal",
      c1: "#2dd4bf",
      c2: "#7bf5d9"
    }
  }, {
    prefix: "latest-join",
    id: "latest-join",
    def: {
      title: "دخل اللايف",
      desc: "انضم للمعركة 🔥",
      layout: "royal",
      c1: "#58a6ff",
      c2: "#9cc8ff"
    }
  }, {
    prefix: "latest-share",
    id: "latest-share",
    def: {
      title: "شارك اللايف",
      desc: "شارك البث مع متابعينه 📣",
      layout: "royal",
      c1: "#ffb84d",
      c2: "#ffd98a"
    }
  }, {
    prefix: "latest-gift",
    id: "latest-gift",
    def: {
      title: "آخر هدية",
      desc: "",
      layout: "royal",
      c1: "#d4af37",
      c2: "#f2dc93"
    }
  }, {`;
if (!s.includes(oldEntries)) { console.log("entries NOT FOUND"); process.exit(1); }
s = s.replace(oldEntries, newEntries);
console.log("1) entries replaced");

// 2) fill loop: يعبّي desc وlayout برضه
const oldFill = `      const v248 = document.getElementById("w-" + v242.prefix + "-style");
      if (v248) {
        v248.value = getResult5.style || "style-1";
      }`;
const newFill = `      const v248 = document.getElementById("w-" + v242.prefix + "-style");
      if (v248) {
        v248.value = getResult5.style || "style-1";
      }
      const descField = document.getElementById("w-" + v242.prefix + "-desc");
      if (descField) {
        descField.value = getResult5.desc !== undefined ? getResult5.desc : "";
      }`;
if (!s.includes(oldFill)) { console.log("fill NOT FOUND"); process.exit(1); }
s = s.replace(oldFill, newFill);
console.log("2) desc fill added");

// 3) تعبئة اللينكات + المعاينات الحية للخمسة (بعد لينكات التصنيفات)
const urlAnchor = `    const likerUrl = await api.overlay.getWidgetUrl("top-likers", "id=top-liker");
    const likerInput = document.getElementById("w-top-liker-url");
    if (likerInput && likerUrl) likerInput.value = likerUrl;
  } catch (err) {}`;
const urlNew = urlAnchor + `
  // ويدجتات آخر الأحداث: لينك حقيقي + معاينة حية جوه الكارت
  const latestIds = ["latest-like", "latest-follow", "latest-join", "latest-share", "latest-gift"];
  for (const wid of latestIds) {
    try {
      const wUrl = await api.overlay.getWidgetUrl(wid, "id=" + wid);
      const urlInput = document.getElementById("w-" + wid + "-url");
      if (urlInput && wUrl) urlInput.value = wUrl;
      const prev = document.getElementById("w-" + wid + "-preview");
      if (prev && wUrl) prev.src = wUrl;
    } catch (err) {}
  }`;
if (!s.includes(urlAnchor)) { console.log("url anchor NOT FOUND"); process.exit(1); }
s = s.replace(urlAnchor, urlNew);
console.log("3) urls + previews wired");

// 4) Apply: يقرأ desc + layout (applyWidgetConfig بيقرأ layout بالفعل — نضيف desc)
const applyOld = `  const avaEl = document.getElementById("w-" + p194 + "-ava");
  if (avaEl) vO5.showAvatars = avaEl.checked;`;
const applyNew = applyOld + `
  const descEl = document.getElementById("w-" + p194 + "-desc");
  if (descEl) vO5.desc = descEl.value;`;
if (!s.includes(applyOld)) { console.log("apply anchor NOT FOUND"); process.exit(1); }
s = s.replace(applyOld, applyNew);
console.log("4) desc in apply");

// 5) Apply + Test handlers للخمسة (بعد معالجات التصنيفات)
const handlerAnchor = `document.getElementById("w-top-liker-test")?.addEventListener("click", () => testLeaderboardWidget("top-liker", "top-liker"));`;
const handlersNew = handlerAnchor + `
// LAST EVENTS — Apply + Test للخمسة
const LATEST_WIDGETS = ["latest-like", "latest-follow", "latest-join", "latest-share", "latest-gift"];
for (const lwid of LATEST_WIDGETS) {
  document.getElementById("w-" + lwid + "-apply")?.addEventListener("click", () => applyWidgetConfig(lwid, lwid));
  document.getElementById("w-" + lwid + "-test")?.addEventListener("click", async () => {
    const btn = document.getElementById("w-" + lwid + "-test");
    if (btn) btn.textContent = "⏳ ...";
    await applyWidgetConfig(lwid, lwid);
    await api.widget.test(lwid, { source: "settings-test" });
    if (btn) { btn.textContent = "✅ Sent!"; setTimeout(() => btn.textContent = "🧪 Test", 2000); }
  });
}`;
if (!s.includes(handlerAnchor)) { console.log("handler anchor NOT FOUND"); process.exit(1); }
s = s.replace(handlerAnchor, handlersNew);
console.log("5) apply/test handlers added");

fs.writeFileSync("src/renderer.js", s);
console.log("renderer.js DONE");
