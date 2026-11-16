// Vercel Serverless Function: Nutrition & Fuel API
// Serves: Today's Macro Totals, Today's Logs, and Master Pantry Catalog
// Target: /api/nutrition-data

const GOOGLE_SCRIPT_URL = process.env.WATER_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwcQUP8bClLpHeZnwvCrtqm-KvMItQkMNZ0lY0YYCPAOchBlMEbUP-NqejKThehipvW/exec";

const DAILY_TARGETS = {
  protein: 150,
  carbs: 220,
  fats: 60,
  fiber: 30,
  sugar: 35,
  calories: 2100
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
  
  // Check if first object's keys look like data rather than standard headers
  const firstObj = rawPantry[0];
  const keys = Object.keys(firstObj);
  const isCustomHeader = !keys.includes("Item Name") && !keys.includes("itemName");

  if (isCustomHeader) {
    // The keys of the first row are item #0 (e.g. MyFitness Peanut Butter)
    const vitalsMatch0 = (keys[10] || "").match(/\[Vitals:\s*(.*?)\]/i);
    result.push({
      id: `pantry_0`,
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

    // The subsequent objects have values corresponding to columns in order
    rawPantry.forEach((row, idx) => {
      const vals = Object.values(row);
      const rawAliases = String(vals[10] || "");
      const vitalsMatch = rawAliases.match(/\[Vitals:\s*(.*?)\]/i);
      result.push({
        id: `pantry_${idx + 1}`,
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
    rawPantry.forEach((item, idx) => {
      const rawAliases = item["Aliases"] || item.aliases || "";
      const match = rawAliases.match(/\[Vitals:\s*(.*?)\]/i);
      result.push({
        id: `pantry_${idx}`,
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  // Disable caching so newly logged meals reflect instantly
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    // 1. Fetch Today's IST Date
    const date = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + istOffsetMs);
    const yyyy = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // 2. Fetch Nutrition Logs and Pantry Catalog in parallel
    const [logsRes, pantryRes] = await Promise.all([
      fetch(`${GOOGLE_SCRIPT_URL}?sheet=nutrition`),
      fetch(`${GOOGLE_SCRIPT_URL}?sheet=catalog`)
    ]);

    const rawLogs = logsRes.ok ? await logsRes.json() : [];
    const rawPantry = pantryRes.ok ? await pantryRes.json() : [];

    // 3. Clean Pantry Items
    const pantry = parsePantryRows(rawPantry);

    // 4. Clean and Filter Today's Food Logs
    const cleanedLogs = Array.isArray(rawLogs) ? rawLogs.map((r, idx) => {
      const rowDate = normalizeToISTDateStr(r.Date || r.date || "");
      const timestamp = r.Timestamp || r.timestamp || "";
      const rowTime = formatDisplayTime(r.Time || r.time, timestamp);
      const rawMsg = r["Message"] || r.rawMessage || "";
      let vitals = "";
      const match = rawMsg.match(/\[Vitals:\s*(.*?)\]/i);
      if (match) vitals = match[1];

      return {
        id: `food_${idx}_${timestamp}`,
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

    // 5. Aggregate Today's Totals
    const todayTotals = {
      protein: Math.round(todayLogs.reduce((sum, l) => sum + l.protein, 0) * 10) / 10,
      carbs: Math.round(todayLogs.reduce((sum, l) => sum + l.carbs, 0) * 10) / 10,
      fats: Math.round(todayLogs.reduce((sum, l) => sum + l.fats, 0) * 10) / 10,
      fiber: Math.round(todayLogs.reduce((sum, l) => sum + l.fiber, 0) * 10) / 10,
      sugar: Math.round(todayLogs.reduce((sum, l) => sum + l.sugar, 0) * 10) / 10,
      calories: Math.round(todayLogs.reduce((sum, l) => sum + l.calories, 0))
    };

    // 6. Day-Wise Historical Tracking
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
      todayStr,
      targets: DAILY_TARGETS,
      todayTotals,
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
