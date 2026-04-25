"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, Play, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as tf from '@tensorflow/tfjs';
import { processData, createDataset, buildModel, ProcessedDraw } from '../lib/model';

export default function Home() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lossHistory, setLossHistory] = useState<{ epoch: number; loss: number }[]>([]);
  const [prediction, setPrediction] = useState<number[] | null>(null);
  const [modelReady, setModelReady] = useState(false);

  // Keep references for tensorflow model and data
  const tfModel = useRef<tf.Sequential | null>(null);
  const scalerRef = useRef<any>(null);
  const lastTwelveRef = useRef<number[][] | null>(null);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const res = await fetch('/api/loto');
      const json = await res.json();
      if (json.success && json.results.length > 0) {
        const processed = processData(json.results);
        setData(processed);
        // Prepare model
        const { X, Y, scaler, lastTwelve } = createDataset(processed);
        scalerRef.current = scaler;
        lastTwelveRef.current = lastTwelve;
        
        tfModel.current = buildModel(12, 19, 6);
        setModelReady(true);
      }
    } catch (e) {
      console.error(e);
    }
    setIsScraping(false);
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
          
          {data.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Tirages collectés</span>
                <span className="font-bold text-accent">{data.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Dernier tirage</span>
                <span className="font-medium text-white">{data[data.length-1].day} {data[data.length-1].month_year}</span>
              </div>
            </div>
          )}

          <hr className="border-slate-700/50 my-2" />

          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Apprentissage
          </h2>
          <p className="text-slate-400 text-sm">
            Entraînez le réseau de neurones LSTM sur les séquences temporelles.
          </p>
          <button 
            onClick={handleTrain} 
            disabled={!modelReady || isTraining}
            className="glow-button flex items-center justify-center gap-2"
          >
            {isTraining ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isTraining ? `Entraînement... ${progress}%` : "Lancer l'Entraînement"}
          </button>

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
