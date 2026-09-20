// تشخيص: شكل بيانات الصورة في SIGI_STATE
const { TikTokLiveConnection } = require("tiktok-live-connector");

(async () => {
  const conn = new TikTokLiveConnection("nba");
  const html = await conn.webClient.getHtmlFromTikTokWebsite("@nba/live");
  const m = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/s);
  if (!m) { console.log("no SIGI"); process.exit(1); }
  const j = JSON.parse(m[1]);
  const lru = (j.LiveRoom && j.LiveRoom.liveRoomUserInfo) || {};
  const user = lru.user || {};
  console.log("user keys:", Object.keys(user).join(","));
  for (const k of Object.keys(user)) {
    if (/avatar|profile|image|photo/i.test(k)) {
      console.log("FIELD:", k, "=", JSON.stringify(user[k]).slice(0, 200));
    }
  }
  console.log("stats:", JSON.stringify((lru.stats || {})).slice(0, 200));
  process.exit(0);
})().catch(e => { console.log("ERR:", e.message); process.exit(1); });
