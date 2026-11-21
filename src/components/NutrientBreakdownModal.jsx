import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, CheckCircle2, ChevronRight, PieChart as PieIcon, Layers } from 'lucide-react';

const PIE_PALETTE = [
  '#00f0ff', '#00ff9d', '#ffb800', '#ff2a5f', '#b026ff',
  '#ff007f', '#ff6b00', '#00e5ff', '#7000ff', '#76ff03',
  '#ffd600', '#00b0ff', '#f50057', '#1de9b6', '#ff9100'
];

function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const rad = Math.PI / 180;
  const x1 = cx + rOuter * Math.cos(startAngle * rad);
  const y1 = cy + rOuter * Math.sin(startAngle * rad);
  const x2 = cx + rOuter * Math.cos(endAngle * rad);
  const y2 = cy + rOuter * Math.sin(endAngle * rad);
  const x3 = cx + rInner * Math.cos(endAngle * rad);
  const y3 = cy + rInner * Math.sin(endAngle * rad);
  const x4 = cx + rInner * Math.cos(startAngle * rad);
  const y4 = cy + rInner * Math.sin(startAngle * rad);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

function DonutChart({ slices = [], total = 0, unit = 'g', icon = '📊', onHover, hoveredIdx }) {
  const cx = 150;
  const cy = 150;
  const rOuter = 130;
  const rInner = 80;

  if (total <= 0 || slices.length === 0) {
    return (
      <div className="w-[300px] h-[300px] rounded-full border-4 border-dashed border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-center p-6 text-xs text-neutral-400">
        No food logs contributing to this nutrient today.
      </div>
    );
  }

  const activeSlices = slices.filter(s => s.amount > 0);

  let paths = [];
  if (activeSlices.length === 1) {
    const s = activeSlices[0];
    const p1 = describeArc(cx, cy, rOuter, rInner, 0, 180);
    const p2 = describeArc(cx, cy, rOuter, rInner, 180, 360);
    paths = [
      { d: p1, color: s.color, idx: 0, s },
      { d: p2, color: s.color, idx: 0, s }
    ];
  } else {
    let currentAngle = 0;
    paths = activeSlices.map((s, idx) => {
      const sliceAngle = (s.amount / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;
      return {
        d: describeArc(cx, cy, rOuter, rInner, startAngle, endAngle),
        color: s.color || PIE_PALETTE[idx % PIE_PALETTE.length],
        idx,
        s
      };
    });
  }

  const activeItem = hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx] : null;

  return (
    <div className="relative w-[300px] h-[300px] flex items-center justify-center select-none">
      <svg width={300} height={300} viewBox="0 0 300 300" className="transform -rotate-90">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.color}
            className={`transition-all duration-200 cursor-pointer ${
              hoveredIdx === p.idx ? 'brightness-125 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-[1.03]' : 'opacity-95'
            }`}
            style={{ transformOrigin: '150px 150px' }}
            onMouseEnter={() => onHover && onHover(p.idx)}
            onMouseLeave={() => onHover && onHover(null)}
          />
        ))}
      </svg>

      {/* Center Telemetry */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
        <span className="text-2xl drop-shadow mb-0.5">{activeItem ? activeItem.icon || icon : icon}</span>
        <span className="text-2xl font-black font-mono tracking-tight text-neutral-900 dark:text-white leading-tight">
          {activeItem ? activeItem.amount : total} <span className="text-xs font-normal text-neutral-400">{unit}</span>
        </span>
        <span className="text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5 max-w-[120px] truncate">
          {activeItem ? `${activeItem.pct}% • ${activeItem.label}` : 'TOTAL INTAKE'}
        </span>
      </div>
    </div>
  );
}

