import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, ArrowUpRight } from 'lucide-react';

export default function MacroPod({
  name,
  subtitle,
  icon,
  current,
  target,
  unit = 'g',
  color = '#fa114f',
  breakdown = [],
  onOpenPie
}) {
  const pct = Math.min(100, Math.round((current / (target || 1)) * 100));

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      onClick={onOpenPie}
      className="p-5 rounded-3xl transition-all cursor-pointer select-none bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-black/20 dark:hover:border-white/20 group relative"
    >
      {/* Top Corner Icon indicating navigation to Pie Chart */}
      <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-mono font-bold text-neutral-400 group-hover:text-rose-500 transition-colors">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">Pie Chart</span>
        <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-rose-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 pr-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
              {name}
            </h4>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
              {subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Values */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between items-baseline text-xs font-mono">
          <span className="font-extrabold text-base text-neutral-900 dark:text-white">
            {current} <span className="text-xs font-normal text-neutral-400">/ {target} {unit}</span>
          </span>
          <span className="text-xs font-bold" style={{ color }}>
            {pct}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Mini Quality Pills */}
      {breakdown && breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
          {breakdown.slice(0, 2).map((item, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/90 text-left">
              <span className="text-[10px] text-neutral-400 uppercase font-mono block truncate">
                {item.label}
              </span>
              <span className="text-xs font-extrabold font-mono text-neutral-900 dark:text-white">
                {item.value} {unit} <span className="text-[10px] text-neutral-400">({item.pct}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2.5 mt-2 border-t border-neutral-100 dark:border-neutral-800/80">
        <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-medium group-hover:text-rose-500 transition-colors">
          <PieChart className="w-3.5 h-3.5 text-rose-500" />
          <span>Click for interactive pie chart</span>
        </span>
        <span className="text-neutral-400 group-hover:text-rose-500 font-mono text-xs">↗</span>
      </div>
    </motion.div>
  );
}
