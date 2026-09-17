// build-widget-preview.js — v4 (ELDALY ORIGINALS)
// ويدجتات تصنيف بتصميم خاص بنا بالكامل (مش منقول): نفس فكرة الترتيب
// لكن هوية وأشكال وأنيميشن وأسماء وصور مختلفة — حقوقنا.
// صفحة إعدادات: جريد مصغرات حية لكل الأشكال + حفظ/إغلاق/استعادة.
// الوضع الحي بيتصل بالأوفرلاي بتاعنا (stats.topLikers/topGifters).
const fs = require("fs");
const OUT = "D:/مشروع eldaly/eldaly_stream2 - Copy/eldaly_stream2 - Copy/eldaly_stream2 - Copy/eldaly-website/public/widget-preview.html";

// ============================================================
// الأشكال الـ 12 — أسماء وهوية إلدالي
// ============================================================
const LAYOUTS = [
  { id: "royal",   name: "ملكي" },     // ذهبي فخم — تاج + شرارات
  { id: "falcon",  name: "صقور" },     // زوايا حادة + جمرات
  { id: "cyber",   name: "سايبر" },    // إطارات HUD
  { id: "neon",    name: "نيون" },     // خطوط نيون رفيعة
  { id: "glass",   name: "زجاج" },     // زجاج مصنفر
  { id: "tiles",   name: "بلاطات" },   // كروت عمودية
  { id: "flow",    name: "انسياب" },   // صفوف ناعمة
  { id: "bars",    name: "شرائط" },    // شريط تقدم خلفي
  { id: "podium",  name: "منصة" },     // منصة top3
  { id: "compact", name: "ميني" },     // صفوف مضغوطة
  { id: "minimal", name: "بسيط" },     // نظيف جداً
  { id: "crown",   name: "تاج" },      // زخارف ملكية
];

