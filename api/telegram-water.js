// Vercel Serverless Function: Telegram Bot Webhook for Water Intake Tracking
// Target: ravitejabitra.in/api/telegram-water

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_WATER_BOT_TOKEN || "9280234752:AAGd-qGZbzRQ3UkwkK_nj8sEwzonqbciILk";
const AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID || "1288863066";
const GOOGLE_SCRIPT_URL = process.env.WATER_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwcQUP8bClLpHeZnwvCrtqm-KvMItQkMNZ0lY0YYCPAOchBlMEbUP-NqejKThehipvW/exec";
const DAILY_GOAL_ML = 4000;

// Smart text parser for water intake
function parseWaterAmount(text) {
  if (!text) return null;
  const clean = text.toLowerCase().trim();

  // Handle formats like "1.5 l", "1.5l", "2 liters", "2 litres", "1 ltr"
  const literMatch = clean.match(/([\d.]+)\s*(?:l|liter|liters|litre|litres|ltr|ltrs)\b/i);
  if (literMatch) {
    const val = parseFloat(literMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  // Handle formats like "300 ml", "300ml", "500 ml of water"
  const mlMatch = clean.match(/([\d.]+)\s*(?:ml|milliliter|millilitre|mls)\b/i);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  // Handle plain numbers like "300", "500", "250"
  const plainMatch = clean.match(/^(\d{2,4})$/);
  if (plainMatch) {
    const val = parseInt(plainMatch[1], 10);
    // Reasonable water range: 20ml to 5000ml
    if (val >= 20 && val <= 5000) return val;
  }

  // Natural language keywords
  if (clean.includes("glass") || clean.includes("cup")) return 250;
  if (clean.includes("mug")) return 350;
  if (clean.includes("small bottle")) return 500;
  if (clean.includes("big bottle") || clean.includes("full bottle")) return 1000;
  if (clean.includes("sip") || clean.includes("gulp")) return 100;

  return null;
}

// Get current IST Date & Time
function getISTDateTime(timestampSec) {
  const date = timestampSec ? new Date(timestampSec * 1000) : new Date();
  
  // Convert to IST (UTC + 5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + istOffsetMs);

  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  let hours = istDate.getHours();
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  return { dateStr, timeStr, istDate };
}

function normalizeToISTDateStr(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + istOffsetMs);
    const yyyy = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s.split('T')[0];
}

// Send reply message back to Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
      })
    });
  } catch (err) {
    console.error("Telegram send error:", err);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Health check / info
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      bot: "@raviteja_water_bot",
      description: "Telegram Webhook for Ravi Teja Water Tracker",
      endpoint: "/api/telegram-water"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const update = req.body;
  if (!update || !update.message) {
    return res.status(200).send("OK");
  }

  const msg = update.message;
  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id || "");
  const text = msg.text || "";

  // 1. Security Check: Only authorized user can log water
  if (userId !== String(AUTHORIZED_USER_ID)) {
    console.warn(`Unauthorized attempt from User ID: ${userId}`);
    await sendTelegramMessage(
      chatId,
      "⛔ <b>Access Restricted</b>\nThis bot is exclusively configured for Ravi Teja Bitra's water tracker."
    );
    return res.status(200).send("OK");
  }

  // 2. Handle /start or /help commands
  if (text === "/start" || text === "/help") {
    const welcome = `🌊 <b>Hey Ravi! Welcome to your Water Tracker Bot</b>\n\n` +
      `Your daily goal is <b>${DAILY_GOAL_ML.toLocaleString()} ml (4L)</b>.\n\n` +
      `<b>How to log water:</b>\n` +
      `• Just text the amount: <code>300 ml</code>, <code>500</code>, <code>1.5L</code>\n` +
      `• Or phrases: <code>drank 250ml water</code>, <code>1 glass</code>\n\n` +
      `Every log instantly updates your live animated dashboard at:\n` +
      `<a href="https://www.ravitejabitra.in/water">ravitejabitra.in/water</a> 🚀`;
    await sendTelegramMessage(chatId, welcome);
    return res.status(200).send("OK");
  }

  // 3. Parse water amount
  const amountMl = parseWaterAmount(text);
  if (!amountMl) {
    await sendTelegramMessage(
      chatId,
      `🤔 I couldn't recognize the water amount in "<i>${text}</i>".\n\n` +
      `Try texting something like:\n` +
      `• <code>300 ml</code>\n` +
      `• <code>500</code>\n` +
      `• <code>1L</code> or <code>1.5 liters</code>`
    );
    return res.status(200).send("OK");
  }

  // 4. Determine timestamp & IST date
  const { dateStr, timeStr } = getISTDateTime(msg.date);
  const nowIso = new Date().toISOString();

  // 5. Query Google Apps Script to compute Today's running total & save
  let newDailyTotal = amountMl;
  try {
    // First, fetch existing rows to calculate today's total
    const getRes = await fetch(GOOGLE_SCRIPT_URL, { method: "GET" });
    if (getRes.ok) {
      const rows = await getRes.json();
      if (Array.isArray(rows)) {
        const todayRows = rows.filter(r => normalizeToISTDateStr(r.Date || r.date) === dateStr);
        const prevTotal = todayRows.reduce((sum, r) => sum + (Number(r["Amount (ml)"] || r.amount) || 0), 0);
        newDailyTotal = prevTotal + amountMl;
      }
    }
  } catch (err) {
    console.error("Error computing daily total from Google Sheet:", err);
  }

  // 6. Append entry to Google Sheet via Apps Script POST
  try {
    const payload = {
      timestamp: nowIso,
      date: dateStr,
      time: timeStr,
      amount: amountMl,
      rawMessage: text,
      dailyTotal: newDailyTotal
    };

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Error writing to Google Sheet:", err);
  }

  // 7. Calculate progress metrics
  const progressPercent = Math.min(100, Math.round((newDailyTotal / DAILY_GOAL_ML) * 100));
  const remainingMl = Math.max(0, DAILY_GOAL_ML - newDailyTotal);

  // Motivational message
  let celebration = "💧 Logged!";
  if (newDailyTotal >= DAILY_GOAL_ML) {
    celebration = "🎉 <b>GOAL CRUSHED!</b> 🏆 You hit 4,000 ml today!";
  } else if (progressPercent >= 75) {
    celebration = "⚡ Almost there! 3/4th done!";
  } else if (progressPercent >= 50) {
    celebration = "🔥 Halfway mark surpassed!";
  }

  const reply = `${celebration}\n\n` +
    `📥 <b>Added:</b> +${amountMl} ml at ${timeStr}\n` +
    `🌊 <b>Today's Total:</b> ${newDailyTotal.toLocaleString()} / ${DAILY_GOAL_ML.toLocaleString()} ml (${progressPercent}%)\n` +
    (remainingMl > 0 ? `🎯 <b>Remaining:</b> ${remainingMl.toLocaleString()} ml left\n\n` : `\n`) +
    `👉 View your live animated bowl: <a href="https://www.ravitejabitra.in/water">ravitejabitra.in/water</a>`;

  await sendTelegramMessage(chatId, reply);
  return res.status(200).send("OK");
}
