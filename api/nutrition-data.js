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

    // 4. Clean & normalize food logs
    const cleanedLogs = Array.isArray(rawLogs) ? rawLogs.map((r) => {
      const rowDate = normalizeToISTDateStr(r["Date"] || r.date || r.timestamp);
      const rowTime = formatDisplayTime(r["Time"] || r.time, r["Timestamp"] || r.timestamp);
      
      let vitals = "";
      const rawMsg = String(r["Raw Message"] || r.rawMessage || "");
      const vitalsMatch = rawMsg.match(/\[Vitals:\s*(.*?)\]/i);
      if (vitalsMatch) {
        vitals = vitalsMatch[1];
      } else if (r.vitals) {
        vitals = String(r.vitals);
      }

      return {
        date: rowDate,
        time: rowTime,
        itemName: r["Item Name"] || r.itemName || "",
        brand: r["Brand"] || r.brand || "",
        quantity: Number(r["Quantity"] || r.quantity) || 1,
        servingUnit: r["Serving Unit"] || r.servingUnit || "",
        calories: Number(r["Calories"] || r.calories) || 0,
        protein: Number(r["Protein"] || r.protein) || 0,
        carbs: Number(r["Carbs"] || r.carbs) || 0,
        fats: Number(r["Fats"] || r.fats) || 0,
        fiber: Number(r["Fiber"] || r.fiber) || 0,
        sugar: Number(r["Sugar"] || r.sugar) || 0,
        vitals: vitals,
        rawMessage: rawMsg.replace(/\[Vitals:\s*.*?\]/i, '').trim()
      };
    }) : [];

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
      const epa = extractNutrientValue(v, /epa[:\s]+([\d.]+)\s*mg/i);
      const dha = extractNutrientValue(v, /dha[:\s]+([\d.]+)\s*mg/i);
      const totalOmega = extractNutrientValue(v, /(?:total\s+)?omega(?:-3)?[:\s]+([\d.]+)\s*mg/i);
      if (totalOmega > 0) {
        omega3Mg += totalOmega;
      } else if (epa > 0 || dha > 0) {
        omega3Mg += (epa + dha);
      } else if (/fish\s*oil/i.test(l.itemName)) {
        omega3Mg += (l.quantity || 1) * 1000;
      }

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
      omega3Mg: Math.round(omega3Mg),
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

    return res.status(200).json({
      _rawLogsDebug: rawLogs.slice(0, 3),
      todayStr,
      targets: DAILY_TARGETS,
      todayTotals,
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
