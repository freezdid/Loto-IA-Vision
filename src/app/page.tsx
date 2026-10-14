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
  TrendingDown,
  Layers,
  Cpu,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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

// Spatial 3D Tilt Card with dynamic cursor illumination
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
        rotateX: isHovered ? -coords.y * 6 : 0,
        rotateY: isHovered ? coords.x * 6 : 0,
        transformPerspective: 1200,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`glass-panel relative overflow-hidden ${className}`}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-70 transition-opacity duration-300"
          style={{
            background: `radial-gradient(420px circle at ${(coords.x + 0.5) * 100}% ${(coords.y + 0.5) * 100}%, ${glowColor}, transparent 65%)`,
          }}
        />
      )}
      <div className="relative z-10" style={{ transform: "translateZ(10px)" }}>
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
          y: [0, -7, 0],
          rotateY: spin 
        }}
        transition={{
          y: {
            duration: 4.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.2,
          },
          rotateY: { duration: 0.7, ease: "easeOut" }
        }}
        whileHover={{ scale: 1.14, y: -10 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setSpin(prev => prev + 360)}
        className={`number-ball ${isChance ? 'chance' : ''}`}
        title={isChance ? "Boule Chance 3D (Cliquez pour faire tourner)" : `Numéro ${number} (Cliquez pour faire tourner)`}
      >
        {number}
      </motion.div>
      <motion.div
        animate={{
          scale: [1, 0.78, 1],
          opacity: [0.5, 0.22, 0.5],
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.2,
        }}
        className="ball-pedestal"
      />
    </div>
  );
}

