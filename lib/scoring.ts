export const ROUNDS_PER_GAME = 5;
export const MAX_ROUND_SCORE = 5000;
export const MAX_TOTAL_SCORE = ROUNDS_PER_GAME * MAX_ROUND_SCORE;

const MAX_SCORING_DISTANCE_KM = 20000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function calculateRoundScore(distanceKm: number) {
  const distanceRatio = clamp(distanceKm / MAX_SCORING_DISTANCE_KM, 0, 1);
  const score = Math.round(MAX_ROUND_SCORE * (1 - distanceRatio) ** 2);

  return clamp(score, 0, MAX_ROUND_SCORE);
}
