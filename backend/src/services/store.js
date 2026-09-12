const fs = require("fs");
const path = require("path");
const CloudStore = require("./cloud-store");

const GLOBAL_KEYS = ["auth", "trial", "license"];
const CLOUD_FLUSH_DELAY_MS = 1200;

// أجزاء مفاتيح خطيرة — بتسمح prototype pollution لو انسابت جوه set/get/delete
const UNSAFE_KEY_PARTS = new Set(["__proto__", "constructor", "prototype"]);
function keyParts(key) {
  const parts = String(key).split(".");
  if (parts.some((p) => UNSAFE_KEY_PARTS.has(p))) return null;
  return parts;
}

class StoreService {
  constructor(customDataDir) {
    this.dataDir =
      customDataDir || process.env.DATA_DIR || path.join(process.cwd(), "data");
    this.filePath = path.join(this.dataDir, "config.json");
    this.data = {};
    this.accountData = null;
    this.accountFile = null;
    this.currentEmail = null;
    this.cloud = new CloudStore();
    this.getToken = null;
    this._cloudDirty = {};
    this._cloudTimer = null;
    this._cloudSaving = false;
    this._cloudLoaded = false;
    this._cloudRetryDelay = 15000;
    // آخر تعديلات معلّقة لكل حساب — لو السيرفر بدّل الحساب قبل ما الـ debounce
    // يكتب على الكلاود (1.2 ثانية)، التعديلات دي بتتحفظ هنا وترجع تتزامن
    // أول ما صاحبها يسجل دخول تاني بدل ما تتصرف أو تتكتب على مستند حساب تاني
    this._pendingStash = {};
    this._ensureDir();
    this._load();
  }