// ============================================================
// CSS بتاعنا — مكتوب من الصفر بهوية إلدالي
// ============================================================
const OUR_CSS = `
/* ═══════════ ELDALY WIDGETS — تصميم خاص © ELDALY STREAM ═══════════ */
.ew, .ew * { box-sizing: border-box; margin: 0; padding: 0; }
.ew {
  font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
  direction: rtl; color: #ece9e1;
  padding: 14px 12px; width: 100%;
  --gold: #d4af37; --gold2: #f2dc93; --amber: #ffb84d;
  --teal: #2dd4bf; --red: #ff3b5c; --card: #12121a; --card2: #0c0c12;
  --silver: #c0c7d1; --bronze: #cd8f52;
}
.ew-list { display: flex; flex-direction: column; gap: 9px; max-width: 460px; margin-inline: auto; }

/* الصف الأساسي */
.ew-row {
  position: relative; display: flex; align-items: center; gap: 11px;
  padding: 9px 12px; border-radius: 13px;
  background: linear-gradient(135deg, #16121d, #0e0c14);
  border: 1px solid rgba(255,255,255,0.07);
  overflow: hidden; animation: ewIn .55s cubic-bezier(.34,1.4,.64,1) both;
}
.ew-row .ew-rank {
  flex: 0 0 34px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 15px; border-radius: 10px;
  background: #1d1d27; color: #8f8a9c; border: 1px solid rgba(255,255,255,0.08);
}
.ew-row.r1 .ew-rank { background: linear-gradient(160deg, #f2dc93, #c69c2d); color: #201803; border: none; box-shadow: 0 0 16px rgba(212,175,55,0.55); }
.ew-row.r2 .ew-rank { background: linear-gradient(160deg, #e8edf5, #97a3b5); color: #1a1d24; border: none; }
.ew-row.r3 .ew-rank { background: linear-gradient(160deg, #e8b98a, #b06f36); color: #241305; border: none; }
.ew-ava { position: relative; flex: 0 0 52px; width: 52px; height: 52px; }
.ew-ava img { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; display: block; }
.ew-row.r1 .ew-ava img { border: 2px solid var(--gold); box-shadow: 0 0 18px rgba(212,175,55,0.4); }
.ew-row.r2 .ew-ava img { border: 2px solid var(--silver); }
.ew-row.r3 .ew-ava img { border: 2px solid var(--bronze); }
.ew-mid { flex: 1; min-width: 0; }
.ew-name { font-size: 14.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ew-sub { font-size: 10.5px; color: #8f8a9c; font-weight: 700; letter-spacing: 1px; margin-top: 2px; }
.ew-val { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; font-weight: 900; font-size: 16px;
  font-variant-numeric: tabular-nums; direction: ltr; }
.ew-val .ic { font-size: 15px; }
.ew-bar { height: 5px; border-radius: 4px; background: rgba(255,255,255,0.07); margin-top: 6px; overflow: hidden; }
.ew-bar i { display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--gold), var(--amber)); box-shadow: 0 0 8px rgba(212,175,55,0.5); }

@keyframes ewIn { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes ewSpin { to { transform: rotate(360deg); } }
@keyframes ewFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes ewPulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes ewSpark { 0% { transform: translateY(0) scale(1); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-46px) scale(.2); opacity: 0; } }
@keyframes ewSheen { 0% { transform: translateX(-160%) skewX(-18deg); } 100% { transform: translateX(260%) skewX(-18deg); } }
@keyframes ewBeat { 0%,100% { transform: scale(1); } 12% { transform: scale(1.25); } 24% { transform: scale(1); } 36% { transform: scale(1.18); } 50% { transform: scale(1); } }

/* ═══ 1) ملكي royal — ذهبي فخم، إطار دوّار، سدس الأفاتار، شرارات ═══ */
.ew--royal .ew-row { border: none; }
.ew--royal .ew-row::before {
  content: ''; position: absolute; inset: -2px; border-radius: 15px; z-index: 0;
  background: conic-gradient(from 0deg, #d4af37, #8a6a1c, #f2dc93, #d4af37);
  animation: ewSpin 5s linear infinite;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; padding: 1.6px;
}
.ew--royal .ew-row > * { position: relative; z-index: 1; }
.ew--royal .ew-row { background: linear-gradient(140deg, #1a1408, #0d0a12 65%); }
.ew--royal .ew-row.r1 { background: linear-gradient(140deg, #241a06, #140a10 60%); }
.ew--royal .ew-ava { clip-path: none; }
.ew--royal .ew-ava img { border-radius: 16px 4px 16px 4px; }
.ew--royal .ew-row.r1 .ew-ava::after {
  content: '♛'; position: absolute; top: -13px; right: 50%; transform: translateX(50%);
  color: var(--gold); font-size: 17px; text-shadow: 0 0 10px rgba(212,175,55,0.8);
  animation: ewFloat 2.6s ease-in-out infinite;
}
.ew--royal .ew-row::after {
  content: ''; position: absolute; top: 0; bottom: 0; width: 46px; z-index: 2; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(242,220,147,0.14), transparent);
  animation: ewSheen 3.6s ease-in-out infinite;
}
.ew--royal .ew-spark { position: absolute; bottom: 6px; width: 3px; height: 3px; border-radius: 50%;
  background: var(--gold2); box-shadow: 0 0 6px var(--gold); z-index: 2;
  animation: ewSpark 2.8s ease-in infinite; }
.ew--royal .ew-spark.s1 { right: 18%; animation-delay: 0s; }
.ew--royal .ew-spark.s2 { right: 46%; animation-delay: .9s; }
.ew--royal .ew-spark.s3 { right: 74%; animation-delay: 1.7s; }

/* ═══ 2) صقور falcon — زوايا حادة + جمرات برتقالية ═══ */
.ew--falcon .ew-row {
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
  border: none; border-right: 3px solid #3a2a12;
  background: linear-gradient(120deg, #171009, #0e0b10 70%);
}
.ew--falcon .ew-row.r1 { border-right-color: var(--amber); background: linear-gradient(120deg, #241505, #120a10 70%); }
.ew--falcon .ew-row.r2 { border-right-color: #58a6c8; }
.ew--falcon .ew-row.r3 { border-right-color: #c87a3a; }
.ew--falcon .ew-row.r1::after {
  content: ''; position: absolute; bottom: -8px; right: 8%; left: 8%; height: 14px; border-radius: 50%;
  background: radial-gradient(50% 100% at 50% 100%, rgba(255,120,40,0.5), transparent 75%);
  filter: blur(5px); animation: ewPulse 1.8s ease-in-out infinite;
}
.ew--falcon .ew-ava img { border-radius: 4px; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%); }
.ew--falcon .ew-name { letter-spacing: .4px; }

/* ═══ 3) سايبر cyber — إطارات HUD وزوايا تقنية ═══ */
.ew--cyber .ew-row {
  background: linear-gradient(90deg, rgba(10,14,20,0.9), rgba(8,10,16,0.7));
  border: 1px solid rgba(45,212,191,0.25); border-radius: 4px;
}
.ew--cyber .ew-row::before, .ew--cyber .ew-row::after {
  content: ''; position: absolute; width: 14px; height: 14px; border: 2px solid var(--teal); z-index: 2;
}
.ew--cyber .ew-row::before { top: -1px; right: -1px; border-left: none; border-bottom: none; }
.ew--cyber .ew-row::after { bottom: -1px; left: -1px; border-right: none; border-top: none; }
.ew--cyber .ew-row.r1::before, .ew--cyber .ew-row.r1::after { border-color: var(--gold); }
.ew--cyber .ew-row.r2::before, .ew--cyber .ew-row.r2::after { border-color: #58a6ff; }
.ew--cyber .ew-ava img { border-radius: 3px; }
.ew--cyber .ew-name { color: #d8fefa; letter-spacing: .5px; }
.ew--cyber .ew-val { color: #fff; text-shadow: 0 0 10px rgba(45,212,191,0.6); }
.ew--cyber .ew-row.r1 .ew-val { text-shadow: 0 0 12px rgba(212,175,55,0.8); }

/* ═══ 4) نيون neon — خطوط نيون رفيعة ═══ */
.ew--neon .ew-row { background: rgba(8,10,18,0.6); border: 1.5px solid transparent; border-radius: 22px; }
.ew--neon .ew-row.r1 { border-color: rgba(255,184,77,0.75); box-shadow: 0 0 18px rgba(255,184,77,0.25), inset 0 0 14px rgba(255,184,77,0.06); }
.ew--neon .ew-row.r2 { border-color: rgba(88,166,255,0.55); box-shadow: 0 0 14px rgba(88,166,255,0.18); }
.ew--neon .ew-row.r3 { border-color: rgba(255,59,92,0.55); box-shadow: 0 0 14px rgba(255,59,92,0.18); }
.ew--neon .ew-row.r4, .ew--neon .ew-row.r5 { border-color: rgba(255,255,255,0.14); }
.ew--neon .ew-ava img { border-radius: 50%; }
.ew--neon .ew-name { text-shadow: 0 0 9px rgba(255,255,255,0.25); }
.ew--neon .ew-val { text-shadow: 0 0 10px currentColor; }

/* ═══ 5) زجاج glass — زجاج مصنفر ═══ */
.ew--glass .ew-row {
  background: rgba(255,255,255,0.055); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.13); border-radius: 16px;
  box-shadow: inset 0 1px rgba(255,255,255,0.09);
}
.ew--glass .ew-row.r1 { border-color: rgba(212,175,55,0.55); background: rgba(212,175,55,0.09); }
.ew--glass .ew-ava img { border-radius: 50%; }

/* ═══ 6) بلاطات tiles — كروت عمودية مصغرة ═══ */
.ew--tiles .ew-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.ew--tiles .ew-row { flex-direction: column; text-align: center; padding: 13px 6px 11px; gap: 7px; border-radius: 15px; }
.ew--tiles .ew-row .ew-rank { position: absolute; top: 7px; right: 7px; width: 24px; height: 24px; font-size: 12px; border-radius: 8px; }
.ew--tiles .ew-ava { width: 46px; height: 46px; flex: 0 0 46px; }
.ew--tiles .ew-name { font-size: 11.5px; max-width: 100%; }
.ew--tiles .ew-val { font-size: 13px; }
.ew--tiles .ew-row.r1 { border-color: rgba(212,175,55,0.6); box-shadow: 0 0 26px rgba(212,175,55,0.18); }

/* ═══ 7) انسياب flow — صفوف ناعمة بدرجات ═══ */
.ew--flow .ew-row { border-radius: 18px; border: none; background: #14141c; }
.ew--flow .ew-row.r1 { background: linear-gradient(90deg, rgba(212,175,55,0.16), #14141c 55%); }
.ew--flow .ew-row.r2 { background: linear-gradient(90deg, rgba(148,163,184,0.13), #14141c 55%); }
.ew--flow .ew-row.r3 { background: linear-gradient(90deg, rgba(205,143,82,0.13), #14141c 55%); }
.ew--flow .ew-rank { border-radius: 50%; }
.ew--flow .ew-ava img { border-radius: 50%; }

/* ═══ 8) شرائط bars — شريط تقدم هو خلفية الصف ═══ */
.ew--bars .ew-row { padding: 9px 12px; }
.ew--bars .ew-fill {
  position: absolute; inset: 0; z-index: 0; border-radius: 13px;
  background: linear-gradient(90deg, rgba(212,175,55,0.22), rgba(212,175,55,0.03) 75%);
  border-right: 2.5px solid var(--gold);
  transition: width .8s cubic-bezier(.22,1,.36,1);
}
.ew--bars .ew-row > * { position: relative; z-index: 1; }

/* ═══ 9) منصة podium — منصة للمركز الأول ═══ */
.ew--podium .ew-pod-zone { display: flex; align-items: flex-end; justify-content: center; gap: 12px; margin-bottom: 12px; }
.ew--podium .ew-pod { flex: 1; max-width: 128px; text-align: center; animation: ewIn .6s both; }
.ew--podium .ew-pod .ew-ava { width: 58px; height: 58px; margin: 0 auto 8px; }
.ew--podium .ew-pod.p1 .ew-ava { width: 74px; height: 74px; }
.ew--podium .ew-pod img { border-radius: 50%; width: 100%; height: 100%; object-fit: cover; }
.ew--podium .ew-pod.p1 img { border: 3px solid var(--gold); box-shadow: 0 0 26px rgba(212,175,55,0.55); }
.ew--podium .ew-pod.p2 img { border: 2.5px solid var(--silver); }
.ew--podium .ew-pod.p3 img { border: 2.5px solid var(--bronze); }
.ew--podium .ew-pod .ew-name { font-size: 12.5px; }
.ew--podium .ew-pod .ew-val { justify-content: center; font-size: 14px; color: var(--gold2); }
.ew--podium .ew-pod .ew-step { margin-top: 7px; border-radius: 9px 9px 0 0; display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 19px; }
.ew--podium .ew-pod.p1 .ew-step { height: 64px; background: linear-gradient(180deg, #f2dc93, #a17c1e); color: #201803;
  box-shadow: 0 -6px 30px rgba(212,175,55,0.3); }
.ew--podium .ew-pod.p2 .ew-step { height: 44px; background: linear-gradient(180deg, #dfe6f0, #7c8798); color: #171a20; }
.ew--podium .ew-pod.p3 .ew-step { height: 30px; background: linear-gradient(180deg, #e8b98a, #96622e); color: #241305; }
.ew--podium .ew-pod.p1 { margin-bottom: 0; }
.ew--podium .ew-rest .ew-row { margin-bottom: 7px; }
.ew--podium .ew-rest .ew-row:last-child { margin-bottom: 0; }

/* ═══ 10) ميني compact — صفوف مضغوطة ═══ */
.ew--compact .ew-list { gap: 6px; }
.ew--compact .ew-row { padding: 6px 10px; gap: 9px; border-radius: 10px; }
.ew--compact .ew-ava { width: 38px; height: 38px; flex-basis: 38px; }
.ew--compact .ew-name { font-size: 12.5px; }
.ew--compact .ew-val { font-size: 13.5px; }
.ew--compact .ew-rank { flex-basis: 26px; width: 26px; height: 26px; font-size: 12px; border-radius: 8px; }

/* ═══ 11) بسيط minimal — نظيف جداً ═══ */
.ew--minimal .ew-row { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.06); border-radius: 0; padding: 10px 4px; }
.ew--minimal .ew-row:last-child { border-bottom: none; }
.ew--minimal .ew-rank { background: transparent; border: none; color: #6d6960; font-size: 13px; }
.ew--minimal .ew-row.r1 .ew-rank { background: transparent; color: var(--gold); box-shadow: none; }
.ew--minimal .ew-ava img { border-radius: 50%; border: none !important; box-shadow: none !important; }
.ew--minimal .ew-name { font-weight: 700; }

/* ═══ 12) تاج crown — زخارف ملكية على الطرف ═══ */
.ew--crown .ew-row { border-color: rgba(212,175,55,0.2); }
.ew--crown .ew-row::before {
  content: ''; position: absolute; top: 0; bottom: 0; right: 0; width: 5px; z-index: 2;
  background: linear-gradient(180deg, var(--gold), transparent);
  opacity: .8;
}
.ew--crown .ew-row.r2::before { background: linear-gradient(180deg, var(--silver), transparent); }
.ew--crown .ew-row.r3::before { background: linear-gradient(180deg, var(--bronze), transparent); }
.ew--crown .ew-row.r1 .ew-name::after { content: '♛'; margin-right: 6px; color: var(--gold); font-size: 13px; }
.ew--crown .ew-ava img { border-radius: 12px; }
`;

