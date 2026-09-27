// ==========================================================================
// import-games-system.js — بيلد ملفات البيانات بتاعة نظام الألعاب:
//   1) games.catalog.json  — كتالوج الألعاب (مسارات التثبيت + روابط CDN)
//   2) actions.vault.json  — الخزنة: كل أكشن بأوامره الحقيقية المخفية
//
// المصدر: نسخة الكتالوج والـ presets الرسمية المحفوظة في
//   C:\Users\kemo\Documents\StreamToEarn-Mods\_catalog\
// شغّله من فولدر backend:  node scripts/import-games-system.js
// ==========================================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CATALOG_ROOT =
  process.env.S2E_CATALOG_ROOT || "C:\\Users\\kemo\\Documents\\StreamToEarn-Mods\\_catalog";
const OUT_DIR = path.join(__dirname, "..", "src", "data");

const CDN_BASE = "https://d1jl7r3beoolrj.cloudfront.net";

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(CATALOG_ROOT, file), "utf-8"));
}

// ---------- 1) كتالوج الألعاب ----------
function buildGamesCatalog() {
  const raw = readJson("game-mods-catalog.json");
  const games = raw
    .filter((g) => g.active !== false && g.fileUrl)
    .map((g) => {
      const latest = (g.downloadableFileIds || []).slice().sort((a, b) =>
        String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || ""))
      )[0];
      return {
        slug: g.name,
        title: g.title || g.name,
        exeName: (g.exeName || "").trim() || null,
        poster: g.poster || null,
        category: g.category || "",
        version: g.version || (latest && latest.version) || null,
        // رابط المود كامل جاهز للتنزيل
        modUrl: g.fileUrl ? CDN_BASE + g.fileUrl : null,
        fileSize: (latest && latest.fileSize) || null,
        // مسارات التثبيت المحتملة (مع %ENV% expansion وقت الفحص)
        possiblePaths: (g.possiblePaths || []).filter(Boolean),
        // مفاتيح الريجستري الاحتياطية
        registryKeys: (g.registryKeys || [])
          .filter((r) => r.key)
          .map((r) => ({ hive: r.hive || "HKLM", key: r.key, name: r.name || null })),
      };
    });
  return { generatedAt: new Date().toISOString(), count: games.length, games };
}

// ---------- 2) خزنة الأكشنز (الأوامر المخفية) ----------
function triggerView(t) {
  if (!t) return { action: "Custom" };
  return {
    action: t.action || "Custom",
    giftId: t.giftId || "",
    value: t.value || "",
    valueMax: t.valueMax || "",
    platform: t.platformName || "TikTok",
  };
}

function buildActionsVault() {
  const presets = readJson("s2e-presets-all.json");
  const actions = [];
  const seen = new Set();

  for (const preset of presets) {
    const game = String(preset.game || "").trim();
    if (!game) continue;
    for (const ev of preset.events || []) {
      if (ev.active === false) continue;
      const fn = ev.function || {};
      const commands = fn.commands || [];
      // إيفنت من غير أوامر ولا كستوم = ملوش لازمة في الخزنة
      if (commands.length === 0 && !(fn.customCommands || []).length) continue;

      // الـ actionId ثابت من محتوى الإيفنت — بيتحسب مرة واحدة وبيفضل مستقر
      const fingerprint = JSON.stringify([
        game,
        preset._id,
        ev.id || ev._id,
        fn.name,
        commands,
      ]);
      const actionId = crypto
        .createHash("sha256")
        .update(fingerprint)
        .digest("hex")
        .slice(0, 16);

      if (seen.has(actionId)) continue;
      seen.add(actionId);

      actions.push({
        actionId,
        game,
        presetId: preset._id,
        presetName: preset.name || "",
        eventName: fn.name || "",
        trigger: triggerView(ev.trigger),
        rarity: (ev.extraOptions && ev.extraOptions.rarity) || "common",
        image: fn.image || null,
        // ⚠️ الأوامر الحقيقية — عايشة في الخزنة على السيرفر بس، مش بتتبعت للعميل
        // غير لحظة التنفيذ عبر /api/games/actions/resolve
        commands,
        customCommands: fn.customCommands || [],
        repetition: fn.repetition ?? 1,
        delay: fn.delay ?? 0,
        interval: fn.interval ?? 100,
        giftMultiplier: !!fn.giftMultiplier,
        repetitionMultiplier: !!fn.repetitionMultiplier,
      });
    }
  }
  return { generatedAt: new Date().toISOString(), count: actions.length, actions };
}

// ---------- main ----------
fs.mkdirSync(OUT_DIR, { recursive: true });

const catalog = buildGamesCatalog();
fs.writeFileSync(
  path.join(OUT_DIR, "games.catalog.json"),
  JSON.stringify(catalog, null, 2)
);
console.log("games.catalog.json:", catalog.count, "لعبة");

const vault = buildActionsVault();
fs.writeFileSync(
  path.join(OUT_DIR, "actions.vault.json"),
  JSON.stringify(vault, null, 2)
);
console.log("actions.vault.json:", vault.count, "أكشن مخفي");

const byGame = {};
for (const a of vault.actions) byGame[a.game] = (byGame[a.game] || 0) + 1;
console.log("توزيع الأكشنز على الألعاب:", byGame);
