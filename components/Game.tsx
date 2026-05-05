"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  RotateCcw,
  Target,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MapSkeleton } from "@/components/MapSkeleton";
import { ThemeSwitcher, type Theme } from "@/components/ThemeSwitcher";
import { formatCoordinate, haversineDistanceKm } from "@/lib/geo";
import { createGameSeed, selectRoundLocations } from "@/lib/game";
import {
  getDictionary,
  isLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";
import {
  calculateRoundScore,
  MAX_TOTAL_SCORE,
  ROUNDS_PER_GAME,
} from "@/lib/scoring";
import type { Coordinate, RoundResult } from "@/lib/types";

const DynamicGameMap = dynamic(
  () => import("@/components/GameMap").then((module) => module.GameMap),
  {
    loading: () => <MapSkeleton />,
    ssr: false,
  },
);

type Phase = "guessing" | "revealed" | "finished";
const THEME_STORAGE_KEY = "coordinate-quest-theme";
const THEME_STORAGE_EVENT = "coordinate-quest-theme-change";

const localeTags: Record<Locale, string> = {
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
  cs: "cs-CZ",
};

const formatDistance = (distanceKm: number, locale: Locale) =>
  new Intl.NumberFormat(localeTags[locale], {
    maximumFractionDigits: distanceKm < 10 ? 2 : 0,
  }).format(distanceKm);

const formatScore = (score: number, locale: Locale) =>
  new Intl.NumberFormat(localeTags[locale]).format(score);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getStoredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isTheme(storedTheme) ? storedTheme : "light";
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_STORAGE_EVENT, onStoreChange);
  };
}

function useStoredTheme() {
  return useSyncExternalStore(
    subscribeToThemeChanges,
    getStoredTheme,
    () => "light" as Theme,
  );
}

function saveTheme(theme: Theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-stone-200 px-3 py-2 last:border-r-0 dark:border-stone-800">
      <div className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-stone-950 dark:text-stone-50">
        {value}
      </div>
    </div>
  );
}

function CoordinateReadout({
  dictionary,
  target,
}: {
  dictionary: Dictionary;
  target: { lat: number; lng: number };
}) {
  return (
    <section className="border-y border-stone-200 py-3 dark:border-stone-800 sm:py-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-800 dark:text-teal-300 sm:mb-3">
        <Target className="size-4" aria-hidden="true" />
        {dictionary.coordinates.title}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-900 sm:p-3">
          <div className="text-[10px] font-semibold uppercase text-stone-500 dark:text-stone-400 sm:text-xs">
            {dictionary.coordinates.latitude}
          </div>
          <div className="mt-1 break-words font-mono text-sm font-bold text-stone-950 dark:text-stone-50 min-[360px]:text-base sm:text-xl">
            {formatCoordinate(target.lat, "lat")}
          </div>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-900 sm:p-3">
          <div className="text-[10px] font-semibold uppercase text-stone-500 dark:text-stone-400 sm:text-xs">
            {dictionary.coordinates.longitude}
          </div>
          <div className="mt-1 break-words font-mono text-sm font-bold text-stone-950 dark:text-stone-50 min-[360px]:text-base sm:text-xl">
            {formatCoordinate(target.lng, "lng")}
          </div>
        </div>
      </div>
    </section>
  );
}