// ============================================================
// بانيات العناصر — ماركبنا الخاص (ew-*)
// ============================================================
const BUILDERS_JS_SRC = `
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n || 0).toLocaleString("en-US");
// صور تجريبية مختلفة — ستايل رسمي من DiceBear (ليست صور الأصل)
function ava(name) {
  const seed = encodeURIComponent(name || "ELDALY");
  return "https://api.dicebear.com/9.x/adventurer/svg?seed=" + seed + "&backgroundColor=1c1526,232327";
}
function rowBase(rank, cls) { return '<div class="ew-row r' + rank + (cls ? " " + cls : "") + '">'; }
function rankBox(rank) { return '<div class="ew-rank">' + rank + '</div>'; }
function avaBox(rank, name) {
  return '<div class="ew-ava"><img loading="lazy" src="' + ava(name) + '" alt="' + esc(name) + '"></div>';
}
function midBox(rank, name, value, maxVal, iconLabel) {
  const pct = Math.max(6, Math.min(100, Math.round((value / Math.max(1, maxVal)) * 100)));
  const lvl = rank === 1 ? 10 : rank === 2 ? 8 : rank === 3 ? 6 : rank === 4 ? 4 : 2;
  return '<div class="ew-mid"><div class="ew-name">' + esc(name) + '</div>'
    + '<div class="ew-sub">' + iconLabel + ' • LVL ' + lvl + '</div>'
    + '<div class="ew-bar"><i style="width:' + pct + '%"></i></div></div>';
}
function valBox(value, icon) { return '<div class="ew-val"><span class="ic">' + icon + '</span>' + fmt(value) + '</div>'; }
function sparks() {
  return '<span class="ew-spark s1"></span><span class="ew-spark s2"></span><span class="ew-spark s3"></span>';
}

// الباني لكل شكل (rank/name/value/icon/maxVal) — يعيد HTML صفوف جاهزة للف داخل القائمة
const ROW_BUILDERS = {
  royal(rank, name, value, icon, max, label) {
    return rowBase(rank) + sparks() + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  falcon(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  cyber(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  neon(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  glass(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  flow(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  compact(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + '<div class="ew-mid"><div class="ew-name">' + esc(name) + '</div>'
      + '<div class="ew-sub">' + label + '</div></div>' + valBox(value, icon) + '</div>';
  },
  minimal(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + '<div class="ew-mid"><div class="ew-name">' + esc(name) + '</div></div>'
      + valBox(value, icon) + '</div>';
  },
  crown(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
  tiles(rank, name, value, icon, max, label) {
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + '<div class="ew-name">' + esc(name) + '</div>' + valBox(value, icon) + '</div>';
  },
  bars(rank, name, value, icon, max, label) {
    const pct = Math.max(6, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
    return rowBase(rank) + '<div class="ew-fill" style="width:' + pct + '%"></div>'
      + rankBox(rank) + avaBox(rank, name)
      + '<div class="ew-mid"><div class="ew-name">' + esc(name) + '</div>'
      + '<div class="ew-sub">' + label + '</div></div>' + valBox(value, icon) + '</div>';
  },
  podium(rank, name, value, icon, max, label) {
    // المنصة بتتبني كتلة خاصة في renderLive — ده fallback لو اتطلب منفرد
    return rowBase(rank) + rankBox(rank) + avaBox(rank, name)
      + midBox(rank, name, value, max, label) + valBox(value, icon) + '</div>';
  },
};

function buildList(layout, entries, icon, label) {
  const top = entries.slice(0, 5);
  const maxVal = top.length ? top[0].count : 1;
  const mk = (e, i) => ROW_BUILDERS[layout](i + 1, e.user || e.nickname || "User", e.count, icon, maxVal, label);
  if (layout === "podium" && top.length >= 3) {
    const pod = (e, r) =>
      '<div class="ew-pod p' + r + '"><div class="ew-ava"><img src="' + ava(e.user || "User") + '"></div>'
      + '<div class="ew-name">' + esc(e.user || "User") + '</div>'
      + '<div class="ew-val">' + icon + ' ' + fmt(e.count) + '</div>'
      + '<div class="ew-step">' + r + '</div></div>';
    const rest = top.slice(3).map((e, i) => ROW_BUILDERS[layout](i + 4, e.user || "User", e.count, icon, maxVal, label)).join("");
    return '<div class="ew-pod-zone">'
      + (top[1] ? pod(top[1], 2) : "") + (top[0] ? pod(top[0], 1) : "") + (top[2] ? pod(top[2], 3) : "")
      + '</div><div class="ew-rest">' + rest + '</div>';
  }
  return '<div class="ew-list">' + top.map((e, i) => mk(e, i)).join("") + '</div>';
}
`;

