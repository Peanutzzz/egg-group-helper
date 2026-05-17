import {
  DEFAULT_STAT_COMBOS,
  MEDAL_ONLY_COLUMNS,
  MEDAL_ORDER,
  STAT_ORDER
} from "./constants";
import {
  type CatchRecommendation,
  type LookupConfig,
  type MedalName,
  type ParentMatch,
  type PersistedAppState,
  type PetEntry,
  type PersonalityEffect,
  type RegisteredPetRecord,
  type SearchSuggestion,
  type StatCombo,
  type StatName
} from "./types";

export function sortStats(stats: StatName[]): StatName[] {
  return [...stats].sort(
    (left, right) => STAT_ORDER.indexOf(left) - STAT_ORDER.indexOf(right)
  );
}

export function sortMedals(medals: MedalName[]): MedalName[] {
  return [...medals].sort(
    (left, right) => MEDAL_ORDER.indexOf(left) - MEDAL_ORDER.indexOf(right)
  );
}

export function validateConfig(
  personality: PersonalityEffect,
  ivs: StatName[]
): string | null {
  if (personality.increase === personality.decrease) {
    return "性格的增加项和减少项不能相同。";
  }

  if (new Set(ivs).size !== 3) {
    return "个体值需要选择 3 个不同属性。";
  }

  return null;
}

export function normalizeCombo(
  personality: PersonalityEffect,
  ivs: StatName[]
): StatCombo {
  const sortedIvs = sortStats(ivs);

  return {
    id: `${personality.increase}|${personality.decrease}|${sortedIvs.join("|")}`,
    personality,
    ivs: sortedIvs,
    label: `+${personality.increase}/-${personality.decrease} | ${sortedIvs.join(" / ")}`
  };
}

export function samePersonality(
  left: PersonalityEffect,
  right: PersonalityEffect
): boolean {
  return left.increase === right.increase && left.decrease === right.decrease;
}

export function sameIvs(left: StatName[], right: StatName[]): boolean {
  const sortedLeft = sortStats(left);
  const sortedRight = sortStats(right);

  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function medalsSatisfy(
  recordMedals: MedalName[],
  requiredMedals: MedalName[]
): boolean {
  if (requiredMedals.length === 0) {
    return true;
  }

  return requiredMedals.every((medal) => recordMedals.includes(medal));
}

export function recordMatchesLookup(
  record: RegisteredPetRecord,
  config: LookupConfig,
  options?: { ignoreMedals?: boolean }
): boolean {
  return (
    samePersonality(record.personality, config.personality) &&
    sameIvs(record.ivs, config.ivs) &&
    (options?.ignoreMedals ?? false
      ? true
      : medalsSatisfy(record.medals, config.medals))
  );
}

export function findSharedEggGroups(
  leftEggGroups: string[],
  rightEggGroups: string[]
): string[] {
  return leftEggGroups.filter((group) => rightEggGroups.includes(group));
}

export function buildSearchSuggestions(
  entries: PetEntry[],
  keyword: string,
  limit = 10
): SearchSuggestion[] {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return [];

  return entries
    .map((pet) => {
      const match = getPetKeywordMatch(pet, trimmed);
      return match ? { pet, ...match } : null;
    })
    .filter((value): value is SearchSuggestion & { score: number } => value !== null)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.pet.petId !== right.pet.petId) return left.pet.petId - right.pet.petId;
      return left.pet.name.localeCompare(right.pet.name, "zh-CN");
    })
    .slice(0, limit)
    .map(({ score: _score, ...rest }) => rest);
}

export function petMatchesKeyword(
  pet: { petId: number; name: string },
  keyword: string
): boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return true;
  return getPetKeywordMatch(pet, trimmed) !== null;
}

function getPetKeywordMatch(
  pet: { petId: number; name: string },
  trimmedKeyword: string
): { score: number; reason: string } | null {
  const normalizedNumericKeyword = trimmedKeyword.replace(/^no\.?\s*/i, "");
  const digitsOnly = /^\d+$/.test(normalizedNumericKeyword);
  const normalizedDigits =
    digitsOnly && normalizedNumericKeyword.length > 0
      ? String(Number.parseInt(normalizedNumericKeyword, 10))
      : "";
  const idText = String(pet.petId);
  const paddedIdText = idText.padStart(3, "0");
  const nameText = pet.name.toLowerCase();

  if (
    digitsOnly &&
    (idText === normalizedDigits || paddedIdText === normalizedNumericKeyword)
  ) {
    return {
      score: 1000,
      reason: `序号精确匹配 NO.${paddedIdText}`
    };
  }

  if (nameText === trimmedKeyword) {
    return {
      score: 900,
      reason: "中文名精确匹配"
    };
  }

  if (nameText.startsWith(trimmedKeyword)) {
    return {
      score: 800,
      reason: "中文名前缀匹配"
    };
  }

  if (
    digitsOnly &&
    (idText.startsWith(normalizedDigits) || paddedIdText.startsWith(normalizedNumericKeyword))
  ) {
    return {
      score: 700,
      reason: `序号前缀匹配 NO.${paddedIdText}`
    };
  }

  if (nameText.includes(trimmedKeyword)) {
    return {
      score: 600,
      reason: "中文名模糊匹配"
    };
  }

  if (
    digitsOnly &&
    (idText.includes(normalizedDigits) || paddedIdText.includes(normalizedNumericKeyword))
  ) {
    return {
      score: 500,
      reason: `序号模糊匹配 NO.${paddedIdText}`
    };
  }

  return null;
}

