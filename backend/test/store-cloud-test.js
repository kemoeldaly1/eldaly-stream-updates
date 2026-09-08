// اختبار محلي للتخزين السحابي والمُمرّر — node test/store-cloud-test.js
const fs = require("fs");
const path = require("path");
const os = require("os");
const StoreService = require("../src/services/store");
const OverlayServer = require("../src/services/overlay-server");

let failures = 0;
const check = (name, cond) => {
  console.log((cond ? "PASS" : "FAIL") + " — " + name);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eldaly-test-"));

  // ============ StoreService + Cloud ============
  const store = new StoreService(tmpDir);

  const savedKeys = [];
  let cloudData = {
    found: true,
    data: {
      actions: [{ id: "a1", name: "Cloud Action" }],
      profiles: [{ id: "prof_default", name: "Default" }],
      "widget_heart-goal": { goal: 100 },
    },
  };
  store.cloud = {
    loadAppData: async (email, token) => {
      check("cloud load got email+token", email === "user@test.com" && token === "tok123");
      return cloudData;
    },
    saveAppDataKeys: async (email, token, kv) => {
      savedKeys.push(Object.keys(kv));
      return true;
    },
  };
  store.getToken = async () => "tok123";

  await store.setAccount("user@test.com", "tok123");

  check("cloud data became source of truth", Array.isArray(store.get("actions")) && store.get("actions")[0].id === "a1");
  check("cloud profiles loaded", store.get("profiles")[0].id === "prof_default");
  check("widget config loaded", store.get("widget_heart-goal").goal === 100);

  // تعديل → علامة dirty + حفظ مؤجل
  store.set("actions", [{ id: "a2" }]);
  store.set("profileData.prof_x", { actions: [] });
  await sleep(1600);
  check("debounced cloud save fired", savedKeys.length >= 1);
  const allSaved = savedKeys.flat();
  check("actions key saved", allSaved.includes("actions"));
  check("profileData root key saved", allSaved.includes("profileData"));

  // global keys لا تُحفظ في الكلاود
  savedKeys.length = 0;
  store.set("auth.session", { email: "x" });
  await sleep(1600);
  check("global keys not saved to cloud", savedKeys.length === 0);

  // أول ترحيل: مستند كلاود فاضي → رفع البيانات المحلية
  const store2 = new StoreService(tmpDir);
  store2.cloud = {
    loadAppData: async () => ({ found: false, data: {} }),
    saveAppDataKeys: async (e, t, kv) => {
      savedKeys.push(Object.keys(kv));
      return true;
    },
  };
  store2.getToken = async () => "tok123";
  await store2.setAccount("user@test.com", "tok123");
  await sleep(1600);
  check("first-time migration uploads local data", savedKeys.flat().includes("actions"));

  // ============ OverlayServer forwarder ============
  const mockStore = { data: { "widget_goal": { goal: 5 } } };
  const ov = new OverlayServer(mockStore);
  const events = [];
  ov.setForward((type, payload) => events.push({ type, payload }));

  check("widget configs loaded from store", ov.widgetConfigs["widget_goal"] === undefined && ov.widgetConfigs["goal"] !== undefined);

  ov.sendMedia(2, "video", "C:/clip.mp4", { duration: 10, alertUser: "kemo" });
  ov.sendAlert(1, "برافو", "ahmed");
  ov.sendTTS(1, "hello", "ar");
  ov.queueTTS(1, { audioBase64: "QQ==", maxQueue: 3 });
  ov.broadcastStats({ likes: 5 });
  ov.broadcastEvent("gift", { giftName: "rose" });
  ov.broadcastExtension("ext-scoreboard", { action: "update" });
  ov.testWidget("goal", { foo: 1 });
  ov.setWidgetConfig("goal", { goal: 99 });

  const types = events.map((e) => e.type);
  check("all ov: event types emitted", ["ov:media", "ov:alert", "ov:tts", "ov:ttsq", "ov:stats", "ov:event", "ov:ext", "ov:wtest", "ov:wcfg"].every((t) => types.includes(t)));
  check("media event shape", events[0].payload.screen === "2" && events[0].payload.item.kind === "video" && events[0].payload.item.alertUser === "kemo");
  check("alert event shape", events[1].payload.item.text === "برافو");
  check("ttsq carries item", events[3].payload.item.audioBase64 === "QQ==");
  check("queue status empty for compat", Object.keys(ov.getQueueStatus()).length === 0);

  console.log(failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
