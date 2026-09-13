// ==========================================================================
// add-latest-artifact.js — afterAllArtifactBuild hook بتاع electron-builder
// بينسخ ملف التنصيب باسم ثابت (ELDALY-STREAM-Setup-Latest.exe) عشان لينك
// التحميل من الموقع يفضل واحد مش بيتغير مهما كانت النسخة:
//   releases/latest/download/ELDALY-STREAM-Setup-Latest.exe
// الملف المنسوخ بيتضاف لقائمة الـ artifacts فبيتنشر مع الـ release تلقائيًا.
// ==========================================================================
const fs = require("fs");
const path = require("path");

module.exports = async function afterAllArtifactBuild() {
  // مش معتمدين على الـ parameter — ندور على الملف في dist مباشرة
  const dist = path.join(__dirname, "..", "dist");
  // نختار أحدث إنستالر (mtime الأحدث) — dist ممكن يكون فيه بقايا نسخ قديمة
  // فأول match كان ممكن يكون لنسخة قديمة ويتنشر بالغلط باسم Latest
  const installer = fs
    .readdirSync(dist)
    .map((f) => path.join(dist, f))
    .filter((f) => /ELDALY-STREAM-Setup-[\d.]+\.exe$/i.test(path.basename(f)))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  if (!installer || !fs.existsSync(installer)) {
    console.warn("[latest-artifact] installer not found — skip");
    return [];
  }
  const copy = path.join(dist, "ELDALY-STREAM-Setup-Latest.exe");
  fs.copyFileSync(installer, copy);
  console.log("[latest-artifact] copied -> " + copy);
  return [copy];
};
