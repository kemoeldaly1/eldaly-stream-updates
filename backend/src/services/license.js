const crypto = require("crypto");
const CloudStore = require("./cloud-store");
// مفتاح Firebase من متغيرات البيئة فقط — مش موجود في الكود
// (موجود في .env على السيرفر — شوف .env.example)
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "eldaly-stream";
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || "";
const DB_ROOT =
  "https://firestore.googleapis.com/v1/projects/" +
  PROJECT_ID +
  "/databases/(default)/documents";
const USERS_URL = DB_ROOT + "/users";
const BANNED_HWIDS_URL = DB_ROOT + "/bannedhwids";
const CONFIG_URL = DB_ROOT + "/config";
const IDENTITY_URL = "https://identitytoolkit.googleapis.com/v1/accounts";
const TOKEN_URL = "https://securetoken.googleapis.com/v1/token";

const AUTH_ERRORS = {
  EMAIL_EXISTS: "الإيميل ده مسجل قبل كده — سجّل دخول بدل التسجيل",
  INVALID_LOGIN_CREDENTIALS: "الإيميل أو الباسورد غلط",
  EMAIL_NOT_FOUND: "الإيميل أو الباسورد غلط",
  INVALID_PASSWORD: "الإيميل أو الباسورد غلط",
  WEAK_PASSWORD: "الباسورد ضعيف — اكتب 6 حروف على الأقل",
  TOO_MANY_ATTEMPTS_TRY_LATER: "محاولات كتير — استنى دقيقة وحاول تاني",
  EMAIL_INVALID: "الإيميل مكتوب غلط",
};

function friendlyAuthError(errorResponse) {
  const rawMessage =
    (errorResponse && errorResponse.error && errorResponse.error.message) || "";
  const errorCode = rawMessage.split(" ")[0].trim();
  return AUTH_ERRORS[errorCode] || "خطأ: " + (rawMessage || "غير معروف");
}

class LicenseService {
  constructor(store, hwid = "web-client") {
    this.store = store;
    this.hwid = hwid;
    this.currentTier = null;
    this.sessionEmail = null;
    this.sessionExpiresAt = null;
    this._paymentLinks = null;
    this.cloud = new CloudStore();
  }

  setHwid(hwid) {
    if (hwid) this.hwid = hwid;
  }

  getHwid() {
    return this.hwid;
  }

  async getIdToken() {
    const session = this._session;
    if (!session || !session.refreshToken) {
      return null;
    }
    if (
      this._idToken &&
      this._idTokenAt &&
      Date.now() - this._idTokenAt < 2700000
    ) {
      return this._idToken;
    }
    try {
      const refreshed = await this._refreshToken(session.refreshToken);
      if (!refreshed || !refreshed.id_token) {
        return null;
      }
      this._idToken = refreshed.id_token;
      this._idTokenAt = Date.now();
      return this._idToken;
    } catch (e) {
      return null;
    }
  }

  async _signUp(email, password) {
    const response = await fetch(IDENTITY_URL + ":signUp?key=" + WEB_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.idToken) {
      throw new Error(friendlyAuthError(data));
    }
    return data;
  }

  async _signIn(email, password) {
    const response = await fetch(
      IDENTITY_URL + ":signInWithPassword?key=" + WEB_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.idToken) {
      throw new Error(friendlyAuthError(data));
    }
    return data;
  }

  async _refreshToken(refreshToken) {
    const response = await fetch(TOKEN_URL + "?key=" + WEB_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id_token) {
      return null;
    }
    this.lastIdToken = data.id_token;
    return data;
  }

