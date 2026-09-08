// ==========================================================================
// boot.js — نقطة الدخول.
// في النسخة الموزّعة بيحمّل main.jsc (bytecode) ولو مش موجود بيقع على
// main.js الأصلي — كده وضع التطوير شغال عادي من غير ما تبني.
// ==========================================================================
try {
  require("bytenode");
} catch (e) {}

const fs = require("fs");
const path = require("path");

const jscPath = path.join(__dirname, "main.jsc");
if (fs.existsSync(jscPath)) {
  require(jscPath);
} else {
  require("./main.js");
}
