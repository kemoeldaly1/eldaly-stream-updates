const EventEmitter = require("events");

class TikTokService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connected = false;
    this.username = "";
  }

  // التحقق المسبق من البث المباشر
  async checkLiveStatus(username) {
    try {
      const cleanUser = username.replace("@", "").trim();
      const url = `https://www.tiktok.com/@${cleanUser}/live`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return false;
      const html = await response.text();
      if (html.includes('"liveRoomId"') ||
          html.includes('"roomId"') ||
          html.includes('"isLive":true') ||
          html.includes('"LiveRoom"')) {
        return true;
      }
      // طريقة احتياطية
      try {
        const apiUrl = `https://www.tiktok.com/api/live/detail/?aid=1988&uniqueId=${cleanUser}`;
        const apiRes = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(5000),
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.statusCode === 0 && data.data && data.data.roomId) {
            return true;
          }
        }
      } catch (e) {}
      return false;
    } catch (err) {
      console.warn("[TikTok] checkLiveStatus error:", err.message);
      return false;
    }
  }

  async connect(username, options = {}) {
    if (this.connected) {
      this.disconnect();
    }
    this.username = username.replace("@", "").trim();
    if (!this.username) {
      throw new Error("Username cannot be empty");
    }

    // تحقق مسبق من البث (مع إعادة محاولة)
    let isLive = await this.checkLiveStatus(this.username);
    if (!isLive) {
      console.log("[TikTok] User not live, waiting 3 seconds and retrying check...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      isLive = await this.checkLiveStatus(this.username);
    }
    if (!isLive) {
      throw new Error(
        `@${this.username} is not LIVE right now. Start your TikTok LIVE and try again.`
      );
    }

    this.activeStreaks = new Map();

    // استيراد المكتبة — دعم النسختين v1 و v2
    let TikTokConnection;
    try {
      const tiktokModule = require("tiktok-live-connector");
      // v2.x: TikTokLiveConnection — v1.x: WebcastPushConnection
      TikTokConnection =
        tiktokModule.TikTokLiveConnection ||
        tiktokModule.WebcastPushConnection;
      if (typeof TikTokConnection !== "function") {
        throw new Error("No valid connection class found in tiktok-live-connector");
      }
      console.log(
        `[TikTok] Library loaded (v2 API: ${TikTokConnection.name})`,
      );
    } catch (err) {
      console.error("[TikTok] Failed to load tiktok-live-connector:", err.message);
      throw new Error(
        "Failed to load TikTok connector library. Please run: npm install tiktok-live-connector"
      );
    }

    // v2: connectWithTimeout بدل timeout، و enableExtendedGiftInfo اتشالت
    this.client = new TikTokConnection(this.username, {
      processInitialData: true,
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 1000,
      connectWithTimeout: 30000,
    });

    // 3 محاولات مع فترات انتظار
    let lastError = null;
    const delays = [0, 3000, 5000];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[TikTok] Attempting connection (${attempt}/3) to @${this.username}`);
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
        }
        const roomData = await this.client.connect();
        this.connected = true;
        console.log(
          `[TikTok] Connected to @${this.username} roomId=${roomData.roomId}`,
        );
        this._setupListeners(options);
        return {
          roomId: roomData.roomId,
          viewers: roomData.viewerCount,
          title: roomData.roomInfo?.title || "",
          profilePictureUrl:
            roomData.roomInfo?.owner?.avatarThumb?.url_list?.[0] ||
            roomData.roomInfo?.owner?.avatar_thumb?.url_list?.[0] ||
            roomData.roomInfo?.owner?.avatarMedium?.url_list?.[0] ||
            "",
        };
      } catch (err) {
        lastError = err;
        console.warn(
          `[TikTok] Connection attempt ${attempt} failed: ${err.message}`
        );
      }
    }

    this.connected = false;
    this.client = null;
    throw this._normalizeError(lastError);
  }

  _normalizeError(err) {
    const msg = err?.message || String(err);
    const lower = msg.toLowerCase();

    // مهلة زمنية
    if (lower.includes("timeout")) {
      return new Error(
        "Connection timed out. Please check your internet connection and try again. If you are using a VPN or proxy, try disabling it."
      );
    }

    // المستخدم ليس على الهواء
    if (
      lower.includes("user isn't online") ||
      lower.includes("not live") ||
      lower.includes("offline") ||
      lower.includes("room not found") ||
      lower.includes("failed to extract") ||
      lower.includes("sigi") ||
      lower.includes("fetch failed")
    ) {
      return new Error(
        `@${this.username} is not LIVE right now. Start your TikTok LIVE and try again.`
      );
    }

    // اسم مستخدم غير صحيح
    if (lower.includes("username") || lower.includes("invalid") || lower.includes("not found")) {
      return new Error(
        `Username "${this.username}" is invalid — make sure you typed it correctly without @.`
      );
    }

    // طلبات كثيرة
    if (lower.includes("rate") || lower.includes("too many")) {
      return new Error(
        "Too many connection attempts — wait a moment and try again."
      );
    }

    return new Error(
      `Connection failed for @${this.username}: ${msg}. Check your internet and try again.`
    );
  }

  _setupListeners(options) {
    if (!this.client) return;

    this.client.on("chat", (msg) => {
      this.emit("chat", {
        user: msg.uniqueId,
        nickname: msg.nickname,
        comment: msg.comment,
        avatar: msg.profilePictureUrl,
        userId: msg.userId,
        isFollower:
          msg.isFollower || msg.followRole === 1 || msg.followRole === 2,
        isSubscriber: msg.isSubscriber,
        isModerator: msg.isModerator,
        badges: [
          msg.isModerator ? "moderator" : null,
          msg.isSubscriber ? "subscriber" : null,
          msg.isFollower || msg.followRole === 1 || msg.followRole === 2 ? "follower" : null,
        ].filter(Boolean),
      });
    });

    this.client.on("gift", (gift) => {
      let shouldEmit = false;
      let count = gift.repeatCount || 1;
      if (options.instantGifts) {
        if (gift.giftType === 1) {
          const streakKey = (gift.userId || gift.uniqueId) + "_" + gift.giftId;
          const prevStreak = this.activeStreaks.get(streakKey) || 0;
          const diff = gift.repeatCount - prevStreak;
          if (diff > 0) {
            count = diff;
            this.activeStreaks.set(streakKey, gift.repeatCount);
            shouldEmit = true;
          }
          if (gift.repeatEnd) {
            this.activeStreaks.delete(streakKey);
          }
        } else {
          shouldEmit = true;
        }
      } else {
        if (gift.giftType === 1 && !gift.repeatEnd) {
          return;
        }
        shouldEmit = true;
      }
      if (shouldEmit) {
        this.emit("gift", {
          user: gift.uniqueId,
          uniqueId: gift.uniqueId,
          nickname: gift.nickname,
          giftId: gift.giftId,
          giftName: gift.giftName || gift.describe,
          repeatCount: count,
          diamondCount: gift.diamondCount || 0,
          avatar: gift.profilePictureUrl,
          giftPictureUrl: gift.giftPictureUrl,
          userId: gift.userId,
        });
      }
    });

    this.client.on("like", (like) => {
      this.emit("like", {
        user: like.uniqueId,
        uniqueId: like.uniqueId,
        nickname: like.nickname,
        likeCount: like.likeCount,
        totalLikeCount: like.totalLikeCount,
        avatar: like.profilePictureUrl,
      });
    });

    this.client.on("follow", (follow) => {
      this.emit("follow", {
        user: follow.uniqueId,
        uniqueId: follow.uniqueId,
        nickname: follow.nickname,
        avatar: follow.profilePictureUrl,
      });
    });

    this.client.on("member", (member) => {
      this.emit("join", {
        user: member.uniqueId,
        uniqueId: member.uniqueId,
        nickname: member.nickname,
        avatar: member.profilePictureUrl,
      });
    });

    this.client.on("share", (share) => {
      this.emit("share", {
        user: share.uniqueId,
        uniqueId: share.uniqueId,
        nickname: share.nickname,
        avatar: share.profilePictureUrl,
      });
    });

    this.client.on("subscribe", (sub) => {
      this.emit("subscribe", {
        user: sub.uniqueId,
        uniqueId: sub.uniqueId,
        nickname: sub.nickname,
        avatar: sub.profilePictureUrl,
      });
    });

    this.client.on("streamEnd", (info) => {
      this.connected = false;
      this.emit("streamEnd", info);
    });

    this.client.on("error", (err) => {
      this.emit("error", err);
    });
  }

  disconnect() {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch (e) {}
      this.client = null;
    }
    this.connected = false;
    this.removeAllListeners();
  }

  isConnected() {
    return this.connected;
  }

  async getAvailableGifts() {
    if (!this.client || !this.connected) {
      return [];
    }
    try {
      const gifts = await (this.client.getAvailableGifts
        ? this.client.getAvailableGifts()
        : this.client.fetchAvailableGifts());
      return gifts.map((g) => ({
          id: String(g.id),
          name: g.name,
          coins: g.diamond_count || g.diamondCount || g.coins || 0,
          img:
            g.image?.url_list?.[0] ||
            g.icon?.url_list?.[0] ||
            g.image?.urls?.[0] ||
            "",
        }))
        .sort((a, b) => a.coins - b.coins);
    } catch (e2) {
      console.error("Failed to get gifts:", e2.message);
      return [];
    }
  }
}

module.exports = TikTokService;