"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Play, Sparkles, RefreshCw, ChevronRight, Trophy, Target, ListOrdered, Brain, History, Settings, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as tf from '@tensorflow/tfjs';
import { processData, createDataset, buildAdvancedModel, runBacktest, ProcessedDraw } from '../lib/model';
import { loadDraws, saveDraws, saveModel, loadModel, hasSavedModel } from '../lib/storage';
import Link from 'next/link';

export default function Home() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [lossHistory, setLossHistory] = useState<{ epoch: number; loss: number }[]>([]);
  const [prediction, setPrediction] = useState<number[] | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestStats, setBacktestStats] = useState<{ testSize: number, avgBonsNumeros: string, winRate: string } | null>(null);
  const [windowLength, setWindowLength] = useState(12);
  const [hasModel, setHasModel] = useState(false);

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
        updateModelReferences(savedDraws);
        
        const exists = await hasSavedModel();
        setHasModel(exists);
        if (exists) {
          try {
            const model = await loadModel();
            tfModel.current = model as tf.Sequential;
            setModelReady(true);
          } catch (e) { console.error(e); }
        }
      }

      // 2. Auto-update from server
      handleScrape();
    }
    init();
  }, []);

  const updateModelReferences = (currentData: ProcessedDraw[]) => {
    const { scaler, lastTwelve } = createDataset(currentData, windowLength);
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
        await saveDraws(processed);
        updateModelReferences(processed);
        
        if (!tfModel.current) {
          tfModel.current = buildAdvancedModel(windowLength, 19, 6);
          setModelReady(true);
        }
        setScrapeStatus("Données à jour");
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
    
    tf.tidy(() => {
      const input = tf.tensor3d([lastTwelveRef.current!]);
      const output = tfModel.current!.predict(input) as tf.Tensor;
      output.array().then((scaledPred: any) => {
        if (!scaledPred || !scaledPred[0]) return;
        
        const scaler = scalerRef.current;
        const means = scaler.means.slice(0, 6);
        const stds = scaler.stds.slice(0, 6);
        const finalPred = (scaledPred[0] as number[]).map((val, i) => Math.round((val * stds[i]) + means[i]));
        
        for(let i=0; i<5; i++) {
          if (finalPred[i] < 1) finalPred[i] = 1;
          if (finalPred[i] > 49) finalPred[i] = 49;
        }
        if (finalPred[5] < 1) finalPred[5] = 1;
        if (finalPred[5] > 10) finalPred[5] = 10;
        setPrediction(finalPred);
      });
    });
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
            <span>Neural Intelligence • {scrapeStatus || "Optimisé"}</span>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            LOTO <span className="text-primary italic">IA</span> VISION
          </h1>
          <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
            Exploitez la puissance des réseaux de neurones LSTM avec Fine-Tuning et stockage SQLite.
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
        <motion.div className="md:col-span-4 glass-panel p-8 flex flex-col justify-between relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-24 h-24 text-primary" />
          </div>
          <div className="z-10">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <Target className="w-6 h-6 text-primary" /> Prochaine Vision
            </h2>
            <p className="text-slate-400 font-medium">Fenêtre temporelle : {windowLength} tirages</p>
          </div>
          <div className="flex justify-center md:justify-start gap-3 md:gap-5 my-12 z-10 flex-wrap">
            <AnimatePresence mode="wait">
              {prediction ? prediction.map((num, i) => (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', delay: i * 0.1 }} className={`number-ball ${i === 5 ? 'chance' : ''}`}>{num}</motion.div>
              )) : [1,2,3,4,5,6].map(i => (
                <div key={i} className={`number-ball opacity-20 border-dashed ${i === 6 ? 'chance' : ''}`}>?</div>
              ))}
            </AnimatePresence>
          </div>
          <button onClick={handlePredict} disabled={!modelReady || isTraining} className="btn-accent w-full md:w-fit z-10">
            Calculer <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Configuration Card */}
        <motion.div className="md:col-span-2 glass-panel p-6 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">Paramètres</h3>
              <p className="text-slate-400 text-sm">Contrôle du modèle</p>
            </div>
            <Settings className="text-accent w-5 h-5" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Fenêtre Temporelle (LSTMs)</label>
              <input 
                type="range" min="4" max="24" value={windowLength} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setWindowLength(val);
                  updateModelReferences(data);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" 
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>4 TIRAGES</span>
                <span className="text-primary">{windowLength}</span>
                <span>24 TIRAGES</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Status Tenseurs</p>
              <p className="text-xs font-mono text-accent">Active / Optimized</p>
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

        {/* Quick Backtest */}
        <motion.div className="md:col-span-3 glass-panel p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500" /> Validation</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Win Rate</span>
                <span className="text-lg font-black text-primary">{backtestStats?.winRate || '0'}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Numeros</span>
                <span className="text-lg font-black text-white">{backtestStats?.avgBonsNumeros || '0'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sample</span>
                <span className="text-lg font-black text-white">{backtestStats?.testSize || '0'}</span>
              </div>
            </div>
          </div>
          <button onClick={handleBacktest} disabled={isBacktesting || data.length === 0} className="btn-ghost w-full mt-4">
            {isBacktesting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Lancer Test
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


