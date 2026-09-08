const { app, BrowserWindow } = require("electron");
app.whenReady().then(async () => {
  // 1) افتح الأوفرلاي
  const win = new BrowserWindow({ width: 800, height: 600, show: false });
  await win.loadURL("https://kemoeldaly.onrender.com/overlay-music.html");
  await new Promise(r => setTimeout(r, 3000));
  const img = await win.webContents.capturePage();
  require("fs").writeFileSync("C:/Users/kemo/AppData/Local/Temp/test_overlay_simple.png", img.toPNG());
  console.log("overlay captured");
  app.exit(0);
}).catch(e => { console.log("ERR", e.message); app.exit(1); });
