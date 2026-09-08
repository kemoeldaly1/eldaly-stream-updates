// rebuild_sr_en.js — استبدال صفحة Song Requests بنسخة Native إنجليزي كامل
const fs = require("fs");
let h = fs.readFileSync("src/index.html", "utf8");

// نطقطع من بداية السيكشن لحد تعليق الدعم — نلاقي التعليق بعد السيكشن (مش لينك القايمة)
const startRe = /[ \t]*<section class="page" id="page-songs">/;
const secIdx = h.indexOf('id="page-songs"');
if (secIdx === -1) { console.log("section missing"); process.exit(1); }
const supIdx = h.indexOf("الدعم الفني", secIdx);
if (supIdx === -1) { console.log("support marker missing"); process.exit(1); }
const sm = h.slice(0, supIdx).match(startRe);
if (!sm) { console.log("section start not found"); process.exit(1); }
const start = sm.index;
const end = h.lastIndexOf("</section>", supIdx) + "</section>".length;

const num = (id, val, extra) =>
  '<input class="form-input" id="' + id + '" type="number" min="0" value="' + val + '" ' + (extra || "") + '>';
const slider = (id, val, extra) =>
  '<input id="' + id + '" type="range" min="' + (extra ? 40 : 0) + '" max="' + (extra ? 200 : 100) + '" value="' + val + '" style="flex:1;accent-color:#d4af37;cursor:pointer">';
const tgl = (id, checked) =>
  '<input type="checkbox" id="' + id + '" style="width:34px;height:19px;accent-color:#d4af37;cursor:pointer"' + (checked ? " checked" : "") + '>';
const row = (label, control) =>
  '<div class="set-row"><div class="lbl">' + label + '</div>' + control + '</div>';
const chk = (id, label, checked) =>
  '<label class="chk"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + '> ' + label + '</label>';

const section = [
  '      <section class="page" id="page-songs">',
  '        <div class="page-header">',
  '          <h1 class="page-title"><span class="gradient-text">🎵 Song Requests</span></h1>',
  '          <p class="page-subtitle">Viewers request songs from SoundCloud via TikTok chat — powered by ELDALY STREAM</p>',
  '        </div>',
  '',
  '        <div class="sr-grid">',
  '          <div>',
  '            <div class="sr-card">',
  '              <div class="sr-card-h">📜 Playback Queue</div>',
  '              <div class="sr-card-b">',
  '                <div class="sr-urlbox"><span class="sr-url" id="sr-ov-url">...</span><button class="btn btn-ghost btn-sm" id="sr-ov-copy">📋 Copy Overlay URL</button></div>',
  '                <div class="sr-queue" id="sr-queue-list"></div>',
  '                <div class="sr-actions">',
  '                  <button class="btn btn-ghost btn-sm" id="sr-skip-now">⏭ Skip current</button>',
  '                  <button class="btn btn-danger btn-sm" id="sr-clear">🗑 Clear queue</button>',
  '                </div>',
  '                <div class="sr-sub">⏯ Playback controls (current track)</div>',
  '                <div class="sr-actions" id="sr-ctrl">',
  '                  <button class="btn btn-gold btn-sm" id="sr-pause">⏸ Pause</button>',
  '                  <button class="btn btn-gold btn-sm" id="sr-resume">▶ Resume</button>',
  '                  <button class="btn btn-gold btn-sm" id="sr-restart">⏮ Restart</button>',
  '                </div>',
  '              </div>',
  '            </div>',
  '          </div>',
  '          <div>',
  '            <div class="sr-card">',
  '              <div class="sr-card-h">🧪 Testing Area</div>',
  '              <div class="sr-card-b">',
  '                <div class="sr-test"><input class="form-input" id="sr-test-name" placeholder="Song name - Artist"><button class="btn btn-gold btn-sm" id="sr-test-add">▶ Test</button></div>',
  '                <div class="msg" id="sr-test-msg"></div>',
  '                <div class="sr-sub" style="margin-top:16px">🎧 SOUNDCLOUD</div>',
  '                <div id="sr-sc-status" class="sr-sc">Checking...</div>',
  '              </div>',
  '            </div>',
  '            <div class="sr-card" style="margin-top:14px">',
  '              <div class="sr-card-h">⌨️ Chat Commands</div>',
  '              <div class="sr-card-b sr-cmds">',
  '                <div><b id="sr-cmd-play">!play</b> [Song - Artist] — add to queue</div>',
  '                <div><b id="sr-cmd-skip">!skip</b> — skip current</div>',
  '                <div><b>!revoke</b> — revoke your request</div>',
  '                <div><b>!queue</b> — show queue</div>',
  '                <div><b>!points</b> — show your points</div>',
  '              </div>',
  '            </div>',
  '          </div>',
  '        </div>',
  '',
  '        <div class="sr-card" style="margin-top:16px">',
  '          <div class="sr-card-h">⚙️ Settings</div>',
  '          <div class="sr-card-b">',
  row("Enable song requests", tgl("sr-enabled", true)),
  row("Enable !play command", tgl("sr-play-enabled", true)),
  row("!play cost (points)", num("sr-play-cost", 0)),
  row("Enable !skip command", tgl("sr-skip-enabled", true)),
  row("!skip cost (points)", num("sr-skip-cost", 1)),
  row("Requester skips own song free", tgl("sr-allow-skip-own", true)),
  row("Allow explicit content", tgl("sr-allow-explicit", false)),
  row("Max queue length (overall)", num("sr-max-queue", 20)),
  row("Max queue length (single user)", num("sr-max-user", 2)),
  row("Display overlay permanently", tgl("sr-permanent", true)),
  row("Music volume", slider("sr-volume", 80) + '<span style="min-width:38px;text-align:center;font-weight:800;color:#d4af37" id="sr-volume-val">80</span>'),
  row("Overlay size on screen", slider("sr-scale", 100, "1") + '<span style="min-width:44px;text-align:center;font-weight:800;color:#d4af37" id="sr-scale-val">100%</span>'),
  row("Fallback track when queue is empty", '<input class="form-input" id="sr-fallback" dir="ltr" placeholder="https://soundcloud.com/..." style="width:230px">'),
  row("Points earned per chat message", num("sr-points", 1)),
  '<div class="set-row"><div class="lbl">Commands available for</div><div class="chk-row">' + chk("sr-roles-all", "All Users", true) + chk("sr-roles-subs", "Subscribers", false) + chk("sr-roles-mods", "Mods", true) + '</div></div>',
  '            <div style="display:flex;gap:10px;margin-top:16px">',
  '              <button class="btn btn-gold" id="sr-save" style="flex:1;padding:12px">💾 Save Settings — applied instantly to the overlay</button>',
  '              <button class="btn btn-danger btn-sm" id="sr-clear">🗑 Clear queue</button>',
  '            </div>',
  '            <div class="msg" id="sr-save-msg"></div>',
  '          </div>',
  '        </div>',
  '',
  '        <div class="sr-card" style="margin-top:16px">',
  '          <div class="sr-card-h">🕘 History</div>',
  '          <div class="sr-card-b">',
  '                <div style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:12px"><input class="form-input" id="sr-hist-search" placeholder="🔍 Search..." style="width:200px;font-size:12px"></div>',
  '                <table class="sr-table"><thead><tr><th>Date</th><th>User</th><th>Track</th><th>Status</th></tr></thead><tbody id="sr-hist-body"></tbody></table>',
  '          </div>',
  '        </div>',
  '      </section>',
].join("\n");

h = h.slice(0, start) + section + "\n" + h.slice(end);
fs.writeFileSync("src/index.html", h);
console.log("native english page-songs built ✓");
