"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, Hourglass, Inbox, Trophy } from "lucide-react";
import { loadDraws, loadPredictions, savePredictions } from "@/lib/storage";
import { withDates } from "@/lib/loto";
import { formatDrawDate } from "@/lib/dates";
import type { LotoDraw, SavedPrediction } from "@/lib/types";

interface DrawMatch {
  numbers: number;
  chance: boolean;
  matched: number[];
  drawDate: number;
  drawNumbers: number[];
  drawChance: number;
}

function matchGrid(grid: number[], draw: { numbers: number[]; chance: number; date: number }): DrawMatch {
  const picked = grid.slice(0, 5);
  const matched = picked.filter((value) => draw.numbers.includes(value));
  return {
    numbers: matched.length,
    chance: grid[5] === draw.chance,
    matched,
    drawDate: draw.date,
    drawNumbers: draw.numbers,
    drawChance: draw.chance,
  };
}

export default function JournalPage() {
  const [draws, setDraws] = useState<LotoDraw[]>([]);
  const [predictions, setPredictions] = useState<SavedPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function load() {
      const [localDraws, localPredictions] = await Promise.all([loadDraws(), loadPredictions()]);
      if (disposed) return;
      if (localDraws) setDraws(localDraws);

      let merged = sortPredictions(localPredictions ?? []);
      if (localPredictions) setPredictions(merged);
      setLoading(false);

      try {
        const [drawsResponse, predictionsResponse] = await Promise.all([
          fetch(`/api/sync?type=draws&t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/sync?type=predictions&t=${Date.now()}`, { cache: "no-store" }),
        ]);
        if (disposed) return;

        const drawsJson = (await drawsResponse.json()) as { success?: boolean; data?: LotoDraw[] };
        if (drawsJson.success && Array.isArray(drawsJson.data) && drawsJson.data.length > 0) {
          setDraws(drawsJson.data);
        }

        const predictionsJson = (await predictionsResponse.json()) as { success?: boolean; data?: SavedPrediction[] };
        if (predictionsJson.success && Array.isArray(predictionsJson.data)) {
          const known = new Set(merged.map((entry) => entry.timestamp));
          merged = sortPredictions([
            ...predictionsJson.data.filter((entry) => entry && !known.has(entry.timestamp)),
            ...merged,
          ]);
          setPredictions(merged);
          void savePredictions(merged);
        }
      } catch {
        // Offline: local data already rendered.
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, []);

  const datedDraws = useMemo(() => withDates(draws), [draws]);

  const results = useMemo(
    () =>
      predictions.map((prediction) => {
        const predictionTime = new Date(prediction.timestamp).getTime();
        const nextDraw = datedDraws.find((draw) => draw.fullDate > predictionTime);
        if (!nextDraw) {
          return { prediction, outcome: null as null | { best: DrawMatch; grids: DrawMatch[] } };
        }
        const drawContext = {
          numbers: [nextDraw.num0, nextDraw.num1, nextDraw.num2, nextDraw.num3, nextDraw.num4],
          chance: nextDraw.chance,
          date: nextDraw.fullDate,
        };
        const grids = prediction.grilles.map((grid) => matchGrid(grid, drawContext));
        const best = grids.reduce((previous, current) => (current.numbers > previous.numbers ? current : previous), grids[0]);
        return { prediction, outcome: { best, grids } };
      }),
    [datedDraws, predictions],
  );

  const won = results.filter((entry) => entry.outcome && (entry.outcome.best.numbers >= 2 || entry.outcome.best.chance)).length;
  const settled = results.filter((entry) => entry.outcome !== null).length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1100px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="btn-ghost px-3 py-2 text-xs">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Retour au studio
          </Link>
          <span className="flex items-center gap-2 text-base font-black tracking-tight text-ink">
            <Trophy className="h-4 w-4 text-chance" aria-hidden />
            Journal <span className="text-primary-soft">des pronostics</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-ink">Suivi des performances réelles</h1>
            <p className="mt-1 text-[13px] text-muted">
              Chaque grille générée est comparée au tirage réel qui a suivi.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="chip bg-white/5 text-muted">{predictions.length} pronostics</span>
            <span className={`chip ${won > 0 ? 'bg-success/15 text-success' : 'bg-white/5 text-muted'}`}>{won} réussites</span>
            <span className="chip bg-white/5 text-faint">{settled} évalués</span>
          </div>
        </section>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="panel flex items-center justify-between gap-4 p-5">
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-3.5 w-40" />
                  <div className="flex gap-2">
                    {Array.from({ length: 6 }).map((__, dot) => (
                      <div key={dot} className="skeleton h-8 w-8 rounded-full" />
                    ))}
                  </div>
                </div>
                <div className="skeleton h-12 w-28" />
              </div>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <div className="panel p-14 text-center">
            <Inbox className="mx-auto h-9 w-9 text-faint" aria-hidden />
            <p className="mt-3 text-sm font-bold text-ink">Aucun pronostic enregistré</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">
              Générez une grille sur le studio : le journal se remplit automatiquement et suit les tirages suivants.
            </p>
            <Link href="/" className="btn-primary mx-auto mt-4 inline-flex">
              Ouvrir le studio
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {results.map(({ prediction, outcome }, index) => {
              const isWinner = outcome !== null && (outcome.best.numbers >= 2 || outcome.best.chance);
              return (
                <motion.li
                  key={`${prediction.timestamp}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut", delay: Math.min(index * 0.04, 0.3) }}
                  className="panel p-5"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-[12px] font-semibold text-faint">
                        <CalendarDays className="h-3.5 w-3.5 text-primary-soft" aria-hidden />
                        {new Date(prediction.timestamp).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        <span aria-hidden>·</span>
                        <span className="tabular">
                          {new Date(prediction.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {prediction.grilles[0].slice(0, 5).map((value) => (
                          <span key={value} className="number-ball-sm">
                            {value}
                          </span>
                        ))}
                        <span aria-hidden className="mx-0.5 h-5 w-px bg-line" />
                        <span className="number-ball-sm chance">{prediction.grilles[0][5]}</span>
                        {prediction.grilles.length > 1 && (
                          <span className="ml-1 text-[11px] text-faint">
                            + {prediction.grilles.length - 1} autre{prediction.grilles.length > 2 ? "s" : ""} grille
                            {prediction.grilles.length > 2 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {outcome ? (
                      <div className="rounded-xl bg-white/[0.03] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                          Tirage du {formatDrawDate(outcome.best.drawDate, { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <div className="mt-2 flex items-center gap-5">
                          <div className="text-center">
                            <span className="block text-2xl font-black tabular text-ink">{outcome.best.numbers}</span>
                            <span className="text-[10px] font-bold uppercase text-faint">Numéros</span>
                          </div>
                          <div className="text-center">
                            <span className={`block text-2xl font-black tabular ${outcome.best.chance ? "text-chance" : "text-faint"}`}>
                              {outcome.best.chance ? "1" : "0"}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-faint">Chance</span>
                          </div>
                          <span className={`chip ${isWinner ? "bg-chance/20 text-chance" : "bg-white/5 text-faint"}`}>
                            {isWinner ? "Réussi" : "Non gagnant"}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-faint">
                          Tirage réel :{" "}
                          <span className="font-bold text-muted">
                            {outcome.best.drawNumbers.join(" · ")} + {outcome.best.drawChance}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                        <Hourglass className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden />
                        <div>
                          <p className="text-[12px] font-bold text-ink">En attente du prochain tirage</p>
                          <p className="text-[11px] text-faint">L’évaluation arrive dès que le tirage est publié</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-[11px] text-faint">
        Journal synchronisé localement et via Vercel Blob
      </footer>
    </div>
  );
}

function sortPredictions(entries: SavedPrediction[]): SavedPrediction[] {
  return [...entries]
    .filter((entry) => entry && Array.isArray(entry.grilles))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);
}
