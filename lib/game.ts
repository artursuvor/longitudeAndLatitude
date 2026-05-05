import { LOCATIONS } from "@/lib/locations";
import { ROUNDS_PER_GAME } from "@/lib/scoring";
import type { Location } from "@/lib/types";

const EXISTING_ROUNDS_PER_GAME = 2;
const RANDOM_ROUNDS_PER_GAME = 3;
const RANDOM_LATITUDE_LIMIT = 85;

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed) || 1;

  return () => {
    state += 0x6d2b79f5;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGameSeed() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function shuffleLocations<T>(items: T[], random: () => number) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(5));
}

function createRandomLocation(index: number, random: () => number): Location {
  const lat = roundCoordinate(
    random() * RANDOM_LATITUDE_LIMIT * 2 - RANDOM_LATITUDE_LIMIT,
  );
  const lng = roundCoordinate(random() * 360 - 180);

  return {
    id: `random-${index + 1}-${lat}-${lng}`,
    lat,
    lng,
    name: `Random coordinate ${index + 1}`,
  };
}

export function selectRoundLocations(
  count = ROUNDS_PER_GAME,
  seed?: string,
): Location[] {
  const random = seed ? seededRandom(seed) : Math.random;
  const randomRounds = Math.min(
    RANDOM_ROUNDS_PER_GAME,
    Math.max(0, count - EXISTING_ROUNDS_PER_GAME),
  );
  const existingRounds = Math.min(count - randomRounds, LOCATIONS.length);
  const existingLocations = shuffleLocations(LOCATIONS, random).slice(
    0,
    existingRounds,
  );
  const randomLocations = Array.from({ length: randomRounds }, (_, index) =>
    createRandomLocation(index, random),
  );

  return shuffleLocations([...existingLocations, ...randomLocations], random);
}
