import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoLocation } from "@/data/locations";

type ResultMapProps = {
  actual: GeoLocation;
  guess: { lat: number; lng: number };
  roundKey: string;
};

export default function ResultMap({ actual, guess, roundKey }: ResultMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [(actual.lat + guess.lat) / 2, (actual.lng + guess.lng) / 2],
      zoom: 2,
      worldCopyJump: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const actualIcon = L.divIcon({
      className: "actual-marker",
      html: '<div class="w-6 h-6 rounded-full bg-emerald-400 border-2 border-white shadow-lg shadow-emerald-400/50"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const guessIcon = L.divIcon({
      className: "guess-marker",
      html: '<div class="w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-lg shadow-amber-400/50"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([actual.lat, actual.lng], { icon: actualIcon })
      .addTo(map)
      .bindTooltip(`${actual.name}, ${actual.country}`, { permanent: true, direction: "top", className: "result-tooltip" });

    L.marker([guess.lat, guess.lng], { icon: guessIcon })
      .addTo(map)
      .bindTooltip("Your guess", { permanent: true, direction: "top", className: "result-tooltip" });

    L.polyline(
      [
        [actual.lat, actual.lng],
        [guess.lat, guess.lng],
      ],
      {
        color: "#fbbf24",
        weight: 2,
        dashArray: "8 8",
        opacity: 0.8,
      },
    ).addTo(map);

    const bounds = L.latLngBounds([
      [actual.lat, actual.lng],
      [guess.lat, guess.lng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [roundKey]);

  return <div ref={containerRef} className="h-full w-full" />;
}
