// Vercel Serverless Function: Telegram Fuel & Nutrition Bot Webhook
// Handles: 
// 1. Photo upload -> Vision AI parses nutrition label & ALL vital micronutrients -> Saves to Pantry
// 2. Text message -> Matches pantry brand item (macros + vitals) -> Logs daily intake

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_FUEL_BOT_TOKEN || "9018521579:AAG5KbQyjR-5A3j7MzsVnE_TT48HE_yLbQo";
const AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID || "1288863066";
const GOOGLE_SCRIPT_URL = process.env.WATER_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwcQUP8bClLpHeZnwvCrtqm-KvMItQkMNZ0lY0YYCPAOchBlMEbUP-NqejKThehipvW/exec";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCSYr_h0VL2iOcCyT2hDrGY8xGosf7DqIw";

// Daily Macro Targets
const DAILY_TARGETS = {
  calories: 2100,
  protein: 150,
  carbs: 220,
  fats: 60,
  fiber: 30
};

// Convert to IST Date & Time
function getISTDateTime(timestampSec) {
  const date = timestampSec ? new Date(timestampSec * 1000) : new Date();
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
  hours = hours ? hours : 12;
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

// Send Telegram Message
async function sendTelegramMessage(chatId, text, replyToMsgId = null) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyToMsgId) {
      payload.reply_to_message_id = replyToMsgId;
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Telegram send error:", err);
  }
}

// Download Telegram Photo as Base64
async function downloadTelegramPhotoBase64(fileId) {
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error("Failed to get Telegram file path");
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    const imgRes = await fetch(downloadUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    let mimeType = "image/jpeg";
    if (filePath.endsWith(".png")) mimeType = "image/png";
    if (filePath.endsWith(".webp")) mimeType = "image/webp";

    return { base64, mimeType };
  } catch (err) {
    console.error("Error downloading Telegram photo:", err);
    return null;
  }
}

// Call Gemini 2.5 Flash with Image to Extract Nutrition Facts + Vital Micronutrients
async function extractNutritionFromImage(base64Data, mimeType, optionalCaption) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `You are an expert nutritional, supplement, and sports science data extractor.
Analyze this photo of a product's label carefully. 
It could be standard food (peanut butter, oats, whey) OR a targeted supplement (Fish Oil, Omega-3 capsules, Multivitamins, Magnesium Glycinate, ZMA, Creatine, Pre-workout, Electrolytes, Zinc, Vitamin D3).
${optionalCaption ? `User added this note/brand name: "${optionalCaption}".` : ''}

CRITICAL INSTRUCTION:
Do NOT limit extraction to only standard macros (protein, carbs, fats). 
If this product contains active ingredients or micronutrients:
- For Fish Oil: Extract Total Omega-3, EPA (Eicosapentaenoic Acid), DHA (Docosahexaenoic Acid).
- For Magnesium / ZMA: Extract Elemental Magnesium, Zinc, Vitamin B6, etc.
- For Creatine: Extract Creatine Monohydrate (grams/mg).
- For Multivitamins: Extract Vitamin D3, B12, C, Zinc, Iron, Biotin, etc.
- For Electrolytes: Extract Sodium, Potassium, Magnesium, Chloride.
- For Pre-workouts: Extract Caffeine, Beta-Alanine, L-Citrulline, etc.

Output ONLY a raw, valid JSON object (without markdown fences, no backticks, no other text) with this exact schema:
{
  "itemName": "Specific product name (e.g. Triple Strength Fish Oil, Magnesium Glycinate, Pro Impact Whey)",
  "brand": "Brand name (e.g. TrueBasics, HealthyHey, NAC, MuscleBlaze)",
  "category": "Fish Oil / Omega-3 | Mineral / Magnesium | Vitamin | Creatine | Protein | Whole Food | Other",
  "servingUnit": "Serving label (e.g. 1 capsule, 2 tablets, 1 scoop, 2 tbsp, 100g, 30g)",
  "servingWeight": "Weight in grams/ml if stated (e.g. 1.25g, 33g, 32g)",
  "calories": number (kcal per serving, 0 if negligible/not listed),
  "protein": number (grams of protein per serving, 0 if not listed),
  "carbs": number (grams of total carbs per serving, 0 if not listed),
  "fats": number (grams of total fat per serving, 0 if not listed),
  "fiber": number (grams of dietary fiber, 0 if not listed),
  "sugar": number (grams of total sugar, 0 if not listed),
  "vitalNutrients": {
    "EPA": "560 mg",
    "DHA": "400 mg",
    "Total Omega-3": "1250 mg"
  },
  "aliases": "Comma-separated keywords/shorthand that the user might text to log this item, e.g. fish oil, omega 3, omega capsules, truebasics fish oil"
}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini Vision");

  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// Match user's natural language food text with their Pantry Catalog
async function matchFoodWithPantry(userText, pantryItems) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `You are a personal fitness nutrition & supplement logging assistant.
The user has registered the following brand products & supplements in their personal Pantry Catalog:
${JSON.stringify(pantryItems, null, 2)}

