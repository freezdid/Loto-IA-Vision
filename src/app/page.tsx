"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Play, Sparkles, RefreshCw, ChevronRight, Trophy, Target, ListOrdered, Brain, History, Settings, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as tf from '@tensorflow/tfjs';
import { processData, createDataset, buildAdvancedModel, runBacktest, ProcessedDraw } from '../lib/model';
import { loadDraws, saveDraws, saveModel, loadModel, hasSavedModel } from '../lib/storage';
import { calculateFrequencies, analyzeTypicality } from '../lib/stats';
import Link from 'next/link';

export default function Home() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("Local");

  const [lossHistory, setLossHistory] = useState<{ epoch: number; loss: number }[]>([]);
  const [hasModel, setHasModel] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestStats, setBacktestStats] = useState<{ testSize: number, avgBonsNumeros: string, winRate: string } | null>(null);
  const [windowLength, setWindowLength] = useState(12);
  const [numPredictions, setNumPredictions] = useState(1);
  const [predictions, setPredictions] = useState<number[][]>([]);
  const [frequencies, setFrequencies] = useState<{ topNums: number[], topChances: number[] } | null>(null);

  // Keep references for tensorflow model and data
  const tfModel = useRef<tf.Sequential | null>(null);
  const scalerRef = useRef<any>(null);
  const lastTwelveRef = useRef<number[][] | null>(null);

  // Load and Auto-Update on mount
  useEffect(() => {
    async function init() {
      // 1. Load from cache first
      const savedDraws = await loadDraws();
      if (savedDraws && savedDraws.length > 0) {
        setData(savedDraws);
        setFrequencies(calculateFrequencies(savedDraws));
        updateModelReferences(savedDraws);
      }

      // 2. Sync with Cloud (Vercel Blob)
      setSyncStatus("Syncing...");
      try {
        const syncRes = await fetch('/api/sync');
        const syncJson = await syncRes.json();
        if (syncJson.success && syncJson.data && syncJson.data.length > (savedDraws?.length || 0)) {
          setData(syncJson.data);
          await saveDraws(syncJson.data);
          updateModelReferences(syncJson.data);
          setSyncStatus("Cloud");
        } else {
          setSyncStatus(syncJson.success ? "Cloud Synced" : "Local Only");
        }
      } catch (e) { 
        console.error("Sync failed:", e);
        setSyncStatus("Local Only");
      }
      
      const exists = await hasSavedModel();
      setHasModel(exists);
      if (exists) {
        try {
          const model = await loadModel();
          tfModel.current = model as tf.Sequential;
          setModelReady(true);
        } catch (e) { console.error(e); }
      }

      // 3. Auto-update from server (Scraping)
      handleScrape();
    }

    init();
  }, []);

  const updateModelReferences = (currentData: ProcessedDraw[], length: number = windowLength) => {
    const { scaler, lastTwelve } = createDataset(currentData, length);
    scalerRef.current = scaler;
    lastTwelveRef.current = lastTwelve;
  };

  const handleScrape = async () => {
    setIsScraping(true);
    setScrapeStatus("Vérification nouveaux tirages...");
    try {
      const res = await fetch('/api/loto');
      const json = await res.json();
        if (json.success && json.results.length > 0) {
          const processed = processData(json.results);
          setData(processed);
          setFrequencies(calculateFrequencies(processed));
          await saveDraws(processed);
        updateModelReferences(processed);
        
        if (!tfModel.current) {
          tfModel.current = buildAdvancedModel(windowLength, 19, 6);
          setModelReady(true);
        }
        setScrapeStatus("Données à jour");

        // Push to Cloud
        try {
          await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ data: processed })
          });
          setSyncStatus("Cloud Updated");
        } catch (e) { console.error("Cloud push failed:", e); }
      }

    } catch (e) {
      console.error(e);
      setScrapeStatus("Erreur mise à jour");
    }
    setIsScraping(false);
    setTimeout(() => setScrapeStatus(""), 3000);
  };

  const handleTrain = async () => {
    if (data.length === 0) return;
    setIsTraining(true);
    setLossHistory([]);
    setProgress(0);

    // Fine-tuning: check if model exists, if not create it
    if (!tfModel.current) {
      tfModel.current = buildAdvancedModel(windowLength, 19, 6);
    }

    const { X, Y } = createDataset(data, windowLength);
    if (X.length === 0 || Y.length === 0) {
      console.error("Dataset empty - cannot train");
      setIsTraining(false);
      return;
    }

    const xs = tf.tensor3d(X);
    const ys = tf.tensor2d(Y);
    const epochs = 50; // Quicker for fine-tuning

    await tfModel.current.fit(xs, ys, {
      epochs,
      batchSize: 32,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          setProgress(Math.round(((epoch + 1) / epochs) * 100));
          if (logs) setLossHistory(prev => [...prev, { epoch: epoch + 1, loss: logs.loss }]);
        }
      }
    });
    
    await saveModel(tfModel.current);
    setHasModel(true);
    
    // Dispose tensors
    xs.dispose();
    ys.dispose();
    
    setIsTraining(false);
  };


  const handlePredict = async () => {
    if (!tfModel.current || !lastTwelveRef.current || !scalerRef.current) return;
    
    const newPredictions: number[][] = [];
    const scaler = scalerRef.current;
    const means = scaler.means.slice(0, 6);
    const stds = scaler.stds.slice(0, 6);

    for (let p = 0; p < numPredictions; p++) {
      tf.tidy(() => {
        // Sécurité : s'assurer que la longueur des données correspond à la fenêtre attendue
        const currentWindow = lastTwelveRef.current!.length;
        const noise = tf.randomNormal([1, currentWindow, 19], 0, p * 0.015);
        const input = tf.add(tf.tensor3d([lastTwelveRef.current!]), noise);
        
        const output = tfModel.current!.predict(input) as tf.Tensor;
        const scaledPred = output.arraySync() as number[][];
        
        if (scaledPred && scaledPred[0]) {
          const finalPred = scaledPred[0].map((val, i) => Math.round((val * stds[i]) + means[i]));
          
          for(let i=0; i<5; i++) {
            finalPred[i] = Math.max(1, Math.min(49, finalPred[i]));
          }
          finalPred[5] = Math.max(1, Math.min(10, finalPred[5]));
          
          // S'assurer que les numéros principaux sont uniques
          const mainNums = Array.from(new Set(finalPred.slice(0, 5))).sort((a,b) => a-b);
          while(mainNums.length < 5) {
            const extra = Math.floor(Math.random() * 49) + 1;
            if(!mainNums.includes(extra)) mainNums.push(extra);
          }
          
          newPredictions.push([...mainNums.sort((a,b) => a-b), finalPred[5]]);
        }
      });
    }
    setPredictions(newPredictions);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loto_ia_vision_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setData(json);
          await saveDraws(json);
          updateModelReferences(json);
          alert("Import réussi !");
        }
      } catch (e) { alert("Format invalide"); }
    };
    reader.readAsText(file);
  };

  const handleBacktest = async () => {
    if (data.length === 0) return;
    setIsBacktesting(true);
    setBacktestStats(null);
    setProgress(0);
    try {
      const stats = await runBacktest(data, windowLength, 50, (p) => setProgress(p));
      if (stats) setBacktestStats(stats);
    } catch (e) { console.error(e); }
    setIsBacktesting(false);
  };


  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-16 flex flex-col gap-12">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Neural Intelligence • {syncStatus} • {scrapeStatus || "Stable"}</span>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            LOTO <span className="text-primary italic">IA</span> VISION
          </h1>
          <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
            Exploitez la puissance des réseaux de neurones LSTM avec Fine-Tuning et stockage persistant.
          </p>
        </div>
        <div className="flex gap-4">
           <Link href="/history" className="btn-ghost">
             <Calendar className="w-5 h-5" />
             <span>Historique</span>
           </Link>
           <button onClick={handleTrain} disabled={data.length === 0 || isTraining} className="btn-primary">
             {isTraining ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
             <span>{hasModel ? "Fine-Tune" : "Entraîner"}</span>
           </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        
        {/* Prediction Display */}
        <motion.div className="md:col-span-4 glass-panel p-8 flex flex-col gap-8 relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-24 h-24 text-primary" />
          </div>
          
          <div className="z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Target className="w-6 h-6 text-primary" /> Vision Prédictive
              </h2>
              <p className="text-slate-400 font-medium">Algorithme basé sur {windowLength} tirages</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Nombre de Visions</label>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="10" value={numPredictions} onChange={(e) => setNumPredictions(parseInt(e.target.value))} className="w-32 accent-primary" />
                <span className="text-xl font-black text-primary">{numPredictions}</span>
              </div>
            </div>
          </div>

          <div className="z-10 space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {predictions.length > 0 ? predictions.map((pred, pIdx) => {
                const stats = analyzeTypicality(pred);
                return (
                  <motion.div 
                    key={pIdx} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-500 w-6">#{pIdx + 1}</span>
                      <div className="flex gap-2">
                        {pred.map((num, i) => (
                          <div key={i} className={`number-ball ${i === 5 ? 'chance' : ''}`}>
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight ${stats.sumStatus === 'Optimal' ? 'bg-primary/20 text-white border border-primary/30' : 'bg-slate-800 text-slate-400'}`}>
                         Somme {stats.sum} ({stats.sumStatus})
                       </span>
                       <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight ${stats.balanceStatus === 'Équilibré' ? 'bg-accent/20 text-white border border-accent/30' : 'bg-slate-800 text-slate-400'}`}>
                         {stats.evens}P / {stats.odds}I ({stats.balanceStatus})
                       </span>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                   <Target className="w-12 h-12 mb-4" />
                   <p className="font-bold uppercase tracking-widest text-xs text-center px-4">Prêt pour l'analyse prédictive</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={handlePredict} disabled={!modelReady || isTraining} className="btn-accent w-full md:w-fit z-10 mt-auto">
            Lancer les Calculs <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Configuration Card */}
        <motion.div className="md:col-span-2 glass-panel p-6 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">Paramètres</h3>
              <p className="text-slate-400 text-sm">Gestion des données</p>
            </div>
            <Settings className="text-accent w-5 h-5" />
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Fenêtre Temporelle (LSTMs)</label>
              <input 
                type="range" min="4" max="24" value={windowLength} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setWindowLength(val);
                  updateModelReferences(data, val);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" 
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>4 TIRAGES</span>
                <span className="text-primary">{windowLength}</span>
                <span>24 TIRAGES</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/50">
               <label className="text-xs font-bold text-slate-500 uppercase block">Persistance (Multi-Navigateur)</label>
               <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleExport} className="btn-ghost !py-2 !text-xs !px-2">
                    <Database className="w-3.5 h-3.5" /> Exporter JSON
                 </button>
                 <label className="btn-ghost !py-2 !text-xs !px-2 cursor-pointer">
                    <History className="w-3.5 h-3.5" /> Importer
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                 </label>
               </div>
               <p className="text-[10px] text-slate-500 italic leading-tight">
                 Utilisez l'export pour transférer vos données SQLite/IndexedDB vers un autre navigateur.
               </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Status Tenseurs</p>
              <p className="text-xs font-mono text-accent">Optimisé / Active</p>
            </div>
          </div>
        </motion.div>

        {/* Performance Chart */}
        <motion.div className="md:col-span-3 glass-panel p-6 flex flex-col gap-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><Activity className="w-4 h-4 text-accent" /> Loss History</h3>
          <div className="w-full h-64">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={lossHistory}>
                 <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={2} dot={false} />
                 <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px' }} itemStyle={{ color: '#3b82f6' }} labelClassName="hidden" />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Heatmap Card */}
        <motion.div className="md:col-span-3 glass-panel p-6 flex flex-col gap-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><ListOrdered className="w-4 h-4 text-loto-yellow" /> Chaleur des Numéros</h3>
          <p className="text-[10px] text-slate-500 uppercase font-black -mt-4">Les 10 numéros les plus fréquents</p>
          <div className="flex flex-wrap gap-3">
             {frequencies?.topNums.map((num, i) => (
               <div key={i} className="flex flex-col items-center gap-1">
                 <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                    {num}
                 </div>
                 <span className="text-[8px] font-bold text-slate-600">RANK {i+1}</span>
               </div>
             ))}
          </div>
          <div className="pt-4 border-t border-white/5">
             <p className="text-[10px] text-slate-500 uppercase font-black mb-3">Chances Favoris</p>
             <div className="flex gap-4">
                {frequencies?.topChances.map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-loto-yellow text-slate-900 flex items-center justify-center font-black text-xs shadow-lg">
                    {c}
                  </div>
                ))}
             </div>
          </div>
        </motion.div>

        {/* Quick Backtest */}
        <motion.div className="md:col-span-3 glass-panel p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="space-y-4 z-10">
            <h3 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500" /> Validation</h3>
            
            <AnimatePresence mode="wait">
              {isBacktesting ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 py-4"
                >
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-black text-primary uppercase">Calcul en cours...</span>
                    <span className="text-xl font-black text-white">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 italic">L'IA simule 50 tirages passés pour valider sa précision...</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Win Rate</span>
                    <span className="text-lg font-black text-primary">{backtestStats?.winRate || '0'}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Numeros</span>
                    <span className="text-lg font-black text-white">{backtestStats?.avgBonsNumeros || '0'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Sample</span>
                    <span className="text-lg font-black text-white">{backtestStats?.testSize || '0'}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button onClick={handleBacktest} disabled={isBacktesting || data.length === 0} className="btn-ghost w-full mt-4 z-10 relative">
            {isBacktesting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isBacktesting ? "Analyse..." : "Lancer Test de Précision"}
          </button>
        </motion.div>


      </div>

      <footer className="mt-auto py-8 text-center border-t border-slate-800/50">
        <p className="text-slate-600 text-xs font-medium tracking-widest uppercase">
          Propulsé par Antigravity Intelligence • © 2026
        </p>
      </footer>
    </main>
  );
}



