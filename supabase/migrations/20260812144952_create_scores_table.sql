/*
# Create scores table for geo-guessing game leaderboard

## Purpose
Stores game results for a global leaderboard. This is a single-tenant app
with no sign-in screen — players enter a display name at the end of a game
and their score is saved publicly.

## New Tables
- `scores`
  - `id` (uuid, primary key)
  - `player_name` (text, not null) — display name entered by the player
  - `total_score` (integer, not null) — sum of per-round points (0-25000)
  - `rounds` (integer, not null, default 5) — number of rounds played
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `scores`.
- Public read (anyone can see the leaderboard) — `TO anon, authenticated`.
- Public insert (anyone can submit a score) — `TO anon, authenticated`.
- No update or delete policies — scores are immutable once submitted.

## Notes
1. No user_id / auth dependency — the game has no sign-in screen.
2. player_name is sanitized client-side (trimmed, length-capped) before insert.
*/

CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  total_score integer NOT NULL CHECK (total_score >= 0 AND total_score <= 50000),
  rounds integer NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scores" ON scores;
CREATE POLICY "anon_select_scores" ON scores FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scores" ON scores;
CREATE POLICY "anon_insert_scores" ON scores FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scores_total_score ON scores (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores (created_at DESC);
