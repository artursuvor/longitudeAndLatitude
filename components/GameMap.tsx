"use client";

import { useEffect, useMemo } from "react";
import L, { type LatLngBoundsExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
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
    guess: string;
    target: string;
  };
  onGuessChange: (coordinate: Coordinate) => void;
};

function GuessInputHandler({
  locked,
  onGuessChange,
}: Pick<GameMapProps, "locked" | "onGuessChange">) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const listenerOptions = { capture: true, passive: true };
    let pointerStart: {
      moved: boolean;
      pointerId: number;
      x: number;
      y: number;
    } | null = null;

    const isMapControl = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          ".leaflet-control, .leaflet-marker-icon, .leaflet-marker-shadow",
        ),
      );

    const handlePointerDown = (event: PointerEvent) => {
      if (
        locked ||
        !event.isPrimary ||
        (event.pointerType === "mouse" && event.button !== 0) ||
        isMapControl(event.target)
      ) {
        pointerStart = null;
        return;
      }

      pointerStart = {
        moved: false,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      );

      if (distance > 12) {
        pointerStart.moved = true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (
        locked ||
        !pointerStart ||
        pointerStart.pointerId !== event.pointerId ||
        isMapControl(event.target)
      ) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      );
      const wasTap = !pointerStart.moved && distance <= 12;

      pointerStart = null;

      if (!wasTap) {
        return;
      }

      const point = map.mouseEventToContainerPoint(event);
      const coordinate = map.containerPointToLatLng(point);

      onGuessChange({
        lat: clampMapLatitude(coordinate.lat),
        lng: coordinate.lng,
      });
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (pointerStart?.pointerId === event.pointerId) {
        pointerStart = null;
      }
    };

    container.addEventListener(
      "pointerdown",
      handlePointerDown,
      listenerOptions,
    );
    container.addEventListener(
      "pointermove",
      handlePointerMove,
      listenerOptions,
    );
    container.addEventListener("pointerup", handlePointerUp, listenerOptions);
    container.addEventListener(
      "pointercancel",
      handlePointerCancel,
      listenerOptions,
    );

    return () => {
      container.removeEventListener(
        "pointerdown",
        handlePointerDown,
        listenerOptions,
      );
      container.removeEventListener(
        "pointermove",
        handlePointerMove,
        listenerOptions,
      );
      container.removeEventListener(
        "pointerup",
        handlePointerUp,
        listenerOptions,
      );
      container.removeEventListener(
        "pointercancel",
        handlePointerCancel,
        listenerOptions,
      );
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
      className={`relative h-full min-h-[280px] overflow-hidden lg:min-h-[420px] ${
        locked ? "map-review" : "map-guessing"
      }`}
    >
      <MapContainer
        center={[20, 0]}
        className="z-0"
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1}
        minZoom={2}
        scrollWheelZoom
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
        <GuessInputHandler locked={locked} onGuessChange={onGuessChange} />
        <MapSizeObserver />
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
    </div>
  );
}