  async _fetchUserDoc(email, idToken) {
    const response = await fetch(USERS_URL + "/" + encodeURIComponent(email), {
      headers: idToken ? { Authorization: "Bearer " + idToken } : {},
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("اتصال مفقود بالسيرفر — جرب تاني");

    const body = await response.json();
    const fields = (body && body.fields) || {};
    const readField = (field) =>
      field &&
      (field.booleanValue !== undefined
        ? field.booleanValue
        : field.stringValue !== undefined
          ? field.stringValue
          : field.timestampValue !== undefined
            ? field.timestampValue
            : field.integerValue !== undefined
              ? parseInt(field.integerValue, 10)
              : null);

    return {
      email: readField(fields.email) || email,
      tier: readField(fields.tier) || "free",
      hwid: readField(fields.hwid) || "",
      createdAt: readField(fields.createdAt),
      expiresAt: readField(fields.expiresAt),
      role: readField(fields.role) || "",
      overlayToken: readField(fields.overlayToken) || "",
      banned:
        readField(fields.banned) === true ||
        readField(fields.banned) === "true",
      deleted:
        readField(fields.deleted) === true ||
        readField(fields.deleted) === "true",
    };
  }

  async _isHwidBanned(idToken) {
    if (
      !this.hwid ||
      this.hwid === "unknown-hwid" ||
      this.hwid === "web-client"
    )
      return false;
    try {
      const response = await fetch(
        BANNED_HWIDS_URL + "/" + encodeURIComponent(this.hwid),
        {
          headers: idToken ? { Authorization: "Bearer " + idToken } : {},
        },
      );
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  async _banCheck(userDoc, idToken) {
    if (userDoc.deleted || userDoc.banned) {
      return "حسابك موقوف من الإدارة — لو ده غلط تواصل مع الدعم";
    }
    if (await this._isHwidBanned(idToken)) {
      return "الجهاز ده موقوف من الإدارة — تواصل مع الدعم";
    }
    return null;
  }

  async _ensureUserDoc(email, idToken) {
    let existingDoc = null;
    try {
      existingDoc = await this._fetchUserDoc(email, idToken);
    } catch (e) {
      existingDoc = null;
    }
    if (existingDoc) return existingDoc;

    const createBody = JSON.stringify({
      fields: {
        email: { stringValue: email },
        tier: { stringValue: "free" },
        hwid: { stringValue: this.hwid },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    });

    const createResponse = await fetch(
      USERS_URL + "?documentId=" + encodeURIComponent(email),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: createBody,
      },
    );

    if (!createResponse.ok) {
      throw new Error("تعذر إنشاء ملف الحساب — جرب تاني");
    }

    return {
      email: email,
      tier: "free",
      hwid: this.hwid,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };
  }

  _effectiveTier(userDoc) {
    let tier =
      userDoc.tier === "vip" ? "vip" : userDoc.tier === "pro" ? "pro" : "free";
    if (tier !== "free" && userDoc.expiresAt) {
      const expiry = new Date(userDoc.expiresAt);
      if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
        tier = "free";
      }
    }
    return tier;
  }

  // Hex token per account — يحمي روابط الأوفرلاي/الويدجت بتاعة صاحب الحساب فقط
  _ensureOverlayToken(email, idToken, userDoc) {
    // ترحيل تلقائي: التوكنات الطويلة القديمة (32 حرف) بتتولد قصيرة (12) عند أول دخول/استعادة
    if (userDoc && userDoc.overlayToken && String(userDoc.overlayToken).length <= 12) {
      return Promise.resolve(userDoc.overlayToken);
    }
    const token = crypto.randomBytes(6).toString("hex"); // 12 حرف — قصير وأنيق
    return fetch(
      USERS_URL +
        "/" +
        encodeURIComponent(email) +
        "?updateMask.fieldPaths=overlayToken",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: JSON.stringify({
          fields: { overlayToken: { stringValue: token } },
        }),
      },
    )
      .then((res) => (res.ok ? token : userDoc?.overlayToken || token))
      .catch(() => userDoc?.overlayToken || token);
  }

  // =========================================================================
  // جلسات الدخول — في قاعدة البيانات فقط، مفيش أي تخزين محلي:
  //   • Firestore مجموعة sessions / مستند sha256(hwid)
  //   • المحتوى (الإيميل + refresh token) متشفر AES-256-GCM بمفتاح
  //     SESSION_SECRET من البيئة — القراءة من غير المفتاح مبتكشفش حاجة
  //   • في الذاكرة وقت التشغيل بس (this._session)
  //   • الجلسة مربوطة بالجهاز — restore من جهاز تاني مرفوض
  // ملاحظة: من غير SESSION_SECRET الجلسات مش بت persist خالص.
  // =========================================================================
  _sessionDocId(hwid) {
    return crypto.createHash("sha256").update(String(hwid)).digest("hex");
  }

  _sessionSecretKey() {
    const secret = process.env.SESSION_SECRET || "";
    if (!secret) return null;
    return crypto.createHash("sha256").update(secret).digest();
  }

  _encryptSession(obj) {
    const key = this._sessionSecretKey();
    if (!key) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([
      cipher.update(JSON.stringify(obj), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
  }

  _decryptSession(b64) {
    try {
      const key = this._sessionSecretKey();
      if (!key || !b64) return null;
      const raw = Buffer.from(String(b64), "base64");
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        raw.subarray(0, 12),
      );
      decipher.setAuthTag(raw.subarray(12, 28));
      const dec = Buffer.concat([
        decipher.update(raw.subarray(28)),
        decipher.final(),
      ]).toString("utf8");
      return JSON.parse(dec);
    } catch (e) {
      return null;
    }
  }

  hasSession() {
    return !!this._session;
  }

  async _saveSession(email, refreshToken, idToken) {
    this._session = { email, refreshToken, hwid: this.hwid || "" };
    if (!process.env.SESSION_SECRET) {
      console.warn(
        "[License] SESSION_SECRET مش متحدد — الجلسة شغالة في الذاكرة بس ومش هتعيش restart",
      );
      return;
    }
    const blob = this._encryptSession(this._session);
    if (!blob || !this._session.hwid || this._session.hwid === "unknown-hwid") {
      return;
    }
    try {
      await this.cloud.saveSessionBlob(
        this._sessionDocId(this._session.hwid),
        blob,
        idToken,
      );
    } catch (e) {
      console.warn("[License] cloud session save failed:", e.message);
    }
  }

  async _loadPersistedSession(hwid) {
    // استدعاء داخلي (watchdog) من غير hwid — استخدم جهاز الجلسة الحالية
    const lookupHwid =
      hwid || (this._session && this._session.hwid) || this.hwid;
    if (
      !process.env.SESSION_SECRET ||
      !lookupHwid ||
      lookupHwid === "unknown-hwid" ||
      lookupHwid === "web-client"
    ) {
      return null;
    }
    try {
      const blob = await this.cloud.getSessionBlob(this._sessionDocId(lookupHwid));
      const data = this._decryptSession(blob);
      if (
        data &&
        data.email &&
        data.refreshToken &&
        (!data.hwid || String(data.hwid) === String(lookupHwid))
      ) {
        return data;
      }
    } catch (e) {}
    return null;
  }

  async register(email, password, hwid) {
    if (hwid) this.hwid = hwid;
    email = String(email || "")
      .trim()
      .toLowerCase();
    password = String(password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, reason: "اكتب إيميل صحيح" };
    }
    if (password.length < 6) {
      return { ok: false, reason: "الباسورد ضعيف — 6 حروف على الأقل" };
    }

    try {
      const authResult = await this._signUp(email, password);
      const userDoc = await this._ensureUserDoc(email, authResult.idToken);
      const banReason = await this._banCheck(userDoc, authResult.idToken);
      if (banReason) {
        this.logout();
        return { ok: false, reason: banReason };
      }

      this._saveSession(email, authResult.refreshToken, authResult.idToken);
      this.currentTier = this._effectiveTier(userDoc);
      this.sessionEmail = email;
      this.sessionExpiresAt = userDoc.expiresAt || null;
      this.lastIdToken = authResult.idToken;

      const overlayToken = await this._ensureOverlayToken(
        email,
        authResult.idToken,
        userDoc,
      );

      return {
        ok: true,
        tier: this.currentTier,
        email: email,
        overlayToken: overlayToken,
      };
    } catch (e) {
      return { ok: false, reason: e.message || "تعذر التسجيل — جرب تاني" };
    }
  }

  async login(email, password, hwid) {
    if (hwid) this.hwid = hwid;
    email = String(email || "")
      .trim()
      .toLowerCase();
    password = String(password || "");
    if (!email || !password) {
      return { ok: false, reason: "املأ الإيميل والباسورد" };
    }

    try {
      const authResult = await this._signIn(email, password);
      const userDoc = await this._ensureUserDoc(email, authResult.idToken);
      const banReason = await this._banCheck(userDoc, authResult.idToken);
      if (banReason) {
        await this.logout();
        return { ok: false, reason: banReason };
      }

      await this._saveSession(email, authResult.refreshToken, authResult.idToken);
      this.currentTier = this._effectiveTier(userDoc);
      this.sessionEmail = email;
      this.sessionExpiresAt = userDoc.expiresAt || null;
      this.lastIdToken = authResult.idToken;

      const overlayToken = await this._ensureOverlayToken(
        email,
        authResult.idToken,
        userDoc,
      );

      return {
        ok: true,
        tier: this.currentTier,
        email: email,
        expiresAt: userDoc.expiresAt || null,
        overlayToken: overlayToken,
      };
    } catch (e) {
      return { ok: false, reason: e.message || "تعذر الدخول — جرب تاني" };
    }
  }

  async sendPasswordReset(email) {
    email = String(email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, reason: "اكتب إيميل صحيح" };
    }

    try {
      const response = await fetch(
        IDENTITY_URL + ":sendOobCode?key=" + WEB_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestType: "PASSWORD_RESET", email: email }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const rawMessage = (data.error && data.error.message) || "";
        if (rawMessage.includes("EMAIL_NOT_FOUND")) {
          return {
            ok: false,
            reason: "الإيميل ده مش مسجل عندنا — اتأكد منه أو اعمل حساب جديد",
          };
        }
        return { ok: false, reason: "تعذر إرسال الرسالة — جرب تاني" };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "خطأ في الاتصال — جرب تاني" };
    }
  }

  async changePassword(newPassword) {
    newPassword = String(newPassword || "");
    if (newPassword.length < 6) {
      return { ok: false, reason: "الباسورد ضعيف — 6 حروف على الأقل" };
    }
    const session = this._session;
    if (!session || !session.refreshToken) {
      return { ok: false, reason: "لازم تكون مسجل دخول" };
    }

    try {
      const refreshed = await this._refreshToken(session.refreshToken);
      if (!refreshed || !refreshed.id_token) {
        return { ok: false, reason: "انتهت الجلسة — سجل دخول تاني" };
      }
      const response = await fetch(
        IDENTITY_URL + ":update?key=" + WEB_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken: refreshed.id_token,
            password: newPassword,
            returnSecureToken: true,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, reason: "تعذر تغيير الباسورد — جرب تاني" };
      }
      if (data.refreshToken) {
        await this._saveSession(
          session.email,
          data.refreshToken,
          data.idToken || refreshed.id_token,
        );
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "خطأ في الاتصال — جرب تاني" };
    }
  }

