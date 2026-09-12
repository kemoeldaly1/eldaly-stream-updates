# 🏛️ نشر الباك اند على Oracle Always Free — الدليل الكامل

## نظرة سريعة

| البند | القيمة |
|---|---|
| الموارد | 2 كور ARM + 12GB رام + ~200GB تخزين — **مجاناً للأبد** |
| النوم | لا يوجد — شغل متواصل 24/7 |
| المطلوب للتفعيل | كارت فيزا/ماستر دولي (خصم تحقق ~$1 مؤقت بيرجع) |
| تحذير الخمول | سيرفر فاضي 7 أيام = إيميل تحذير ثم إيقاف (بيتعالج — تحت) |

---

## المرحلة 1 — إنشاء الحساب (مرة واحدة)

1. <https://signup.cloud.oracle.com> → املأ البيانات (الاسم، الإيميل، كلمة سر قوية).
2. **اختر Home Region قريب**: `me-jeddah` (جدة — الأقرب لمصر) أو `eu-marseille`.
   ⚠️ المنطقة دي **بتتختار مرة واحدة** ومتتغيرش بعد كده — وفي باقة Always Free
   بتفضل مرتبطة بيها، فاختار وانت مرتاح.
3. تأكيد الإيميل → رقم الموبايل (هيوصلك كود SMS) → بيانات الكارت.
4. بعد القبول: هيوديك على <https://cloud.oracle.com> للوحة التحكم.

## المرحلة 2 — إنشاء السيرفر (Compute Instance)

1. القائمة ☰ → **Compute → Instances → Create Instance**.
2. الاسم: `eldaly-backend`.
3. Image: **Ubuntu 22.04** (زرار Edit → Canonical Ubuntu).
4. Shape: زرار Edit → **Ampere** (A1.Flex) → **2 OCPUs + 12 GB**.
5. SSH Keys: اعمل **Generate key pair** ونزّل الملفين (`.key` و`.key.pub`)
   — دي بوابة الدخول للسيرفر، ماتloseهاش.
6. Create — لو ظهر "Out of host capacity": استنى ساعة وجرب تاني أو غيّر المنطقة.

## المرحلة 3 — فتح المنافذ في أوراكل

السيرفر اللي لسه معمول مقفول من بره افتراضياً. من صفحة الـ Instance:
1. تحت **Subnet** اضغط على اسم الشبكة → **Security Lists** → Default.
2. **Add Ingress Rules** وضيف القاعدتين دول:
   - Source `0.0.0.0/0` — Destination Port `80` — TCP
   - Source `0.0.0.0/0` — Destination Port `443` — TCP

## المرحلة 4 — التسطيب (أوامر جاهزة)

من جهازك، ارفع حزمة الرفع على السيرفر:

```bash
scp -i <مفتاح-ssh-بتاعك> -r eldaly-cloud-upload ubuntu@<IP-السيرفر>:/tmp/
ssh -i <مفتاح-ssh-بتاعك> ubuntu@<IP-السيرفر>
```

وعلى السيرفر:

```bash
sudo mkdir -p /opt/eldaly && sudo cp -r /tmp/eldaly-cloud-upload/* /opt/eldaly/
cd /opt/eldaly
# ضيف المتغيرات (مهم: FIREBASE_WEB_API_KEY و GITHUB_MEDIA_TOKEN)
sudo nano .env
# انسخ docker-compose وsetup من فولدر oracle لو رافعهم منفصلين
sudo bash setup-vm.sh app.<IP-السيرفر-بشرطات>.sslip.io
```

مثال للدومين المجاني: السيرفر `140.238.10.5` → `app.140-238-10-5.sslip.io`
(Caddy هيطلع شهادة HTTPS مجانية عليه أوتوماتيك).

## المرحلة 5 — حماية من سياسة الخمول (مهم!)

أوراكل بتوقف السيرفرات الفاضية 7 أيام. الحل المعروف — حاوية خفيفة بتولّد
شغل صناعي بسيط:

```bash
sudo docker run -d --name neveridle --restart unless-stopped \
  ghcr.io/layaleswayel/neveridle:latest arm -t 600
```

(بتشغل ~15% CPU دقيقة كل 10 دقايق — كفاية إن السيرفر يتصنف "نشط")

## المرحلة 6 — توجيه البرنامج على السيرفر الجديد

في `frontend/main.js`:

```js
let BACKEND_URL = process.env.BACKEND_URL || "https://app.<...>.sslip.io";
```

وابني نسخة عملاء جديدة — العملاء الجداد ياخدوا اللينك الجديد.
(القدامى اللي شغالين على رابط Render هيفضلوا شغالين لحد ما يحدّثوا.)

---

## الصيانة السريعة

| المطلوب | الأمر على السيرفر |
|---|---|
| متابعة اللوجات | `docker logs -f eldaly-backend` |
| إعادة تشغيل | `docker compose -f /opt/eldaly/docker-compose.yml restart` |
| تحديث الكود | انسخ الملفات الجديدة لـ `/opt/eldaly` ثم `docker compose up -d --build` |
| فحص الحالة | `curl https://<الدومين>/api/health` |

> 💡 **ترقية لاحقة (اختيارية):** دومين حقيقي بدل sslip.io (بيتكلف جنيهات
> قليلة في السنة من أي مسجل دومين) — غيّر سطر واحد في Caddyfile وخلاص.
