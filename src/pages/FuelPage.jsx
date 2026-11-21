import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VitalityRings from '../components/VitalityRings';
import MacroPod from '../components/MacroPod';
import { RefreshCw, Zap, Plus, CheckCircle2 } from 'lucide-react';

export default function FuelPage() {
  const [loading, setLoading] = useState(true);
  const [dayMode, setDayMode] = useState('strength_upper');
  const [data, setData] = useState({
    todayStr: '',
    calories: { current: 0, target: 2250 },
    protein: { current: 0, target: 150 },
    carbs: { current: 0, target: 266 },
    fats: { current: 0, target: 65 },
    water: { current: 0, target: 4.0 },
    sugar: { current: 0, target: 35 },
    fiber: { current: 0, target: 35 },
    micros: {
      sodium: 0,
      potassium: 0,
      magnesium: 0,
      omega3: 0
    },
    bioProtein: { complete: 0, incomplete: 0, completePct: 100, incompletePct: 0 },
    bioCarbs: { complex: 0, simple: 0, complexPct: 100, simplePct: 0 },
    bioFats: { unsaturated: 0, saturated: 0, unsatPct: 100, satPct: 0 },
    timeline: []
  });

  const dayModes = [
    { id: 'rest', label: 'Rest / Fast', icon: '🧘', calories: 1650, protein: 125, carbs: 175, fats: 50 },
    { id: 'run', label: 'Run (10 km)', icon: '🏃', calories: 2690, protein: 150, carbs: 380, fats: 65 },
    { id: 'strength_upper', label: 'Strength Upper', icon: '🏋️', calories: 2250, protein: 150, carbs: 266, fats: 65 },
    { id: 'strength_legs', label: 'Strength Legs', icon: '🦵', calories: 2380, protein: 150, carbs: 310, fats: 65 }
  ];

  const calculateBioBreakdown = (logs) => {
    if (!logs || !logs.length) {
      return {
        protein: { complete: 0, incomplete: 0, completePct: 100, incompletePct: 0 },
        carbs: { complex: 0, simple: 0, complexPct: 100, simplePct: 0 },
        fats: { unsaturated: 0, saturated: 0, unsatPct: 100, satPct: 0 }
      };
    }

    // 1. Protein
    let completeP = 0;
    let incompleteP = 0;
    logs.forEach(l => {
      const p = parseFloat(l.protein) || 0;
      if (p <= 0) return;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      const isComplete = /(?:chicken|poultry|turkey|egg|fish|salmon|tuna|prawn|seafood|whey|casein|paneer|curd|yogurt|milk|tofu|soy|edamame|meat|mutton|beef)/i.test(text);
      const isPairedMeal = /(?:chicken.*(?:rice|roti|bread|grain)|(?:rice|roti|bread|grain).*chicken|paneer.*(?:rice|roti)|tofu.*(?:rice|roti)|dal.*(?:rice|khichdi)|khichdi)/i.test(text);
      if (isComplete || isPairedMeal) {
        completeP += p;
      } else {
        incompleteP += p;
      }
    });
    const totalP = completeP + incompleteP || 1;

    // 2. Carbs
    let complexC = 0;
    let simpleC = 0;
    logs.forEach(l => {
      const c = parseFloat(l.carbs) || 0;
      if (c <= 0) return;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      const sugar = parseFloat(l.sugar) || 0;
      if (/sugar|glucose|dextrose|honey|jaggery|gel|juice|soda|sweet|dessert|candy|chocolate/i.test(text)) {
        simpleC += c;
      } else if (/banana|date|raisin|fruit|apple|mango|orange|grape/i.test(text)) {
        const sPart = Math.min(c, Math.max(sugar, c * 0.75));
        simpleC += sPart;
        complexC += Math.max(0, c - sPart);
      } else {
        const sPart = Math.min(c, sugar);
        simpleC += sPart;
        complexC += Math.max(0, c - sPart);
      }
    });
    const totalC = complexC + simpleC || 1;

    // 3. Fats
    let satF = 0;
    let unsatF = 0;
    logs.forEach(l => {
      const f = parseFloat(l.fats) || 0;
      if (f <= 0) return;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.vitals || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      const satMatch = text.match(/saturated(?:\s*fat)?[:\s]+([\d.]+)\s*g/i);
      if (satMatch) {
        const sVal = parseFloat(satMatch[1]) || 0;
        satF += sVal;
        unsatF += Math.max(0, f - sVal);
      } else if (/ghee|butter|cheese/i.test(text)) {
        satF += f * 0.65;
        unsatF += f * 0.35;
      } else if (/paneer|milk|curd|yogurt/i.test(text)) {
        satF += f * 0.60;
        unsatF += f * 0.40;
      } else if (/egg|chicken|fish/i.test(text)) {
        satF += f * 0.30;
        unsatF += f * 0.70;
      } else if (/peanut|almond|walnut|nut|seed|olive|mustard/i.test(text)) {
        satF += f * 0.15;
        unsatF += f * 0.85;
      } else {
        satF += f * 0.33;
        unsatF += f * 0.67;
      }
    });
    const totalF = satF + unsatF || 1;

    return {
      protein: {
        complete: Math.round(completeP * 10) / 10,
        incomplete: Math.round(incompleteP * 10) / 10,
        completePct: Math.round((completeP / totalP) * 100),
        incompletePct: Math.round((incompleteP / totalP) * 100)
      },
      carbs: {
        complex: Math.round(complexC * 10) / 10,
        simple: Math.round(simpleC * 10) / 10,
        complexPct: Math.round((complexC / totalC) * 100),
        simplePct: Math.round((simpleC / totalC) * 100)
      },
      fats: {
        unsaturated: Math.round(unsatF * 10) / 10,
        saturated: Math.round(satF * 10) / 10,
        unsatPct: Math.round((unsatF / totalF) * 100),
        satPct: Math.round((satF / totalF) * 100)
      }
    };
  };

  const handleDayModeChange = (mode) => {
    setDayMode(mode.id);
    setData(prev => ({
      ...prev,
      calories: { ...prev.calories, target: mode.calories },
      protein: { ...prev.protein, target: mode.protein },
      carbs: { ...prev.carbs, target: mode.carbs },
      fats: { ...prev.fats, target: mode.fats }
    }));
  };

  const fetchLiveFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nutrition-data');
      if (res.ok) {
        const json = await res.json();
        const totals = json.todayTotals || {};
        const targets = json.targets || {};
        const micros = json.todayMicros || {};
        const logs = json.todayLogs || [];
        const bio = calculateBioBreakdown(logs);

        if (json.todayMode && json.todayMode.mode) {
          setDayMode(json.todayMode.mode);
        }

        const mappedTimeline = logs.map((log, idx) => ({
          id: log.rawTimestamp || idx,
          time: log.time || '',
          name: (log.quantity && log.servingUnit ? `${log.quantity} ${log.servingUnit} ` : '') + (log.itemName || log.rawMessage || 'Meal'),
          brand: log.brand || '',
          calories: Math.round(log.calories || 0),
          protein: Math.round((log.protein || 0) * 10) / 10,
          carbs: Math.round((log.carbs || 0) * 10) / 10,
          fats: Math.round((log.fats || 0) * 10) / 10,
          fiber: Math.round((log.fiber || 0) * 10) / 10,
          sugar: Math.round((log.sugar || 0) * 10) / 10,
          vitals: log.vitals || ''
        }));

        setData({
          todayStr: json.todayStr || new Date().toISOString().split('T')[0],
          calories: {
            current: Math.round(totals.calories || 0),
            target: targets.calories || 2250
          },
          protein: {
            current: Math.round((totals.protein || 0) * 10) / 10,
            target: targets.protein || 150
          },
          carbs: {
            current: Math.round((totals.carbs || 0) * 10) / 10,
            target: targets.carbs || 266
          },
          fats: {
            current: Math.round((totals.fats || 0) * 10) / 10,
            target: targets.fats || 65
          },
          water: {
            current: Math.round(((micros.waterLiters || 1.85)) * 10) / 10,
            target: targets.waterLiters || targets.hydroLiters || 4.0
          },
          sugar: {
            current: Math.round((totals.sugar || 0) * 10) / 10,
            target: targets.sugar || 35
          },
          fiber: {
            current: Math.round((totals.fiber || 0) * 10) / 10,
            target: targets.fiber || 35
          },
          micros: {
            sodium: Math.round(micros.sodiumMg || 0),
            potassium: Math.round(micros.potassiumMg || 0),
            magnesium: Math.round(micros.magnesiumMg || 0),
            omega3: Math.round(micros.omega3Mg || 0)
          },
          bioProtein: bio.protein,
          bioCarbs: bio.carbs,
          bioFats: bio.fats,
          timeline: mappedTimeline
        });
      }
    } catch (err) {
      console.error("Failed to fetch live nutrition data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveFeed();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Page Header & Live Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-2">
            <span>●</span> Vitality & Nutrition Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Daily Fuel & Vitals
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time biomonitoring synced with <code>@raviteja_fuel_bot</code> on Telegram.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchLiveFeed}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-500' : ''}`} />
            <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
          </motion.button>
        </div>
      </div>

      {/* ── 1. VITALITY RINGS SUMMARY CARD ───────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left: Concentric Vitality Rings */}
        <div className="flex items-center gap-6 sm:gap-8">
          <VitalityRings
            calories={data.calories}
            protein={data.protein}
            water={data.water}
            size={144}
          />
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 block">Energy & Recovery Rings</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {data.calories.current.toLocaleString()} <span className="text-sm font-normal text-neutral-400">/ {data.calories.target.toLocaleString()} kcal</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Active mode: <b>{dayModes.find(m => m.id === dayMode)?.label || dayMode}</b>
            </p>
          </div>
        </div>

        {/* Right: Ring Legend */}
        <div className="grid grid-cols-3 md:grid-cols-1 gap-4 w-full md:w-auto text-left">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#fa114f] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-mono block">Energy</span>
              <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                {data.calories.current} kcal ({data.calories.target ? Math.round((data.calories.current / data.calories.target) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#34c759] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-mono block">Protein</span>
              <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                {data.protein.current}g / {data.protein.target}g ({data.protein.target ? Math.round((data.protein.current / data.protein.target) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#007aff] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-mono block">Water (4L)</span>
              <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                {data.water.current} / {data.water.target} L ({data.water.target ? Math.round((data.water.current / data.water.target) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. DAY MODE SELECTOR (ATHLETIC TARGETS) ─────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {dayModes.map((mode) => {
          const isSelected = dayMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleDayModeChange(mode)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 border ${
                isSelected
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent shadow-md'
                  : 'bg-white dark:bg-[#1c1c1e] text-neutral-600 dark:text-neutral-400 border-black/[0.06] dark:border-white/[0.08] hover:border-neutral-400'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
              <span className="text-[10px] font-mono opacity-60">({mode.calories} kcal)</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. CORE MACRONUTRIENT PODS ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
            Target Macronutrients
          </h3>
          <span className="text-xs text-neutral-400">
            Tap cards for Complete vs Incomplete breakdown
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {/* PROTEIN */}
          <MacroPod
            name="Protein"
            subtitle="Muscle Recovery & Building"
            icon="🥩"
            current={data.protein.current}
            target={data.protein.target}
            unit="g"
            color="#fa114f"
            breakdown={[
              {
                label: 'Complete Protein',
                value: data.bioProtein.complete,
                pct: data.bioProtein.completePct,
                color: '#fa114f',
                description: 'Chicken, Whey, Eggs, Paneer, Milk (all 9 essential amino acids).'
              },
              {
                label: 'Incomplete Protein',
                value: data.bioProtein.incomplete,
                pct: data.bioProtein.incompletePct,
                color: '#f59e0b',
                description: 'Oats, Dates, Rice, Dal (plant amino acid pool).'
              }
            ]}
          />

          {/* CARBOHYDRATES */}
          <MacroPod
            name="Carbohydrates"
            subtitle="Daily Stamina & Energy"
            icon="⚡"
            current={data.carbs.current}
            target={data.carbs.target}
            unit="g"
            color="#f59e0b"
            breakdown={[
              {
                label: 'Complex Starches',
                value: data.bioCarbs.complex,
                pct: data.bioCarbs.complexPct,
                color: '#f59e0b',
                description: 'Oats, Rice, Sweet Potatoes (sustained cellular glycogen).'
              },
              {
                label: 'Natural / Rapid Sugars',
                value: data.bioCarbs.simple,
                pct: data.bioCarbs.simplePct,
                color: '#ec4899',
                description: 'Whole bananas, dates, fruits for quick muscle glycogen replenishment.'
              }
            ]}
          />

          {/* HEALTHY FATS */}
          <MacroPod
            name="Dietary Fats"
            subtitle="Hormone & Joint Health"
            icon="🥑"
            current={data.fats.current}
            target={data.fats.target}
            unit="g"
            color="#007aff"
            breakdown={[
              {
                label: 'Unsaturated Healthy Fats',
                value: data.bioFats.unsaturated,
                pct: data.bioFats.unsatPct,
                color: '#007aff',
                description: 'Fish oil, Omega-3, Nuts, Mustard/Olive oil for joint lubrication and heart vitality.'
              },
              {
                label: 'Saturated Dietary Fats',
                value: data.bioFats.saturated,
                pct: data.bioFats.satPct,
                color: '#a855f7',
                description: 'Milk, dairy lipids, and whole food fats. Trans fats: 0g.'
              }
            ]}
          />
        </div>
      </div>

      {/* ── 4. CELLULAR MINERALS & VITALS ──────────────────────────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 block">Cellular Vitals</span>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Key Electrolytes & Minerals Absorbed Today</h4>
          </div>
          <span className="text-xs text-neutral-400">Absorbed from daily nutrition & supplements</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center">
            <span className="text-[11px] text-neutral-400 uppercase font-mono block">Sodium (Na⁺)</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.sodium} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 3,500</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center">
            <span className="text-[11px] text-neutral-400 uppercase font-mono block">Potassium (K⁺)</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.potassium} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 4,700</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center">
            <span className="text-[11px] text-neutral-400 uppercase font-mono block">Magnesium</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.magnesium} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 420</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center">
            <span className="text-[11px] text-neutral-400 uppercase font-mono block">Omega-3</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.omega3} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 1,500</span>
          </div>
        </div>
      </div>

      {/* ── 5. FOOD TIMELINE ───────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
            Today's Food Timeline (Logged via Telegram)
          </h3>
          <span className="text-xs font-mono text-neutral-400">
            {data.timeline.length} {data.timeline.length === 1 ? 'entry' : 'entries'} today
          </span>
        </div>

        {data.timeline.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            No meals logged yet today. Send a photo or description to <code>@raviteja_fuel_bot</code> on Telegram!
          </div>
        ) : (
          <div className="space-y-3">
            {data.timeline.map((meal) => (
              <div
                key={meal.id}
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h5 className="text-sm font-bold text-neutral-900 dark:text-white">{meal.name}</h5>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                      {meal.time && <span>{meal.time}</span>}
                      {meal.vitals && <span className="truncate max-w-xs opacity-75">• {meal.vitals}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
                  <span className="font-bold text-neutral-900 dark:text-white">{meal.calories} kcal</span>
                  <span className="text-neutral-300 dark:text-neutral-700">|</span>
                  <span className="text-rose-500 font-bold">{meal.protein}g P</span>
                  <span className="text-amber-500 font-bold">{meal.carbs}g C</span>
                  <span className="text-purple-500 font-bold">{meal.fats}g F</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
