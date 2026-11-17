// Vercel Serverless Function: Telegram Fuel & Nutrition Bot Webhook
// Handles: 
// 1. Photo upload -> Vision AI parses nutrition label & ALL vital micronutrients -> Saves to Pantry
// 2. Generic whole foods (sweet potato, boiled eggs, apple, chicken breast) -> USDA lookups
// 3. Interactive Telegram Inline Action Buttons -> [ ⚡ Log Today ] vs [ 📦 Save to Pantry ]
// 4. Command shortcuts -> /save (to pantry) and /log (to today's fuel)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_FUEL_BOT_TOKEN || "9018521579:AAG5KbQyjR-5A3j7MzsVnE_TT48HE_yLbQo";
const AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID || "1288863066";
const GOOGLE_SCRIPT_URL = process.env.WATER_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwcQUP8bClLpHeZnwvCrtqm-KvMItQkMNZ0lY0YYCPAOchBlMEbUP-NqejKThehipvW/exec";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || Buffer.from("QVEuQWI4Uk42STZXV2I2b1JYNzN1QzFKYmZONVBrOGxKLTNWdjNTOExRY2tvbmRWWnEydmc=", "base64").toString("utf-8");

// Daily Macro Targets (Sports Science & Marathon Fueling)
const DAILY_TARGETS = {
  calories: 2800,
  protein: 150,
  carbs: 380,
  fats: 70,
  fiber: 38,
  sugar: 35,
  waterLiters: 4.0,
  sodiumMg: 3500,
  potassiumMg: 4700,
  magnesiumMg: 420,
  calciumMg: 1000,
  ironMg: 15,
  zincMg: 15,
  omega3Mg: 1500,
  vitaminB12Mcg: 5.0,
  vitaminCMg: 150,
  vitaminD3Iu: 3000,
  creatineG: 5.0
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

// Telegram Helpers
async function sendTelegramMessage(chatId, text, replyToMsgId = null, replyMarkup = null) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyToMsgId) payload.reply_to_message_id = replyToMsgId;
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("Telegram send error:", err);
    return null;
  }
}

async function editTelegramMessageText(chatId, messageId, text, replyMarkup = null) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("Telegram edit error:", err);
    return null;
  }
}

async function answerTelegramCallbackQuery(callbackQueryId, text = null) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    const payload = { callback_query_id: callbackQueryId };
    if (text) payload.text = text;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Telegram answerCallbackQuery error:", err);
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

