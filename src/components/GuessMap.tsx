import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type GuessMapProps = {
  onGuess: (lat: number, lng: number) => void;
  disabled: boolean;
  resetKey: number;
};

export default function GuessMap({ onGuess, disabled, resetKey }: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const icon = L.divIcon({
          className: "guess-marker",
          html: '<div class="w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-lg shadow-amber-400/50"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        markerRef.current = L.marker(e.latlng, { icon }).addTo(map);
      }
      onGuess(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.setView([20, 0], 2);
    }
  }, [resetKey]);

  return <div ref={containerRef} className="h-full w-full" />;
}
