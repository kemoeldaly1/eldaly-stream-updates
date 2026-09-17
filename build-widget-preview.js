// build-widget-preview.js — v2: المعاينة جوه iframe 456px زي تيك أليرت بالظبط
// عشان الـ media queries تتصرف مطابق. الوضع الحي بيتصل بالأوفرلاي بتاعنا.
const fs = require("fs");
const HOME = "C:/Users/kemo";
const OUT = "D:/مشروع eldaly/eldaly_stream2 - Copy/eldaly_stream2 - Copy/eldaly_stream2 - Copy/eldaly-website/public/widget-preview.html";

const LAYOUTS = ["legendary","modern","classic","cyber","m4","cards","compact","minimal","taif","farashat","neon2","reference"];

let css = fs.readFileSync(HOME + "/widget-all-clean.css", "utf8");

function minify(html) {
  return html
    .replace(/<!---->/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/ _ngcontent-ng-c\d+=""/g, "")
    .replace(/\n\s*/g, "")
    .trim();
}
const demo = {};
for (const lay of LAYOUTS) {
  demo[lay] = {
    likers: minify(fs.readFileSync(HOME + "/widget-study-" + lay + ".html", "utf8")),
    supporters: minify(fs.readFileSync(HOME + "/widget-sup-" + lay + ".html", "utf8")),
  };
}

const BUILDERS_JS = `
const MEDALS = ["🥇","🥈","🥉"];
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n||0).toLocaleString("en-US");
const TIER_BY_RANK = r => r===1?"tier-mythic":r===2?"tier-legendary":r===3?"tier-epic":r===4?"tier-rare":"tier-uncommon";
function fallbackAvatar(name) {
  return "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><circle cx="75" cy="75" r="75" fill="#1c1526"/><text x="75" y="97" font-size="56" text-anchor="middle" fill="#d4af37" font-family="Arial">' + esc((name||"?").trim()[0] || "?") + '</text></svg>');
}
function tplLiker(rank, name, value, icon) {
  const medal = MEDALS[rank-1];
  const badge = medal ? '<span class="rank-icon ' + ["gold","silver","bronze"][rank-1] + '">' + medal + '</span>' : '';
  return '<div class="liker-item top-' + rank + '">'
    + '<div class="rank-badge">' + badge + '</div>'
    + '<div class="avatar-wrapper"><img loading="lazy" class="avatar" src="' + fallbackAvatar(name) + '" alt="' + esc(name) + '"></div>'
    + '<div class="liker-info"><span class="liker-name"> ' + esc(name) + ' </span>'
    + '<span class="inline-amount"><span class="amount-value">' + fmt(value) + '</span><span class="heart-icon">' + icon + '</span></span></div></div>';
}
function tplLegendary(rank, name, value, icon, maxVal) {
  const tier = TIER_BY_RANK(rank);
  const top3 = rank <= 3;
  const mythic = rank === 1;
  const crown = mythic ? '<div class="leg-crown"><svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg></div>' : "";
  const fire = mythic ? '<div class="leg-fire-ring"></div>' : "";
  const particles = top3 ? '<div class="leg-particles">' + [1,2,3,4,5,6].map(i => '<span class="p p' + i + '"></span>').join("") + '</div>' : "";
  const pct = Math.max(8, Math.min(100, Math.round((value / Math.max(1, maxVal)) * 100)));
  const lvl = rank === 1 ? 10 : rank === 2 ? 8 : rank === 3 ? 6 : rank === 4 ? 4 : 2;
  const main = icon === "❤️"
    ? '<span class="leg-big-heart">❤️</span><span class="leg-likes-value">' + fmt(value) + '</span>'
    : '<span class="leg-likes-value">🪙 ' + fmt(value) + '</span>';
  return '<div class="leg-card ' + tier + '" data-rank="' + rank + '" style="animation-delay:' + ((rank-1)*0.1) + 's">'
    + '<div class="leg-foil"></div>' + particles + fire + crown
    + '<div class="leg-tier-badge"><span class="leg-rank-num">' + rank + '</span></div>'
    + '<div class="leg-avatar-wrap"><div class="leg-avatar-glow"></div><div class="leg-avatar-ring"></div><img loading="lazy" class="leg-avatar" src="' + fallbackAvatar(name) + '" alt="' + esc(name) + '"></div>'
    + '<div class="leg-info"><div class="leg-name"> ' + esc(name) + ' </div>'
    + '<div class="leg-power-bar" data-pct="' + pct + '"><div class="leg-power-track"></div><div class="leg-power-fill" style="width:' + pct + '%"></div><div class="leg-power-segments"></div><span class="leg-power-label">LVL ' + lvl + '</span></div></div>'
    + '<div class="leg-likes"><div class="leg-likes-main">' + main + '</div><div class="leg-likes-label"><span>' + (icon === "❤️" ? "LIKES" : "COINS") + '</span></div></div></div>';
}
function tplCyber(rank, name, value, icon) {
  const theme = ((rank - 1) % 5) + 1;
  const crown = rank === 1 ? '<span class="crown">👑</span>' : "";
  return '<div class="cyber-blade-row active theme-' + theme + '" data-rank="' + rank + '" style="animation-delay:' + ((rank-1)*0.1) + 's">'
    + '<div class="avatar-core"><div class="energy-ring"></div><img loading="lazy" class="avatar-img" src="' + fallbackAvatar(name) + '" alt="' + esc(name) + '">' + crown
    + '<div class="rank-floating">' + rank + '</div></div>'
    + '<div class="cyber-bar"><div class="info-content"><span class="name"> ' + esc(name) + ' </span><div class="tech-deco-line"></div></div></div>'
    + '<div class="data-score-block"><span class="score-val"><span class="icon-heart heart">' + icon + '</span> ' + fmt(value) + ' </span></div></div>';
}
function tplTaif(rank, name, value, icon) {
  const heart = icon === "❤️"
    ? '<svg viewBox="0 0 130 130" class="taif-heart-icon"><path d="M 65,29 C 59,19 49,12 37,12 20,12 7,25 7,42 7,75 25,80 65,118 105,80 123,75 123,42 123,25 110,12 93,12 81,12 71,19 65,29 z"/></svg>'
    : '<span>🪙</span>';
  return '<div class="taif-rank taif-rank' + rank + '" data-rank="' + rank + '">'
    + '<video autoplay loop muted playsinline class="taif-bg-video"><source src="https://tikalert-eg.com/assets/top-likers-taif/smoke.webm" type="video/webm"></video>'
    + '<div class="taif-rank-content"><img loading="lazy" class="taif-avatar taif-avatar-img" src="' + fallbackAvatar(name) + '" alt="' + esc(name) + '"><div class="taif-name">' + esc(name) + '</div></div>'
    + '<div class="taif-rank-number">' + rank + '</div>'
    + '<div class="taif-score"><span class="taif-score-value">' + fmt(value) + '</span>' + heart + '</div></div>';
}
function tplFarashat(rank, name, value, icon) {
  return '<div class="fr-rank fr-rank' + rank + '" data-rank="' + rank + '">'
    + '<div class="fr-rank-content"><img loading="lazy" class="fr-avatar" src="' + fallbackAvatar(name) + '" alt="' + esc(name) + '">'
    + '<div class="fr-rank-number">' + rank + '</div><div class="fr-name">' + esc(name) + '</div></div>'
    + '<div class="fr-score"><span class="fr-score-value">' + fmt(value) + '</span><span class="fr-heart-icon">' + icon + '</span></div></div>';
}
const BUILDERS = {
  legendary: { wrap: i => '<div class="legendary-list cycle-visible">' + i + '</div>', fn: tplLegendary },
  cyber:     { wrap: i => '<div class="leaderboard-list cycle-visible">' + i + '</div>', fn: tplCyber },
  taif:      { wrap: i => '<div class="taif-wrapper"><div class="taif-container">' + i + '</div></div>', fn: tplTaif },
  farashat:  { wrap: i => '<div class="fr-wrapper"><div class="fr-container">' + i + '</div></div>', fn: tplFarashat },
};
["modern","classic","m4","cards","compact","minimal","neon2","reference"].forEach(l => {
  BUILDERS[l] = { wrap: i => '<div class="likers-list cycle-visible">' + i + '</div>', fn: tplLiker };
});
`;

