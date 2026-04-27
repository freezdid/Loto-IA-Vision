"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { loadDraws } from '../../lib/storage';


interface Draw {
  day: string;
  month_year: string;
  num0: number;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  chance: number;
}

export default function HistoryPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchDraws() {
      // 1. Try IndexedDB first (most up-to-date)
      try {
        const saved = await loadDraws();
        if (saved && saved.length > 0) {
          setDraws([...saved].reverse());
          setLoading(false);
          // Still fetch from API to ensure sync, but UI is already responsive
        }
      } catch (e) { console.error(e); }

      // 2. Fetch from API
      try {
        const res = await fetch('/api/draws');
        const json = await res.json();
        if (json.success && json.results.length > 0) {
          setDraws(json.results);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchDraws();
  }, []);

  const filteredDraws = draws.filter(d => 
    d.day.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.month_year.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-16 flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest mb-2">
            <ChevronLeft className="w-4 h-4" /> Retour au Lab
          </Link>
          <h1 className="text-4xl font-black tracking-tighter">ARCHIVES <span className="text-primary">LOTO</span></h1>
          <p className="text-slate-400 font-medium">Historique complet extrait de la base SQLite locale.</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Rechercher une date (ex: Lundi, 2024...)" 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-colors font-medium text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-32 opacity-20 animate-pulse">
           <Calendar className="w-12 h-12" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDraws.map((draw, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 1) }}
              className="glass-panel p-5 space-y-4 hover:border-primary/30 transition-colors group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{draw.day}</p>
                  <p className="text-sm font-bold text-slate-300">{draw.month_year}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Filter className="w-3 h-3 text-slate-600" />
                </div>
              </div>

              <div className="flex gap-2 justify-between">
                <div className="flex gap-1.5">
                  {[draw.num0, draw.num1, draw.num2, draw.num3, draw.num4].map((n, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {n}
                    </div>
                  ))}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-black text-primary shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  {draw.chance}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
