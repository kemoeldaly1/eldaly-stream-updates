// ==========================================================================
// publish-release.js - upload built 2.3.16 artifacts to GitHub release
// Standalone (no electron) so it is not killed by the 120s shell limit.
//   - creates release tag v2.3.16 (deletes old one first)
//   - uploads: Setup-2.3.16.exe, its .blockmap, Setup-Latest.exe
//   - writes + uploads latest.yml (auto-update manifest, MUST say 2.3.16)
// Usage:  node publish-release.js
// ==========================================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error("GH_TOKEN not set");
  process.exit(1);
}
const OWNER = "kemoeldaly1";
const REPO = "eldaly-stream-updates";
const VERSION = "2.3.16";
const TAG = "v" + VERSION;
const DIST = path.join(__dirname, "dist");
const API = "https://api.github.com";
const UPLOADS = "https://uploads.github.com";

const HEADERS = {
  Authorization: "token " + TOKEN,
  "User-Agent": "eldaly-publish",
  Accept: "application/vnd.github+json",
};

async function gh(method, url, body) {
  const headers = Object.assign({}, HEADERS);
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let json = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch (e) {}
  if (!res.ok) {
    const err = new Error(`${method} ${url} => ${res.status} ${txt.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function ensureRelease() {
  try {
    const existing = await gh("GET", `${API}/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
    if (existing && existing.id) {
      console.log("deleting old release id=" + existing.id);
      await gh("DELETE", `${API}/repos/${OWNER}/${REPO}/releases/${existing.id}`);
    }
  } catch (e) {}
  try {
    await gh("DELETE", `${API}/repos/${OWNER}/${REPO}/git/refs/tags/${TAG}`);
    console.log("deleted old tag " + TAG);
  } catch (e) {}
  console.log("creating release " + TAG);
  return await gh("POST", `${API}/repos/${OWNER}/${REPO}/releases`, {
    tag_name: TAG,
    target_commitish: "main",
    name: VERSION,
    draft: false,
    prerelease: false,
  });
}

async function deleteAssetByName(releaseId, name) {
  try {
    const assets = await gh("GET", `${API}/repos/${OWNER}/${REPO}/releases/${releaseId}/assets`);
    const found = (assets || []).find((a) => a.name === name);
    if (found) {
      await gh("DELETE", `${API}/repos/${OWNER}/${REPO}/releases/assets/${found.id}`);
      console.log("  removed old asset " + name);
    }
  } catch (e) {}
}

function sha512Base64(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash("sha512").update(buf).digest("base64");
}

async function uploadAsset(release, filePath, nameOverride) {
  const name = nameOverride || path.basename(filePath);
  const stat = fs.statSync(filePath);
  console.log(`uploading ${name} (${stat.size} bytes)...`);
  await deleteAssetByName(release.id, name);
  const url = `${UPLOADS}/repos/${OWNER}/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "token " + TOKEN,
      "User-Agent": "eldaly-publish",
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stat.size),
    },
    body: fs.createReadStream(filePath),
    duplex: "half",
  });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`upload ${name} failed => ${res.status} ${txt.slice(0, 300)}`);
  }
  const json = JSON.parse(txt);
  console.log("  ok => " + json.browser_download_url);
  return json;
}

async function main() {
  const setupExe = path.join(DIST, "ELDALY-STREAM-Setup-" + VERSION + ".exe");
  const blockmap = setupExe + ".blockmap";
  const latestExe = path.join(DIST, "ELDALY-STREAM-Setup-Latest.exe");

  for (const f of [setupExe, blockmap, latestExe]) {
    if (!fs.existsSync(f)) {
      console.error("MISSING: " + f);
      process.exit(1);
    }
  }

  const release = await ensureRelease();

  await uploadAsset(release, setupExe);
  await uploadAsset(release, blockmap);
  await uploadAsset(release, latestExe);

  const sha = sha512Base64(setupExe);
  const size = fs.statSync(setupExe).size;
  const yml =
    "version: " + VERSION + "\n" +
    "files:\n" +
    "  - url: ELDALY-STREAM-Setup-" + VERSION + ".exe\n" +
    "    sha512: " + sha + "\n" +
    "    size: " + size + "\n" +
    "path: ELDALY-STREAM-Setup-" + VERSION + ".exe\n" +
    "sha512: " + sha + "\n" +
    "releaseDate: '" + new Date().toISOString() + "'\n";
  const ymlPath = path.join(DIST, "latest.yml");
  fs.writeFileSync(ymlPath, yml, "utf-8");
  console.log("wrote latest.yml (version " + VERSION + ")");
  await uploadAsset(release, ymlPath);

  console.log("PUBLISH COMPLETE for " + TAG);
}

main().catch((e) => {
  console.error("PUBLISH FAILED:", e.message);
  process.exit(1);
});
