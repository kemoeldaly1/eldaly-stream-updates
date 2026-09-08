const path = require("path");
const fs = require("fs");
const EventEmitter = require("events");
const { EdgeTTS } = require("node-edge-tts");
const googleTtsApi = require("google-tts-api");

class EventRunner extends EventEmitter {
  constructor(store, overlayServer, tiktokService, licenseService) {
    super();
    this.store = store;
    this.overlayServer = overlayServer;
    this.tiktokService = tiktokService;
    this.licenseService = licenseService;

    this.ttsTempDir = path.join(process.cwd(), "temp_tts");
    this._ensureTtsDir();

    this.globalStats = this._createFreshStats();
    this.scoreboardState = { left: 0, right: 0 };
    this.timerState = { remainingMs: 0, running: false, startedAt: 0 };
    this.timerInterval = null;
    this.globalMultiplier = 1;
    this.globalMultiplierTimer = null;
    this._avatarCache = new Map();
    this._ttsCooldowns = {};

    this._bindOverlay();
    this.setupTikTokListeners();
  }

  // ===== NEW: log method =====
  log(msg) {
    this.emit("log", msg);
  }

  _ensureTtsDir() {
    try {
      if (!fs.existsSync(this.ttsTempDir)) {
        fs.mkdirSync(this.ttsTempDir, { recursive: true });
      }
    } catch (e) {}
  }

  _createFreshStats() {
    return {
      likes: 0,
      shares: 0,
      comments: 0,
      gifts: 0,
      totalCoins: 0,
      followers: 0,
      lastSub: null,
      lastGift: null,
      topGifter: null,
      topLiker: null,
      _gifters: {},
      _likers: {},
      _commenters: {},
      topCommenters: [],
      topGifters: [],
      topLikers: [],
      _totalsSinceTrigger: { likes: 0, follows: 0, shares: 0, coins: 0 },
      _widgetProgress: {},
      _eventProgress: {},
    };
  }

  resetStats() {
    this.globalStats = this._createFreshStats();
    this.overlayServer.broadcastStats(this.globalStats);
    this.emit("stats:update", this.globalStats);
  }

  _bindOverlay() {
    this.overlayServer._scoreboardState = this.scoreboardState;
    this.overlayServer._onScoreboardUpdate = (state) => {
      this.scoreboardState = state;
      this.emit("ext:scoreboard:state", this.scoreboardState);
    };

    this.overlayServer._onWebhook = (pathOrId) => {
      const events = this.store.get("events") || [];
      const ev = events.find(
        (item) =>
          item.id === pathOrId ||
          (item.trigger?.type === "webhook" &&
            item.trigger?.webhookPath === pathOrId),
      );
      if (ev) {
        this.executeEventById(ev.id);
      }
    };
  }

