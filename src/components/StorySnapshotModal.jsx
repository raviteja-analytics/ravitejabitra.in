import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Camera, Check, HeartPulse, Sparkles, Sun, Moon } from 'lucide-react';
import StoryVitalityRings from './StoryVitalityRings';

export default function StorySnapshotModal({
  isOpen,
  onClose,
  data,
  dayMode = 'strength_upper',
  dayModes = [],
  runDistance = 10
}) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const rawModeObj = dayModes.find(m => m.id === dayMode) || { label: 'Strength Upper', icon: '🏋️' };
  const modeLabel = dayMode === 'run' ? `Run (${runDistance} km)` : rawModeObj.label;
  const activeModeObj = { ...rawModeObj, label: modeLabel };

  const foodConsumed = data?.calories?.current || 0;
  const calorieTarget = data?.calories?.target || 2250;
  const caloriesBurned = data?.activity?.caloriesBurned || 0;
  const burnTarget = data?.activity?.caloriesBurnedTarget || 500;
  const waterLiters = data?.water?.current ?? 0;
  const waterTarget = data?.water?.target ?? 4.0;
  const sleepHours = data?.activity?.sleepHours ?? 0;
  const sleepTarget = data?.activity?.sleepTarget ?? 8.0;

  // Format date: e.g. "21 NOV 2026"
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      if (typeof window !== 'undefined' && window.html2canvas) {
        const canvas = await window.html2canvas(cardRef.current, {
          scale: 3, // Crisp 3x render for ultra-high-res 1080x1920 Story export
          backgroundColor: isLight ? '#fbfbfd' : '#000000',
          useCORS: true,
          logging: false
        });

        const link = document.createElement('a');
        link.download = `raviteja-story-${isLight ? 'light' : 'dark'}-${data?.todayStr || new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } else {
        alert("Preparing image... If download doesn't start, please screenshot this frame!");
      }
    } catch (err) {
      console.error("Failed to generate Instagram Story snapshot:", err);
      alert("Screenshot this frame to share directly on Instagram Stories!");
    }

    setDownloading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto flex items-center justify-center p-3 sm:p-6"
    >
      <div className="flex flex-col items-center space-y-4 max-w-full my-auto">
        
        {/* Top Floating Control Bar */}
        <div className="flex items-center justify-between w-full max-w-[390px] px-2 text-white">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-full bg-rose-500/20 text-rose-400">
              <Camera className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
              Story Snapshot
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle: Dark vs Light */}
            <div className="flex items-center p-0.5 rounded-full bg-neutral-800/90 border border-white/10 text-xs">
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold transition-all ${
                  !isLight ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
                title="Dark Theme"
              >
                <Moon className="w-3 h-3" />
                <span className="hidden sm:inline">Dark</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold transition-all ${
                  isLight ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
                title="Light Theme"
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">Light</span>
              </button>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
                  <span>{downloading ? 'Exporting...' : 'Save'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 9:16 INSTAGRAM STORY FRAME (390 x 693 px) ──────────────── */}
        <div
          ref={cardRef}
          className={`w-[370px] sm:w-[390px] rounded-[36px] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden select-none font-sans transition-colors duration-200 ${
            isLight
              ? 'bg-[#fbfbfd] text-neutral-900 border border-neutral-200 shadow-[0_25px_60px_rgba(0,0,0,0.12)]'
              : 'bg-[#000000] text-white border border-white/10'
          }`}
          style={{ minHeight: '680px' }}
        >
          {/* Ambient Background Radial Glows */}
          <div className={`absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none ${isLight ? 'bg-rose-500/10' : 'bg-rose-500/20'}`} />
          <div className={`absolute -bottom-20 -right-20 w-56 h-56 rounded-full blur-3xl pointer-events-none ${isLight ? 'bg-sky-500/10' : 'bg-sky-500/20'}`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isLight ? 'bg-purple-500/5' : 'bg-purple-500/10'}`} />

          {/* 1. STORY HEADER */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className={`text-[11px] font-mono font-bold tracking-widest ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {todayDateStr}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                isLight
                  ? 'bg-neutral-100 text-neutral-800 border-neutral-200/80 shadow-sm'
                  : 'bg-white/10 text-neutral-200 border-white/10'
              }`}>
                {activeModeObj.icon} {activeModeObj.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <h1 className={`text-xl font-black tracking-tight leading-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Daily Vitality & Fuel
                </h1>
                <span className={`text-[10px] font-mono ${isLight ? 'text-neutral-400' : 'text-neutral-400'}`}>
                  RAVI TEJA BITRA • ATHLETE JOURNAL
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xl font-black text-rose-500 block leading-tight">
                  {foodConsumed}
                </span>
                <span className={`text-[9px] uppercase ${isLight ? 'text-neutral-400' : 'text-neutral-400'}`}>
                  / {calorieTarget} kcal
                </span>
              </div>
            </div>
          </div>

          {/* 2. THE 4 CONCENTRIC STORY RINGS (Calorie, Burn, Water, Sleep) */}
          <div className={`relative z-10 my-3 p-4 rounded-3xl backdrop-blur-md flex items-center justify-between gap-4 border transition-colors ${
            isLight
              ? 'bg-white/95 border-neutral-200/80 shadow-sm'
              : 'bg-neutral-900/60 border-white/[0.08]'
          }`}>
            <StoryVitalityRings
              calories={{ current: foodConsumed, target: calorieTarget }}
              caloriesBurned={{ current: caloriesBurned, target: burnTarget }}
              water={{ current: waterLiters, target: waterTarget }}
              sleep={{ current: sleepHours, target: sleepTarget }}
              size={136}
            />

            {/* Compact Story Rings Legend */}
            <div className="space-y-2 flex-1 text-left font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-neutral-600' : 'text-neutral-300'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fa114f]" /> Calorie Intake
                </span>
                <span className={`font-bold text-[11px] ${isLight ? 'text-neutral-900' : 'text-white'}`}>{foodConsumed} kcal</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-neutral-600' : 'text-neutral-300'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]" /> Active Burn
                </span>
                <span className={`font-bold text-[11px] ${isLight ? 'text-neutral-900' : 'text-white'}`}>{caloriesBurned} kcal</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-neutral-600' : 'text-neutral-300'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007aff]" /> Water ({waterTarget}L)
                </span>
                <span className={`font-bold text-[11px] ${isLight ? 'text-neutral-900' : 'text-white'}`}>{waterLiters} L</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-neutral-600' : 'text-neutral-300'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#af52de]" /> Sleep Recovery
                </span>
                <span className={`font-bold text-[11px] ${isLight ? 'text-neutral-900' : 'text-white'}`}>{sleepHours} hrs</span>
              </div>
            </div>
          </div>

          {/* 3. MACRONUTRIENTS (LEFT) & MICRONUTRIENTS (RIGHT) */}
          <div className="relative z-10 grid grid-cols-2 gap-3 my-1">
            
            {/* Left: Macronutrients */}
            <div className={`p-3.5 rounded-2xl space-y-2 font-mono border transition-colors ${
              isLight
                ? 'bg-white/95 border-neutral-200/80 shadow-sm'
                : 'bg-neutral-900/50 border-white/[0.06]'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block pb-1 border-b ${
                isLight ? 'text-neutral-400 border-neutral-100' : 'text-neutral-400 border-white/[0.06]'
              }`}>
                Macronutrients
              </span>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🥩 Protein</span>
                <span className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{data?.protein?.current || 0}g</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>⚡ Carbs</span>
                <span className={`font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>{data?.carbs?.current || 0}g</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🥑 Fats</span>
                <span className={`font-bold ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>{data?.fats?.current || 0}g</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🌾 Fiber</span>
                <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{data?.fiber?.current || 0}g</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🍯 Sugar</span>
                <span className={`font-bold ${isLight ? 'text-pink-600' : 'text-pink-400'}`}>{data?.sugar?.current || 0}g</span>
              </div>
            </div>

            {/* Right: Micronutrients & Supplements */}
            <div className={`p-3.5 rounded-2xl space-y-2 font-mono border transition-colors ${
              isLight
                ? 'bg-white/95 border-neutral-200/80 shadow-sm'
                : 'bg-neutral-900/50 border-white/[0.06]'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block pb-1 border-b ${
                isLight ? 'text-neutral-400 border-neutral-100' : 'text-neutral-400 border-white/[0.06]'
              }`}>
                Cellular Vitals
              </span>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🧂 Sodium</span>
                <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{data?.micros?.sodium || 0}mg</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🍌 Potassium</span>
                <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{data?.micros?.potassium || 0}mg</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>💊 Magnesium</span>
                <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{data?.micros?.magnesium || 0}mg</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>🐟 Omega-3</span>
                <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{data?.micros?.omega3 || 0}mg</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>⚡ Creatine</span>
                <span className={`font-bold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>{data?.micros?.creatine || 0}g</span>
              </div>
            </div>

          </div>

          {/* 4. ACTIVITY & RECOVERY STATS (Steps, Burn, Sleep) */}
          <div className={`relative z-10 p-3 rounded-2xl font-mono grid grid-cols-3 gap-2 text-center my-1 border transition-colors ${
            isLight
              ? 'bg-white/95 border-neutral-200/80 shadow-sm'
              : 'bg-neutral-900/40 border-white/[0.06]'
          }`}>
            <div>
              <span className={`text-[9px] uppercase block ${isLight ? 'text-neutral-400' : 'text-neutral-400'}`}>Steps</span>
              <span className={`text-xs font-bold block mt-0.5 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                {(data?.activity?.steps || 0).toLocaleString()}
              </span>
              <span className={`text-[8px] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                ~{((data?.activity?.steps || 0) * 0.00076).toFixed(1)} km
              </span>
            </div>

            <div>
              <span className={`text-[9px] uppercase block ${isLight ? 'text-neutral-400' : 'text-neutral-400'}`}>Active Burn</span>
              <span className={`text-xs font-bold block mt-0.5 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                {caloriesBurned} kcal
              </span>
              <span className={`text-[8px] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>Target: {burnTarget}</span>
            </div>

            <div>
              <span className={`text-[9px] uppercase block ${isLight ? 'text-neutral-400' : 'text-neutral-400'}`}>Sleep Time</span>
              <span className={`text-xs font-bold block mt-0.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                {sleepHours} hrs
              </span>
              <span className={`text-[8px] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>Target: {sleepTarget}h</span>
            </div>
          </div>

          {/* 5. STORY FOOTER / WATERMARK */}
          <div className={`relative z-10 pt-2 flex items-center justify-between text-[10px] font-mono border-t ${
            isLight ? 'border-neutral-200 text-neutral-400' : 'border-white/[0.08] text-neutral-500'
          }`}>
            <div className={`flex items-center gap-1.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              <Sparkles className="w-3 h-3 text-rose-500" />
              <span>ravitejabitra.in/nutrition</span>
            </div>
            <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>@raviteja_fuel_bot</span>
          </div>

        </div>

        {/* Tip below modal */}
        <p className="text-[11px] text-neutral-400 text-center font-mono">
          Tap <b>Save</b> to export high-res 1080×1920 PNG or screenshot to post on Instagram!
        </p>

      </div>
    </motion.div>
  );
}
