# 🖥️ ELDALY STREAM — Desktop Client (Frontend)

تطبيق الديسكتوب (Electron) لبرنامج **ELDALY STREAM**.

---

## 📋 المميزات

- **سيرفر أوفرلاي محلي**: كل صفحات OBS (الأوفرلاي + الويدجت + الإكستنشن) بتتقدم من جهاز المستخدم على `http://127.0.0.1:7330` — مش من الباك إند.
- **روابط محمية بتوكن سداسي**: كل حساب ليه توكن 32-حرف hex فريد بيجي من السيرفر بعد تسجيل الدخول، وكل الروابط شكلها:
  - `http://127.0.0.1:7330/overlay/<token>/<screen>` (شاشات 1-10)
  - `http://127.0.0.1:7330/widget/<token>/goal?type=likes&id=likes-goal`
  - محدش يقدر يفتح روابط حد تاني من غير التوكن.
- **بروفايلات على قاعدة البيانات**: البيانات بتتحفظ في Firestore عن طريق الباك إند — مش على الجهاز.
- **كود مشفّر (bytenode)**: بعد البناء، الكود المصدري مش موجود في الـ ASAR خالص — بيتحول لـ V8 bytecode.

---

## 🛠️ التطوير

```bash
cd frontend
npm install
npm start          # يشيل أي .jsc قديم ويشغل الكود المصدري مباشرة
```

- رابط الباك إند افتراضي `http://localhost:3000` وبيتغير من إعدادات التطبيق.
- الباك إند لازم يكون شغال (شوف مجلد `backend`).

## 🔒 البناء والتشفير

```bash
npm run build      # تشفير HTML/CSS + تحويل كل الـ JS لـ bytecode ثم electron-builder
```

إيه اللي بيحصل:

### 1) تشفير HTML/CSS (AES-256-GCM)

- كل صفحات HTML وملفات CSS (صفحات التطبيق + كل الويدجت الـ 19) بتتشفر بمفتاح عشوائي بيتولد جديد لكل بناء.
- الملفات المشفرة (`.enc`) هي اللي بتتوزع — **الأصل العادي مستثنى من الحزمة نهائيًا** في `electron-builder.json`.
- وقت التشغيل: بروتوكول مخصص `eldaly://` بيقدم الصفحات وبيفك التشفير **في الذاكرة** — مفيش لحظة بيتكتب فيها HTML مفكوك على الديسك.
- مفتاح فك التشفير عايش جوه `asset-key.jsc` (bytecode) — مش موجود كنص في أي ملف.

### 2) تحويل JS لـ bytecode (bytenode)

- `electron scripts/compile.js` بيجمّع **كل** كود JS بـ bytenode بنفس نسخة Electron (ضروري لتطابق V8): `main.js`، `renderer.js`، `license-renderer.js`، `local-overlay-server.js`، `keyboard.js`، `secure-assets.js`.
- `electron-builder` بيستثني كل المصادر العادية من الـ ASAR.
- `boot.js` بيحمّل `main.jsc`، والـ preload بيحمّل `renderer.jsc` في العالم المعزول (contextIsolation شغّال).

### 3) Fuses

`fuses-hook.js` بيولّع: `RunAsNode=false` + `NodeCliInspectArguments=false` + `OnlyLoadAppFromAsar=true` + التحقق من سلامة الـ ASAR (integrity) — يعني:
- مش ممكن تشغيل الـ exe كـ Node لتنفيذ كود خارجي.
- مش ممكن ربط debugger.
- أي تعديل على ملفات الـ ASAR بيكسر التطبيق.

> ⚠️ بعد ما تبني، لو عايز ترجع تطوّر شغّل `npm start` — هو بينضّف ملفات `.jsc` والنسخ المشفرة `.enc`
> تلقائيًا عشان تشتغل على المصدر مباشرة من غير نسخ قديمة.

### حدود الحماية (للوعي)

- الـ bytecode بيمنع قراءة الكود للمحاولات العادية، لكن مش تشفير رياضي كامل — أدوات متقدمة ممكن تفك جزء منه. ده المعقول المتاح لتطبيقات Electron.
- التشفير بيوصل لدرجة أمان عالية لأن المفتاح نفسه جوه bytecode — فكسر الحماية محتاج عكس الـ bytecode مش مجرد فتح ملف.
- `preload.js` و `boot.js` بيفضلوا نص عادي — دول غراء ربط صغيرين من غير أي منطق أو أسرار.

## 🧪 اختبارات

```bash
node scripts/overlay-test.js   # اختبارات السيرفر المحلي (توكن، SSE، طوابير، ميديا)
npx electron scripts/assets-test.js   # اختبارات فك تشفير الأصول (لازم بعد compile)
```

## 🗂️ ملاحظات بنية

- `main.js` — العملية الرئيسية: التواصل مع الباك إند، السيرفر المحلي، بروتوكول `eldaly://`، IPC.
- `src/services/local-overlay-server.js` — سيرفر OBS المحلي (HTTP + SSE + طوابير).
- `src/services/secure-assets.js` — فك تشفير HTML/CSS في الذاكرة.
- `src/widgets/` — ملفات الويدجت الـ HTML (بتتشفر وقت البناء وتتقدم من السيرفر المحلي).
- `preload.js` — جسر IPC + تحميل كود الرندر المشفّر.
