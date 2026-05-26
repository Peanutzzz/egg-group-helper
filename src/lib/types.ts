export const STAT_NAMES = [
  "生命",
  "物攻",
  "物防",
  "魔攻",
  "魔防",
  "速度"
] as const;

export type StatName = (typeof STAT_NAMES)[number];
export type SpecialName = string;

export interface PersonalityFilter {
  increase: StatName | null;
  decrease: StatName | null;
}

export interface PersonalityEffect {
  increase: StatName;
  decrease: StatName;
}

export interface StatsRow {
  id: string;
  personality: PersonalityFilter;
  ivs: StatName[];
  label: string;
}

export interface StatsPage {
  id: string;
  name: string;
  rows: StatsRow[];
}

export interface EggGroupsJsonEntry {
  entryIndex: number;
  id: number;
  name: string;
  eggGroups: string[];
  height?: string;
  weight?: string;
  detailUrl?: string;
}

export interface EggGroupsJson {
  schemaVersion: number;
  eggGroups: string[];
  entries: EggGroupsJsonEntry[];
}

export interface ImageManifestEntry {
  entryId: number;
  id: number;
  name: string;
  imageFile: string;
}

export interface ImageManifestJson {
  schemaVersion: number;
  entries: ImageManifestEntry[];
}

export interface SpecialTraitsJson {
  schemaVersion: number;
  specialTraits: SpecialName[];
}

export interface PetEntry {
  entryId: number;
  petId: number;
  name: string;
  eggGroups: string[];
  imagePath: string;
  imageFallbackPath?: string;
  height?: string;
  weight?: string;
  detailUrl?: string;
}

export interface RegisteredPetRecord {
  recordId: string;
  entryId: number;
  petId: number;
  name: string;
  eggGroups: string[];
  imagePath: string;
  imageFallbackPath?: string;
  personality: PersonalityEffect;
  ivs: StatName[];
  specials: SpecialName[];
  createdAt: string;
  note?: string;
}

export interface BaseConfig {
  personality: PersonalityFilter;
  ivs: StatName[];
  specials: SpecialName[];
}

export interface LookupConfig {
  personality: PersonalityEffect;
  ivs: StatName[];
  specials: SpecialName[];
}

export interface StatsRowDraft extends BaseConfig {}

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
  accounts: AccountState[];
  activeAccountId: string;
  records?: RegisteredPetRecord[];
  statsPages?: StatsPage[];
  selectedStatsPageId?: string;
  preferredStatsMode?: StatsMode;
  selectedSpecialFilter?: SpecialName[];
  statCombos?: StatsRow[];
  customCombos?: StatsRow[];
}

export interface AccountState {
  id: string;
  name: string;
  records: RegisteredPetRecord[];
  statsPages: StatsPage[];
  selectedStatsPageId: string;
  preferredStatsMode: StatsMode;
  selectedSpecialFilter: SpecialName[];
  registerSyncPageId?: string;
}
