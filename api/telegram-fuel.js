// Vercel Serverless Function: Telegram Fuel & Nutrition Bot Webhook
// Handles: 
// 1. Photo upload -> Vision AI parses nutrition label & ALL vital micronutrients -> Saves to Pantry
// 2. Generic whole foods (sweet potato, boiled eggs, apple, chicken breast) -> USDA lookups
// 3. Interactive Telegram Inline Action Buttons -> [ ⚡ Log Today ] vs [ 📦 Save to Pantry ]
// 4. Command shortcuts -> /save (to pantry) and /log (to today's fuel)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_FUEL_BOT_TOKEN || Buffer.from("OTAxODUyMTU3OTpBQUh0OEdwdGdNNGowb0lmdy1udlg1bGpWZFhEUWZvai1YWQ==", "base64").toString("utf-8");
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

// In-Memory cache for pending food choices (to stay strictly within Telegram's 64-byte callback_data limit)
const _pendingFoods = new Map();

function storePendingFood(item) {
  const id = Math.random().toString(36).substring(2, 8);
  _pendingFoods.set(id, item);
  setTimeout(() => _pendingFoods.delete(id), 30 * 60 * 1000);

  // Encode safe fallback into string: "id:P_C_F_Cal_Qty_Name" (<45 chars total)
  const shortName = encodeURIComponent((item.itemName || "Item").slice(0, 20));
  return `${id}:${item.protein || 0}_${item.carbs || 0}_${item.fats || 0}_${item.calories || 0}_${item.quantity || 1}_${shortName}`;
}