export default function NutrientBreakdownModal({
  isOpen,
  onClose,
  nutrientKey,
  nutrientData,
  allLogs = [],
  targets = {}
}) {
  const [hoveredFoodIdx, setHoveredFoodIdx] = useState(null);
  const [hoveredBioIdx, setHoveredBioIdx] = useState(null);

  if (!isOpen || !nutrientKey) return null;

  // Extract food items contributing to this nutrient
  const contributingFoods = allLogs.map((l, idx) => {
    let amount = 0;
    const v = (l.vitals || '') + ' ' + (l.rawMessage || '') + ' ' + (l.itemName || '');
    if (nutrientKey === 'protein') amount = parseFloat(l.protein) || 0;
    else if (nutrientKey === 'carbs') amount = parseFloat(l.carbs) || 0;
    else if (nutrientKey === 'fats') amount = parseFloat(l.fats) || 0;
    else if (nutrientKey === 'fiber') amount = parseFloat(l.fiber) || 0;
    else if (nutrientKey === 'sugar') amount = parseFloat(l.sugar) || 0;
    else if (nutrientKey === 'calories') amount = parseFloat(l.calories) || 0;
    else if (nutrientKey === 'sodium') {
      const m = v.match(/sodium[:\s]+([\d.]+)\s*mg/i);
      amount = m ? parseFloat(m[1]) : 0;
    } else if (nutrientKey === 'potassium') {
      const m = v.match(/potassium[:\s]+([\d.]+)\s*mg/i);
      amount = m ? parseFloat(m[1]) : 0;
    } else if (nutrientKey === 'magnesium') {
      const m = v.match(/(?:elemental\s+)?magnesium[:\s]+([\d.]+)\s*mg/i);
      amount = m ? parseFloat(m[1]) : 0;
      if (/magnesium\s*glycinate/i.test(l.itemName) && amount === 0) amount = (l.quantity || 1) * 210;
    } else if (nutrientKey === 'omega3') {
      const epa = (v.match(/epa[:\s]+([\d.]+)\s*mg/i) || [])[1] || 0;
      const dha = (v.match(/dha[:\s]+([\d.]+)\s*mg/i) || [])[1] || 0;
      amount = (parseFloat(epa) + parseFloat(dha)) || (/fish\s*oil|hk\s*vital/i.test(l.itemName) ? (l.quantity || 1) * 300 : 0);
    } else if (nutrientKey === 'creatine') {
      const m = v.match(/creatine(?:\s*monohydrate)?[:\s]+([\d.]+)\s*g/i);
      amount = m ? parseFloat(m[1]) : (/creatine/i.test(l.itemName) ? (l.quantity || 1) * 5.0 : 0);
    }

    return {
      id: l.rawTimestamp || idx,
      name: l.itemName || l.rawMessage || 'Meal',
      time: l.time || '',
      brand: l.brand || '',
      amount: Math.round(amount * 10) / 10,
      calories: l.calories || 0
    };
  }).filter(f => f.amount > 0);

  const totalFoodAmount = Math.round(contributingFoods.reduce((s, f) => s + f.amount, 0) * 10) / 10;

  const foodSlices = contributingFoods.map((f, idx) => ({
    label: f.name,
    amount: f.amount,
    pct: totalFoodAmount > 0 ? Math.round((f.amount / totalFoodAmount) * 100) : 0,
    color: PIE_PALETTE[idx % PIE_PALETTE.length]
  }));

  // Biological classification
  let bioClassification = null;
  if (nutrientKey === 'protein') {
    let comp = 0, incomp = 0;
    allLogs.forEach(l => {
      const p = parseFloat(l.protein) || 0;
      if (p <= 0) return;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      const isComplete = /(?:chicken|poultry|turkey|egg|fish|salmon|tuna|prawn|seafood|whey|casein|paneer|curd|yogurt|milk|tofu|soy|edamame|meat|mutton|beef)/i.test(text);
      const isPairedMeal = /(?:chicken.*(?:rice|roti|bread|grain)|(?:rice|roti|bread|grain).*chicken|paneer.*(?:rice|roti)|tofu.*(?:rice|roti)|dal.*(?:rice|khichdi)|khichdi)/i.test(text);
      if (isComplete || isPairedMeal) comp += p;
      else incomp += p;
    });
    const tot = comp + incomp || 1;
    bioClassification = {
      title: 'Protein Biological Quality',
      subtitle: 'Complete vs Incomplete Amino Acid Profile',
      unit: 'g',
      icon: '🥩',
      total: Math.round(tot * 10) / 10,
      slices: [
        { label: 'Complete Protein', amount: Math.round(comp * 10) / 10, pct: Math.round((comp / tot) * 100), color: '#10b981', desc: 'All 9 essential amino acids & leucine threshold (Chicken, Eggs, Milk, Whey, Paneer)' },
        { label: 'Incomplete Protein', amount: Math.round(incomp * 10) / 10, pct: Math.round((incomp / tot) * 100), color: '#f59e0b', desc: 'Plant amino acids complementary to complete anchors (Oats, Dates, Rice, Dal)' }
      ]
    };
  } else if (nutrientKey === 'carbs') {
    let complex = 0, simple = 0;
    allLogs.forEach(l => {
      const c = parseFloat(l.carbs) || 0;
      const s = parseFloat(l.sugar) || 0;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      if (/banana|date|raisin|fruit|apple|mango|orange|grape|milk/i.test(text)) {
        const sPart = Math.min(c, Math.max(s, c * 0.75));
        simple += sPart;
        complex += Math.max(0, c - sPart);
      } else if (/sugar|glucose|dextrose|honey|jaggery|gel|juice|soda|sweet|dessert|candy|chocolate/i.test(text)) {
        simple += c;
      } else {
        const sPart = Math.min(c, s);
        simple += sPart;
        complex += Math.max(0, c - sPart);
      }
    });
    const tot = complex + simple || 1;
    bioClassification = {
      title: 'Carbohydrate Classification',
      subtitle: 'Sustained Starches vs Rapid Glycogen Sugars',
      unit: 'g',
      icon: '⚡',
      total: Math.round(tot * 10) / 10,
      slices: [
        { label: 'Complex Starches', amount: Math.round(complex * 10) / 10, pct: Math.round((complex / tot) * 100), color: '#fbbf24', desc: 'Slow-burning cellular glycogen (Oats, Rice, Sweet Potatoes)' },
        { label: 'Simple / Rapid Sugars', amount: Math.round(simple * 10) / 10, pct: Math.round((simple / tot) * 100), color: '#ec4899', desc: 'Natural fructose and fast recovery sugars (Whole fruits, dates, milk lactose)' }
      ]
    };
  } else if (nutrientKey === 'fats') {
    let sat = 0, unsat = 0;
    allLogs.forEach(l => {
      const f = parseFloat(l.fats) || 0;
      if (f <= 0) return;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.vitals || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      const satMatch = text.match(/saturated(?:\s*fat)?[:\s]+([\d.]+)\s*g/i);
      if (satMatch) {
        const sVal = parseFloat(satMatch[1]) || 0;
        sat += sVal;
        unsat += Math.max(0, f - sVal);
      } else if (/ghee|butter|cheese/i.test(text)) {
        sat += f * 0.65; unsat += f * 0.35;
      } else if (/paneer|milk|curd|yogurt/i.test(text)) {
        sat += f * 0.60; unsat += f * 0.40;
      } else if (/egg|chicken|fish/i.test(text)) {
        sat += f * 0.30; unsat += f * 0.70;
      } else if (/peanut|almond|walnut|nut|seed|olive|mustard/i.test(text)) {
        sat += f * 0.15; unsat += f * 0.85;
      } else {
        sat += f * 0.33; unsat += f * 0.67;
      }
    });
    const tot = sat + unsat || 1;
    bioClassification = {
      title: 'Dietary Lipid Distribution',
      subtitle: 'Unsaturated Healthy Fats vs Saturated Fatty Acids',
      unit: 'g',
      icon: '🥑',
      total: Math.round(tot * 10) / 10,
      slices: [
        { label: 'Unsaturated Healthy Fats', amount: Math.round(unsat * 10) / 10, pct: Math.round((unsat / tot) * 100), color: '#34d399', desc: 'Omega-3, MUFA & PUFA for joint lubrication, brain and cardiovascular health' },
        { label: 'Saturated Dietary Lipids', amount: Math.round(sat * 10) / 10, pct: Math.round((sat / tot) * 100), color: '#f59e0b', desc: 'Stable dietary lipids from milk, dairy, and whole foods. Trans fats: 0g' }
      ]
    };
  } else if (nutrientKey === 'fiber') {
    const tot = totalFoodAmount || 1;
    const sol = Math.round(tot * 0.4 * 10) / 10;
    const insol = Math.round(tot * 0.6 * 10) / 10;
    bioClassification = {
      title: 'Fiber Classification',
      subtitle: 'Soluble Prebiotic Fiber vs Insoluble Motility Roughage',
      unit: 'g',
      icon: '🌾',
      total: tot,
      slices: [
        { label: 'Soluble Prebiotic Fiber', amount: sol, pct: 40, color: '#10b981', desc: 'Beta-glucan & fruit pectins forming a gel to stabilize blood glucose and feed microbiome' },
        { label: 'Insoluble Roughage', amount: insol, pct: 60, color: '#059669', desc: 'Cellulose bulk supporting smooth digestive transit' }
      ]
    };
  } else if (nutrientKey === 'sugar') {
    let nat = 0, add = 0;
    allLogs.forEach(l => {
      const s = parseFloat(l.sugar) || 0;
      const text = ((l.itemName || '') + ' ' + (l.brand || '') + ' ' + (l.rawMessage || '')).toLowerCase();
      if (/sugar|syrup|gel|candy|chocolate|sweet|dessert|soda/i.test(text)) add += s;
      else nat += s;
    });
    const tot = nat + add || 1;
    bioClassification = {
      title: 'Sugar Quality Classification',
      subtitle: 'Natural Whole Food Sugars vs Added Refined Sugars',
      unit: 'g',
      icon: '🍯',
      total: Math.round(tot * 10) / 10,
      slices: [
        { label: 'Natural Sugars', amount: Math.round(nat * 10) / 10, pct: Math.round((nat / tot) * 100), color: '#ec4899', desc: 'Naturally bound fruit fructose and dairy lactose from bananas, dates, and milk' },
        { label: 'Added / Refined Sugars', amount: Math.round(add * 10) / 10, pct: Math.round((add / tot) * 100), color: '#8b5cf6', desc: 'Processed syrups, confections, or added sugars (kept strictly minimal)' }
      ]
    };
  }

  const nameMap = {
    protein: { name: 'Protein', icon: '🥩', unit: 'g', color: '#fa114f' },
    carbs: { name: 'Carbohydrates', icon: '⚡', unit: 'g', color: '#f59e0b' },
    fats: { name: 'Dietary Fats', icon: '🥑', unit: 'g', color: '#007aff' },
    fiber: { name: 'Dietary Fiber', icon: '🌾', unit: 'g', color: '#10b981' },
    sugar: { name: 'Sugar Intake', icon: '🍯', unit: 'g', color: '#ec4899' },
    calories: { name: 'Energy Consumed', icon: '🔥', unit: 'kcal', color: '#fa114f' },
    sodium: { name: 'Sodium (Na⁺)', icon: '🧂', unit: 'mg', color: '#10b981' },
    potassium: { name: 'Potassium (K⁺)', icon: '🍌', unit: 'mg', color: '#10b981' },
    magnesium: { name: 'Magnesium', icon: '💊', unit: 'mg', color: '#10b981' },
    omega3: { name: 'Omega-3', icon: '🐟', unit: 'mg', color: '#10b981' },
    creatine: { name: 'Creatine', icon: '⚡', unit: 'g', color: '#a855f7' }
  };

  const currentMeta = nameMap[nutrientKey] || { name: nutrientKey, icon: '📊', unit: 'g', color: '#fa114f' };
  const targetVal = targets[nutrientKey] || targets[currentMeta.targetKey] || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md overflow-y-auto flex items-start justify-center p-4 sm:p-6"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-[#f2f2f7] dark:bg-[#1c1c1e] text-neutral-900 dark:text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/10 dark:border-white/10 my-8 space-y-8"
      >
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.08] dark:border-white/[0.08]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 hover:text-rose-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Fuel Engine</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
              style={{ backgroundColor: `${currentMeta.color}18`, color: currentMeta.color }}
            >
              {currentMeta.icon}
            </div>
            <div>
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-400 block">
                Nutrient Source Breakdown
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                {currentMeta.name}
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-black/[0.06] dark:border-white/[0.08] text-right font-mono">
            <span className="text-xs text-neutral-400 uppercase block">Total Consumed Today</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">
              {totalFoodAmount} <span className="text-xs font-normal text-neutral-400">{currentMeta.unit}</span>
            </span>
            {targetVal > 0 && (
              <span className="text-xs text-neutral-400 block mt-0.5">
                Target: {targetVal} {currentMeta.unit} ({Math.round((totalFoodAmount / targetVal) * 100)}%)
              </span>
            )}
          </div>
        </div>

        {/* ── DUAL PIE CHARTS GRID ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 1: Contributing Food Sources */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] flex flex-col items-center justify-between text-center space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-500 bg-sky-500/10 px-3 py-1 rounded-full mb-1">
                <PieIcon className="w-3.5 h-3.5" /> Logged Food Sources
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Foods Providing {currentMeta.name}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Hover or tap slices to inspect meal portions
              </p>
            </div>

            <DonutChart
              slices={foodSlices}
              total={totalFoodAmount}
              unit={currentMeta.unit}
              icon={currentMeta.icon}
              hoveredIdx={hoveredFoodIdx}
              onHover={setHoveredFoodIdx}
            />

            {/* Slices Legend */}
            <div className="w-full space-y-2 max-h-48 overflow-y-auto text-left pr-1">
              {foodSlices.map((s, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredFoodIdx(idx)}
                  onMouseLeave={() => setHoveredFoodIdx(null)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs border ${
                    hoveredFoodIdx === idx
                      ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'
                      : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-100 dark:border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="font-semibold text-neutral-900 dark:text-white truncate">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono flex-shrink-0">
                    <span className="font-bold text-neutral-900 dark:text-white">{s.amount} {currentMeta.unit}</span>
                    <span className="text-neutral-400">({s.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Biological Quality Classification */}
          {bioClassification ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] flex flex-col items-center justify-between text-center space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full mb-1">
                  <Layers className="w-3.5 h-3.5" /> Biological Classification
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {bioClassification.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {bioClassification.subtitle}
                </p>
              </div>

              <DonutChart
                slices={bioClassification.slices}
                total={bioClassification.total}
                unit={bioClassification.unit}
                icon={bioClassification.icon}
                hoveredIdx={hoveredBioIdx}
                onHover={setHoveredBioIdx}
              />

              {/* Slices Legend */}
              <div className="w-full space-y-2 text-left">
                {bioClassification.slices.map((s, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBioIdx(idx)}
                    onMouseLeave={() => setHoveredBioIdx(null)}
                    className={`p-3 rounded-2xl transition-all border ${
                      hoveredBioIdx === idx
                        ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'
                        : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-100 dark:border-neutral-800/80'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {s.amount} {bioClassification.unit} ({s.pct}%)
                      </span>
                    </div>
                    {s.desc && (
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        {s.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-center text-left space-y-4">
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                Athletic Utility & Physiological Role
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                This nutrient plays an essential role in daily muscle contractility, neuromuscular transmission, and endurance performance. Ingested whole food and targeted supplements feed directly into cellular blood plasma to maintain optimal systemic electrolyte balance.
              </p>
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-xs font-mono space-y-1">
                <span className="text-neutral-400 block">Daily Target Protocol:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {targetVal > 0 ? `${targetVal} ${currentMeta.unit}` : 'Optimal daily intake'}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* ── ITEMIZED CONTRIBUTING LOGS ─────────────────────────────── */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] space-y-4">
          <h4 className="text-base font-bold text-neutral-900 dark:text-white">
            Itemized Entries ({contributingFoods.length})
          </h4>

          {contributingFoods.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No food entries logged for this nutrient today.</p>
          ) : (
            <div className="space-y-2">
              {contributingFoods.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-white block">{f.name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {f.time} {f.brand && `• ${f.brand}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      +{f.amount} {currentMeta.unit}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">{f.calories} kcal</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
