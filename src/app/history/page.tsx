"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Search, Sparkles } from 'lucide-react';
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
      // 1. Try IndexedDB first
      try {
        const saved = await loadDraws();
        if (saved && saved.length > 0) {
          setDraws([...saved].reverse());
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
      }

      // 2. Fetch from API
      try {
        const res = await fetch('/api/draws');
        const json = await res.json();
        if (json.success && json.results.length > 0) {
          setDraws(json.results);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchDraws();
  }, []);

  const filteredDraws = draws.filter(d => 
    d.day.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.month_year.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/30 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#030712]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <ChevronLeft className="w-4 h-4 text-primary" />
            <span>Retour au Lab</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-tight text-white">ARCHIVES <span className="text-primary italic">LOTO</span></span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-400 border border-white/10">
              {draws.length} tirages
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Banner with Search */}
        <section className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Historique des Tirages Officiels
            </h1>
            <p className="text-slate-400 text-sm">
              Base de données complète utilisée pour l'entraînement du réseau neuronal.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Rechercher (ex: Lundi, 2024)..." 
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-primary text-xs font-medium text-white transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="glass-panel p-5 space-y-4 animate-pulse">
                <div className="w-24 h-4 bg-slate-800 rounded" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <div key={j} className="w-8 h-8 rounded-full bg-slate-800" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredDraws.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDraws.map((draw, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.4) }}
                className="glass-panel p-5 space-y-4 hover:border-primary/40 transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider leading-none mb-1">
                      {draw.day}
                    </p>
                    <p className="text-xs font-bold text-slate-300">
                      {draw.month_year}
                    </p>
                  </div>
                  <Calendar className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors" />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5">
                    {[draw.num0, draw.num1, draw.num2, draw.num3, draw.num4].map((n, i) => (
                      <div key={i} className="number-ball-sm">
                        {n}
                      </div>
                    ))}
                  </div>
                  <div className="number-ball-sm chance">
                    {draw.chance}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-16 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-400 font-bold text-sm">Aucun tirage trouvé pour "{searchTerm}".</p>
            <button onClick={() => setSearchTerm("")} className="btn-ghost !text-xs !py-1.5 mx-auto">
              Effacer la recherche
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        <p>Loto IA Vision Archives • Données réelles certifiées</p>
      </footer>
    </div>
  );
}
