import { type Biome, classifyBiome, biomeNames } from "./biomes";

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

export type BiomeScoreResult = {
  score: number;
  guessBiome: Biome;
  actualBiome: Biome;
  biomeMatch: boolean;
  distanceKm: number;
};

export function scoreFromBiome(
  guessLat: number,
  guessLng: number,
  actualLat: number,
  actualLng: number,
): BiomeScoreResult {
  const distanceKm = haversineDistance(guessLat, guessLng, actualLat, actualLng);
  const guessBiome = classifyBiome(guessLat, guessLng);
  const actualBiome = classifyBiome(actualLat, actualLng);
  const biomeMatch = guessBiome === actualBiome;

  const maxScore = 5000;

  let biomeBonus: number;
  if (biomeMatch) {
    biomeBonus = 3000;
  } else {
    biomeBonus = 0;
  }

  const distanceScore = maxScore * Math.exp(-distanceKm / 2000);

  const score = Math.round(Math.min(maxScore, biomeBonus + distanceScore * 0.4));

  return {
    score,
    guessBiome,
    actualBiome,
    biomeMatch,
    distanceKm,
  };
}

export function formatBiomeName(biome: Biome): string {
  return biomeNames[biome];
}
