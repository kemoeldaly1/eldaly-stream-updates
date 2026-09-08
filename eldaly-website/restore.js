// استرجاع كامل لموقع eldalystream.com — v2 (hashes على المحتوى المضغوط زي الـ CLI)
const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");
const path = require("path");

const SITE = "eldaly-stream";
const API = "https://firebasehosting.googleapis.com/v1beta1/sites/" + SITE;
const token = fs.readFileSync(process.env.TEMP + "/fbtoken.txt", "utf8").trim();
const PUB = path.join(__dirname, "public");
const OLD = "3de7df0c106439b1"; // آخر نسخة كاملة قبل نشرتي

const H = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

// نفس منطق firebase-tools: hash الـ gzip bytes (level 9)
function gzipAndHash(p) {
  const gz = zlib.gzipSync(fs.readFileSync(p), { level: 9 });
  return { gz, hash: crypto.createHash("sha256").update(gz).digest("hex") };
}

async function main() {
  // 1) hashes قديمة من آخر نسخة كاملة
  const oldFiles = (await (await fetch(API + "/versions/" + OLD + "/files?pageSize=100", { headers: H })).json()).files || [];
  const oldByPath = {};
  for (const f of oldFiles) oldByPath[f.path] = f.hash;

  // 2) الملفات المطلوبة — المحلي (جديد) + القديم (المفقود)
  const idx = gzipAndHash(path.join(PUB, "index.html"));
  const wanted = [
    { path: "/index.html", hash: idx.hash, gz: idx.gz },
    { path: "/app-ui.png", hash: oldByPath["/app-ui.png"] },
    { path: "/kemo-admin-2026/index.html", hash: oldByPath["/kemo-admin-2026/index.html"] },
    { path: "/reset.html", hash: oldByPath["/reset.html"] },
    { path: "/robots.txt", hash: oldByPath["/robots.txt"] },
    { path: "/sitemap.xml", hash: oldByPath["/sitemap.xml"] },
  ];
  for (const w of wanted) {
    if (!w.hash) throw new Error("hash مفقود: " + w.path);
    console.log("file:", w.path, "->", w.hash.slice(0, 12) + "…");
  }

  // 3) نسخة جديدة بإعدادات القديمة (redirect الباسورد + no-cache)
  let r = await fetch(API + "/versions", {
    method: "POST", headers: H,
    body: JSON.stringify({
      status: "CREATED",
      config: {
        headers: [{ glob: "**/*.@(html|css|js)", headers: { "Cache-Control": "no-cache" } }],
        redirects: [{ glob: "/__/auth/action", statusCode: 302, location: "https://eldalystream.com/reset.html" }],
      },
    }),
  });
  const ver = await r.json();
  const verId = ver.name.split("/versions/")[1];
  console.log("version:", verId);

  // 4) populate بالـ hashes الصحيحة
  const filesMap = {};
  for (const w of wanted) filesMap[w.path] = w.hash;
  r = await fetch(API + "/versions/" + verId + ":populateFiles", {
    method: "POST", headers: H, body: JSON.stringify({ files: filesMap }),
  });
  const pop = await r.json();
  if (!pop.uploadUrl) throw new Error("populate failed: " + JSON.stringify(pop).slice(0, 200));
  const need = pop.uploadRequiredHashes || [];
  console.log("uploads required:", need.length);

  // 5) رفع المطلوب فقط
  for (const h of need) {
    const w = wanted.find((x) => x.hash === h);
    if (!w || !w.gz) throw new Error("محتاج gzip لملف مش محلي: " + h);
    r = await fetch(pop.uploadUrl + "/" + h, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" },
      body: w.gz,
    });
    if (r.status !== 200) throw new Error("upload failed " + w.path + ": " + r.status + " " + (await r.text()).slice(0, 120));
    console.log("uploaded:", w.path);
  }

  // 6) إنهاء + نشر
  r = await fetch(API + "/versions/" + verId, { method: "PATCH", headers: H, body: JSON.stringify({ status: "FINALIZED" }) });
  if (r.status !== 200) throw new Error("finalize failed: " + r.status);
  r = await fetch(API + "/releases", {
    method: "POST", headers: H,
    body: JSON.stringify({
      message: "restore kemo-admin-2026 + reset.html + robots + sitemap (keep fixed index.html)",
      versionName: "sites/" + SITE + "/versions/" + verId,
    }),
  });
  const rel = await r.json();
  console.log("release:", r.status, rel.status || JSON.stringify(rel).slice(0, 200));
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
