/*
 * Announcement service — مصدر واحد لرسالة الإدارة على مستوى السيرفر.
 * بيجيب الإعلان من Firestore (config/announcement) كل دقيقة مرة واحدة بس —
 * بدل ما كل عميل يعمل poll بنفسه — وأي تغيير بيتبث لحظيًا لكل عملاء الـ WS:
 *   { type: "announcement", data: { text, endAt } }
 * العملاء الجديدة بتستلمه فورًا بعد الـ init عند الاتصال.
 */
const ANNOUNCEMENT_URL =
  "https://firestore.googleapis.com/v1/projects/eldaly-stream/databases/(default)/documents/config/announcement";

let current = null; // { text, endAt }
let timer = null;

async function check(broadcast) {
  try {
    const res = await fetch(ANNOUNCEMENT_URL);
    if (!res.ok) return;
    const body = await res.json();
    const fields = body.fields || {};
    const text = fields.text ? fields.text.stringValue || "" : "";
    const endAt = fields.endAt ? fields.endAt.timestampValue || "" : "";
    if (!text || !endAt) return;
    if (!current || current.text !== text || current.endAt !== endAt) {
      current = { text, endAt };
      broadcast({ type: "announcement", data: { text, endAt } });
      console.log(`[ANNOUNCEMENT] updated → ${text.slice(0, 60)}`);
    }
  } catch (e) {}
}

function start(broadcast) {
  if (timer) return;
  check(broadcast);
  timer = setInterval(() => check(broadcast), 60000);
}

function get() {
  return current;
}

module.exports = { start, get };
