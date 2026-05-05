"use client";

import { useEffect, useMemo } from "react";
import L, { type LatLngBoundsExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { clampMapLatitude, getClosestWrappedLongitude } from "@/lib/geo";
import type { Coordinate, Location, RoundResult } from "@/lib/types";

type GameMapProps = {
  target: Location;
  guess: Coordinate | null;
  result: RoundResult | null;
  locked: boolean;
  theme: "light" | "dark";
  labels: {
    clickPrompt: string;
    guess: string;
    locked: string;
    target: string;
  };
  onGuessChange: (coordinate: Coordinate) => void;
};

function GuessClickHandler({
  locked,
  onGuessChange,
}: Pick<GameMapProps, "locked" | "onGuessChange">) {
  const map = useMapEvents({
    click(event) {
      if (!locked) {
        onGuessChange({
          lat: clampMapLatitude(event.latlng.lat),
          lng: event.latlng.lng,
        });
      }
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    let touchStart: { x: number; y: number } | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchStart = null;
        return;
      }

      const touch = event.touches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touchStart || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const distance = Math.hypot(
        touch.clientX - touchStart.x,
        touch.clientY - touchStart.y,
      );

      if (distance > 12) {
        touchStart = null;
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (locked || !touchStart || event.changedTouches.length !== 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const distance = Math.hypot(
        touch.clientX - touchStart.x,
        touch.clientY - touchStart.y,
      );

      touchStart = null;

      if (distance > 12) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      const point = L.point(
        touch.clientX - bounds.left,
        touch.clientY - bounds.top,
      );
      const coordinate = map.containerPointToLatLng(point);

      onGuessChange({
        lat: clampMapLatitude(coordinate.lat),
        lng: coordinate.lng,
      });
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [locked, map, onGuessChange]);

  return null;
}

function MapSizeObserver() {
  const map = useMap();

  useEffect(() => {
    const refreshMapSize = () => {
      map.invalidateSize({ animate: false });
    };

    const timeout = window.setTimeout(refreshMapSize, 0);
    const container = map.getContainer();
    const observer = new ResizeObserver(refreshMapSize);

    observer.observe(container);
    window.addEventListener("orientationchange", refreshMapSize);
    window.addEventListener("resize", refreshMapSize);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener("orientationchange", refreshMapSize);
      window.removeEventListener("resize", refreshMapSize);
    };
  }, [map]);

  return null;
}

function MapInteractionLock({ locked }: { locked: boolean }) {
  const map = useMap();

  useEffect(() => {
    const interactions = [
      map.dragging,
      map.touchZoom,
      map.doubleClickZoom,
      map.scrollWheelZoom,
      map.boxZoom,
      map.keyboard,
    ];

    interactions.forEach((interaction) => {
      if (locked) {
        interaction.disable();
      } else {
        interaction.enable();
      }
    });
  }, [locked, map]);

  return null;
}

function FitSubmittedGuess({
  bounds,
}: {
  bounds: LatLngBoundsExpression | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, {
        animate: true,
        maxZoom: 8,
        padding: [72, 72],
      });
    }
  }, [bounds, map]);

  return null;
}

export function GameMap({
  target,
  guess,
  result,
  locked,
  theme,
  labels,
  onGuessChange,
}: GameMapProps) {
  const guessIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<span class="map-pin map-pin-guess"></span>',
        iconAnchor: [18, 38],
        iconSize: [36, 42],
      }),
    [],
  );

  const targetIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<span class="map-pin map-pin-target"></span>',
        iconAnchor: [18, 38],
        iconSize: [36, 42],
      }),
    [],
  );

  const submittedBounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!result) {
      return null;
    }

    const targetLng = getClosestWrappedLongitude(
      result.guess.lng,
      result.target.lng,
    );

    return [
      [result.target.lat, targetLng],
      [result.guess.lat, result.guess.lng],
    ];
  }, [result]);

  const targetPosition = useMemo<[number, number]>(() => {
    if (!result) {
      return [target.lat, target.lng];
    }

    return [
      target.lat,
      getClosestWrappedLongitude(result.guess.lng, target.lng),
    ];
  }, [result, target.lat, target.lng]);

  return (
    <div
      className={`relative h-full min-h-[420px] overflow-hidden ${
        locked ? "map-locked" : "map-guessing"
      }`}
    >
      <MapContainer
        center={[20, 0]}
        className="z-0"
        minZoom={2}
        scrollWheelZoom
        worldCopyJump
        zoom={2}
      >
        {theme === "dark" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <GuessClickHandler locked={locked} onGuessChange={onGuessChange} />
        <MapSizeObserver />
        <MapInteractionLock locked={locked} />
        <FitSubmittedGuess bounds={submittedBounds} />

        {guess ? (
          <Marker
            icon={guessIcon}
            position={[guess.lat, guess.lng]}
            title={labels.guess}
          />
        ) : null}

        {result ? (
          <>
            <Marker
              icon={targetIcon}
              position={targetPosition}
              title={labels.target}
            />
            <Polyline
              pathOptions={{
                color: "#b91c1c",
                dashArray: "8 10",
                opacity: 0.78,
                weight: 3,
              }}
              positions={[targetPosition, [result.guess.lat, result.guess.lng]]}
            />
          </>
        ) : null}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-md border border-white/70 bg-white/92 px-3 py-2 text-sm font-medium text-stone-800 shadow-sm backdrop-blur dark:border-stone-700/80 dark:bg-stone-950/88 dark:text-stone-100">
        {locked ? labels.locked : labels.clickPrompt}
      </div>
    </div>
  );
}
