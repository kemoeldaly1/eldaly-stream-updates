// ==========================================================================
// MediaStore — تخزين سحابي للفيديوهات والأصوات بتاعة العملاء على GitHub
// (release assets في مستودع عام مخصص). الملف بيتسمّى بمحتواه (sha1) فنفس
// الملف = نفس الرابط (dedupe)، والروابط بتتخدم من CDN جيت هب مجانًا وللأبد
// — حتى لو العميل مسح البرنامج أو السيرفر اتعمل restart.
// البيئة المطلوبة على السيرفر: GITHUB_MEDIA_TOKEN (توكن فيه صلاحية repo)
// ==========================================================================

const crypto = require("crypto");

const MEDIA_REPO = process.env.GITHUB_MEDIA_REPO || "kemoeldaly1/eldaly-media";
const MEDIA_TAG = "media";
const MAX_UPLOAD = 200 * 1024 * 1024; // 200MB سقف للملف الواحد

// امتدادات الميديا المسموحة فقط — أي حاجة تانية مرفوضة
const ALLOWED_EXT = new Set([
  "mp3", "wav", "ogg", "m4a", "mp4", "webm", "mov", "gif", "png", "jpg", "jpeg", "webp",
]);

// فحص البصمة السحرية — التوقيع الحقيقي للمحتوى لازم يطابق الامتداد
// (يمنع رفع ملف خبيث متخفي بصيغة ميديا)
function magicBytesOk(buf, ext) {
  if (!buf || buf.length < 12) return false;
  const ascii = (off, str) =>
    buf.subarray(off, off + str.length).toString("latin1") === str;
  switch (ext) {
    case "mp3":
      return ascii(0, "ID3") || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
    case "wav":
      return ascii(0, "RIFF") && ascii(8, "WAVE");
    case "ogg":
      return ascii(0, "OggS");
    case "m4a":
    case "mp4":
    case "mov":
      return ascii(4, "ftyp");
    case "webm":
      return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
    case "gif":
      return ascii(0, "GIF8");
    case "png":
      return buf[0] === 0x89 && ascii(1, "PNG");
    case "jpg":
    case "jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    default:
      return false;
  }
}

class MediaStore {
  constructor() {
    this._releaseCache = null; // {id, assets:[{name,url}]} مع TTL قصير
    this._releaseAt = 0;
    this._token = process.env.GITHUB_MEDIA_TOKEN || "";
  }

  get enabled() {
    return !!this._token;
  }

  _headers(extra) {
    return Object.assign(
      {
        Authorization: "token " + this._token,
        "Content-Type": "application/json",
        "User-Agent": "eldaly-stream-backend",
      },
      extra || {}
    );
  }

  async _getRelease() {
    if (this._releaseCache && Date.now() - this._releaseAt < 60000) {
      return this._releaseCache;
    }
    const res = await fetch(
      `https://api.github.com/repos/${MEDIA_REPO}/releases/tags/${MEDIA_TAG}`,
      { headers: this._headers({ Accept: "application/vnd.github+json" }) }
    );
    if (!res.ok) throw new Error("release fetch failed: HTTP " + res.status);
    const rel = await res.json();
    this._releaseCache = { id: rel.id, assets: (rel.assets || []).map((a) => ({ name: a.name, url: a.browser_download_url })) };
    this._releaseAt = Date.now();
    return this._releaseCache;
  }

  _safeName(original) {
    const ext = String(path_ext(original)).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".bin";
    return ext;
  }

  // رفع ملف: بيرجع الرابط العام الثابت
  async upload(buffer, originalName) {
    if (!this.enabled) {
      return { ok: false, error: "media storage not configured (GITHUB_MEDIA_TOKEN)" };
    }
    if (!buffer || !buffer.length) return { ok: false, error: "empty file" };
    if (buffer.length > MAX_UPLOAD) return { ok: false, error: "file too large (max 200MB)" };

    const ext = this._safeName(originalName).replace(/^\./, "");
    if (!ALLOWED_EXT.has(ext)) {
      return { ok: false, error: "نوع الملف غير مسموح — مسموح فقط صوتيات وفيديوهات وصور" };
    }
    if (!magicBytesOk(buffer, ext)) {
      return { ok: false, error: "محتوى الملف لا يطابق امتداده — الرفع مرفوض" };
    }

    const sha = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 20);
    const filename = `m-${sha}.${ext}`;

    const release = await this._getRelease();
    const existing = release.assets.find((a) => a.name === filename);
    if (existing) {
      return { ok: true, url: existing.url, cached: true };
    }

    // رفع الأصل الجديد على الـ release
    const up = await fetch(
      `https://uploads.github.com/repos/${MEDIA_REPO}/releases/${release.id}/assets?name=${encodeURIComponent(filename)}`,
      {
        method: "POST",
        headers: {
          Authorization: "token " + this._token,
          "Content-Type": "application/octet-stream",
          "Content-Length": buffer.length,
          "User-Agent": "eldaly-stream-backend",
        },
        body: buffer,
      }
    );
    if (!up.ok) {
      const t = await up.text().catch(() => "");
      // 422 = الأصل موجود بالاسم ده (سباق بسيط) — نرجّع الرابط عادي
      if (up.status === 422) {
        return { ok: true, url: `https://github.com/${MEDIA_REPO}/releases/download/${MEDIA_TAG}/${filename}`, cached: true };
      }
      return { ok: false, error: "upload failed: HTTP " + up.status + " " + t.slice(0, 120) };
    }
    this._releaseCache = null; // الكاش بقى قديم — فيه أصل جديد
    return {
      ok: true,
      url: `https://github.com/${MEDIA_REPO}/releases/download/${MEDIA_TAG}/${filename}`,
    };
  }
}

function path_ext(name) {
  const s = String(name || "");
  const i = s.lastIndexOf(".");
  return i === -1 ? "" : s.slice(i);
}

module.exports = MediaStore;
module.exports.MAX_UPLOAD = MAX_UPLOAD;
