"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Play, Sparkles, RefreshCw, ChevronRight, Trophy, Target, ListOrdered } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as tf from '@tensorflow/tfjs';
import { processData, createDataset, buildAdvancedModel, runBacktest, ProcessedDraw } from '../lib/model';

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

  // Keep references for tensorflow model and data
  const tfModel = useRef<tf.Sequential | null>(null);
  const scalerRef = useRef<any>(null);
  const lastTwelveRef = useRef<number[][] | null>(null);

  const handleScrape = async () => {
    setIsScraping(true);
    setScrapeStatus("Connexion au serveur FDJ...");
    try {
      await new Promise(r => setTimeout(r, 600)); // Effet visuel
      setScrapeStatus("Extraction des tirages historiques...");
      
      const res = await fetch('/api/loto');
      const json = await res.json();
      
      if (json.success && json.results.length > 0) {
        setScrapeStatus("Traitement et formatage des données...");
        await new Promise(r => setTimeout(r, 600)); // Effet visuel
        
        const processed = processData(json.results);
        setData(processed);
        
        setScrapeStatus("Création des tenseurs TensorFlow...");
        await new Promise(r => setTimeout(r, 500)); // Effet visuel
        
        const { X, Y, scaler, lastTwelve } = createDataset(processed);
        scalerRef.current = scaler;
        lastTwelveRef.current = lastTwelve;
        
        tfModel.current = buildAdvancedModel(12, 19, 6);
        setModelReady(true);
      }
    } catch (e) {
      console.error(e);
      setScrapeStatus("Erreur de connexion");
    }
    setIsScraping(false);
    setScrapeStatus("");
  };

  const handleTrain = async () => {
    if (!tfModel.current || data.length === 0) return;
    setIsTraining(true);
    setLossHistory([]);
    setProgress(0);

    const { X, Y } = createDataset(data);
    const xs = tf.tensor3d(X);
    const ys = tf.tensor2d(Y);

    const epochs = 100; // Keep it reasonable for browser demo

    await tfModel.current.fit(xs, ys, {
      epochs,
      batchSize: 32,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          setProgress(Math.round(((epoch + 1) / epochs) * 100));
          if (logs) {
            setLossHistory(prev => [...prev, { epoch: epoch + 1, loss: logs.loss }]);
          }
        }
      }
    });

    setIsTraining(false);
  };

  const handlePredict = async () => {
    if (!tfModel.current || !lastTwelveRef.current || !scalerRef.current) return;
    
    // Create [1, 12, 19] tensor
    const input = tf.tensor3d([lastTwelveRef.current]);
    const output = tfModel.current.predict(input) as tf.Tensor;
    const scaledPred = await output.array() as number[][];
    
    // Dummy inverse transform to get the 6 values (need to append zeros to make 19 features for the scaler if we used full inverse, but we can just inverse transform the first 6 manually)
    const scaler = scalerRef.current;
    const means = scaler.means.slice(0, 6);
    const stds = scaler.stds.slice(0, 6);
    
    const finalPred = scaledPred[0].map((val, i) => Math.round((val * stds[i]) + means[i]));
    
    // Cap values to realistic Loto bounds
    for(let i=0; i<5; i++) {
      if (finalPred[i] < 1) finalPred[i] = 1;
      if (finalPred[i] > 49) finalPred[i] = 49;
    }
    if (finalPred[5] < 1) finalPred[5] = 1;
    if (finalPred[5] > 10) finalPred[5] = 10;
    
    setPrediction(finalPred);
  };

  const handleBacktest = async () => {
    if (data.length === 0) return;
    setIsBacktesting(true);
    setBacktestStats(null);
    setProgress(0);
    
    try {
      const stats = await runBacktest(data, 12, 50, (p) => setProgress(p));
      if (stats) setBacktestStats(stats);
    } catch (e) {
      console.error(e);
    }
    
    setIsBacktesting(false);
  };

  return (
    <main className="min-h-screen p-8 md:p-16">
      <header className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-panel mb-6"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium tracking-wider text-slate-300 uppercase">Loto IA Vision</span>
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
          Deep Learning Loto
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Un système de prédiction neuronal de dernière génération, basé sur l'historique complet des tirages et les modèles LSTM (Long Short-Term Memory).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        
        {/* Panneau de Contrôle */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-6 flex flex-col gap-6"
        >
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="w-6 h-6 text-accent" /> Base de Données
          </h2>
          <p className="text-slate-400 text-sm">
            Scrappez les derniers tirages en temps réel pour alimenter le modèle d'intelligence artificielle.
          </p>
          <button 
            onClick={handleScrape} 
            disabled={isScraping || isTraining}
            className="glow-button flex items-center justify-center gap-2"
          >
            {isScraping ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            {isScraping ? "Acquisition en cours..." : "Acquérir les Données"}
          </button>
          
          {isScraping && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Database className="w-4 h-4 animate-bounce" />
                <span className="font-semibold">Synchronisation de la DB</span>
              </div>
              <p className="text-slate-300">[{scrapeStatus}]</p>
              <div className="w-full bg-slate-800 rounded-full h-1 mt-3 overflow-hidden">
                <motion.div 
                  className="bg-primary h-1 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  style={{ width: '50%' }}
                />
              </div>
            </motion.div>
          )}

          {!isScraping && data.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 p-4 rounded-lg bg-slate-900/50 border border-slate-700 shadow-inner"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Volume Total</span>
                <span className="font-bold text-accent">{data.length} grilles</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 text-sm">Dernière MaJ</span>
                <span className="font-medium text-white text-sm">{data[data.length-1].day} {data[data.length-1].month_year}</span>
              </div>
              
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Injections Récentes :</p>
                {data.slice(-3).reverse().map((draw, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    key={idx} 
                    className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-md text-sm border border-slate-700/30 hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-slate-400 text-xs w-16 truncate">{draw.day.split(' ')[0]}</span>
                    <div className="flex gap-1.5">
                       {[draw.num0, draw.num1, draw.num2, draw.num3, draw.num4].map((n, i) => (
                         <span key={i} className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white shadow-sm">{n}</span>
                       ))}
                       <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold ml-1 shadow-sm">{draw.chance}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <hr className="border-slate-700/50 my-2" />

          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Apprentissage & Backtest
          </h2>
          <p className="text-slate-400 text-sm">
            Entraînez le réseau de neurones LSTM Bidirectionnel ou testez ses performances.
          </p>
          <div className="flex gap-2 flex-col xl:flex-row">
            <button 
              onClick={handleTrain} 
              disabled={!modelReady || isTraining || isBacktesting}
              className="glow-button flex-1 flex items-center justify-center gap-2"
            >
              {isTraining ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isTraining ? `Entraînement... ${progress}%` : "Entraîner"}
            </button>
            <button 
              onClick={handleBacktest} 
              disabled={data.length === 0 || isTraining || isBacktesting}
              className="px-4 py-3 rounded-lg font-medium transition-all bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isBacktesting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
              {isBacktesting ? `Calculs... ${progress}%` : "Backtest (50 tirages)"}
            </button>
          </div>

          {isTraining && (
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <motion.div 
                className="bg-primary h-2 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          )}
        </motion.div>

        {/* Panneau de Monitoring */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 lg:col-span-2 flex flex-col"
        >
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-accent" /> Monitoring du Modèle
          </h2>
          
          <div className="flex-1 min-h-[300px] w-full bg-slate-900/40 rounded-xl p-4 border border-slate-700/50 flex items-center justify-center">
            {lossHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lossHistory}>
                  <XAxis dataKey="epoch" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>En attente de l'entraînement...</p>
              </div>
            )}
          </div>
          
          {backtestStats && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg">
                <div className="absolute inset-0 bg-blue-500/10 blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                <ListOrdered className="w-6 h-6 text-blue-400 mb-2 z-10" />
                <p className="text-sm text-slate-400 z-10 font-medium text-center">Échantillon Test</p>
                <p className="text-2xl font-bold text-white z-10 mt-1">{backtestStats.testSize}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg">
                <div className="absolute inset-0 bg-accent/10 blur-xl group-hover:bg-accent/20 transition-all"></div>
                <Target className="w-6 h-6 text-accent mb-2 z-10" />
                <p className="text-sm text-slate-400 z-10 font-medium text-center">Bons Num. Moy.</p>
                <p className="text-2xl font-bold text-white z-10 mt-1">{backtestStats.avgBonsNumeros}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg">
                <div className="absolute inset-0 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all"></div>
                <Trophy className="w-6 h-6 text-primary mb-2 z-10" />
                <p className="text-sm text-slate-400 z-10 font-medium text-center">Grilles Gagnantes</p>
                <p className="text-2xl font-bold text-white z-10 mt-1">{backtestStats.winRate}<span className="text-lg font-normal text-slate-400">%</span></p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Prédiction */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 lg:col-span-3 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="flex flex-col gap-4 z-10 w-full md:w-auto text-center md:text-left">
            <h2 className="text-3xl font-bold">Prédiction Suivante</h2>
            <p className="text-slate-400">Générez les numéros pour le prochain tirage.</p>
            <button 
              onClick={handlePredict}
              disabled={lossHistory.length === 0 || isTraining}
              className="glow-button flex items-center justify-center gap-2 w-fit mx-auto md:mx-0 mt-2"
            >
              Calculer <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex justify-center items-center gap-4 flex-wrap z-10">
            <AnimatePresence>
              {prediction ? (
                prediction.map((num, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, delay: i * 0.1 }}
                    className={`number-ball ${i === 5 ? 'chance' : ''}`}
                  >
                    {num}
                  </motion.div>
                ))
              ) : (
                <div className="flex gap-4">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className={`number-ball opacity-10 ${i === 6 ? 'chance' : ''}`}>?</div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </main>
  );
}