  async restoreSession(hwid) {
    if (hwid) this.hwid = hwid;
    const session = await this._loadPersistedSession(hwid);
    if (!session) {
      this.currentTier = null;
      this.sessionEmail = null;
      return { loggedIn: false };
    }
    // الجلسة مربوطة بجهاز الـ hwid اللي اتبنى بيها المستند
    this.hwid = session.hwid || this.hwid;

    try {
      const refreshed = await this._refreshToken(session.refreshToken);
      if (!refreshed) {
        await this.logout();
        return { loggedIn: false };
      }
      const userDoc = await this._fetchUserDoc(
        session.email,
        refreshed.id_token,
      );
      if (!userDoc) {
        await this.logout();
        return { loggedIn: false };
      }
      const banReason = await this._banCheck(userDoc, refreshed.id_token);
      if (banReason) {
        await this.logout();
        this.currentTier = null;
        this.sessionEmail = null;
        return { loggedIn: false, banned: true, reason: banReason };
      }

      await this._saveSession(
        session.email,
        refreshed.refresh_token,
        refreshed.id_token,
      );
      this.currentTier = this._effectiveTier(userDoc);
      this.sessionEmail = session.email;
      this.sessionExpiresAt = userDoc.expiresAt || null;

      const overlayToken = await this._ensureOverlayToken(
        session.email,
        refreshed.id_token,
        userDoc,
      );

      return {
        loggedIn: true,
        email: session.email,
        tier: this.currentTier,
        expiresAt: userDoc.expiresAt || null,
        overlayToken: overlayToken,
      };
    } catch (e) {
      if (!this.currentTier) this.currentTier = "free";
      return {
        loggedIn: true,
        offline: true,
        email: session.email,
        tier: this.currentTier,
      };
    }
  }

