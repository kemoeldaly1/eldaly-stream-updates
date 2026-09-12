// اختبار تبديل الحسابات — node test/store-switch-test.js
// بيغطي: حفظ آخر التعديلات المعلّقة عند تبديل الحساب (stash)، منع كتابة
// بيانات حساب على مستند حساب تاني لو التبديل حصل في نص عملية الحفظ،
// وعدم ضياع تعديل أحدث حصل أثناء الحفظ نفسه.
const fs = require("fs");
const path = require("path");
const os = require("os");
const StoreService = require("../src/services/store");

let failures = 0;
const check = (name, cond) => {
  console.log((cond ? "PASS" : "FAIL") + " — " + name);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eldaly-sw-"));
  const store = new StoreService(tmpDir);

  // سجل كل عمليات الحفظ على الكلاود: [الإيميل، المفاتيح]
  const savedCalls = [];
  // بيانات الكلاود لكل حساب — a عنده نسخة قديمة من actions
  const cloudDocs = {
    "a@x.com": {
      found: true,
      data: { actions: [{ id: "old", name: "Cloud Old" }] },
    },
    "b@x.com": {
      found: true,
      data: { actions: [{ id: "b1", name: "B Data" }] },
    },
  };
  // توكن بطيء عشان نقدر نبدّل الحساب في نص عملية الحفظ بشكل حتمي
  let slowToken = false;
  store.cloud = {
    loadAppData: async (email) => cloudDocs[email] || { found: false, data: {} },
    saveAppDataKeys: async (email, token, kv) => {
      savedCalls.push([email, Object.keys(kv)]);
      return true;
    },
  };
  store.getToken = async () => {
    if (slowToken) await sleep(120);
    return "tok123";
  };

  // ============ 1) تبديل عادي قبل ما الـ debounce يكتب ============
  await store.setAccount("a@x.com", "tok123");
  check("A: cloud old value loaded", store.get("actions")[0].id === "old");
  await sleep(1600); // خلّي حملة أول مرة تخلص عشان متتلخبطش مع الاختبار

  // تعديل جديد لـ A — لسه معلّق (debounce 1.2s)
  store.set("actions", [{ id: "new", name: "Newer" }]);
  // A قفل من غير ما الكلاود يتحدث → B دخل على السيرفر
  await store.setAccount("b@x.com", "tok123");
  check("B: own data loaded", store.get("actions")[0].id === "b1");
  await sleep(1600);
  const wrongWrite = savedCalls.some(([email, keys]) =>
    email === "b@x.com" && keys.includes("actions") &&
    JSON.stringify(store.get("actions")).includes("b1") // كتابة قيمة A تحت حساب B
  );
  check("no cross-account write after plain switch", !wrongWrite);

  // A رجع يدخل — التعديل المعلّق لازم يرجع فوق نسخة الكلاود القديمة
  await store.setAccount("a@x.com", "tok123");
  check("A: stashed newer value restored over stale cloud", store.get("actions")[0].id === "new");
  await sleep(1600);
  const aFlushed = savedCalls.some(
    ([email, keys]) => email === "a@x.com" && keys.includes("actions")
  );
  check("A: stashed value flushed to cloud", aFlushed);

  // ============ 2) تبديل في نص عملية الحفظ (التوكن بطيء) ============
  savedCalls.length = 0;
  store.set("events", [{ id: "ev1" }]);
  slowToken = true;
  const inflight = store.flushCloud(); // بدأ وجايب التوكن (هيستنى 120ms)
  await store.setAccount("b@x.com", "tok123"); // التبديل حصل في نص الحفظ
  await inflight;
  slowToken = false;
  const crossWrite = savedCalls.some(([email]) => email === "a@x.com");
  check("mid-flight switch: no doomed write for old account", !crossWrite);
  check("mid-flight switch: payload stashed for A",
    store._pendingStash["a@x.com"] &&
    Array.isArray(store._pendingStash["a@x.com"].events) &&
    store._pendingStash["a@x.com"].events[0].id === "ev1");

  // رجوع A → الـ stash بتاع events يتزامن
  await store.setAccount("a@x.com", "tok123");
  await sleep(1600);
  const evFlushed = savedCalls.some(
    ([email, keys]) => email === "a@x.com" && keys.includes("events")
  );
  check("mid-flight stash resynced on A return", evFlushed);

  // ============ 3) تعديل أحدث أثناء الحفظ مبيضيعش ============
  savedCalls.length = 0;
  slowToken = true;
  store.set("settings", { v: 1 });
  const p2 = store.flushCloud();       // شايل v:1 وناطر التوكن
  store.set("settings", { v: 2 });     // عدّل تاني في نص الحفظ
  await p2;
  slowToken = false;
  check("newer edit during save stays dirty",
    store._cloudDirty["settings"] === true);
  await sleep(1600);
  const v2Saved = savedCalls.some(
    ([email, keys]) => email === "a@x.com" && keys.includes("settings")
  );
  check("newer edit eventually flushed", v2Saved);

  // ============ 4) clearAccount بيحفظ المعلّق جانبًا ============
  store.set("hotkeys.a", [{ key: "F1" }]);
  store.clearAccount();
  check("clearAccount stash has hotkeys root",
    store._pendingStash["a@x.com"] &&
    store._pendingStash["a@x.com"].hotkeys &&
    store._pendingStash["a@x.com"].hotkeys.a[0].key === "F1");
  check("clearAccount resets state",
    store.currentEmail === null && store.accountData === null);

  console.log(failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
