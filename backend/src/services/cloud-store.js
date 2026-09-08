// ==========================================================================
// CloudStore — حفظ بيانات حساب المستخدم (البروفايلات، الأكشنز، الإيفنتات،
// إعدادات الويدجت) في Firestore بدل ملفات الجهاز المحلي.
// كل مفتاح رئيسي يُخزن كحقل JSON مستقل داخل مستند واحد للمستخدم،
// وبكده التحديثات تتعمل per-key من غير ما نمسح باقي البيانات.
// ==========================================================================

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "eldaly-stream";
const DB_ROOT =
  "https://firestore.googleapis.com/v1/projects/" +
  PROJECT_ID +
  "/databases/(default)/documents";
const USERS_URL = DB_ROOT + "/users";

// حد أمان: أقصى حجم لحقل واحد متسلسل (Firestore بيسمح بحوالي 1MB للمستند)
const MAX_FIELD_BYTES = 900 * 1024;

class CloudStore {
  constructor() {
    this._pending = false;
  }

  _docUrl(email) {
    return (
      USERS_URL +
      "/" +
      encodeURIComponent(String(email).trim().toLowerCase()) +
      "/app/main"
    );
  }

  async loadAppData(email, idToken) {
    const response = await fetch(this._docUrl(email), {
      headers: idToken ? { Authorization: "Bearer " + idToken } : {},
    });
    if (response.status === 404) {
      return { found: false, data: {} };
    }
    if (!response.ok) {
      throw new Error("cloud load failed: " + response.status);
    }
    const body = await response.json();
    const fields = (body && body.fields) || {};
    const data = {};
    for (const key of Object.keys(fields)) {
      const raw = fields[key] && fields[key].stringValue;
      if (typeof raw !== "string") continue;
      try {
        data[key] = JSON.parse(raw);
      } catch (e) {}
    }
    return { found: true, data };
  }

  async saveAppDataKeys(email, idToken, keyValues) {
    const keys = Object.keys(keyValues);
    if (keys.length === 0) return true;
    const fields = {};
    for (const key of keys) {
      const serialized = JSON.stringify(keyValues[key]);
      if (serialized.length > MAX_FIELD_BYTES) {
        console.warn(
          "[CloudStore] key skipped (too large): " +
            key +
            " (" +
            serialized.length +
            " bytes)",
        );
        continue;
      }
      fields[key] = { stringValue: serialized };
    }
    if (Object.keys(fields).length === 0) return true;

    const mask = keys
      .filter((k) => fields[k])
      .map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k))
      .join("&");

    const response = await fetch(this._docUrl(email) + "?" + mask, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + idToken,
      },
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
      throw new Error("cloud save failed: " + response.status);
    }
    return true;
  }

  // =========================================================================
  // جلسات الدخول — مجموعة sessions: مستند لكل جهاز (id = sha256(hwid)).
  // المحتوى متشفر من license.js — القراءة من غير توكن مبتكشفش حاجة.
  // الكتابة/المسح دايمًا بتوكن مستخدم صالح.
  // =========================================================================
  _sessionUrl(id) {
    return DB_ROOT + "/sessions/" + encodeURIComponent(id);
  }

  async getSessionBlob(id) {
    const response = await fetch(this._sessionUrl(id));
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("session load failed: " + response.status);
    }
    const body = await response.json();
    const blob = body && body.fields && body.fields.blob && body.fields.blob.stringValue;
    return blob || null;
  }

  async saveSessionBlob(id, blob, idToken) {
    const response = await fetch(
      this._sessionUrl(id) + "?updateMask.fieldPaths=blob&updateMask.fieldPaths=updatedAt",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: JSON.stringify({
          fields: {
            blob: { stringValue: blob },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error("session save failed: " + response.status);
    }
    return true;
  }

  async deleteSession(id, idToken) {
    const response = await fetch(this._sessionUrl(id), {
      method: "DELETE",
      headers: { Authorization: "Bearer " + idToken },
    });
    // 404 عادي — المستند مش موجود أصلًا
    if (!response.ok && response.status !== 404) {
      throw new Error("session delete failed: " + response.status);
    }
    return true;
  }
}

module.exports = CloudStore;
