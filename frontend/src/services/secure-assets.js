// ==========================================================================
// secure-assets — قراءة أصول التطبيق (HTML/CSS) بشكل مشفّر.
//
// وقت البناء: كل ملفات HTML/CSS بتتشفر AES-256-GCM (الصيغة:
// [12 بايت IV][16 بايت tag][البيانات]) والمصدر العادي بيتبعد من الحزمة.
// وقت التشغيل: البروتوكول المخصص والسيرفر المحلي بيقرأوا النسخة المشفرة
// ويفكوها في الذاكرة — الملف العادي مش بيتكتب على الديسك خالص.
// المفتاح نفسه عايش جوه asset-key.jsc (bytecode) فمش مقروء كنص.
//
// في وضع التطوير مفيش .enc ولا مفتاح — كل حاجة بتتقري عادي.
// ==========================================================================

const crypto = require("crypto");
const fs = require("fs");

let assetKey = null;
try {
  const halves = require("../asset-key");
  assetKey = Buffer.concat([
    Buffer.from(halves.a, "hex"),
    Buffer.from(halves.b, "hex"),
  ]);
} catch (e) {
  assetKey = null;
}

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

function mimeFor(filePath) {
  const dot = String(filePath || "").lastIndexOf(".");
  const ext = dot === -1 ? "" : String(filePath).slice(dot).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function decrypt(encBuf) {
  const iv = encBuf.subarray(0, 12);
  const tag = encBuf.subarray(12, 28);
  const data = encBuf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", assetKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

// بيرجع Buffer أو null: النسخة المشفرة لو موجودة (والمفتاح متاح)،
// وإلا الملف العادي — عشان وضع التطوير يشتغل من غير أي خطوة إضافية
function readAsset(plainPath) {
  return new Promise((resolve) => {
    const encPath = plainPath + ".enc";
    let hasEnc = false;
    try {
      hasEnc = fs.existsSync(encPath);
    } catch (e) {
      hasEnc = false;
    }
    if (hasEnc && assetKey) {
      try {
        return resolve(decrypt(fs.readFileSync(encPath)));
      } catch (e) {
        // مفتاح غلط أو ملف تالف — نكمل للنسخة العادية لو موجودة
      }
    }
    try {
      if (fs.existsSync(plainPath)) {
        return resolve(fs.readFileSync(plainPath));
      }
    } catch (e) {}
    resolve(null);
  });
}

module.exports = { readAsset, mimeFor, decrypt };
