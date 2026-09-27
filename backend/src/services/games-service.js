// ==========================================================================
// GamesService — كتالوج الألعاب وبيانات التثبيت.
// الكتالوج بيتولّد بـ scripts/import-games-system.js من نسخة الكتالوج المحفوظة.
// ==========================================================================

const fs = require("fs");
const path = require("path");

class GamesService {
  constructor() {
    this.reload();
  }

  reload() {
    const file = path.join(__dirname, "..", "data", "games.catalog.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    this._bySlug = new Map();
    for (const game of raw.games || []) {
      this._bySlug.set(String(game.slug).toLowerCase(), game);
    }
    return this.size();
  }

  size() {
    return this._bySlug.size;
  }

  // قايمة خفيفة لعرض صفحة الألعاب (كروت بالصور)
  list() {
    return [...this._bySlug.values()].map((g) => ({
      slug: g.slug,
      title: g.title,
      poster: g.poster,
      category: g.category,
      version: g.version,
      fileSize: g.fileSize,
    }));
  }

  get(slug) {
    return this._bySlug.get(String(slug || "").toLowerCase()) || null;
  }

  // كل اللي الواجهة محتاجاه للتثبيت: مسارات الفحص + الريجستري + رابط التنزيل
  installInfo(slug) {
    const g = this.get(slug);
    if (!g) return null;
    return {
      slug: g.slug,
      title: g.title,
      exeName: g.exeName,
      modUrl: g.modUrl,
      version: g.version,
      fileSize: g.fileSize,
      possiblePaths: g.possiblePaths,
      registryKeys: g.registryKeys,
    };
  }
}

module.exports = GamesService;
