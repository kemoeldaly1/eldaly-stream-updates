// اختبار فك التشفير داخل Electron نفسه (نفس نسخة V8)
// npx electron scripts/assets-test.js
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const ROOT = path.join(__dirname, "..");

async function main() {
  let failures = 0;
  const check = (name, cond) => {
    console.log((cond ? "PASS" : "FAIL") + " — " + name);
    if (!cond) failures++;
  };

  const secure = require("../src/services/secure-assets");

  const cases = [
    ["src/index.html", "<!doctype html>"],
    ["src/license.html", "<!doctype html>"],
    ["src/styles/main.css", "/*"],
    ["src/widgets/goal.html", "<!doctype"],
    ["src/widgets/scoreboard.html", "<!doctype"],
  ];

  for (const [rel, expectStart] of cases) {
    const plain = path.join(ROOT, rel);
    const enc = plain + ".enc";
    check(rel + " has .enc", fs.existsSync(enc));
    const buf = await secure.readAsset(plain);
    check(rel + " decrypts", !!buf && buf.length > 0);
    if (buf) {
      const text = buf.toString("utf-8").trimStart().slice(0, 20).toLowerCase();
      check(rel + " content valid", text.startsWith(expectStart.toLowerCase().trim()));
    }
  }

  // ملف مش موجود
  const missing = await secure.readAsset(path.join(ROOT, "src", "nope.html"));
  check("missing asset returns null", missing === null);

  // mime
  check("mime html", secure.mimeFor("x/y.HTML") === "text/html");
  check("mime css", secure.mimeFor("a/b.css") === "text/css");

  console.log(failures === 0 ? "ALL ASSET TESTS PASSED" : failures + " FAILURES");
  app.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  app.exit(1);
});
