export type Coordinate = {
  lat: number;
  lng: number;
};

export type Location = Coordinate & {
  id: string;
  name: string;
};

export type RoundResult = {
  target: Location;
  guess: Coordinate;
  distanceKm: number;
  score: number;
};
