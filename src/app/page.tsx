"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Database, 
  Play, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  Trophy, 
  Target, 
  ListOrdered, 
  Brain, 
  History, 
  Settings, 
  Calendar,
  Copy,
  Check,
  Flame,
  Clock,
  Sliders,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import * as tf from '@tensorflow/tfjs';
import { 
  processData, 
  createDataset, 
  buildAdvancedModel, 
  buildFastModel,
  runBacktest, 
  ProcessedDraw,
  initTensorFlow,
  TRAINING_CONFIG
} from '../lib/model';

import { calculateFrequencies, analyzeTypicality } from '../lib/stats';
import { 
  loadDraws, 
  saveDraws, 
  saveModel, 
  loadModel, 
  hasSavedModel, 
  loadPredictions, 
  savePredictions, 
  SavedPrediction, 
  exportModel, 
  saveLastPrediction, 
  loadLastPrediction 
} from '../lib/storage';
import Link from 'next/link';

export default function Home() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("Local");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Active Tab: 'predictions' | 'stats' | 'lab'
  const [activeTab, setActiveTab] = useState<'predictions' | 'stats' | 'lab'>('predictions');

  const [lossHistory, setLossHistory] = useState<{ epoch: number; loss: number }[]>([]);
  const [hasModel, setHasModel] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestStats, setBacktestStats] = useState<{ testSize: number; avgBonsNumeros: string; winRate: string } | null>(null);
  const [windowLength, setWindowLength] = useState(12);
  const [numPredictions, setNumPredictions] = useState(3);
  const [predictions, setPredictions] = useState<number[][]>([]);
  const [frequencies, setFrequencies] = useState<{ topNums: number[]; topChances: number[] } | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<SavedPrediction[]>([]);
  const [simNumbers, setSimNumbers] = useState<number[]>([7, 14, 22, 33, 45, 8]);
  const [simResult, setSimResult] = useState<{ score: number; analysis: string } | null>(null);
  const [isSyncingModel, setIsSyncingModel] = useState(false);
  const [trainingMode, setTrainingMode] = useState<'fast' | 'precise'>('precise');
  const [backendName, setBackendName] = useState("WebGPU");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Countdown timer for next official FDJ draw (Mon, Wed, Sat 20h20)
  const [timeLeft, setTimeLeft] = useState<{ label: string; days: number; hours: number; minutes: number; seconds: number }>({
    label: "Calcul...",
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const tfModel = useRef<tf.LayersModel | null>(null);
  const scalerRef = useRef<any>(null);
  const lastTwelveRef = useRef<number[][] | null>(null);

  // Calculate Next Draw Countdown
  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const drawDays = [1, 3, 6]; // Mon, Wed, Sat
      let nextDraw: Date | null = null;
      let drawLabel = "";

      for (let offset = 0; offset <= 7; offset++) {
        const candidate = new Date(now);
        candidate.setDate(now.getDate() + offset);
        candidate.setHours(20, 20, 0, 0);

        if (drawDays.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
          nextDraw = candidate;
          const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
          drawLabel = `${dayNames[candidate.getDay()]} à 20h20`;
          break;
        }
      }

      if (nextDraw) {
        const diffMs = nextDraw.getTime() - now.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft({ label: drawLabel, days, hours, minutes, seconds });
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize data and AI model on mount
  useEffect(() => {
    async function init() {
      try {
        await initTensorFlow();
        setBackendName(tf.getBackend().toUpperCase());
      } catch (e) {
        setBackendName("CPU/FALLBACK");
      }

      // 1. Fast Load from cache
      const savedDraws = await loadDraws();
      if (savedDraws && savedDraws.length > 0) {
        setData(savedDraws);
        setFrequencies(calculateFrequencies(savedDraws));
        updateModelReferences(savedDraws);
      }

      // 2. Load previous predictions
      const savedPreds = await loadPredictions();
      if (savedPreds) setPredictionHistory(savedPreds);
      
      const lastActive = await loadLastPrediction();
      if (lastActive && lastActive.length > 0) {
        setPredictions(lastActive);
      }

      // 3. Check for saved TFJS model
      const exists = await hasSavedModel();
      setHasModel(exists);
      if (exists) {
        try {
          const model = await loadModel();
          if (model) {
            const inputShape = model.inputs[0].shape;
            if (inputShape[2] === 25) {
              tfModel.current = model;
              setModelReady(true);
            }
          }
        } catch (e) {
          console.warn("Existing model load error:", e);
        }
      }

      // Hide initial skeleton once local data is ready
      setIsInitialLoading(false);

      // 4. Background Cloud & Scraping Sync
      try {
        setSyncStatus("Cloud Sync...");
        const syncRes = await fetch('/api/sync', { cache: 'no-store' });
        const syncJson = await syncRes.json();
        if (syncJson.success && syncJson.data && syncJson.data.length > (savedDraws?.length || 0)) {
          setData(syncJson.data);
          await saveDraws(syncJson.data);
          updateModelReferences(syncJson.data);
          setSyncStatus("Cloud Synced");
        } else {
          setSyncStatus("Cloud Synced");
        }
      } catch (e) {
        setSyncStatus("Local Cache");
      }

      // Auto-check for fresh official draws
      await handleScrape();
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
    setScrapeStatus("Vérification FDJ...");
    try {
      const res = await fetch('/api/loto');
      const json = await res.json();
      if (json.success && json.results.length > 0) {
        const processed = processData(json.results);
        const isNewData = processed.length > data.length;
        
        setData(processed);
        setFrequencies(calculateFrequencies(processed));
        await saveDraws(processed);
        updateModelReferences(processed);

        if (!tfModel.current) {
          tfModel.current = buildAdvancedModel(windowLength, 25, 6);
          setModelReady(true);
        }
        setScrapeStatus(isNewData ? "Nouveaux tirages synchronisés !" : "Tirages à jour");

        // Sync with Vercel Blob
        try {
          await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ data: processed, type: 'draws' })
          });
        } catch (e) {
          console.warn("Cloud push failed:", e);
        }

        if (isNewData && data.length > 0) {
          handleTrain();
        }
      }
    } catch (e) {
      setScrapeStatus("Données locales actives");
    }
    setIsScraping(false);
    setTimeout(() => setScrapeStatus(""), 4000);
  };

  const handleTrain = async () => {
    if (data.length === 0) return;
    setIsTraining(true);
    setLossHistory([]);
    setProgress(0);

    let shouldBuild = !tfModel.current;
    if (tfModel.current) {
      const modelWindow = tfModel.current.inputs[0].shape[1];
      const modelIsAdvanced = tfModel.current.layers.length > 5;
      const wantAdvanced = trainingMode === 'precise';

      if (modelWindow !== windowLength || modelIsAdvanced !== wantAdvanced) {
        shouldBuild = true;
      }
    }

    if (shouldBuild) {
      tfModel.current = trainingMode === 'precise' 
        ? buildAdvancedModel(windowLength, 25, 6) 
        : buildFastModel(windowLength, 25, 6);
    }

    const { X, Y } = createDataset(data, windowLength);
    if (X.length === 0 || Y.length === 0) {
      setIsTraining(false);
      return;
    }

    const config = TRAINING_CONFIG[trainingMode];
    const xs = tf.tensor3d(X);
    const ys = tf.tensor2d(Y);
    const epochs = config.epochs;

    try {
      await tfModel.current!.fit(xs, ys, {
        epochs,
        batchSize: config.batchSize,
        shuffle: true,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            setProgress(Math.round(((epoch + 1) / epochs) * 100));
            if (logs) setLossHistory(prev => [...prev, { epoch: epoch + 1, loss: logs.loss }]);
            await tf.nextFrame();
          }
        }
      });

      await saveModel(tfModel.current!);
      setHasModel(true);
      setModelReady(true);
    } catch (e) {
      console.error("Training error:", e);
    } finally {
      xs.dispose();
      ys.dispose();
      setIsTraining(false);
    }

    // Predict with new model
    await handlePredict(true);
  };

  // Vectorized non-blocking prediction with GTO scoring
  const handlePredict = async (autoSave: boolean = false) => {
    if (!tfModel.current || !lastTwelveRef.current || !scalerRef.current) return;
    setIsOptimizing(true);
    
    const scaler = scalerRef.current;
    const means = scaler.means.slice(0, 6);
    const stds = scaler.stds.slice(0, 6);
    const modelWindow = tfModel.current.inputs[0].shape[1] as number;
    
    let inputData = lastTwelveRef.current;
    if (modelWindow !== inputData.length) {
      const { lastTwelve } = createDataset(data, modelWindow);
      inputData = lastTwelve;
    }

    const currentWindow = inputData.length;
    const candidates: { grille: number[]; score: number }[] = [];

    // Parallel mini-batches to prevent thread lock
    const batchSize = 25;
    const totalBatches = 4; // 100 candidates total

    for (let b = 0; b < totalBatches; b++) {
      tf.tidy(() => {
        const noise = tf.randomNormal([batchSize, currentWindow, 25], 0, 0.015 + (b * 0.005));
        const repeatedInput = tf.tile(tf.tensor3d([inputData]), [batchSize, 1, 1]);
        const perturbed = tf.add(repeatedInput, noise);
        const output = tfModel.current!.predict(perturbed) as tf.Tensor;
        const scaledBatch = output.arraySync() as number[][];

        scaledBatch.forEach(predRow => {
          const finalPred = predRow.map((val, i) => Math.round((val * stds[i]) + means[i]));
          for (let i = 0; i < 5; i++) finalPred[i] = Math.max(1, Math.min(49, finalPred[i]));
          finalPred[5] = Math.max(1, Math.min(10, finalPred[5]));

          const mainNums = Array.from(new Set(finalPred.slice(0, 5))).sort((a, b) => a - b);
          while (mainNums.length < 5) {
            const extra = Math.floor(Math.random() * 49) + 1;
            if (!mainNums.includes(extra)) mainNums.push(extra);
          }
          const grille = [...mainNums.sort((a, b) => a - b), finalPred[5]];

          let score = 0;
          const stats = analyzeTypicality(grille);
          if (stats.sumStatus === 'Optimal') score += 45;
          if (stats.balanceStatus === 'Équilibré') score += 35;
          
          if (frequencies) {
            grille.slice(0, 5).forEach(n => {
              if (frequencies.topNums.includes(n)) score += 6;
            });
            if (frequencies.topChances.includes(grille[5])) score += 12;
          }

          candidates.push({ grille, score });
        });
      });

      // Let UI breath
      await tf.nextFrame();
    }

    // Sort by GTO score and pick top N
    const topGrilles = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, numPredictions))
      .map(c => c.grille);

    setPredictions(topGrilles);
    setIsOptimizing(false);

    if (autoSave || topGrilles.length > 0) {
      const newSaved: SavedPrediction = {
        timestamp: new Date().toISOString(),
        grilles: topGrilles
      };
      
      const updatedHistory = [newSaved, ...predictionHistory].slice(0, 50);
      setPredictions(topGrilles);
      setPredictionHistory(updatedHistory);

      try {
        await saveLastPrediction(topGrilles);
        await savePredictions(updatedHistory);
        await fetch(`/api/sync?type=predictions&t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Cache-Control': 'no-cache' },
          body: JSON.stringify({ data: updatedHistory, type: 'predictions' })
        });
        setSyncStatus("Cloud Synced");
      } catch (e) {
        console.warn("Async save warning:", e);
      }
    }
  };

  const handleCopyGrille = (grille: number[], index: number) => {
    const nums = grille.slice(0, 5).join(' - ');
    const text = `Grille Loto IA : ${nums} (Chance : ${grille[5]})`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleSimulate = () => {
    if (!data.length) return;
    const { topNums, topChances } = calculateFrequencies(data);
    const stats = analyzeTypicality(simNumbers);
    
    let score = 0;
    simNumbers.slice(0, 5).forEach(n => { if (topNums.includes(n)) score += 10; });
    if (topChances.includes(simNumbers[5])) score += 15;
    if (stats.sumStatus === 'Optimal') score += 20;
    if (stats.balanceStatus === 'Équilibré') score += 15;

    const sorted = [...simNumbers.slice(0, 5)].sort((a, b) => a - b);
    let gaps = 0;
    for (let i = 1; i < 5; i++) gaps += (sorted[i] - sorted[i - 1]);
    if (gaps > 20 && gaps < 40) score += 20;

    let analysis = "";
    if (score > 60) analysis = "Excellente conformité aux lois probabilistes de la FDJ.";
    else if (score > 40) analysis = "Combinaison standard dans la moyenne statistique.";
    else analysis = "Cette grille s'écarte des patterns historiques usuels.";

    setSimResult({ score, analysis });
  };

  const handleBacktest = async () => {
    if (data.length === 0) return;
    setIsBacktesting(true);
    setBacktestStats(null);
    setProgress(0);
    try {
      const stats = await runBacktest(data, windowLength, 50, (p) => setProgress(p));
      if (stats) setBacktestStats(stats);
    } catch (e) {
      console.error(e);
    }
    setIsBacktesting(false);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(predictionHistory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loto_ia_predictions_${new Date().toISOString().split('T')[0]}.json`;
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
          alert("Importation réussie !");
        }
      } catch (e) {
        alert("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  };

  const latestDraw = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/30 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#030712]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-[0_0_20px_rgba(0,102,204,0.35)] flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#081126] flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">LOTO <span className="text-primary italic">IA</span> VISION</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {backendName}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block">
                Laboratoire Prédictif LSTM • {syncStatus}
              </p>
            </div>
          </div>

          {/* Countdown Pill & Nav Links */}
          <div className="flex items-center gap-3">
            {/* Countdown Badge */}
            <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs shadow-inner">
              <Clock className="w-3.5 h-3.5 text-chance animate-pulse" />
              <span className="text-slate-400 font-medium">Prochain tirage :</span>
              <span className="font-bold text-white tracking-tight">
                {timeLeft.days > 0 ? `${timeLeft.days}j ` : ''}{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
            </div>

            <Link href="/journal" className="btn-ghost !text-xs !py-2">
              <Trophy className="w-4 h-4 text-chance" />
              <span className="hidden md:inline">Journal Gains</span>
            </Link>

            <Link href="/history" className="btn-ghost !text-xs !py-2">
              <Calendar className="w-4 h-4 text-slate-300" />
              <span className="hidden md:inline">Archives</span>
            </Link>

            <button 
              onClick={handleTrain} 
              disabled={data.length === 0 || isTraining} 
              className="btn-primary !text-xs !py-2"
              title="Entraîner le réseau neuronal sur les tirages"
            >
              {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isTraining ? `${progress}%` : hasModel ? "Fine-Tune" : "Entraîner"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Subheader Banner: Next Draw & Quick Actions */}
        <section className="glass-panel p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vision Neuronale Active</span>
              {latestDraw && (
                <span className="text-slate-400 font-normal">
                  • Dernier tirage vérifié : {latestDraw.day} {latestDraw.month_year}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Anticipez les Tirages avec le <span className="text-primary italic">Deep Learning</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Analyse bidirectionnelle des tirages récents, filtrage par théorie des jeux (GTO) et équilibrage parité/somme.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
            <button 
              onClick={() => handlePredict(false)}
              disabled={!modelReady || isTraining || isOptimizing}
              className="btn-primary !py-3.5 !px-6 text-sm w-full sm:w-auto font-black shadow-lg shadow-primary/30"
            >
              {isOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-chance" />}
              <span>{isOptimizing ? "Calculs neuronaux..." : "Générer mes Grilles"}</span>
            </button>
            <button 
              onClick={handleScrape}
              disabled={isScraping}
              className="btn-ghost !py-3.5 !px-4 text-sm w-full sm:w-auto"
              title="Vérifier les derniers tirages sur le site FDJ"
            >
              <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin text-primary' : ''}`} />
              <span>{scrapeStatus || "Vérifier FDJ"}</span>
            </button>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('predictions')}
            className={`pb-4 px-2 sm:px-4 font-bold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'predictions'
                ? 'border-primary text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4 text-primary" />
            <span>Visions Prédictives</span>
            {predictions.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-bold">
                {predictions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-4 px-2 sm:px-4 font-bold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'stats'
                ? 'border-chance text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-chance" />
            <span>Statistiques & Chaleur</span>
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`pb-4 px-2 sm:px-4 font-bold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'lab'
                ? 'border-accent text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-accent" />
            <span>Lab IA & Simulateur</span>
          </button>
        </div>

        {/* Tab 1: PREDICTIONS (Essential 1-Click View) */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre de Grilles :
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setNumPredictions(n);
                        if (predictions.length > 0) handlePredict(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        numPredictions === n
                          ? 'bg-primary text-white shadow-md shadow-primary/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {predictions.length > 0 ? (
                  <span>Grilles optimisées prêtes pour le tirage</span>
                ) : (
                  <span>Cliquez sur "Générer" pour révéler les prédictions</span>
                )}
              </div>
            </div>

            {/* Predictions List */}
            {isInitialLoading || isOptimizing ? (
              <div className="space-y-4">
                {[1, 2].map(k => (
                  <div key={k} className="glass-panel p-8 animate-pulse flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="w-14 h-14 rounded-full bg-slate-800" />
                      ))}
                    </div>
                    <div className="w-48 h-10 rounded-xl bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : predictions.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {predictions.map((pred, pIdx) => {
                    const stats = analyzeTypicality(pred);
                    const isCopied = copiedIndex === pIdx;

                    return (
                      <motion.div
                        key={pIdx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, delay: pIdx * 0.05 }}
                        className={`glass-panel p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden ${
                          pIdx === 0 ? 'border-primary/40 bg-gradient-to-r from-[#081126]/90 to-[#0e1b38]/70 shadow-xl shadow-primary/10' : ''
                        }`}
                      >
                        {pIdx === 0 && (
                          <div className="absolute top-0 right-0 bg-primary/20 text-primary border-b border-l border-primary/30 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider">
                            Recommandation Phare IA
                          </div>
                        )}

                        {/* Rank & 3D Balls */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-500 w-8">#{pIdx + 1}</span>
                            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
                              {pred.slice(0, 5).map((num, i) => (
                                <motion.div
                                  key={i}
                                  whileHover={{ scale: 1.1 }}
                                  className="number-ball"
                                >
                                  {num}
                                </motion.div>
                              ))}
                              
                              <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                              {/* 3D Gold Chance Ball */}
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="number-ball chance"
                                title="Numéro Chance"
                              >
                                {pred[5]}
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {/* Statistical Badges & Copy CTA */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full lg:w-auto">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              stats.sumStatus === 'Optimal' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              Somme {stats.sum} ({stats.sumStatus})
                            </span>

                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              stats.balanceStatus === 'Équilibré' 
                                ? 'bg-primary/20 text-blue-300 border border-primary/30' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {stats.evens}P / {stats.odds}I
                            </span>
                          </div>

                          <button
                            onClick={() => handleCopyGrille(pred, pIdx)}
                            className={`btn-ghost !text-xs !py-2 !px-3 font-bold transition-all ${
                              isCopied ? '!bg-emerald-500/20 !text-emerald-400 !border-emerald-500/30' : ''
                            }`}
                            title="Copier les numéros pour jouer sur le site ou l'app FDJ"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                            <span>{isCopied ? "Copié !" : "Copier"}</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="glass-panel p-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Aucune prédiction active</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Cliquez sur le bouton ci-dessous pour lancer l'inférence neuronale et générer les meilleures combinaisons statistiques.
                </p>
                <button
                  onClick={() => handlePredict(false)}
                  disabled={!modelReady || isTraining || isOptimizing}
                  className="btn-primary !py-3 !px-8 text-sm font-black mx-auto"
                >
                  <Sparkles className="w-4 h-4 text-chance" />
                  <span>Calculer mes Pronostics</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: STATS & HEATMAP */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top 10 Numbers Heatmap */}
            <div className="glass-panel p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-chance" /> Numéros les Plus Fréquents
                  </h3>
                  <p className="text-xs text-slate-400">Basé sur l'ensemble de l'historique officiel</p>
                </div>
                <span className="text-xs font-bold text-slate-500">Top 10</span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {frequencies?.topNums.map((num, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="number-ball !w-11 !h-11 !text-base">
                      {num}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      Rang {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Chance Numbers */}
            <div className="glass-panel p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-chance" /> Numéros Chance Favoris
                  </h3>
                  <p className="text-xs text-slate-400">Les 3 boules Chance les plus représentées</p>
                </div>

                <div className="flex items-center justify-around p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                  {frequencies?.topChances.map((c, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="number-ball chance !w-12 !h-12 !text-lg">
                        {c}
                      </div>
                      <span className="text-[10px] font-black text-chance uppercase">
                        Favori #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest Draw Info */}
              {latestDraw && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-primary uppercase">Dernier Tirage Référencé</span>
                    <span className="text-slate-400">{latestDraw.day} {latestDraw.month_year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[latestDraw.num0, latestDraw.num1, latestDraw.num2, latestDraw.num3, latestDraw.num4].map((n, i) => (
                      <div key={i} className="number-ball-sm">
                        {n}
                      </div>
                    ))}
                    <div className="number-ball-sm chance ml-1">
                      {latestDraw.chance}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: LAB IA & SIMULATEUR */}
        {activeTab === 'lab' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Grid Simulator */}
            <div className="glass-panel p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" /> Simulateur de Grille Personnalisée
                  </h3>
                  <p className="text-xs text-slate-400">Testez la conformité statistique de votre propre combinaison</p>
                </div>
                {simResult && (
                  <span className={`text-base font-black px-2.5 py-1 rounded-xl ${
                    simResult.score >= 60 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-chance/20 text-chance border border-chance/30'
                  }`}>
                    {simResult.score}% GTO
                  </span>
                )}
              </div>

              {/* 6 Inputs */}
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map(idx => (
                  <div key={idx} className="space-y-1 text-center">
                    <input 
                      type="number"
                      min="1"
                      max={idx === 5 ? 10 : 49}
                      value={simNumbers[idx]}
                      onChange={(e) => {
                        const next = [...simNumbers];
                        next[idx] = parseInt(e.target.value) || 1;
                        setSimNumbers(next);
                      }}
                      className={`w-full py-2.5 px-1 bg-slate-900 border rounded-xl text-center text-sm font-black text-white outline-none transition-all ${
                        idx === 5 
                          ? 'border-chance/40 focus:border-chance focus:ring-1 focus:ring-chance' 
                          : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary'
                      }`}
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">
                      {idx === 5 ? 'Chance' : `N°${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleSimulate}
                className="btn-primary w-full !py-3 text-xs font-black uppercase tracking-wider"
              >
                Analyser la Grille
              </button>

              {simResult && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-300 italic">
                  "{simResult.analysis}"
                </div>
              )}
            </div>

            {/* Backtest & Precision Card */}
            <div className="glass-panel p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-chance" /> Backtesting 50 Tirages
                    </h3>
                    <p className="text-xs text-slate-400">Simulation rétroactive sur les derniers tirages réels</p>
                  </div>
                </div>

                {isBacktesting ? (
                  <div className="py-4 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-primary">Calcul rétroactif en cours...</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : backtestStats ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Win Rate</span>
                      <span className="text-xl font-black text-emerald-400">{backtestStats.winRate}%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Bons N° Moy</span>
                      <span className="text-xl font-black text-white">{backtestStats.avgBonsNumeros}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Échantillon</span>
                      <span className="text-xl font-black text-primary">{backtestStats.testSize}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Lancez un test pour évaluer le taux de réussite historique du modèle actuel sur 50 tirages passés.
                  </p>
                )}
              </div>

              <button
                onClick={handleBacktest}
                disabled={isBacktesting || data.length === 0}
                className="btn-ghost w-full !py-2.5 text-xs font-bold"
              >
                {isBacktesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-chance" />}
                <span>{isBacktesting ? "Simulation..." : "Lancer le Test de Précision"}</span>
              </button>
            </div>

            {/* Neural Parameters & Training Mode */}
            <div className="glass-panel p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" /> Configuration du Réseau
                  </h3>
                  <p className="text-xs text-slate-400">Hyperparamètres du modèle LSTM bidirectionnel</p>
                </div>
              </div>

              {/* Window Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Fenêtre Temporelle :</span>
                  <span className="text-primary font-black">{windowLength} tirages analysés</span>
                </div>
                <input 
                  type="range"
                  min="4"
                  max="24"
                  value={windowLength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setWindowLength(val);
                    updateModelReferences(data, val);
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Mode Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Mode d'Entraînement :</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['fast', 'precise'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setTrainingMode(mode)}
                      className={`p-3 rounded-xl text-xs font-black uppercase text-left border transition-all ${
                        trainingMode === mode 
                          ? 'bg-primary/20 text-white border-primary shadow-lg shadow-primary/20' 
                          : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="font-bold">{TRAINING_CONFIG[mode].label}</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">{TRAINING_CONFIG[mode].epochs} époques</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Export / Import */}
              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button onClick={handleExport} className="btn-ghost !text-xs !py-2 flex-1">
                  <Database className="w-3.5 h-3.5" /> Exporter JSON
                </button>
                <label className="btn-ghost !text-xs !py-2 flex-1 cursor-pointer">
                  <History className="w-3.5 h-3.5" /> Importer
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            {/* Neural Loss Chart */}
            <div className="glass-panel p-6 sm:p-8 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" /> Courbe d'Apprentissage (Loss)
                </h3>
                <p className="text-xs text-slate-400">Évolution de l'erreur moyenne absolue au fil des époques</p>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                {lossHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lossHistory}>
                      <Line 
                        type="monotone" 
                        dataKey="loss" 
                        stroke="#0066cc" 
                        strokeWidth={2.5} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#081126', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                        itemStyle={{ color: '#38bdf8' }} 
                        labelClassName="hidden" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">
                    {isTraining ? "Calcul de la courbe..." : "Entraînez le modèle pour afficher la courbe"}
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        <p className="max-w-xl mx-auto px-4">
          Loto IA Vision • Expérimentation probabiliste et Deep Learning. 
          Les jeux d'argent comportent des risques : endettement, dépendance. Appelez le 09 74 75 13 13.
        </p>
        <p className="mt-2 text-[11px] text-slate-600">
          Développé avec passion • Propulsé par Antigravity Intelligence
        </p>
      </footer>
    </div>
  );
}
