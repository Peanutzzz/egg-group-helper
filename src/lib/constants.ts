import { type MedalName, type StatCombo, type StatName } from "./types";

export const STAT_ORDER: StatName[] = [
  "生命",
  "物攻",
  "物防",
  "魔攻",
  "魔防",
  "速度"
];

export const MEDAL_ORDER: MedalName[] = ["大块头", "婉转声"];

function createCombo(
  increase: StatName,
  decrease: StatName,
  ivs: StatName[]
): StatCombo {
  const sortedIvs = [...ivs].sort(
    (left, right) => STAT_ORDER.indexOf(left) - STAT_ORDER.indexOf(right)
  );

  return {
    id: `${increase}|${decrease}|${sortedIvs.join("|")}`,
    personality: {
      increase,
      decrease
    },
    ivs: sortedIvs,
    label: `+${increase}/-${decrease} | ${sortedIvs.join(" / ")}`
  };
}

export const DEFAULT_STAT_COMBOS: StatCombo[] = [
  createCombo("生命", "物攻", ["生命", "物防", "魔防"]),
  createCombo("生命", "魔攻", ["生命", "物防", "魔防"]),
  createCombo("生命", "物攻", ["生命", "魔攻", "速度"]),
  createCombo("生命", "魔攻", ["生命", "物攻", "速度"]),
  createCombo("物攻", "魔攻", ["生命", "物攻", "速度"]),
  createCombo("魔攻", "物攻", ["生命", "魔攻", "速度"]),
  createCombo("速度", "物攻", ["生命", "魔攻", "速度"]),
  createCombo("速度", "魔攻", ["生命", "物攻", "速度"])
];

export const MEDAL_ONLY_COLUMNS = [
  {
    id: "big",
    label: "含大块头",
    requiredMedals: ["大块头"] as MedalName[]
  },
  {
    id: "sound",
    label: "含婉转声",
    requiredMedals: ["婉转声"] as MedalName[]
  },
  {
    id: "double",
    label: "双奖章",
    requiredMedals: ["大块头", "婉转声"] as MedalName[]
  }
];

export const USER_STORE_KEY = "rocom-user-data.json";

export const EMPTY_PERSONALITY = {
  increase: "生命",
  decrease: "物攻"
} as const;
