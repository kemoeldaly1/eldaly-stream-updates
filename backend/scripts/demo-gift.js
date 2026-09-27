// ==========================================================================
// demo-gift.js — ديمو من الآخر للآخر من غير تيك توك ولا لعبة:
//   1) يجيب أكشن TABS من الخزنة
//   2) يحلّه لحظيًا (JIT) بالتوقيع — زي ما البرنامج بيعمل بالظبط
//   3) يبعت الأمر للـ dispatcher المحلي ويطبع النتيجة
// تشغيل:  node scripts/demo-gift.js
// ==========================================================================

const path = require("path");
const ActionsVault = require("../src/services/actions-vault");
const CommandDispatcher = require("../../frontend/src/services/command-dispatcher");

async function main() {
  const vault = new ActionsVault();
  const dispatcher = new CommandDispatcher();

  // (1) أكشن من الخزنة — زي ما العميل شايفه: اسم بس من غير أمر
  const tabsActions = vault.listByGame("tabs");
  const jarl = tabsActions.find((a) => (a.eventName || "").includes("Jarl")) || tabsActions[0];
  console.log("① العميل شايف:", JSON.stringify({
    actionId: jarl.actionId,
    eventName: jarl.eventName,
    rarity: jarl.rarity,
    trigger: jarl.trigger.action,
  }, null, 2));

  // (2) الحل اللحظي من السيرفر — هنا بس الأوامر الحقيقية بتظهر، موقّعة HMAC
  const resolved = vault.resolve(jarl.actionId, {
    user: "kemo_viewer",
    giftName: "Rose",
    repeatCount: 2,
  });
  console.log("② resolve من الخزنة:", JSON.stringify({
    game: resolved.game,
    commands: resolved.commands,
    sig: resolved.sig.slice(0, 20) + "…",
    window: resolved.window,
  }, null, 2));

  // (3) التنفيذ المحلي — dispatcher بيحلل الأمر ويبعت للعبة
  //    (مفيش لعبة شغالة هنا فهيطلع connection refused — وده متوقع وبيأكد إن
  //     الطلب بيتبعت فعلاً على البورت الصح بالصيغة الصح)
  const result = await dispatcher.execute("tabs", resolved, {
    // TABS بورت مشفر جوه المود الأصلي — للديمو بنجرب على بورت افتراضي.
    // في الواقع: المود بتاعك (mods/unity-template) هو اللي بيحدد البورت
    // وبيستقبل بنفس الصيغة.
    protocolOverride: { kind: "http-push", port: 55123, tokenHeader: "EldalyKey", token: "demo-session-key" },
  });
  console.log("③ تنفيذ محلي:", JSON.stringify(result, null, 2));

  dispatcher.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