The user sent this log message: "${userText}"

Task:
1. Match the user's message to one of their registered pantry items (e.g. "fish oil", "omega", "magnesium", "creatine", "whey", "pb").
2. If it matches a pantry item:
   - Calculate proportional calories, protein, carbs, fats, fiber, sugar based on the quantity consumed.
   - ALSO proportionately scale all vital nutrients (e.g. if 1 cap of fish oil has 560mg EPA and user took 2 caps, total EPA is 1120mg).
3. If the item is NOT in their pantry (like common whole foods, e.g. "2 boiled eggs" or "1 banana"), estimate accurate nutritional values based on standard USDA nutrition data.

Return ONLY a raw, valid JSON object (no markdown, no backticks) with this schema:
{
  "matchedPantry": boolean,
  "itemName": "Product or Food Name",
  "brand": "Brand Name or 'Whole Food'",
  "category": "Supplement | Food | Vitamin/Mineral | etc",
  "quantity": number (e.g. 1, 2, 1.5, 0.5),
  "servingUnit": "e.g. capsule, tablet, scoop, tbsp, pieces",
  "calories": number (rounded integer),
  "protein": number (rounded to 1 decimal),
  "carbs": number (rounded to 1 decimal),
  "fats": number (rounded to 1 decimal),
  "fiber": number (rounded to 1 decimal),
  "sugar": number (rounded to 1 decimal),
  "vitalNutrients": {
    "EPA": "560 mg",
    "DHA": "400 mg"
  }
}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini match error: ${errText}`);
  }

  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// Fetch Pantry Catalog from Google Sheet
async function getPantryCatalog() {
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=catalog`);
    if (!res.ok) return [];
    const items = await res.json();
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error("Error fetching pantry catalog:", err);
    return [];
  }
}

