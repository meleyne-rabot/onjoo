import { QwirkleScoreScreen } from "./qwirkle/ScoreScreen";
import * as qwirkleCalc from "./qwirkle/calc";

export const GAME_REGISTRY = {
  qwirkle: {
    name: "Qwirkle",
    ScoreScreen: QwirkleScoreScreen,
    calc: qwirkleCalc,
  },
} as const;

export type GameCode = keyof typeof GAME_REGISTRY;

export function isSupportedGame(code: string): code is GameCode {
  return code in GAME_REGISTRY;
}
