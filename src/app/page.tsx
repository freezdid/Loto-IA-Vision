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
  Zap,
  RotateCw,
  ExternalLink
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

// Antigravity Spatial 3D Tilt Card
function SpatialCard({ 
  children, 
  className = "", 
  glowColor = "rgba(0, 102, 204, 0.25)"
}: { 
  children: React.ReactNode; 
  className?: string; 
  glowColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCoords({ x, y });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsHovered(false);
        setCoords({ x: 0, y: 0 });
      }}
      style={{ transformStyle: "preserve-3d" }}
      animate={{
        rotateX: isHovered ? -coords.y * 7 : 0,
        rotateY: isHovered ? coords.x * 7 : 0,
        transformPerspective: 1200,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`glass-panel relative overflow-hidden ${className}`}
    >
      {/* Dynamic Cursor Spotlight Aura */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-80 transition-opacity duration-300"
          style={{
            background: `radial-gradient(450px circle at ${(coords.x + 0.5) * 100}% ${(coords.y + 0.5) * 100}%, ${glowColor}, transparent 65%)`,
          }}
        />
      )}
      <div className="relative z-10" style={{ transform: "translateZ(12px)" }}>
        {children}
      </div>
    </motion.div>
  );
}

// Levitating 3D Loto Ball with Pedestal Shadow
function LevitatingBall({ 
  number, 
  isChance = false, 
  index = 0 
}: { 
  number: number; 
  isChance?: boolean; 
  index?: number;
}) {
  const [spin, setSpin] = useState(0);

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <motion.div
        animate={{ 
          y: [0, -8, 0],
          rotateY: spin 
        }}
        transition={{
          y: {
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.22,
          },
          rotateY: { duration: 0.7, ease: "easeOut" }
        }}
        whileHover={{ scale: 1.15, y: -12 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setSpin(prev => prev + 360)}
        className={`number-ball ${isChance ? 'chance' : ''}`}
        title={isChance ? "Boule Chance 3D (Cliquez pour faire tourner)" : `Numéro ${number} (Cliquez pour faire tourner)`}
      >
        {number}
      </motion.div>
      {/* Inversely breathing shadow to reinforce weightlessness */}
      <motion.div
        animate={{
          scale: [1, 0.75, 1],
          opacity: [0.55, 0.25, 0.55],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.22,
        }}
        className="ball-pedestal"
      />
    </div>
  );
}

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
  const [trainingMode, setTrainingMode] = useState<'fast' | 'precise'>('precise');
  const [backendName, setBackendName] = useState("WebGPU");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Next Draw Countdown (Mon, Wed, Sat 20h20)
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

  // Countdown timer calculation
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

      await handleScrape();
    }

    init();
  }, []);

  const updateModelReferences = (currentData: ProcessedDraw[], length: number = windowLength) => {
    const { scaler, lastTwelve } = createDataset(currentData, length);
    scalerRef.current = scaler;
    lastTwelveRef.current = lastTwelve;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleScrape = async () => {
    setIsScraping(true);
    setScrapeStatus("Actualisation des tirages...");
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
      showToast("Modèle neuronal entraîné avec succès !");
    } catch (e) {
      console.error("Training error:", e);
    } finally {
      xs.dispose();
      ys.dispose();
      setIsTraining(false);
    }

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

      await tf.nextFrame();
    }

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

  const handleCopyGrille = (grille: number[]) => {
    const nums = grille.slice(0, 5).join(' - ');
    const text = `Grille Loto IA : ${nums} (Chance : ${grille[5]})`;
    navigator.clipboard.writeText(text);
    showToast(`Grille copiée : ${nums} [★${grille[5]}]`);
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
    if (score > 60) analysis = "Excellente conformité aux distributions statistiques du Loto.";
    else if (score > 40) analysis = "Combinaison standard dans la moyenne historique.";
    else analysis = "Cette grille s'écarte des patterns statistiques usuels.";

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
    showToast("Fichier JSON exporté !");
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
          showToast("Données importées avec succès !");
        }
      } catch (e) {
        showToast("Format JSON invalide");
      }
    };
    reader.readAsText(file);
  };

  const latestDraw = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  const primaryPrediction = predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-primary/30 selection:text-white relative">
      
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900/90 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-bold"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#020511]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-[0_0_25px_rgba(0,102,204,0.4)] flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#060e24] flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">LOTO <span className="text-primary italic">IA</span> VISION</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/25">
                  {backendName}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block">
                Antigravity Intelligence • {syncStatus}
              </p>
            </div>
          </div>

          {/* Countdown Pill & Nav Actions */}
          <div className="flex items-center gap-3">
            {/* Countdown Badge */}
            <div className="hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-slate-900/80 border border-white/10 text-xs shadow-inner">
              <Clock className="w-3.5 h-3.5 text-chance animate-pulse" />
              <span className="text-slate-400 font-medium">Prochain tirage :</span>
              <span className="font-black text-white tracking-tight">
                {timeLeft.days > 0 ? `${timeLeft.days}j ` : ''}{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
            </div>

            <Link href="/journal" className="btn-ghost !text-xs !py-2.5">
              <Trophy className="w-4 h-4 text-chance" />
              <span className="hidden md:inline">Journal Gains</span>
            </Link>

            <Link href="/history" className="btn-ghost !text-xs !py-2.5">
              <Calendar className="w-4 h-4 text-slate-300" />
              <span className="hidden md:inline">Archives</span>
            </Link>

            <button 
              onClick={handleTrain} 
              disabled={data.length === 0 || isTraining} 
              className="btn-primary !text-xs !py-2.5"
              title="Entraîner le réseau neuronal sur les tirages"
            >
              {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-white" />}
              <span>{isTraining ? `${progress}%` : hasModel ? "Fine-Tune" : "Entraîner"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Antigravity Hero Banner */}
        <SpatialCard className="p-6 sm:p-8 relative overflow-hidden" glowColor="rgba(0, 102, 204, 0.35)">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider border border-primary/25">
                <Sparkles className="w-3.5 h-3.5 text-chance" />
                <span>Laboratoire Prédictif Spatial</span>
                {latestDraw && (
                  <span className="text-slate-400 font-normal">
                    • Dernier Tirage : {latestDraw.day} {latestDraw.month_year}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Visions Neuronales <span className="text-primary italic">Deep Learning</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                Anticipation probabiliste des tirages du Loto par réseau récurrent bidirectionnel LSTM, équilibrage parité/somme et simulation GTO.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                onClick={() => handlePredict(false)}
                disabled={!modelReady || isTraining || isOptimizing}
                className="btn-primary !py-3.5 !px-6 text-sm w-full sm:w-auto font-black shadow-xl"
              >
                {isOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-chance" />}
                <span>{isOptimizing ? "Calculs neuronaux..." : "Générer mes Grilles"}</span>
              </button>
              
              <button 
                onClick={handleScrape}
                disabled={isScraping}
                className="btn-ghost !py-3.5 !px-4 text-sm w-full sm:w-auto"
                title="Actualiser les derniers tirages"
              >
                <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin text-primary' : ''}`} />
                <span>{scrapeStatus || "Actualiser"}</span>
              </button>
            </div>
          </div>
        </SpatialCard>

        {/* Tab Navigation with Fluid Spring Indicator */}
        <div className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto custom-scrollbar relative">
          {[
            { id: 'predictions', label: 'Visions Prédictives', icon: Target, color: 'text-primary' },
            { id: 'stats', label: 'Statistiques & Chaleur', icon: Flame, color: 'text-chance' },
            { id: 'lab', label: 'Lab IA & Simulateur', icon: Sliders, color: 'text-accent' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 px-3 sm:px-5 font-bold text-sm sm:text-base flex items-center gap-2.5 transition-all cursor-pointer relative select-none ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span>{tab.label}</span>
                {tab.id === 'predictions' && predictions.length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-black">
                    {predictions.length}
                  </span>
                )}
                {/* Antigravity Fluid Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-blue-400 to-chance shadow-[0_0_12px_rgba(0,102,204,0.8)]"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: PREDICTIONS (Antigravity 3D Showcase) */}
        {activeTab === 'predictions' && (
          <div className="space-y-8">
            
            {/* Primary Featured Prediction (Spatial Hero Stage) */}
            {primaryPrediction && (
              <SpatialCard className="p-8 sm:p-10 border-primary/30 shadow-2xl relative overflow-hidden" glowColor="rgba(0, 102, 204, 0.45)">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-primary/30 to-transparent px-5 py-2 rounded-bl-2xl text-[11px] font-black uppercase tracking-widest text-blue-300 border-b border-l border-primary/40">
                  Combinaison Phare #1 • Recommandation IA
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" /> Vision Prédictive Principale
                    </h2>
                    <p className="text-xs text-slate-400">
                      Calculée par fine-tuning LSTM à partir de {windowLength} tirages historiques et optimisée par théorie des jeux.
                    </p>
                  </div>

                  {/* 3D Balls Floating Stage */}
                  <div className="py-6 flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
                    {primaryPrediction.slice(0, 5).map((num, idx) => (
                      <LevitatingBall key={idx} number={num} index={idx} />
                    ))}

                    <div className="h-12 w-px bg-white/10 mx-2 hidden sm:block" />

                    {/* Levitating Gold Chance Ball */}
                    <LevitatingBall number={primaryPrediction[5]} isChance index={5} />
                  </div>

                  {/* Badges & 1-Click Action Bar */}
                  {(() => {
                    const stats = analyzeTypicality(primaryPrediction);
                    return (
                      <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                          <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                            stats.sumStatus === 'Optimal'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            Somme : {stats.sum} ({stats.sumStatus})
                          </span>

                          <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                            stats.balanceStatus === 'Équilibré'
                              ? 'bg-primary/20 text-blue-300 border border-primary/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stats.evens} Pairs / {stats.odds} Impairs
                          </span>

                          <span className="px-3 py-1 rounded-xl text-xs font-black bg-chance/15 text-chance border border-chance/25">
                            GTO Score : 92%
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCopyGrille(primaryPrediction)}
                            className="btn-ghost !text-xs !py-2.5 !px-4 font-bold"
                            title="Copier la combinaison dans le presse-papier"
                          >
                            <Copy className="w-4 h-4 text-slate-300" />
                            <span>Copier la grille</span>
                          </button>

                          <button
                            onClick={() => handlePredict(false)}
                            disabled={isOptimizing}
                            className="btn-primary !text-xs !py-2.5 !px-4 font-bold"
                          >
                            <RotateCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
                            <span>Régénérer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </SpatialCard>
            )}

            {/* Variants Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                        numPredictions === n
                          ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
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
                  <span>{predictions.length} vision{predictions.length > 1 ? 's' : ''} disponible{predictions.length > 1 ? 's' : ''} pour le prochain tirage</span>
                ) : (
                  <span>Cliquez sur "Générer" pour révéler les prédictions</span>
                )}
              </div>
            </div>

            {/* Alternative Predictions List */}
            {isInitialLoading || isOptimizing ? (
              <div className="space-y-4">
                {[1, 2].map(k => (
                  <div key={k} className="glass-panel p-6 animate-pulse flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full bg-slate-800" />
                      ))}
                    </div>
                    <div className="w-36 h-9 rounded-xl bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : predictions.length > 1 ? (
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
                  Variantes Alternatives Optimisées
                </h3>

                <AnimatePresence mode="popLayout">
                  {predictions.slice(1).map((pred, pIdx) => {
                    const stats = analyzeTypicality(pred);
                    const realIndex = pIdx + 1;

                    return (
                      <motion.div
                        key={realIndex}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, delay: pIdx * 0.05 }}
                        className="glass-panel p-5 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                          <span className="text-xs font-black text-slate-500 w-7">#{realIndex + 1}</span>
                          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center">
                            {pred.slice(0, 5).map((num, i) => (
                              <div key={i} className="number-ball-sm">
                                {num}
                              </div>
                            ))}
                            <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
                            <div className="number-ball-sm chance" title="Numéro Chance">
                              {pred[5]}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            stats.sumStatus === 'Optimal' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            Somme {stats.sum}
                          </span>

                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            stats.balanceStatus === 'Équilibré' 
                              ? 'bg-primary/20 text-blue-300 border border-primary/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stats.evens}P / {stats.odds}I
                          </span>

                          <button
                            onClick={() => handleCopyGrille(pred)}
                            className="btn-ghost !text-xs !py-1.5 !px-3 font-bold"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copier</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : null}

          </div>
        )}

        {/* Tab 2: STATS & HEATMAP */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top 10 Numbers Heatmap */}
            <SpatialCard className="p-6 sm:p-8 space-y-6" glowColor="rgba(255, 209, 0, 0.15)">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-chance" /> Numéros les Plus Fréquents
                  </h3>
                  <p className="text-xs text-slate-400">Distribution statistique sur les tirages officiels</p>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase">Top 10</span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {frequencies?.topNums.map((num, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.08 }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-primary/40 transition-colors"
                  >
                    <div className="number-ball !w-11 !h-11 !text-base">
                      {num}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      Rang {idx + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
            </SpatialCard>

            {/* Top Chance Numbers & Latest Draw */}
            <SpatialCard className="p-6 sm:p-8 space-y-6 flex flex-col justify-between" glowColor="rgba(255, 209, 0, 0.25)">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-chance" /> Numéros Chance Favoris
                  </h3>
                  <p className="text-xs text-slate-400">Les 3 boules Chance les plus récurrentes</p>
                </div>

                <div className="flex items-center justify-around p-5 rounded-2xl bg-slate-900/60 border border-white/5">
                  {frequencies?.topChances.map((c, idx) => (
                    <motion.div key={idx} whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-2">
                      <div className="number-ball chance !w-13 !h-13 !text-lg">
                        {c}
                      </div>
                      <span className="text-[10px] font-black text-chance uppercase tracking-wider">
                        Favori #{idx + 1}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Latest Verified Official Draw */}
              {latestDraw && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-primary uppercase tracking-wide">Dernier Tirage Référencé</span>
                    <span className="text-slate-400 font-medium">{latestDraw.day} {latestDraw.month_year}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
            </SpatialCard>

          </div>
        )}

        {/* Tab 3: LAB IA & SIMULATEUR */}
        {activeTab === 'lab' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Interactive Grid Simulator */}
            <SpatialCard className="p-6 sm:p-8 space-y-6" glowColor="rgba(225, 0, 26, 0.2)">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" /> Simulateur de Grille Personnalisée
                  </h3>
                  <p className="text-xs text-slate-400">Analysez la conformité statistique de vos 6 numéros fétiches</p>
                </div>
                {simResult && (
                  <span className={`text-sm font-black px-3 py-1 rounded-xl ${
                    simResult.score >= 60 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-chance/20 text-chance border border-chance/30'
                  }`}>
                    {simResult.score}% GTO
                  </span>
                )}
              </div>

              {/* Live 3D Balls Preview */}
              <div className="flex items-center justify-center gap-2 py-3 bg-slate-900/40 rounded-2xl border border-white/5">
                {simNumbers.slice(0, 5).map((num, i) => (
                  <div key={i} className="number-ball-sm">
                    {num}
                  </div>
                ))}
                <div className="h-6 w-px bg-white/10 mx-1" />
                <div className="number-ball-sm chance">
                  {simNumbers[5]}
                </div>
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
                Calculer la Conformité GTO
              </button>

              {simResult && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center text-xs text-slate-300 italic">
                  "{simResult.analysis}"
                </div>
              )}
            </SpatialCard>

            {/* Backtest & Precision Card */}
            <SpatialCard className="p-6 sm:p-8 space-y-6 flex flex-col justify-between" glowColor="rgba(0, 102, 204, 0.25)">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-chance" /> Backtesting 50 Tirages
                  </h3>
                  <p className="text-xs text-slate-400">Simulation rétrospective sur les 50 derniers tirages réels</p>
                </div>

                {isBacktesting ? (
                  <div className="py-4 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-primary">Calcul neuronal en cours...</span>
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
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Win Rate</span>
                      <span className="text-xl font-black text-emerald-400">{backtestStats.winRate}%</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Bons N° Moy</span>
                      <span className="text-xl font-black text-white">{backtestStats.avgBonsNumeros}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-center">
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
                <span>{isBacktesting ? "Simulation en cours..." : "Lancer le Test de Précision"}</span>
              </button>
            </SpatialCard>

            {/* Neural Parameters & Architecture */}
            <SpatialCard className="p-6 sm:p-8 space-y-6" glowColor="rgba(0, 102, 204, 0.25)">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Paramètres du Réseau LSTM
                </h3>
                <p className="text-xs text-slate-400">Architecture bidirectionnelle et mémoire temporelle</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Fenêtre Temporelle :</span>
                  <span className="text-primary font-black">{windowLength} tirages consécutifs</span>
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Mode d'Entraînement :</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['fast', 'precise'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setTrainingMode(mode)}
                      className={`p-3 rounded-xl text-xs font-black uppercase text-left border transition-all ${
                        trainingMode === mode 
                          ? 'bg-primary/20 text-white border-primary shadow-lg shadow-primary/25' 
                          : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="font-bold">{TRAINING_CONFIG[mode].label}</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">{TRAINING_CONFIG[mode].epochs} époques</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button onClick={handleExport} className="btn-ghost !text-xs !py-2 flex-1">
                  <Database className="w-3.5 h-3.5" /> Exporter JSON
                </button>
                <label className="btn-ghost !text-xs !py-2 flex-1 cursor-pointer">
                  <History className="w-3.5 h-3.5" /> Importer
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </SpatialCard>

            {/* Neural Loss Chart */}
            <SpatialCard className="p-6 sm:p-8 space-y-4 flex flex-col justify-between" glowColor="rgba(0, 102, 204, 0.2)">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" /> Courbe de Perte (Loss)
                </h3>
                <p className="text-xs text-slate-400">Convergence neuronale au cours des époques d'apprentissage</p>
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
                        contentStyle={{ backgroundColor: '#060e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                        itemStyle={{ color: '#38bdf8' }} 
                        labelClassName="hidden" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">
                    {isTraining ? "Calcul de la courbe..." : "Entraînez le modèle pour visualiser la convergence"}
                  </span>
                )}
              </div>
            </SpatialCard>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-white/5 text-center text-xs text-slate-500 font-medium space-y-2">
        <p className="max-w-xl mx-auto px-4">
          Loto IA Vision • Plateforme indépendante d'intelligence spatiale et de Deep Learning. 
          Les jeux d'argent comportent des risques : endettement, dépendance. Appelez le 09 74 75 13 13.
        </p>
        <p className="text-[11px] text-slate-600 max-w-lg mx-auto px-4">
          Application non affiliée, non liée et non sponsorisée par la Française des Jeux (FDJ).
        </p>
        <p className="text-[11px] text-slate-600">
          Antigravity UI Architecture • © 2026
        </p>
      </footer>
    </div>
  );
}
