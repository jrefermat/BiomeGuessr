import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe2, MapPin, Navigation, Trophy, Loader2, RotateCcw, ArrowRight, Lightbulb, LightbulbOff } from "lucide-react";
import GuessMap from "@/components/GuessMap";
import ResultMap from "@/components/ResultMap";
import Leaderboard from "@/components/Leaderboard";
import { pickRandomLocations, type GeoLocation } from "@/data/locations";
import { haversineDistance, scoreFromBiome, formatDistance, formatBiomeName, type BiomeScoreResult } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";

type Phase = "intro" | "guessing" | "result" | "final";

const ROUNDS = 5;

export default function App() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<GeoLocation[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [highlightedScoreId, setHighlightedScoreId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(true);

  const currentRound = rounds[roundIndex];
  const totalScore = useMemo(
    () => roundScores.reduce((a, b) => a + b, 0),
    [roundScores],
  );
  const lastDistance = useMemo(() => {
    if (!guess || !currentRound) return 0;
    return haversineDistance(guess.lat, guess.lng, currentRound.lat, currentRound.lng);
  }, [guess, currentRound]);
  const lastRoundScore = roundScores[roundScores.length - 1] ?? 0;
  const [lastBiomeResult, setLastBiomeResult] = useState<BiomeScoreResult | null>(null);

  const startGame = () => {
    const picked = pickRandomLocations(ROUNDS);
    setRounds(picked);
    setRoundIndex(0);
    setRoundScores([]);
    setGuess(null);
    setScoreSaved(false);
    setHighlightedScoreId(null);
    setPlayerName("");
    setResetKey((k) => k + 1);
    setPhase("guessing");
  };

  const handleGuess = (lat: number, lng: number) => {
    setGuess({ lat, lng });
  };

  const submitGuess = () => {
    if (!guess || !currentRound) return;
    const result = scoreFromBiome(guess.lat, guess.lng, currentRound.lat, currentRound.lng);
    setLastBiomeResult(result);
    setRoundScores((prev) => [...prev, result.score]);
    setPhase("result");
  };

  const nextRound = () => {
    setGuess(null);
    setResetKey((k) => k + 1);
    if (roundIndex + 1 >= ROUNDS) {
      setPhase("final");
    } else {
      setRoundIndex((i) => i + 1);
      setPhase("guessing");
    }
  };

  const saveScore = async () => {
    if (scoreSaved) return;
    const name = playerName.trim().slice(0, 20) || "Anonymous Explorer";
    setSubmittingScore(true);
    const { data, error } = await supabase
      .from("scores")
      .insert({ player_name: name, total_score: totalScore, rounds: ROUNDS })
      .select("id")
      .maybeSingle();
    setSubmittingScore(false);
    if (!error && data) {
      setScoreSaved(true);
      setHighlightedScoreId(data.id);
      setLeaderboardRefresh((k) => k + 1);
    }
  };

  const isPerfect = lastDistance <= 25;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[1000] bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-lg tracking-tight">BiomeGuessr</span>
          </div>
          {phase !== "intro" && phase !== "final" && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setHintsEnabled((v) => !v)}
                className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg border transition-colors"
                title={hintsEnabled ? "Hints are on — click to turn off" : "Hints are off — click to turn on"}
                style={{ borderColor: hintsEnabled ? "rgba(52,211,153,0.3)" : "rgba(51,65,85,0.5)", color: hintsEnabled ? "#34d399" : "#94a3b8" }}
              >
                {hintsEnabled ? <Lightbulb className="w-4 h-4" /> : <LightbulbOff className="w-4 h-4" />}
                <span className="hidden sm:inline">Hints</span>
              </button>
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Round</span>
                <span className="font-bold text-white">{roundIndex + 1}</span>
                <span className="text-slate-500">/ {ROUNDS}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white tabular-nums">{totalScore.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="pt-14">
        {phase === "intro" && <IntroScreen onStart={startGame} hintsEnabled={hintsEnabled} setHintsEnabled={setHintsEnabled} />}

        {phase === "guessing" && currentRound && (
          <GameScreen
            image={currentRound.image}
            photographer={currentRound.photographer}
            hint={currentRound.hint}
            hintsEnabled={hintsEnabled}
            hasGuess={!!guess}
            onSubmit={submitGuess}
            resetKey={resetKey}
            onGuess={handleGuess}
          />
        )}

        {phase === "result" && currentRound && guess && (
          <ResultScreen
            actual={currentRound}
            guess={guess}
            distance={lastDistance}
            score={lastRoundScore}
            isPerfect={isPerfect}
            biomeResult={lastBiomeResult}
            roundIndex={roundIndex}
            totalScore={totalScore}
            onNext={nextRound}
            isLastRound={roundIndex + 1 >= ROUNDS}
          />
        )}

        {phase === "final" && (
          <FinalScreen
            totalScore={totalScore}
            maxScore={ROUNDS * 5000}
            roundScores={roundScores}
            rounds={rounds}
            playerName={playerName}
            setPlayerName={setPlayerName}
            saveScore={saveScore}
            submittingScore={submittingScore}
            scoreSaved={scoreSaved}
            onPlayAgain={startGame}
            leaderboardRefresh={leaderboardRefresh}
            highlightedScoreId={highlightedScoreId}
          />
        )}
      </main>
    </div>
  );
}

