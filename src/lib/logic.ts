import {
  DEFAULT_SPECIAL_ORDER,
  DEFAULT_STAT_COMBOS,
  DEFAULT_STATS_PAGE_ID,
  DEFAULT_STATS_PAGES,
  SPECIAL_ONLY_COLUMNS,
  STAT_ORDER
} from "./constants";
import {
  type BaseConfig,
  type AccountState,
  type CatchRecommendation,
  type LookupConfig,
  type ParentMatch,
  type PersistedAppState,
  type PetEntry,
  type PersonalityEffect,
  type PersonalityFilter,
  type RegisteredPetRecord,
  type SearchSuggestion,
  type SpecialName,
  type StatsPage,
  type StatsRow,
  type StatName
} from "./types";

export function sortStats(stats: StatName[]): StatName[] {
  return [...stats].sort(
    (left, right) => STAT_ORDER.indexOf(left) - STAT_ORDER.indexOf(right)
  );
}

export function sortSpecials(
  specials: SpecialName[],
  availableSpecials = DEFAULT_SPECIAL_ORDER
): SpecialName[] {
  return [...specials].sort((left, right) => {
    const leftIndex = availableSpecials.indexOf(left);
    const rightIndex = availableSpecials.indexOf(right);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }

    return left.localeCompare(right, "zh-CN");
  });
}

export function validateConfig(
  personality: PersonalityEffect,
  ivs: StatName[]
): string | null {
  if (personality.increase === personality.decrease) {
    return "性格的增加项和减少项不能相同。";
  }

  if (ivs.length < 1 || ivs.length > 3 || new Set(ivs).size !== ivs.length) {
    return "个体值需要选择 1 到 3 个不同属性。";
  }

  return null;
}

export function normalizeCombo(
  personality: PersonalityFilter,
  ivs: StatName[]
): StatsRow {
  const sortedIvs = sortStats(ivs);
  const personalityLabel = formatPersonalityFilter(personality);
  const ivsLabel = sortedIvs.length > 0 ? sortedIvs.join(" / ") : "任意个体";

  return {
    id: `${personality.increase ?? "*"}|${personality.decrease ?? "*"}|${
      sortedIvs.length > 0 ? sortedIvs.join("|") : "*"
    }`,
    personality,
    ivs: sortedIvs,
    label: `${personalityLabel} | ${ivsLabel}`
  };
}

export function samePersonality(
  left: PersonalityEffect,
  right: PersonalityEffect
): boolean {
  return left.increase === right.increase && left.decrease === right.decrease;
}