function resolvePendingFood(paramStr) {
  if (!paramStr) return null;
  const colonIdx = paramStr.indexOf(":");
  const id = colonIdx !== -1 ? paramStr.slice(0, colonIdx) : paramStr;

  if (_pendingFoods.has(id)) {
    return _pendingFoods.get(id);
  }

  // Fallback if container was cold-started
  if (colonIdx !== -1) {
    const parts = paramStr.slice(colonIdx + 1).split("_");
    if (parts.length >= 6) {
      return {
        protein: parseFloat(parts[0]) || 0,
        carbs: parseFloat(parts[1]) || 0,
        fats: parseFloat(parts[2]) || 0,
        calories: parseFloat(parts[3]) || 0,
        quantity: parseFloat(parts[4]) || 1,
        itemName: decodeURIComponent(parts.slice(5).join("_")),
        servingUnit: "serving",
        brand: "",
        vitalsSummary: ""
      };
    }
  }

  try {
    const json = Buffer.from(paramStr, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch(e) {
    return null;
  }
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
    if (replyToMsgId) {
      payload.reply_to_message_id = replyToMsgId;
      payload.allow_sending_without_reply = true;
    }
    if (replyMarkup) payload.reply_markup = replyMarkup;

    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = await res.json();
    if (!data.ok) {
      console.warn("Telegram sendMessage failed with HTML, retrying plain text:", data.description);
      delete payload.parse_mode;
      payload.text = text.replace(/<[^>]*>/g, '');
      delete payload.reply_to_message_id;
      delete payload.reply_markup; // Strip any invalid buttons on retry so text ALWAYS arrives
      const retryRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      data = await retryRes.json();
    }
    return data;
  } catch (err) {
    console.error("Telegram send error:", err);
    return null;
  }
}

async function sendTelegramChatAction(chatId, action = "typing") {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: action })
    });
  } catch (err) {
    // Non-blocking
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

// Call Gemini (with automatic fallback to available flash models and 6s timeout)
async function callGemini(contents, generationConfig = null) {
  const models = ['gemini-2.5-flash', 'gemini-flash-lite-latest'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const body = { contents };
      if (generationConfig) body.generationConfig = generationConfig;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000)
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
  const prompt = `You are an elite sports nutritionist, culinary scientist, and food vision AI.
Analyze this photo with high mathematical and biological precision.

STEP 1: DETERMINE THE IMAGE TYPE:
- "pantry_label": The photo shows a packaged food nutrition facts table, supplement facts panel, bottle/tub label, or ingredient panel.
- "dish_meal": The photo shows real prepared food, a cooked dish, plate/bowl of food, street food, restaurant meal, fruit, snack, or beverage (e.g. Biryani, Dosa, Chicken Curry, Rice, Roti, Eggs, Salad, Dal, etc.).

STEP 2: IF "dish_meal" (PLATE OF FOOD / PREPARED MEAL / DISH):
${optionalCaption ? `• CRITICAL - USER NOTE / CAPTION PROVIDED: "${optionalCaption}".
  The user typed quantities, weights (e.g. in grams), ingredients, or meal details in their own words.
  TREAT THE USER'S CAPTION AS THE AUTHORITATIVE GROUND TRUTH for:
  - Exact weights/quantities (e.g. "200g chicken curry + 250g cooked rice", "3 rotis", "1 tbsp mustard oil").
  - Specific ingredients, cuts of meat, and cooking oils used.
  Use the photo for visual verification of components, visible sides, raita, salad, and proportions.` : `• No caption provided.
  Visually identify the dish/foods on the plate.
  Estimate the realistic total weight and portion size (in grams and standard household units like "1 plate (~350g)" or "2 medium dosas") based on realistic Indian and global culinary portions.`}
- Calculate accurate sports nutrition values for the entire portion:
  * dishName: Clean, recognizable name of the dish (e.g. "Chicken Biryani with Raita", "Masala Dosa with Sambar", "Chicken Curry with Rice", "Paneer Bhurji with 2 Rotis")
  * portionDescription: Clear summary of portion (e.g. "1 plate (~350g, ~150g chicken + ~200g rice)" or "~200g chicken curry + ~250g rice")
  * ingredientsList: Array of detected or user-specified ingredients with estimated weights (e.g. ["Cooked chicken ~150g", "Cooked white rice ~250g", "Mustard oil ~1 tbsp"])
  * calories: number (total kcal for the portion)
  * protein: number (grams of protein)
  * carbs: number (grams of carbohydrates)
  * fats: number (grams of total fats)
  * fiber: number (grams of dietary fiber)
  * sugar: number (grams of sugar)
  * vitalNutrients: object with key electrolytes & minerals if significant (e.g. {"Sodium": "650 mg", "Potassium": "420 mg", "Iron": "2.5 mg"})

CRITICAL CULINARY ACCURACY FOR STREET FOOD, CHAAT, INDIAN SNACKS & GENERIC FOOD:
- Dahi Puri: 3 pieces contains ONLY ~2.0 to 2.5g protein total (spiced curd, puris, potato filling), ~20-22g carbs, ~3.5-4.5g fat, ~3-4g sugar, ~120-140 kcal. NEVER estimate 7.5g protein for 3 pieces! 6 pieces (1 plate) is ~4.5-5.0g protein, ~240-270 kcal.
- Pani Puri / Golgappa: 6 pieces = ~2.5-3.0g protein, ~30g carbs, ~4g fat, ~2g sugar, ~170-190 kcal.
- Sev Puri: 6 pieces = ~4g protein, ~32g carbs, ~10g fat, ~3g sugar, ~230 kcal.
- Samosa: 1 medium (100g) = ~3.5g protein, ~30g carbs, ~14g fat, ~2g sugar, ~260 kcal.
- REALISTIC SUGAR & PROTEIN:
  * Do NOT inflate sugars for savory street foods. Chutney and curd contribute only 2-4g sugar per plate unless drenched in sugar syrup.
  * Do NOT hallucinate high protein in street food snacks, chaats, or savory pastries.

STEP 3: IF "pantry_label" (PACKAGED NUTRITION / SUPPLEMENT FACTS LABEL):
- Identify official single serving (servingUnit, e.g. "50g", "1 scoop (33g)", "1 capsule", "100g").
- Extract root macros strictly matching that servingUnit (NOT 100g values if serving is 50g!).
- Extract per100g object for 100g values.
- Extract vital active ingredients (Omega-3, EPA, DHA, Elemental Magnesium, Creatine, Multivitamins, Sodium, etc.).

Output ONLY a raw, valid JSON object (without markdown fences, no backticks, no other text) with this exact schema:
{
  "imageType": "dish_meal" | "pantry_label",

  // For "dish_meal":
  "dishName": "Name of the dish or meal",
  "portionDescription": "Portion description with weights",
  "ingredientsList": ["Ingredient 1 with weight", "Ingredient 2 with weight"],

  // For "pantry_label":
  "itemName": "Specific product name",
  "brand": "Brand name",
  "category": "Protein | Supplement | Whole Food | Cereal | Dairy | Other",
  "servingUnit": "Official single serving",
  "servingWeight": "Weight in grams/ml if applicable",
  "per100g": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number,
    "sugar": number,
    "vitalNutrients": {
      "Sodium": "...",
      "Magnesium": "..."
    }
  },
  "aliases": "Comma-separated lowercase keywords",

  // Common to both:
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "fiber": number,
  "sugar": number,
  "vitalNutrients": {
    "Sodium": "...",
    "Potassium": "...",
    "Magnesium": "..."
  }
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

CRITICAL QUANTITY & PORTION SCALING ACCURACY:
1. Parse the user's portion input (e.g. "100g", "50g", "200g", "1 scoop", "2 scoops", "2 boiled eggs", "150g chicken breast", "1 apple").
2. Matching against Pantry:
   - Look at the pantry item's servingUnit and servingWeight.
   - Example 1: Pantry item is "High Protein Oats Chocolate", servingUnit "50g" with 13g protein, 196 kcal, 88mg Magnesium:
     - User texts "100g" (or "100g of pintola protein oats"):
       * Portion = 100g.
       * Multiplier = 100g / 50g = 2.0.
       * Calories = 196 * 2 = 392 kcal.
       * Protein = 13 * 2 = 26g.
       * Carbs = 27.3 * 2 = 54.6g.
       * Fats = 3.9 * 2 = 7.8g.
       * Fiber = 4.8 * 2 = 9.6g.
       * Sugar = 7 * 2 = 14g.
       * Magnesium = 88 * 2 = 176 mg.
       * Sodium = 65 * 2 = 130 mg.
     - User texts "50g" or "1 scoop" or "1 serving":
       * Multiplier = 1.0.
       * Protein = 13g, Calories = 196 kcal, Magnesium = 88mg.
   - Example 2: If an item in pantry is ALREADY registered with servingUnit "100g" (e.g. 100g sweet potato or 100g chicken):
     - If user texts "100g": Multiplier = 1.0! DO NOT DOUBLE IT!
   - ALWAYS SCALE vitalNutrients proportionally with the multiplier!
3. For Generic Whole Foods (sweet potato, boiled eggs, chicken breast, chicken thigh, apple, banana):
   - Standard USDA values:
     * Boiled Egg: 1 egg (50g) = 70 kcal, 6.3g Protein, 0.4g Carbs, 4.8g Fat. (2 eggs = 140 kcal, 12.6g Protein).
     * Chicken Breast (cooked): 100g = 165 kcal, 31g Protein, 0g Carbs, 3.6g Fat. (1 breast ~172g = 284 kcal, 53.4g Protein).
     * Chicken Thigh (cooked): 100g = 179 kcal, 24.8g Protein, 0g Carbs, 8.2g Fat.
     * Boiled Sweet Potato: 100g = 86 kcal, 1.6g Protein, 20g Carbs, 0.1g Fat, 3g Fiber.
     * Apple: 100g = 52 kcal, 0.3g Protein, 13.8g Carbs, 2.4g Fiber. (1 medium apple ~180g = 95 kcal).
     * Banana: 100g = 89 kcal, 1.1g Protein, 22.8g Carbs, 2.6g Fiber, 12.2g Sugar. (1 medium banana ~118g = 105 kcal).
     * White Rice (cooked): 100g = 130 kcal, 2.7g Protein, 28g Carbs, 0.3g Fat.
4. For Street Foods, Chaat, Indian Snacks & Cooked Dishes:
   - Dahi Puri: 3 pieces contains ONLY ~2.0 to 2.5g protein total (spiced curd, puris, potato filling), ~20-22g carbs, ~3.5-4.5g fat, ~3-4g sugar, ~120-140 kcal. NEVER estimate 7.5g protein for 3 pieces! 6 pieces (1 plate) is ~4.5-5.0g protein, ~240-270 kcal.
   - Pani Puri / Golgappa: 6 pieces = ~2.5-3.0g protein, ~30g carbs, ~4g fat, ~2g sugar, ~170-190 kcal.
   - Sev Puri: 6 pieces = ~4g protein, ~32g carbs, ~10g fat, ~3g sugar, ~230 kcal.
   - Samosa: 1 medium (100g) = ~3.5g protein, ~30g carbs, ~14g fat, ~2g sugar, ~260 kcal.
   - REALISTIC SUGAR & PROTEIN:
     * Do NOT inflate sugars for savory street foods. Chutney and curd contribute only 2-4g sugar per plate unless drenched in sugar syrup.
     * Do NOT hallucinate high protein in street food snacks, chaats, or savory pastries.

Return ONLY a raw, valid JSON object (no markdown, no backticks) with this schema:
{
  "matchedPantry": boolean,
  "itemName": "Specific Food or Product Name",
  "brand": "Brand Name or 'Whole Food'",
  "category": "Whole Food | Protein | Supplement | Fruit | Vegetable | Dairy | Poultry",
  "quantity": number (portion amount consumed, e.g. 1, 2, 100, 150),
  "servingUnit": "Unit consumed (e.g. g, piece, boiled egg, scoop, tbsp, capsule, cup)",
  "pantryServingUnit": "Standard single serving unit for saving to catalog (e.g. 50g, 100g, 1 piece, 1 egg)",
  "calories": number (rounded integer for this portion),
  "protein": number (grams rounded to 1 decimal for this portion),
  "carbs": number (grams rounded to 1 decimal for this portion),
  "fats": number (grams rounded to 1 decimal for this portion),
  "fiber": number (grams rounded to 1 decimal for this portion),
  "sugar": number (grams rounded to 1 decimal for this portion),
  "vitalNutrients": {
    "Sodium": "130 mg",
    "Magnesium": "176 mg"
  },
  "aliases": "Comma-separated lowercase keywords"
}`;

  const contents = [{ parts: [{ text: prompt }] }];
  const rawText = await callGemini(contents, {
    temperature: 0.1,
    response_mime_type: "application/json"
  });

  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// Parse EOD Daily Activity, Calories Burned & Sleep Metrics
function parseActivityMetrics(text) {
  if (!text) return null;
  // Clean out square bracket notes like [it will be for yesterday right]
  const clean = text.replace(/\[.*?\]/g, ' ').trim();
  // Normalize commas in numbers e.g. 7,500 -> 7500
  const normalized = clean.replace(/(\d),(\d)/g, (m, p1, p2) => p1 + p2);
  const lines = normalized.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);

  let steps = null;
  let burned = null;
  let sleep = null;

  for (const line of lines) {
    // 1. Steps (e.g. "steps 7000", "7000 steps", "steps: 10k")
    if (steps === null) {
      const m1 = line.match(/(?:^|\b)(?:steps?|step\s*count)[:\s]+([\d.]+)\s*(k)?\b/i);
      const m2 = line.match(/(?:^|\b)([\d.]+)\s*(k)?\s*steps?\b/i);
      const match = m1 || m2;
      if (match) {
        let val = parseFloat(match[1]);
        if (match[2] && match[2].toLowerCase() === 'k') val *= 1000;
        if (!isNaN(val) && val > 0) steps = Math.round(val);
      }
    }

    // 2. Calories Burned (e.g. "calories burned 300", "burned 300", "burn 350 kcal", "active calories 400")
    if (burned === null) {
      const m1 = line.match(/(?:^|\b)(?:calories?\s*burned|cal\s*burned|active\s*calories?|active\s*burn|burned|burn)[:\s]+([\d.]+)\s*(?:kcal|calories|cals)?\b/i);
      const m2 = line.match(/(?:^|\b)([\d.]+)\s*(?:kcal|calories|cals)?\s*(?:calories?\s*burned|cal\s*burned|burned)\b/i);
      const match = m1 || m2;
      if (match) {
        let val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) burned = Math.round(val);
      }
    }

    // 3. Sleep (e.g. "sleep 7hrs", "sleep 7.5 hrs", "slept 7 hours 30 mins", "sleep 7h", "sleep 8")
    if (sleep === null) {
      const m1 = line.match(/(?:^|\b)(?:sleep|slept)[:\s]+([\d.]+)\s*(?:hrs?|hours?|h)?(?:\s*(\d+)\s*(?:mins?|m))?\b/i);
      const m2 = line.match(/(?:^|\b)([\d.]+)\s*(?:hrs?|hours?|h)\s*(?:of\s*)?(?:sleep|slept)\b/i);
      const match = m1 || m2;
      if (match) {
        let h = parseFloat(match[1]);
        let mins = parseFloat(match[2] || 0);
        if (!isNaN(h) && h > 0) {
          if (!isNaN(mins) && mins > 0) h = h + (mins / 60);
          sleep = Math.round(h * 10) / 10;
        }
      }
    }
  }

  if (steps !== null || burned !== null || sleep !== null) {
    return { steps, burned, sleep };
  }
  return null;
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

// Fetch Pantry Catalog from Google Sheet (with In-Memory Caching for Instant Responses)
let _pantryCache = null;
let _pantryCacheTime = 0;

async function getPantryCatalog() {
  const now = Date.now();
  if (_pantryCache && (now - _pantryCacheTime < 15 * 60 * 1000)) {
    return _pantryCache;
  }
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=catalog`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return _pantryCache || [];
    const items = await res.json();
    const parsed = parsePantryRows(items);
    if (parsed.length > 0) {
      _pantryCache = parsed;
      _pantryCacheTime = now;
    }
    return parsed;
  } catch (err) {
    console.error("Error fetching pantry catalog:", err.message);
    return _pantryCache || [];
  }
}

// Fetch Today's Nutrition Logs (Fast Path: checks local API first, falls back to raw sheet)
async function getTodayNutritionLogs(todayDateStr) {
  try {
    const res = await fetch("https://www.ravitejabitra.in/api/nutrition-data", { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.todayLogs) && data.todayLogs.length > 0) {
        return data.todayLogs.map(l => ({
          protein: l.protein || 0,
          calories: l.calories || 0
        }));
      }
    }
  } catch (e) {
    // Fall back to direct sheet
  }

  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=nutrition`, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items.map(r => {
      const vals = Object.values(r);
      let rawTimestamp = r["Timestamp"] || r.timestamp || r["Date"] || r.date || r[" "] || vals[0] || "";
      let rawMsg = r["Raw Message"] || r.rawMessage || r[""] || vals[1] || vals[0] || "";
      if (typeof rawTimestamp === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(rawTimestamp) && /^\d{4}-\d{2}-\d{2}/.test(rawMsg)) {
        const tmp = rawTimestamp; rawTimestamp = rawMsg; rawMsg = tmp;
      }
      const dStr = normalizeToISTDateStr(rawTimestamp);
      if (dStr !== todayDateStr) return null;

      const pMatch = String(rawMsg).match(/([\d.]+)\s*g\s*P\b/i);
      const calMatch = String(rawMsg).match(/([\d.]+)\s*(?:kcal|calories)\b/i);
      return {
        protein: pMatch ? parseFloat(pMatch[1]) : (Number(r["Protein"] || r.protein) || 0),
        calories: calMatch ? parseFloat(calMatch[1]) : (Number(r["Calories"] || r.calories) || 0)
      };
    }).filter(Boolean);
  } catch (err) {
    console.error("Error fetching nutrition logs:", err.message);
    return [];
  }
}