  setupTikTokListeners() {
    const ts = this.tiktokService;
    ts.removeAllListeners();

    ts.on("disconnected", () => {
      this.emit("connection-status", { status: "disconnected" });
      if (this._liveHeartbeat) {
        clearInterval(this._liveHeartbeat);
        this._liveHeartbeat = null;
      }
      // الكوينز المجموعة في الجلسة تتسجل في الإحصائيات الشهرية قبل التصفير
      this.licenseService?.setLive(false, this.globalStats.totalCoins || 0);
    });

    ts.on("like", (data) => {
      this.globalStats.likes += data.likeCount || 1;
      const userKey = data.uniqueId || data.nickname || "anonymous";
      if (!this.globalStats._likers[userKey]) {
        this.globalStats._likers[userKey] = {
          count: 0,
          icon: data.avatar || data.profilePictureUrl,
        };
      }
      if (
        !this.globalStats._likers[userKey].icon &&
        (data.avatar || data.profilePictureUrl)
      ) {
        this.globalStats._likers[userKey].icon =
          data.avatar || data.profilePictureUrl;
      }
      this.globalStats._likers[userKey].count += data.likeCount || 1;
      this.globalStats.topLikers = Object.entries(this.globalStats._likers)
        .map(([u, d]) => ({
          user: u,
          count: d.count,
          icon: d.icon,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.overlayServer.broadcastStats(this.globalStats);
      this.overlayServer.broadcastEvent("like", data);
      this.emit("tiktok:like", data);
      this.executeEventTriggers("like", data);
      this.checkTotalEventTriggers("likes", data.likeCount || 1, data);
      this.checkWidgetGoals("likes", data.likeCount || 1, data);
    });

    ts.on("share", (data) => {
      this.globalStats.shares++;
      this.overlayServer.broadcastStats(this.globalStats);
      this.overlayServer.broadcastEvent("share", data);
      this.emit("tiktok:share", data);
      this.executeEventTriggers("share", data);
      this.checkTotalEventTriggers("shares", 1, data);
      this.checkWidgetGoals("shares", 1, data);
    });

    ts.on("chat", (data) => {
      this.globalStats.comments++;
      const userKey = data.uniqueId || data.nickname || "anonymous";
      if (!this.globalStats._commenters) this.globalStats._commenters = {};
      if (!this.globalStats._commenters[userKey]) {
        this.globalStats._commenters[userKey] = {
          count: 0,
          icon: data.avatar || data.profilePictureUrl,
        };
      }
      if (
        !this.globalStats._commenters[userKey].icon &&
        (data.avatar || data.profilePictureUrl)
      ) {
        this.globalStats._commenters[userKey].icon =
          data.avatar || data.profilePictureUrl;
      }
      this.globalStats._commenters[userKey].count++;
      this.globalStats.topCommenters = Object.entries(
        this.globalStats._commenters,
      )
        .map(([u, d]) => ({
          user: u,
          count: d.count,
          icon: d.icon,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.overlayServer.broadcastStats(this.globalStats);
      this.overlayServer.broadcastEvent("chat", data);
      this.emit("tiktok:chat", data);
      this.executeEventTriggers("comment", data);
      this.processTtsForComment(data);
    });

    ts.on("gift", (data) => {
      this.globalStats.gifts += data.repeatCount || 1;
      const coinValue = (data.diamondCount || 0) * (data.repeatCount || 1);
      this.globalStats.totalCoins += coinValue;
      const userKey = data.uniqueId || data.nickname || "anonymous";
      this.globalStats.lastGift = {
        user: userKey,
        giftName: data.giftName,
        count: data.repeatCount || 1,
        icon: data.avatar || data.profilePictureUrl,
      };

      if (!this.globalStats._gifters[userKey]) {
        this.globalStats._gifters[userKey] = {
          count: 0,
          icon: data.avatar || data.profilePictureUrl,
        };
      }
      if (
        !this.globalStats._gifters[userKey].icon &&
        (data.avatar || data.profilePictureUrl)
      ) {
        this.globalStats._gifters[userKey].icon =
          data.avatar || data.profilePictureUrl;
      }
      this.globalStats._gifters[userKey].count += coinValue;
      this.globalStats.topGifters = Object.entries(this.globalStats._gifters)
        .map(([u, d]) => ({
          user: u,
          count: d.count,
          icon: d.icon,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      this.overlayServer.broadcastStats(this.globalStats);
      this.overlayServer.broadcastEvent("gift", data);
      this.emit("tiktok:gift", data);
      this.executeEventTriggers("gift", data);
      if (coinValue > 0) {
        this.checkTotalEventTriggers("coins", coinValue, data);
      }
      this.checkWidgetGoals("gift", data.repeatCount || 1, data);

      const spinnerCfg = this.store.get("widget_gift-spinners");
      if (spinnerCfg && spinnerCfg.spinners) {
        for (const sp of spinnerCfg.spinners) {
          const triggerGifts = sp.triggerGifts || [];
          if (triggerGifts.length === 0 && sp.triggerGift) {
            triggerGifts.push({
              name: sp.triggerGift,
              img: sp.triggerGiftImg || "",
            });
          }
          const matched = triggerGifts.some(
            (item) =>
              item.name &&
              data.giftName &&
              item.name.toLowerCase() === data.giftName.toLowerCase(),
          );
          if (matched) {
            this.spinSpinner(sp, sp.id, data.nickname || data.uniqueId);
          }
        }
      }

      if (this.timerState.running) {
        const timerCfg = this.store.get("widget_gift-timer") || {};
        const mode = timerCfg.giftMode || "none";
        if (mode !== "none") {
          const coins = (data.diamondCount || 0) * (data.repeatCount || 1);
          const giftName = (data.giftName || "").toLowerCase();
          const giftIdStr = String(data.giftId || "");
          let secondsChange = 0;

          if (mode === "all-add") {
            secondsChange = coins * (timerCfg.addSecondsPerCoin || 1);
          } else if (mode === "all-remove") {
            secondsChange = -(coins * (timerCfg.removeSecondsPerCoin || 1));
          } else if (mode === "custom") {
            const addGifts = timerCfg.addGifts || [];
            const removeGifts = timerCfg.removeGifts || [];
            const isAdd = addGifts.some(
              (item) =>
                (item.id && item.id === giftIdStr) ||
                (item.name && item.name.toLowerCase() === giftName),
            );
            const isRemove = removeGifts.some(
              (item) =>
                (item.id && item.id === giftIdStr) ||
                (item.name && item.name.toLowerCase() === giftName),
            );

            if (isAdd) {
              secondsChange = coins * (timerCfg.addSecondsPerCoin || 1);
            } else if (isRemove) {
              secondsChange = -(coins * (timerCfg.removeSecondsPerCoin || 1));
            }
          }

          if (secondsChange !== 0) {
            this.timerState.remainingMs += secondsChange * 1000;
            if (this.timerState.remainingMs < 0)
              this.timerState.remainingMs = 0;
            const actionType = secondsChange > 0 ? "add-time" : "remove-time";
            this.overlayServer.broadcastExtension("ext-gift-timer", {
              action: actionType,
              seconds: Math.abs(secondsChange),
            });
            this._broadcastTimerState();
            if (this.timerState.remainingMs <= 0) {
              this.stopTimer();
            }
          }
        }
      }
    });

    ts.on("follow", (data) => {
      this.globalStats.followers++;
      this.globalStats.lastFollower = {
        user: data.uniqueId || data.nickname,
        icon: data.avatar || data.profilePictureUrl,
      };
      this.overlayServer.broadcastStats(this.globalStats);
      this.overlayServer.broadcastEvent("follow", data);
      this.emit("tiktok:follow", data);
      this.executeEventTriggers("follow", data);
      this.checkTotalEventTriggers("follows", 1, data);
      this.checkWidgetGoals("follows", 1, data);
    });

    ts.on("join", (data) => {
      this.overlayServer.broadcastEvent("join", data);
      this.emit("tiktok:join", data);
      this.executeEventTriggers("join", data);
    });

    ts.on("subscribe", (data) => {
      this.overlayServer.broadcastEvent("subscribe", data);
      this.emit("tiktok:subscribe", data);
      this.executeEventTriggers("subscribe", data);
    });

    ts.on("streamEnd", () => this.emit("tiktok:streamEnd"));
    ts.on("error", (err) => this.emit("tiktok:error", err?.message || err));
  }

  async processTtsForComment(chatData) {
    const ttsCfg = this.store.get("widget_tts");
    if (!ttsCfg || !ttsCfg.enabled) return;

    const user = chatData.user || chatData.uniqueId || chatData.nickname;
    const comment = chatData.comment || "";
    const likerCount = this.globalStats._likers[user]?.count || 0;
    const gifterCount = this.globalStats._gifters[user]?.count || 0;

    let allowed = false;
    if (ttsCfg.permAll) {
      allowed = true;
    } else {
      if (ttsCfg.permFollowers && chatData.isFollower) allowed = true;
      if (ttsCfg.permSubscribers && chatData.isSubscriber) allowed = true;
      if (ttsCfg.permModerators && chatData.isModerator) allowed = true;
    }

    if (!allowed) {
      if (ttsCfg.permLikes > 0 && likerCount >= ttsCfg.permLikes)
        allowed = true;
      if (ttsCfg.permCoins > 0 && gifterCount >= ttsCfg.permCoins)
        allowed = true;
    }

    if (!allowed) return;

    let isBlocked = false;
    if (ttsCfg.blacklist && ttsCfg.blacklist.trim() !== "") {
      const blacklist = ttsCfg.blacklist
        .split(",")
        .map((b) => b.trim().toLowerCase());
      const lower = comment.toLowerCase();
      for (const word of blacklist) {
        if (word && lower.includes(word)) {
          isBlocked = true;
          break;
        }
      }
    }

    if (ttsCfg.filterMentions && comment.includes("@")) isBlocked = true;
    if (ttsCfg.filterCmds && comment.startsWith("!")) isBlocked = true;
    if (ttsCfg.filterLetter && /(.)\1{4,}/.test(comment)) isBlocked = true;

    const maxLen = ttsCfg.maxLen || 150;
    let cleanText =
      comment.length > maxLen ? comment.substring(0, maxLen) : comment;
    if (isBlocked || !cleanText.trim()) return;

    const now = Date.now();
    const lastTts = this._ttsCooldowns[user] || 0;
    const cooldownMs = (ttsCfg.cooldown || 5) * 1000;
    if (now - lastTts < cooldownMs) return;
    this._ttsCooldowns[user] = now;

    let voice = ttsCfg.voiceURI;
    if (!voice || ttsCfg.randomVoice) {
      const arabicVoices = [
        "ar-EG-SalmaNeural",
        "ar-EG-ShakirNeural",
        "ar-SA-ZariyahNeural",
        "ar-SA-HamedNeural",
        "ar-AE-FatimaNeural",
        "ar-AE-HamdanNeural",
        "ar-JO-SanaNeural",
        "ar-JO-TaimNeural",
        "ar-SY-AmanyNeural",
        "ar-SY-LaithNeural",
        "ar-QA-AmalNeural",
        "ar-QA-AliNeural",
        "ar-KW-NouraNeural",
        "ar-KW-FahedNeural",
        "ar-MA-MounaNeural",
        "ar-MA-JamalNeural",
      ];
      voice = arabicVoices[Math.floor(Math.random() * arabicVoices.length)];
    }

    const rate =
      (Math.round(((ttsCfg.speed || 1) - 1) * 100) >= 0 ? "+" : "") +
      Math.round(((ttsCfg.speed || 1) - 1) * 100) +
      "%";
    const pitch =
      (Math.round(((ttsCfg.pitch || 1) - 1) * 50) >= 0 ? "+" : "") +
      Math.round(((ttsCfg.pitch || 1) - 1) * 50) +
      "Hz";
    const volume =
      (Math.round(((ttsCfg.volume || 1) - 1) * 100) >= 0 ? "+" : "") +
      Math.round(((ttsCfg.volume || 1) - 1) * 100) +
      "%";

    const edge = new EdgeTTS({ voice, rate, pitch, volume });
    const tempFile = path.join(
      this.ttsTempDir,
      `temp_tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`,
    );

    try {
      await edge.ttsPromise(cleanText, tempFile);
      const audioBase64 = fs.readFileSync(tempFile, "base64");
      const ttsPayload = { text: cleanText, audioBase64, config: ttsCfg };
      this.overlayServer.queueTTS("1", ttsPayload);
      this.emit("play-local-tts", ttsPayload);
    } catch (err) {
      const fallbackPayload = { text: cleanText, config: ttsCfg };
      this.overlayServer.queueTTS("1", fallbackPayload);
      this.emit("play-local-tts", fallbackPayload);
    } finally {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}
    }
  }

  // أيقونة تجريبية = لوجو البرنامج (لو الملف موجود) — وإلا دايرة بحرف T
  _testUserIcon() {
    try {
      return (
        "data:image/png;base64," +
        fs.readFileSync(path.join(__dirname, "logo.png")).toString("base64")
      );
    } catch (e) {
      return (
        "data:image/svg+xml;base64," +
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><circle cx="38" cy="38" r="36" fill="#232327" stroke="#d4af37" stroke-width="3"/><text x="38" y="50" font-family="Arial" font-size="36" font-weight="bold" fill="#d4af37" text-anchor="middle">T</text></svg>',
        ).toString("base64")
      );
    }
  }

  executeAction(action, context = {}) {
    const opts = action.opts || {};
    const logFn = (msg) => this.log(msg);
    const screen = action.screen || "1";

    const overlayOpts = {
      duration: action.duration || 5,
      volume: action.volume ?? 80,
      fade: action.fade_enabled !== false,
    };

    const hasMedia =
      (opts.audio_enabled && action.audio_path) ||
      (opts.video_enabled && action.video_path) ||
      (opts.picture_enabled && action.picture_path) ||
      (opts.tts_enabled && action.tts_text);

    if (opts.alert_enabled && action.alert_text && hasMedia) {
      overlayOpts.alertText = this.formatText(action.alert_text, context);
      // الخيار: إظهار/إخفاء اسم وصورة المرسل (افتراضيًا ظاهرين)
      const showSender = action.alert_show_sender !== false;
      // مفيش اسم/صورة في السياق (تشغيل مباشر) — نحط التجريبي بدل الفاضي
      overlayOpts.alertUser = showSender
        ? (context.nickname || context.uniqueId || context.user || "TestUser")
        : "";
      overlayOpts.userColor = action.alert_user_color;
      overlayOpts.textColor = action.alert_text_color;
      overlayOpts.alertFontSize = parseInt(action.alert_font_size) || 22;
      overlayOpts.alertPhotoSize = parseInt(action.alert_photo_size) || 64;
      overlayOpts.userPhoto = showSender
        ? (context.profilePictureUrl || context.avatar || this._testUserIcon())
        : "";
    }

    if (opts.multiplier_enabled) {
      const factor = opts.multiplier_factor || 2;
      const duration = opts.multiplier_duration || 60;
      this.globalMultiplier = factor;
      logFn(
        `[Multiplier] 🔥 Activated ${factor}x for ${duration}s by Action: ${action.name}`,
      );
      if (this.globalMultiplierTimer) clearTimeout(this.globalMultiplierTimer);
      this.globalMultiplierTimer = setTimeout(() => {
        this.globalMultiplier = 1;
        logFn("[Multiplier] 🛑 Reset to 1x (Timer expired)");
      }, duration * 1000);
    }

    const repeatTimes = opts.multiplier_enabled ? 1 : this.globalMultiplier;

    for (let i = 0; i < repeatTimes; i++) {
      try {
        if (opts.keys_enabled && action.keys) {
          const formattedKeys = this.formatText(action.keys, context);
          this.emit("client:pressKeys", {
            keys: formattedKeys,
            delay: action.key_delay || action.key_delay_ms || 0,
            actionName: action.name,
          });
          logFn(`[Action: ${action.name}] Keys → ${formattedKeys}`);
        }

        if (opts.tts_enabled && action.tts_text) {
          const formattedTts = this.formatText(action.tts_text, context);
          logFn(
            `[Action: ${action.name}] TTS → Screen ${screen} → ${formattedTts}`,
          );

          (async () => {
            const voiceMap = {
              ar: "ar-EG-SalmaNeural",
              en: "en-US-AriaNeural",
              fr: "fr-FR-DeniseNeural",
              de: "de-DE-KatjaNeural",
              es: "es-ES-ElviraNeural",
            };
            try {
              const edge = new EdgeTTS({
                voice: voiceMap[action.tts_lang] || voiceMap.ar,
              });
              const tempPath = path.join(
                this.ttsTempDir,
                `act_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`,
              );
              await edge.ttsPromise(formattedTts, tempPath);
              this.overlayServer.sendMedia(
                screen,
                "audio",
                tempPath,
                overlayOpts,
              );
              setTimeout(
                () => {
                  try {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                  } catch (e) {}
                },
                ((action.duration || 5) + 30) * 1000,
              );
            } catch (err) {
              try {
                const googleUrl = googleTtsApi.getAudioUrl(formattedTts, {
                  lang: action.tts_lang || "ar",
                  slow: false,
                  host: "https://translate.google.com",
                });
                this.overlayServer.sendMedia(
                  screen,
                  "audio",
                  googleUrl,
                  overlayOpts,
                );
              } catch (e) {
                logFn("[TTS Error] " + e.message);
              }
            }
          })();
        }

        if (opts.audio_enabled && action.audio_path) {
          logFn(
            `[Action: ${action.name}] Audio → Screen ${screen} → ${action.audio_path}`,
          );
          this.overlayServer.sendMedia(
            screen,
            "audio",
            action.audio_path,
            overlayOpts,
          );
        }

        if (opts.video_enabled && action.video_path) {
          logFn(
            `[Action: ${action.name}] Video → Screen ${screen} → ${action.video_path}`,
          );
          this.overlayServer.sendMedia(
            screen,
            "video",
            action.video_path,
            overlayOpts,
          );
        }

        if (opts.picture_enabled && action.picture_path) {
          logFn(
            `[Action: ${action.name}] Picture → Screen ${screen} → ${action.picture_path}`,
          );
          this.overlayServer.sendMedia(
            screen,
            "picture",
            action.picture_path,
            overlayOpts,
          );
        }

        if (opts.alert_enabled && action.alert_text) {
          const alertText = this.formatText(action.alert_text, context);
          const showSender = action.alert_show_sender !== false;
          const alertUser = showSender
            ? (context.nickname || context.uniqueId || context.user || "TestUser")
            : "";
          logFn(
            `[Action: ${action.name}] Alert → Screen ${screen} → ${alertText}`,
          );
          overlayOpts.userColor = action.alert_user_color;
          overlayOpts.textColor = action.alert_text_color;
          overlayOpts.alertFontSize = parseInt(action.alert_font_size) || 22;
          overlayOpts.alertPhotoSize = parseInt(action.alert_photo_size) || 64;
          overlayOpts.userPhoto = showSender
            ? (context.profilePictureUrl || context.avatar || this._testUserIcon())
            : "";
          if (!hasMedia) {
            this.overlayServer.sendAlert(
              screen,
              alertText,
              alertUser,
              overlayOpts,
            );
          }
        }

        if (opts.webhook_enabled && action.webhook_url) {
          const formattedUrl = this.formatText(action.webhook_url, context);
          fetch(formattedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: context.user || "",
              action: action.name,
              data: context,
            }),
          }).catch((err) => logFn("[Webhook Error] " + err.message));
          logFn(`[Action: ${action.name}] Webhook → ${formattedUrl}`);
        }

        if (opts.minecraft_enabled && action.mc_cmd) {
          const mc = this.store.get("minecraft") || {
            ip: "127.0.0.1",
            port: "4567",
            password: "",
            player: "",
          };
          const lines = action.mc_cmd
            .split("\n")
            .filter((l) => l.trim().length > 0);
          const jobs = [];
          let delayAcc = 0;
          for (const line of lines) {
            const trimmed = line.trim();
            const delayMatch = trimmed.match(/^delay\s+(\d+)$/i);
            if (delayMatch) {
              delayAcc += parseInt(delayMatch[1], 10) || 0;
              logFn(
                `[Action: ${action.name}] Minecraft ⏱ delay ${delayMatch[1]}ms`,
              );
              continue;
            }
            if (/^(break_delays|skip_delays)$/i.test(trimmed)) {
              delayAcc = 0;
              continue;
            }
            let cmdStr = this.formatText(trimmed, context);
            if (cmdStr.startsWith("/")) cmdStr = cmdStr.slice(1);
            if (!cmdStr) continue;
            jobs.push({ command: cmdStr, delay: delayAcc });
            logFn(`[Action: ${action.name}] Minecraft → /${cmdStr}`);
          }
          if (jobs.length > 0) {
            this.emit("client:minecraft", {
              mc: {
                ip: mc.ip || "127.0.0.1",
                port: String(mc.port || "4567"),
                password: mc.password || "",
              },
              jobs,
              actionName: action.name,
            });
          }
        }
      } catch (err) {
        logFn(`[Action: ${action.name}] ERROR: ${err.message}`);
      }
    }
  }

  spinSpinner(spinner, spinnerId, user) {
    const gifts = spinner.gifts || [];
    if (gifts.length === 0) return;

    const totalLuck = parseInt(spinner.totalLuck) || 1000;
    let rand = Math.random() * totalLuck;
    let winnerIndex = -1;

    for (let i = 0; i < gifts.length; i++) {
      rand -= parseFloat(gifts[i].luck) || 0;
      if (rand <= 0) {
        winnerIndex = i;
        break;
      }
    }
    if (winnerIndex === -1) {
      winnerIndex = Math.floor(Math.random() * gifts.length);
    }

    const winner = gifts[winnerIndex];
    this.overlayServer.broadcastExtension("ext-gift-spinner-" + spinnerId, {
      action: "spin",
      winnerIndex,
      user,
    });

    const spinTime = (parseInt(spinner.spinTime) || 5) * 1000;
    const winnerTime = (parseInt(spinner.winnerTime) || 10) * 1000;

    setTimeout(() => {
      if (winner.actionId) {
        const actions = this.store.get("actions") || [];
        const found = actions.find((a) => a.id === winner.actionId);
        if (found) {
          this.executeAction(found, { nickname: user });
        }
      }
    }, spinTime + winnerTime);
  }

  checkWidgetGoals(metricType, count, eventData) {
    if (!this.globalStats._widgetProgress)
      this.globalStats._widgetProgress = {};
    const actions = this.store.get("actions") || [];
    const goalWidgets = [
      {
        id: "likes-goal",
        metric: "likes",
        globalVal: () => this.globalStats.likes,
      },
      {
        id: "follows-goal",
        metric: "follows",
        globalVal: () => this.globalStats.followers,
      },
      {
        id: "heart-goal",
        checkMetric: (cfg) => (cfg.goalType || "likes") === metricType,
      },
      { id: "gift-goal", metric: "gift" },
    ];

    for (const gw of goalWidgets) {
      const cfg = this.store.get("widget_" + gw.id);
      if (!cfg || !cfg.goal) continue;
      if (cfg.behavior === "none" && cfg._completed) continue;
      if (gw.metric && gw.metric !== metricType) continue;
      if (gw.checkMetric && !gw.checkMetric(cfg)) continue;

      let currentVal = 0;
      if (metricType === "gift" || cfg.goalType === "gift") {
        const targetGift = (cfg.giftName || "").toLowerCase().trim();
        const incomingGift = (eventData.giftName || "").toLowerCase().trim();
        if (targetGift && targetGift !== incomingGift) continue;
        if (typeof this.globalStats._widgetProgress[gw.id] !== "number") {
          this.globalStats._widgetProgress[gw.id] = 0;
        }
        this.globalStats._widgetProgress[gw.id] += count;
        currentVal = this.globalStats._widgetProgress[gw.id];
      } else {
        currentVal =
          metricType === "likes"
            ? this.globalStats.likes
            : this.globalStats.followers;
      }

      const targetGoal = parseInt(cfg.goal) || 1000;
      if (typeof cfg._baseline !== "number") cfg._baseline = 0;
      const threshold = cfg._baseline + targetGoal;

      if (currentVal >= threshold) {
        if (cfg.action) {
          const actionObj = actions.find((a) => a.id === cfg.action);
          if (actionObj) {
            this.executeAction(actionObj, eventData);
          }
          this.log(`[Widget] Goal ${gw.id} reached! (Value: ${currentVal})`);
        }

        if (cfg.behavior === "repeat") {
          cfg._baseline = threshold;
        } else if (cfg.behavior === "double") {
          cfg._baseline = threshold;
          cfg.goal = targetGoal * 2;
        } else {
          cfg._completed = true;
        }
        this.store.set("widget_" + gw.id, cfg);
        this.overlayServer.broadcastEvent("config", { id: gw.id, config: cfg });
      }
    }
  }

  checkTotalEventTriggers(metricType, count, eventData) {
    if (!this.globalStats._eventProgress) this.globalStats._eventProgress = {};
    const events = this.store.get("events") || [];
    const mapping = {
      likes: "total_likes",
      follows: "total_follow",
      shares: "total_share",
      coins: "total_coins",
    };
    const targetTriggerType = mapping[metricType];
    const actions = this.store.get("actions") || [];

    for (const ev of events) {
      if (!ev.active || ev.trigger?.type !== targetTriggerType) continue;
      const target = parseInt(ev.trigger?.target) || 1000;
      const evId = ev.id;
      if (typeof this.globalStats._eventProgress[evId] !== "number") {
        this.globalStats._eventProgress[evId] = 0;
      }
      this.globalStats._eventProgress[evId] += count;

      if (this.globalStats._eventProgress[evId] >= target) {
        this.globalStats._eventProgress[evId] -= target;
        const toRun = [...(ev.actions_all || [])];
        if (ev.actions_random && ev.actions_random.length > 0) {
          const randAction =
            ev.actions_random[
              Math.floor(Math.random() * ev.actions_random.length)
            ];
          if (randAction) toRun.push(randAction);
        }
        for (const actId of toRun) {
          const actObj = actions.find((a) => a.id === actId);
          if (actObj) {
            this.executeAction(actObj, eventData);
          }
        }
        this.log(`[Event] Triggered Total ${metricType} (Reached ${target})`);
      }
    }
  }

  executeEventTriggers(eventType, eventData) {
    const events = this.store.get("events") || [];
    const actions = this.store.get("actions") || [];
    let coinRanges = null;

    if (eventType === "gift") {
      const uniqueCoinTargets = [
        ...new Set(
          events
            .filter(
              (e) =>
                e.active &&
                e.trigger?.type === "gift_coins" &&
                (e.trigger?.coins || 0) > 0,
            )
            .map((e) => e.trigger.coins),
        ),
      ].sort((a, b) => a - b);

      if (uniqueCoinTargets.length > 0) {
        coinRanges = {};
        for (let i = 0; i < uniqueCoinTargets.length; i++) {
          const min = i === 0 ? 1 : uniqueCoinTargets[i - 1] + 1;
          coinRanges[uniqueCoinTargets[i]] = { min, max: uniqueCoinTargets[i] };
        }
      }
    }

    for (const ev of events) {
      if (!ev.active) continue;
      if (
        ev.trigger?.type !== eventType &&
        (eventType !== "gift" || ev.trigger?.type !== "gift_coins")
      ) {
        continue;
      }

      if (ev.trigger?.type === "gift" && ev.trigger.gift) {
        if (ev.trigger.giftId && eventData.giftId) {
          if (String(ev.trigger.giftId) !== String(eventData.giftId)) continue;
        } else {
          const tGift = (ev.trigger.gift || "").toLowerCase();
          const inGift = (eventData.giftName || "").toLowerCase();
          const inId = String(eventData.giftId || "");
          if (tGift !== inGift && tGift !== inId) continue;
          if (ev.trigger.giftCoins && ev.trigger.giftCoins > 0) {
            if ((eventData.diamondCount || 0) !== ev.trigger.giftCoins)
              continue;
          }
        }
      }

      if (ev.trigger?.type === "gift_coins") {
        const diamonds = eventData.diamondCount || 0;
        const targetCoins = ev.trigger.coins || 0;
        if (!coinRanges || !coinRanges[targetCoins]) continue;
        const range = coinRanges[targetCoins];
        if (diamonds < range.min || diamonds > range.max) continue;
        this.log(
          `[Coins Range] ${eventData.giftName} (${diamonds} coins) matched range ${range.min}–${range.max}`,
        );
      }

      if (eventType === "comment" && ev.trigger?.keyword) {
        const keyword = ev.trigger.keyword.toLowerCase().trim();
        const comment = (eventData.comment || "").toLowerCase();
        if (!comment.includes(keyword)) continue;
      }

      let repeatMultiplier = 1;
      if (eventType === "like" && ev.trigger.likes > 0) {
        const user = eventData.uniqueId || eventData.nickname || "anonymous";
        const currentTotal =
          this.globalStats._likers[user]?.count || eventData.likeCount || 1;
        const prevTotal = currentTotal - (eventData.likeCount || 1);
        const step = ev.trigger.likes;
        const prevSteps = Math.floor(prevTotal / step);
        const currSteps = Math.floor(currentTotal / step);
        if (currSteps <= prevSteps) continue;
        repeatMultiplier = currSteps - prevSteps;
      }

      if (ev.who?.type === "specific" && ev.who.username) {
        const targetUser = ev.who.username.toLowerCase().replace("@", "");
        const actualUser = (eventData.uniqueId || eventData.user || "")
          .toLowerCase()
          .replace("@", "");
        if (targetUser !== actualUser) continue;
      }

      const runChain = (actionObj, delayOffset) => {
        const comboCount =
          eventType === "gift" && actionObj.repeat_gift
            ? eventData.repeatCount || 1
            : 1;
        if (comboCount <= 1) {
          if (delayOffset > 0) {
            setTimeout(
              () => this.executeAction(actionObj, eventData),
              delayOffset,
            );
          } else {
            this.executeAction(actionObj, eventData);
          }
          return delayOffset + 300;
        }
        this.log(`[Repeat] ${actionObj.name} × ${comboCount} (gift combo)`);
        for (let c = 0; c < comboCount; c++) {
          const d = delayOffset + c * 300;
          setTimeout(() => this.executeAction(actionObj, eventData), d);
        }
        return delayOffset + comboCount * 300;
      };

      let accDelay = 0;
      for (let r = 0; r < repeatMultiplier; r++) {
        for (const actId of ev.actions_all || []) {
          const actObj = actions.find((a) => a.id === actId);
          if (actObj) accDelay = runChain(actObj, accDelay);
        }
        if (ev.actions_random?.length > 0) {
          const randActId =
            ev.actions_random[
              Math.floor(Math.random() * ev.actions_random.length)
            ];
          const randActObj = actions.find((a) => a.id === randActId);
          if (randActObj) accDelay = runChain(randActObj, accDelay);
        }
      }
    }
  }

  executeEventById(eventId) {
    const events = this.store.get("events") || [];
    const actions = this.store.get("actions") || [];
    const ev = events.find((item) => item.id === eventId);
    if (!ev) return;

    // صورة التيست = لوجو البرنامج (لو الملف موجود) — وإلا دايرة بحرف T
    let testUserIcon;
    try {
      testUserIcon =
        "data:image/png;base64," +
        fs.readFileSync(path.join(__dirname, "logo.png")).toString("base64");
    } catch (e) {
      testUserIcon =
        "data:image/svg+xml;base64," +
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><circle cx="38" cy="38" r="36" fill="#232327" stroke="#d4af37" stroke-width="3"/><text x="38" y="50" font-family="Arial" font-size="36" font-weight="bold" fill="#d4af37" text-anchor="middle">T</text></svg>',
        ).toString("base64");
    }
    const testContext = {
      nickname: "TestUser",
      uniqueId: "testuser",
      giftName: ev.trigger?.gift || "Rose",
      diamondCount: ev.trigger?.coins || 1,
      repeatCount: 1,
      likeCount: ev.trigger?.likes || 1,
      comment: "Test comment",
      avatar: testUserIcon,
      profilePictureUrl: testUserIcon,
    };

    this.log(
      `[Test Event] Executing event (${ev.trigger?.type || "unknown"})...`,
    );
    for (const actId of ev.actions_all || []) {
      const actObj = actions.find((a) => a.id === actId);
      if (actObj) {
        this.executeAction(actObj, testContext);
        this.log(`[Test Event] → ${actObj.name}`);
      }
    }
    if (ev.actions_random?.length > 0) {
      const randId =
        ev.actions_random[Math.floor(Math.random() * ev.actions_random.length)];
      const randObj = actions.find((a) => a.id === randId);
      if (randObj) {
        this.executeAction(randObj, testContext);
        this.log(`[Test Event] → ${randObj.name} (random)`);
      }
    }
  }

  formatText(template, context = {}) {
    const mc = this.store.get("minecraft") || {};
    const player = mc.player || "";
    const user = context.uniqueId || context.user || "";
    const nick = context.nickname || context.uniqueId || "";
    const gift = context.giftName || "";
    const amount = String(context.repeatCount || context.amount || 1);
    const coins = String(context.diamondCount || context.coins || 0);
    const likes = String(context.likeCount || 0);
    const totalLikes = String(context.totalLikeCount || context.likeCount || 0);
    return (template || "")
      .replace(/\{playername\}/gi, player)
      .replace(/\{player\}/gi, player)
      .replace(/\{user\}/g, user)
      .replace(/\{username\}/g, user)
      .replace(/\{nickname\}/g, nick)
      .replace(/\{giftname\}/gi, gift)
      .replace(/\{gift\}/g, gift)
      .replace(/\{coins\}/gi, coins)
      .replace(/\{repeatcount\}/gi, amount)
      .replace(/\{amount\}/g, amount)
      .replace(/\{comment\}/g, context.comment || "")
      .replace(/\{likecount\}/gi, likes)
      .replace(/\{totallikecount\}/gi, totalLikes)
      .replace(/\{likes\}/g, likes)
      .replace(
        /\{profilePicture\}/g,
        encodeURIComponent(context.avatar || context.profilePictureUrl || ""),
      )
      .replace(/\bUSERNAME\b/g, user)
      .replace(/\bNICKNAME\b/g, nick)
      .replace(/\bUSER\b/g, user)
      // دعم الأقواس المربعة [username] زي {username} بالظبط
      .replace(/\[username\]/g, user)
      .replace(/\[nickname\]/g, nick)
      .replace(/\[user\]/g, user)
      .replace(/\[giftname\]/gi, gift)
      .replace(/\[gift\]/g, gift)
      .replace(/\[comment\]/g, context.comment || "")
      .replace(/\[playername\]/gi, player)
      .replace(/\[likes\]/g, likes);
  }

  // ===== Scoreboard Management =====
  updateScoreboard(side, amount = 1) {
    if (side === "left")
      this.scoreboardState.left = Math.max(
        0,
        this.scoreboardState.left + amount,
      );
    if (side === "right")
      this.scoreboardState.right = Math.max(
        0,
        this.scoreboardState.right + amount,
      );
    this.overlayServer.broadcastExtension("ext-scoreboard", {
      action: "update",
      left: this.scoreboardState.left,
      right: this.scoreboardState.right,
      bumped: side,
    });
    this.emit("ext:scoreboard:state", this.scoreboardState);
    return this.scoreboardState;
  }

  setScoreboard(left, right) {
    this.scoreboardState.left = Math.max(0, parseInt(left) || 0);
    this.scoreboardState.right = Math.max(0, parseInt(right) || 0);
    this.overlayServer.broadcastExtension("ext-scoreboard", {
      action: "update",
      left: this.scoreboardState.left,
      right: this.scoreboardState.right,
    });
    this.emit("ext:scoreboard:state", this.scoreboardState);
    return this.scoreboardState;
  }

  resetScoreboard() {
    this.scoreboardState = { left: 0, right: 0 };
    this.overlayServer.broadcastExtension("ext-scoreboard", {
      action: "reset",
    });
    this.emit("ext:scoreboard:state", this.scoreboardState);
    return this.scoreboardState;
  }

  // ===== Timer Management =====
  startTimer(minutes) {
    if (minutes) this.timerState.remainingMs = minutes * 60 * 1000;
    if (this.timerState.remainingMs <= 0) return;
    this.timerState.running = true;
    this.timerState.startedAt = Date.now();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.timerState.running) return;
      const now = Date.now();
      const elapsed = now - this.timerState.startedAt;
      this.timerState.startedAt = now;
      this.timerState.remainingMs -= elapsed;
      if (this.timerState.remainingMs <= 0) {
        this.timerState.remainingMs = 0;
        this.stopTimer();
        this.overlayServer.broadcastExtension("ext-gift-timer", {
          action: "set-time",
          seconds: 0,
        });
      }
      this._broadcastTimerState();
    }, 200);

    this.overlayServer.broadcastExtension("ext-gift-timer", {
      action: "start",
      minutes: minutes || this.timerState.remainingMs / 60000,
    });
    this._broadcastTimerState();
    return true;
  }

