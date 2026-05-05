import type { Coordinate } from "@/lib/types";

const EARTH_RADIUS_KM = 6371.0088;
export const MAP_LATITUDE_LIMIT = 85;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function clampMapLatitude(lat: number) {
  return clamp(lat, -MAP_LATITUDE_LIMIT, MAP_LATITUDE_LIMIT);
}

export function normalizeLongitude(lng: number) {
  const normalized = ((((lng + 180) % 360) + 360) % 360) - 180;

  return normalized === -180 ? 180 : normalized;
}

export function getClosestWrappedLongitude(referenceLng: number, lng: number) {
  return lng + 360 * Math.round((referenceLng - lng) / 360);
}

export function haversineDistanceKm(from: Coordinate, to: Coordinate) {
  const deltaLat = toRadians(
    clampMapLatitude(to.lat) - clampMapLatitude(from.lat),
  );
  const deltaLng = toRadians(normalizeLongitude(to.lng - from.lng));
  const startLat = toRadians(clampMapLatitude(from.lat));
  const endLat = toRadians(clampMapLatitude(to.lat));

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatCoordinate(value: number, axis: "lat" | "lng") {
  const direction =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

  return `${Math.abs(value).toFixed(5)}° ${direction}`;
}
