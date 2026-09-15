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
  // فحص إجباري: KeySender.exe لازم يكون متفك بره الـ asar في البناء.
  // مرّة الملف كان gitignored (*.exe) فالبناء على CI كان بينزل من غيره
  // وكل ضغطات الكيبورد في نسخة العملاء بقت ميتة بصمت — نمنع التكرار.
  const unpackedSender = path.join(
    __dirname,
    "..",
    "dist",
    "win-unpacked",
    "resources",
    "app.asar.unpacked",
    "src",
    "services",
    "KeySender.exe",
  );
  if (!fs.existsSync(unpackedSender)) {
    throw new Error(
      "[latest-artifact] FATAL: KeySender.exe is missing from the build " +
        "(expected at " +
        unpackedSender +
        ") — keystroke actions would be dead. Check asarUnpack + git tracking.",
    );
  }
  console.log(
    "[latest-artifact] KeySender.exe present (" +
      fs.statSync(unpackedSender).size +
      " bytes)",
  );

  // مش معتمدين على الـ parameter — ندور على الملف في dist مباشرة
  const dist = path.join(__dirname, "..", "dist");
  // نختار الإنستالر بنسخة package.json بالظبط (مش mtime الأحدث).
  // السبب: dist ممكن يكون فيه بقايا نسخة قديمة — الاعتماد على mtime كان
  // بيخلي release يتنشر باسم نسخة وهو جوّه نسخة تانية (حصل فعلًا: v2.3.14
  // كان جوّاه ELDALY-STREAM-Setup-2.3.13.exe).
  const pkgVersion = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"),
  ).version;
  const expectedName = `ELDALY-STREAM-Setup-${pkgVersion}.exe`;
  let installer = path.join(dist, expectedName);
  if (!fs.existsSync(installer)) {
    // fallback: لو النسخة مش موجودة بالاسم المتوقع، نرفع أحدث إنستالر
    // بس بنحذّر بوضوح عشان نلاحظ أي عدم تطابق نسخة على طول
    const latest = fs
      .readdirSync(dist)
      .map((f) => path.join(dist, f))
      .filter((f) => /ELDALY-STREAM-Setup-[\d.]+\.exe$/i.test(path.basename(f)))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    console.warn(
      "[latest-artifact] WARNING: expected " +
        expectedName +
        " not found — falling back to " +
        (latest ? path.basename(latest) : "none") +
        " (version mismatch possible!)",
    );
    installer = latest;
  }
  if (!installer || !fs.existsSync(installer)) {
    console.warn("[latest-artifact] installer not found — skip");
    return [];
  }
  const copy = path.join(dist, "ELDALY-STREAM-Setup-Latest.exe");
  fs.copyFileSync(installer, copy);
  console.log("[latest-artifact] copied -> " + copy);
  return [copy];
};