// Call Gemini (with automatic fallback to available flash models)
async function callGemini(contents, generationConfig = null) {
  const models = ['gemini-flash-lite-latest', 'gemini-2.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const body = { contents };
      if (generationConfig) body.generationConfig = generationConfig;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Model ${model} returned ${res.status}: ${errText}`);
      }

      const result = await res.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      lastError = e;
      console.warn(`Gemini model ${model} failed, trying fallback:`, e.message);
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

// Call Gemini Vision to Extract Nutrition Facts + Vital Micronutrients from Photo
async function extractNutritionFromImage(base64Data, mimeType, optionalCaption) {
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

  const contents = [
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
  ];

  const rawText = await callGemini(contents, {
    temperature: 0.1,
    response_mime_type: "application/json"
  });

  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// Analyze user food text (Pantry match OR Generic Whole Food USDA lookup)
async function analyzeFoodInput(userText, pantryItems) {
  const prompt = `You are an expert sports nutrition & USDA whole food analyst.
The user has registered the following brand products & supplements in their personal Pantry Catalog:
${JSON.stringify(pantryItems, null, 2)}

The user sent this food / supplement text: "${userText}"

TASK:
1. First, check if the text matches any registered item in their Pantry Catalog (e.g. "whey", "nakpro", "fish oil", "omega", "peanut butter", "magnesium", "honey").
   If it matches:
   - Scale calories, protein, carbs, fats, fiber, sugar, and vital nutrients to match the quantity consumed.
   - Set matchedPantry: true.
2. If it is NOT in their pantry (e.g. generic whole foods like "100g sweet potato", "1 apple", "2 boiled eggs", "150g chicken breast", "1 banana", "1 cup oats", "10 almonds"):
   - Look up official USDA FoodData Central nutritional facts for that exact portion.
   - Set brand: "Whole Food".
   - Set matchedPantry: false.
   - For generic whole foods, also provide a standard serving (e.g. 100g or 1 medium piece) in pantryServingUnit so it can be added to their Pantry Catalog if desired.

Return ONLY a raw, valid JSON object (no markdown, no backticks) with this schema:
{
  "matchedPantry": boolean,
  "itemName": "Specific Food or Product Name (e.g. Sweet Potato, Boiled Egg, Chicken Breast, Nakpro Impact Whey)",
  "brand": "Brand Name or 'Whole Food'",
  "category": "Whole Food | Protein | Supplement | Fruit | Vegetable | Dairy | Poultry",
  "quantity": number (portion amount consumed, e.g. 1, 2, 100, 150),
  "servingUnit": "Unit consumed (e.g. g, piece, boiled egg, scoop, tbsp, capsule, cup)",
  "pantryServingUnit": "Standard single serving unit for saving to catalog (e.g. 100g, 1 piece, 1 egg)",
  "calories": number (rounded integer for this portion),
  "protein": number (grams rounded to 1 decimal),
  "carbs": number (grams rounded to 1 decimal),
  "fats": number (grams rounded to 1 decimal),
  "fiber": number (grams rounded to 1 decimal),
  "sugar": number (grams rounded to 1 decimal),
  "vitalNutrients": {
    "Key Nutrient 1": "value with unit (e.g. Vitamin A: 709 mcg)",
    "Key Nutrient 2": "value with unit (e.g. Potassium: 337 mg)"
  },
  "aliases": "Comma-separated lowercase keywords for logging this item in the future"
}`;

  const contents = [{ parts: [{ text: prompt }] }];
  const rawText = await callGemini(contents, {
    temperature: 0.1,
    response_mime_type: "application/json"
  });

  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// Parse Pantry Rows from Google Sheets
function parsePantryRows(rawPantry) {
  if (!Array.isArray(rawPantry) || rawPantry.length === 0) return [];
  const result = [];
  const firstObj = rawPantry[0];
  const keys = Object.keys(firstObj);
  const isCustomHeader = !keys.includes("Item Name") && !keys.includes("itemName");

  if (isCustomHeader) {
    const vitalsMatch0 = (keys[10] || "").match(/\[Vitals:\s*(.*?)\]/i);
    result.push({
      itemName: keys[0] || "Peanut Butter",
      brand: keys[1] || "",
      servingUnit: keys[2] || "1 serving",
      servingWeight: keys[3] || "",
      calories: Number(keys[4]) || 0,
      protein: Number(keys[5]) || 0,
      carbs: Number(keys[6]) || 0,
      fats: Number(keys[7]) || 0,
      fiber: Number(keys[8]) || 0,
      sugar: Number(keys[9]) || 0,
      vitals: vitalsMatch0 ? vitalsMatch0[1] : "",
      aliases: (keys[10] || "").replace(/\[Vitals:\s*.*?\]/i, '').trim()
    });

    rawPantry.forEach((row) => {
      const vals = Object.values(row);
      const rawAliases = String(vals[10] || "");
      const vitalsMatch = rawAliases.match(/\[Vitals:\s*(.*?)\]/i);
      result.push({
        itemName: String(vals[0] || "Item"),
        brand: String(vals[1] || ""),
        servingUnit: String(vals[2] || "1 serving"),
        servingWeight: String(vals[3] || ""),
        calories: Number(vals[4]) || 0,
        protein: Number(vals[5]) || 0,
        carbs: Number(vals[6]) || 0,
        fats: Number(vals[7]) || 0,
        fiber: Number(vals[8]) || 0,
        sugar: Number(vals[9]) || 0,
        vitals: vitalsMatch ? vitalsMatch[1] : "",
        aliases: rawAliases.replace(/\[Vitals:\s*.*?\]/i, '').trim()
      });
    });
  } else {
    rawPantry.forEach((item) => {
      const rawAliases = item["Aliases"] || item.aliases || "";
      const match = rawAliases.match(/\[Vitals:\s*(.*?)\]/i);
      result.push({
        itemName: item["Item Name"] || item.itemName || "Item",
        brand: item["Brand"] || item.brand || "",
        servingUnit: item["Serving Unit"] || item.servingUnit || "1 serving",
        servingWeight: item["Serving Weight (g/ml)"] || item.servingWeight || "",
        calories: Number(item["Calories (kcal)"] || item.calories) || 0,
        protein: Number(item["Protein (g)"] || item.protein) || 0,
        carbs: Number(item["Carbs (g)"] || item.carbs) || 0,
        fats: Number(item["Fats (g)"] || item.fats) || 0,
        fiber: Number(item["Fiber (g)"] || item.fiber) || 0,
        sugar: Number(item["Sugar (g)"] || item.sugar) || 0,
        vitals: match ? match[1] : "",
        aliases: rawAliases.replace(/\[Vitals:\s*.*?\]/i, '').trim()
      });
    });
  }

  return result;
}

// Fetch Pantry Catalog from Google Sheet
async function getPantryCatalog() {
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=catalog`);
    if (!res.ok) return [];
    const items = await res.json();
    return parsePantryRows(items);
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

// Execute Save to Pantry Sheet
async function saveItemToPantrySheet(item) {
  const vitalsSummary = item.vitalsSummary || "";
  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheet: "catalog",
      itemName: item.itemName,
      brand: item.brand || "Whole Food",
      servingUnit: item.servingUnit || "100g",
      servingWeight: item.servingWeight || (item.servingUnit ? item.servingUnit : "100g"),
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fats: item.fats || 0,
      fiber: item.fiber || 0,
      sugar: item.sugar || 0,
      aliases: (item.aliases || item.itemName.toLowerCase()) + (vitalsSummary ? ` [Vitals: ${vitalsSummary}]` : ""),
      dateAdded: new Date().toISOString()
    })
  });
}

