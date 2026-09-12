// ==========================================================================
// OverlayServer â€” Ù…ÙÙ…Ø±Ù‘Ø± Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ø£ÙˆÙØ±Ù„Ø§ÙŠ.
// Ø§Ù„ØµÙØ­Ø§Øª Ù†ÙØ³Ù‡Ø§ (overlay/widgets) Ø¨ØªØªÙ‚Ø¯Ù… Ø¯Ù„ÙˆÙ‚ØªÙŠ Ù…Ù† ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¯ÙŠØ³ÙƒØªÙˆØ¨ (Ø§Ù„ÙØ±ÙˆÙ†Øª)
// Ø¹Ù„Ù‰ Ø¬Ù‡Ø§Ø² Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ ÙˆØ§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ Ø¨ÙŠØ¨Ø¹ØªÙ„Ù‡ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ø¹Ø¨Ø± WebSocket Ø¨Ø§Ù„Ø±Ø³Ø§Ø¦Ù„:
//   ov:media / ov:alert / ov:tts / ov:ttsq / ov:stats / ov:event / ov:ext /
//   ov:wtest / ov:wcfg
// Ø§Ù„Ø·ÙˆØ§Ø¨ÙŠØ± (queue) ÙˆØ¥Ø´Ø§Ø±Ø§Øª "Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ù…ÙŠØ¯ÙŠØ§" Ø¨Ù‚Øª Ù…Ø³Ø¤ÙˆÙ„ÙŠØ© Ø§Ù„Ø³ÙŠØ±ÙØ± Ø§Ù„Ù…Ø­Ù„ÙŠ ÙÙŠ Ø§Ù„ÙØ±ÙˆÙ†Øª.
// ==========================================================================

class OverlayServer {
  constructor(store) {
    this.store = store;
    this.widgetConfigs = {};
    this.currentStats = null;
    this._scoreboardState = { left: 0, right: 0 };
    this._onScoreboardUpdate = null;
    this._onWebhook = null;
    this._forward = null;
    // إعدادات الويدجت من بيانات الحساب (accountData) لو متاحة — و إلا من
    // الملف العام (توافق مع الاختبارات والموكات القديمة)
    const data =
      (typeof store.get === "function" ? store.get() : null) ||
      (store && store.data) ||
      {};
    for (const key in data) {
      if (key.startsWith("widget_")) {
        this.widgetConfigs[key.replace("widget_", "")] = data[key];
      }
    }
  }

  // ÙŠØ¹ÙŠÙ‘Ù†Ù‡ server.js: (type, payload) => void â€” ÙŠØ¨Ø« Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù€ WS
  setForward(fn) {
    this._forward = typeof fn === "function" ? fn : null;
  }

  _emit(type, payload) {
    if (this._forward) {
      try {
        this._forward(type, payload);
      } catch (e) {}
    }
  }

  setWidgetConfig(id, config) {
    this.widgetConfigs[id] = config;
    this._emit("ov:wcfg", { id, config });
  }

  testWidget(id, payload = {}) {
    this._emit("ov:wtest", { id, ...payload });
  }

  sendMedia(screen, kind, path, opts = {}) {
    this._emit("ov:media", {
      screen: String(screen || "1"),
      item: {
        type: "media",
        kind,
        path,
        duration: opts.duration || 5,
        volume: opts.volume ?? 80,
        fade: opts.fade !== false,
        alertText: opts.alertText || "",
        alertUser: opts.alertUser || "",
        userPhoto: opts.userPhoto || "",
        userColor: opts.userColor || "#30D5C8",
        textColor: opts.textColor || "#30D5C8",
        alertFontSize: opts.alertFontSize || 22,
        alertPhotoSize: opts.alertPhotoSize || 64,
      },
    });
  }

  sendTTS(screen, text, lang = "en") {
    this._emit("ov:tts", {
      screen: String(screen || "1"),
      item: { type: "tts", text, lang },
    });
  }

  queueTTS(screen, item) {
    this._emit("ov:ttsq", {
      screen: String(screen || "1"),
      item: { type: "tts", ...(item || {}) },
    });
  }

  sendAlert(screen, text, user, opts = {}) {
    this._emit("ov:alert", {
      screen: String(screen || "1"),
      item: {
        type: "alert",
        text,
        user,
        userPhoto: opts.userPhoto || "",
        fontSize: opts.alertFontSize || 22,
        alertPhotoSize: opts.alertPhotoSize || 64,
        duration: opts.duration || 5,
        fade: opts.fade !== false,
        userColor: opts.userColor || "#30D5C8",
        textColor: opts.textColor || "#30D5C8",
      },
    });
  }

  broadcastStats(stats) {
    this.currentStats = stats;
    this._emit("ov:stats", { stats });
  }

  broadcastEvent(event, data) {
    this._emit("ov:event", { event, data });
  }

  broadcastExtension(event, data) {
    this._emit("ov:ext", { event, data });
  }

  // Ø§Ù„Ø·Ø§Ø¨ÙˆØ± Ø¨ÙŠØªØ¥Ø¯Ø§Ø±Ø© ÙÙŠ Ø§Ù„ÙØ±ÙˆÙ†Øª Ø¯Ù„ÙˆÙ‚ØªÙŠ â€” Ø¨ÙŠØ±Ø¬Ø¹ Ø­Ø§Ù„Ø© ÙØ§Ø¶ÙŠØ© Ù„Ù„ØªÙˆØ§ÙÙ‚
  getQueueStatus() {
    return {};
  }
}

module.exports = OverlayServer;
