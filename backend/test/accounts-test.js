// اختبار النظام متعدد الحسابات — node test/accounts-test.js
// بيغطي: عزل بيانات الحسابات، استقلالية الجلسات، قاعدة الجهاز الواحد
// لكل حساب، كشف الجهاز المطرود، توجيه البث لعملاء الحساب بس، وتنظيف الخاملين.
process.env.DATA_DIR = require("fs").mkdtempSync(
  require("path").join(require("os").tmpdir(), "eldaly-acc-"),
);
process.env.ELDALY_DATA_DIR = process.env.DATA_DIR;

const { WebSocket } = require("ws");
const { AccountRegistry } = require("../src/services/accounts");

let failures = 0;
const check = (name, cond) => {
  console.log((cond ? "PASS" : "FAIL") + " — " + name);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// عميل WS وهمي بيسجل كل رسالة بتبعتها
function fakeWs() {
  const ws = {
    readyState: WebSocket.OPEN,
    sent: [],
    send(m) { this.sent.push(m); },
    close() { this.readyState = 3; },
    _guest: false,
  };
  return ws;
}

async function main() {
  const closedAccounts = [];
  const accounts = new AccountRegistry({
    getSongSettings: () => ({ songrequests: {} }),
    onAccountClosed: (ctx) => closedAccounts.push(ctx.email),
  });

  // ============ 1) حسابين مستقلين تمامًا ============
  const ctxA = accounts.getOrCreate("a@x.com");
  const ctxB = accounts.getOrCreate("b@x.com");
  check("different contexts per email", ctxA !== ctxB && ctxA.email === "a@x.com");
  check("same context on repeat", accounts.getOrCreate("a@x.com") === ctxA);
  check("stores are isolated instances", ctxA.store !== ctxB.store);

  await ctxA.activate(null);
  await ctxB.activate(null);
  check("A has its own tiktok/runner", !!ctxA.tiktok && !!ctxA.eventRunner);
  check("B has its own tiktok/runner", !!ctxB.tiktok && !!ctxB.eventRunner);
  check("runners are separate", ctxA.eventRunner !== ctxB.eventRunner);

  // بيانات كل حساب في متجره هو
  ctxA.store.set("actions", [{ id: "a1" }]);
  ctxB.store.set("actions", [{ id: "b1" }, { id: "b2" }]);
  check("store data isolated", ctxA.store.get("actions").length === 1 && ctxB.store.get("actions")[0].id === "b1");

  // ============ 2) جلسات مستقلة — الجهاز الواحد لكل حساب ============
  const tokA = ctxA.mintSession("hw-a");
  accounts.indexSession(ctxA);
  const tokB = ctxB.mintSession("hw-b");
  accounts.indexSession(ctxB);
  check("both accounts hold sessions simultaneously", !!tokA && !!tokB && tokA !== tokB);
  check("session routing by token", accounts.getBySession(tokA) === ctxA && accounts.getBySession(tokB) === ctxB);

  // نفس الحساب من جهاز تاني وهو نشيط → رفض
  check("same account second active device rejected", ctxA.mintSession("hw-a2") === null);
  // حساب تاني من أي جهاز → عادي (ده جوهر تعدد العملاء)
  const tokB2 = ctxB.mintSession("hw-b");
  check("other account unaffected by A device lock", tokB2 === tokB);

  // ============ 3) الاستيلاء على جلسة ميتة + كشف المطرود ============
  ctxA.session.lastSeen = Date.now() - 10 * 60 * 1000; // الجهاز القديم اختفى
  const tokA2 = ctxA.mintSession("hw-a2");
  accounts.indexSession(ctxA);
  check("dead device session taken over", !!tokA2 && tokA2 !== tokA);
  check("old device detects kicked", ctxA.isKicked(tokA) === true);
  check("session check with old token fails", !ctxA.sessionOk(tokA, "hw-a"));
  check("session check with new token passes", ctxA.sessionOk(tokA2, "hw-a2") === true);

  // ============ 4) البث بيوصل لعملاء الحساب بس ============
  const wsA1 = fakeWs();
  const wsA2 = fakeWs();
  const wsB1 = fakeWs();
  ctxA.wsClients.add(wsA1);
  ctxA.wsClients.add(wsA2);
  ctxB.wsClients.add(wsB1);
  ctxA.broadcastEvent("tiktok:gift", { giftName: "rose" });
  check("event reaches all A clients", wsA1.sent.length === 1 && wsA2.sent.length === 1);
  check("event never reaches B clients", wsB1.sent.length === 0);

  // ضيف ويدجت أغاني بتوكن أوفرلاي A → مواضيع الأغاني له بس
  accounts.setOverlayToken(ctxA, "ovtoken-a");
  accounts.setOverlayToken(ctxB, "ovtoken-b");
  const guestA = fakeWs();
  guestA._guest = true;
  guestA._overlayToken = "ovtoken-a";
  ctxA.wsClients.add(guestA);
  const guestB = fakeWs();
  guestB._guest = true;
  guestB._overlayToken = "ovtoken-b";
  ctxB.wsClients.add(guestB);
  ctxA.broadcastRaw({ topic: "songqueue", queue: [] });
  check("song topic reaches A guest only", guestA.sent.length === 1 && guestB.sent.length === 0);
  ctxA.broadcastEvent("tiktok:like", {});
  check("app events never reach guests", guestA.sent.length === 1);

  // توكن أوفرلاي غلط مبيوصلوش لحاجة
  const guestX = fakeWs();
  guestX._guest = true;
  guestX._overlayToken = "wrong";
  ctxA.wsClients.add(guestX);
  ctxA.broadcastRaw({ topic: "songqueue", queue: [] });
  check("wrong overlay token gets nothing", guestX.sent.length === 0);

  check("overlay token routing", accounts.getByOverlay("ovtoken-a") === ctxA && accounts.getByOverlay("ovtoken-b") === ctxB);

  // ============ 5) الإقفال والتنظيف ============
  // B قفل جلسته (release) — عملاء التطبيق بيقفلوا معاها، الحساب بيفضل
  // موجود لحد ما يخمل
  wsB1._appSession = tokB; // زي العميل الحقيقي بالظبط
  accounts.unindexSession(ctxB);
  ctxB.releaseSession();
  check("B session released", !ctxB.session);
  check("A session untouched by B release", !!ctxA.session);

  // sweep بيقفل الحسابات الخاملة (session مفيش + مفيش نشاط حديث)
  ctxA.lastSeen = Date.now();
  ctxA.session.lastSeen = Date.now(); // A لسه نشيط
  ctxB.lastSeen = Date.now() - 30 * 60 * 1000; // B خامل من ساعة
  accounts.sweep();
  check("idle account swept", !accounts.byEmail.has("b@x.com"));
  check("active account kept", accounts.byEmail.has("a@x.com"));
  check("closed hook fired for B", closedAccounts.includes("b@x.com"));

  console.log(failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
