// API endpoint to fetch water intake data from Google Sheet
// Target: ravitejabitra.in/api/water-data

const GOOGLE_SCRIPT_URL = process.env.WATER_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwcQUP8bClLpHeZnwvCrtqm-KvMItQkMNZ0lY0YYCPAOchBlMEbUP-NqejKThehipvW/exec";
const DAILY_GOAL_ML = 4000;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  // Disable caching so newly poured water appears instantly
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const fetchRes = await fetch(GOOGLE_SCRIPT_URL, { method: "GET" });
    if (!fetchRes.ok) {
      return res.status(500).json({ error: "Failed to fetch from Google Sheet" });
    }

    const rows = await fetchRes.json();
    if (!Array.isArray(rows)) {
      return res.status(200).json({
        goal: DAILY_GOAL_ML,
        todayTotal: 0,
        todayLogs: [],
        history: []
      });
    }

    // Get Today's Date in IST
    const date = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + istOffsetMs);
    const yyyy = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Normalize rows
    const cleanedLogs = rows.map((r, idx) => {
      const rowDate = String(r.Date || r.date || "").trim();
      const rowTime = String(r.Time || r.time || "").trim();
      const amount = Number(r["Amount (ml)"] || r.amount) || 0;
      const timestamp = r.Timestamp || r.timestamp || "";
      const rawMessage = r.Message || r.rawMessage || "";
      return {
        id: `log_${idx}_${timestamp}`,
        date: rowDate,
        time: rowTime,
        amount,
        timestamp,
        rawMessage
      };
    }).filter(l => l.amount > 0);

    // Filter today's logs
    const todayLogs = cleanedLogs.filter(l => l.date === todayStr);
    const todayTotal = todayLogs.reduce((sum, l) => sum + l.amount, 0);

    // Group previous days for history/streak
    const historyMap = {};
    cleanedLogs.forEach(l => {
      if (!historyMap[l.date]) {
        historyMap[l.date] = 0;
      }
      historyMap[l.date] += l.amount;
    });

    const history = Object.keys(historyMap).sort().map(d => ({
      date: d,
      total: historyMap[d],
      metGoal: historyMap[d] >= DAILY_GOAL_ML
    }));

    return res.status(200).json({
      goal: DAILY_GOAL_ML,
      todayStr,
      todayTotal,
      todayLogs,
      history,
      allLogsCount: cleanedLogs.length
    });
  } catch (err) {
    console.error("water-data error:", err);
    return res.status(500).json({ error: err.message });
  }
}
