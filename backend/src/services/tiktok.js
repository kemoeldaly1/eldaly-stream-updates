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

  // جلب بروفايل صاحب الحساب: اسم + صورة + متابعين حقيقيين من صفحة @user/live
  async fetchStreamerInfo(username) {
      // استيراد المكتبة بنفس آلية connect (دعم v1 و v2)
      let TikTokConnection;
      try {
        const tiktokModule = require("tiktok-live-connector");
        TikTokConnection = tiktokModule.TikTokLiveConnection || tiktokModule.WebcastPushConnection;
        if (typeof TikTokConnection !== "function") throw new Error("no class");
      } catch (err) {
        return null;
      }
      const uname = String(username || "").replace("@", "").trim();
      if (!uname) return null;
      this._profileCache = this._profileCache || new Map();
      const hit = this._profileCache.get(uname);
      if (hit && Date.now() - hit.ts < 10 * 60 * 1000) return hit.data;
      const tmp = new TikTokConnection(uname, { processInitialData: false });
      const html = await tmp.webClient.getHtmlFromTikTokWebsite("@" + uname + "/live");
      const m = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/s);
      if (!m) return null;
      const j = JSON.parse(m[1]);
      const lrUser = (j.LiveRoom && j.LiveRoom.liveRoomUserInfo) || {};
      const user = lrUser.user || null;
      const stats = lrUser.stats || {};
      if (!user) return null;
      const avatar =
        this._imgUrl(user.avatarLarger) ||
        this._imgUrl(user.avatarMedium) ||
        this._imgUrl(user.avatarThumb) ||
        "";
      const info = {
        nickname: user.nickname || uname,
        avatar: avatar,
        followers: (stats && stats.followerCount) || 0
      };
      this._profileCache.set(uname, { data: info, ts: Date.now() });
      return info;
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
        // بيانات صاحب اللايف: بتيجي في roomInfo.data.user (api-live) أو owner
        const ri = roomData.roomInfo || {};
        const owner =
          (ri.data && ri.data.user && typeof ri.data.user === "object") ? ri.data.user :
          (ri.owner && typeof ri.owner === "object") ? ri.owner : {};
        if (!owner.nickname && !owner.nickName) {
          try {
            console.log("[TikTok] roomInfo keys:", Object.keys(ri).join(",") || "(none)",
              "| data keys:", ri.data ? Object.keys(ri.data).join(",") : "(none)");
          } catch (e) {}
        }
        const ownerAvatar =
          this._imgUrl(owner.profilePictureMedium) ||
          this._imgUrl(owner.profilePicture) ||
          this._imgUrl(owner.profilePictureLarge) ||
          this._imgUrl(owner.avatarThumb) ||
          this._imgUrl(roomData.roomInfo?.owner?.avatarThumb) ||
          "";
        // بيانات صاحب اللايف للويدجتات: اسم + صورة + متابعين حقيقيين من room info
        const followersRaw =
          (owner.followInfo && owner.followInfo.followerCount) ||
          (owner.follow_info && owner.follow_info.follower_count) ||
          owner.followerCount ||
          (owner.stats && (owner.stats.followerCount || owner.stats.follower_count)) ||
          0;
        this.streamerInfo = {
          nickname:
            owner.nickname ||
            owner.nickName ||
            owner.displayId ||
            owner.uniqueId ||
            this.username,
          avatar: ownerAvatar,
          followers: Number(followersRaw) || 0
        };
        this.emit("tiktok:streamer", this.streamerInfo);
        console.log(
          `[TikTok] Streamer: @${this.username} — ${this.streamerInfo.nickname} — ${this.streamerInfo.followers} followers — avatar: ${this.streamerInfo.avatar ? "ok" : "missing"}`
        );
        // جلب room info اختياري — فشله مش بيوقف الكونكت
        (async () => {
          try {
            const ri = await this.client.fetchRoomInfo();
            const d = ri && ri.data ? ri.data : {};
            const user = d.user || {};
            const stats = d.stats || {};
            const followers = Number(stats.followerCount) || 0;
            const nickname = user.nickname || this.streamerInfo.nickname;
            const avatar = this._imgUrl(user.avatarLarger) || this._imgUrl(user.avatarMedium) || this._imgUrl(user.avatarThumb) || this.streamerInfo.avatar;
            if (followers > 0 || nickname) {
              this.streamerInfo = {
                nickname: nickname,
                avatar: avatar,
                followers: followers
              };
              this.emit("tiktok:streamer", this.streamerInfo);
              console.log(`[TikTok] Streamer updated: ${nickname} — ${followers} followers`);
            }
          } catch (e) {
            console.log("[TikTok] room info fetch skipped:", e.message);
          }
        })();
        // جلب البروفايل الكامل (بمتابعينه الحقيقيين) وبثه للويدجتات
        this.fetchStreamerInfo(this.username)
          .then(info => {
            if (info && (info.followers || info.avatar)) {
              this.streamerInfo = info;
              this.emit("tiktok:streamer", info);
              console.log(`[TikTok] Profile updated: ${info.nickname} — ${info.followers} followers`);
            }
          })
          .catch(() => {});
        return {
          roomId: roomData.roomId,
          viewers:
            roomData.viewerCount ??
            roomData.roomInfo?.viewerCount ??
            roomData.roomInfo?.liveRoomUserInfo?.userCount ??
            0,
          title: roomData.roomInfo?.title || "",
          profilePictureUrl: ownerAvatar,
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

  // ====== تسطيح بيانات المكتبة ======
  // tiktok-live-connector v2.1.1-beta بتبعت الرسائل protobuf خام:
  // بيانات العضو مدفونة في msg.user والصورة في Image.url — مش مسطحة زي v1.
  // الدوال دي بتحوّل الشكلين للشكل الموحد اللي باقي البرنامج بيتوقعه
  // (user / uniqueId / nickname / avatar / badges في مستوى واحد).

  _imgUrl(img) {
    if (!img) return "";
    if (typeof img === "string") return img;
    if (Array.isArray(img.url) && img.url.length) return img.url[0];
    if (Array.isArray(img.url_list) && img.url_list.length)
      return img.url_list[0];
    return "";
  }

  _userOf(e) {
    const u = e && e.user && typeof e.user === "object" ? e.user : {};
    const uniqueId = u.uniqueId || e.uniqueId || "";
    const badges = [];
    let isMod = !!e.isModerator;
    const rawBadges = Array.isArray(u.badges)
      ? u.badges
      : Array.isArray(e.badges)
        ? e.badges
        : [];
    for (const b of rawBadges) {
      if (!b || typeof b !== "object") continue;
      // v2: badgeScene — 1 = أدمن/موديراتور، 4/7 = مشترك
      if (b.badgeScene === 1) {
        badges.push("moderator");
        isMod = true;
      } else if (b.badgeScene === 4 || b.badgeScene === 7) {
        badges.push("subscriber");
      } else if (typeof b.type === "string") {
        badges.push(b.type);
        if (b.type.includes("moderator")) isMod = true;
      }
    }
    const isSubscriber = !!(u.isSubscribe || e.isSubscriber);
    if (isSubscriber && !badges.includes("subscriber"))
      badges.push("subscriber");
    const isFollower = !!(u.isFollower || e.isFollower);
    if (isFollower && !badges.includes("follower")) badges.push("follower");
    return {
      user: uniqueId,
      uniqueId,
      nickname: u.nickname || e.nickname || "",
      userId: String(u.userId || u.idStr || e.userId || ""),
      avatar:
        this._imgUrl(u.profilePictureMedium) ||
        this._imgUrl(u.profilePicture) ||
        this._imgUrl(u.profilePictureLarge) ||
        this._imgUrl(u.avatarJpg) ||
        this._imgUrl(u.avatarThumb) ||
        (typeof u.profilePictureUrl === "string" ? u.profilePictureUrl : "") ||
        (typeof e.profilePictureUrl === "string" ? e.profilePictureUrl : ""),
      isFollower,
      isSubscriber,
      isModerator: isMod,
      badges,
    };
  }

  _setupListeners(options) {
    if (!this.client) return;

    this.client.on("chat", (msg) => {
      this.emit("chat", {
        ...this._userOf(msg),
        comment: msg.comment,
      });
    });

    this.client.on("gift", (gift) => {
      const u = this._userOf(gift);
      const gd =
        gift.giftDetails && typeof gift.giftDetails === "object"
          ? gift.giftDetails
          : {};
      const ext =
        gift.extendedGiftInfo && typeof gift.extendedGiftInfo === "object"
          ? gift.extendedGiftInfo
          : {};
      const giftId = gift.giftId ?? gd.id ?? ext.id;
      const streakKey = (u.userId || u.uniqueId) + "_" + giftId;
      const prevStreak = this.activeStreaks.get(streakKey) || 0;
      let count = gift.repeatCount || 1;
      // منطق تكيفي بيحسب الفرق: بيشتغل صح في الحالتين —
      //  • الهدايا المتتالية (ضغط مطوّل): repeatCount بيزيد تراكمياً → الفرق هو الجديد
      //  • الهدايا المنفصلة: repeatCount ثابت → كل حدث = هدية كاملة
      // من غير ما نعتمد على giftType لأن النسخة الجديدة ساعات بتبعته ناقص
      if (prevStreak > 0 && count > prevStreak) {
        count = count - prevStreak;
      }
      if (count > 0) {
        this.activeStreaks.set(streakKey, gift.repeatCount || count);
        this.emit("gift", {
          ...u,
          giftId: String(giftId ?? ""),
          giftName:
            gift.giftName || gd.giftName || ext.giftName || gd.describe || ext.describe || "",
          repeatCount: count,
          diamondCount: gift.diamondCount ?? gd.diamondCount ?? ext.diamondCount ?? 0,
          giftPictureUrl:
            this._imgUrl(gd.giftImage) ||
            this._imgUrl(gd.icon) ||
            this._imgUrl(ext.image) ||
            this._imgUrl(ext.icon) ||
            this._imgUrl(gift.giftPictureUrl),
        });
      }
      if (gift.repeatEnd) {
        this.activeStreaks.delete(streakKey);
      }
    });

    this.client.on("like", (like) => {
      this.emit("like", {
        ...this._userOf(like),
        likeCount: like.likeCount,
        totalLikeCount: like.totalLikeCount,
      });
    });

    this.client.on("follow", (follow) => {
      this.emit("follow", this._userOf(follow));
    });

    this.client.on("member", (member) => {
      this.emit("join", this._userOf(member));
    });

    this.client.on("share", (share) => {
      this.emit("share", this._userOf(share));
    });

    // v2 ما بتبعتش حدث "subscribe" مستقل — أي رسالة social من نوع اشتراك بنحولها هنا
    this.client.on("social", (soc) => {
      try {
        const dt = soc?.common?.displayText?.displayType || "";
        if (String(dt).includes("subscribe")) {
          this.emit("subscribe", this._userOf(soc));
        }
      } catch (e) {}
    });

    this.client.on("subscribe", (sub) => {
      this.emit("subscribe", this._userOf(sub));
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
          id: String(g.id ?? g.giftId ?? ""),
          name: g.name || g.giftName || g.describe || "",
          coins: g.diamond_count || g.diamondCount || g.coins || 0,
          img:
            this._imgUrl(g.giftImage) ||
            this._imgUrl(g.icon) ||
            this._imgUrl(g.image) ||
            this._imgUrl(g.previewImage) ||
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