/* ── Intro ─────────────────────────────────────────────── */

const introImages = [
  "https://images.pexels.com/photos/2854417/pexels-photo-2854417.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/8429772/pexels-photo-8429772.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/14036107/pexels-photo-14036107.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/16156054/pexels-photo-16156054.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/33243110/pexels-photo-33243110.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/37943870/pexels-photo-37943870.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/5648791/pexels-photo-5648791.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/16726602/pexels-photo-16726602.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/12033770/pexels-photo-12033770.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/1819660/pexels-photo-1819660.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/11685290/pexels-photo-11685290.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/15487406/pexels-photo-15487406.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/5885354/pexels-photo-5885354.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/2513627/pexels-photo-2513627.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/31882650/pexels-photo-31882650.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/4579058/pexels-photo-4579058.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/15063706/pexels-photo-15063706.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/37245227/pexels-photo-37245227.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/12115606/pexels-photo-12115606.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/13662283/pexels-photo-13662283.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
  "https://images.pexels.com/photos/30348238/pexels-photo-30348238.jpeg?auto=compress&cs=tinysrgb&h=1080&w=1920",
];

function getDailyIntroImage(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return introImages[dayOfYear % introImages.length];
}

function IntroScreen({ onStart, hintsEnabled, setHintsEnabled }: { onStart: () => void; hintsEnabled: boolean; setHintsEnabled: (v: boolean) => void }) {
  const heroImage = useMemo(getDailyIntroImage, []);
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/90" />

      <div className="relative z-10 text-center px-6 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
          <Navigation className="w-4 h-4" />
          Explore. Guess. Compete.
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            BiomeGuessr
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
          You'll see a bird's-eye view of somewhere on Earth.
          Click on the world map to guess where it is.
          Score points by matching the correct biome — with a bonus for proximity.
        </p>
        <button
          onClick={() => setHintsEnabled(!hintsEnabled)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors mb-6"
          style={{ borderColor: hintsEnabled ? "rgba(52,211,153,0.3)" : "rgba(51,65,85,0.5)", color: hintsEnabled ? "#34d399" : "#94a3b8" }}
        >
          {hintsEnabled ? <Lightbulb className="w-4 h-4" /> : <LightbulbOff className="w-4 h-4" />}
          <span className="text-sm font-medium">Hints: {hintsEnabled ? "On" : "Off"}</span>
        </button>

        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-100"
        >
          Start Game
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="mt-6 text-sm text-slate-400">
          {`5 rounds · up to 25,000 points · biome-based scoring · real aerial photography`}
        </p>
      </div>
    </div>
  );
}

/* ── Game (guessing) ───────────────────────────────────── */

