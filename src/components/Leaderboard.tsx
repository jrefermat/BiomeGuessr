import { useEffect, useState } from "react";
import { Trophy, Loader2, Calendar } from "lucide-react";
import { supabase, type Score } from "@/lib/supabase";

type LeaderboardProps = {
  refreshKey: number;
  highlightId?: string | null;
};

function startOfTodayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export default function Leaderboard({ refreshKey, highlightId }: LeaderboardProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("scores")
        .select("id, player_name, total_score, rounds, created_at")
        .gte("created_at", startOfTodayUTC())
        .order("total_score", { ascending: false })
        .limit(10);
      if (cancelled) return;
      if (!error && data) setScores(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];

  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          Today only
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : scores.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">
          No scores yet. Be the first to play!
        </p>
      ) : (
        <ol className="space-y-1">
          {scores.map((score, i) => (
            <li
              key={score.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                highlightId === score.id
                  ? "bg-amber-400/15 ring-1 ring-amber-400/40"
                  : i < 3
                    ? "bg-slate-700/30"
                    : ""
              }`}
            >
              <span
                className={`w-6 text-center font-bold text-sm ${
                  i < 3 ? medalColors[i] : "text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm text-slate-200 font-medium">
                {score.player_name}
              </span>
              <span className="text-sm font-bold text-amber-400 tabular-nums">
                {score.total_score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
