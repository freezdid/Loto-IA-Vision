"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Target, ChevronLeft, ArrowRight, Brain, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { loadDraws, loadPredictions, SavedPrediction } from '@/lib/storage';
import { ProcessedDraw } from '@/lib/model';

export default function Journal() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [predictions, setPredictions] = useState<SavedPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // 1. Load Local
      const draws = await loadDraws();
      const preds = await loadPredictions();
      if (draws) setData(draws);
      if (preds) setPredictions(preds);

      // 2. Load Cloud
      try {
        const timestamp = Date.now();
        if (!draws || draws.length === 0) {
          const resDraws = await fetch(`/api/sync?type=draws&t=${timestamp}`, { cache: 'no-store' });
          const jsonDraws = await resDraws.json();
          if (jsonDraws.success && jsonDraws.data) {
            setData(jsonDraws.data);
          }
        }

        const res = await fetch(`/api/sync?type=predictions&t=${timestamp}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
          setPredictions(prevLocal => {
            const cloudPreds = json.data as SavedPrediction[];
            const combined = [...cloudPreds];
            
            prevLocal.forEach(p => {
              if (!combined.find(c => c.timestamp === p.timestamp)) {
                combined.push(p);
              }
            });
            
            const sorted = combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
            import('@/lib/storage').then(m => m.savePredictions(sorted));
            return sorted;
          });
        }
      } catch (e) {
        console.error("Cloud sync failed:", e);
      }

      setLoading(false);
    }
    init();
  }, []);

  const checkMatch = (pred: number[], draw: ProcessedDraw) => {
    const predNums = pred.slice(0, 5);
    const predChance = pred[5];
    
    const drawNums = [draw.num0, draw.num1, draw.num2, draw.num3, draw.num4];
    const drawChance = draw.chance;

    const matchedNums = predNums.filter(n => drawNums.includes(n));
    const matchedChance = predChance === drawChance;

    return {
      nums: matchedNums.length,
      chance: matchedChance,
      matchedList: matchedNums
    };
  };

  const getResultsForPrediction = (pred: SavedPrediction) => {
    const predTime = new Date(pred.timestamp).getTime();
    const laterDraws = data.filter(d => d.fullDate > predTime).sort((a, b) => a.fullDate - b.fullDate);
    
    if (laterDraws.length === 0) return null;

    const nextDraw = laterDraws[0];
    const scores = pred.grilles.map(g => checkMatch(g, nextDraw));
    const bestScore = scores.reduce((prev, current) => (current.nums > prev.nums ? current : prev), scores[0]);

    return {
      draw: nextDraw,
      bestScore,
      allScores: scores
    };
  };

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

          <div className="flex items-center gap-3">
            <span className="font-black text-lg tracking-tight text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-chance" /> JOURNAL <span className="text-primary italic">DES GAINS</span>
            </span>
            <button 
              onClick={() => window.location.reload()}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Banner */}
        <section className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Suivi des Performances Réelles
            </h1>
            <p className="text-slate-400 text-sm">
              Comparaison automatique de chaque prédiction avec les tirages réels qui ont suivi.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
            {predictions.length} pronostics enregistrés
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-6 animate-pulse flex justify-between items-center">
                <div className="space-y-3">
                  <div className="w-32 h-4 bg-slate-800 rounded" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <div key={j} className="w-9 h-9 rounded-full bg-slate-800" />
                    ))}
                  </div>
                </div>
                <div className="w-32 h-16 bg-slate-800 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <div className="glass-panel p-16 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-700 mx-auto" />
            <h3 className="text-lg font-bold text-white">Aucun pronostic enregistré</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Générez des grilles sur le tableau de bord principal pour que le suivi des gains s'initialise.
            </p>
            <Link href="/" className="btn-primary !text-xs !py-2.5 inline-flex">
              Générer une Prédiction
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((pred, idx) => {
              const result = getResultsForPrediction(pred);
              const isWinner = result && (result.bestScore.nums >= 2 || result.bestScore.chance);

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.4) }}
                  className={`glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                    isWinner ? 'border-chance/30 shadow-lg shadow-chance/5' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{new Date(pred.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">{new Date(pred.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {pred.grilles[0].slice(0, 5).map((num, i) => (
                        <div key={i} className="number-ball-sm">
                          {num}
                        </div>
                      ))}
                      <div className="number-ball-sm chance">
                        {pred.grilles[0][5]}
                      </div>
                    </div>

                    {pred.grilles.length > 1 && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        + {pred.grilles.length - 1} autre{pred.grilles.length > 2 ? 's' : ''} combinaison{pred.grilles.length > 2 ? 's' : ''} générée{pred.grilles.length > 2 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Result Comparison */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center gap-6 self-start md:self-auto">
                    {result ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Tirage du {new Date(result.draw.fullDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <span className="text-3xl font-black text-white leading-none block">
                              {result.bestScore.nums}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Numéros</span>
                          </div>

                          <div className="text-center">
                            <span className={`text-3xl font-black leading-none block ${result.bestScore.chance ? 'text-chance' : 'text-slate-700'}`}>
                              {result.bestScore.chance ? '1' : '0'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Chance</span>
                          </div>

                          <div className="ml-2">
                            {isWinner ? (
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-chance text-slate-950 shadow-md shadow-chance/30 uppercase tracking-tight">
                                Gagnant
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-white/10 uppercase tracking-tight">
                                Non gagnant
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        <div>
                          <p className="text-xs font-bold text-white">En attente du tirage</p>
                          <p className="text-[10px] text-slate-500">Sera validé au prochain résultat</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        <p>Loto IA Vision Journal • Synchronisation Vercel Blob sécurisée</p>
      </footer>
    </div>
  );
}