// ===== الوثيقة الداخلية (بتتشغل جوه iframe 456px) =====
function innerDoc(layout, type, token) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: 'Cairo', sans-serif; }
</style>
<style>${window.__W_CSS}</style>
<style>
  /* مطابقة الأصل: الـ padding المحسوب في صفحة tikalert */
  .widget-container.layout-legendary { padding: 14px 12px !important; }
  .layout-legendary .legendary-list { width: 100% !important; }
</style>
</head>
<body>
<div class="widget-container theme-dark font-medium anim-normal layout-${layout} align-right effect-shimmer" id="host"></div>
<script>
const DEMO = ${JSON.stringify(window.__W_DEMO)};
const LAYOUT = ${JSON.stringify(layout)};
const TYPE = ${JSON.stringify(type)};
const TOKEN = ${JSON.stringify(token || "")};
${window.__W_BUILDERS}
const host = document.getElementById("host");
function setContainer(inner) {
    const el = document.createElement('div');
    el.innerHTML = inner;
    const node = el.firstElementChild;
    host.replaceWith(node);
    return node;
  }
  let currentHost = host;
  function mount(cls, contentHtml) {
    const el = document.createElement('div');
    el.innerHTML = contentHtml;
    const node = el.firstElementChild;
    currentHost.replaceWith(node);
    currentHost = node;
    return node;
  }
  function renderDemo(){
    // الديمو = الحاوية الكاملة المستخرجة من المصدر حرفياً (بدون تعشيق مزدوج)
    currentHost = mount('', DEMO[LAYOUT][TYPE]);
  }