function RoundActions({
  dictionary,
  guess,
  phase,
  roundIndex,
  onNextRound,
  onSubmit,
}: {
  dictionary: Dictionary;
  guess: Coordinate | null;
  phase: Phase;
  roundIndex: number;
  onNextRound: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="border-b border-stone-200 py-4 dark:border-stone-800 sm:py-5">
      <div className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
        {guess
          ? dictionary.controls.guessSelected
          : dictionary.controls.pickFirst}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
          disabled={!guess || phase !== "guessing"}
          type="button"
          onClick={onSubmit}
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {dictionary.controls.submit}
        </button>
        {phase === "revealed" ? (
          <button
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-600/25 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
            type="button"
            onClick={onNextRound}
          >
            {roundIndex === ROUNDS_PER_GAME - 1
              ? dictionary.controls.finish
              : dictionary.controls.next}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function RoundResultPanel({
  dictionary,
  locale,
  result,
}: {
  dictionary: Dictionary;
  locale: Locale;
  result: RoundResult;
}) {
  return (
    <section
      aria-live="polite"
      className="pulse-in border-b border-stone-200 py-5 dark:border-stone-800"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
        <MapPin className="size-4" aria-hidden="true" />
        {dictionary.result.title}
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <Metric
          label={dictionary.result.distance}
          value={`${formatDistance(result.distanceKm, locale)} ${dictionary.units.kilometers}`}
        />
        <Metric
          label={dictionary.result.score}
          value={`${formatScore(result.score, locale)} ${dictionary.units.points}`}
        />
      </div>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
        {dictionary.result.correctLocation}:{" "}
        <span className="font-semibold text-stone-900 dark:text-stone-50">
          {result.target.name}
        </span>
      </p>
    </section>
  );
}

function FinalScore({
  dictionary,
  locale,
  totalScore,
  onRestart,
}: {
  dictionary: Dictionary;
  locale: Locale;
  totalScore: number;
  onRestart: () => void;
}) {
  return (
    <section className="pulse-in border-y border-stone-200 py-6 dark:border-stone-800">
      <div className="text-sm font-bold uppercase text-teal-800 dark:text-teal-300">
        {dictionary.final.title}
      </div>
      <div className="mt-2 text-4xl font-black text-stone-950 dark:text-stone-50">
        {formatScore(totalScore, locale)}
      </div>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        {dictionary.final.outOf} {formatScore(MAX_TOTAL_SCORE, locale)}{" "}
        {dictionary.units.points}
      </p>
      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
        type="button"
        onClick={onRestart}
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {dictionary.controls.restart}
      </button>
    </section>
  );
}

function RoundHistory({
  dictionary,
  locale,
  results,
}: {
  dictionary: Dictionary;
  locale: Locale;
  results: RoundResult[];
}) {
  return (
    <section className="py-5">
      <div className="mb-3 text-sm font-bold text-stone-800 dark:text-stone-100">
        {dictionary.history.title}
      </div>
      <ol className="space-y-2">
        {Array.from({ length: ROUNDS_PER_GAME }, (_, index) => {
          const result = results[index];

          return (
            <li
              className="flex min-h-10 items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-950"
              key={index}
            >
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {dictionary.stats.round} {index + 1}
              </span>
              <span
                className={
                  result
                    ? "text-stone-950 dark:text-stone-50"
                    : "text-stone-400 dark:text-stone-500"
                }
              >
                {result
                  ? `${formatScore(result.score, locale)} ${dictionary.units.points}`
                  : dictionary.history.pending}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SettingsToolbar({
  dictionary,
  locale,
  theme,
  variant,
  onLocaleChange,
  onThemeChange,
}: {
  dictionary: Dictionary;
  locale: Locale;
  theme: Theme;
  variant: "mobile" | "desktop";
  onLocaleChange: (locale: Locale) => void;
  onThemeChange: (theme: Theme) => void;
}) {
  const isMobile = variant === "mobile";

  return (
    <div
      className={
        isMobile
          ? "flex flex-col gap-2 border-b border-stone-800 bg-stone-900/70 p-3"
          : "absolute right-4 top-4 z-[600] hidden w-44 flex-col items-stretch gap-2 rounded-lg border border-white/70 bg-white/92 p-2 opacity-25 shadow-lg backdrop-blur transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100 dark:border-stone-700/80 dark:bg-stone-950/88 lg:flex"
      }
    >
      <ThemeSwitcher
        className="w-full justify-center"
        darkLabel={dictionary.theme.dark}
        label={dictionary.theme.label}
        lightLabel={dictionary.theme.light}
        theme={theme}
        onThemeChange={onThemeChange}
      />
      <LanguageSwitcher
        className="w-full"
        label={dictionary.language.label}
        locale={locale}
        onLocaleChange={onLocaleChange}
      />
    </div>
  );
}

type GameProps = {
  initialSeed: string;
};

export function Game({ initialSeed }: GameProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const theme = useStoredTheme();
  const [rounds, setRounds] = useState(() =>
    selectRoundLocations(ROUNDS_PER_GAME, initialSeed),
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState<Coordinate | null>(null);
  const [phase, setPhase] = useState<Phase>("guessing");
  const [results, setResults] = useState<RoundResult[]>([]);

  const dictionary = getDictionary(locale);
  const currentTarget = rounds[roundIndex];
  const currentResult = phase !== "guessing" ? results[roundIndex] : undefined;
  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.score, 0),
    [results],
  );
  const mapLabels = {
    guess: dictionary.map.guessMarker,
    target: dictionary.map.targetMarker,
  };

  const handleThemeChange = (nextTheme: Theme) => {
    saveTheme(nextTheme);
  };

  const handleLocaleChange = (nextLocale: Locale) => {
    if (isLocale(nextLocale)) {
      setLocale(nextLocale);
    }
  };

  const handleSubmit = () => {
    if (!guess || phase !== "guessing") {
      return;
    }

    const distanceKm = haversineDistanceKm(guess, currentTarget);
    const score = calculateRoundScore(distanceKm);
    const result: RoundResult = {
      distanceKm,
      guess,
      score,
      target: currentTarget,
    };

    setResults((existingResults) => [...existingResults, result]);
    setPhase("revealed");
  };

  const handleNextRound = () => {
    if (roundIndex === ROUNDS_PER_GAME - 1) {
      setPhase("finished");
      return;
    }

    setRoundIndex((index) => index + 1);
    setGuess(null);
    setPhase("guessing");
  };

  const handleRestart = () => {
    setRounds(selectRoundLocations(ROUNDS_PER_GAME, createGameSeed()));
    setRoundIndex(0);
    setGuess(null);
    setPhase("guessing");
    setResults([]);
  };

  return (
    <main className="min-h-dvh bg-stone-950 text-stone-50 transition-colors lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh w-full flex-col lg:grid lg:h-dvh lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="dark border-b border-stone-800 bg-stone-950 shadow-sm lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="border-b border-stone-800 p-5">
            <div>
              <h1 className="text-2xl font-black text-stone-50">
                {dictionary.app.title}
              </h1>
              <p className="mt-1 hidden max-w-[34rem] text-sm leading-6 text-stone-300 min-[380px]:block lg:block">
                {dictionary.app.subtitle}
              </p>
            </div>
          </div>

          <div className="lg:hidden">
            <SettingsToolbar
              dictionary={dictionary}
              locale={locale}
              theme={theme}
              variant="mobile"
              onLocaleChange={handleLocaleChange}
              onThemeChange={handleThemeChange}
            />
          </div>

          <div className="grid grid-cols-2 overflow-hidden border-b border-stone-800">
            <Metric
              label={dictionary.stats.round}
              value={`${Math.min(roundIndex + 1, ROUNDS_PER_GAME)} ${dictionary.stats.of} ${ROUNDS_PER_GAME}`}
            />
            <Metric
              label={dictionary.stats.totalScore}
              value={`${formatScore(totalScore, locale)} / ${formatScore(MAX_TOTAL_SCORE, locale)}`}
            />
          </div>

          <div className="hidden px-5 lg:block">
            {phase === "finished" ? (
              <FinalScore
                dictionary={dictionary}
                locale={locale}
                totalScore={totalScore}
                onRestart={handleRestart}
              />
            ) : (
              <>
                <CoordinateReadout
                  dictionary={dictionary}
                  target={currentTarget}
                />

                <RoundActions
                  dictionary={dictionary}
                  guess={guess}
                  phase={phase}
                  roundIndex={roundIndex}
                  onNextRound={handleNextRound}
                  onSubmit={handleSubmit}
                />

                {currentResult ? (
                  <RoundResultPanel
                    dictionary={dictionary}
                    locale={locale}
                    result={currentResult}
                  />
                ) : null}
              </>
            )}

            <div className="hidden lg:block">
              <RoundHistory
                dictionary={dictionary}
                locale={locale}
                results={results}
              />
            </div>
          </div>
        </aside>

        {phase !== "finished" ? (
          <section className="dark bg-stone-950 px-4 lg:hidden">
            <CoordinateReadout dictionary={dictionary} target={currentTarget} />
          </section>
        ) : null}

        <section
          className={`${theme === "dark" ? "dark bg-stone-950" : "bg-white"} relative h-[46dvh] min-h-[280px] flex-none overflow-hidden lg:h-dvh lg:min-h-0`}
        >
          <SettingsToolbar
            dictionary={dictionary}
            locale={locale}
            theme={theme}
            variant="desktop"
            onLocaleChange={handleLocaleChange}
            onThemeChange={handleThemeChange}
          />
          <DynamicGameMap
            guess={guess}
            labels={mapLabels}
            locked={phase !== "guessing"}
            result={currentResult ?? null}
            target={currentTarget}
            theme={theme}
            onGuessChange={setGuess}
          />
        </section>

        <section className="dark bg-stone-950 px-4 lg:hidden">
          {phase === "finished" ? (
            <FinalScore
              dictionary={dictionary}
              locale={locale}
              totalScore={totalScore}
              onRestart={handleRestart}
            />
          ) : (
            <>
              <RoundActions
                dictionary={dictionary}
                guess={guess}
                phase={phase}
                roundIndex={roundIndex}
                onNextRound={handleNextRound}
                onSubmit={handleSubmit}
              />

              {currentResult ? (
                <RoundResultPanel
                  dictionary={dictionary}
                  locale={locale}
                  result={currentResult}
                />
              ) : null}
            </>
          )}

          <RoundHistory
            dictionary={dictionary}
            locale={locale}
            results={results}
          />
        </section>
      </div>
    </main>
  );
}
