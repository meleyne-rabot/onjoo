import { QwirkleScoreScreen } from "./qwirkle/ScoreScreen";
import * as qwirkleCalc from "./qwirkle/calc";
import { SkyjoScoreScreen } from "./skyjo/ScoreScreen";
import * as skyjoCalc from "./skyjo/calc";
import { Flip7ScoreScreen } from "./flip7/ScoreScreen";
import * as flip7Calc from "./flip7/calc";

export const GAME_REGISTRY = {
  qwirkle: {
    name: "Qwirkle",
    ScoreScreen: QwirkleScoreScreen,
    calc: qwirkleCalc,
  },
  skyjo: {
    name: "Skyjo",
    ScoreScreen: SkyjoScoreScreen,
    calc: skyjoCalc,
  },
  flip7: {
    name: "Flip 7",
    ScoreScreen: Flip7ScoreScreen,
    calc: flip7Calc,
  },
} as const;

export type GameCode = keyof typeof GAME_REGISTRY;

export function isSupportedGame(code: string): code is GameCode {
  return code in GAME_REGISTRY;
}