  stopTimer() {
    this.timerState.running = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.overlayServer.broadcastExtension("ext-gift-timer", { action: "stop" });
    this._broadcastTimerState();
    return true;
  }

  resetTimer(minutes) {
    this.stopTimer();
    const timerCfg = this.store.get("widget_gift-timer") || {};
    const initMins = minutes || timerCfg.initialMinutes || 60;
    this.timerState.remainingMs = initMins * 60 * 1000;
    this.overlayServer.broadcastExtension("ext-gift-timer", {
      action: "reset",
      minutes: initMins,
    });
    this._broadcastTimerState();
    return true;
  }

  addTimerTime(seconds) {
    this.timerState.remainingMs += (seconds || 0) * 1000;
    if (this.timerState.remainingMs < 0) this.timerState.remainingMs = 0;
    this.overlayServer.broadcastExtension("ext-gift-timer", {
      action: "add-time",
      seconds: seconds || 0,
    });
    this._broadcastTimerState();
    return true;
  }

  removeTimerTime(seconds) {
    this.timerState.remainingMs -= (seconds || 0) * 1000;
    if (this.timerState.remainingMs < 0) this.timerState.remainingMs = 0;
    this.overlayServer.broadcastExtension("ext-gift-timer", {
      action: "remove-time",
      seconds: seconds || 0,
    });
    this._broadcastTimerState();
    if (this.timerState.remainingMs <= 0 && this.timerState.running) {
      this.stopTimer();
    }
    return true;
  }