// Fetch Rich Food Logs for Today (with macro details for interactive editing)
async function getTodayFoodLogs(todayDateStr) {
  try {
    const res = await fetch("https://www.ravitejabitra.in/api/nutrition-data", { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.todayLogs) && data.todayLogs.length > 0) {
        return data.todayLogs;
      }
    }
  } catch (e) {
    console.warn("Could not fetch from nutrition-data API, reading raw sheet:", e.message);
  }

  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=nutrition`, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const logs = [];
    for (const r of items) {
      const vals = Object.values(r);
      let rawTimestamp = r["Timestamp"] || r.timestamp || r["Date"] || r.date || r[" "] || vals[0] || "";
      let rawMsg = String(r["Raw Message"] || r.rawMessage || r[""] || vals[1] || vals[0] || "");
      if (typeof rawTimestamp === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(rawTimestamp) && /^\d{4}-\d{2}-\d{2}/.test(rawMsg)) {
        const tmp = rawTimestamp; rawTimestamp = rawMsg; rawMsg = tmp;
      }
      const dStr = normalizeToISTDateStr(rawTimestamp);
      if (dStr !== todayDateStr) continue;

      if (rawMsg.includes("[DELETE_LAST]") || rawMsg.includes("[ACTIVITY_METRICS:") || /^(can you\s+)?delete\b/i.test(rawMsg)) {
        if (rawMsg.includes("[DELETE_LAST]") && logs.length > 0) logs.pop();
        continue;
      }

      const delMatch = rawMsg.match(/\[DELETE_ITEM:\s*(.*?)\]/i);
      if (delMatch) {
        const tgt = delMatch[1].toLowerCase().trim();
        for (let k = logs.length - 1; k >= 0; k--) {
          if ((logs[k].itemName || "").toLowerCase().includes(tgt) || tgt.includes((logs[k].itemName || "").toLowerCase())) {
            logs.splice(k, 1);
            break;
          }
        }
        continue;
      }

      const updMatch = rawMsg.match(/\[UPDATE_ITEM:\s*([^|]+)\s*\|\s*(\{.*?\})\]/i);
      if (updMatch) {
        const tgt = updMatch[1].toLowerCase().trim();
        try {
          const patch = JSON.parse(updMatch[2]);
          for (let k = logs.length - 1; k >= 0; k--) {
            if ((logs[k].itemName || "").toLowerCase().includes(tgt) || tgt.includes((logs[k].itemName || "").toLowerCase())) {
              if (patch.quantity !== undefined) logs[k].quantity = Number(patch.quantity);
              if (patch.protein !== undefined) logs[k].protein = Number(patch.protein);
              if (patch.carbs !== undefined) logs[k].carbs = Number(patch.carbs);
              if (patch.fats !== undefined) logs[k].fats = Number(patch.fats);
              if (patch.sugar !== undefined) logs[k].sugar = Number(patch.sugar);
              if (patch.fiber !== undefined) logs[k].fiber = Number(patch.fiber);
              if (patch.calories !== undefined) logs[k].calories = Number(patch.calories);
              break;
            }
          }
        } catch (e) {}
        continue;
      }

      let p = Number(r["Protein"] || r.protein) || 0;
      let c = Number(r["Carbs"] || r.carbs) || 0;
      let f = Number(r["Fats"] || r.fats) || 0;
      let cal = Number(r["Calories"] || r.calories) || 0;
      let s = Number(r["Sugar"] || r.sugar) || 0;
      let fib = Number(r["Fiber"] || r.fiber) || 0;

      const pMatch = rawMsg.match(/([\d.]+)\s*g\s*P\b/i);
      const cMatch = rawMsg.match(/([\d.]+)\s*g\s*C\b/i);
      const fMatch = rawMsg.match(/([\d.]+)\s*g\s*F\b/i);
      const calMatch = rawMsg.match(/([\d.]+)\s*(?:kcal|calories)\b/i);
      const sMatch = rawMsg.match(/([\d.]+)\s*g\s*(?:Sug|Sugar)\b/i);
      const fibMatch = rawMsg.match(/([\d.]+)\s*g\s*(?:Fib|Fiber)\b/i);

      if (pMatch) p = parseFloat(pMatch[1]);
      if (cMatch) c = parseFloat(cMatch[1]);
      if (fMatch) f = parseFloat(fMatch[1]);
      if (calMatch) cal = parseFloat(calMatch[1]);
      if (sMatch) s = parseFloat(sMatch[1]);
      if (fibMatch) fib = parseFloat(fibMatch[1]);

      let itemName = r["Item Name"] || r.itemName || "";
      if (!itemName) {
        const parts = rawMsg.split('|').map(x => x.trim());
        itemName = parts.length > 1 ? parts[1] : parts[0];
      }

      logs.push({
        itemName: String(itemName).trim(),
        brand: String(r["Brand"] || r.brand || ""),
        quantity: Number(r["Quantity"] || r.quantity) || 1,
        servingUnit: String(r["Serving Unit"] || r.servingUnit || "serving"),
        calories: Math.round(cal),
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fats: Math.round(f * 10) / 10,
        sugar: Math.round(s * 10) / 10,
        fiber: Math.round(fib * 10) / 10
      });
    }
    return logs;
  } catch (err) {
    console.error("Error reading food logs:", err);
    return [];
  }
}

// Execute Save to Pantry Sheet
async function saveItemToPantrySheet(item) {
  _pantryCache = null;
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
  const structuredMsg = `${rawMessage} | ${item.brand && item.brand !== 'Whole Food' ? item.brand + ' ' : ''}${item.itemName} | ${item.protein}g P | ${item.carbs}g C | ${item.fats}g F | ${item.fiber}g Fib | ${item.sugar}g Sug | ${item.calories} kcal${vitalsSummary ? ` [Vitals: ${vitalsSummary}]` : ''}`;

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
      rawMessage: structuredMsg
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
      // Data format: "act:base64Data" or "act:target"
      const colonIdx = data.indexOf(":");
      const action = colonIdx !== -1 ? data.slice(0, colonIdx) : data;

      if (action === "log") {
        const item = resolvePendingFood(data.slice(colonIdx + 1));
        if (!item) {
          await answerTelegramCallbackQuery(cbId, "⚠️ Item expired or not found. Please re-send the food text!");
          return res.status(200).send("OK");
        }
        await answerTelegramCallbackQuery(cbId, "Logging to today's fuel...");
        const logPromise = logFoodToDailySheet(item, dateStr, timeStr, `${item.quantity} ${item.servingUnit} ${item.itemName}`);

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

        const replyMarkup = {
          inline_keyboard: [
            [
              { text: `✏️ Adjust Macros / Portions`, callback_data: `pick_edit:${encodeURIComponent(item.itemName)}` },
              { text: `🗑️ Delete`, callback_data: `del:${encodeURIComponent(item.itemName)}` }
            ]
          ]
        };

        await editTelegramMessageText(chatId, messageId, confirmation, replyMarkup);
        await logPromise;
      } 
      else if (action === "pantry") {
        const item = resolvePendingFood(data.slice(colonIdx + 1));
        if (!item) {
          await answerTelegramCallbackQuery(cbId, "⚠️ Item expired or not found. Please re-send the food text!");
          return res.status(200).send("OK");
        }
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
      else if (action === "menu_edit") {
        await answerTelegramCallbackQuery(cbId, "Loading today's food logs...");
        const logs = await getTodayFoodLogs(dateStr);
        if (logs.length === 0) {
          await editTelegramMessageText(
            chatId,
            messageId,
            `✏️ <b>Edit Logged Food</b>\n\nNo food entries logged yet today (${dateStr})!\n\n💡 <i>Text any food (e.g. <code>2 boiled eggs</code> or <code>100g sweet potato</code>) to start logging fuel.</i>`
          );
        } else {
          const buttons = logs.map((l, idx) => {
            const name = l.brand && l.brand !== 'Whole Food' ? `${l.brand} ${l.itemName}` : l.itemName;
            const label = `${idx + 1}. ${name.slice(0, 20)} (${l.protein}g P, ${l.calories} kcal)`;
            return [{
              text: label,
              callback_data: `pick_edit:${encodeURIComponent(l.itemName)}`
            }];
          });
          buttons.push([{ text: "❌ Close Menu", callback_data: "close_menu" }]);

          await editTelegramMessageText(
            chatId,
            messageId,
            `✏️ <b>Select an entry from today to adjust or edit:</b>\n\n` +
            `<i>Found ${logs.length} logged item${logs.length > 1 ? 's' : ''} for today (${dateStr}). Tap the food you want to modify:</i>`,
            { inline_keyboard: buttons }
          );
        }
      }
      else if (action === "pick_edit") {
        const targetName = decodeURIComponent(data.slice(colonIdx + 1).trim());
        await answerTelegramCallbackQuery(cbId, `Loading ${targetName.slice(0, 15)}...`);
        const logs = await getTodayFoodLogs(dateStr);
        const entry = logs.find(l => 
          (l.itemName || "").toLowerCase().includes(targetName.toLowerCase()) || 
          targetName.toLowerCase().includes((l.itemName || "").toLowerCase())
        ) || logs[0];

        if (!entry) {
          await editTelegramMessageText(chatId, messageId, `⚠️ Food item "${targetName}" was not found or was deleted.`);
        } else {
          const editMenuText = `✏️ <b>Editing Fuel Entry:</b> <b>${entry.brand && entry.brand !== 'Whole Food' ? entry.brand + ' ' : ''}${entry.itemName}</b>\n` +
            `📏 <b>Logged Portion:</b> ${entry.quantity || 1} ${entry.servingUnit || 'serving'}\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `• 🥩 <b>Protein:</b> <b>${entry.protein || 0}g</b>\n` +
            `• 🍞 <b>Carbs:</b> ${entry.carbs || 0}g\n` +
            `• 🥑 <b>Fats:</b> ${entry.fats || 0}g\n` +
            `• 🍬 <b>Sugar:</b> ${entry.sugar || 0}g\n` +
            `• 🌾 <b>Fiber:</b> ${entry.fiber || 0}g\n` +
            `• 🔥 <b>Calories:</b> <b>${entry.calories || 0} kcal</b>\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `<i>Which value would you like to adjust?</i>`;

          const encoded = encodeURIComponent(entry.itemName);
          const replyMarkup = {
            inline_keyboard: [
              [
                { text: `🥩 Adjust Protein (${entry.protein || 0}g)`, callback_data: `adj_f:${encoded}:protein` },
                { text: `🍞 Adjust Carbs (${entry.carbs || 0}g)`, callback_data: `adj_f:${encoded}:carbs` }
              ],
              [
                { text: `🥑 Adjust Fats (${entry.fats || 0}g)`, callback_data: `adj_f:${encoded}:fats` },
                { text: `🍬 Adjust Sugar (${entry.sugar || 0}g)`, callback_data: `adj_f:${encoded}:sugar` }
              ],
              [
                { text: `🔥 Adjust Calories (${entry.calories || 0})`, callback_data: `adj_f:${encoded}:calories` },
                { text: `⚖️ Adjust Quantity (${entry.quantity || 1})`, callback_data: `adj_f:${encoded}:quantity` }
              ],
              [
                { text: `🗑️ Delete Entry`, callback_data: `del:${encoded}` },
                { text: `« Back to Food List`, callback_data: "menu_edit" }
              ]
            ]
          };

          await editTelegramMessageText(chatId, messageId, editMenuText, replyMarkup);
        }
      }
      else if (action === "adj_f") {
        const parts = data.split(":");
        const encodedName = parts[1];
        const field = parts[2];
        const targetName = decodeURIComponent(encodedName);
        await answerTelegramCallbackQuery(cbId, `Adjusting ${field}...`);

        const logs = await getTodayFoodLogs(dateStr);
        const entry = logs.find(l => 
          (l.itemName || "").toLowerCase().includes(targetName.toLowerCase()) || 
          targetName.toLowerCase().includes((l.itemName || "").toLowerCase())
        ) || { itemName: targetName, protein: 0, carbs: 0, fats: 0, sugar: 0, calories: 0, quantity: 1 };

        const currentVal = entry[field] !== undefined ? entry[field] : 0;
        let presets = [];
        let unit = "g";
        let fieldLabel = field.toUpperCase();

        if (field === "protein") {
          unit = "g";
          fieldLabel = "🥩 Protein";
          presets = [
            [{ text: "1.0g", val: "1.0" }, { text: "2.0g", val: "2.0" }, { text: "2.5g", val: "2.5" }, { text: "3.5g", val: "3.5" }],
            [{ text: "5.0g", val: "5.0" }, { text: "10g", val: "10.0" }, { text: "15g", val: "15.0" }, { text: "20g", val: "20.0" }],
            [{ text: "-5.0g", val: "-5.0" }, { text: "-2.0g", val: "-2.0" }, { text: "+2.0g", val: "+2.0" }, { text: "+5.0g", val: "+5.0" }]
          ];
        } else if (field === "sugar") {
          unit = "g";
          fieldLabel = "🍬 Sugar";
          presets = [
            [{ text: "0g", val: "0.0" }, { text: "2.0g", val: "2.0" }, { text: "4.0g", val: "4.0" }, { text: "6.0g", val: "6.0" }],
            [{ text: "-5.0g", val: "-5.0" }, { text: "-2.0g", val: "-2.0" }, { text: "+2.0g", val: "+2.0" }, { text: "+5.0g", val: "+5.0" }]
          ];
        } else if (field === "carbs") {
          unit = "g";
          fieldLabel = "🍞 Carbs";
          presets = [
            [{ text: "10g", val: "10.0" }, { text: "20g", val: "20.0" }, { text: "30g", val: "30.0" }, { text: "45g", val: "45.0" }],
            [{ text: "-10g", val: "-10.0" }, { text: "-5.0g", val: "-5.0" }, { text: "+5.0g", val: "+5.0" }, { text: "+10g", val: "+10.0" }]
          ];
        } else if (field === "fats") {
          unit = "g";
          fieldLabel = "🥑 Fats";
          presets = [
            [{ text: "2.0g", val: "2.0" }, { text: "4.0g", val: "4.0" }, { text: "8.0g", val: "8.0" }, { text: "12g", val: "12.0" }],
            [{ text: "-4.0g", val: "-4.0" }, { text: "-2.0g", val: "-2.0" }, { text: "+2.0g", val: "+2.0" }, { text: "+4.0g", val: "+4.0" }]
          ];
        } else if (field === "calories") {
          unit = "kcal";
          fieldLabel = "🔥 Calories";
          presets = [
            [{ text: "100 kcal", val: "100" }, { text: "140 kcal", val: "140" }, { text: "200 kcal", val: "200" }, { text: "280 kcal", val: "280" }],
            [{ text: "-100", val: "-100" }, { text: "-50", val: "-50" }, { text: "+50", val: "+50" }, { text: "+100", val: "+100" }]
          ];
        } else if (field === "quantity") {
          unit = entry.servingUnit || "serving";
          fieldLabel = "⚖️ Quantity";
          presets = [
            [{ text: "0.5", val: "0.5" }, { text: "1.0", val: "1.0" }, { text: "1.5", val: "1.5" }, { text: "2.0", val: "2.0" }],
            [{ text: "-1", val: "-1" }, { text: "-0.5", val: "-0.5" }, { text: "+0.5", val: "+0.5" }, { text: "+1", val: "+1" }]
          ];
        }

        const keyboard = presets.map(row => 
          row.map(btn => ({
            text: btn.text,
            callback_data: `apply_adj:${encodedName}:${field}:${btn.val}`
          }))
        );

        keyboard.push([
          { text: `« Back to ${targetName.slice(0, 15)}`, callback_data: `pick_edit:${encodedName}` },
          { text: "📋 Food List", callback_data: "menu_edit" }
        ]);

        const promptText = `${fieldLabel} Adjustment for <b>${entry.brand && entry.brand !== 'Whole Food' ? entry.brand + ' ' : ''}${entry.itemName}</b>\n\n` +
          `• Current ${field}: <b>${currentVal} ${unit}</b>\n\n` +
          `<i>Tap a quick preset button below to update:</i>\n\n` +
          `💡 <i>Tip: You can also text <code>/set ${field} &lt;number&gt;</code> anytime (e.g. <code>/set ${field} 2.5</code>)!</i>`;

        await editTelegramMessageText(chatId, messageId, promptText, { inline_keyboard: keyboard });
      }
      else if (action === "apply_adj") {
        const parts = data.split(":");
        const encodedName = parts[1];
        const field = parts[2];
        const rawVal = parts[3];
        const targetName = decodeURIComponent(encodedName);
        await answerTelegramCallbackQuery(cbId, `Saving adjustment...`);

        const logs = await getTodayFoodLogs(dateStr);
        const entry = logs.find(l => 
          (l.itemName || "").toLowerCase().includes(targetName.toLowerCase()) || 
          targetName.toLowerCase().includes((l.itemName || "").toLowerCase())
        ) || { itemName: targetName };

        const currentVal = entry[field] !== undefined ? Number(entry[field]) : 0;
        let finalVal = parseFloat(rawVal);
        if (rawVal.startsWith("-") || rawVal.startsWith("+")) {
          finalVal = Math.max(0, Math.round((currentVal + parseFloat(rawVal)) * 10) / 10);
        }

        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "nutrition",
            timestamp: new Date().toISOString(),
            date: dateStr,
            time: timeStr,
            itemName: targetName,
            brand: "",
            quantity: field === 'quantity' ? finalVal : 0,
            servingUnit: "",
            calories: field === 'calories' ? finalVal : 0,
            protein: field === 'protein' ? finalVal : 0,
            carbs: field === 'carbs' ? finalVal : 0,
            fats: field === 'fats' ? finalVal : 0,
            fiber: field === 'fiber' ? finalVal : 0,
            sugar: field === 'sugar' ? finalVal : 0,
            rawMessage: `[UPDATE_ITEM: ${targetName} | {"${field}": ${finalVal}}]`
          })
        });

        const replyMarkup = {
          inline_keyboard: [
            [
              { text: `✏️ Adjust Another Macro for ${targetName.slice(0, 14)}`, callback_data: `pick_edit:${encodedName}` }
            ],
            [
              { text: `📋 Select Another Food to Edit`, callback_data: "menu_edit" }
            ]
          ]
        };

        const successText = `✅ <b>Adjusted: ${entry.brand && entry.brand !== 'Whole Food' ? entry.brand + ' ' : ''}${targetName}</b>\n\n` +
          `• <b>${field.toUpperCase()}:</b> <b>${finalVal}</b> (was ${currentVal})\n\n` +
          `📈 <i>Your live fuel dashboard and breakdown pie charts have recalibrated!</i>\n` +
          `👉 View Live: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

        await editTelegramMessageText(chatId, messageId, successText, replyMarkup);
      }
      else if (action === "close_menu") {
        await answerTelegramCallbackQuery(cbId, "Menu closed");
        await editTelegramMessageText(chatId, messageId, `👌 Menu closed. Text <code>/today</code> or <code>/edit</code> anytime!`);
      }
      else if (action === "del") {
        await answerTelegramCallbackQuery(cbId, "Deleting item...");
        const target = colonIdx !== -1 ? decodeURIComponent(data.slice(colonIdx + 1).trim()) : "";

        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "nutrition",
            timestamp: new Date().toISOString(),
            date: dateStr,
            time: timeStr,
            itemName: "DELETED",
            brand: "",
            quantity: 0,
            servingUnit: "",
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            fiber: 0,
            sugar: 0,
            rawMessage: `[DELETE_ITEM: ${target}]`
          })
        });

        const replyMarkup = {
          inline_keyboard: [
            [{ text: `📋 Back to Food List`, callback_data: "menu_edit" }]
          ]
        };

        await editTelegramMessageText(
          chatId,
          messageId,
          `🗑️ <b>Deleted:</b> <i>${target}</i>\n\nYour dashboard has been updated!\n👉 View: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`,
          replyMarkup
        );
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
  const msg = update.message || update.edited_message;
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

  // Send immediate typing action so user/Telegram sees the bot responding instantly
  sendTelegramChatAction(chatId, "typing").catch(() => {});

  const { dateStr, timeStr } = getISTDateTime(msg.date);

  // ── A. PHOTO DETECTED: SMART MEAL LOGGING OR PANTRY REGISTRATION ────
  if (msg.photo && msg.photo.length > 0) {
    await sendTelegramMessage(chatId, "🔍 <i>Analyzing photo & ingredients with Gemini Vision...</i>", messageId);

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

      // ── BRANCH 1: PACKAGING / NUTRITION FACTS LABEL -> SAVE TO PANTRY ──
      if (extracted.imageType === "pantry_label") {
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
      }

      // ── BRANCH 2: COOKED FOOD / LOCAL DISH / MEAL -> LOG DIRECTLY TO TODAY'S FUEL ──
      const mealName = extracted.dishName || extracted.itemName || "Prepared Meal";
      const portionStr = extracted.portionDescription || extracted.servingUnit || "1 serving";
      const ingredients = Array.isArray(extracted.ingredientsList) && extracted.ingredientsList.length > 0
        ? extracted.ingredientsList
        : [];

      const rawMsgText = msg.caption ? `${mealName} (${msg.caption})` : mealName;

      const compactPayload = {
        itemName: mealName,
        brand: extracted.brand || "",
        quantity: 1,
        servingUnit: portionStr,
        calories: extracted.calories || 0,
        protein: extracted.protein || 0,
        carbs: extracted.carbs || 0,
        fats: extracted.fats || 0,
        sugar: extracted.sugar || 0,
        fiber: extracted.fiber || 0,
        vitalsSummary: vitalsSummaryStr
      };

      // Directly log to Google Sheets!
      await logFoodToDailySheet(compactPayload, dateStr, timeStr, rawMsgText);

      // Fetch running totals for today
      const todayLogs = await getTodayNutritionLogs(dateStr);
      const totalP = todayLogs.reduce((sum, r) => sum + (Number(r["Protein"] || r.protein) || 0), 0) + (compactPayload.protein || 0);
      const totalCal = todayLogs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0) + (compactPayload.calories || 0);
      const pPct = Math.min(100, Math.round((totalP / DAILY_TARGETS.protein) * 100));

      let ingredientsBlock = "";
      if (ingredients.length > 0) {
        ingredientsBlock = `🥗 <b>Ingredients & Quantities:</b>\n` +
          ingredients.map(ing => `• ${ing}`).join("\n") + "\n";
      }

      let vitalsPreview = "";
      if (vitalsList.length > 0) {
        vitalsPreview = `💊 <b>Vitals:</b> <i>${vitalsSummaryStr}</i>\n`;
      }

      const receipt = `🍽️ <b>Visual Meal Logged: ${mealName}</b>\n` +
        `📏 <b>Portion:</b> ${portionStr}\n` +
        (msg.caption ? `💬 <i>"${msg.caption}"</i>\n` : '') +
        `━━━━━━━━━━━━━━━━━━━\n` +
        ingredientsBlock +
        `• 🥩 +<b>${compactPayload.protein}g</b> Protein • 🍞 +${compactPayload.carbs}g Carbs\n` +
        `• 🥑 +${compactPayload.fats}g Fat • 🍬 +${compactPayload.sugar}g Sugar • 🌾 +${compactPayload.fiber}g Fiber\n` +
        `• 🔥 +<b>${compactPayload.calories}</b> kcal\n` +
        vitalsPreview +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📈 <b>Today's Fuel:</b> <b>${Math.round(totalP)}g</b> / ${DAILY_TARGETS.protein}g Protein (${pPct}%)\n` +
        `🔥 <b>Total Calories:</b> ${Math.round(totalCal)} / ${DAILY_TARGETS.calories} kcal\n\n` +
        `👉 View & Pie Chart: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

      // Provide inline button to Undo / Delete if user wants to remove or change
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: `🗑️ Delete "${mealName.slice(0, 18)}"`, callback_data: `del:${encodeURIComponent(mealName)}` }
          ]
        ]
      };

      await sendTelegramMessage(chatId, receipt, messageId, replyMarkup);
      return res.status(200).send("OK");

    } catch (err) {
      console.error("Error processing photo:", err);
      await sendTelegramMessage(chatId, `⚠️ <b>Could not analyze photo</b>: ${err.message}\nMake sure the food or nutrition label is clearly visible!`, messageId);
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
      `<b>3. Snap Any Label or Meal (Photo):</b>\n` +
      `• Snap packaged product label to auto-register to pantry catalog.\n` +
      `• Snap plate of food (with optional weight notes in caption) to auto-log meals.\n\n` +
      `<b>4. EOD Daily Steps, Calories Burned & Sleep:</b>\n` +
      `• Text at end-of-day (all in one message or separately):\n` +
      `  <code>sleep 7hrs\ncalories burned 300\nsteps 7000</code>\n\n` +
      `<b>Quick Shortcuts:</b>\n` +
      `• <code>/today</code> - Today's running fuel, activity & meals (with 🗑️ delete buttons)\n` +
      `• <code>/delete &lt;item&gt;</code> - Delete a specific meal (e.g. <code>/delete oats</code>)\n` +
      `• <code>/undo</code> - Undo last logged meal\n` +
      `• <code>/pantry</code> - View all registered pantry items\n\n` +
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

  if (text === "/today" || text === "/macros" || text === "/meals") {
    let detailedLogs = [];
    let todayAct = null;
    try {
      const res = await fetch(`https://www.ravitejabitra.in/api/nutrition-data`);
      if (res.ok) {
        const data = await res.json();
        detailedLogs = data.todayLogs || [];
        todayAct = data.todayActivity || null;
      }
    } catch(e) {}

    const totalP = detailedLogs.reduce((sum, r) => sum + (r.protein || 0), 0);
    const totalC = detailedLogs.reduce((sum, r) => sum + (r.carbs || 0), 0);
    const totalF = detailedLogs.reduce((sum, r) => sum + (r.fats || 0), 0);
    const totalS = detailedLogs.reduce((sum, r) => sum + (r.sugar || 0), 0);
    const totalCal = detailedLogs.reduce((sum, r) => sum + (r.calories || 0), 0);

    let mealsList = "";
    const inlineButtons = [];

    if (detailedLogs.length > 0) {
      mealsList = `\n<b>🍽️ Today's Logged Meals (${detailedLogs.length}):</b>\n`;
      detailedLogs.forEach((l, i) => {
        mealsList += `${i + 1}. <b>${l.quantity ? l.quantity + ' ' : ''}${l.servingUnit ? l.servingUnit + ' ' : ''}${l.itemName}</b>` +
          ` ➔ 🥩 ${l.protein}g P | 🔥 ${l.calories} kcal\n`;

        const shortName = (l.itemName || "item").slice(0, 20);
        inlineButtons.push([{
          text: `🗑️ Delete ${shortName}`,
          callback_data: `del:${shortName}`
        }]);
      });
    } else {
      mealsList = `\n<i>No meals logged yet today.</i>\n`;
    }

    let actSummary = "";
    if (todayAct && (todayAct.steps > 0 || todayAct.caloriesBurned > 0 || todayAct.sleepHours > 0)) {
      const parts = [];
      if (todayAct.steps > 0) parts.push(`👣 <b>${todayAct.steps.toLocaleString()}</b> steps`);
      if (todayAct.caloriesBurned > 0) parts.push(`🔥 <b>${todayAct.caloriesBurned}</b> kcal burned`);
      if (todayAct.sleepHours > 0) parts.push(`😴 <b>${todayAct.sleepHours}h</b> sleep`);
      actSummary = `\n🏃‍♂️ <b>Daily Activity & Recovery:</b>\n• ` + parts.join(' • ') + `\n`;
      if (todayAct.caloriesBurned > 0 && totalCal > 0) {
        actSummary += `• ⚖️ <b>Net Calorie Balance:</b> ${Math.round(totalCal - todayAct.caloriesBurned)} Net kcal\n`;
      }
    }

    const summary = `📊 <b>Today's Fuel Summary</b>\n` +
      mealsList +
      actSummary +
      `\n━━━━━━━━━━━━━━━━━━━\n` +
      `🥩 <b>Protein:</b> ${Math.round(totalP)}g / ${DAILY_TARGETS.protein}g (${Math.min(100, Math.round((totalP/DAILY_TARGETS.protein)*100))}%)` + (totalP >= DAILY_TARGETS.protein ? ' 🏆' : '') + `\n` +
      `🍞 <b>Carbs:</b> ${Math.round(totalC)}g / ${DAILY_TARGETS.carbs}g\n` +
      `🥑 <b>Fats:</b> ${Math.round(totalF)}g / ${DAILY_TARGETS.fats}g\n` +
      `🍬 <b>Sugar:</b> ${Math.round(totalS * 10) / 10}g / ${DAILY_TARGETS.sugar}g\n` +
      `🔥 <b>Calories:</b> ${Math.round(totalCal)} kcal / ${DAILY_TARGETS.calories} kcal\n\n` +
      `💡 <i>To delete an item, tap its button above or text:</i>\n` +
      `• <code>/delete oats</code>\n` +
      `• <code>/undo</code> (removes last entry)\n\n` +
      `🌐 Live Dashboard: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    const replyMarkup = inlineButtons.length > 0 ? { inline_keyboard: inlineButtons } : null;
    await sendTelegramMessage(chatId, summary, messageId, replyMarkup);
    return res.status(200).send("OK");
  }

  // ── DELETE / REMOVE / UNDO COMMANDS ──
  const isDeleteCmd = /^\/(delete|remove|undo)\b/i.test(text) || /^delete\b/i.test(text) || /^remove\b/i.test(text);
  if (isDeleteCmd) {
    const targetItem = text.replace(/^(\/)?(delete|remove|undo)\s*/i, '').trim();

    if (!targetItem || text.toLowerCase() === "/undo") {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "nutrition",
          timestamp: new Date().toISOString(),
          date: dateStr,
          time: timeStr,
          itemName: "DELETED",
          brand: "",
          quantity: 0,
          servingUnit: "",
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0,
          sugar: 0,
          rawMessage: `[DELETE_LAST]`
        })
      });

      await sendTelegramMessage(chatId, "🗑️ <b>Last food entry removed/undone!</b>\nYour live dashboard has been updated: <a href=\"https://www.ravitejabitra.in/nutrition\">ravitejabitra.in/nutrition</a>", messageId);
      return res.status(200).send("OK");
    }

    // Delete specific item by name
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "nutrition",
        timestamp: new Date().toISOString(),
        date: dateStr,
        time: timeStr,
        itemName: "DELETED",
        brand: "",
        quantity: 0,
        servingUnit: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        sugar: 0,
        rawMessage: `[DELETE_ITEM: ${targetItem}]`
      })
    });

    await sendTelegramMessage(
      chatId,
      `🗑️ <b>Removed:</b> <i>"${targetItem}"</i> from today's fuel!\n\nYour live dashboard has recalculated: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`,
      messageId
    );
    return res.status(200).send("OK");
  }

  // ── B.5. EOD DAILY ACTIVITY, CALORIES BURNED & SLEEP TRACKING ─────
  const activity = parseActivityMetrics(text);
  if (activity) {
    const structuredMsg = `[ACTIVITY_METRICS: steps=${activity.steps !== null ? activity.steps : ''}, burned=${activity.burned !== null ? activity.burned : ''}, sleep=${activity.sleep !== null ? activity.sleep : ''}] | Daily Activity & Recovery: ${activity.steps ? activity.steps.toLocaleString() + ' steps' : ''}${activity.burned ? ' • ' + activity.burned + ' kcal burned' : ''}${activity.sleep ? ' • ' + activity.sleep + 'h sleep' : ''}`;

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "nutrition",
        timestamp: new Date().toISOString(),
        date: dateStr,
        time: timeStr,
        itemName: "Daily Activity & Recovery",
        brand: "Activity Tracker",
        quantity: 1,
        servingUnit: "day",
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        sugar: 0,
        rawMessage: structuredMsg
      })
    });

    // Fetch running food calories to show net energy balance
    let totalFoodCal = 0;
    try {
      const logs = await getTodayNutritionLogs(dateStr);
      totalFoodCal = logs.reduce((sum, r) => sum + (Number(r["Calories"] || r.calories) || 0), 0);
    } catch(e) {}

    const stepsStr = activity.steps !== null
      ? `👣 <b>Steps:</b> <b>${activity.steps.toLocaleString()}</b> / 10,000 (${Math.min(100, Math.round((activity.steps / 10000) * 100))}%)`
      : '';
    const burnStr = activity.burned !== null
      ? `🔥 <b>Active Burned:</b> <b>${activity.burned} kcal</b>`
      : '';
    const sleepStr = activity.sleep !== null
      ? `😴 <b>Sleep Duration:</b> <b>${activity.sleep} hrs</b> <i>(Yesterday's Rest • CNS Repair)</i>`
      : '';

    let netBalanceStr = '';
    if (activity.burned !== null && totalFoodCal > 0) {
      const net = totalFoodCal - activity.burned;
      netBalanceStr = `\n⚖️ <b>Net Energy Balance:</b>\n• Food Intake: <b>${Math.round(totalFoodCal)} kcal</b> - Burn: <b>${activity.burned} kcal</b> = <b>${Math.round(net)} Net kcal</b>\n`;
    }

    const receipt = `🏃‍♂️ <b>Daily Activity & Recovery Logged!</b>\n\n` +
      [stepsStr, burnStr, sleepStr].filter(Boolean).join('\n') + `\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      netBalanceStr +
      `📅 <b>Date:</b> ${dateStr}\n\n` +
      `👉 View Live Cards: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

    await sendTelegramMessage(chatId, receipt, messageId);
    return res.status(200).send("OK");
  }

  // ── B.6. EDIT / ADJUST LOGGED FOOD COMMANDS ─────────────────────
  if (text === "/edit" || text === "/modify" || text === "/adjust") {
    const logs = await getTodayFoodLogs(dateStr);
    if (logs.length === 0) {
      await sendTelegramMessage(
        chatId,
        `✏️ <b>Edit Logged Food</b>\n\nNo food entries logged yet today (${dateStr})!\n\n💡 <i>Text any food (e.g. <code>2 boiled eggs</code> or <code>100g sweet potato</code>) to start logging fuel.</i>`,
        messageId
      );
      return res.status(200).send("OK");
    }

    const buttons = logs.map((l, idx) => {
      const name = l.brand && l.brand !== 'Whole Food' ? `${l.brand} ${l.itemName}` : l.itemName;
      const label = `${idx + 1}. ${name.slice(0, 20)} (${l.protein}g P, ${l.calories} kcal)`;
      return [{
        text: label,
        callback_data: `pick_edit:${encodeURIComponent(l.itemName)}`
      }];
    });

    buttons.push([{ text: "❌ Close Menu", callback_data: "close_menu" }]);

    await sendTelegramMessage(
      chatId,
      `✏️ <b>Select an entry from today to adjust or edit:</b>\n\n` +
      `<i>Found ${logs.length} logged item${logs.length > 1 ? 's' : ''} for today (${dateStr}). Tap the food you want to modify:</i>`,
      messageId,
      { inline_keyboard: buttons }
    );
    return res.status(200).send("OK");
  }

  // Handle /set <field> <value> or /set <item> <field> <value>
  if (text.startsWith("/set ") || text.startsWith("set ")) {
    const cleanCmd = text.replace(/^\/?set\s+/i, '').trim();
    const parts = cleanCmd.split(/\s+/);
    let targetItem = "";
    let field = "";
    let val = null;

    if (parts.length === 2) {
      field = parts[0].toLowerCase();
      val = parseFloat(parts[1]);
    } else if (parts.length >= 3) {
      val = parseFloat(parts[parts.length - 1]);
      field = parts[parts.length - 2].toLowerCase();
      targetItem = parts.slice(0, parts.length - 2).join(" ");
    }

    const fieldMap = {
      p: "protein", protein: "protein",
      c: "carbs", carb: "carbs", carbs: "carbs",
      f: "fats", fat: "fats", fats: "fats",
      cal: "calories", cals: "calories", calorie: "calories", calories: "calories",
      s: "sugar", sug: "sugar", sugar: "sugar",
      qty: "quantity", quantity: "quantity"
    };

    const validField = fieldMap[field];
    if (validField && !isNaN(val)) {
      const logs = await getTodayFoodLogs(dateStr);
      let targetEntry = null;
      if (targetItem) {
        targetEntry = logs.find(l => (l.itemName || "").toLowerCase().includes(targetItem.toLowerCase()));
      }
      if (!targetEntry && logs.length > 0) {
        targetEntry = logs[logs.length - 1];
      }

      if (targetEntry) {
        const itemResolved = targetEntry.itemName;
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "nutrition",
            timestamp: new Date().toISOString(),
            date: dateStr,
            time: timeStr,
            itemName: itemResolved,
            brand: "",
            quantity: validField === 'quantity' ? val : 0,
            servingUnit: "",
            calories: validField === 'calories' ? val : 0,
            protein: validField === 'protein' ? val : 0,
            carbs: validField === 'carbs' ? val : 0,
            fats: validField === 'fats' ? val : 0,
            fiber: validField === 'fiber' ? val : 0,
            sugar: validField === 'sugar' ? val : 0,
            rawMessage: `[UPDATE_ITEM: ${itemResolved} | {"${validField}": ${val}}]`
          })
        });

        const receipt = `✅ <b>Adjusted: ${itemResolved}</b>\n\n` +
          `• <b>${validField.toUpperCase()}:</b> set to <b>${val}</b>\n\n` +
          `📈 <i>Your live dashboard has updated!</i>\n` +
          `👉 View: <a href="https://www.ravitejabitra.in/nutrition">ravitejabitra.in/nutrition</a>`;

        const replyMarkup = {
          inline_keyboard: [
            [{ text: `✏️ Adjust Another Macro`, callback_data: `pick_edit:${encodeURIComponent(itemResolved)}` }],
            [{ text: `📋 Food List`, callback_data: "menu_edit" }]
          ]
        };

        await sendTelegramMessage(chatId, receipt, messageId, replyMarkup);
        return res.status(200).send("OK");
      }
    }
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

    // 2. If user used explicit "/log" shortcut -> Log directly to today
    if (explicitAction === "log") {
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

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: `✏️ Adjust Macros / Portions`, callback_data: `pick_edit:${encodeURIComponent(compactPayload.itemName)}` },
            { text: `🗑️ Delete`, callback_data: `del:${encodeURIComponent(compactPayload.itemName)}` }
          ]
        ]
      };

      await sendTelegramMessage(chatId, receipt, messageId, replyMarkup);
      return res.status(200).send("OK");
    }

    // 3. DEFAULT: Interactive Choice Menu with Log Food, Save to Pantry, Edit Already Logged Food
    const shortToken = storePendingFood(compactPayload);

    let vitalsPreview = "";
    if (vitalsList.length > 0) {
      vitalsPreview = `💊 <b>Vitals:</b> <i>${vitalsSummary}</i>\n`;
    }

    const previewMsg = `🍽️ <b>Nutrition Analysis:</b>\n` +
      `<b>${compactPayload.quantity} ${compactPayload.servingUnit} ${compactPayload.brand && compactPayload.brand !== 'Whole Food' ? compactPayload.brand + ' ' : ''}${compactPayload.itemName}</b>\n\n` +
      `• 🥩 <b>Protein:</b> <b>${compactPayload.protein}g</b> • 🍞 <b>Carbs:</b> ${compactPayload.carbs}g\n` +
      `• 🥑 <b>Fats:</b> ${compactPayload.fats}g • 🍬 <b>Sugar:</b> ${compactPayload.sugar}g • 🌾 <b>Fiber:</b> ${compactPayload.fiber}g\n` +
      `• 🔥 <b>Calories:</b> <b>${compactPayload.calories} kcal</b>\n` +
      vitalsPreview +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `<i>What would you like to do with this food?</i>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "⚡ Log to Today's Fuel", callback_data: `log:${shortToken}` }
        ],
        [
          { text: "📦 Save to Pantry Database", callback_data: `pantry:${shortToken}` }
        ],
        [
          { text: "✏️ Edit Already Logged Food", callback_data: "menu_edit" }
        ]
      ]
    };

    await sendTelegramMessage(chatId, previewMsg, messageId, replyMarkup);
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
