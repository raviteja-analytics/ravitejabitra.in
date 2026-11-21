import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Upload, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function TrackerPage() {
  const [supplements, setSupplements] = useState([
    { id: 1, name: 'Whey Protein Isolate', dosage: '1 scoop (30g)', timing: 'Post-Workout / Evening', status: true },
    { id: 2, name: 'Creatine Monohydrate', dosage: '5 grams', timing: 'Daily with water', status: true },
    { id: 3, name: 'Omega-3 Fish Oil (EPA/DHA)', dosage: '2 capsules (1,500 mg)', timing: 'With Lunch', status: true },
    { id: 4, name: 'Vitamin D3 + K2', dosage: '3,000 IU', timing: 'Morning with healthy fats', status: true },
    { id: 5, name: 'Magnesium Glycinate', dosage: '400 mg', timing: '30 mins before sleep', status: false },
    { id: 6, name: 'Zinc Picolinate', dosage: '15 mg', timing: 'With Dinner', status: false }
  ]);

  const toggleSupp = (id) => {
    setSupplements(prev => prev.map(s => s.id === id ? { ...s, status: !s.status } : s));
  };

  const takenCount = supplements.filter(s => s.status).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 mb-2">
            <span>⚡</span> DAILY SUPPLEMENTS & BUDGET
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Daily Engine & Regimen
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Athletic micronutrient stack & supplement adherence. Auto-saved locally.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            {takenCount} / {supplements.length} Completed
          </span>
        </div>
      </div>

      {/* Supplement Checklist */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Essential Athletic Supplement Stack
          </h3>
          <span className="text-xs text-neutral-400">Tap to mark taken</span>
        </div>

        <div className="space-y-3">
          {supplements.map((item) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleSupp(item.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-4 ${
                item.status
                  ? 'bg-purple-500/5 border-purple-500/30 dark:bg-purple-500/10'
                  : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200/50 dark:border-neutral-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                  item.status ? 'bg-purple-500 text-white' : 'border border-neutral-400 dark:border-neutral-600'
                }`}>
                  {item.status && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${item.status ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 line-through'}`}>
                    {item.name}
                  </h4>
                  <span className="text-xs text-neutral-400 font-mono">{item.dosage} • {item.timing}</span>
                </div>
              </div>

              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                item.status ? 'bg-purple-500/15 text-purple-500' : 'text-neutral-400'
              }`}>
                {item.status ? 'Taken' : 'Pending'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
