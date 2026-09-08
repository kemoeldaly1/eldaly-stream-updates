// اختبار محلي للسيرفر المحلي للأوفرلاي — يشتغل بنود عادي: node scripts/overlay-test.js
const LocalOverlayServer = require("../src/services/local-overlay-server");
const http = require("http");

const TOKEN = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port, path, headers },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
  });
}

function post(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "POST" },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function sseCollect(port, path, ms, headers = {}) {
  return new Promise((resolve) => {
    const chunks = [];
    const req = http.get({ host: "127.0.0.1", port, path, headers }, (res) => {
      res.on("data", (c) => chunks.push(String(c)));
    });
    req.on("error", () => resolve(chunks));
    setTimeout(() => {
      req.destroy();
      resolve(chunks);
    }, ms);
  });
}

async function main() {
  let failures = 0;
  const check = (name, cond) => {
    console.log((cond ? "PASS" : "FAIL") + " — " + name);
    if (!cond) failures++;
  };

  const srv = new LocalOverlayServer({
    getConfig: async (id) => ({ testId: id, marker: "cfg-ok" }),
  });
  const port = await srv.start();
  srv.setToken(TOKEN);

  // 1. صفحة الأوفرلاي بالتوكن الصح
  let r = await get(port, `/overlay/${TOKEN}/1`);
  check("overlay page 200", r.status === 200);
  check("overlay page has SCREEN_ID", r.body.includes("SCREEN_ID = '1'"));
  check("overlay page has token paths", r.body.includes(`const TOKEN = '${TOKEN}'`));

  // 2. توكن غلط → 404
  r = await get(port, `/overlay/deadbeef/1`);
  check("wrong token overlay → 404", r.status === 404);

  // 3. شاشة غلط → 404
  r = await get(port, `/overlay/${TOKEN}/99`);
  check("invalid screen → 404", r.status === 404);

  // 4. ويدجت بالتوكن + حقن الكونفج
  r = await get(port, `/widget/${TOKEN}/goal?id=likes-goal`);
  check("widget page 200", r.status === 200);
  check("widget config injected", r.body.includes("cfg-ok"));
  check("no leftover placeholder", !r.body.includes("__INITIAL_CONFIG__"));

  // 5. ويدجت بتوكن غلط → 404
  r = await get(port, `/widget/wrongtoken/goal?id=x`);
  check("wrong token widget → 404", r.status === 404);

  // 6. SSE widget stream بالتوكن
  let chunks = await sseCollect(port, `/widgets/stream?token=${TOKEN}`, 600);
  srv.pushStats({ likes: 42 });
  await new Promise((res) => setTimeout(res, 300));
  chunks = chunks.join("");
  check("widget SSE opened", chunks.includes(":ok"));

  // 6b. SSE widget stream بتوكن في الـ Referer (زي ما الويدجت بتفتحه)
  const refChunks = await sseCollect(port, `/widgets/stream`, 500, {
    Referer: `http://127.0.0.1:${port}/widget/${TOKEN}/goal?id=x`,
  });
  check("widget SSE via referer token", refChunks.join("").includes(":ok"));

  // 6c. Referer بتوكن غلط → 404
  const badChunks = await sseCollect(port, `/widgets/stream`, 400, {
    Referer: `http://127.0.0.1:${port}/widget/wrongtoken/goal?id=x`,
  });
  check("widget SSE wrong referer rejected", !badChunks.join("").includes(":ok"));

  // 7. SSE شاشة + push media + done
  const screenChunks = [];
  await new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: `/events/${TOKEN}/1` },
      (res) => {
        res.on("data", (c) => screenChunks.push(String(c)));
        setTimeout(resolve, 400);
      },
    );
  });
  srv.pushMedia("1", { type: "media", kind: "picture", path: "C:/x.png", duration: 1 });
  await new Promise((res) => setTimeout(res, 400));
  const joined = screenChunks.join("");
  check("screen SSE got media event", joined.includes('"kind":"picture"'));

  // 8. done endpoint
  r = await post(port, `/done/${TOKEN}/1`);
  check("done endpoint 200", r.status === 200 && r.body.includes("ok"));

  // 9. media بدون توكن → 404
  r = await get(port, "/media/C:/Windows/win.ini");
  check("media without token → 404", r.status === 404);

  // 10. بدون توكن خالص (قبل تسجيل دخول)
  srv.setToken(null);
  r = await get(port, `/overlay/${TOKEN}/1`);
  check("no token set → 404", r.status === 404);
  check("urls empty when no token", srv.getOverlayUrls().length === 0);

  // 11. روابط اليوزر النهائية
  srv.setToken(TOKEN);
  const urls = srv.getOverlayUrls();
  check("10 overlay urls", urls.length === 10 && urls[0].url.includes(TOKEN));
  check(
    "widget url format",
    srv.getWidgetUrl("goal", "id=x") ===
      `http://127.0.0.1:${port}/widget/${TOKEN}/goal?id=x`,
  );

  srv.stop();
  console.log(failures === 0 ? "ALL TESTS PASSED" : failures + " FAILURES");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
