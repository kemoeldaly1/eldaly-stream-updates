const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "eldaly-stream";
const DB_ROOT =
  "https://firestore.googleapis.com/v1/projects/" +
  PROJECT_ID +
  "/databases/(default)/documents";
const SECRETS_URL = DB_ROOT + "/secrets/patreon";
const PATREON_API = "https://www.patreon.com/api/oauth2/v2";

const OWNER_EMAILS = ["kemo.eldaly44@gmail.com", "captenblank1@gmail.com"];

class PatreonSync {
  constructor() {
    this.timer = null;
    this.licenseService = null;
    this.campaignId = null;
    this.running = false;
    this.lastErrorAt = 0;
    this.errorBackoff = 60000; // 1 minute initial backoff
    this.maxBackoff = 300000; // 5 minutes max
    this.consecutiveErrors = 0;
  }

  isOwner(email) {
    return OWNER_EMAILS.includes(
      String(email || "")
        .trim()
        .toLowerCase(),
    );
  }

  start(licenseService, onLog) {
    this.licenseService = licenseService;
    this.onLog = onLog || (() => {});
    if (this.timer) return;

    // First sync after 15 seconds, then every 60 seconds (or backoff)
    setTimeout(() => this.tick(), 15000);
    this.timer = setInterval(() => this.tick(), 60000);
    console.log("[PatreonSync] started for owner");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.campaignId = null;
  }

  async tick() {
    if (this.running) return;
    const email = this.licenseService && this.licenseService.sessionEmail;
    if (!this.isOwner(email)) return;

    this.running = true;
    try {
      await this.syncOnce();
      // Reset error backoff on success
      this.consecutiveErrors = 0;
      this.errorBackoff = 60000;
      this.lastErrorAt = 0;
    } catch (e) {
      this.consecutiveErrors++;
      // Increase backoff with each consecutive error (up to max)
      if (this.consecutiveErrors > 1) {
        this.errorBackoff = Math.min(
          this.errorBackoff * 1.5,
          this.maxBackoff
        );
      }
      // Only log if not a 404 (or if it's the first time)
      const is404 = e.message && e.message.includes("404");
      if (!is404 || this.consecutiveErrors === 1) {
        console.error("[PatreonSync] error:", e.message);
      } else if (is404) {
        console.log("[PatreonSync] ⚠️ Patreon campaign not found (404) — check your creator token or campaign settings. Will retry with backoff.");
      }
      this.lastErrorAt = Date.now();

      // If it's a 404, stop the interval and reschedule with backoff
      if (is404) {
        // Stop the normal interval and reschedule after backoff
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        // Schedule a single retry after backoff
        setTimeout(() => {
          if (!this.timer) {
            // Restart the interval
            this.timer = setInterval(() => this.tick(), 60000);
            // Also trigger an immediate tick to catch up
            setTimeout(() => this.tick(), 1000);
          }
        }, this.errorBackoff);
      }
    } finally {
      this.running = false;
    }
  }

  async authHeaders() {
    const idToken = await this.licenseService.getIdToken();
    if (!idToken) throw new Error("no auth token");
    return {
      Authorization: "Bearer " + idToken,
      "Content-Type": "application/json",
    };
  }

