// Vercel Serverless Function: Nutrition & Fuel API
// Serves: Today's Macro Totals, Electrolytes, Trace Minerals, Ergogenics, Today's Logs, and Master Pantry Catalog
// Target: /api/nutrition-data

const GOOGLE_SCRIPT_URL = process.env.WATER_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwcQUP8bClLpHeZnwvCrtqm-KvMItQkMNZ0lY0YYCPAOchBlMEbUP-NqejKThehipvW/exec";

// Sports Science & Marathon Daily Targets
const DAILY_TARGETS = {
  calories: 2800,
  protein: 150,
  carbs: 380,
  fats: 70,
  fiber: 38,
  sugar: 35,
  waterLiters: 4.0,
  // Electrolytes
  sodiumMg: 3500,
  potassiumMg: 4700,
  magnesiumMg: 420,
  calciumMg: 1000,
  // Trace Minerals & Fats
  ironMg: 15,
  zincMg: 15,
  omega3Mg: 1500,
  // Vitamins & Ergogenics
  vitaminB12Mcg: 5.0,
  vitaminCMg: 150,
  vitaminD3Iu: 3000,
  creatineG: 5.0
};

// Base + Delta Dynamic Targets Engine (69 kg Marathon Runner)
function calculateDayTargets({ mode = 'run', distanceKm = 10, durationMin = 60, weightKg = 69 }) {
  let burnKcal = 0;
  let sweatHrs = 0;
  const isFast = mode === 'rest';
  const protein = isFast ? 135 : 150;
  const fiber = isFast ? 28 : 35;

  if (mode === 'rest') {
    burnKcal = 0;
    sweatHrs = 0;
  } else if (mode === 'strength_upper') {
    burnKcal = 250;
    sweatHrs = 0.75;
  } else if (mode === 'strength_legs') {
    burnKcal = 380;
    sweatHrs = 1.0;
  } else if (mode === 'run') {
    const dist = parseFloat(distanceKm) > 0 ? parseFloat(distanceKm) : 10;
    const dur = parseFloat(durationMin) > 0 ? parseFloat(durationMin) : (dist * 6);
    burnKcal = Math.round(dist * weightKg * 1.0);
    sweatHrs = dur / 60;
  }

  const calories = 2000 + burnKcal;
  const fats = isFast ? 60 : (mode === 'run' && distanceKm > 10
    ? Math.min(85, Math.round(65 + (distanceKm - 10) * 1.5))
    : 65);
  const carbs = Math.round((calories - (protein * 4) - (fats * 9)) / 4);
  const hydroLiters = Math.min(5.5, Number((3.2 + sweatHrs * 0.65).toFixed(1)));
  const sugar = mode === 'run'
    ? Math.min(140, Math.round(35 + sweatHrs * 25))
    : (isFast ? 30 : 35);
  const sodiumMg = Math.round(2500 + (sweatHrs * 900));

  return {
    mode,
    distanceKm: parseFloat(distanceKm) || 10,
    durationMin: parseFloat(durationMin) || 60,
    burnKcal,
    sweatHrs: Math.round(sweatHrs * 100) / 100,
    calories,
    protein,
    carbs,
    fats,
    fiber,
    sugar,
    waterLiters: hydroLiters,
    hydroLiters,
    sodiumMg,
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

function formatDisplayTime(timeVal, timestampVal) {
  const s = String(timeVal || "").trim();
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(s)) return s;
  
  const target = timestampVal || timeVal;
  if (!target) return "Today";
  const d = new Date(target);
  if (!isNaN(d.getTime())) {
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + istOffsetMs);
    let hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return s || "Today";
}

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

function scaleVitalsString(vitalsStr, multiplier) {
  if (!vitalsStr || multiplier === 1) return vitalsStr || "";
  return vitalsStr.replace(/([\w\s()-]+):\s*([\d.]+)\s*(mg|mcg|g|iu|µg)?/gi, (match, name, val, unit) => {
    const num = parseFloat(val);
    if (isNaN(num)) return match;
    const scaled = Math.round((num * multiplier) * 10) / 10;
    return `${name.trim()}: ${scaled} ${unit || ''}`.trim();
  });
}

function parseNutritionLogEntry(r, pantryCatalog = []) {
  if (!r || typeof r !== 'object') return null;

  const vals = Object.values(r);
  let rawTimestamp = r["Timestamp"] || r.timestamp || r["Date"] || r.date || r[" "] || vals[0] || "";
  let rawMsg = r["Raw Message"] || r.rawMessage || r[""] || vals[1] || vals[0] || "";

  if (typeof rawTimestamp === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(rawTimestamp) && /^\d{4}-\d{2}-\d{2}/.test(rawMsg)) {
    const tmp = rawTimestamp; rawTimestamp = rawMsg; rawMsg = tmp;
  }

  const rowDate = normalizeToISTDateStr(rawTimestamp);
  const rowTime = formatDisplayTime(r["Time"] || r.time, rawTimestamp);

  let vitals = "";
  const vitalsMatch = String(rawMsg).match(/\[Vitals:\s*(.*?)\]/i);
  if (vitalsMatch) {
    vitals = vitalsMatch[1];
  } else if (r.vitals) {
    vitals = String(r.vitals);
  }

  const cleanText = String(rawMsg).replace(/\[Vitals:\s*.*?\]/i, '').trim();
  if (!cleanText || /^(can you\s+)?delete\b/i.test(cleanText) || cleanText.includes("[DELETE_LAST]") || cleanText.includes("[ACTIVITY_METRICS:")) return null;

  let itemName = r["Item Name"] || r.itemName || "";
  let brand = r["Brand"] || r.brand || "";
  let quantity = Number(r["Quantity"] || r.quantity) || 1;
  let servingUnit = r["Serving Unit"] || r.servingUnit || "";
  let calories = Number(r["Calories"] || r.calories) || 0;
  let protein = Number(r["Protein"] || r.protein) || 0;
  let carbs = Number(r["Carbs"] || r.carbs) || 0;
  let fats = Number(r["Fats"] || r.fats) || 0;
  let fiber = Number(r["Fiber"] || r.fiber) || 0;
  let sugar = Number(r["Sugar"] || r.sugar) || 0;

  // 1. Try parsing pipe-delimited explicit macros
  const pMatch = cleanText.match(/([\d.]+)\s*g\s*P\b/i);
  const cMatch = cleanText.match(/([\d.]+)\s*g\s*C\b/i);
  const fMatch = cleanText.match(/([\d.]+)\s*g\s*F\b/i);
  const fibMatch = cleanText.match(/([\d.]+)\s*g\s*(?:Fib|Fiber)\b/i);
  const sMatch = cleanText.match(/([\d.]+)\s*g\s*(?:Sug|Sugar)\b/i);
  const calMatch = cleanText.match(/([\d.]+)\s*(?:kcal|calories)\b/i);

  if (pMatch || calMatch) {
    if (pMatch) protein = parseFloat(pMatch[1]);
    if (cMatch) carbs = parseFloat(cMatch[1]);
    if (fMatch) fats = parseFloat(fMatch[1]);
    if (fibMatch) fiber = parseFloat(fibMatch[1]);
    if (sMatch) sugar = parseFloat(sMatch[1]);
    if (calMatch) calories = parseFloat(calMatch[1]);

    const parts = cleanText.split('|').map(s => s.trim());
    if (parts.length > 1) {
      itemName = parts[1] || parts[0];
    }
  } else if ((protein === 0 && calories === 0) && cleanText) {
    // 2. Fuzzy match against Pantry Catalog
    const lower = cleanText.toLowerCase();
    const qtyMatch = lower.match(/^([\d.]+)\s*(g|ml|kg|scoop|scoops|egg|eggs|slice|slices|tbsp|tablet|tablets|capsule|capsules)?/i);
    let userQty = 1;
    let userUnit = "";
    if (qtyMatch) {
      userQty = parseFloat(qtyMatch[1]) || 1;
      userUnit = (qtyMatch[2] || "").toLowerCase();
    }

    let matchedItem = null;
    for (const p of pantryCatalog) {
      const pName = (p.itemName || "").toLowerCase();
      const pBrand = (p.brand || "").toLowerCase();
      const pAliases = (p.aliases || "").toLowerCase().split(',').map(a => a.trim());

      if (lower.includes(pName) || (pBrand && lower.includes(pBrand)) || pAliases.some(a => a && lower.includes(a))) {
        matchedItem = p;
        break;
      }
    }

    if (matchedItem) {
      itemName = matchedItem.itemName;
      brand = matchedItem.brand;
      quantity = userQty;
      servingUnit = userUnit || matchedItem.servingUnit;

      let multiplier = userQty;
      const baseServingWeightMatch = String(matchedItem.servingWeight || matchedItem.servingUnit || "").match(/([\d.]+)\s*g/i);
      if (baseServingWeightMatch && (userUnit === 'g' || !userUnit)) {
        const baseGrams = parseFloat(baseServingWeightMatch[1]);
        if (baseGrams > 0 && userQty >= 5) {
          multiplier = userQty / baseGrams;
        }
      }

      protein = Math.round((matchedItem.protein * multiplier) * 10) / 10;
      carbs = Math.round((matchedItem.carbs * multiplier) * 10) / 10;
      fats = Math.round((matchedItem.fats * multiplier) * 10) / 10;
      fiber = Math.round((matchedItem.fiber * multiplier) * 10) / 10;
      sugar = Math.round((matchedItem.sugar * multiplier) * 10) / 10;
      calories = Math.round(matchedItem.calories * multiplier);
      if (!vitals && matchedItem.vitals) {
        vitals = scaleVitalsString(matchedItem.vitals, multiplier);
      }
    } else {
      itemName = cleanText;
    }
  }

  return {
    rawTimestamp,
    date: rowDate,
    time: rowTime,
    itemName: itemName || cleanText,
    brand: brand,
    quantity: quantity || 1,
    servingUnit: servingUnit,
    calories: calories || 0,
    protein: protein || 0,
    carbs: carbs || 0,
    fats: fats || 0,
    fiber: fiber || 0,
    sugar: sugar || 0,
    vitals: vitals,
    rawMessage: cleanText
  };
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getTime() + diffToMon * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);

  const format = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dNum = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dNum}`;
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonth = monthNames[monday.getUTCMonth()];
  const endMonth = monthNames[sunday.getUTCMonth()];
  const label = startMonth === endMonth
    ? `${startMonth} ${monday.getUTCDate()} – ${sunday.getUTCDate()}`
    : `${startMonth} ${monday.getUTCDate()} – ${endMonth} ${sunday.getUTCDate()}`;

  return {
    startStr: format(monday),
    endStr: format(sunday),
    label
  };
}

// Helper to extract numeric values from vitals string
function extractNutrientValue(vitalsStr, pattern, multiplier = 1) {
  if (!vitalsStr) return 0;
  const match = vitalsStr.match(pattern);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  return isNaN(val) ? 0 : val * multiplier;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Handle food updates / deletes / day mode from the web interface
  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const action = body.action || "update";

      // Compute IST Date and Time
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const nowIST = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + istOffsetMs);
      const yyyy = nowIST.getFullYear();
      const mm = String(nowIST.getMonth() + 1).padStart(2, '0');
      const dd = String(nowIST.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      let hours = nowIST.getHours();
      const minutes = String(nowIST.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

      // Handle Day Mode (Base + Delta Engine)
      if (action === "set_mode") {
        const mode = (body.mode || "run").toLowerCase();
        const dist = parseFloat(body.distance) || 0;
        const dur = parseFloat(body.duration) || 0;
        const rawMsg = `[DAY_MODE: mode=${mode}, dist=${dist}, dur=${dur}]`;

        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "nutrition",
            timestamp: new Date().toISOString(),
            date: todayStr,
            time: timeStr,
            itemName: "Day Mode Setup",
            brand: "",
            quantity: 0,
            servingUnit: "",
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            fiber: 0,
            sugar: 0,
            rawMessage: rawMsg
          })
        });

        const targets = calculateDayTargets({ mode, distanceKm: dist, durationMin: dur });
        return res.status(200).json({ success: true, mode, distance: dist, duration: dur, targets });
      }

      const target = (body.target || "").trim();
      const patch = body.patch || {};

      if (!target) {
        return res.status(400).json({ error: "Target item name is required" });
      }

      let rawMsg = "";
      if (action === "delete") {
        rawMsg = `[DELETE_ITEM: ${target}]`;
      } else {
        rawMsg = `[UPDATE_ITEM: ${target} | ${JSON.stringify(patch)}]`;
      }

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "nutrition",
          timestamp: new Date().toISOString(),
          date: todayStr,
          time: timeStr,
          itemName: target,
          brand: "",
          quantity: patch.quantity || 0,
          servingUnit: patch.servingUnit || "",
          calories: patch.calories || 0,
          protein: patch.protein || 0,
          carbs: patch.carbs || 0,
          fats: patch.fats || 0,
          fiber: patch.fiber || 0,
          sugar: patch.sugar || 0,
          rawMessage: rawMsg
        })
      });

      return res.status(200).json({ success: true, action, target, patch });
    } catch (e) {
      console.error("POST /api/nutrition-data error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Fetch Pantry Catalog, Nutrition Logs, and Water Logs in parallel
    const [pantryRes, logsRes, waterRes] = await Promise.all([
      fetch(`${GOOGLE_SCRIPT_URL}?sheet=catalog`),
      fetch(`${GOOGLE_SCRIPT_URL}?sheet=nutrition`),
      fetch(`${GOOGLE_SCRIPT_URL}?sheet=water`).catch(() => ({ ok: false }))
    ]);

    let rawPantry = [];
    if (pantryRes.ok) {
      rawPantry = await pantryRes.json();
    }

    let rawLogs = [];
    if (logsRes.ok) {
      rawLogs = await logsRes.json();
    }

    let rawWater = [];
    if (waterRes.ok && typeof waterRes.json === 'function') {
      try { rawWater = await waterRes.json(); } catch(e) { rawWater = []; }
    }

    // 2. Parse Pantry Items
    const pantry = parsePantryRows(rawPantry);

    // 3. Current IST Date
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + istOffsetMs);
    const yyyy = nowIST.getFullYear();
    const mm = String(nowIST.getMonth() + 1).padStart(2, '0');
    const dd = String(nowIST.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // 4. Clean & normalize food logs using robust parsing & pantry matching
    const parsedLogs = [];
    const dailyActivityMap = {}; // dateStr -> { steps: 0, caloriesBurned: 0, sleepHours: 0 }
    const dailyModeMap = {}; // dateStr -> { mode, distance, duration }

    if (Array.isArray(rawLogs)) {
      for (const r of rawLogs) {
        const rawMsg = String(r["Raw Message"] || r.rawMessage || r[""] || Object.values(r)[1] || "");

        // 4.1 Parse Activity Metrics (Steps, Calories Burned, Sleep Duration)
        const actMatch = rawMsg.match(/\[ACTIVITY_METRICS:\s*steps=([^,\s]*),\s*burned=([^,\s]*),\s*sleep=([^\]\s]*)\]/i);
        if (actMatch) {
          const rawTimestamp = r["Timestamp"] || r.timestamp || r["Date"] || r.date || r[" "] || Object.values(r)[0] || "";
          const rowDate = normalizeToISTDateStr(rawTimestamp);
          if (!dailyActivityMap[rowDate]) {
            dailyActivityMap[rowDate] = { steps: 0, caloriesBurned: 0, sleepHours: 0 };
          }
          const s = parseInt(actMatch[1], 10);
          const b = parseInt(actMatch[2], 10);
          const sl = parseFloat(actMatch[3]);
          if (!isNaN(s) && s > 0) dailyActivityMap[rowDate].steps = s;
          if (!isNaN(b) && b > 0) dailyActivityMap[rowDate].caloriesBurned = b;
          if (!isNaN(sl) && sl > 0) dailyActivityMap[rowDate].sleepHours = sl;
          continue;
        }

        // 4.2 Parse Day Mode (Base + Delta Training Target Engine)
        const modeMatch = rawMsg.match(/\[DAY_MODE:\s*mode=([^,\s]*),\s*dist=([^,\s]*),\s*dur=([^\]\s]*)\]/i);
        if (modeMatch) {
          const rawTimestamp = r["Timestamp"] || r.timestamp || r["Date"] || r.date || r[" "] || Object.values(r)[0] || "";
          const rowDate = normalizeToISTDateStr(rawTimestamp);
          dailyModeMap[rowDate] = {
            mode: modeMatch[1],
            distance: parseFloat(modeMatch[2]) || 0,
            duration: parseFloat(modeMatch[3]) || 0
          };
          continue;
        }

        if (rawMsg.includes("[DELETE_LAST]") || /^delete\s+last\b/i.test(rawMsg)) {
          if (parsedLogs.length > 0) parsedLogs.pop();
          continue;
        }

        const deleteMatch = rawMsg.match(/\[DELETE_ITEM:\s*(.*?)\]/i);
        if (deleteMatch) {
          const target = deleteMatch[1].toLowerCase().trim();
          for (let k = parsedLogs.length - 1; k >= 0; k--) {
            const entry = parsedLogs[k];
            const name = (entry.itemName || "").toLowerCase();
            const brand = (entry.brand || "").toLowerCase();
            const raw = (entry.rawMessage || "").toLowerCase();
            if (name.includes(target) || brand.includes(target) || raw.includes(target) || target.includes(name)) {
              parsedLogs.splice(k, 1);
              break;
            }
          }
          continue;
        }

        const updateMatch = rawMsg.match(/\[UPDATE_ITEM:\s*([^|]+)\s*\|\s*(\{.*?\})\]/i);
        if (updateMatch) {
          const target = updateMatch[1].toLowerCase().trim();
          try {
            const patch = JSON.parse(updateMatch[2]);
            for (let k = parsedLogs.length - 1; k >= 0; k--) {
              const entry = parsedLogs[k];
              const name = (entry.itemName || "").toLowerCase();
              const brand = (entry.brand || "").toLowerCase();
              const raw = (entry.rawMessage || "").toLowerCase();
              if (name.includes(target) || brand.includes(target) || raw.includes(target) || target.includes(name)) {
                if (patch.quantity !== undefined && !isNaN(Number(patch.quantity))) entry.quantity = Number(patch.quantity);
                if (patch.protein !== undefined && !isNaN(Number(patch.protein))) entry.protein = Math.round(Number(patch.protein) * 10) / 10;
                if (patch.carbs !== undefined && !isNaN(Number(patch.carbs))) entry.carbs = Math.round(Number(patch.carbs) * 10) / 10;
                if (patch.fats !== undefined && !isNaN(Number(patch.fats))) entry.fats = Math.round(Number(patch.fats) * 10) / 10;
                if (patch.sugar !== undefined && !isNaN(Number(patch.sugar))) entry.sugar = Math.round(Number(patch.sugar) * 10) / 10;
                if (patch.fiber !== undefined && !isNaN(Number(patch.fiber))) entry.fiber = Math.round(Number(patch.fiber) * 10) / 10;
                if (patch.calories !== undefined && !isNaN(Number(patch.calories))) entry.calories = Math.round(Number(patch.calories));
                if (patch.servingUnit !== undefined) entry.servingUnit = String(patch.servingUnit);
                break;
              }
            }
          } catch (e) {
            console.error("Failed to parse UPDATE_ITEM patch:", e);
          }
          continue;
        }
        const entry = parseNutritionLogEntry(r, pantry);
        if (entry) parsedLogs.push(entry);
      }
    }

    // Deduplicate rapid accidental retries (same item & quantity within 120 seconds)
    const cleanedLogs = [];
    for (let i = 0; i < parsedLogs.length; i++) {
      const cur = parsedLogs[i];
      const isDupe = cleanedLogs.some(prev => {
        if (prev.date !== cur.date) return false;
        const sameName = prev.itemName.toLowerCase() === cur.itemName.toLowerCase();
        const sameQty = prev.quantity === cur.quantity;
        if (!sameName || !sameQty) return false;

        if (prev.rawTimestamp && cur.rawTimestamp) {
          const t1 = new Date(prev.rawTimestamp).getTime();
          const t2 = new Date(cur.rawTimestamp).getTime();
          if (!isNaN(t1) && !isNaN(t2)) {
            return Math.abs(t2 - t1) < 120 * 1000;
          }
        }
        return prev.time && cur.time && prev.time === cur.time;
      });

      if (!isDupe) {
        cleanedLogs.push(cur);
      }
    }

    const todayLogs = cleanedLogs.filter(l => l.date === todayStr);

    // 5. Aggregate Today's Macronutrient Totals
    const todayTotals = {
      protein: Math.round(todayLogs.reduce((sum, l) => sum + l.protein, 0) * 10) / 10,
      carbs: Math.round(todayLogs.reduce((sum, l) => sum + l.carbs, 0) * 10) / 10,
      fats: Math.round(todayLogs.reduce((sum, l) => sum + l.fats, 0) * 10) / 10,
      fiber: Math.round(todayLogs.reduce((sum, l) => sum + l.fiber, 0) * 10) / 10,
      sugar: Math.round(todayLogs.reduce((sum, l) => sum + l.sugar, 0) * 10) / 10,
      calories: Math.round(todayLogs.reduce((sum, l) => sum + l.calories, 0))
    };

    // 5.1 Aggregate Today's Activity & Health Metrics (Steps, Calories Burned, Sleep)
    const todayAct = dailyActivityMap[todayStr] || { steps: 0, caloriesBurned: 0, sleepHours: 0 };
    const todayActivity = {
      steps: todayAct.steps || 0,
      stepsTarget: 10000,
      caloriesBurned: todayAct.caloriesBurned || 0,
      caloriesBurnedTarget: 500,
      sleepHours: todayAct.sleepHours || 0,
      sleepTarget: 8.0,
      netCalories: todayTotals.calories - (todayAct.caloriesBurned || 0)
    };

    // Calculate Today's Water intake in Liters
    let todayWaterMl = 0;
    if (Array.isArray(rawWater)) {
      todayWaterMl = rawWater
        .filter(w => normalizeToISTDateStr(w.Date || w.date || w.timestamp) === todayStr)
        .reduce((sum, w) => sum + (Number(w["Amount (ml)"] || w.amount || w.water) || 0), 0);
    }
    const todayWaterLiters = Math.round((todayWaterMl / 1000) * 10) / 10;

    // 6. Aggregate Electrolytes & Micro-Nutrients from Vitals + Food Logs
    let sodiumMg = 0;
    let potassiumMg = 0;
    let magnesiumMg = 0;
    let calciumMg = 0;
    let ironMg = 0;
    let zincMg = 0;
    let omega3Mg = 0;
    let fishOilMg = 0;
    let epaMg = 0;
    let dhaMg = 0;
    let vitaminB12Mcg = 0;
    let vitaminCMg = 0;
    let vitaminD3Iu = 0;
    let creatineG = 0;

    todayLogs.forEach(l => {
      const v = (l.vitals || "") + " " + (l.rawMessage || "") + " " + (l.itemName || "");
      
      // Sodium / Salt
      sodiumMg += extractNutrientValue(v, /sodium[:\s]+([\d.]+)\s*mg/i);
      
      // Potassium
      potassiumMg += extractNutrientValue(v, /potassium[:\s]+([\d.]+)\s*mg/i);

      // Magnesium
      magnesiumMg += extractNutrientValue(v, /(?:elemental\s+)?magnesium[:\s]+([\d.]+)\s*mg/i);
      if (/magnesium\s*glycinate/i.test(l.itemName) && magnesiumMg === 0) {
        magnesiumMg += (l.quantity || 1) * 210; // ~210-420mg elemental per dose
      }

      // Calcium
      calciumMg += extractNutrientValue(v, /calcium[:\s]+([\d.]+)\s*mg/i);

      // Iron
      ironMg += extractNutrientValue(v, /iron[:\s]+([\d.]+)\s*mg/i);

      // Zinc
      zincMg += extractNutrientValue(v, /zinc[:\s]+([\d.]+)\s*mg/i);

      // Omega-3 / EPA / DHA
      let epa = extractNutrientValue(v, /epa[:\s]+([\d.]+)\s*mg/i);
      let dha = extractNutrientValue(v, /dha[:\s]+([\d.]+)\s*mg/i);
      let totalOmega = extractNutrientValue(v, /(?:total\s+)?omega(?:-3)?[:\s]+([\d.]+)\s*mg/i);

      if (/fish\s*oil/i.test(l.itemName) || /hk\s*vital/i.test(l.itemName) || /omega/i.test(l.itemName)) {
        const qty = l.quantity || 1;
        // Standard fish oil capsule (1000mg oil = 180mg EPA + 120mg DHA = 300mg active Omega-3)
        if (epa === 0) epa = qty * 180;
        if (dha === 0) dha = qty * 120;
        if (totalOmega === 0) totalOmega = qty * 1000;
      }

      epaMg += epa;
      dhaMg += dha;
      omega3Mg += (epa + dha);
      fishOilMg += (totalOmega > 0 ? totalOmega : (epa + dha));

      // Vitamin B12
      vitaminB12Mcg += extractNutrientValue(v, /vitamin\s*b12[:\s]+([\d.]+)\s*mcg/i);

      // Vitamin C
      vitaminCMg += extractNutrientValue(v, /vitamin\s*c[:\s]+([\d.]+)\s*mg/i);

      // Vitamin D3
      vitaminD3Iu += extractNutrientValue(v, /vitamin\s*d(?:3)?[:\s]+([\d.]+)\s*(?:iu|ui)/i);

      // Creatine Monohydrate
      const creatMatch = extractNutrientValue(v, /creatine(?:\s*monohydrate)?[:\s]+([\d.]+)\s*g/i);
      if (creatMatch > 0) {
        creatineG += creatMatch;
      } else if (/creatine/i.test(l.itemName)) {
        creatineG += (l.quantity || 1) * 5.0;
      }
    });

    const todayMicros = {
      waterLiters: todayWaterLiters,
      sodiumMg: Math.round(sodiumMg),
      potassiumMg: Math.round(potassiumMg),
      magnesiumMg: Math.round(magnesiumMg),
      calciumMg: Math.round(calciumMg),
      ironMg: Math.round(ironMg * 10) / 10,
      zincMg: Math.round(zincMg * 10) / 10,
      omega3Mg: Math.round(omega3Mg), // 300 mg active EPA + DHA
      fishOilMg: Math.round(fishOilMg), // 1,000 mg bulk fish oil
      epaMg: Math.round(epaMg), // 180 mg EPA
      dhaMg: Math.round(dhaMg), // 120 mg DHA
      carrierLipidsMg: Math.max(0, Math.round(fishOilMg - omega3Mg)), // 700 mg carrier fats
      vitaminB12Mcg: Math.round(vitaminB12Mcg * 10) / 10,
      vitaminCMg: Math.round(vitaminCMg),
      vitaminD3Iu: Math.round(vitaminD3Iu),
      creatineG: Math.round(creatineG * 10) / 10
    };

    // 7. Day-Wise Historical Tracking
    const dayMap = {};
    cleanedLogs.forEach(l => {
      if (!dayMap[l.date]) {
        dayMap[l.date] = {
          date: l.date,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0,
          sugar: 0,
          calories: 0,
          logs: []
        };
      }
      dayMap[l.date].protein += l.protein;
      dayMap[l.date].carbs += l.carbs;
      dayMap[l.date].fats += l.fats;
      dayMap[l.date].fiber += l.fiber;
      dayMap[l.date].sugar += l.sugar;
      dayMap[l.date].calories += l.calories;
      dayMap[l.date].logs.push(l);
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const dayWiseHistory = Object.keys(dayMap).sort().reverse().map(d => {
      const item = dayMap[d];
      const dateObj = new Date(d + "T00:00:00Z");
      const dayName = !isNaN(dateObj.getTime()) ? dayNames[dateObj.getUTCDay()] : "";
      const dayAbbr = !isNaN(dateObj.getTime()) ? dayShort[dateObj.getUTCDay()] : "";
      const act = dailyActivityMap[d] || { steps: 0, caloriesBurned: 0, sleepHours: 0 };

      return {
        date: d,
        dayName,
        dayAbbr,
        protein: Math.round(item.protein * 10) / 10,
        carbs: Math.round(item.carbs * 10) / 10,
        fats: Math.round(item.fats * 10) / 10,
        fiber: Math.round(item.fiber * 10) / 10,
        sugar: Math.round(item.sugar * 10) / 10,
        calories: Math.round(item.calories),
        metProteinGoal: item.protein >= DAILY_TARGETS.protein,
        mealsCount: item.logs.length,
        steps: act.steps || 0,
        caloriesBurned: act.caloriesBurned || 0,
        sleepHours: act.sleepHours || 0,
        netCalories: Math.round(item.calories) - (act.caloriesBurned || 0),
        logs: [...item.logs].reverse()
      };
    });

    // Monthly Analytics
    const monthlyMap = {};
    dayWiseHistory.forEach(d => {
      const ym = d.date.substring(0, 7);
      if (!monthlyMap[ym]) {
        monthlyMap[ym] = { month: ym, totalCalories: 0, totalProtein: 0, daysCount: 0 };
      }
      monthlyMap[ym].totalCalories += d.calories;
      monthlyMap[ym].totalProtein += d.protein;
      monthlyMap[ym].daysCount++;
    });

    const monthlyHistory = Object.keys(monthlyMap).sort().reverse().map(m => ({
      month: m,
      avgDailyProtein: Math.round(monthlyMap[m].totalProtein / monthlyMap[m].daysCount),
      avgDailyCalories: Math.round(monthlyMap[m].totalCalories / monthlyMap[m].daysCount),
      daysCount: monthlyMap[m].daysCount
    }));

    // Weekly Marathon Fueling Analytics
    const weekRange = getWeekRange(todayStr);
    const weekLogs = cleanedLogs.filter(l => l.date >= weekRange.startStr && l.date <= weekRange.endStr);

    const weekDaysMap = {};
    weekLogs.forEach(l => { weekDaysMap[l.date] = true; });
    const weekDaysLogged = Object.keys(weekDaysMap).length;

    const WEEKLY_TARGETS = {
      calories: 19600,
      protein: 1050,
      carbs: 2660,
      fats: 490,
      fiber: 266,
      sugar: 245,
      waterLiters: 28
    };

    const weeklyTotals = {
      protein: Math.round(weekLogs.reduce((s, l) => s + (l.protein || 0), 0) * 10) / 10,
      calories: Math.round(weekLogs.reduce((s, l) => s + (l.calories || 0), 0)),
      carbs: Math.round(weekLogs.reduce((s, l) => s + (l.carbs || 0), 0) * 10) / 10,
      fats: Math.round(weekLogs.reduce((s, l) => s + (l.fats || 0), 0) * 10) / 10,
      fiber: Math.round(weekLogs.reduce((s, l) => s + (l.fiber || 0), 0) * 10) / 10,
      sugar: Math.round(weekLogs.reduce((s, l) => s + (l.sugar || 0), 0) * 10) / 10,
      daysLogged: weekDaysLogged,
      label: weekRange.label,
      startStr: weekRange.startStr,
      endStr: weekRange.endStr
    };

    const todayMode = dailyModeMap[todayStr] || { mode: "run", distance: 10, duration: 60 };
    const dynamicTargets = calculateDayTargets({
      mode: todayMode.mode,
      distanceKm: todayMode.distance,
      durationMin: todayMode.duration,
      weightKg: 69
    });

    return res.status(200).json({
      todayStr,
      todayMode,
      targets: dynamicTargets,
      baseTargets: DAILY_TARGETS,
      weeklyTargets: WEEKLY_TARGETS,
      todayTotals,
      todayActivity,
      weeklyTotals,
      todayMicros,
      todayLogs,
      pantry,
      dayWiseHistory,
      monthlyHistory
    });

  } catch (err) {
    console.error("nutrition-data error:", err);
    return res.status(500).json({ error: err.message });
  }
}
