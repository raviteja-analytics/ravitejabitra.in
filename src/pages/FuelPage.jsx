import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VitalityRings from '../components/VitalityRings';
import MacroPod from '../components/MacroPod';
import { RefreshCw, Zap, Plus, CheckCircle2 } from 'lucide-react';

export default function FuelPage() {
  const [loading, setLoading] = useState(false);
  const [dayMode, setDayMode] = useState('run');
  const [data, setData] = useState({
    calories: { current: 2140, target: 2800 },
    protein: { current: 123, target: 150 },
    carbs: { current: 258, target: 380 },
    fats: { current: 52, target: 65 },
    water: { current: 3.1, target: 4.0 },
    sugar: { current: 24, target: 35 },
    fiber: { current: 28, target: 35 },
    micros: {
      sodium: 2850,
      potassium: 3920,
      magnesium: 410,
      omega3: 1600
    },
    timeline: [
      { id: 1, time: '08:30 AM', name: 'Eggs, Avocado Toast & Filter Coffee', calories: 420, protein: 28, carbs: 32, fats: 18 },
      { id: 2, time: '01:15 PM', name: 'Chicken Breast (200g), Rice & Dal', calories: 680, protein: 62, carbs: 74, fats: 14 },
      { id: 3, time: '05:00 PM', name: 'Whey Isolate Shake & Banana', calories: 280, protein: 30, carbs: 34, fats: 2 },
      { id: 4, time: '08:45 PM', name: 'Grilled Paneer & Mixed Salad', calories: 480, protein: 23, carbs: 18, fats: 18 }
    ]
  });

  const dayModes = [
    { id: 'rest', label: 'Rest / Fast', icon: '🧘', calories: 1650, protein: 125, carbs: 175, fats: 50 },
    { id: 'run', label: 'Run (10 km)', icon: '🏃', calories: 2690, protein: 150, carbs: 380, fats: 65 },
    { id: 'strength_upper', label: 'Strength Upper', icon: '🏋️', calories: 2250, protein: 150, carbs: 275, fats: 65 },
    { id: 'strength_legs', label: 'Strength Legs', icon: '🦵', calories: 2380, protein: 150, carbs: 310, fats: 65 }
  ];

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
      const res = await fetch('/api/telegram-fuel?action=get_today_nutrition');
      if (res.ok) {
        const json = await res.json();
        if (json.todayTotals) {
          setData(prev => ({
            ...prev,
            calories: { current: json.todayTotals.calories || prev.calories.current, target: json.targets?.calories || prev.calories.target },
            protein: { current: json.todayTotals.protein || prev.protein.current, target: json.targets?.protein || prev.protein.target },
            carbs: { current: json.todayTotals.carbs || prev.carbs.current, target: json.targets?.carbs || prev.carbs.target },
            fats: { current: json.todayTotals.fats || prev.fats.current, target: json.targets?.fats || prev.fats.target },
            water: { current: (json.todayMicros?.waterLiters) || prev.water.current, target: 4.0 },
            timeline: json.foodTimeline || prev.timeline
          }));
        }
      }
    } catch (_) {}
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
              Active mode: <b>{dayModes.find(m => m.id === dayMode)?.label}</b>
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
                {data.calories.current} kcal ({Math.round((data.calories.current / data.calories.target) * 100)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#34c759] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-mono block">Protein</span>
              <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                {data.protein.current}g / {data.protein.target}g ({Math.round((data.protein.current / data.protein.target) * 100)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#007aff] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-neutral-400 uppercase font-mono block">Water (4L)</span>
              <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                {data.water.current} / {data.water.target} L ({Math.round((data.water.current / data.water.target) * 100)}%)
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
              { label: 'Complete Protein', value: Math.round(data.protein.current * 0.75), pct: 75, color: '#fa114f', description: 'Chicken, Whey, Eggs, Paneer (all 9 essential amino acids).' },
              { label: 'Incomplete Protein', value: Math.round(data.protein.current * 0.25), pct: 25, color: '#f59e0b', description: 'Dal, Rice, Roti, Oats (plant amino acid pool).' }
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
              { label: 'Complex Starches', value: Math.round(data.carbs.current * 0.79), pct: 79, color: '#f59e0b', description: 'Sweet potatoes, Oats, Brown rice (slow-burning glycogen).' },
              { label: 'Natural Sugars', value: Math.round(data.carbs.current * 0.21), pct: 21, color: '#ec4899', description: 'Whole fruits, berries, banana recovery sugars.' }
            ]}
          />

          {/* WATER & HEALTHY FATS */}
          <MacroPod
            name="Water (4.0L)"
            subtitle="Hydration Sanctuary"
            icon="💧"
            current={data.water.current}
            target={data.water.target}
            unit="L"
            color="#007aff"
            breakdown={[
              { label: 'Unsaturated Healthy Fats', value: Math.round(data.fats.current * 0.69), pct: 69, color: '#007aff', description: 'Omega-3, Nuts, Olive oil for joint lubrication and hormone balance.' },
              { label: 'Saturated Fats', value: Math.round(data.fats.current * 0.31), pct: 31, color: '#a855f7', description: 'Ghee, dairy fats. Trans fats: 0g.' }
            ]}
          />
        </div>
      </div>

      {/* ── 4. CELLULAR MINERALS & VITALS ──────────────────────────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 block">Cellular Vitals</span>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Key Electrolytes & Minerals</h4>
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
        <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white mb-4">
          Today's Food Timeline (Logged via Telegram)
        </h3>

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
                  <span className="text-xs text-neutral-400 font-mono">{meal.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="font-bold text-neutral-900 dark:text-white">{meal.calories} kcal</span>
                <span className="text-neutral-300 dark:text-neutral-700">|</span>
                <span className="text-rose-500 font-bold">{meal.protein}g P</span>
                <span className="text-amber-500 font-bold">{meal.carbs}g C</span>
                <span className="text-purple-500 font-bold">{meal.fats}g F</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
