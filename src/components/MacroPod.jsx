import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function MacroPod({
  name,
  subtitle,
  icon,
  current,
  target,
  unit = 'g',
  color = '#fa114f',
  breakdown = []
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.min(100, Math.round((current / (target || 1)) * 100));

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      onClick={() => setExpanded(!expanded)}
      className="p-5 rounded-3xl transition-all cursor-pointer select-none bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-base"
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
        <span
          className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress Bar & Values */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between items-baseline text-xs font-mono">
          <span className="font-extrabold text-base text-neutral-900 dark:text-white">
            {current} <span className="text-xs font-normal text-neutral-400">/ {target} {unit}</span>
          </span>
          <span className="text-xs text-neutral-400">
            {Math.max(0, target - current)} {unit} left
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

      {/* Tap Hint */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
        <span>Tap for biological quality</span>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </div>

      {/* Expandable Biological Quality Breakdown */}
      <AnimatePresence>
        {expanded && breakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800 space-y-2 overflow-hidden"
          >
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/90 border border-neutral-200/50 dark:border-neutral-800 space-y-1"
              >
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || color }} />
                    {item.label}
                  </span>
                  <span className="font-bold font-mono text-neutral-900 dark:text-white">
                    {item.value} {unit} ({item.pct}%)
                  </span>
                </div>
                {item.description && (
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
            <p className="text-[10px] text-neutral-400 italic text-center pt-1">
              Quality classification • No restrictive limits
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
