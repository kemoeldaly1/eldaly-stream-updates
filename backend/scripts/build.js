// ==========================================================================
// build.js — نسخة نشر مشفّرة (V8 bytecode) من الباك إند
//   npm run build
// بينتج مجلد deploy/ جاهز للرفع على السيرفر — المصدر .js مش موجود فيه.
//
// ملحوظة مهمة: الـ bytecode مرتبط بنسخة V8/Node — لازم نفس إصدار Node
// الكبير (major) على السيرفر اللي هو اللي اتجمع بيه محليًا.
// ==========================================================================
const fs = require("fs");
const path = require("path");
const bytenode = require("bytenode");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "deploy");

// مجلدات بتتقفل — data الجذري (بيانات تشغيل) و temp مش جزء من الكود
// widgets مش محتاجينها في الباك إند — الويدجت بتتقدم من تطبيق الديسكتوب
const SKIP_DIRS = new Set(["node_modules", "deploy", "test", "temp_tts"]); // widgets بتتضمن دلوقتي — الأوفرلاي السحابي بيقدمها
const ALLOWED_EXT = new Set([".js", ".json", ".html", ".wav", ".cs", ".exe", ".png"]);

// ==========================================================================
// صفحات نظام الأغاني — بتتشحن minified (من غير التعليقات الشارحة للنظام):
// جوهر الفكرة (اكتشاف مفتاح ساوند كلاود، النقاط، الطابور) عايش في
// soundcloud.jsc المُجمّع، والصفحات دي مجرد واجهة عرض — فمتشحنش مقروءة.
// التحويل محافظ (شيل تعليقات و أسطر فاضية بس) وبعده فحص syntax لكل
// <script> — لو أي فحص فشل الملف بينتسخ زي ما هو.
// ==========================================================================
const MINIFY_WIDGETS = new Set([
  "src/widgets/songs-page.html",
  "src/widgets/overlay-music.html",
]);

function minifyWidgetHtml(src) {
  let out = src;
  out = out.replace(/<!--[\s\S]*?-->/g, ""); // تعليقات HTML
  out = out.replace(/\/\*[\s\S]*?\*\//g, ""); // تعليقات CSS/JS الكتلية
  out = out.replace(/^[ \t]*\/\/.*$/gm, ""); // تعليقات السطر — بداية السطر بس
  out = out.replace(/^[ \t]*;?[ \t]*$/gm, ""); // أسطر فاضية
  return out.replace(/\n{2,}/g, "\n");
}

function widgetScriptsSyntaxOk(html) {
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const code = m[1];
    if (!code.trim() || /^https?:/i.test(m[0].replace(/^<script\b[^>]*>/i, ""))) {
      // src خارجي — الكود فاضي عادي
      continue;
    }
    try {
      // فحص syntax من غير تشغيل — أي غلطة في الضغط بتترصد هنا
      new Function(code);
    } catch (e) {
      return false;
    }
  }
  return true;
}

function walk(dir, base = "") {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const rel = base ? base + "/" + entry.name : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, rel));
    } else {
      results.push({ rel, full, ext: path.extname(entry.name).toLowerCase() });
    }
  }
  return results;
}

async function main() {
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const files = walk(path.join(ROOT, "src"), "src");
  const compiled = [];
  const copied = [];

  for (const file of files) {
    if (!ALLOWED_EXT.has(file.ext)) continue;
    if (file.rel === "src/server.js") continue; // بيتجمّع لوحده تحت — بدون مصدر
    const outPath = path.join(OUT, file.rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    if (file.ext === ".js") {
      const jscPath = outPath.replace(/\.js$/, ".jsc");
      await bytenode.compileFile(file.full, jscPath);
      compiled.push(file.rel + " -> " + path.basename(jscPath));
    } else if (MINIFY_WIDGETS.has(file.rel)) {
      const src = fs.readFileSync(file.full, "utf-8");
      const minified = minifyWidgetHtml(src);
      if (minified !== src && widgetScriptsSyntaxOk(minified)) {
        fs.writeFileSync(outPath, minified, "utf-8");
        copied.push(file.rel + " (minified)");
      } else {
        fs.copyFileSync(file.full, outPath);
        copied.push(file.rel); // فحص الـ syntax فشل — انسخ زي ما هو
      }
    } else {
      fs.copyFileSync(file.full, outPath);
      copied.push(file.rel);
    }
  }

  // نقطة الدخول: تشغّل server.jsc لو موجود (النسخة المبنية) والمصدر مش موجود أصلًا
  const boot = `try { require("bytenode"); } catch (e) {}\nconst fs = require("fs");\nconst path = require("path");\nconst jsc = path.join(__dirname, "src", "server.jsc");\nif (fs.existsSync(jsc)) require(jsc);\nelse require("./src/server.js");\n`;
  fs.writeFileSync(path.join(OUT, "boot.js"), boot);

  // بيانات الهدايا — server.jsc بيطلبها بـ ../data/gifts (بره src)
  fs.mkdirSync(path.join(OUT, "data"), { recursive: true });
  await bytenode.compileFile(
    path.join(ROOT, "data", "gifts.js"),
    path.join(OUT, "data", "gifts.jsc"),
  );
  console.log("data/gifts -> deploy/data/gifts.jsc");

  // server.js نفسه يتحول هو كمان
  await bytenode.compileFile(
    path.join(ROOT, "src", "server.js"),
    path.join(OUT, "src", "server.jsc"),
  );

  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(OUT, "package.json"));
  const lock = path.join(ROOT, "package-lock.json");
  if (fs.existsSync(lock)) fs.copyFileSync(lock, path.join(OUT, "package-lock.json"));

  // .env مش بينتسخ — اتأكد منه على السيرفر بنفسك
  console.log("compiled:", compiled.length + 1, "files");
  console.log("copied:", copied.length, "files");
  console.log("deploy/ جاهزة — ارفعها وشغّل:");
  console.log("  npm install --omit=dev");
  console.log("  pm2 start boot.js --name eldaly-backend");
}

main().catch((err) => {
  console.error("[build] fatal:", err);
  process.exit(1);
});
