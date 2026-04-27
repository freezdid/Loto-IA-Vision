"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Target, ChevronLeft, ArrowRight, Brain, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { loadDraws, loadPredictions, SavedPrediction } from '@/lib/storage';
import { ProcessedDraw } from '@/lib/model';

export default function Journal() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [predictions, setPredictions] = useState<SavedPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const draws = await loadDraws();
      const preds = await loadPredictions();
      if (draws) setData(draws);
      if (preds) setPredictions(preds);
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
    // Find draws that happened AFTER this prediction
    const predTime = new Date(pred.timestamp).getTime();
    const laterDraws = data.filter(d => d.fullDate > predTime).sort((a, b) => a.fullDate - b.fullDate);
    
    if (laterDraws.length === 0) return null;

    // Compare each grille with the very next draw
    const nextDraw = laterDraws[0];
    
    const scores = pred.grilles.map(g => checkMatch(g, nextDraw));
    const bestScore = scores.reduce((prev, current) => (current.nums > prev.nums ? current : prev), scores[0]);

    return {
      draw: nextDraw,
      bestScore,
      allScores: scores
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-accent animate-pulse font-black uppercase">Analyse des performances...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span>Retour Dashboard</span>
          </Link>
          <div className="text-right">
            <h1 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-2">
               <Brain className="w-6 h-6 text-accent" /> IA JOURNAL
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Suivi des performances prédictives</p>
          </div>
        </div>

        {predictions.length === 0 ? (
          <div className="glass-panel p-12 text-center space-y-4">
             <AlertCircle className="w-12 h-12 text-slate-700 mx-auto" />
             <p className="text-slate-500 uppercase font-black">Aucun pronostic enregistré pour le moment.</p>
             <Link href="/" className="btn-primary inline-flex">Lancer un calcul</Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {predictions.map((pred, idx) => {
              const result = getResultsForPrediction(pred);
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-panel overflow-hidden border-l-4 border-l-accent"
                >
                  <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold">{new Date(pred.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <h3 className="text-lg font-bold">Pronostic #{predictions.length - idx}</h3>
                      <div className="flex gap-1 mt-2">
                        {pred.grilles[0].map((num, i) => (
                          <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 5 ? 'bg-loto-red' : 'bg-slate-800'}`}>
                            {num}
                          </div>
                        ))}
                      </div>
                      {pred.grilles.length > 1 && (
                        <p className="text-[10px] text-slate-500 italic mt-1">+ {pred.grilles.length - 1} autres combinaisons calculées</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                      <ArrowRight className="w-5 h-5 text-slate-600 hidden md:block" />
                      {result ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-loto-yellow">Résultat Tirage du {new Date(result.draw.fullDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center">
                              <span className="text-2xl font-black text-white">{result.bestScore.nums}</span>
                              <span className="text-[8px] font-bold text-slate-500 uppercase">Numéros</span>
                            </div>
                            <div className={`w-px h-8 ${result.bestScore.chance ? 'bg-loto-red' : 'bg-slate-800'}`} />
                            <div className="flex flex-col items-center">
                              <span className={`text-2xl font-black ${result.bestScore.chance ? 'text-loto-red' : 'text-slate-700'}`}>
                                {result.bestScore.chance ? 'OK' : '-'}
                              </span>
                              <span className="text-[8px] font-bold text-slate-500 uppercase">Chance</span>
                            </div>
                            <div className="ml-4">
                               {result.bestScore.nums >= 3 ? (
                                 <div className="bg-loto-yellow text-slate-950 px-3 py-1 rounded-full text-[10px] font-black animate-bounce">
                                    GAGNANT
                                 </div>
                               ) : (
                                 <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                                    En attente
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                           <Target className="w-8 h-8 text-slate-800" />
                           <div>
                             <p className="text-xs font-bold text-slate-400">En attente du prochain tirage...</p>
                             <p className="text-[9px] text-slate-600 uppercase font-black italic">Analyse en suspens</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