// Fetch Today's Nutrition Logs from Google Sheet
async function getTodayNutritionLogs(todayDateStr) {
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=nutrition`);
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items.filter(r => normalizeToISTDateStr(r.Date || r.date) === todayDateStr);
  } catch (err) {
    console.error("Error fetching nutrition logs:", err);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      bot: "@raviteja_fuel_bot",
      description: "Telegram Nutrition & Vital Supplements Webhook"
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
  const messageId = msg.message_id;

  // 1. Security Check
  if (userId !== String(AUTHORIZED_USER_ID)) {
    console.warn(`Unauthorized attempt on Fuel Bot from User ID: ${userId}`);
    await sendTelegramMessage(
      chatId,
      "⛔ <b>Access Restricted</b>\nThis bot is exclusively configured for Ravi Teja Bitra's fuel tracker."
    );
    return res.status(200).send("OK");
  }

  const { dateStr, timeStr } = getISTDateTime(msg.date);

  // ── A. PHOTO DETECTED: PHASE 1 (PANTRY & SUPPLEMENT CATALOGING) ───
  if (msg.photo && msg.photo.length > 0) {
    await sendTelegramMessage(chatId, "🔍 <i>Analyzing label & vital active ingredients with Gemini Vision...</i>", messageId);

    try {
      const highestPhoto = msg.photo[msg.photo.length - 1];
      const photoResult = await downloadTelegramPhotoBase64(highestPhoto.file_id);
      if (!photoResult) {
        await sendTelegramMessage(chatId, "❌ Could not download photo from Telegram. Please try sending again.");
        return res.status(200).send("OK");
      }

      // Extract Nutrition Facts + Vital Nutrients via Gemini Vision
      const extracted = await extractNutritionFromImage(photoResult.base64, photoResult.mimeType, msg.caption);

      // Format vital nutrients summary
      const vitalsList = [];
      if (extracted.vitalNutrients && typeof extracted.vitalNutrients === "object") {
        for (const [k, v] of Object.entries(extracted.vitalNutrients)) {
          if (v && v !== "0" && v !== "0mg" && v !== 0) {
            vitalsList.push(`${k}: ${v}`);
          }
        }
      }
      const vitalsSummaryStr = vitalsList.join(" | ");

      // Save to Google Sheet: Ravi Pantry Catalog
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "catalog",
          itemName: extracted.itemName,
          brand: extracted.brand,
          servingUnit: extracted.servingUnit,
          servingWeight: extracted.servingWeight,
          calories: extracted.calories || 0,
          protein: extracted.protein || 0,
          carbs: extracted.carbs || 0,
          fats: extracted.fats || 0,
          fiber: extracted.fiber || 0,
          sugar: extracted.sugar || 0,
          aliases: extracted.aliases + (vitalsSummaryStr ? ` [Vitals: ${vitalsSummaryStr}]` : ""),
          dateAdded: new Date().toISOString()
        })
      });

      // Build Rich Confirmation Card
      let vitalsBlock = "";
      if (vitalsList.length > 0) {
        vitalsBlock = `\n💊 <b>Vital Active Ingredients:</b>\n` +
          vitalsList.map(v => `• <b>${v.split(':')[0]}:</b> ${v.split(':').slice(1).join(':').trim()}`).join("\n") + "\n";
      }

      const hasMacros = (extracted.calories > 0 || extracted.protein > 0 || extracted.fats > 0);
      let macrosBlock = "";
      if (hasMacros) {
        macrosBlock = `🥩 <b>Protein:</b> ${extracted.protein}g • 🍞 <b>Carbs:</b> ${extracted.carbs}g • 🥑 <b>Fats:</b> ${extracted.fats}g\n` +
          `🔥 <b>Calories:</b> ${extracted.calories} kcal\n`;
      }

      const card = `✅ <b>Saved to Your Brand Pantry!</b>\n\n` +
        `📦 <b>Product:</b> ${extracted.brand ? extracted.brand + ' ' : ''}${extracted.itemName}\n` +
        `📏 <b>Serving:</b> ${extracted.servingUnit} ${extracted.servingWeight ? '(' + extracted.servingWeight + ')' : ''}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        vitalsBlock +
        macrosBlock +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>You can now log this anytime by texting:</i>\n` +
        `• <code>1 ${extracted.servingUnit.split(' ')[0]} ${extracted.aliases.split(',')[0].trim()}</code>\n` +
        `• <code>2 ${extracted.servingUnit.split(' ')[0]}s ${extracted.aliases.split(',')[0].trim()}</code>\n\n` +
        `🌐 View your live dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

      await sendTelegramMessage(chatId, card, messageId);
      return res.status(200).send("OK");
    } catch (err) {
      console.error("Error processing photo:", err);
      await sendTelegramMessage(chatId, `⚠️ <b>Could not read label</b>: ${err.message}\nMake sure the nutrition facts / supplement facts table is well-lit!`, messageId);
      return res.status(200).send("OK");
    }
  }

  // ── B. TEXT DETECTED: PHASE 2 (FOOD/SUPPLEMENT LOGGING) ──────────
  const text = (msg.text || "").trim();

  // /start or /help
  if (text === "/start" || text === "/help") {
    const welcome = `⚡ <b>Welcome to Your Personal Fuel & Nutrition Engine!</b>\n\n` +
      `<b>Phase 1: Catalog Your Brands & Supplements (Snap a Photo)</b>\n` +
      `• Send a photo of <b>ANY</b> label: Whey, Peanut Butter, <b>Fish Oil (Omega-3)</b>, <b>Magnesium Glycinate / ZMA</b>, <b>Creatine</b>, or <b>Multivitamins</b>.\n` +
      `• The AI extracts macros + vital active nutrients (EPA, DHA, Elemental Magnesium, Creatine, Zinc, etc.)!\n\n` +
      `<b>Phase 2: Quick Daily Logging (Just Text)</b>\n` +
      `• <code>1 cap fish oil</code>\n` +
      `• <code>2 caps magnesium</code>\n` +
      `• <code>1 scoop creatine</code>\n` +
      `• <code>1 scoop protein</code>\n` +
      `• <code>2 tbsp peanut butter</code>\n\n` +
      `<b>Commands:</b>\n` +
      `• /pantry - View all your registered brands & active vitals\n` +
      `• /today - View today's fuel & vitals summary\n\n` +
      `🌐 Live Dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, welcome);
    return res.status(200).send("OK");
  }

  // /pantry command - list saved brands and vitals
  if (text === "/pantry" || text === "/catalog") {
    const pantry = await getPantryCatalog();
    if (pantry.length === 0) {
      await sendTelegramMessage(chatId, "📦 <b>Your Pantry is empty!</b>\nSnap a photo of any nutrition or supplement label and send it here to register your first item.");
      return res.status(200).send("OK");
    }

    let list = `📦 <b>Your Registered Brand Pantry (${pantry.length} items):</b>\n\n`;
    pantry.forEach((item, idx) => {
      const p = item["Protein (g)"] || item.protein || 0;
      const c = item["Calories (kcal)"] || item.calories || 0;
      const brand = item["Brand"] || item.brand || "";
      const name = item["Item Name"] || item.itemName || "Item";
      const unit = item["Serving Unit"] || item.servingUnit || "";
      const rawAliases = item["Aliases"] || item.aliases || "";

      // Extract vitals if present in aliases or note
      let vitalNote = "";
      const vitalsMatch = rawAliases.match(/\[Vitals:\s*(.*?)\]/i);
      if (vitalsMatch) {
        vitalNote = `\n      💊 <i>${vitalsMatch[1]}</i>`;
      }

      list += `<b>${idx + 1}. ${brand} ${name}</b>\n` +
        `   • 📏 ${unit}` + (p > 0 || c > 0 ? ` ➔ 🥩 <b>${p}g P</b> | 🔥 ${c} kcal` : '') +
        `${vitalNote}\n`;
    });
    list += `\n💡 <i>Snap a photo of any new label anytime to add more!</i>`;
    await sendTelegramMessage(chatId, list);
    return res.status(200).send("OK");
  }

  // /today command - view today's totals
  if (text === "/today" || text === "/macros") {
    const todayLogs = await getTodayNutritionLogs(dateStr);
    const totalP = todayLogs.reduce((sum, r) => sum + (Number(r["Protein"] || r.protein) || 0), 0);
    const totalC = todayLogs.reduce((sum, r) => sum + (Number(r["Carbs"] || r.carbs) || 0), 0);
    const totalF = todayLogs.reduce((sum, r) => sum + (Number(r["Fats"] || r.fats) || 0), 0);
    const totalCal = todayLogs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0);

    const summary = `📊 <b>Today's Fuel Summary (${todayLogs.length} entries)</b>\n\n` +
      `🥩 <b>Protein:</b> ${Math.round(totalP)}g / ${DAILY_TARGETS.protein}g (${Math.min(100, Math.round((totalP/DAILY_TARGETS.protein)*100))}%)` + (totalP >= DAILY_TARGETS.protein ? ' 🏆' : '') + `\n` +
      `🍞 <b>Carbs:</b> ${Math.round(totalC)}g / ${DAILY_TARGETS.carbs}g\n` +
      `🥑 <b>Fats:</b> ${Math.round(totalF)}g / ${DAILY_TARGETS.fats}g\n` +
      `🔥 <b>Calories:</b> ${Math.round(totalCal)} kcal / ${DAILY_TARGETS.calories} kcal\n\n` +
      `🌐 Live Dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, summary);
    return res.status(200).send("OK");
  }

  // ── C. USER SENT FOOD/SUPPLEMENT LOG TEXT ────────────────────────
  try {
    const pantry = await getPantryCatalog();
    const matched = await matchFoodWithPantry(text, pantry);

    // Format vital nutrients delivered
    const logVitalsList = [];
    if (matched.vitalNutrients && typeof matched.vitalNutrients === "object") {
      for (const [k, v] of Object.entries(matched.vitalNutrients)) {
        if (v && v !== "0" && v !== "0mg" && v !== 0) {
          logVitalsList.push(`${k}: ${v}`);
        }
      }
    }
    const logVitalsSummary = logVitalsList.join(" | ");

    // Save entry to Google Sheet: Ravi Nutrition Logs
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "nutrition",
        timestamp: new Date().toISOString(),
        date: dateStr,
        time: timeStr,
        itemName: matched.itemName,
        brand: matched.brand,
        quantity: matched.quantity,
        servingUnit: matched.servingUnit,
        calories: matched.calories || 0,
        protein: matched.protein || 0,
        carbs: matched.carbs || 0,
        fats: matched.fats || 0,
        fiber: matched.fiber || 0,
        sugar: matched.sugar || 0,
        rawMessage: text + (logVitalsSummary ? ` [Vitals: ${logVitalsSummary}]` : "")
      })
    });

    // Calculate today's running totals
    const todayLogs = await getTodayNutritionLogs(dateStr);
    const totalP = todayLogs.reduce((sum, r) => sum + (Number(r["Protein"] || r.protein) || 0), 0) + (matched.protein || 0);
    const totalCal = todayLogs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0) + (matched.calories || 0);
    const pPct = Math.min(100, Math.round((totalP / DAILY_TARGETS.protein) * 100));

    // Build Receipt
    let vitalsReceipt = "";
    if (logVitalsList.length > 0) {
      vitalsReceipt = `💊 <b>Active Nutrients Delivered:</b>\n` +
        logVitalsList.map(v => `• <b>${v.split(':')[0]}:</b> ${v.split(':').slice(1).join(':').trim()}`).join("\n") + "\n";
    }

    const hasMacros = ((matched.protein || 0) > 0 || (matched.calories || 0) > 0 || (matched.fats || 0) > 0);
    let macroReceipt = "";
    if (hasMacros) {
      macroReceipt = `• 🥩 +<b>${matched.protein || 0}g</b> Protein • 🥑 +${matched.fats || 0}g Fat\n` +
        `• 🔥 +<b>${matched.calories || 0}</b> kcal\n`;
    }

    const receipt = `⚡ <b>Logged: ${matched.quantity} ${matched.servingUnit} ${matched.brand !== 'Whole Food' ? matched.brand + ' ' : ''}${matched.itemName}</b>\n\n` +
      vitalsReceipt +
      macroReceipt +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📈 <b>Today's Fuel:</b> <b>${Math.round(totalP)}g</b> / ${DAILY_TARGETS.protein}g Protein (${pPct}%)\n` +
      `🔥 <b>Total Calories:</b> ${Math.round(totalCal)} / ${DAILY_TARGETS.calories} kcal\n\n` +
      `👉 View on site: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, receipt, messageId);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Error logging food intake:", err);
    await sendTelegramMessage(chatId, `⚠️ <b>Could not process entry</b>: ${err.message}\nTry texting e.g. <code>1 cap fish oil</code> or <code>1 scoop protein</code>`, messageId);
    return res.status(200).send("OK");
  }
}