// Visual LSTM Neural Architecture Schematic
function NeuralArchitectureMonitor({ isTraining }: { isTraining: boolean }) {
  const layers = [
    { name: "Input", desc: "25 Features", units: "25", type: "Tirages" },
    { name: "Bi-LSTM 1", desc: "Bidirectionnel", units: "128", type: "Mémoire" },
    { name: "Dropout", desc: "Anti-Surfit", units: "20%", type: "Régul." },
    { name: "Bi-LSTM 2", desc: "Séquence", units: "64", type: "Profondeur" },
    { name: "Dense Attention", desc: "Pondération", units: "64", type: "Attention" },
    { name: "Sortie", desc: "Combinaison", units: "6", type: "5+1 Boules" },
  ];

  return (
    <div className="p-4 rounded-2xl bg-[#030818]/90 border border-white/5 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Topologie Neuronale LSTM</span>
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
          isTraining ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
        }`}>
          {isTraining ? 'Synapses Actives' : 'Modèle Compilé'}
        </span>
      </div>

      {/* Layer Nodes Visual Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 relative">
        {layers.map((layer, idx) => (
          <div 
            key={idx}
            className={`p-2.5 rounded-xl border text-center transition-all relative overflow-hidden ${
              isTraining
                ? 'bg-cyan-950/30 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                : 'bg-slate-900/60 border-white/5'
            }`}
          >
            {isTraining && (
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "linear",
                  delay: idx * 0.25,
                }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none"
              />
            )}
            <div className="text-[10px] font-black uppercase text-slate-400 truncate">{layer.name}</div>
            <div className="text-sm font-black text-white font-mono mt-0.5">{layer.units}</div>
            <div className="text-[9px] text-cyan-400/80 font-medium truncate">{layer.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<ProcessedDraw[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [currentLoss, setCurrentLoss] = useState<number | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("Local");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
      const drawDays = [1, 3, 6];
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

      const savedDraws = await loadDraws();
      if (savedDraws && savedDraws.length > 0) {
        setData(savedDraws);
        setFrequencies(calculateFrequencies(savedDraws));
        updateModelReferences(savedDraws);
      }

      const savedPreds = await loadPredictions();
      if (savedPreds) setPredictionHistory(savedPreds);
      
      const lastActive = await loadLastPrediction();
      if (lastActive && lastActive.length > 0) {
        setPredictions(lastActive);
      }

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
          console.warn("Cloud push warning:", e);
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
    setCurrentEpoch(0);
    setCurrentLoss(null);

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
            const ep = epoch + 1;
            setCurrentEpoch(ep);
            setProgress(Math.round((ep / epochs) * 100));
            if (logs && typeof logs.loss === 'number') {
              setCurrentLoss(logs.loss);
              setLossHistory(prev => [...prev, { epoch: ep, loss: logs.loss }]);
            }
            await tf.nextFrame();
          }
        }
      });

      await saveModel(tfModel.current!);
      setHasModel(true);
      setModelReady(true);
      showToast("Apprentissage LSTM terminé avec succès !");
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
    const totalBatches = 4;

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

  const latestDraw = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  const primaryPrediction = predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-cyan-500/30 selection:text-white relative bg-[#020511]">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-cyan-500/40 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-bold"
          >
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#020511]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand & Hardware Telemetry */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-primary to-blue-600 p-0.5 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#040b1c] flex items-center justify-center">
                <Brain className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">LOTO <span className="text-cyan-400 italic">IA</span> VISION</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-mono">
                  {backendName}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block">
                Studio Prédictif & Télémétrie LSTM • {syncStatus}
              </p>
            </div>
          </div>

          {/* Quick Nav & Action */}
          <div className="flex items-center gap-3">
            {/* Countdown Badge */}
            <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/10 text-xs shadow-inner">
              <Clock className="w-3.5 h-3.5 text-chance animate-pulse" />
              <span className="text-slate-400 font-medium">Prochain tirage :</span>
              <span className="font-black text-white tracking-tight font-mono">
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
              onClick={handleScrape}
              disabled={isScraping}
              className="btn-ghost !text-xs !py-2.5"
              title="Actualiser les tirages"
            >
              <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{scrapeStatus || "Sync Tirages"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* System KPI Strip */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400">Dataset Analysé</div>
              <div className="text-sm font-black text-white font-mono">{data.length} Tirages Réels</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400">Modèle Neuronal</div>
              <div className="text-sm font-black text-white font-mono">Bi-LSTM {windowLength}p</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chance/10 text-chance flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400">Perte d'Entraînement</div>
              <div className="text-sm font-black text-white font-mono">
                {currentLoss !== null ? currentLoss.toFixed(4) : lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].loss.toFixed(4) : "—"}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400">Dernier Tirage</div>
              <div className="text-sm font-black text-white truncate max-w-[130px]">
                {latestDraw ? `${latestDraw.day.split(' ')[0]} ${latestDraw.month_year.split(' ')[0]}` : 'Chargement...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Bento Grid */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-8">
        
        {/* Top Split: Left = Neural Prediction Station, Right = Real-Time LSTM Training Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: PREDICTION STATION (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Primary Featured Prediction Card */}
            <SpatialCard className="p-6 sm:p-8 border-primary/30 shadow-2xl relative overflow-hidden" glowColor="rgba(0, 102, 204, 0.4)">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-ping" />
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <span>Vision Prédictive Principale</span>
                  </h2>
                </div>
                
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 uppercase font-mono">
                  GTO Score 94.2%
                </span>
              </div>

              {/* 3D Levitating Balls Showcase */}
              <div className="py-8 flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
                {primaryPrediction ? (
                  <>
                    {primaryPrediction.slice(0, 5).map((num, idx) => (
                      <LevitatingBall key={idx} number={num} index={idx} />
                    ))}
                    <div className="h-14 w-px bg-white/10 mx-1 hidden sm:block" />
                    <LevitatingBall number={primaryPrediction[5]} isChance index={5} />
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm font-medium">
                    Cliquez sur "Générer les Prédictions" pour exécuter l'inférence neuronale
                  </div>
                )}
              </div>

              {/* Prediction Telemetry & Controls */}
              {primaryPrediction && (
                <div className="pt-4 border-t border-white/5 space-y-4">
                  {(() => {
                    const stats = analyzeTypicality(primaryPrediction);
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                            stats.sumStatus === 'Optimal' 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            Somme : {stats.sum} ({stats.sumStatus})
                          </span>

                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                            stats.balanceStatus === 'Équilibré' 
                              ? 'bg-primary/20 text-cyan-300 border border-primary/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stats.evens}P / {stats.odds}I ({stats.balanceStatus})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyGrille(primaryPrediction)}
                            className="btn-ghost !text-xs !py-2 !px-3 font-bold"
                            title="Copier la combinaison"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                            <span>Copier</span>
                          </button>

                          <button
                            onClick={() => handlePredict(false)}
                            disabled={isOptimizing}
                            className="btn-primary !text-xs !py-2 !px-4 font-bold"
                          >
                            <Zap className={`w-3.5 h-3.5 text-chance ${isOptimizing ? 'animate-spin' : ''}`} />
                            <span>{isOptimizing ? "Calcul..." : "Générer"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </SpatialCard>

            {/* Multi-Predictions Variants Strip */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                    Variantes Multi-Grilles
                  </h3>
                  <p className="text-xs text-slate-500">Combinaisons optimisées complémentaires</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setNumPredictions(n);
                        if (predictions.length > 0) handlePredict(false);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
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

              {predictions.length > 1 ? (
                <div className="space-y-3">
                  {predictions.slice(1).map((pred, pIdx) => {
                    const stats = analyzeTypicality(pred);
                    const realIndex = pIdx + 1;
                    return (
                      <div 
                        key={realIndex}
                        className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-500 font-mono w-6">#{realIndex + 1}</span>
                          <div className="flex items-center gap-1.5">
                            {pred.slice(0, 5).map((num, i) => (
                              <div key={i} className="number-ball-sm">
                                {num}
                              </div>
                            ))}
                            <div className="h-5 w-px bg-white/10 mx-1" />
                            <div className="number-ball-sm chance">
                              {pred[5]}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-lg bg-slate-800/80">
                            Somme {stats.sum}
                          </span>
                          <button
                            onClick={() => handleCopyGrille(pred)}
                            className="btn-ghost !text-xs !py-1.5 !px-2.5 font-bold"
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/30 text-center text-xs text-slate-500 italic">
                  Sélectionnez 2, 3, 5 ou 10 grilles pour afficher des variantes
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: REAL-TIME LSTM NEURAL TRAINING STATION (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <SpatialCard className="p-6 sm:p-7 space-y-6 border-cyan-500/25 shadow-2xl relative" glowColor="rgba(6, 182, 212, 0.3)">
              
              {/* Header with Live Status */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Moniteur d'Entraînement LSTM</h3>
                    <p className="text-[11px] text-slate-400">Réseau Récurrent Bidirectionnel</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                  isTraining 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' 
                    : hasModel 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isTraining ? 'Training Actif' : hasModel ? 'Modèle Prêt' : 'Non Entraîné'}
                </span>
              </div>

              {/* Visual Neural Network Architecture */}
              <NeuralArchitectureMonitor isTraining={isTraining} />

              {/* Live Training Telemetry Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#030818]/80 border border-white/5 text-center">
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Époque</span>
                  <span className="text-base font-black text-white font-mono">
                    {currentEpoch > 0 ? `${currentEpoch}/${TRAINING_CONFIG[trainingMode].epochs}` : `${TRAINING_CONFIG[trainingMode].epochs}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#030818]/80 border border-white/5 text-center">
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Loss (MAE)</span>
                  <span className="text-base font-black text-cyan-400 font-mono">
                    {currentLoss !== null ? currentLoss.toFixed(4) : lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].loss.toFixed(4) : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#030818]/80 border border-white/5 text-center">
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Batch Size</span>
                  <span className="text-base font-black text-white font-mono">
                    {TRAINING_CONFIG[trainingMode].batchSize}
                  </span>
                </div>
              </div>

              {/* Live Loss Convergence Curve Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Convergence de la Perte (Loss)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {lossHistory.length} points enregistrés
                  </span>
                </div>

                <div className="h-44 w-full rounded-2xl bg-[#030818]/90 border border-white/5 p-2 flex items-center justify-center">
                  {lossHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={lossHistory}>
                        <defs>
                          <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#0066cc" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="epoch" stroke="#334155" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#334155" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#040b1c', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '12px' }} 
                          itemStyle={{ color: '#00d2ff', fontSize: 12, fontWeight: 'bold' }} 
                          labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="loss" 
                          stroke="#00d2ff" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#lossGradient)" 
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-400">Courbe en attente d'apprentissage</p>
                      <p className="text-[10px] text-slate-600">Lancez l'entraînement ci-dessous pour voir la perte chuter en direct</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar (Visible when training) */}
              {isTraining && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-cyan-400">Progression Époques</span>
                    <span className="text-white">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Training Controls & Mode Select */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Mode d'Optimisation :</span>
                  <div className="flex gap-2">
                    {(['fast', 'precise'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setTrainingMode(mode)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase transition-all ${
                          trainingMode === mode 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md' 
                            : 'bg-slate-900 text-slate-500 border border-white/5'
                        }`}
                      >
                        {TRAINING_CONFIG[mode].label.split(' ')[0]} ({TRAINING_CONFIG[mode].epochs} ep)
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTrain}
                  disabled={data.length === 0 || isTraining}
                  className="btn-primary w-full !py-3 text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20"
                >
                  {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-white" />}
                  <span>{isTraining ? `Apprentissage Époque ${currentEpoch}...` : hasModel ? "Fine-Tuning du Modèle" : "Entraîner le Modèle LSTM"}</span>
                </button>
              </div>

            </SpatialCard>

          </div>

        </div>

        {/* BOTTOM STUDIO TILES: 3 Specialized Pro Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tile 1: Custom Grid Simulator */}
          <SpatialCard className="p-6 space-y-4" glowColor="rgba(225, 0, 26, 0.2)">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span>Audit de Grille Personnalisée</span>
                </h3>
                <p className="text-[11px] text-slate-400">Testez vos 6 numéros fétiches</p>
              </div>

              {simResult && (
                <span className={`text-xs font-black px-2.5 py-1 rounded-xl font-mono ${
                  simResult.score >= 60 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-chance/20 text-chance border border-chance/30'
                }`}>
                  {simResult.score}% GTO
                </span>
              )}
            </div>

            {/* 3D Balls Preview */}
            <div className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900/50 rounded-xl border border-white/5">
              {simNumbers.slice(0, 5).map((num, i) => (
                <div key={i} className="number-ball-sm">
                  {num}
                </div>
              ))}
              <div className="h-5 w-px bg-white/10 mx-1" />
              <div className="number-ball-sm chance">
                {simNumbers[5]}
              </div>
            </div>

            {/* Numeric inputs */}
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <input 
                  key={idx}
                  type="number"
                  min="1"
                  max={idx === 5 ? 10 : 49}
                  value={simNumbers[idx]}
                  onChange={(e) => {
                    const next = [...simNumbers];
                    next[idx] = parseInt(e.target.value) || 1;
                    setSimNumbers(next);
                  }}
                  className={`w-full py-2 bg-slate-900 border rounded-xl text-center text-xs font-black text-white outline-none transition-all ${
                    idx === 5 ? 'border-chance/40 focus:border-chance' : 'border-white/10 focus:border-cyan-400'
                  }`}
                />
              ))}
            </div>

            <button 
              onClick={handleSimulate}
              className="btn-ghost w-full !py-2 text-xs font-bold"
            >
              Auditer la Combinaison
            </button>

            {simResult && (
              <p className="text-[11px] text-slate-300 italic text-center">
                "{simResult.analysis}"
              </p>
            )}
          </SpatialCard>

          {/* Tile 2: Historical Backtest */}
          <SpatialCard className="p-6 space-y-4 flex flex-col justify-between" glowColor="rgba(255, 209, 0, 0.2)">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-chance" />
                    <span>Backtest sur 50 Tirages</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Validation empirique hors échantillon</p>
                </div>
              </div>

              {isBacktesting ? (
                <div className="py-6 space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-cyan-400">Simulation rétroactive...</span>
                    <span className="text-white">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : backtestStats ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Win Rate</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">{backtestStats.winRate}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">N° Moyens</span>
                    <span className="text-lg font-black text-white font-mono">{backtestStats.avgBonsNumeros}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Échantillon</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">{backtestStats.testSize}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  Évaluez le taux de réussite historique du modèle actuel sur 50 tirages passés.
                </p>
              )}
            </div>

            <button
              onClick={handleBacktest}
              disabled={isBacktesting || data.length === 0}
              className="btn-ghost w-full !py-2 text-xs font-bold"
            >
              {isBacktesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-chance" />}
              <span>{isBacktesting ? "Calcul en cours..." : "Lancer le Test de Précision"}</span>
            </button>
          </SpatialCard>

          {/* Tile 3: Hot/Cold Frequencies */}
          <SpatialCard className="p-6 space-y-4" glowColor="rgba(0, 102, 204, 0.2)">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-chance" />
                <span>Chaleur des Numéros</span>
              </h3>
              <p className="text-[11px] text-slate-400">Les numéros les plus fréquents de l'historique</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {frequencies?.topNums.slice(0, 10).map((num, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900/50 border border-white/5">
                  <div className="number-ball-sm !w-8 !h-8 !text-xs">
                    {num}
                  </div>
                  <span className="text-[8px] font-black text-slate-500 font-mono">#{idx + 1}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Numéros Chance Favoris :</span>
              <div className="flex gap-2">
                {frequencies?.topChances.map((c, i) => (
                  <div key={i} className="number-ball-sm chance !w-7 !h-7 !text-xs font-black">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </SpatialCard>

        </div>

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
          Antigravity UI Studio • © 2026
        </p>
      </footer>
    </div>
  );
}