export function createRecord(
  pet: PetEntry,
  config: LookupConfig
): RegisteredPetRecord {
  return {
    recordId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    entryId: pet.entryId,
    petId: pet.petId,
    name: pet.name,
    eggGroups: pet.eggGroups,
    imagePath: pet.imagePath,
    personality: config.personality,
    ivs: sortStats(config.ivs),
    medals: sortMedals(config.medals),
    createdAt: new Date().toISOString()
  };
}

export function mergeCombos(customCombos: StatCombo[]): StatCombo[] {
  const map = new Map<string, StatCombo>();
  [...DEFAULT_STAT_COMBOS, ...customCombos].forEach((combo) => {
    map.set(combo.id, {
      ...combo,
      ivs: sortStats(combo.ivs)
    });
  });

  return [...map.values()];
}

export function normalizeCombos(combos: StatCombo[]): StatCombo[] {
  const map = new Map<string, StatCombo>();
  combos.forEach((combo) => {
    map.set(combo.id, normalizeCombo(combo.personality, combo.ivs));
  });
  return [...map.values()];
}

export function buildParentMatches(
  targetPet: PetEntry,
  config: LookupConfig,
  records: RegisteredPetRecord[]
): ParentMatch[] {
  return records
    .filter((record) => recordMatchesLookup(record, config))
    .map((record) => ({
      record,
      sharedEggGroups: findSharedEggGroups(targetPet.eggGroups, record.eggGroups)
    }))
    .filter((match) => match.sharedEggGroups.length > 0)
    .sort((left, right) => {
      if (right.sharedEggGroups.length !== left.sharedEggGroups.length) {
        return right.sharedEggGroups.length - left.sharedEggGroups.length;
      }
      if (left.record.petId !== right.record.petId) {
        return left.record.petId - right.record.petId;
      }
      return left.record.name.localeCompare(right.record.name, "zh-CN");
    });
}

export function getCoveredEggGroups(
  eggGroups: string[],
  records: RegisteredPetRecord[],
  config: LookupConfig
): string[] {
  const covered = new Set<string>();
  records.forEach((record) => {
    if (recordMatchesLookup(record, config)) {
      record.eggGroups.forEach((group) => covered.add(group));
    }
  });

  return eggGroups.filter((group) => covered.has(group));
}

export function buildCatchRecommendations(
  entries: PetEntry[],
  eggGroups: string[],
  records: RegisteredPetRecord[],
  config: LookupConfig,
  options?: { targetEggGroups?: string[] }
): CatchRecommendation[] {
  const covered = new Set(getCoveredEggGroups(eggGroups, records, config));
  const missingEggGroups = eggGroups.filter((group) => !covered.has(group));
  const targetEggGroups = options?.targetEggGroups ?? [];

  return entries
    .map((pet) => {
      const matchedTargetEggGroups =
        targetEggGroups.length > 0
          ? findSharedEggGroups(targetEggGroups, pet.eggGroups)
          : pet.eggGroups;
      const missingEggGroupsCovered = pet.eggGroups.filter((group) =>
        missingEggGroups.includes(group)
      );
      const score =
        missingEggGroupsCovered.length * 100 +
        matchedTargetEggGroups.length * 10 -
        pet.petId / 1000;

      return {
        pet,
        matchedTargetEggGroups,
        missingEggGroupsCovered,
        score
      };
    })
    .filter((item) => {
      if (options?.targetEggGroups && item.matchedTargetEggGroups.length === 0) {
        return false;
      }

      return item.missingEggGroupsCovered.length > 0;
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.missingEggGroupsCovered.length !== left.missingEggGroupsCovered.length) {
        return right.missingEggGroupsCovered.length - left.missingEggGroupsCovered.length;
      }
      if (left.pet.petId !== right.pet.petId) return left.pet.petId - right.pet.petId;
      return left.pet.name.localeCompare(right.pet.name, "zh-CN");
    });
}

export function dedupeRecommendationsByPetId(
  recommendations: CatchRecommendation[]
): CatchRecommendation[] {
  const seen = new Set<number>();
  const result: CatchRecommendation[] = [];

  recommendations.forEach((item) => {
    if (seen.has(item.pet.petId)) {
      return;
    }
    seen.add(item.pet.petId);
    result.push(item);
  });

  return result;
}

export function getCellRecords(
  records: RegisteredPetRecord[],
  eggGroup: string,
  combo: StatCombo,
  medalFilter: MedalName[]
): RegisteredPetRecord[] {
  return records.filter(
    (record) =>
      record.eggGroups.includes(eggGroup) &&
      samePersonality(record.personality, combo.personality) &&
      sameIvs(record.ivs, combo.ivs) &&
      medalsSatisfy(record.medals, medalFilter)
  );
}

export function getMedalCellRecords(
  records: RegisteredPetRecord[],
  eggGroup: string,
  requiredMedals: MedalName[]
): RegisteredPetRecord[] {
  return records.filter(
    (record) =>
      record.eggGroups.includes(eggGroup) &&
      medalsSatisfy(record.medals, requiredMedals)
  );
}

export function getDefaultState(): PersistedAppState {
  return {
    version: 1,
    records: [],
    statCombos: DEFAULT_STAT_COMBOS,
    preferredStatsMode: "detailed",
    selectedMedalFilter: []
  };
}

export function formatMedals(medals: MedalName[]): string {
  if (medals.length === 0) return "无奖章";
  return sortMedals(medals).join(" + ");
}

export function formatPersonality(personality: PersonalityEffect): string {
  return `+${personality.increase}/-${personality.decrease}`;
}

export function formatEggGroups(eggGroups: string[]): string {
  return eggGroups.join(" / ");
}

export function formatPetLabel(pet: { petId: number; name: string }): string {
  return `NO.${String(pet.petId).padStart(3, "0")} ${pet.name}`;
}

export function getMedalColumns() {
  return MEDAL_ONLY_COLUMNS;
}