  getTimerState() {
    const totalSecs = Math.max(
      0,
      Math.ceil(this.timerState.remainingMs / 1000),
    );
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const display =
      h > 0
        ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return {
      running: this.timerState.running,
      remainingMs: this.timerState.remainingMs,
      display,
    };
  }

  _broadcastTimerState() {
    const state = this.getTimerState();
    this.emit("ext:timer:state", state);
  }

  async resolveAvatar(username) {
    const cleanUser = String(username || "")
      .trim()
      .replace(/^@+/, "");
    if (!cleanUser || !/^[a-zA-Z0-9._]{1,40}$/.test(cleanUser)) {
      return { ok: false };
    }
    const cached = this._avatarCache.get(cleanUser.toLowerCase());
    if (cached && Date.now() - cached.at < 600000 && cached.data) {
      return cached.data;
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/json,application/protobuf",
      Referer: "https://www.tiktok.com/",
      Origin: "https://www.tiktok.com",
      "Accept-Language": "en-US,en;q=0.9",
    };

    try {
      const oembedReq = fetch(
        "https://www.tiktok.com/oembed?url=" +
          encodeURIComponent("https://www.tiktok.com/@" + cleanUser),
        {
          headers,
          signal: AbortSignal.timeout(4000),
        },
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const liveReq = fetch(
        "https://www.tiktok.com/@" + encodeURIComponent(cleanUser) + "/live",
        {
          headers,
          signal: AbortSignal.timeout(4500),
        },
      )
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);

      const [oembedRes, liveRes] = await Promise.all([oembedReq, liveReq]);
      let avatarUrl = null;

      if (liveRes) {
        const sigiMatch = liveRes.match(
          /<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/,
        );
        if (sigiMatch) {
          try {
            const parsed = JSON.parse(sigiMatch[1]);
            const liveUser = parsed?.LiveRoom?.liveRoomUserInfo || {};
            const userObj = liveUser.user || liveUser.owner;
            const pickUrl = (p) =>
              !p ? null : typeof p === "string" ? p : p.url_list?.[0] || null;
            avatarUrl =
              pickUrl(userObj?.avatarLarger) ||
              pickUrl(userObj?.avatarMedium) ||
              pickUrl(userObj?.avatarThumb);
          } catch (e) {}
        }
      }

      const authorName = oembedRes?.author_name || null;
      if (!avatarUrl && oembedRes?.thumbnail_url) {
        avatarUrl = oembedRes.thumbnail_url;
      }

      if (avatarUrl || authorName) {
        const result = {
          ok: true,
          url: avatarUrl,
          name: authorName,
          username: cleanUser,
        };
        this._avatarCache.set(cleanUser.toLowerCase(), {
          at: Date.now(),
          data: result,
        });
        return result;
      }
      return { ok: false };
    } catch (e) {
      return { ok: false };
    }
  }
}

module.exports = EventRunner;
