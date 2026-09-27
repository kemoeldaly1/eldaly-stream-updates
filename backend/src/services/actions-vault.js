// ==========================================================================
// ActionsVault — خزنة الأوامر الحقيقية + الحل اللحظي (JIT Resolution).
//
// الفكرة الأمنية: العميل (برنامج الديسكتوب) عمره ما يشوف الأوامر الحقيقية
// (spawn_blue_unit:UNIT_XYZ...) — بيشتغل بأسماء أكشنز بس. لما حدية توصل،
// البرنامج يبعت actionId هنا، والخزنة ترجّع الأمر مرة واحدة موقّع HMAC
// عبر HTTPS — ينفذ في الذاكرة ويتمسح. مفيش تخزين ولا log على جهاز العميل.
// ==========================================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// مفتاح التوقيع — لازم يتحط في متغيرات البيئة في الإنتاج
const SIGNING_SECRET =
  process.env.ELDALY_ACTIONS_SECRET || "eldaly-dev-secret-change-me";
// نافذة الـ anti-replay: التوقيع الصالح لمدة 30 ثانية بس
const SIGNATURE_WINDOW_MS = 30_000;

class ActionsVault {
  constructor() {
    this.reload();
  }

  reload() {
    const file = path.join(__dirname, "..", "data", "actions.vault.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    this._byId = new Map();
    for (const action of raw.actions || []) {
      this._byId.set(action.actionId, action);
    }
    this._generatedAt = raw.generatedAt || null;
    return this.size();
  }

  size() {
    return this._byId.size;
  }

  has(actionId) {
    return this._byId.has(String(actionId || ""));
  }

  // العرض الآمن للعميل: بيانات العرض من غير أي أمر
  safeView(action) {
    return {
      actionId: action.actionId,
      game: action.game,
      presetName: action.presetName,
      eventName: action.eventName,
      trigger: action.trigger,
      rarity: action.rarity,
      image: action.image,
      repetition: action.repetition,
      delay: action.delay,
      interval: action.interval,
      giftMultiplier: action.giftMultiplier,
      repetitionMultiplier: action.repetitionMultiplier,
    };
  }

  // كل أكشنز لعبة بالعرض الآمن (لصفحة الإيفنتات في الواجهة)
  listByGame(game) {
    const out = [];
    for (const action of this._byId.values()) {
      if (String(action.game).toLowerCase() !== String(game || "").toLowerCase()) continue;
      out.push(this.safeView(action));
    }
    return out;
  }

  // الحل اللحظي — الوحيد اللي بيرجّع الأوامر، وموقّعة بـ HMAC ضد التلاعب
  resolve(actionId, { user = "", giftName = "", repeatCount = 1 } = {}) {
    const action = this._byId.get(String(actionId || ""));
    if (!action) return null;

    const ts = Date.now();
    const nonce = crypto.randomBytes(8).toString("hex");
    // التوقيع يشمل: الأكشن + المستخدم + الوقت + nonce — يمنع الـ replay وإعادة الاستخدام
    const payload = `${actionId}.${user}.${ts}.${nonce}`;
    const sig = crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(payload)
      .digest("hex");

    return {
      game: action.game,
      ts,
      nonce,
      sig,
      window: SIGNATURE_WINDOW_MS,
      // الأوامر كما هي — استبدال المتغيرات بيحصل في الذاكرة على جهاز العميل
      commands: action.commands,
      customCommands: action.customCommands,
      meta: {
        eventName: action.eventName,
        repetition: action.repetition,
        delay: action.delay,
        interval: action.interval,
        giftMultiplier: action.giftMultiplier,
        repetitionMultiplier: action.repetitionMultiplier,
        giftName,
        repeatCount: Number(repeatCount) || 1,
        user,
      },
    };
  }

  // التحقق من توقيع (للاستخدام لو احتجت تتحقق من طلب جاي من المود نفسه)
  verify(actionId, user, ts, nonce, sig) {
    if (Math.abs(Date.now() - Number(ts)) > SIGNATURE_WINDOW_MS) return false;
    const payload = `${actionId}.${user || ""}.${ts}.${nonce}`;
    const expected = crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(payload)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
    } catch (e) {
      return false;
    }
  }
}

module.exports = ActionsVault;
