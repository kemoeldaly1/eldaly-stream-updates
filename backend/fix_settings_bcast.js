// fix_settings_bcast.js — إضافة بث sr-settings عند حفظ الإعدادات (يتحمل CRLF)
const fs = require("fs");
let s = fs.readFileSync("src/server.js", "utf8");
const re = /app\.post\("\/api\/songs\/settings", \(req, res\) => \{\r?\n  saveSongSettings\(req\.body \|\| \{\}\);\r?\n  res\.json\(\{ ok: true \}\);\r?\n\}\);/;
if (!re.test(s)) { console.log("not found"); process.exit(1); }
const neu = [
  'app.post("/api/songs/settings", (req, res) => {',
  "  const merged = saveSongSettings(req.body || {});",
  "  songreq.broadcastQueue(); // الطابور يتحدث لحظياً",
  '  broadcastRaw({ topic: "sr-settings", settings: merged }); // الحجم والصوت لحظياً',
  "  res.json({ ok: true, settings: merged });",
  "});",
].join("\n");
s = s.replace(re, neu);
fs.writeFileSync("src/server.js", s);
console.log("settings broadcast OK");
