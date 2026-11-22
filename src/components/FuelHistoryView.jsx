import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, Trophy, Flame, Zap, Award, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function FuelHistoryView({
  weeklyTotals,
  weeklyTargets = { protein: 1050, calories: 19600, carbs: 2660, fats: 490 },
  dayWiseHistory = [],
  monthlyHistory = []
}) {
  const [expandedDate, setExpandedDate] = useState(null);

  const toggleDayExpand = (date) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  // Weekly calculations
  const weekly = weeklyTotals || {};
  const pWeek = weekly.protein || 0;
  const cWeek = weekly.calories || 0;
  const cbWeek = weekly.carbs || 0;
  const fWeek = weekly.fats || 0;

  const pPct = Math.min(100, Math.round((pWeek / (weeklyTargets.protein || 1050)) * 100));
  const cPct = Math.min(100, Math.round((cWeek / (weeklyTargets.calories || 19600)) * 100));
  const cbPct = Math.min(100, Math.round((cbWeek / (weeklyTargets.carbs || 2660)) * 100));
  const fPct = Math.min(100, Math.round((fWeek / (weeklyTargets.fats || 490)) * 100));

  const daysLeft = Math.max(1, 7 - (weekly.daysLogged || 1));
  const neededP = Math.max(0, Math.round(((weeklyTargets.protein || 1050) - pWeek) / daysLeft));

  // Overall Historical KPIs
  const daysCount = dayWiseHistory.length;
  let totalProtein = 0;
  let totalCalories = 0;
  let goalsMet = 0;

  dayWiseHistory.forEach(d => {
    totalProtein += (d.protein || 0);
    totalCalories += (d.calories || 0);
    if (d.metProteinGoal || d.protein >= 150) {
      goalsMet++;
    }
  });

  const avgProtein = daysCount > 0 ? Math.round(totalProtein / daysCount) : 0;
  const avgCalories = daysCount > 0 ? Math.round(totalCalories / daysCount) : 0;
  const complianceRate = daysCount > 0 ? Math.round((goalsMet / daysCount) * 100) : 0;

  const formatMonthLabel = (mStr) => {
    if (!mStr) return 'Month';
    const parts = mStr.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${monthNames[mIdx] || 'Month'} ${year}`;
    }
    return mStr;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* ── 1. CURRENT WEEK MARATHON FUELING PACING ─────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-500 bg-sky-500/10 px-3 py-1 rounded-full mb-1">
              <span>🏃</span> Marathon Fueling Dynamics
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              Current Week Marathon Fueling Pacing
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-sky-500 bg-sky-500/10 px-3.5 py-1.5 rounded-xl border border-sky-500/20">
            {weekly.label || 'This Week'}
          </span>
        </div>

        {/* 4 Weekly Macro Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Weekly Protein */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-rose-500">🥩 Weekly Protein</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{pPct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-rose-500 leading-tight">
              {pWeek} <span className="text-xs font-normal text-neutral-400">/ {weeklyTargets.protein || 1050} g</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${pPct}%` }} />
            </div>
          </div>

          {/* Weekly Calories */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-orange-500">🔥 Surplus Energy</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{cPct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-orange-500 leading-tight">
              {cWeek.toLocaleString()} <span className="text-xs font-normal text-neutral-400">/ {(weeklyTargets.calories || 19600).toLocaleString()} kcal</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${cPct}%` }} />
            </div>
          </div>

          {/* Weekly Carbohydrates */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-amber-500">🍞 Glycogen Carbs</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{cbPct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-500 leading-tight">
              {cbWeek} <span className="text-xs font-normal text-neutral-400">/ {weeklyTargets.carbs || 2660} g</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${cbPct}%` }} />
            </div>
          </div>

          {/* Weekly Fats */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-sky-500">🥑 Hormonal Fats</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{fPct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-sky-500 leading-tight">
              {fWeek} <span className="text-xs font-normal text-neutral-400">/ {weeklyTargets.fats || 490} g</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${fPct}%` }} />
            </div>
          </div>

        </div>

        {/* Dynamic Sports Nutrition Pacing Insight */}
        <div className="p-4 rounded-2xl bg-sky-500/10 border-l-4 border-sky-500 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans">
          💡 <b>Sports Science Pacing:</b> You've logged <b>{pWeek}g</b> of your {(weeklyTargets.protein || 1050)}g weekly protein target across <b>{weekly.daysLogged || 1} day{weekly.daysLogged === 1 ? '' : 's'}</b>. Across the remaining <b>{daysLeft} day{daysLeft === 1 ? '' : 's'}</b> this week, aim for ~<b>{neededP}g protein/day</b> to stay on track for your surplus & marathon cellular recovery!
        </div>
      </div>

      {/* ── 2. HISTORICAL PERFORMANCE KPIS ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm font-mono">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider block mb-1">
            Daily Avg Protein
          </span>
          <span className="text-2xl font-black text-rose-500 block leading-tight">
            {avgProtein} <span className="text-xs font-normal text-neutral-400">g/day</span>
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Target: 150g</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm font-mono">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider block mb-1">
            Daily Avg Calories
          </span>
          <span className="text-2xl font-black text-orange-500 block leading-tight">
            {avgCalories.toLocaleString()} <span className="text-xs font-normal text-neutral-400">kcal</span>
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Target: ~2,250–3,029</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm font-mono">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider block mb-1">
            150g Protein Met
          </span>
          <span className="text-2xl font-black text-emerald-500 block leading-tight">
            {goalsMet} <span className="text-xs font-normal text-neutral-400">days</span>
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">{complianceRate}% compliance</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm font-mono">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider block mb-1">
            Total Logged Days
          </span>
          <span className="text-2xl font-black text-sky-500 block leading-tight">
            {daysCount} <span className="text-xs font-normal text-neutral-400">days</span>
          </span>
          <span className="text-[10px] text-neutral-500 block mt-1">Athlete journal active</span>
        </div>

      </div>

      {/* ── 3. MONTHLY SUMMARY & DAY-BY-DAY HISTORY GRID ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Monthly Breakdown Cards */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>Monthly Overview</span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">{monthlyHistory.length} mos</span>
          </div>

          {monthlyHistory.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No monthly aggregates available yet.</p>
          ) : (
            <div className="space-y-3">
              {monthlyHistory.map((m, idx) => (
                <div
                  key={m.month || idx}
                  className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2 font-mono text-xs"
                >
                  <div className="font-bold text-neutral-900 dark:text-white font-sans text-sm">
                    {formatMonthLabel(m.month)}
                  </div>
                  <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                    <span>Avg Protein:</span>
                    <span className="font-bold text-rose-500">{m.avgDailyProtein} g/day</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                    <span>Avg Energy:</span>
                    <span className="font-bold text-orange-500">{(m.avgDailyCalories || 0).toLocaleString()} kcal</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                    <span>Logged Days:</span>
                    <span className="font-bold text-sky-500">{m.daysCount} days</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Day-by-Day Historical Log (Interactive Accordion) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Day-by-Day Fuel History</span>
            </h3>
            <span className="font-mono text-xs font-bold text-neutral-400">
              {dayWiseHistory.length} Days Recorded
            </span>
          </div>

          {dayWiseHistory.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No past day logs recorded yet. Send your first food intake to @raviteja_fuel_bot!</p>
          ) : (
            <div className="space-y-3">
              {dayWiseHistory.map((d) => {
                const isExpanded = expandedDate === d.date;
                const isTargetHit = d.protein >= 150;

                return (
                  <div
                    key={d.date}
                    className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden transition-all"
                  >
                    {/* Day Row Header */}
                    <div
                      onClick={() => toggleDayExpand(d.date)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isTargetHit ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-900 dark:text-white font-sans">
                              {d.date}
                            </span>
                            {d.dayAbbr && (
                              <span className="text-[11px] font-mono text-neutral-400">
                                ({d.dayAbbr})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {d.mealsCount || d.logs?.length || 0} meals logged
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <div className="text-right">
                          <span className={`text-sm font-black block leading-tight ${isTargetHit ? 'text-rose-500' : 'text-neutral-700 dark:text-neutral-300'}`}>
                            {d.protein}g <span className="text-[10px] font-normal text-neutral-400">P</span>
                          </span>
                          <span className="text-[11px] text-neutral-400 block">
                            {d.calories} kcal
                          </span>
                        </div>

                        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180 text-rose-500' : ''}`} />
                      </div>
                    </div>

                    {/* Expandable Itemized Meal Logs */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="px-4 pb-4 pt-1 border-t border-black/[0.04] dark:border-white/[0.04] space-y-2"
                        >
                          {/* Macro Summary Pill Row */}
                          <div className="grid grid-cols-4 gap-2 font-mono text-[11px] text-center py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 mb-2">
                            <div>
                              <span className="text-neutral-400 block text-[9px] uppercase">Protein</span>
                              <span className="font-bold text-rose-500">{d.protein}g</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[9px] uppercase">Carbs</span>
                              <span className="font-bold text-amber-500">{d.carbs || 0}g</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[9px] uppercase">Fats</span>
                              <span className="font-bold text-sky-500">{d.fats || 0}g</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[9px] uppercase">Fiber</span>
                              <span className="font-bold text-emerald-500">{d.fiber || 0}g</span>
                            </div>
                          </div>

                          {/* Itemized meals */}
                          {!d.logs || d.logs.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic py-1">No individual meal items recorded for this date.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {d.logs.map((item, mIdx) => (
                                <div
                                  key={item.id || mIdx}
                                  className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                      {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ''}
                                      {item.itemName || item.rawMessage || 'Meal'}
                                    </span>
                                  </div>
                                  <div className="font-mono text-right flex-shrink-0 flex items-center gap-2">
                                    <span className="font-bold text-rose-500">+{item.protein}g P</span>
                                    <span className="text-neutral-400">+{item.calories} kcal</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}