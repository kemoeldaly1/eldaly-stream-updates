// رجوع لوضع التطوير: شيل ملفات الـ bytecode والنسخ المشفرة
// عشان تشتغل على المصدر مباشرة من غير نسخ قديمة
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// شيل ملفات .jsc في أماكنها المعروفة
const JSC_FILES = [
  "main.jsc",
  "preload.jsc",
  "src/renderer.jsc",
  "src/license-renderer.jsc",
  "src/services/local-overlay-server.jsc",
  "src/services/keyboard.jsc",
  "src/services/secure-assets.jsc",
  "src/asset-key.jsc",
];

// رجّع preload.js الأصلي — البناء بيستبدله بـ stub بيحمّل preload.jsc
const preloadSrc = path.join(ROOT, "preload.src.js");
const preloadPath = path.join(ROOT, "preload.js");
if (fs.existsSync(preloadSrc)) {
  fs.copyFileSync(preloadSrc, preloadPath);
  fs.unlinkSync(preloadSrc);
  console.log("[clean] restored preload.js from preload.src.js");
}

for (const file of JSC_FILES) {
  const p = path.join(ROOT, file);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log("[clean] removed " + file);
  }
}

// شيل كل النسخ المشفرة .enc تحت src
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".enc")) {
      fs.unlinkSync(full);
      console.log("[clean] removed " + path.relative(ROOT, full));
    }
  }
}
walk(path.join(ROOT, "src"));