export function sameIvs(left: StatName[], right: StatName[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = sortStats(left);
  const sortedRight = sortStats(right);

  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function personalityMatchesFilter(
  personality: PersonalityEffect,
  filter: PersonalityFilter
): boolean {
  if (filter.increase && personality.increase !== filter.increase) {
    return false;
  }

  if (filter.decrease && personality.decrease !== filter.decrease) {
    return false;
  }

  return true;
}

export function ivsMatchFilter(recordIvs: StatName[], filterIvs: StatName[]): boolean {
  if (filterIvs.length === 0) {
    return true;
  }

  return filterIvs.every((stat) => recordIvs.includes(stat));
}

export function specialsSatisfy(
  recordSpecials: SpecialName[],
  requiredSpecials: SpecialName[]
): boolean {
  if (requiredSpecials.length === 0) {
    return true;
  }

  return requiredSpecials.every((special) => recordSpecials.includes(special));
}

export function recordMatchesLookup(
  record: RegisteredPetRecord,
  config: BaseConfig,
  options?: { ignoreSpecials?: boolean }
): boolean {
  return (
    personalityMatchesFilter(record.personality, config.personality) &&
    ivsMatchFilter(record.ivs, config.ivs) &&
    (options?.ignoreSpecials ?? false
      ? true
      : specialsSatisfy(record.specials, config.specials))
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
    imageFallbackPath: pet.imageFallbackPath,
    personality: config.personality,
    ivs: sortStats(config.ivs),
    specials: sortSpecials(config.specials),
    createdAt: new Date().toISOString()
  };
}

export function formatPhysique(
  item: { height?: string; weight?: string } | null | undefined
): string {
  if (!item) return "";
  const parts = [item.height?.trim(), item.weight?.trim()].filter(Boolean);
  return parts.join("  /  ");
}

export function formatEggGroupsWithPhysique(
  item: { eggGroups: string[]; height?: string; weight?: string } | null | undefined
): string {
  if (!item) return "";
  const eggGroupsText = formatEggGroups(item.eggGroups);
  const physiqueText = formatPhysique(item);
  if (!physiqueText) {
    return eggGroupsText;
  }
  if (!eggGroupsText) {
    return physiqueText;
  }
  return `${eggGroupsText}  ${physiqueText}`;
}

export function mergeCombos(customCombos: StatsRow[]): StatsRow[] {
  const map = new Map<string, StatsRow>();
  [...DEFAULT_STAT_COMBOS, ...customCombos].forEach((combo) => {
    map.set(combo.id, {
      ...combo,
      ivs: sortStats(combo.ivs)
    });
  });

  return [...map.values()];
}

export function normalizeCombos(combos: StatsRow[]): StatsRow[] {
  const map = new Map<string, StatsRow>();
  combos.forEach((combo) => {
    map.set(combo.id, normalizeCombo(combo.personality, combo.ivs));
  });
  return [...map.values()];
}

export function normalizeStatsPages(pages: StatsPage[]): StatsPage[] {
  return pages.map((page, index) => ({
    id: page.id || `page-${index + 1}`,
    name: page.name?.trim() || `第 ${index + 1} 页`,
    rows: normalizeCombos(page.rows ?? [])
  }));
}

export function buildParentMatches(
  targetPet: PetEntry,
  config: BaseConfig,
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
  config: BaseConfig
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
  config: BaseConfig,
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
  combo: StatsRow,
  specialFilter: SpecialName[]
): RegisteredPetRecord[] {
  return records.filter(
    (record) =>
      record.eggGroups.includes(eggGroup) &&
      personalityMatchesFilter(record.personality, combo.personality) &&
      ivsMatchFilter(record.ivs, combo.ivs) &&
      specialsSatisfy(record.specials, specialFilter)
  );
}

export function getSpecialCellRecords(
  records: RegisteredPetRecord[],
  eggGroup: string,
  requiredSpecials: SpecialName[]
): RegisteredPetRecord[] {
  return records.filter(
    (record) =>
      record.eggGroups.includes(eggGroup) &&
      specialsSatisfy(record.specials, requiredSpecials)
  );
}

export function createStatsPage(name: string, rows: StatsRow[] = DEFAULT_STAT_COMBOS): StatsPage {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `page-${Date.now()}-${Math.random()}`,
    name: name.trim() || "新统计页",
    rows: normalizeCombos(rows)
  };
}

export function createAccountState(name = "默认账号"): AccountState {
  const defaultState = getSingleAccountDefaultState();
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `account-${Date.now()}-${Math.random()}`,
    name,
    ...defaultState
  };
}

export function getSingleAccountDefaultState() {
  return {
    records: [],
    statsPages: DEFAULT_STATS_PAGES,
    selectedStatsPageId: DEFAULT_STATS_PAGE_ID,
    preferredStatsMode: "detailed" as const,
    selectedSpecialFilter: [],
    registerSyncPageId: "none"
  };
}

export function getDefaultState(): PersistedAppState {
  const defaultAccount = createAccountState();
  return {
    version: 2,
    accounts: [defaultAccount],
    activeAccountId: defaultAccount.id
  };
}

export function formatSpecials(specials: SpecialName[]): string {
  if (specials.length === 0) return "无特殊";
  return sortSpecials(specials).join(" + ");
}

export function formatPersonality(personality: PersonalityEffect): string {
  return `+${personality.increase}/-${personality.decrease}`;
}

export function formatPersonalityFilter(personality: PersonalityFilter): string {
  if (personality.increase && personality.decrease) {
    return `+${personality.increase}/-${personality.decrease}`;
  }
  if (personality.increase) {
    return `+${personality.increase}`;
  }
  if (personality.decrease) {
    return `-${personality.decrease}`;
  }
  return "任意性格";
}

export function formatEggGroups(eggGroups: string[]): string {
  return eggGroups.join(" / ");
}

export function formatPetLabel(pet: { petId: number; name: string }): string {
  return `NO.${String(pet.petId).padStart(3, "0")} ${pet.name}`;
}

export function buildStatsRowDraft(config: BaseConfig): StatsRow {
  return normalizeCombo(config.personality, config.ivs);
}

export function getSpecialColumns() {
  return SPECIAL_ONLY_COLUMNS;
}
