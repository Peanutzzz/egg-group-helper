export const STAT_NAMES = [
  "生命",
  "物攻",
  "物防",
  "魔攻",
  "魔防",
  "速度"
] as const;

export const MEDAL_NAMES = ["大块头", "婉转声"] as const;

export type StatName = (typeof STAT_NAMES)[number];
export type MedalName = (typeof MEDAL_NAMES)[number];

export interface PersonalityEffect {
  increase: StatName;
  decrease: StatName;
}

export interface StatCombo {
  id: string;
  personality: PersonalityEffect;
  ivs: StatName[];
  label: string;
}

export interface EggGroupsJsonEntry {
  entryIndex: number;
  id: number;
  name: string;
  eggGroups: string[];
}

export interface EggGroupsJson {
  schemaVersion: number;
  eggGroups: string[];
  entries: EggGroupsJsonEntry[];
}

export interface ImageManifestEntry {
  entryId: number;
  entryIndex: number;
  id: number;
  name: string;
  eggGroups: string[];
  imageFile: string;
  imageRelativePath: string;
  imageUrl: string;
  imageBytes: number;
}

export interface ImageManifestJson {
  schemaVersion: number;
  imageRoot: string;
  entries: ImageManifestEntry[];
}

export interface PetEntry {
  entryId: number;
  petId: number;
  name: string;
  eggGroups: string[];
  imagePath: string;
}

export interface RegisteredPetRecord {
  recordId: string;
  entryId: number;
  petId: number;
  name: string;
  eggGroups: string[];
  imagePath: string;
  personality: PersonalityEffect;
  ivs: StatName[];
  medals: MedalName[];
  createdAt: string;
  note?: string;
}

export interface LookupConfig {
  personality: PersonalityEffect;
  ivs: StatName[];
  medals: MedalName[];
}

export interface SearchSuggestion {
  pet: PetEntry;
  reason: string;
}

export interface ParentMatch {
  record: RegisteredPetRecord;
  sharedEggGroups: string[];
}

export interface CatchRecommendation {
  pet: PetEntry;
  matchedTargetEggGroups: string[];
  missingEggGroupsCovered: string[];
  score: number;
}

export type StatsMode = "detailed" | "medalOnly";

export interface StatsCellSelection {
  eggGroup: string;
  mode: StatsMode;
  comboId?: string;
  medalColumnId?: string;
}

export interface PersistedAppState {
  version: number;
  records: RegisteredPetRecord[];
  statCombos: StatCombo[];
  customCombos?: StatCombo[];
  preferredStatsMode: StatsMode;
  selectedMedalFilter: MedalName[];
}
