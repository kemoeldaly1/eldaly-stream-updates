const { app, BrowserWindow, session } = require("electron");
const path = require("path");

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => { callback(true); });

  // 1) لوحة التحكم
  const win = new BrowserWindow({ width: 1200, height: 800, show: false });
  await win.loadURL("https://kemoeldaly.onrender.com/songs-page.html");

  // 2) ضيف أغنية
  await win.webContents.executeJavaScript(`
    document.getElementById('srTestInput').value = 'blinding lights the weeknd';
    document.getElementById('btnSongTest').click();
    'clicked'
  `);
  await new Promise(r => setTimeout(r, 5000));

  // 3) افتح الأوفرلاي
  const win2 = new BrowserWindow({ width: 800, height: 500, show: false });
  await win2.loadURL("https://kemoeldaly.onrender.com/overlay-music.html");
  await new Promise(r => setTimeout(r, 3000));
  // فعّل الصوت
  await win2.webContents.executeJavaScript("document.body.click(); document.getElementById('auHint')?.remove(); 'ok'");
  await new Promise(r => setTimeout(r, 5000));

  // 4) صور الاتنين
  const img1 = await win.webContents.capturePage();
  require("fs").writeFileSync("C:/Users/kemo/AppData/Local/Temp/test_control.png", img1.toPNG());
  const img2 = await win2.webContents.capturePage();
  require("fs").writeFileSync("C:/Users/kemo/AppData/Local/Temp/test_overlay.png", img2.toPNG());
  console.log("both captured");

  // 5) اطبع حالة الطابور
  const queueHTML = await win2.webContents.executeJavaScript("document.getElementById('upnext')?.innerHTML?.slice(0,200) || 'empty'");
  console.log("overlay queue:", queueHTML);

  app.exit(0);
}).catch(e => { console.log("ERR", e.message); app.exit(1); });