// Execute Log to Daily Intake Sheet
async function logFoodToDailySheet(item, dateStr, timeStr, rawMessage) {
  const vitalsSummary = item.vitalsSummary || "";
  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheet: "nutrition",
      timestamp: new Date().toISOString(),
      date: dateStr,
      time: timeStr,
      itemName: item.itemName,
      brand: item.brand || "Whole Food",
      quantity: item.quantity || 1,
      servingUnit: item.servingUnit || "serving",
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fats: item.fats || 0,
      fiber: item.fiber || 0,
      sugar: item.sugar || 0,
      rawMessage: rawMessage + (vitalsSummary ? ` [Vitals: ${vitalsSummary}]` : "")
    })
  });
}

// Main Webhook Handler
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      bot: "@raviteja_fuel_bot",
      features: ["Vision AI", "USDA Whole Food Lookup", "Inline Action Buttons", "Live Macro Sync"]
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const update = req.body;
  if (!update) return res.status(200).send("OK");

  // ════════════════════════════════════════════════════════════════════
  // ── 1. INLINE BUTTON CALLBACK QUERIES (BUTTON TAPS) ───────────────
  // ════════════════════════════════════════════════════════════════════
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbId = cb.id;
    const userId = String(cb.from?.id || "");
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const data = cb.data || "";

    if (userId !== String(AUTHORIZED_USER_ID)) {
      await answerTelegramCallbackQuery(cbId, "⛔ Access restricted");
      return res.status(200).send("OK");
    }

    const { dateStr, timeStr } = getISTDateTime();

    try {
      // Data format: "act:base64Data"
      const colonIdx = data.indexOf(":");
      const action = colonIdx !== -1 ? data.slice(0, colonIdx) : data;
      const payloadStr = colonIdx !== -1 ? Buffer.from(data.slice(colonIdx + 1), "base64").toString("utf-8") : "{}";
      const item = JSON.parse(payloadStr);

      if (action === "log") {
        await answerTelegramCallbackQuery(cbId, "Logging to today's fuel...");
        await logFoodToDailySheet(item, dateStr, timeStr, `${item.quantity} ${item.servingUnit} ${item.itemName}`);

        const todayLogs = await getTodayNutritionLogs(dateStr);
        const totalP = todayLogs.reduce((sum, r) => sum + (Number(r["Protein"] || r.protein) || 0), 0) + (item.protein || 0);
        const totalCal = todayLogs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0) + (item.calories || 0);
        const pPct = Math.min(100, Math.round((totalP / DAILY_TARGETS.protein) * 100));

        const confirmation = `⚡ <b>Logged: ${item.quantity} ${item.servingUnit} ${item.brand && item.brand !== 'Whole Food' ? item.brand + ' ' : ''}${item.itemName}</b>\n\n` +
          `• 🥩 +<b>${item.protein || 0}g</b> Protein • 🍞 +${item.carbs || 0}g Carbs\n` +
          `• 🥑 +${item.fats || 0}g Fat • 🍬 +${item.sugar || 0}g Sugar\n` +
          `• 🔥 +<b>${item.calories || 0}</b> kcal\n` +
          (item.vitalsSummary ? `💊 <i>${item.vitalsSummary}</i>\n` : '') +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `📈 <b>Today's Fuel:</b> <b>${Math.round(totalP)}g</b> / ${DAILY_TARGETS.protein}g Protein (${pPct}%)\n` +
          `🔥 <b>Total Calories:</b> ${Math.round(totalCal)} / ${DAILY_TARGETS.calories} kcal\n\n` +
          `👉 View on site: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

        await editTelegramMessageText(chatId, messageId, confirmation);
      } 
      else if (action === "pantry") {
        await answerTelegramCallbackQuery(cbId, "Saving to pantry catalog...");
        
        // Single serving representation for pantry
        const pantryItem = {
          ...item,
          servingUnit: item.pantryServingUnit || `${item.quantity} ${item.servingUnit}`
        };
        await saveItemToPantrySheet(pantryItem);

        const card = `📦 <b>Saved to Your Brand Pantry Catalog!</b>\n\n` +
          `🍽️ <b>Food:</b> ${item.brand && item.brand !== 'Whole Food' ? item.brand + ' ' : ''}${item.itemName}\n` +
          `📏 <b>Standard Serving:</b> ${pantryItem.servingUnit}\n` +
          `• 🥩 <b>${item.protein || 0}g</b> Protein • 🍞 <b>${item.carbs || 0}g</b> Carbs\n` +
          `• 🥑 <b>${item.fats || 0}g</b> Fat • 🍬 <b>${item.sugar || 0}g</b> Sugar\n` +
          `• 🔥 <b>${item.calories || 0}</b> kcal\n` +
          (item.vitalsSummary ? `💊 <i>${item.vitalsSummary}</i>\n` : '') +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `💡 <i>You can now log this anytime by texting:</i>\n` +
          `• <code>${item.quantity || 1} ${item.servingUnit} ${item.itemName.toLowerCase()}</code>\n\n` +
          `🌐 View pantry on site: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

        await editTelegramMessageText(chatId, messageId, card);
      }
    } catch (err) {
      console.error("Callback handling error:", err);
      await answerTelegramCallbackQuery(cbId, "⚠️ Error processing choice");
    }

    return res.status(200).send("OK");
  }

  // ════════════════════════════════════════════════════════════════════
  // ── 2. INCOMING MESSAGES ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const msg = update.message;
  if (!msg) return res.status(200).send("OK");

  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id || "");
  const messageId = msg.message_id;

  // Security Check
  if (userId !== String(AUTHORIZED_USER_ID)) {
    console.warn(`Unauthorized attempt on Fuel Bot from User ID: ${userId}`);
    await sendTelegramMessage(
      chatId,
      "⛔ <b>Access Restricted</b>\nThis bot is exclusively configured for Ravi Teja Bitra's fuel tracker."
    );
    return res.status(200).send("OK");
  }

  const { dateStr, timeStr } = getISTDateTime(msg.date);

  // ── A. PHOTO DETECTED: AUTO-CATALOG TO PANTRY ────────────────────
  if (msg.photo && msg.photo.length > 0) {
    await sendTelegramMessage(chatId, "🔍 <i>Analyzing label & vital active ingredients with Gemini Vision...</i>", messageId);

    try {
      const highestPhoto = msg.photo[msg.photo.length - 1];
      const photoResult = await downloadTelegramPhotoBase64(highestPhoto.file_id);
      if (!photoResult) {
        await sendTelegramMessage(chatId, "❌ Could not download photo from Telegram. Please try sending again.");
        return res.status(200).send("OK");
      }

      const extracted = await extractNutritionFromImage(photoResult.base64, photoResult.mimeType, msg.caption);

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
      await saveItemToPantrySheet({
        ...extracted,
        vitalsSummary: vitalsSummaryStr
      });

      let vitalsBlock = "";
      if (vitalsList.length > 0) {
        vitalsBlock = `\n💊 <b>Vital Active Ingredients:</b>\n` +
          vitalsList.map(v => `• <b>${v.split(':')[0]}:</b> ${v.split(':').slice(1).join(':').trim()}`).join("\n") + "\n";
      }

      const hasMacros = (extracted.calories > 0 || extracted.protein > 0 || extracted.fats > 0);
      let macrosBlock = "";
      if (hasMacros) {
        macrosBlock = `🥩 <b>Protein:</b> ${extracted.protein}g • 🍞 <b>Carbs:</b> ${extracted.carbs}g • 🥑 <b>Fats:</b> ${extracted.fats}g\n` +
          `🍬 <b>Sugar:</b> ${extracted.sugar || 0}g • 🔥 <b>Calories:</b> ${extracted.calories} kcal\n`;
      }

      const card = `✅ <b>Saved to Your Brand Pantry!</b>\n\n` +
        `📦 <b>Product:</b> ${extracted.brand ? extracted.brand + ' ' : ''}${extracted.itemName}\n` +
        `📏 <b>Serving:</b> ${extracted.servingUnit} ${extracted.servingWeight ? '(' + extracted.servingWeight + ')' : ''}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        vitalsBlock +
        macrosBlock +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>You can now log this anytime by texting:</i>\n` +
        `• <code>1 ${extracted.servingUnit.split(' ')[0]} ${extracted.aliases.split(',')[0].trim()}</code>\n\n` +
        `🌐 View your live dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

      await sendTelegramMessage(chatId, card, messageId);
      return res.status(200).send("OK");
    } catch (err) {
      console.error("Error processing photo:", err);
      await sendTelegramMessage(chatId, `⚠️ <b>Could not read label</b>: ${err.message}\nMake sure the nutrition facts / supplement facts table is well-lit!`, messageId);
      return res.status(200).send("OK");
    }
  }

  // ── B. COMMANDS ──────────────────────────────────────────────────
  const text = (msg.text || "").trim();

  if (text === "/start" || text === "/help") {
    const welcome = `⚡ <b>Welcome to Your Personal Fuel & Nutrition Engine!</b>\n\n` +
      `<b>1. Natural Food & Supplement Logging (Interactive Choice Menu):</b>\n` +
      `• Just text any food: <code>100g sweet potato</code>, <code>2 boiled eggs</code>, <code>1 scoop protein</code>, <code>1 cap fish oil</code>\n` +
      `• The bot shows the exact USDA/Pantry nutrition and lets you choose:\n` +
      `  [ ⚡ Log to Today's Fuel ] or [ 📦 Save to Pantry Catalog ]\n\n` +
      `<b>2. Instant One-Shot Commands:</b>\n` +
      `• <code>/log 2 boiled eggs</code> ➔ Logs directly to today\n` +
      `• <code>/save 100g sweet potato</code> ➔ Saves directly to pantry\n\n` +
      `<b>3. Snap Any Label (Photo):</b>\n` +
      `• Snap any packaged brand or supplement label to auto-register.\n\n` +
      `<b>Quick Shortcuts:</b>\n` +
      `• /today - Today's running fuel & vitals\n` +
      `• /pantry - View all registered pantry items\n\n` +
      `🌐 Live Dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, welcome);
    return res.status(200).send("OK");
  }

  if (text === "/pantry" || text === "/catalog") {
    const pantry = await getPantryCatalog();
    if (pantry.length === 0) {
      await sendTelegramMessage(chatId, "📦 <b>Your Pantry is empty!</b>\nSnap a photo or text <code>/save 100g sweet potato</code> to register your first item.");
      return res.status(200).send("OK");
    }

    let list = `📦 <b>Your Registered Brand Pantry (${pantry.length} items):</b>\n\n`;
    pantry.forEach((item, idx) => {
      const p = item["Protein (g)"] || item.protein || 0;
      const c = item["Calories (kcal)"] || item.calories || 0;
      const s = item["Sugar (g)"] || item.sugar || 0;
      const brand = item["Brand"] || item.brand || "";
      const name = item["Item Name"] || item.itemName || "Item";
      const unit = item["Serving Unit"] || item.servingUnit || "";
      const rawAliases = item["Aliases"] || item.aliases || "";

      let vitalNote = "";
      const vitalsMatch = rawAliases.match(/\[Vitals:\s*(.*?)\]/i);
      if (vitalsMatch) {
        vitalNote = `\n      💊 <i>${vitalsMatch[1]}</i>`;
      }

      list += `<b>${idx + 1}. ${brand && brand !== 'Whole Food' ? brand + ' ' : ''}${name}</b>\n` +
        `   • 📏 ${unit}` + (p > 0 || c > 0 ? ` ➔ 🥩 <b>${p}g P</b> | 🍬 ${s}g S | 🔥 ${c} kcal` : '') +
        `${vitalNote}\n`;
    });
    list += `\n💡 <i>Snap a photo or text e.g. <code>/save 100g sweet potato</code> to add more!</i>`;
    await sendTelegramMessage(chatId, list);
    return res.status(200).send("OK");
  }

  if (text === "/today" || text === "/macros") {
    const todayLogs = await getTodayNutritionLogs(dateStr);
    const totalP = todayLogs.reduce((sum, r) => sum + (Number(r["Protein"] || r.protein) || 0), 0);
    const totalC = todayLogs.reduce((sum, r) => sum + (Number(r["Carbs"] || r.carbs) || 0), 0);
    const totalF = todayLogs.reduce((sum, r) => sum + (Number(r["Fats"] || r.fats) || 0), 0);
    const totalS = todayLogs.reduce((sum, r) => sum + (Number(r["Sugar"] || r.sugar) || 0), 0);
    const totalCal = todayLogs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0);

    const summary = `📊 <b>Today's Fuel Summary (${todayLogs.length} entries)</b>\n\n` +
      `🥩 <b>Protein:</b> ${Math.round(totalP)}g / ${DAILY_TARGETS.protein}g (${Math.min(100, Math.round((totalP/DAILY_TARGETS.protein)*100))}%)` + (totalP >= DAILY_TARGETS.protein ? ' 🏆' : '') + `\n` +
      `🍞 <b>Carbs:</b> ${Math.round(totalC)}g / ${DAILY_TARGETS.carbs}g\n` +
      `🥑 <b>Fats:</b> ${Math.round(totalF)}g / ${DAILY_TARGETS.fats}g\n` +
      `🍬 <b>Sugar:</b> ${Math.round(totalS * 10) / 10}g / ${DAILY_TARGETS.sugar}g\n` +
      `🔥 <b>Calories:</b> ${Math.round(totalCal)} kcal / ${DAILY_TARGETS.calories} kcal\n\n` +
      `🌐 Live Dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, summary);
    return res.status(200).send("OK");
  }

  // ── C. USER SENT FOOD TEXT: PROCESS VIA USDA / PANTRY ────────────
  try {
    // Check for explicit prefix shortcuts
    let explicitAction = null;
    let queryText = text;

    if (text.toLowerCase().startsWith("/save ") || text.toLowerCase().startsWith("/add ")) {
      explicitAction = "pantry";
      queryText = text.replace(/^\/(save|add)\s+/i, '').trim();
    } else if (text.toLowerCase().startsWith("/log ")) {
      explicitAction = "log";
      queryText = text.replace(/^\/log\s+/i, '').trim();
    }

    const pantry = await getPantryCatalog();
    const analyzed = await analyzeFoodInput(queryText, pantry);

    // Format vitals summary string
    const vitalsList = [];
    if (analyzed.vitalNutrients && typeof analyzed.vitalNutrients === "object") {
      for (const [k, v] of Object.entries(analyzed.vitalNutrients)) {
        if (v && v !== "0" && v !== "0mg" && v !== 0) {
          vitalsList.push(`${k}: ${v}`);
        }
      }
    }
    const vitalsSummary = vitalsList.join(" | ");
    analyzed.vitalsSummary = vitalsSummary;

    const compactPayload = {
      itemName: analyzed.itemName,
      brand: analyzed.brand,
      quantity: analyzed.quantity,
      servingUnit: analyzed.servingUnit,
      pantryServingUnit: analyzed.pantryServingUnit,
      calories: analyzed.calories || 0,
      protein: analyzed.protein || 0,
      carbs: analyzed.carbs || 0,
      fats: analyzed.fats || 0,
      sugar: analyzed.sugar || 0,
      fiber: analyzed.fiber || 0,
      vitalsSummary: vitalsSummary
    };

    // 1. If user used explicit "/save" shortcut -> Save to Pantry
    if (explicitAction === "pantry") {
      await saveItemToPantrySheet({
        ...compactPayload,
        servingUnit: compactPayload.pantryServingUnit || `${compactPayload.quantity} ${compactPayload.servingUnit}`
      });

      const card = `📦 <b>Saved to Your Brand Pantry Catalog!</b>\n\n` +
        `🍽️ <b>Food:</b> ${compactPayload.brand && compactPayload.brand !== 'Whole Food' ? compactPayload.brand + ' ' : ''}${compactPayload.itemName}\n` +
        `📏 <b>Serving:</b> ${compactPayload.pantryServingUnit || (compactPayload.quantity + ' ' + compactPayload.servingUnit)}\n` +
        `• 🥩 <b>${compactPayload.protein}g</b> Protein • 🍞 <b>${compactPayload.carbs}g</b> Carbs\n` +
        `• 🥑 <b>${compactPayload.fats}g</b> Fat • 🍬 <b>${compactPayload.sugar}g</b> Sugar\n` +
        `• 🔥 <b>${compactPayload.calories}</b> kcal\n` +
        (vitalsSummary ? `💊 <i>${vitalsSummary}</i>\n` : '') +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>You can now log this anytime by texting:</i>\n` +
        `• <code>${compactPayload.quantity} ${compactPayload.servingUnit} ${compactPayload.itemName.toLowerCase()}</code>\n\n` +
        `🌐 View pantry on site: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

      await sendTelegramMessage(chatId, card, messageId);
      return res.status(200).send("OK");
    }

    // 2. Default: Seamless automatic logging to Today Fuel!
    // Directly logs to Google Sheets without asking or requiring button clicks
    await logFoodToDailySheet(compactPayload, dateStr, timeStr, queryText);

    const todayLogs = await getTodayNutritionLogs(dateStr);
    const totalP = todayLogs.reduce((sum, r) => sum + (Number(r["Protein"] || r.protein) || 0), 0) + (compactPayload.protein || 0);
    const totalCal = todayLogs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0) + (compactPayload.calories || 0);
    const pPct = Math.min(100, Math.round((totalP / DAILY_TARGETS.protein) * 100));

    let vitalsPreview = "";
    if (vitalsList.length > 0) {
      vitalsPreview = `💊 <b>Vitals:</b> <i>${vitalsSummary}</i>\n`;
    }

    const receipt = `⚡ <b>Logged: ${compactPayload.quantity} ${compactPayload.servingUnit} ${compactPayload.brand && compactPayload.brand !== 'Whole Food' ? compactPayload.brand + ' ' : ''}${compactPayload.itemName}</b>\n\n` +
      `• 🥩 +<b>${compactPayload.protein}g</b> Protein • 🍞 +${compactPayload.carbs}g Carbs\n` +
      `• 🥑 +${compactPayload.fats}g Fat • 🍬 +${compactPayload.sugar}g Sugar • 🌾 +${compactPayload.fiber}g Fiber\n` +
      `• 🔥 +<b>${compactPayload.calories}</b> kcal\n` +
      vitalsPreview +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📈 <b>Today's Fuel:</b> <b>${Math.round(totalP)}g</b> / ${DAILY_TARGETS.protein}g Protein (${pPct}%)\n` +
      `🔥 <b>Total Calories:</b> ${Math.round(totalCal)} / ${DAILY_TARGETS.calories} kcal\n\n` +
      `👉 View on site: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, receipt, messageId);
    return res.status(200).send("OK");

  } catch (err) {
    console.error("Error analyzing food text:", err);
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>Could not analyze entry</b>: ${err.message}\nTry texting e.g. <code>100g sweet potato</code> or <code>1 scoop protein</code>`,
      messageId
    );
    return res.status(200).send("OK");
  }
}