// ============================================================
// الوثيقة الداخلية — iframe 456px
// ============================================================
function innerDoc(layout, type, token) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: 'Cairo', sans-serif; }
</style>
<style>${window.__W_CSS}</style>
</head>
<body>
<div class="ew ew--${layout}" id="host"></div>
<script>
const TYPE = ${JSON.stringify(type)};
const TOKEN = ${JSON.stringify(token || "")};
const LAYOUT = ${JSON.stringify(layout)};
${window.__W_BUILDERS}
const host = document.getElementById("host");
function renderDemo(){
  const demoTop = [
    { user: "ELDALY KING", count: 24800 }, { user: "نور الهدى", count: 18350 },
    { user: "محمد علي", count: 12150 }, { user: "Hassan Pro", count: 8700 },
    { user: "سارة أحمد", count: 6050 },
  ];
  host.innerHTML = buildList(LAYOUT, demoTop, TYPE === "likers" ? "❤️" : "🪙", TYPE === "likers" ? "لايكات" : "كوينز");
}
function renderLive(arr){
  if (!arr || !arr.length) { renderDemo(); return; }
  host.innerHTML = buildList(LAYOUT, arr, TYPE === "likers" ? "❤️" : "🪙", TYPE === "likers" ? "لايكات" : "كوينز");
}
if (TOKEN) {
  let ws = null, ping = null;
  const connect = () => {
    try { ws = new WebSocket("wss://overlay.eldalystream.com/overlay-ws?t=" + encodeURIComponent(TOKEN) + "&v=7"); } catch(e){ return; }
    ws.onopen = () => { ping = setInterval(() => { try { ws.send(JSON.stringify({type:"ping"})); } catch(e){} }, 20000); };
    ws.onmessage = ev => {
      try {
        const m = JSON.parse(ev.data);
        if (m.type === "stats" && m.stats) {
          renderLive(TYPE === "likers" ? (m.stats.topLikers || []) : (m.stats.topGifters || []));
        }
      } catch(e){}
    };
    ws.onclose = () => { clearInterval(ping); setTimeout(connect, 2500); };
    ws.onerror = () => { try { ws.close(); } catch(e){} };
  };
  connect();
}
renderDemo();
<\/script>
</body>
</html>`;
}

// ============================================================
// الصفحة الخارجية
// ============================================================
const outer = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>ELDALY STREAM — ويدجتات التصنيف</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background:
      radial-gradient(900px 500px at 12% -6%, rgba(255,166,60,0.10), transparent 60%),
      radial-gradient(900px 500px at 88% -6%, rgba(212,120,40,0.08), transparent 60%),
      #050508; min-height: 100vh; }
  #bar { position: sticky; top: 0; z-index: 99;
    background: rgba(10,10,14,0.94); border-bottom: 1px solid rgba(212,175,55,0.4);
    padding: 10px 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    direction: rtl; font-size: 13px; color: #ece9e1; }
  #bar select, #bar input, #bar button { background: #15151d; color: #ece9e1; border: 1px solid #33333f;
    border-radius: 7px; padding: 6px 10px; font-family: 'Cairo'; font-size: 12.5px; }
  #bar button { cursor: pointer; transition: all .15s; }
  #bar button:hover { border-color: rgba(212,175,55,0.6); color: #ecd28a; }
  #bar .ttl { font-weight: 900; color: #ecd28a; letter-spacing: 1px; }
  #bar .st { font-size: 11.5px; padding: 4px 9px; border-radius: 100px; background: rgba(255,255,255,0.06); }
  #bar .st.live { background: rgba(46,204,113,0.16); color: #7bedaa; }
  #bar .st.demo { background: rgba(52,152,219,0.16); color: #8ec9f5; }
  #stage { padding: 22px 10px 40px; display: flex; justify-content: center; align-items: flex-start; }
  #frame { width: 456px; height: 560px; border: 1px solid rgba(212,175,55,0.35); border-radius: 10px; background: transparent; }
  #hint { text-align: center; color: #6d6960; font-size: 12px; margin-top: 10px; line-height: 1.9; direction: rtl; }
  #hint code { color: #ecd28a; background: rgba(212,175,55,0.08); padding: 2px 7px; border-radius: 5px; direction: ltr; display: inline-block; }

  /* ===== مودال الإعدادات ===== */
  #modal-back { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.72);
    backdrop-filter: blur(3px); display: none; align-items: flex-start; justify-content: center; padding: 4vh 14px; overflow-y: auto; }
  #modal-back.open { display: flex; }
  #modal { width: 800px; max-width: 96vw; background: #131318; border: 1px solid rgba(212,175,55,0.25);
    border-radius: 18px; box-shadow: 0 30px 90px rgba(0,0,0,0.8); overflow: hidden; }
  .m-head { display: flex; align-items: center; justify-content: space-between;
    padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0;
    background: #131318; z-index: 5; }
  .m-head h2 { font-size: 18px; font-weight: 900; color: #ece9e1; }
  .m-close { width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04); color: #a6a198; font-size: 15px; cursor: pointer; }
  .m-close:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
  .m-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 20px 22px; }
  .m-card { position: relative; background: #0d0d12; border: 2px solid rgba(255,255,255,0.08);
    border-radius: 14px; cursor: pointer; transition: border-color .18s, transform .18s; overflow: hidden; }
  .m-card:hover { transform: translateY(-3px); border-color: rgba(212,175,55,0.5); }
  .m-card.sel { border-color: #d4af37; box-shadow: 0 0 0 3px rgba(212,175,55,0.15), 0 14px 40px rgba(0,0,0,0.6); }
  .m-thumb { height: 150px; background: #070709; position: relative; overflow: hidden;
    display: flex; align-items: flex-start; justify-content: center; }
  .m-thumb .scale-wrap { transform: scale(0.52); transform-origin: top center; width: 456px; pointer-events: none; }
  .m-radio { position: absolute; top: 10px; right: 10px; width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35); background: rgba(0,0,0,0.4); z-index: 3; display: flex;
    align-items: center; justify-content: center; }
  .m-card.sel .m-radio { border-color: #d4af37; }
  .m-card.sel .m-radio::after { content: ''; width: 11px; height: 11px; border-radius: 50%; background: #d4af37; }
  .m-new { position: absolute; top: 10px; left: 10px; z-index: 3; background: linear-gradient(135deg, #d4af37, #a17c1e);
    color: #201803; font-size: 10.5px; font-weight: 900; padding: 3px 11px; border-radius: 100px; }
  .m-name { text-align: center; font-size: 14px; font-weight: 800; color: #ece9e1;
    padding: 11px 8px; border-top: 1px solid rgba(255,255,255,0.06); background: #101016; }
  .m-foot { display: flex; gap: 12px; padding: 16px 22px 20px; border-top: 1px solid rgba(255,255,255,0.06);
    align-items: center; direction: rtl; }
  .m-btn { border: none; border-radius: 11px; padding: 12px 26px; font-family: 'Cairo';
    font-size: 14px; font-weight: 800; cursor: pointer; transition: all .15s; }
  .m-btn.save { background: linear-gradient(180deg, #f0d078, #c69c2d); color: #201803; margin-right: auto;
    box-shadow: 0 8px 26px rgba(212,175,55,0.35); }
  .m-btn.save:hover { filter: brightness(1.08); }
  .m-btn.ghost { background: #1a1a22; color: #a6a198; border: 1px solid rgba(255,255,255,0.08); }
  .m-btn.ghost:hover { color: #ece9e1; border-color: rgba(255,255,255,0.25); }
  @media (max-width: 700px) { .m-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div id="bar">
  <span class="ttl">🦁 ELDALY</span>
  <button id="b-layouts">🎨 الشكل: <b id="cur-layout-name">ملكي</b></button>
  <select id="f-type">
    <option value="likers">❤️ تصنيف اللايكات</option>
    <option value="supporters">🪙 تصنيف الكوينز</option>
  </select>
  <input id="f-token" placeholder="Overlay Token (اختياري — بيانات حية)" size="28" spellcheck="false">
  <span id="f-status" class="st demo">DEMO</span>
</div>
<div id="stage"><iframe id="frame" title="widget"></iframe></div>
<div id="hint">
  وضع OBS: ضيف Browser Source بمقاس <code>456 × 560</code> على اللينك:<br>
  <code id="obs-link">widget-preview.html?obs=1&amp;layout=royal&amp;type=likers&amp;t=TOKEN</code>
</div>

<div id="modal-back">
  <div id="modal">
    <div class="m-head">
      <button class="m-close" id="m-close-btn">✕</button>
      <h2 id="m-title">إعدادات التصنيف</h2>
    </div>
    <div class="m-grid" id="m-grid"></div>
    <div class="m-foot">
      <button class="m-btn ghost" id="m-cancel">إغلاق</button>
      <button class="m-btn ghost" id="m-reset">↺ استعادة الافتراضي</button>
      <button class="m-btn save" id="m-save">💾 حفظ</button>
    </div>
  </div>
</div>

<script>
(function(){
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const LAYOUTS = ${JSON.stringify(LAYOUTS)};
  const NEW_LAYOUTS = ["royal", "podium", "bars", "crown", "glass"];
  const DEFAULT_LAYOUT = "royal";
  const storeKey = t => "eldaly_widget_layout_" + t;

  const state = {
    layout: params.get("layout") || localStorage.getItem(storeKey(params.get("type") || "likers")) || DEFAULT_LAYOUT,
    type: params.get("type") || "likers",
    token: params.get("t") || localStorage.getItem("eldaly_overlay_token") || "",
    obs: params.get("obs") === "1",
  };

  const layoutNameEl = $("cur-layout-name"), typeSel = $("f-type"), tokenInp = $("f-token");
  typeSel.value = state.type; tokenInp.value = state.token;
  const layoutName = id => { const l = LAYOUTS.find(x => x.id === id); return l ? l.name : id; };

  function updateStatus() {
    const st = $("f-status");
    st.textContent = state.token ? "LIVE" : "DEMO";
    st.className = "st " + (state.token ? "live" : "demo");
    layoutNameEl.textContent = layoutName(state.layout);
    $("obs-link").textContent = location.origin + location.pathname + "?obs=1&layout=" + state.layout + "&type=" + state.type + (state.token ? "&t=" + state.token : "");
  }
  function render() {
    if (state.obs) { document.body.innerHTML = ""; document.body.style.background = "transparent"; }
    $("frame").srcdoc = window.__innerDoc(state.layout, state.type, state.token);
    localStorage.setItem("eldaly_overlay_token", state.token);
    localStorage.setItem(storeKey(state.type), state.layout);
    updateStatus();
  }

  // ===== مودال الأشكال — مصغرات حية بنفس البانيات =====
  let pick = null;
  function openModal() {
    pick = state.layout;
    $("m-title").innerHTML = state.type === "likers"
      ? '<span style="color:#ff3b5c">❤️</span> إعدادات تصنيف اللايكات'
      : '<span style="color:#ffc93c">🪙</span> إعدادات تصنيف الكوينز';
    const grid = $("m-grid");
    grid.innerHTML = "";
    for (const l of LAYOUTS) {
      const card = document.createElement("div");
      card.className = "m-card" + (l.id === pick ? " sel" : "");
      card.dataset.id = l.id;
      card.innerHTML =
        '<div class="m-radio"></div>' + (NEW_LAYOUTS.includes(l.id) ? '<span class="m-new">جديد</span>' : '') +
        '<div class="m-thumb"><iframe class="thumb-frame" data-layout="' + l.id + '" style="width:456px;height:300px;border:0;transform:scale(0.52);transform-origin:top right;position:absolute;top:0;right:0;pointer-events:none"></iframe></div>' +
        '<div class="m-name">' + l.name + '</div>';
      card.onclick = () => {
        pick = l.id;
        grid.querySelectorAll(".m-card").forEach(c => c.classList.toggle("sel", c.dataset.id === pick));
      };
      grid.appendChild(card);
    }
    $("modal-back").classList.add("open");
    // حقن المصغرات بعد فتح المودال
    grid.querySelectorAll("iframe.thumb-frame").forEach(fr => {
      fr.srcdoc = window.__innerDoc(fr.dataset.layout, state.type, "");
    });
  }
  function closeModal() { $("modal-back").classList.remove("open"); }

  $("b-layouts").onclick = openModal;
  $("m-close-btn").onclick = closeModal;
  $("m-cancel").onclick = closeModal;
  $("modal-back").onclick = e => { if (e.target.id === "modal-back") closeModal(); };
  $("m-save").onclick = () => { state.layout = pick; closeModal(); render(); };
  $("m-reset").onclick = () => { pick = DEFAULT_LAYOUT; state.layout = DEFAULT_LAYOUT; closeModal(); render(); };

  typeSel.onchange = () => {
    state.type = typeSel.value;
    state.layout = params.get("layout") || localStorage.getItem(storeKey(state.type)) || DEFAULT_LAYOUT;
    render();
  };
  tokenInp.onchange = () => { state.token = tokenInp.value.trim(); render(); };

  window.__W_CSS = ${JSON.stringify(OUR_CSS)};
  window.__W_BUILDERS = ${JSON.stringify(BUILDERS_JS_SRC)};
  // دالة بناء مستقلة للمصغرات — بنفس منطق الوثيقة الداخلية
  window.__BUILD_LIST = function buildListInto(hostEl, layout, type) {
    ${BUILDERS_JS_SRC}
    const demoTop = [
      { user: "ELDALY KING", count: 24800 }, { user: "نور الهدى", count: 18350 },
      { user: "محمد علي", count: 12150 }, { user: "Hassan Pro", count: 8700 },
      { user: "سارة أحمد", count: 6050 },
    ];
    hostEl.className = "ew ew--" + layout;
    hostEl.innerHTML = buildList(layout, demoTop, type === "likers" ? "❤️" : "🪙", type === "likers" ? "لايكات" : "كوينز");
  };
  window.__innerDoc = ${innerDoc.toString()};
  render();
})();
</script>
</body>
</html>`;

fs.writeFileSync(OUT, outer);
console.log("written:", OUT, Math.round(outer.length / 1024) + "KB");
