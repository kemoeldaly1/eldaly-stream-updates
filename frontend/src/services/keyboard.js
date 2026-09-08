const {
  execFile
} = require("child_process");
const fs = require("fs");
const path = require("path");
class KeyboardService {
  constructor() {
    this.keySenderPath = path.join(__dirname, "KeySender.exe");
  }
  isAvailable() {
    return fs.existsSync(this.keySenderPath);
  }
  sendKeys(p, p2 = 0) {
    if (!p) {
      return false;
    }
    const v = p.trim();
    try {
      const v2 = this._tokenize(v);
      let vA = [];
      for (let vLN0 = 0; vLN0 < v2.length; vLN0++) {
        const v3 = this._tokenToVKs(v2[vLN0]);
        if (v3 && v3.length > 0) {
          vA.push(v3);
        }
      }
      if (vA.length === 0) {
        return true;
      }
      let vLN02 = 0;
      const vF = () => {
        if (vLN02 >= vA.length) {
          return;
        }
        const v4 = vA[vLN02];
        const v5 = v4.join(",");
        if (fs.existsSync(this.keySenderPath)) {
          execFile(this.keySenderPath, [v5, p2.toString()], p3 => {
            if (p3) {
              console.error("[Keyboard] KeySender Error:", p3);
            }
          });
        } else {
          console.error("[Keyboard] KeySender.exe not found at", this.keySenderPath);
        }
        vLN02++;
        if (vLN02 < vA.length) {
          setTimeout(vF, p2 > 0 ? p2 + 20 : 50);
        }
      };
      console.log("[Keyboard] Sending keys via KeySender.exe (Hold: " + p2 + "ms):", v);
      vF();
      return true;
    } catch (e) {
      console.error("[Keyboard] Exception:", e);
      return false;
    }
  }
  _tokenize(p4) {
    if (/^(ctrl|alt|shift)\+/i.test(p4)) {
      return [p4];
    }
    const vA2 = [];
    let vP4 = p4;
    while (vP4.length > 0) {
      vP4 = vP4.trimStart();
      if (!vP4) {
        break;
      }
      const v6 = vP4.match(/^\[([^\]]+)\]/);
      if (v6) {
        vA2.push(v6[1]);
        vP4 = vP4.substring(v6[0].length);
        continue;
      }
      const v7 = vP4.indexOf("[");
      const v8 = vP4.indexOf(" ");
      let v9;
      if (v7 > 0 && (v8 < 0 || v7 < v8)) {
        v9 = v7;
      } else if (v8 > 0) {
        v9 = v8;
      } else {
        v9 = vP4.length;
      }
      const v10 = vP4.substring(0, v9);
      for (const v11 of v10.split("")) {
        vA2.push(v11);
      }
      vP4 = vP4.substring(v9);
    }
    return vA2;
  }
  _tokenToVKs(p5) {
    if (/\+/.test(p5) && /^(ctrl|alt|shift)\+/i.test(p5)) {
      const v12 = p5.split("+").map(p6 => p6.trim().toLowerCase());
      const vA3 = [];
      for (const v13 of v12) {
        if (v13 === "ctrl" || v13 === "control") {
          vA3.push(17);
        } else if (v13 === "shift") {
          vA3.push(16);
        } else if (v13 === "alt") {
          vA3.push(18);
        } else {
          vA3.push(this._mapSingleVK(v13));
        }
      }
      return vA3;
    }
    return [this._mapSingleVK(p5)];
  }
  _mapSingleVK(p7) {
    const v14 = p7.toLowerCase();
    if (v14.length === 1 && v14 >= "a" && v14 <= "z") {
      return v14.charCodeAt(0) - 32;
    }
    if (v14.length === 1 && v14 >= "0" && v14 <= "9") {
      return v14.charCodeAt(0);
    }
    const vO = {
      enter: 13,
      tab: 9,
      esc: 27,
      escape: 27,
      space: 32,
      backspace: 8,
      delete: 46,
      del: 46,
      "caps lock": 20,
      capslock: 20,
      up: 38,
      down: 40,
      left: 37,
      right: 39,
      "up arrow": 38,
      "down arrow": 40,
      "left arrow": 37,
      "right arrow": 39,
      home: 36,
      end: 35,
      insert: 45,
      pageup: 33,
      pagedown: 34,
      pgup: 33,
      pgdn: 34,
      f1: 112,
      f2: 113,
      f3: 114,
      f4: 115,
      f5: 116,
      f6: 117,
      f7: 118,
      f8: 119,
      f9: 120,
      f10: 121,
      f11: 122,
      f12: 123,
      numpad0: 96,
      numpad1: 97,
      numpad2: 98,
      numpad3: 99,
      numpad4: 100,
      numpad5: 101,
      numpad6: 102,
      numpad7: 103,
      numpad8: 104,
      numpad9: 105,
      numpadadd: 107,
      numpadsubtract: 109,
      numpadmultiply: 106,
      numpaddivide: 111,
      numpaddecimal: 110,
      ";": 186,
      "=": 187,
      ",": 188,
      "-": 189,
      ".": 190,
      "/": 191,
      "`": 192,
      "[": 219,
      "\\": 220,
      "]": 221,
      "'": 222
    };
    if (vO[v14]) {
      return vO[v14];
    }
    if (p7.length === 1) {
      return p7.toUpperCase().charCodeAt(0);
    }
    return 0;
  }
}
module.exports = KeyboardService;