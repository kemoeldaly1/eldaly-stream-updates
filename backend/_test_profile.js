// اختبار جلب بيانات صاحب الحساب من صفحة تيك توك (بنفس أدوات الكونيكتور)
const { TikTokLiveConnection } = require("tiktok-live-connector");

(async () => {
  const conn = new TikTokLiveConnection("tiktok");
  const web = conn.webClient || conn._webClient || (conn.client && conn.client.webClient);
  console.log("webClient available:", !!web);
  if (!web) process.exit(1);

  const html = await web.getHtmlFromTikTokWebsite("@tiktok");
  console.log("html length:", html.length);

  const uni = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/s);
  console.log("universal data:", !!uni);
  if (uni) {
    const s = uni[1];
    console.log("has followerCount:", s.includes("followerCount"));
    const idx = s.indexOf("followerCount");
    if (idx > -1) console.log("sample:", s.slice(idx - 80, idx + 80));
  }

  const sigi = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/s);
  console.log("sigi state:", !!sigi);

  const tote = html.match(/<script id="tote-endpoint"[^>]*>(.*?)<\/script>/s);
  console.log("tote:", !!tote);
})().catch(e => console.log("ERR:", e.message));
