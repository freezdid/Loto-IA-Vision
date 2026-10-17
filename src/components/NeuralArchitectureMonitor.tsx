"use client";

import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { TRAINING_CONFIG, getArchitectureSpec } from '@/lib/model';
import type { TrainingMode } from '@/lib/types';

interface NeuralArchitectureMonitorProps {
  mode: TrainingMode;
  windowLength: number;
  isTraining: boolean;
}

/** Live schematic of the real model topology (never hard-coded in the UI). */
export function NeuralArchitectureMonitor({ mode, windowLength, isTraining }: NeuralArchitectureMonitorProps) {
  const nodes = getArchitectureSpec(mode, windowLength);

  return (
    <div className="rounded-xl bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold text-muted">
          <Layers className="h-4 w-4 text-primary-soft" aria-hidden />
          Architecture · {TRAINING_CONFIG[mode].label}
        </p>
        <span
          className={`chip ${
            isTraining ? 'bg-primary/15 text-primary-soft' : 'bg-white/5 text-faint'
          }`}
        >
          {isTraining ? 'Synapses actives' : 'Prêt à entraîner'}
        </span>
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {nodes.map((node, index) => (
          <li
            key={node.id}
            className={`relative overflow-hidden rounded-lg px-2 py-2 text-center ${
              isTraining ? 'bg-primary/12' : 'bg-white/[0.035]'
            }`}
          >
            {isTraining && (
              <motion.span
                aria-hidden
                initial={{ x: '-110%' }}
                animate={{ x: '210%' }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: index * 0.18 }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
              />
            )}
            <span className="relative block truncate text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
              {node.label}
            </span>
            <span className="relative mt-0.5 block text-xs font-extrabold tabular text-ink">{node.value}</span>
            <span className="relative block truncate text-[10px] text-faint">{node.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
