export type Biome = "tropical" | "arid" | "temperate" | "boreal" | "polar";

export const biomeNames: Record<Biome, string> = {
  tropical: "Tropical",
  arid: "Arid",
  temperate: "Temperate",
  boreal: "Boreal",
  polar: "Polar",
};

export const biomeColors: Record<Biome, string> = {
  tropical: "#0d6a4f",
  arid: "#e0b070",
  temperate: "#3d7a4a",
  boreal: "#2d6a5a",
  polar: "#b0c8d8",
};

export function classifyBiome(lat: number, _lng: number): Biome {
  const absLat = Math.abs(lat);
  if (absLat < 23.5) return "tropical";
  if (absLat < 35) return "arid";
  if (absLat < 50) return "temperate";
  if (absLat < 66.5) return "boreal";
  return "polar";
}
