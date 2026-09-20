// اختبار نهائي: بيانات صاحب الحساب (اسم + صورة + متابعين)
const TikTokService = require("./src/services/tiktok.js");

(async () => {
  const svc = new TikTokService();
  const handle = process.argv[2] || "danielo_gaming";
  console.log("fetching @" + handle + " ...");
  const info = await svc.fetchStreamerInfo(handle);
  if (!info) { console.log("FAILED: no data"); process.exit(1); }
  console.log("RESULT:");
  console.log("  nickname :", info.nickname);
  console.log("  followers:", info.followers);
  console.log("  avatar   :", (info.avatar || "").slice(0, 100));
  process.exit(0);
})().catch(e => { console.log("ERR:", e.message); process.exit(1); });