function GameScreen({
  image,
  photographer,
  hint,
  hintsEnabled,
  hasGuess,
  onSubmit,
  resetKey,
  onGuess,
}: {
  image: string;
  photographer: string;
  hint: string;
  hintsEnabled: boolean;
  hasGuess: boolean;
  onSubmit: () => void;
  resetKey: number;
  onGuess: (lat: number, lng: number) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* Photo */}
      <div className="flex-1 relative overflow-hidden bg-slate-900 min-h-[40vh] lg:min-h-0">
        <img
          src={image}
          alt="Guess this location"
          className="w-full h-full object-cover"
          draggable={false}
        />
        {hintsEnabled && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-700/50">
            <span className="text-xs text-slate-300">
              Hint: <span className="text-emerald-400 font-medium">{hint}</span>
            </span>
          </div>
        )}
        <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-slate-950/50 text-xs text-slate-400">
          Photo by {photographer} on Pexels
        </div>
      </div>

      {/* Map */}
      <div className="lg:w-[45%] xl:w-[40%] h-[50vh] lg:h-full relative bg-slate-800 flex flex-col">
        <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between">
          <span className="text-sm text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            Click the map to guess
          </span>
          {hasGuess && (
            <span className="text-xs text-emerald-400 font-medium">Pin placed</span>
          )}
        </div>
        <div className="flex-1 relative">
          <GuessMap onGuess={onGuess} disabled={false} resetKey={resetKey} />
        </div>
        <div className="p-3 bg-slate-800/80 border-t border-slate-700/50">
          <button
            onClick={onSubmit}
            disabled={!hasGuess}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {hasGuess ? (
              <>
                Submit Guess
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              "Place a pin on the map first"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Result ────────────────────────────────────────────── */

function ResultScreen({
  actual,
  guess,
  distance,
  score,
  isPerfect,
  biomeResult,
  roundIndex,
  totalScore,
  onNext,
  isLastRound,
}: {
  actual: GeoLocation;
  guess: { lat: number; lng: number };
  distance: number;
  score: number;
  isPerfect: boolean;
  biomeResult: BiomeScoreResult | null;
  roundIndex: number;
  totalScore: number;
  onNext: () => void;
  isLastRound: boolean;
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex-1 relative">
        <ResultMap actual={actual} guess={guess} roundKey={`${roundIndex}-${actual.id}`} />
      </div>

      {/* Result panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[500] bg-slate-950/90 backdrop-blur-md border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="text-center sm:text-left">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Actual location</p>
            <p className="text-lg font-bold text-white">
              {actual.name}, {actual.country}
            </p>
            {biomeResult && (
              <p className="text-xs text-emerald-400 mt-0.5">{formatBiomeName(biomeResult.actualBiome)}</p>
            )}
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-700" />

          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Your biome</p>
            <p className={`text-sm font-bold ${biomeResult?.biomeMatch ? "text-emerald-400" : "text-orange-400"}`}>
              {biomeResult ? formatBiomeName(biomeResult.guessBiome) : ""}
            </p>
            {biomeResult && (
              <p className="text-xs text-slate-500 mt-0.5">
                {biomeResult.biomeMatch ? "Biome matched!" : "Wrong biome"}
              </p>
            )}
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-700" />

          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Distance</p>
            <p className="text-lg font-bold text-amber-400 tabular-nums">
              {formatDistance(distance)}
            </p>
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-700" />

          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Points</p>
            <p
              className={`text-2xl font-extrabold tabular-nums ${
                isPerfect ? "text-emerald-400" : score > 3000 ? "text-emerald-400" : score > 1500 ? "text-amber-400" : "text-orange-400"
              }`}
            >
              {score.toLocaleString()}
              {isPerfect && <span className="ml-1 text-sm">PERFECT</span>}
            </p>
          </div>

          <button
            onClick={onNext}
            className="ml-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all hover:scale-105 active:scale-100"
          >
            {isLastRound ? "See Results" : "Next Round"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Final ─────────────────────────────────────────────── */

function FinalScreen({
  totalScore,
  maxScore,
  roundScores,
  rounds,
  playerName,
  setPlayerName,
  saveScore,
  submittingScore,
  scoreSaved,
  onPlayAgain,
  leaderboardRefresh,
  highlightedScoreId,
}: {
  totalScore: number;
  maxScore: number;
  roundScores: number[];
  rounds: GeoLocation[];
  playerName: string;
  setPlayerName: (v: string) => void;
  saveScore: () => void;
  submittingScore: boolean;
  scoreSaved: boolean;
  onPlayAgain: () => void;
  leaderboardRefresh: number;
  highlightedScoreId: string | null;
}) {
  const percentage = Math.round((totalScore / maxScore) * 100);
  const rating =
    percentage >= 80 ? "World Explorer" : percentage >= 60 ? "Seasoned Traveler" : percentage >= 40 ? "Weekend Wanderer" : "Armchair Tourist";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Score hero */}
        <div className="text-center mb-8">
          <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Final Score</p>
          <p className="text-6xl sm:text-7xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-2">
            {totalScore.toLocaleString()}
          </p>
          <p className="text-slate-300 text-lg">
            out of {maxScore.toLocaleString()} · <span className="text-amber-400 font-semibold">{percentage}%</span>
          </p>
          <p className="mt-2 text-emerald-400 font-medium">{rating}</p>
        </div>

        {/* Round breakdown */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {roundScores.map((pts, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center"
            >
              <p className="text-xs text-slate-400 mb-1">R{i + 1}</p>
              <p className="text-sm font-bold text-amber-400 tabular-nums">{pts.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{rounds[i]?.country}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Save score / play again */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Save your score</h2>
            {scoreSaved ? (
              <div className="space-y-4">
                <p className="text-emerald-400 text-sm flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Score saved to the leaderboard!
                </p>
                <button
                  onClick={onPlayAgain}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  onClick={saveScore}
                  disabled={submittingScore}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 text-slate-950 font-bold transition-all flex items-center justify-center gap-2"
                >
                  {submittingScore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-5 h-5" />
                      Submit Score
                    </>
                  )}
                </button>
                <button
                  onClick={onPlayAgain}
                  className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Skip & Play Again
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <Leaderboard refreshKey={leaderboardRefresh} highlightId={highlightedScoreId} />
        </div>
      </div>
    </div>
  );
}
