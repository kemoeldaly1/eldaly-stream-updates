// repair_apifetch.js — إصلاح دالة apiFetch المكسورة في main.js
const fs = require("fs");
const BT = String.fromCharCode(96); // backtick
const DQ = String.fromCharCode(34); // double quote

let s = fs.readFileSync("main.js", "utf8");

const start = s.indexOf("async function apiFetch");
if (start === -1) { console.log("start not found"); process.exit(1); }
// نهاية الدالة المكسورة: آخر سطر فيها error: "Failed to connect..."
const errLine = s.indexOf('error: "Failed to connect to backend server: " + err.message,');
if (errLine === -1) { console.log("err line not found"); process.exit(1); }
let end = s.indexOf("}", errLine);
end = s.indexOf("\n", end) + 1; // أول سطر بعد قفل الدالة

// ما بعده: تعليق قسم السيرفر المحلي
const neu = [
  "async function apiFetch(endpoint, options = {}, _retried = false) {",
  "  const url = " + BT + "${BACKEND_URL}${endpoint}" + BT + ";",
  "  const headers = {",
  "    " + DQ + "Content-Type" + DQ + ": " + DQ + "application/json" + DQ + ",",
  "    // الجهاز مرتبط بالجلسة — السيرفر بيرفض التوكن من جهاز تاني",
  "    ...(localHwid ? { " + DQ + "x-app-hwid" + DQ + ": localHwid } : {}),",
  "    ...(appSessionToken ? { " + DQ + "x-app-session" + DQ + ": appSessionToken } : {}),",
  "    ...(options.headers || {}),",
  "  };",
  "  try {",
  "    const res = await fetch(url, {",
  "      ...options,",
  "      headers,",
  "    });",
  "    // الجلسة بقت غير صحيحة (مثلاً السيرفر اتعمل restart) — استعادة فورية وإعادة المحاولة مرة واحدة",
  "    if (",
  "      res.status === 401 &&",
  "      !_retried &&",
  "      appSessionToken &&",
  "      !endpoint.startsWith(" + DQ + "/api/auth/" + DQ + ")",
  "    ) {",
  "      const restored = await apiFetch(",
  "        " + DQ + "/api/auth/restore-session" + DQ + ",",
  "        { method: " + DQ + "POST" + DQ + ", body: JSON.stringify({ hwid: localHwid }) },",
  "        true,",
  "      );",
  "      if (restored && restored.sessionToken) {",
  "        consumeAuthTokens(restored);",
  "        return apiFetch(endpoint, options, true);",
  "      }",
  "    }",
  "    return await res.json();",
  "  } catch (err) {",
  "    console.error(" + BT + "[API Fetch Error] ${endpoint}:" + BT + ", err.message);",
  "    return {",
  "      ok: false,",
  "      success: false,",
  "      error: " + DQ + "Failed to connect to backend server: " + DQ + " + err.message,",
  "    };",
  "  }",
  "}",
  ""
].join("\n");

s = s.slice(0, start) + neu + s.slice(end);
fs.writeFileSync("main.js", s);
console.log("apiFetch repaired");
