import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VitalityRings from '../components/VitalityRings';
import MacroPod from '../components/MacroPod';
import NutrientBreakdownModal from '../components/NutrientBreakdownModal';
import { RefreshCw, Zap, Plus, CheckCircle2, Footprints, Flame, Moon, Info, HeartPulse, PieChart, ArrowUpRight } from 'lucide-react';

export default function FuelPage() {
  const [loading, setLoading] = useState(true);
  const [dayMode, setDayMode] = useState('strength_upper');
  const [activeBreakdownKey, setActiveBreakdownKey] = useState(null);
  const [data, setData] = useState({
    todayStr: '',
    calories: { current: 0, target: 2250 },
    protein: { current: 0, target: 150 },
    carbs: { current: 0, target: 266 },
    fats: { current: 0, target: 65 },
    water: { current: 0, target: 4.0 },
    sugar: { current: 0, target: 35 },
    fiber: { current: 0, target: 35 },
    activity: {
      steps: 0,
      stepsTarget: 10000,
      caloriesBurned: 0,
      caloriesBurnedTarget: 500,
      sleepHours: 0,
      sleepTarget: 8.0
    },
    micros: {
      sodium: 0,
      potassium: 0,
      magnesium: 0,
      omega3: 0,
      creatine: 0
    },
    bioProtein: { complete: 0, incomplete: 0, completePct: 100, incompletePct: 0 },
    bioCarbs: { complex: 0, simple: 0, complexPct: 100, simplePct: 0 },
    bioFats: { unsaturated: 0, saturated: 0, unsatPct: 100, satPct: 0 },
    bioFiber: { soluble: 0, insoluble: 0, solublePct: 40, insolublePct: 60 },
    bioSugar: { natural: 0, added: 0, naturalPct: 100, addedPct: 0 },
    timeline: [],
    rawLogs: []
  });

  const dayModes = [
    { id: 'rest', label: 'Rest / Fast', icon: '🧘', calories: 1650, protein: 125, carbs: 175, fats: 50, bmr: 1650, burn: 0 },
    { id: 'run', label: 'Run (10 km)', icon: '🏃', calories: 2690, protein: 150, carbs: 380, fats: 65, bmr: 2000, burn: 690 },
    { id: 'strength_upper', label: 'Strength Upper', icon: '🏋️', calories: 2250, protein: 150, carbs: 266, fats: 65, bmr: 2000, burn: 250 },
    { id: 'strength_legs', label: 'Strength Legs', icon: '🦵', calories: 2380, protein: 150, carbs: 310, fats: 65, bmr: 2000, burn: 380 }
  ];

  const calculateBioBreakdown = (logs) => {
    if (!logs || !logs.length) {
      return {
        protein: { complete: 0, incomplete: 0, completePct: 100, incompletePct: 0 },
        carbs: { complex: 0, simple: 0, complexPct: 100, simplePct: 0 },
        fats: { unsaturated: 0, saturated: 0, unsatPct: 100, satPct: 0 },
        fiber: { soluble: 0, insoluble: 0, solublePct: 40, insolublePct: 60 },
        sugar: { natural: 0, added: 0, naturalPct: 100, addedPct: 0 }
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

    // 2. Carbs & Sugars
    let complexC = 0;
    let simpleC = 0;
    let naturalS = 0;
    let addedS = 0;
    logs.forEach(l => {
      const c = parseFloat(l.carbs) || 0;
      const s = parseFloat(l.sugar) || 0;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.rawMessage || '')).toLowerCase();

      if (/banana|date|raisin|fruit|apple|mango|orange|grape|milk/i.test(text)) {
        naturalS += s;
        const sPart = Math.min(c, Math.max(s, c * 0.75));
        simpleC += sPart;
        complexC += Math.max(0, c - sPart);
      } else if (/sugar|glucose|dextrose|honey|jaggery|gel|juice|soda|sweet|dessert|candy|chocolate/i.test(text)) {
        addedS += s;
        simpleC += c;
      } else {
        naturalS += s;
        const sPart = Math.min(c, s);
        simpleC += sPart;
        complexC += Math.max(0, c - sPart);
      }
    });
    const totalC = complexC + simpleC || 1;
    const totalS = naturalS + addedS || 1;

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

    // 4. Fiber
    let totalFib = logs.reduce((sum, l) => sum + (parseFloat(l.fiber) || 0), 0);
    let solubleFib = Math.round(totalFib * 0.4 * 10) / 10;
    let insolubleFib = Math.round(totalFib * 0.6 * 10) / 10;

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
      },
      fiber: {
        soluble: solubleFib,
        insoluble: insolubleFib,
        solublePct: 40,
        insolublePct: 60
      },
      sugar: {
        natural: Math.round(naturalS * 10) / 10,
        added: Math.round(addedS * 10) / 10,
        naturalPct: Math.round((naturalS / totalS) * 100),
        addedPct: Math.round((addedS / totalS) * 100)
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
        const act = json.todayActivity || {};
        const logs = json.todayLogs || [];
        const bio = calculateBioBreakdown(logs);

        if (json.todayMode && json.todayMode.mode) {
          setDayMode(json.todayMode.mode);
        }

        const mappedTimeline = logs.map((log, idx) => ({
          id: log.rawTimestamp || idx,
          rawTimestamp: log.rawTimestamp || idx,
          time: log.time || '',
          name: (log.quantity && log.servingUnit ? `${log.quantity} ${log.servingUnit} ` : '') + (log.itemName || log.rawMessage || 'Meal'),
          itemName: log.itemName || '',
          rawMessage: log.rawMessage || '',
          brand: log.brand || '',
          quantity: log.quantity || 1,
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
          activity: {
            steps: act.steps || 0,
            stepsTarget: act.stepsTarget || 10000,
            caloriesBurned: act.caloriesBurned || 0,
            caloriesBurnedTarget: act.caloriesBurnedTarget || 500,
            sleepHours: act.sleepHours || 0,
            sleepTarget: act.sleepTarget || 8.0
          },
          micros: {
            sodium: Math.round(micros.sodiumMg || 0),
            potassium: Math.round(micros.potassiumMg || 0),
            magnesium: Math.round(micros.magnesiumMg || 0),
            omega3: Math.round(micros.omega3Mg || 0),
            creatine: Number((micros.creatineG || 0).toFixed(1))
          },
          bioProtein: bio.protein,
          bioCarbs: bio.carbs,
          bioFats: bio.fats,
          bioFiber: bio.fiber,
          bioSugar: bio.sugar,
          timeline: mappedTimeline,
          rawLogs: logs
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

  // Energy & Deficit/Surplus Calculations
  const tdeeTarget = data.calories.target || 2250;
  const foodConsumed = data.calories.current || 0;
  const activeBurn = data.activity.caloriesBurned || 0;
  const remainingToTarget = Math.max(0, tdeeTarget - foodConsumed);
  const netEnergyBalance = foodConsumed - tdeeTarget;
  const isDeficit = netEnergyBalance < 0;

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

      {/* ── 1. VITALITY RINGS & PHYSIOLOGICAL ENERGY BALANCE ─────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left: Concentric Vitality Rings (Clickable to open Energy Pie Chart) */}
          <div
            onClick={() => setActiveBreakdownKey('calories')}
            className="flex items-center gap-6 sm:gap-8 cursor-pointer group p-2 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Click to view Energy/Calorie breakdown pie chart"
          >
            <VitalityRings
              calories={data.calories}
              protein={data.protein}
              water={data.water}
              size={144}
            />
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <span>Food Energy Consumed</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white font-mono">
                {foodConsumed.toLocaleString()} <span className="text-sm font-normal text-neutral-400">/ {tdeeTarget.toLocaleString()} kcal</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Mode: <b>{dayModes.find(m => m.id === dayMode)?.label || dayMode}</b> • <span className="text-rose-500 underline font-medium">Click for Pie Chart ↗</span>
              </p>
            </div>
          </div>

          {/* Right: Ring Legend (Clickable items) */}
          <div className="grid grid-cols-3 md:grid-cols-1 gap-4 w-full md:w-auto text-left">
            <div
              onClick={() => setActiveBreakdownKey('calories')}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#fa114f] flex-shrink-0" />
              <div>
                <span className="text-[11px] text-neutral-400 uppercase font-mono block">Energy Intake ↗</span>
                <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                  {foodConsumed} kcal ({Math.round((foodConsumed / (tdeeTarget || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveBreakdownKey('protein')}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#34c759] flex-shrink-0" />
              <div>
                <span className="text-[11px] text-neutral-400 uppercase font-mono block">Protein ↗</span>
                <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                  {data.protein.current}g / {data.protein.target}g ({Math.round((data.protein.current / (data.protein.target || 1)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#007aff] flex-shrink-0" />
              <div>
                <span className="text-[11px] text-neutral-400 uppercase font-mono block">Water (4L)</span>
                <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                  {data.water.current} / {data.water.target} L ({Math.round((data.water.current / (data.water.target || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── UNAMBIGUOUS PHYSIOLOGICAL ENERGY BALANCE BREAKDOWN ─── */}
        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Physiological Energy Balance (BMR + Activity vs Food Intake)
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Food Consumed */}
            <div
              onClick={() => setActiveBreakdownKey('calories')}
              className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 cursor-pointer hover:border-rose-500/40 transition-all"
            >
              <span className="text-[10px] font-mono uppercase text-neutral-400 block flex justify-between items-center">
                <span>Food Consumed</span>
                <span className="text-rose-500 font-bold">↗ Pie</span>
              </span>
              <span className="text-lg font-black font-mono text-neutral-900 dark:text-white block mt-0.5">
                {foodConsumed.toLocaleString()} <span className="text-xs font-normal">kcal</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">From logged meals today</span>
            </div>

            {/* 2. Remaining to Target */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block">Remaining Food Budget</span>
              <span className="text-lg font-black font-mono text-amber-500 block mt-0.5">
                {remainingToTarget.toLocaleString()} <span className="text-xs font-normal">kcal</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Left to eat to hit target</span>
            </div>

            {/* 3. Active Workout Burn */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block">Active Workout Burn</span>
              <span className="text-lg font-black font-mono text-orange-500 block mt-0.5">
                {activeBurn.toLocaleString()} <span className="text-xs font-normal">kcal</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Exercise energy expenditure</span>
            </div>

            {/* 4. Real Deficit / Surplus Status */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block">Net Energy Status</span>
              <span className={`text-lg font-black font-mono block mt-0.5 ${isDeficit ? 'text-sky-500' : 'text-emerald-500'}`}>
                {isDeficit ? `${netEnergyBalance.toLocaleString()} kcal` : `+${netEnergyBalance.toLocaleString()} kcal`}
              </span>
              <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400 block mt-0.5">
                {isDeficit ? 'Deficit (Fueling in progress)' : 'Surplus (Anabolic state)'}
              </span>
            </div>
          </div>

          <div className="mt-3.5 p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/80 flex items-start gap-2.5 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            <Info className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
            <span>
              <b>How BMR is calculated:</b> Your body burns ~<b>1,650 kcal/day</b> at rest purely for breathing, heart pumping, brain metabolism, and cellular repair (Basal Metabolic Rate for 69 kg athlete), plus ~<b>350 kcal</b> for daily desk movement (NEAT). Your day mode target ({tdeeTarget} kcal) already bakes in this baseline plus planned workouts so your deficit/surplus is medically accurate.
            </span>
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

      {/* ── 3. FULL 5 CORE MACRONUTRIENT PODS (CLICKABLE FOR PIE CHARTS) ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <span>Target Macronutrients & Thresholds</span>
            <span className="text-xs font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
              Tap any card for Pie Chart
            </span>
          </h3>
          <span className="text-xs text-neutral-400 hidden sm:inline">
            Interactive food source & quality donut charts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. PROTEIN */}
          <MacroPod
            name="Protein"
            subtitle="Muscle Recovery & Synthesis"
            icon="🥩"
            current={data.protein.current}
            target={data.protein.target}
            unit="g"
            color="#fa114f"
            onOpenPie={() => setActiveBreakdownKey('protein')}
            breakdown={[
              {
                label: 'Complete Protein',
                value: data.bioProtein.complete,
                pct: data.bioProtein.completePct,
                color: '#fa114f',
                description: 'Chicken, Whey, Eggs, Paneer, Milk (all 9 essential amino acids & leucine threshold).'
              },
              {
                label: 'Incomplete Protein',
                value: data.bioProtein.incomplete,
                pct: data.bioProtein.incompletePct,
                color: '#f59e0b',
                description: 'Oats, Dates, Rice, Dal (plant amino pool complementary to complete anchors).'
              }
            ]}
          />

          {/* 2. CARBOHYDRATES */}
          <MacroPod
            name="Carbohydrates"
            subtitle="Daily Stamina & Glycogen"
            icon="⚡"
            current={data.carbs.current}
            target={data.carbs.target}
            unit="g"
            color="#f59e0b"
            onOpenPie={() => setActiveBreakdownKey('carbs')}
            breakdown={[
              {
                label: 'Complex Starches',
                value: data.bioCarbs.complex,
                pct: data.bioCarbs.complexPct,
                color: '#f59e0b',
                description: 'Oats, Rice, Sweet Potatoes (sustained slow-release cellular glycogen).'
              },
              {
                label: 'Natural / Rapid Sugars',
                value: data.bioCarbs.simple,
                pct: data.bioCarbs.simplePct,
                color: '#ec4899',
                description: 'Whole bananas, dates, fruits for rapid post-run/workout muscle glycogen recharge.'
              }
            ]}
          />

          {/* 3. DIETARY FATS */}
          <MacroPod
            name="Dietary Fats"
            subtitle="Hormones & Joint Lubrication"
            icon="🥑"
            current={data.fats.current}
            target={data.fats.target}
            unit="g"
            color="#007aff"
            onOpenPie={() => setActiveBreakdownKey('fats')}
            breakdown={[
              {
                label: 'Unsaturated Healthy Fats',
                value: data.bioFats.unsaturated,
                pct: data.bioFats.unsatPct,
                color: '#007aff',
                description: 'Fish oil, Omega-3, Nuts, Mustard & Olive oil for joint lubrication and cardiovascular vitality.'
              },
              {
                label: 'Saturated Dietary Lipids',
                value: data.bioFats.saturated,
                pct: data.bioFats.satPct,
                color: '#a855f7',
                description: 'Milk, dairy fats, and whole food lipids. Trans fats: 0g.'
              }
            ]}
          />

          {/* 4. DIETARY FIBER */}
          <MacroPod
            name="Dietary Fiber"
            subtitle="Gut Microbiome & Digestion"
            icon="🌾"
            current={data.fiber.current}
            target={data.fiber.target}
            unit="g"
            color="#10b981"
            onOpenPie={() => setActiveBreakdownKey('fiber')}
            breakdown={[
              {
                label: 'Soluble Prebiotic Fiber',
                value: data.bioFiber.soluble,
                pct: data.bioFiber.solublePct,
                color: '#10b981',
                description: 'Beta-glucan & fruit pectins forming a gel to stabilize blood glucose and feed microbiome.'
              },
              {
                label: 'Insoluble Roughage',
                value: data.bioFiber.insoluble,
                pct: data.bioFiber.insolublePct,
                color: '#059669',
                description: 'Cellulose bulk from grains and vegetables supporting smooth digestive transit.'
              }
            ]}
          />

          {/* 5. SUGAR INTAKE */}
          <MacroPod
            name="Sugar Intake"
            subtitle="Natural vs Added Threshold"
            icon="🍯"
            current={data.sugar.current}
            target={data.sugar.target}
            unit="g"
            color="#ec4899"
            onOpenPie={() => setActiveBreakdownKey('sugar')}
            breakdown={[
              {
                label: 'Natural Whole Food Sugars',
                value: data.bioSugar.natural,
                pct: data.bioSugar.naturalPct,
                color: '#ec4899',
                description: 'Naturally occurring fructose in whole bananas, dates, and lactose in milk.'
              },
              {
                label: 'Added / Refined Sugars',
                value: data.bioSugar.added,
                pct: data.bioSugar.addedPct,
                color: '#f43f5e',
                description: 'Processed sweeteners, syrups, or industrial confectioneries. Kept strictly minimal.'
              }
            ]}
          />
        </div>
      </div>

      {/* ── 4. ACTIVITY, CALORIE BURN & SLEEP RECOVERY HUB ─────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500 block">Recovery Telemetry</span>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Daily Activity, Calorie Burn & Sleep</h4>
          </div>
          <span className="text-xs text-neutral-400 font-mono">Logged via Telegram</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Steps */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <Footprints className="w-4 h-4 text-emerald-500" /> Daily Steps
              </span>
              <span className="font-mono text-emerald-500">
                {Math.min(100, Math.round((data.activity.steps / (data.activity.stepsTarget || 10000)) * 100))}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                {data.activity.steps.toLocaleString()}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                / {data.activity.stepsTarget.toLocaleString()} steps
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((data.activity.steps / (data.activity.stepsTarget || 10000)) * 100))}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-400 font-mono block">
              Distance: ~{(data.activity.steps * 0.00076).toFixed(1)} km covered
            </span>
          </div>

          {/* Card 2: Calories Burned */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <Flame className="w-4 h-4 text-orange-500" /> Active Burn
              </span>
              <span className="font-mono text-orange-500">
                {Math.min(100, Math.round((data.activity.caloriesBurned / (data.activity.caloriesBurnedTarget || 500)) * 100))}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                {data.activity.caloriesBurned.toLocaleString()}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                / {data.activity.caloriesBurnedTarget.toLocaleString()} kcal
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((data.activity.caloriesBurned / (data.activity.caloriesBurnedTarget || 500)) * 100))}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-400 font-mono block">
              Physical workouts & athletic training
            </span>
          </div>

          {/* Card 3: Sleep Duration */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <Moon className="w-4 h-4 text-indigo-500" /> Sleep Duration
              </span>
              <span className="font-mono text-indigo-500">
                {data.activity.sleepHours >= 7 ? 'Optimal ✓' : 'Pending EOD'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                {data.activity.sleepHours > 0 ? `${data.activity.sleepHours.toFixed(1)} hrs` : '0.0 hrs'}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                / {data.activity.sleepTarget.toFixed(1)} hrs target
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((data.activity.sleepHours / (data.activity.sleepTarget || 8.0)) * 100))}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-400 font-mono block">
              Deep tissue repair & central nervous recovery
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. CELLULAR MINERALS, VITALS & CREATINE (CLICKABLE) ─────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 block">Cellular Vitals</span>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Key Electrolytes, Minerals & Creatine</h4>
          </div>
          <span className="text-xs text-neutral-400">Click any tile to inspect nutrient sources</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div
            onClick={() => setActiveBreakdownKey('sodium')}
            className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center cursor-pointer hover:border-emerald-500/40 transition-all group"
          >
            <span className="text-[11px] text-neutral-400 uppercase font-mono block group-hover:text-emerald-500 transition-colors">Sodium (Na⁺) ↗</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.sodium} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 3,500</span>
          </div>

          <div
            onClick={() => setActiveBreakdownKey('potassium')}
            className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center cursor-pointer hover:border-emerald-500/40 transition-all group"
          >
            <span className="text-[11px] text-neutral-400 uppercase font-mono block group-hover:text-emerald-500 transition-colors">Potassium (K⁺) ↗</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.potassium} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 4,700</span>
          </div>

          <div
            onClick={() => setActiveBreakdownKey('magnesium')}
            className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center cursor-pointer hover:border-emerald-500/40 transition-all group"
          >
            <span className="text-[11px] text-neutral-400 uppercase font-mono block group-hover:text-emerald-500 transition-colors">Magnesium ↗</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.magnesium} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 420</span>
          </div>

          <div
            onClick={() => setActiveBreakdownKey('omega3')}
            className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center cursor-pointer hover:border-emerald-500/40 transition-all group"
          >
            <span className="text-[11px] text-neutral-400 uppercase font-mono block group-hover:text-emerald-500 transition-colors">Omega-3 ↗</span>
            <span className="text-base font-extrabold font-mono text-emerald-500">{data.micros.omega3} mg</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 1,500</span>
          </div>

          <div
            onClick={() => setActiveBreakdownKey('creatine')}
            className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center col-span-2 sm:col-span-1 cursor-pointer hover:border-purple-500/40 transition-all group"
          >
            <span className="text-[11px] text-neutral-400 uppercase font-mono block group-hover:text-purple-500 transition-colors">Creatine ↗</span>
            <span className="text-base font-extrabold font-mono text-purple-500">{data.micros.creatine} g</span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Target: 5.0 g</span>
          </div>
        </div>
      </div>

      {/* ── 6. FOOD TIMELINE ───────────────────────────────────────── */}
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

      {/* ── 7. INTERACTIVE NUTRIENT BREAKDOWN & PIE CHART MODAL ──────── */}
      <AnimatePresence>
        {activeBreakdownKey && (
          <NutrientBreakdownModal
            isOpen={Boolean(activeBreakdownKey)}
            onClose={() => setActiveBreakdownKey(null)}
            nutrientKey={activeBreakdownKey}
            nutrientData={data}
            allLogs={data.rawLogs.length > 0 ? data.rawLogs : data.timeline}
            targets={{
              calories: tdeeTarget,
              protein: data.protein.target,
              carbs: data.carbs.target,
              fats: data.fats.target,
              fiber: data.fiber.target,
              sugar: data.sugar.target,
              sodium: 3500,
              potassium: 4700,
              magnesium: 420,
              omega3: 1500,
              creatine: 5.0
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