function renderLive(arr){
  const b = BUILDERS[LAYOUT];
  const top = arr.slice(0, 5);
  const maxVal = top.length ? top[0].count : 1;
  const icon = TYPE === "likers" ? "❤️" : "🪙";
  const cls = 'widget-container theme-dark font-medium anim-normal layout-' + LAYOUT + ' align-right effect-shimmer';
  mount(cls, b.wrap(top.map((e,i) => b.fn(i+1, e.user || e.nickname || 'User', e.count, icon, maxVal)).join('')));
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
          const arr = TYPE === "likers" ? (m.stats.topLikers || []) : (m.stats.topGifters || []);
          if (arr.length) renderLive(arr); else renderDemo();
        }
      } catch(e){}
    };
    ws.onclose = () => { clearInterval(ping); setTimeout(connect, 2500); };
    ws.onerror = () => { try { ws.close(); } catch(e){} };
  };
  connect();
} else {
  renderDemo();
}
<\/script>
</body>
</html>`;
}

// ===== الصفحة الخارجية (شريط التحكم + الـ iframe) =====
const outer = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>ELDALY STREAM — Widget Preview (تصنيفات)</title>
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
  #bar select, #bar input { background: #15151d; color: #ece9e1; border: 1px solid #33333f;
    border-radius: 7px; padding: 6px 9px; font-family: 'Cairo'; font-size: 12.5px; }
  #bar .ttl { font-weight: 900; color: #ecd28a; letter-spacing: 1px; }
  #bar .st { font-size: 11.5px; padding: 4px 9px; border-radius: 100px; background: rgba(255,255,255,0.06); }
  #bar .st.live { background: rgba(46,204,113,0.16); color: #7bedaa; }
  #bar .st.demo { background: rgba(52,152,219,0.16); color: #8ec9f5; }
  #stage { padding: 22px 10px 40px; display: flex; justify-content: center; align-items: flex-start; }
  #frame { width: 456px; height: 560px; border: 1px solid rgba(212,175,55,0.35); border-radius: 10px;
    background: transparent; }
  #hint { text-align: center; color: #6d6960; font-size: 12px; margin-top: 10px; line-height: 1.9; direction: rtl; }
  #hint code { color: #ecd28a; background: rgba(212,175,55,0.08); padding: 2px 7px; border-radius: 5px; direction: ltr; display: inline-block; }
</style>
</head>
<body>
<div id="bar">
  <span class="ttl">🦁 ELDALY</span>
  <select id="f-layout"></select>
  <select id="f-type">
    <option value="likers">❤️ تصنيف اللايكات</option>
    <option value="supporters">🪙 تصنيف الوجوديا</option>
  </select>
  <input id="f-token" placeholder="Overlay Token (اختياري — بيانات حية)" size="28" spellcheck="false">
  <span id="f-status" class="st demo">DEMO</span>
</div>
<div id="stage"><iframe id="frame" title="widget"></iframe></div>
<div id="hint">
  وضع OBS: ضيف Browser Source بمقاس <code>456 × 560</code> على اللينك:<br>
  <code id="obs-link">widget-preview.html?obs=1&amp;layout=legendary&amp;type=likers&amp;t=TOKEN</code>
</div>
<script>
(function(){
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const LAYOUTS = ${JSON.stringify(LAYOUTS)};
  const state = {
    layout: params.get("layout") || "legendary",
    type: params.get("type") || "likers",
    token: params.get("t") || localStorage.getItem("eldaly_overlay_token") || "",
    obs: params.get("obs") === "1",
  };
  const layoutSel = $("f-layout"), typeSel = $("f-type"), tokenInp = $("f-token");
  for (const l of LAYOUTS) { const o = document.createElement("option"); o.value = l; o.textContent = l; layoutSel.appendChild(o); }
  layoutSel.value = state.layout; typeSel.value = state.type; tokenInp.value = state.token;

  function updateStatus() {
    const st = $("f-status");
    st.textContent = state.token ? "LIVE" : "DEMO";
    st.className = "st " + (state.token ? "live" : "demo");
    $("obs-link").textContent = location.origin + location.pathname + "?obs=1&layout=" + state.layout + "&type=" + state.type + (state.token ? "&t=" + state.token : "");
  }
  function render() {
    if (state.obs) { document.body.innerHTML = ""; document.body.style.background = "transparent"; }
    // الوثيقة الداخلية بتتبني هنا — محتواها كله في مولّد innerDoc المدمج تحت
    const inner = window.__innerDoc(state.layout, state.type, state.token);
    $("frame").srcdoc = inner;
    localStorage.setItem("eldaly_overlay_token", state.token);
    updateStatus();
  }
  layoutSel.onchange = () => { state.layout = layoutSel.value; render(); };
  typeSel.onchange = () => { state.type = typeSel.value; render(); };
  tokenInp.onchange = () => { state.token = tokenInp.value.trim(); render(); };

  window.__W_CSS = ${JSON.stringify(css)};
  window.__W_BUILDERS = ${JSON.stringify(BUILDERS_JS)};
  window.__W_DEMO = ${JSON.stringify(demo)};
  window.__innerDoc = ${innerDoc.toString()};
  render();
})();
</script>
</body>
</html>`;

fs.writeFileSync(OUT, outer);
console.log("written:", OUT, Math.round(outer.length / 1024) + "KB");