  // إحصائيات شهرية للوحة الأدمن: حقول stats_YYYY-MM_(lives|durationMs|coins)
  // جوه مستند المستخدم نفسه (نفس قواعد الحماية) — setLive(true) بيزود عدد
  // اللايفات ويحفظ بداية الجلسة، و setLive(false) بيجمع المدة + الكوينز
  async _updateMonthlyStats(email, idToken, isLive, sessionCoins) {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const docRes = await fetch(USERS_URL + "/" + encodeURIComponent(email), {
        headers: { Authorization: "Bearer " + idToken },
      });
      if (!docRes.ok) return;
      const fields = ((await docRes.json()) || {}).fields || {};
      const gi = (f) => (f && f.integerValue !== undefined) ? parseInt(f.integerValue, 10) || 0 : 0;
      const kLives = `stats_${month}_lives`;
      const kDur = `stats_${month}_durationMs`;
      const kCoins = `stats_${month}_coins`;
      const kStart = "stats_liveStart";
      const patchFields = {};
      const masks = [];
      if (isLive) {
        patchFields[kLives] = { integerValue: String(gi(fields[kLives]) + 1) };
        patchFields[kStart] = { timestampValue: new Date().toISOString() };
        masks.push(kLives, kStart);
      } else {
        const startedAt = fields[kStart] && fields[kStart].timestampValue
          ? Date.parse(fields[kStart].timestampValue) : 0;
        if (startedAt) {
          patchFields[kDur] = { integerValue: String(gi(fields[kDur]) + Math.max(0, Date.now() - startedAt)) };
          masks.push(kDur);
          if (sessionCoins && sessionCoins > 0) {
            patchFields[kCoins] = { integerValue: String(gi(fields[kCoins]) + sessionCoins) };
            masks.push(kCoins);
          }
          patchFields[kStart] = { nullValue: null };
          masks.push(kStart);
        } else if (sessionCoins && sessionCoins > 0) {
          patchFields[kCoins] = { integerValue: String(gi(fields[kCoins]) + sessionCoins) };
          masks.push(kCoins);
        }
      }
      if (!masks.length) return;
      const qs = masks.map((m) => "updateMask.fieldPaths=" + encodeURIComponent(m)).join("&");
      await fetch(USERS_URL + "/" + encodeURIComponent(email) + "?" + qs, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ fields: patchFields }),
      });
    } catch (e) {}
  }

  // جلب الحالة الرسمية الحالية للحساب (حظر/حذف/حظر جهاز/انتهاء اشتراك)
  // — السيرفر بيفرضها على الجلسة الشغالة حتى لو العميل معدّل مش بيعمل login
  async refreshSessionUser() {
    if (!this._session || !this._session.email) return null;
    const idToken = await this.getIdToken();
    if (!idToken) return null;
    try {
      const doc = await this._fetchUserDoc(this._session.email, idToken);
      const hwidBanned = await this._isHwidBanned(idToken);
      const out = { user: doc, hwidBanned: !!hwidBanned };
      if (doc) {
        this.currentUserDoc = out;
        this.currentTier = this._effectiveTier(doc);
      }
      return out;
    } catch (e) {
      return null;
    }
  }

  async setLive(isLive, sessionCoins) {
    const session = this._session;
    if (!session || !session.refreshToken) return;
    try {
      let idToken =
        this._lastIdToken && Date.now() - this._lastIdTokenAt < 3000000
          ? this._lastIdToken
          : null;
      if (!idToken) {
        const refreshed = await this._refreshToken(session.refreshToken);
        if (!refreshed || !refreshed.id_token) return;
        idToken = refreshed.id_token;
        this._lastIdToken = idToken;
        this._lastIdTokenAt = Date.now();
      }
      await fetch(
        USERS_URL +
          "/" +
          encodeURIComponent(session.email) +
          "?updateMask.fieldPaths=live&updateMask.fieldPaths=liveAt",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + idToken,
          },
          body: JSON.stringify({
            fields: {
              live: { booleanValue: !!isLive },
              liveAt: { timestampValue: new Date().toISOString() },
            },
          }),
        },
      );
      this._updateMonthlyStats(session.email, idToken, !!isLive, sessionCoins);
    } catch (e) {}
  }

  async logout() {
    // امسح نسخة الجلسة من قاعدة البيانات كمان — مش بس الذاكرة
    if (
      this._session &&
      this._session.hwid &&
      this._session.hwid !== "unknown-hwid" &&
      process.env.SESSION_SECRET
    ) {
      try {
        let idToken = null;
        try {
          const refreshed = await this._refreshToken(this._session.refreshToken);
          if (refreshed && refreshed.id_token) idToken = refreshed.id_token;
        } catch (e) {}
        if (idToken) {
          await this.cloud.deleteSession(
            this._sessionDocId(this._session.hwid),
            idToken,
          );
        }
      } catch (e) {}
    }
    this._session = null;
    // تنظيف بقايا قديمة من ملفات السيرفر القديمة
    this.store.delete("auth.session");
    this.store.delete("license.key");
    this.store.delete("trial.email");
    this.currentTier = null;
    this.sessionEmail = null;
    this.sessionExpiresAt = null;
    this._paymentLinks = null;
  }

  async getPaymentLinks() {
    if (this._paymentLinks) return this._paymentLinks;
    const defaults = {
      cardUrl: "",
      walletUrl: "",
      patreonUrl: "",
      paypalUrl: "",
      vodafoneCash: "",
      supportContact: "",
      note: "",
    };
    try {
      const response = await fetch(CONFIG_URL + "/payments");
      if (!response.ok) {
        this._paymentLinks = defaults;
        return defaults;
      }
      const body = await response.json();
      const fields = (body && body.fields) || {};
      const readString = (field) => (field && field.stringValue) || "";
      this._paymentLinks = {
        cardUrl: readString(fields.cardUrl) || defaults.cardUrl,
        walletUrl: readString(fields.walletUrl) || defaults.walletUrl,
        patreonUrl: readString(fields.patreonUrl) || defaults.patreonUrl,
        paypalUrl: readString(fields.paypalUrl) || defaults.paypalUrl,
        vodafoneCash: readString(fields.vodafoneCash) || defaults.vodafoneCash,
        supportContact:
          readString(fields.supportContact) || defaults.supportContact,
        note: readString(fields.note) || defaults.note,
      };
      return this._paymentLinks;
    } catch (e) {
      this._paymentLinks = defaults;
      return defaults;
    }
  }
}

module.exports = LicenseService;
