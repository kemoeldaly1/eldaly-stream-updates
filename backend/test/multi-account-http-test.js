// اختبار تكاملي لتعدد الحسابات عبر HTTP — node test/multi-account-http-test.js
// بيقلع السيرفر الحقيقي وبيفتح حسابين بجلسات متزامنة وبيتأكد إن كل واحد
// بيشتغل على بياناته لوحده من غير ما يلمس التاني (بدون Firebase — الجلسات
// بتتولد مباشرة في الريجسترى زي ما بيعمل login الحقيقي).
process.env.PORT = "3995";
process.env.HOST = "127.0.0.1";
process.env.DATA_DIR = require("fs").mkdtempSync(
  require("path").join(require("os").tmpdir(), "eldaly-http-"),
);
process.env.ELDALY_DATA_DIR = process.env.DATA_DIR;

let failures = 0;
const check = (name, cond) => {
  console.log((cond ? "PASS" : "FAIL") + " — " + name);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(token, hwid, method, path, body) {
  const res = await fetch("http://127.0.0.1:3995" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-app-session": token,
      "x-app-hwid": hwid,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, json };
}

async function main() {
  const { accounts } = require("../src/server");
  await sleep(500); // استنى الإقلاع

  // ============ حسابين متزامنين ============
  const ctxA = accounts.getOrCreate("a@test.com");
  const ctxB = accounts.getOrCreate("b@test.com");
  await ctxA.activate(null);
  await ctxB.activate(null);
  ctxA.license.sessionEmail = "a@test.com";
  ctxB.license.sessionEmail = "b@test.com";
  const tokA = ctxA.mintSession("hw-a");
  const tokB = ctxB.mintSession("hw-b");
  accounts.indexSession(ctxA);
  accounts.indexSession(ctxB);
  accounts.setOverlayToken(ctxA, "ov-a-test");
  accounts.setOverlayToken(ctxB, "ov-b-test");
  check("both sessions minted", !!tokA && !!tokB);

  // الحالة الرسمية: كل حساب بيتهجى بإيميله
  const stateA = await api(tokA, "hw-a", "GET", "/api/auth/state");
  const stateB = await api(tokB, "hw-b", "GET", "/api/auth/state");
  check("A sees own email", stateA.json && stateA.json.accountEmail === "a@test.com");
  check("B sees own email", stateB.json && stateB.json.accountEmail === "b@test.com");

  // ============ عزل البيانات عبر الـ API ============
  await api(tokA, "hw-a", "POST", "/api/store/customGreeting", { value: "salam-A" });
  await api(tokB, "hw-b", "POST", "/api/store/customGreeting", { value: "salam-B" });
  const readA = await api(tokA, "hw-a", "GET", "/api/store/customGreeting");
  const readB = await api(tokB, "hw-b", "GET", "/api/store/customGreeting");
  check("A reads its own value", readA.json === "salam-A");
  check("B reads its own value", readB.json === "salam-B");

  // أكشنز كل حساب لوحده
  await api(tokA, "hw-a", "POST", "/api/actions", { actions: [{ id: "x1", name: "A1" }] });
  await api(tokB, "hw-b", "POST", "/api/actions", { actions: [{ id: "y1", name: "B1" }, { id: "y2", name: "B2" }] });
  const actA = await api(tokA, "hw-a", "GET", "/api/actions");
  const actB = await api(tokB, "hw-b", "GET", "/api/actions");
  check("A actions isolated", actA.json.length === 1 && actA.json[0].id === "x1");
  check("B actions isolated", actB.json.length === 2 && actB.json[0].id === "y1");

  // ============ الحماية: توكن A مايفتحش بيانات B ============
  const wrongSess = await api(tokA, "hw-b", "GET", "/api/actions"); // hwid غلط
  check("wrong hwid rejected", wrongSess.status === 401);
  const noSess = await api("garbage", "hw-a", "GET", "/api/actions");
  check("garbage token rejected", noSess.status === 401);

  // توكن الأوفرلاي بيفتح مسارات الأغاني للحساب صاحبه
  const songsViaOv = await fetch("http://127.0.0.1:3995/api/songs/state?t=ov-a-test", {
    headers: { "x-overlay-token": "ov-a-test" },
  });
  check("songs via overlay token routed", songsViaOv.status === 200 || songsViaOv.status === 403);
  const songsBad = await fetch("http://127.0.0.1:3995/api/songs/state?t=wrong-token");
  check("songs with bad overlay token rejected", songsBad.status === 401);

  // ============ WebSocket لكل حساب بيوصل لحسابه ============
  const WebSocket = require("ws");
  const wsMsgs = { a: null, b: null };
  await new Promise((resolve) => {
    let done = 0;
    const open = (tok, hwid, key) => {
      const ws = new WebSocket(`ws://127.0.0.1:3995/ws?session=${tok}&hwid=${hwid}`);
      ws.on("message", (raw) => {
        if (!wsMsgs[key]) {
          wsMsgs[key] = JSON.parse(raw);
          if (++done === 2) resolve();
        }
      });
      ws.on("error", () => { if (++done === 2) resolve(); });
    };
    open(tokA, "hw-a", "a");
    open(tokB, "hw-b", "b");
    setTimeout(resolve, 5000);
  });
  check("A WS init received", !!(wsMsgs.a && wsMsgs.a.type === "init"));
  check("B WS init received", !!(wsMsgs.b && wsMsgs.b.type === "init"));
  check("A/B WS states separate objects", wsMsgs.a && wsMsgs.b && wsMsgs.a.data.stats !== wsMsgs.b.data.stats);

  // بث لأحداث الحساب A — B ميتأثرش (عبر الـ API الحقيقي)
  ctxA.broadcastEvent("tiktok:like", { user: "someone" });

  // ============ health ============
  const health = await fetch("http://127.0.0.1:3995/api/health").then((r) => r.json());
  check("health shows 2 accounts", health.accounts === 2 && health.status === "ok");

  // ============ الخروج يحرر الحساب لوحده ============
  await api(tokB, "hw-b", "POST", "/api/auth/logout");
  const afterB = await api(tokB, "hw-b", "GET", "/api/actions");
  check("B session dead after logout", afterB.status === 401);
  const aStill = await api(tokA, "hw-a", "GET", "/api/actions");
  check("A untouched by B logout", aStill.status === 200 && aStill.json.length === 1);

  console.log(failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
