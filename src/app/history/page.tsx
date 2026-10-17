"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, Search } from "lucide-react";
import { loadDraws, saveDraws } from "@/lib/storage";
import { mergeDraws, sortDrawsByDate } from "@/lib/loto";
import type { LotoDraw } from "@/lib/types";

const PAGE_SIZE = 24;

export default function HistoryPage() {
  const [draws, setDraws] = useState<LotoDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    let disposed = false;

    async function load() {
      const local = (await loadDraws()) ?? [];
      if (!disposed && local.length > 0) setDraws(sortDrawsByDate(local, "desc"));

      try {
        const response = await fetch(`/api/draws?t=${Date.now()}`, { cache: "no-store" });
        const json = (await response.json()) as { success?: boolean; results?: LotoDraw[] };
        if (!disposed && json.success && Array.isArray(json.results)) {
          const merged = sortDrawsByDate(mergeDraws(json.results, local), "desc");
          setDraws(merged);
          void saveDraws(merged);
        }
      } catch {
        // Offline: the local cache above is enough.
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return draws;
    return draws.filter((draw) => {
      if (draw.day.toLowerCase().includes(needle)) return true;
      if (draw.month_year.toLowerCase().includes(needle)) return true;
      return [draw.num0, draw.num1, draw.num2, draw.num3, draw.num4, draw.chance]
        .map(String)
        .includes(needle);
    });
  }, [draws, searchTerm]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="btn-ghost px-3 py-2 text-xs">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Retour au studio
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-ink">
              Archives <span className="text-primary-soft">des tirages</span>
            </span>
            <span className="chip bg-white/5 text-faint">
              {draws.length.toLocaleString("fr-FR")} tirages
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-ink">Historique officiel</h1>
            <p className="mt-1 text-[13px] text-muted">
              Le corpus complet utilisé pour entraîner le réseau, du plus récent au plus ancien.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Rechercher un jour, un mois, un numéro…"
              aria-label="Rechercher dans les tirages"
              className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition-colors hover:bg-white/8 focus:bg-white/8"
            />
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="panel space-y-4 p-5">
                <div className="skeleton h-3.5 w-24" />
                <div className="flex gap-1.5">
                  {Array.from({ length: 6 }).map((__, dot) => (
                    <div key={dot} className="skeleton h-8 w-8 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : shown.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((draw, index) => (
                <li key={`${draw.day}-${draw.month_year}-${index}`} className="panel space-y-3.5 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-soft">{draw.day}</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-muted">{draw.month_year}</p>
                    </div>
                    <CalendarDays className="h-4 w-4 text-faint" aria-hidden />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {[draw.num0, draw.num1, draw.num2, draw.num3, draw.num4].map((value) => (
                        <span key={value} className="number-ball-sm">
                          {value}
                        </span>
                      ))}
                    </div>
                    <span className="number-ball-sm chance">{draw.chance}</span>
                  </div>
                </li>
              ))}
            </ul>

            {visible < filtered.length && (
              <div className="flex justify-center">
                <button type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)} className="btn-ghost">
                  Afficher {Math.min(PAGE_SIZE, filtered.length - visible)} tirages de plus
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="panel p-14 text-center">
            <CalendarDays className="mx-auto h-9 w-9 text-faint" aria-hidden />
            <p className="mt-3 text-sm font-bold text-ink">
              {searchTerm ? <>Aucun tirage ne correspond à « {searchTerm} ».</> : "Aucun tirage en cache."}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {searchTerm
                ? "Essayez un jour (« Lundi »), un mois (« octobre ») ou un numéro."
                : "Revenez au studio pour synchroniser les tirages officiels."}
            </p>
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} className="btn-ghost mx-auto mt-4 text-xs">
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-[11px] text-faint">
        Archives Loto IA Vision · données issues du site historique public des tirages
      </footer>
    </div>
  );
}
