// ==========================================================================
// compile.js — تجهيز نسخة الفرونت المحمية بالكامل
//   npx electron scripts/compile.js
//
// 1) تشفير كل HTML/CSS بـ AES-256-GCM (المفتاح بيتولد لكل بناء)
//    وكتابة asset-key.js (بيتشفر هو كمان لـ bytecode وبيتمسح نصه)
// 2) تحويل كل كود JS لـ V8 bytecode عبر bytenode
// لازم يشتغل بنفس نسخة Electron اللي هتوزّعها عشان نسخة V8 تتطابق.
// ==========================================================================
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { app } = require("electron");

const ROOT = path.join(__dirname, "..");

const JSC_TARGETS = [
  ["main.js", "main.jsc"],
  ["src/renderer.js", "src/renderer.jsc"],
  ["src/license-renderer.js", "src/license-renderer.jsc"],
  ["src/services/local-overlay-server.js", "src/services/local-overlay-server.jsc"],
  ["src/services/keyboard.js", "src/services/keyboard.jsc"],
  ["src/services/secure-assets.js", "src/services/secure-assets.jsc"],
  ["src/asset-key.js", "src/asset-key.jsc"],
];

function listFiles(dir, ext) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.toLowerCase().endsWith(ext))
    .map((f) => path.join(dir, f));
}

function encryptAssets(key) {
  const assets = [
    "src/index.html",
    "src/license.html",
    "src/skeleton.html",
    "src/license.css",
    ...listFiles("src/styles", ".css"),
    ...listFiles("src/widgets", ".html"),
  ];
  let count = 0;
  for (const rel of assets) {
    const plain = path.join(ROOT, rel);
    if (!fs.existsSync(plain)) continue;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([cipher.update(fs.readFileSync(plain)), cipher.final()]);
    const out = Buffer.concat([iv, cipher.getAuthTag(), data]);
    fs.writeFileSync(plain + ".enc", out);
    count++;
  }
  return count;
}

async function main() {
  const bytenode = require("bytenode");
  let failed = false;

  // 1) مفتاح عشوائي لهذا البناء — مقسوم نصين في ملف بيتجمّع bytecode
  const key = crypto.randomBytes(32);
  const keyFile = path.join(ROOT, "src", "asset-key.js");
  fs.writeFileSync(
    keyFile,
    'module.exports = { a: "' +
      key.subarray(0, 16).toString("hex") +
      '", b: "' +
      key.subarray(16).toString("hex") +
      '" };\n',
  );

  const encCount = encryptAssets(key);
  console.log(`[compile] encrypted ${encCount} html/css assets (aes-256-gcm)`);

  // 2) تحويل كل الأهداف لـ bytecode
  for (const [src, out] of JSC_TARGETS) {
    const srcPath = path.join(ROOT, src);
    const outPath = path.join(ROOT, out);
    if (!fs.existsSync(srcPath)) {
      console.error("[compile] source missing: " + src);
      failed = true;
      continue;
    }
    try {
      await bytenode.compileFile(srcPath, outPath);
      const size = fs.statSync(outPath).size;
      console.log(`[compile] ${src} -> ${out} (${size} bytes)`);
    } catch (err) {
      console.error(`[compile] FAILED ${src}: ${err.message}`);
      failed = true;
    }
  }

  // 2.5) preload.js — يتحوّل bytecode، ومكانه stub صغير بيحمّل preload.jsc
  //      السورس الأصلي بيتحفظ في preload.src.js (لوضع التطوير — مش بيتوزّع)
  const preloadPath = path.join(ROOT, "preload.js");
  const preloadSrcPath = path.join(ROOT, "preload.src.js");
  // بناء سابق ممكن يكون كتب stub مكان preload.js — السورس الأصلي دايمًا في preload.src.js
  const preloadSource = fs.existsSync(preloadSrcPath) ? preloadSrcPath : preloadPath;
  try {
    await bytenode.compileFile(preloadSource, path.join(ROOT, "preload.jsc"));
    if (preloadSource !== preloadSrcPath) {
      fs.copyFileSync(preloadPath, preloadSrcPath);
    }
    fs.writeFileSync(
      preloadPath,
      [
        "// ==========================================================================",
        "// preload.js — loader stub (النسخة المبنية). الكود الحقيقي في preload.jsc",
        "// ==========================================================================",
        'try { require("bytenode"); } catch (e) {}',
        'const fs = require("fs");',
        'const path = require("path");',
        'const jscPath = path.join(__dirname, "preload.jsc");',
        'const srcPath = path.join(__dirname, "preload.src.js");',
        "if (fs.existsSync(jscPath)) {",
        "  require(jscPath);",
        "} else if (fs.existsSync(srcPath)) {",
        "  // وضع التطوير: clean-jsc مسح الـ bytecode — رجّع للسورس",
        "  require(srcPath);",
        "}",
        "",
      ].join("\n"),
    );
    console.log("[compile] preload.js -> preload.jsc (+ loader stub)");
  } catch (err) {
    console.error(`[compile] FAILED preload.js: ${err.message}`);
    failed = true;
  }

  // 3) امسح نص المفتاح — موجود بس كـ bytecode
  try {
    if (fs.existsSync(keyFile)) fs.unlinkSync(keyFile);
  } catch (e) {}

  if (failed) {
    app.exit(1);
    return;
  }
  console.log("[compile] all targets compiled");
  app.exit(0);
}

main().catch((err) => {
  console.error("[compile] fatal:", err);
  app.exit(1);
});