  _ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      }
    } catch (e) {
      this.data = {};
    }
    if (!this.data.actions) this.data.actions = [];
    if (!this.data.events) this.data.events = [];
    if (!this.data.connection) this.data.connection = { username: "" };
    if (!this.data.overlay) this.data.overlay = {};
    if (!this.data.settings) this.data.settings = {};
  }

  _save() {
    try {
      this._ensureDir();
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(this.data, null, 2),
        "utf-8",
      );
    } catch (e2) {
      console.error("Store save error:", e2);
    }
  }

  setAccount(email, idToken) {
    if (!email) return Promise.resolve();
    const clean = String(email).trim().toLowerCase();
    if (clean === this.currentEmail && this.accountData) {
      return Promise.resolve();
    }

    // في تعديلات معلّقة للحساب القديم لسه متكتبتش على الكلاود؟
    // خزّنها جانبًا — أول ما الحساب ده يرجع يسجل دخول بتتزامن تلقائيًا
    // (من غير دي: تبديل الحساب في نص الـ debounce كان بيضيّع آخر تعديلات)
    if (this.currentEmail && this.accountData) {
      const pendingKeys = Object.keys(this._cloudDirty);
      if (pendingKeys.length) {
        const vals = {};
        for (const key of pendingKeys) vals[key] = this.accountData[key];
        this._stashPending(this.currentEmail, vals);
      }
    }

    this.currentEmail = clean;
    this._cloudLoaded = false;
    this._cloudDirty = {};
    if (this._cloudTimer) {
      clearTimeout(this._cloudTimer);
      this._cloudTimer = null;
    }
    const safeName = encodeURIComponent(clean).replace(/[*?"<>|]/g, "_");
    this.accountFile = path.join(this.dataDir, "account-" + safeName + ".json");
    let loaded = false;
    try {
      if (fs.existsSync(this.accountFile)) {
        this.accountData = JSON.parse(
          fs.readFileSync(this.accountFile, "utf-8"),
        );
        loaded = true;
      }
    } catch (e) {
      this.accountData = {};
    }

    if (!loaded) {
      this.accountData = {};
      if (!this.data._accountDataOwner) {
        for (const key of Object.keys(this.data)) {
          if (key.startsWith("_") || GLOBAL_KEYS.includes(key)) continue;
          this.accountData[key] = this.data[key];
        }
        this.data._accountDataOwner = clean;
        this._save();
      }
      this._saveAccount();
    }

    if (!this.accountData.actions) this.accountData.actions = [];
    if (!this.accountData.events) this.accountData.events = [];
    if (!this.accountData.connection)
      this.accountData.connection = { username: "" };
    if (!this.accountData.overlay) this.accountData.overlay = {};
    if (!this.accountData.settings) this.accountData.settings = {};

    // مزامنة مع قاعدة البيانات السحابية: الكلاود هو المصدر الأساسي،
    // والملف المحلي مجرد كاش للعمل أوفلاين
    return this._syncFromCloud(idToken);
  }

  async _syncFromCloud(idToken) {
    if (!this.currentEmail) return;
    let token = idToken;
    if (!token && typeof this.getToken === "function") {
      try {
        token = await this.getToken();
      } catch (e) {
        token = null;
      }
    }
    if (!token) return;
    try {
      const result = await this.cloud.loadAppData(this.currentEmail, token);
      if (this._cloudLoaded) return; // سبق واتحمّل حساب تاني بالتوازي
      if (result.found) {
        this.accountData = {
          actions: [],
          events: [],
          connection: { username: "" },
          overlay: {},
          settings: {},
          ...result.data,
        };
        this._saveAccount();
      } else {
        // أول مرة يسجّل من الجهاز ده: ارفع البيانات المحلية للكلاود
        for (const key of Object.keys(this.accountData)) {
          if (key.startsWith("_")) continue;
          this._cloudDirty[key] = true;
        }
        this._scheduleCloudFlush();
      }
      this._applyPendingStash();
      this._cloudLoaded = true;
    } catch (e) {
      // أوفلاين أو الكلاود مش متاح — نكمل بالكاش المحلي
      this._applyPendingStash();
      this._cloudLoaded = true;
    }
  }

  // حوّل قيم مفاتيح معلّقة للـ stash الجانبي لحساب معين — نسخة منفصلة
  // عن بيانات الحساب عشان تبديل/إفراغ الحساب مياثرش عليها
  _stashPending(email, keyValues) {
    if (!email || !keyValues) return;
    const stash = this._pendingStash[email] || {};
    for (const key of Object.keys(keyValues)) {
      try {
        stash[key] = JSON.parse(JSON.stringify(keyValues[key]));
      } catch (e) {
        stash[key] = null;
      }
    }
    this._pendingStash[email] = stash;
  }

  // رجّع أي تعديلات محفوظة جانبًا للحساب الحالي فوق البيانات المحمّلة،
  // وعلّمها متسخة عشان تتكتب على الكلاود — دي أحدث من نسخة الكلاود بالتعريف
  _applyPendingStash() {
    const stash = this._pendingStash[this.currentEmail];
    if (!stash || !this.accountData) return;
    delete this._pendingStash[this.currentEmail];
    for (const key of Object.keys(stash)) {
      this.accountData[key] = stash[key];
      this._cloudDirty[key] = true;
    }
    this._saveAccount();
    this._scheduleCloudFlush();
  }

  _scheduleCloudFlush() {
    if (!this.currentEmail || !this.accountData) return;
    if (Object.keys(this._cloudDirty).length === 0) return;
    if (this._cloudTimer) clearTimeout(this._cloudTimer);
    this._cloudTimer = setTimeout(() => {
      this._cloudTimer = null;
      this.flushCloud().catch(() => {});
    }, CLOUD_FLUSH_DELAY_MS);
  }

  async flushCloud() {
    if (!this.currentEmail || !this.accountData) return;
    if (this._cloudSaving) {
      // في عملية حفف شغالة — رجّع الجدولة تاني بعد ما تخلص
      this._scheduleCloudFlush();
      return;
    }
    const dirtyKeys = Object.keys(this._cloudDirty);
    if (dirtyKeys.length === 0) return;

    // لقطة متزامنة قبل أي await: الحساب والقيم لحظة الاستدعاء —
    // لو الحساب اتبدّل في نص العملية (جلب التوكن مثلًا) البيانات دي
    // لازم تروح لمستند صاحبها مش لمستند الحساب الجديد
    const flushEmail = this.currentEmail;
    const payload = {};
    for (const key of dirtyKeys) {
      payload[key] = this.accountData[key] === undefined ? null : this.accountData[key];
    }

    let token = null;
    if (typeof this.getToken === "function") {
      try {
        token = await this.getToken();
      } catch (e) {
        token = null;
      }
    }
    if (!token) {
      // مفيش توكن دلوقتي — أعد المحاولة لاحقًا بدل ما نسيب البيانات عالقة
      this._scheduleCloudFlush();
      return;
    }
    // الحساب اتبدّل أثناء جلب التوكن؟ يبقى التوكن بتاع حساب تاني ومينفعش
    // نكتب بيه — حوّل اللقطة للـ stash؛ بتتزامن أول ما صاحبها يرجع يدخل
    if (flushEmail !== this.currentEmail) {
      this._stashPending(flushEmail, payload);
      for (const key of dirtyKeys) delete this._cloudDirty[key];
      return;
    }

    this._cloudSaving = true;
    try {
      try {
        await this.cloud.saveAppDataKeys(flushEmail, token, payload);
      } catch (e) {
        // لو فشل بسبب التوكن (401/403) — نعمل refresh ونحاول مرة تانية قبل نستسلم
        const status = e && e.status;
        if (status === 401 || status === 403) {
          let fresh = null;
          if (typeof this.getToken === "function") {
            try {
              fresh = await this.getToken();
            } catch (e2) {}
          }
          if (fresh && fresh !== token) {
            if (flushEmail !== this.currentEmail) {
              // التوكن الجديد كمان لحساب تاني — نفس معالجة التبديل فوق
              this._stashPending(flushEmail, payload);
              for (const key of dirtyKeys) delete this._cloudDirty[key];
              return;
            }
            await this.cloud.saveAppDataKeys(flushEmail, fresh, payload);
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
      for (const key of dirtyKeys) {
        // امسح علامة الوسخ بس لو القيمة الحالية هي نفس اللي اتحفظت —
        // لو اتعدّلت تاني أثناء الحفظ تفضل معلّمة عشان تتحفظ بالأحدث
        if (
          this.currentEmail === flushEmail &&
          this.accountData &&
          this.accountData[key] === payload[key]
        ) {
          delete this._cloudDirty[key];
        }
      }
    } catch (e) {
      console.error("[Store] cloud flush error:", e.message);
      // البيانات لسه معلّقة — نعيد الجدولة بفاصل أطول عشان ما تضيعش
      if (!this._cloudRetryDelay) this._cloudRetryDelay = 15000;
      const delay = this._cloudRetryDelay;
      this._cloudRetryDelay = Math.min(this._cloudRetryDelay * 2, 300000);
      if (this._cloudTimer) clearTimeout(this._cloudTimer);
      this._cloudTimer = setTimeout(() => {
        this._cloudTimer = null;
        this.flushCloud().catch(() => {});
      }, delay);
      return;
    } finally {
      this._cloudSaving = false;
    }
    // نجاح — صفّر فاصل إعادة المحاولة
    this._cloudRetryDelay = 15000;
  }

  clearAccount() {
    // خزّن أي تعديلات معلّقة جانبًا قبل الإفراغ — التوكن بقى مش متاح
    // للحفظ المباشر بعد الخروج، فالـ stash يضمن وصولها أول رجوع للحساب
    if (this.currentEmail && this.accountData) {
      const pendingKeys = Object.keys(this._cloudDirty);
      if (pendingKeys.length) {
        const vals = {};
        for (const key of pendingKeys) vals[key] = this.accountData[key];
        this._stashPending(this.currentEmail, vals);
      }
    }
    this.currentEmail = null;
    this.accountData = null;
    this.accountFile = null;
    this._cloudDirty = {};
    this._cloudLoaded = false;
    if (this._cloudTimer) {
      clearTimeout(this._cloudTimer);
      this._cloudTimer = null;
    }
  }

  _saveAccount() {
    if (!this.accountFile) return;
    try {
      this._ensureDir();
      fs.writeFileSync(
        this.accountFile,
        JSON.stringify(this.accountData, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("Store account save error:", e);
    }
  }

  _isGlobalKey(key) {
    const root = String(key).split(".")[0];
    return GLOBAL_KEYS.includes(root);
  }

  _targetData(key) {
    if (this._isGlobalKey(key) || !this.accountData) {
      return this.data;
    }
    return this.accountData;
  }

  get(key) {
    if (!key) {
      return this.accountData || this.data;
    }
    const parts = keyParts(key);
    if (!parts) return undefined;
    let obj = this._targetData(key);
    for (const part of parts) {
      if (obj == null) return undefined;
      obj = obj[part];
    }
    return obj;
  }

  set(key, value) {
    if (!key) return;
    const parts = keyParts(key);
    if (!parts) return;
    let obj = this._targetData(key);
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null || typeof obj[parts[i]] !== "object") {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    if (this._isGlobalKey(key)) {
      this._save();
    } else {
      this._cloudDirty[parts[0]] = true;
      this._saveAccount();
      this._scheduleCloudFlush();
    }
  }

  delete(key) {
    const parts = keyParts(key);
    if (!parts) return;
    let obj = this._targetData(key);
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null) return;
      obj = obj[parts[i]];
    }
    delete obj[parts[parts.length - 1]];
    if (this._isGlobalKey(key)) {
      this._save();
    } else {
      this._cloudDirty[parts[0]] = true;
      this._saveAccount();
      this._scheduleCloudFlush();
    }
  }
}

module.exports = StoreService;