  async loadConfig() {
    const headers = await this.authHeaders();
    const res = await fetch(SECRETS_URL, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn("[PatreonSync] Patreon secrets not found in Firestore.");
        return null;
      }
      throw new Error(`Failed to fetch secrets: HTTP ${res.status}`);
    }
    const doc = await res.json();
    const f = doc.fields || {};
    const creatorToken = f.creatorToken ? f.creatorToken.stringValue : "";
    const minCents = f.minCents ? parseInt(f.minCents.integerValue, 10) : 500;
    const campaignId = f.campaignId ? f.campaignId.stringValue : ""; // optional override
    return creatorToken ? { creatorToken, minCents, campaignId } : null;
  }

  async fetchCampaignId(creatorToken) {
    if (this.campaignId) return this.campaignId;

    // If campaignId is provided in config, use it directly
    const config = await this.loadConfig();
    if (config && config.campaignId) {
      this.campaignId = config.campaignId;
      console.log(`[PatreonSync] Using campaign ID from config: ${this.campaignId}`);
      return this.campaignId;
    }

    const res = await fetch(PATREON_API + "/campaigns", {
      headers: { Authorization: "Bearer " + creatorToken },
    });
    if (res.status === 404) {
      throw new Error("campaigns fetch failed: HTTP 404 (no campaign found)");
    }
    if (!res.ok) {
      throw new Error("campaigns fetch failed: HTTP " + res.status);
    }
    const data = await res.json();
    const first = data.data && data.data[0];
    if (!first) throw new Error("no campaign found");
    this.campaignId = first.id;
    return this.campaignId;
  }

  async fetchMembers(creatorToken) {
    const campaignId = await this.fetchCampaignId(creatorToken);
    let url =
      PATREON_API +
      "/members?campaign_id=" +
      encodeURIComponent(campaignId) +
      "&fields%5Bmember%5D=patron_status,email&include=currently_entitled_tiers&fields%5Btier%5D=amount_cents&count=100";
    const members = [];
    let next = url;
    while (next) {
      const res = await fetch(next, {
        headers: { Authorization: "Bearer " + creatorToken },
      });
      if (res.status === 404) {
        throw new Error("members fetch failed: HTTP 404 (campaign not found or no members)");
      }
      if (!res.ok) {
        throw new Error("members fetch failed: HTTP " + res.status);
      }
      const data = await res.json();
      const tiersById = {};
      for (const inc of data.included || []) {
        if (inc.type === "tier" && inc.attributes) {
          tiersById[inc.id] = inc.attributes.amount_cents || 0;
        }
      }
      for (const m of data.data || []) {
        const a = m.attributes || {};
        const cents = Math.max(
          0,
          ...(
            (m.relationships &&
              m.relationships.currently_entitled_tiers &&
              m.relationships.currently_entitled_tiers.data) ||
            []
          ).map((t) => tiersById[t.id] || 0),
        );
        members.push({
          email: String(a.email || "")
            .trim()
            .toLowerCase(),
          status: a.patron_status || "",
          cents: cents,
        });
      }
      next =
        data.meta &&
        data.meta.pagination &&
        data.meta.pagination.cursors &&
        data.meta.pagination.cursors.next
          ? url +
            "&page%5Bcursor%5D=" +
            encodeURIComponent(data.meta.pagination.cursors.next)
          : null;
    }
    return members;
  }

  async getUserDoc(headers, email) {
    const res = await fetch(DB_ROOT + "/users/" + encodeURIComponent(email), {
      headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("user fetch failed: HTTP " + res.status);
    const doc = await res.json();
    const f = doc.fields || {};
    const g = (v) =>
      v &&
      (v.stringValue !== undefined
        ? v.stringValue
        : v.booleanValue !== undefined
          ? v.booleanValue
          : v.timestampValue !== undefined
            ? v.timestampValue
            : null);
    return {
      tier: g(f.tier) || "free",
      patreonSynced: g(f.patreonSynced) === true,
      email: g(f.email) || email,
    };
  }

  async patchUser(headers, email, fields) {
    const qs = Object.keys(fields)
      .map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k))
      .join("&");
    const res = await fetch(
      DB_ROOT + "/users/" + encodeURIComponent(email) + "?" + qs,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields }),
      },
    );
    return res.ok;
  }

  async syncOnce() {
    const config = await this.loadConfig();
    if (!config) {
      console.warn("[PatreonSync] No Patreon config found. Skipping sync.");
      return;
    }
    const { creatorToken, minCents } = config;
    if (!creatorToken) {
      console.warn("[PatreonSync] No creatorToken in config. Skipping sync.");
      return;
    }

    const headers = await this.authHeaders();
    const members = await this.fetchMembers(creatorToken);
    let activated = 0;
    for (const m of members) {
      if (!m.email) continue;
      const user = await this.getUserDoc(headers, m.email);
      if (!user) continue;
      const isPaying =
        m.status === "active_patron" && m.cents >= minCents;
      if (isPaying) {
        const expiresAt = new Date(
          Date.now() + 35 * 24 * 3600000,
        ).toISOString();
        const ok = await this.patchUser(headers, m.email, {
          tier: { stringValue: "pro" },
          expiresAt: { timestampValue: expiresAt },
          activatedAt: { timestampValue: new Date().toISOString() },
          patreonSynced: { booleanValue: true },
        });
        if (ok) {
          activated++;
          this.onLog("Patreon ✓ " + m.email + " (PRO مفعّل)");
        }
      } else if (user.patreonSynced) {
        await this.patchUser(headers, m.email, {
          expiresAt: { timestampValue: new Date().toISOString() },
        });
        this.onLog("Patreon ✗ " + m.email + " (وقف الدفع — اتقفل)");
      }
    }
    if (activated > 0) {
      console.log("[PatreonSync] activated " + activated + " member(s)");
    }
  }
}

module.exports = PatreonSync;