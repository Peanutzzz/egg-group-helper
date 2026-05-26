import { type SpecialName, type StatName, type StatsPage, type StatsRow } from "./types";

export const STAT_ORDER: StatName[] = [
  "生命",
  "物攻",
  "物防",
  "魔攻",
  "魔防",
  "速度"
];

export const DEFAULT_SPECIAL_ORDER: SpecialName[] = [
  "大块头",
  "婉转声",
  "异色",
  "炫彩"
];

function createCombo(
  increase: StatName,
  decrease: StatName,
  ivs: StatName[]
): StatsRow {
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

export const DEFAULT_STAT_COMBOS: StatsRow[] = [
  createCombo("生命", "物攻", ["生命", "物防", "魔防"]),
  createCombo("生命", "魔攻", ["生命", "物防", "魔防"]),
  createCombo("生命", "物攻", ["生命", "魔攻", "速度"]),
  createCombo("生命", "魔攻", ["生命", "物攻", "速度"]),
  createCombo("物攻", "魔攻", ["生命", "物攻", "速度"]),
  createCombo("魔攻", "物攻", ["生命", "魔攻", "速度"]),
  createCombo("速度", "物攻", ["生命", "魔攻", "速度"]),
  createCombo("速度", "魔攻", ["生命", "物攻", "速度"])
];

export const DEFAULT_STATS_PAGE_ID = "default";

export const DEFAULT_STATS_PAGES: StatsPage[] = [
  {
    id: DEFAULT_STATS_PAGE_ID,
    name: "默认页",
    rows: DEFAULT_STAT_COMBOS
  }
];

export const SPECIAL_ONLY_COLUMNS = [
  {
    id: "big",
    label: "含大块头",
    requiredSpecials: ["大块头"] as SpecialName[]
  },
  {
    id: "sound",
    label: "含婉转声",
    requiredSpecials: ["婉转声"] as SpecialName[]
  },
  {
    id: "double",
    label: "双特殊",
    requiredSpecials: ["大块头", "婉转声"] as SpecialName[]
  }
];

export const USER_STORE_KEY = "rocom-user-data.json";

export const EMPTY_PERSONALITY = {
  increase: "生命",
  decrease: "物攻"
} as const;
