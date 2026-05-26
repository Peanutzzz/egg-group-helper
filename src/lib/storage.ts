import { isTauri } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";
import { USER_STORE_KEY } from "./constants";
import {
  createAccountState,
  createStatsPage,
  getDefaultState,
  getSingleAccountDefaultState,
  mergeCombos,
  normalizeCombos,
  normalizeStatsPages
} from "./logic";
import {
  getPortableContext,
  readPortableText,
  writePortableState
} from "./portable";
import {
  type AccountState,
  type PersistedAppState,
  type RegisteredPetRecord,
  type StatsPage,
  type StatsRow
} from "./types";

const LOCAL_STORAGE_KEY = "rocom-user-data";

let tauriStore: LazyStore | null = null;

async function getStore(): Promise<LazyStore> {
  if (!tauriStore) {
    tauriStore = new LazyStore(USER_STORE_KEY, {
      defaults: {
        appState: getDefaultState()
      },
      autoSave: 150
    });
    await tauriStore.init();
  }

  return tauriStore;
}

export async function loadPersistedState(): Promise<PersistedAppState> {
  if (isTauri()) {
    const portable = await getPortableContext();
    if (portable) {
      try {
        if (portable.hasDataDir) {
          if (portable.hasStateFile) {
            return normalizePersistedState(
              JSON.parse(await readPortableText("rocom-user-data.json")) as PersistedAppState
            );
          }

          const initialState = getDefaultState();
          await writePortableState(JSON.stringify(initialState, null, 2));
          return initialState;
        }
      } catch {
        // Fall through to Tauri store if portable state cannot be read.
      }
    }

    const store = await getStore();
    const state = await store.get<PersistedAppState>("appState");
    if (state) {
      return normalizePersistedState(state);
    }

    const initialState = getDefaultState();
    await store.set("appState", initialState);
    await store.save();
    return initialState;
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    const fallback = getDefaultState();
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }

  return normalizePersistedState(JSON.parse(raw) as PersistedAppState);
}

export async function savePersistedState(
  state: PersistedAppState
): Promise<void> {
  if (isTauri()) {
    const portable = await getPortableContext();
    if (portable?.hasDataDir) {
      try {
        await writePortableState(JSON.stringify(state, null, 2));
        return;
      } catch {
        // Fall through to Tauri store if portable write fails.
      }
    }

    const store = await getStore();
    await store.set("appState", state);
    await store.save();
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

function normalizePersistedState(state: PersistedAppState): PersistedAppState {
  const defaults = getDefaultState();
  const legacyState = state as PersistedAppState & {
    selectedMedalFilter?: string[];
    records?: Array<RegisteredPetRecord & { medals?: string[] }>;
    statCombos?: StatsRow[];
    customCombos?: StatsRow[];
    statsPages?: StatsPage[];
    selectedStatsPageId?: string;
    accounts?: AccountState[];
    activeAccountId?: string;
  };

  function migrateRecords(records: Array<RegisteredPetRecord & { medals?: string[] }> | undefined) {
    return (
      records?.map((record) => {
        const legacyRecord = record as RegisteredPetRecord & { medals?: string[] };
        return {
          ...record,
          specials: record.specials ?? legacyRecord.medals ?? []
        };
      }) ?? []
    );
  }

  function buildLegacyAccount(): AccountState {
    const singleDefaults = getSingleAccountDefaultState();
    const migratedRecords = migrateRecords(legacyState.records) ?? singleDefaults.records;
    const legacyRows =
      state.statCombos && state.statCombos.length > 0
        ? normalizeCombos(state.statCombos)
        : normalizeCombos(mergeCombos(state.customCombos ?? []));

    const statsPages =
      legacyState.statsPages && legacyState.statsPages.length > 0
        ? normalizeStatsPages(legacyState.statsPages)
        : [
            createStatsPage(
              singleDefaults.statsPages[0]?.name ?? "默认页",
              legacyRows.length > 0 ? legacyRows : singleDefaults.statsPages[0]?.rows ?? []
            )
          ];

    const selectedStatsPageId = statsPages.some(
      (page) => page.id === legacyState.selectedStatsPageId
    )
      ? (legacyState.selectedStatsPageId as string)
      : statsPages[0]?.id ?? singleDefaults.selectedStatsPageId;

      return {
        id: globalThis.crypto?.randomUUID?.() ?? `account-${Date.now()}-${Math.random()}`,
        name: "默认账号",
        records: migratedRecords,
        statsPages,
        selectedStatsPageId,
        preferredStatsMode: state.preferredStatsMode ?? singleDefaults.preferredStatsMode,
        selectedSpecialFilter:
          state.selectedSpecialFilter ?? legacyState.selectedMedalFilter ?? [],
        registerSyncPageId: "none"
      };
    }

  const accounts =
    legacyState.accounts && legacyState.accounts.length > 0
      ? legacyState.accounts.map((account) => {
          const migratedRecords = migrateRecords(
            account.records as Array<RegisteredPetRecord & { medals?: string[] }>
          );
          const statsPages = normalizeStatsPages(account.statsPages ?? []);
          return {
            ...account,
            records: migratedRecords,
            statsPages,
            selectedStatsPageId:
              statsPages.find((page) => page.id === account.selectedStatsPageId)?.id ??
              statsPages[0]?.id ??
              getSingleAccountDefaultState().selectedStatsPageId,
            preferredStatsMode: account.preferredStatsMode ?? "detailed",
            selectedSpecialFilter: account.selectedSpecialFilter ?? [],
            registerSyncPageId:
              account.registerSyncPageId === "none" ||
              statsPages.some((page) => page.id === account.registerSyncPageId)
                ? (account.registerSyncPageId ?? "none")
                : "none"
          };
        })
      : [buildLegacyAccount()];

  const activeAccountId = accounts.some((account) => account.id === legacyState.activeAccountId)
    ? (legacyState.activeAccountId as string)
    : accounts[0]?.id ?? defaults.activeAccountId;

  return {
    ...defaults,
    ...state,
    version: Math.max(defaults.version, state.version ?? 1),
    accounts,
    activeAccountId
  };
}
