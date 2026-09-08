// ==========================================================================
// preload.js — loader stub (النسخة المبنية). الكود الحقيقي في preload.jsc
// ==========================================================================
try { require("bytenode"); } catch (e) {}
const fs = require("fs");
const path = require("path");
const jscPath = path.join(__dirname, "preload.jsc");
const srcPath = path.join(__dirname, "preload.src.js");
if (fs.existsSync(jscPath)) {
  require(jscPath);
} else if (fs.existsSync(srcPath)) {
  // وضع التطوير: clean-jsc مسح الـ bytecode — رجّع للسورس
  require(srcPath);
}
