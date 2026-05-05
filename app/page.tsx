import { Game } from "@/components/Game";
import { createGameSeed } from "@/lib/game";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Game initialSeed={createGameSeed()} />;
}
