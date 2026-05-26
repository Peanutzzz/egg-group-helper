import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { loadPetData } from "./data";
import {
  createAccountState,
  buildStatsRowDraft,
  createRecord,
  createStatsPage,
  getDefaultState,
  normalizeCombos,
  validateConfig
} from "./logic";
import { loadPersistedState, savePersistedState } from "./storage";
import {
  type AccountState,
  type LookupConfig,
  type PersistedAppState,
  type PetEntry,
  type RegisteredPetRecord,
  type SpecialName,
  type StatsPage,
  type StatsRowDraft,
  type StatsMode
} from "./types";

interface AppContextValue {
  loading: boolean;
  loadError: string | null;
  entries: PetEntry[];
  eggGroups: string[];
  specialTraits: SpecialName[];
  accounts: AccountState[];
  activeAccountId: string;
  records: RegisteredPetRecord[];
  statsPages: StatsPage[];
  selectedStatsPageId: string;
  preferredStatsMode: StatsMode;
  selectedSpecialFilter: SpecialName[];
  registerSyncPageId: string;
  addRecord: (pet: PetEntry, config: LookupConfig) => Promise<string | null>;
  updateRecord: (
    recordId: string,
    config: LookupConfig
  ) => Promise<string | null>;
  removeRecord: (recordId: string) => Promise<void>;
  addAccount: (name?: string) => Promise<void>;
  renameAccount: (accountId: string, name: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  setActiveAccountId: (accountId: string) => Promise<void>;
  addStatsPage: (name?: string) => Promise<void>;
  renameStatsPage: (pageId: string, name: string) => Promise<void>;
  removeStatsPage: (pageId: string) => Promise<void>;
  setSelectedStatsPageId: (pageId: string) => Promise<void>;
  addStatsRow: (pageId: string, row: StatsRowDraft) => Promise<string | null>;
  removeStatsRow: (pageId: string, rowId: string) => Promise<void>;
  setPreferredStatsMode: (mode: StatsMode) => Promise<void>;
  setSelectedSpecialFilter: (specials: SpecialName[]) => Promise<void>;
  setRegisterSyncPageId: (pageId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entries, setEntries] = useState<PetEntry[]>([]);
  const [eggGroups, setEggGroups] = useState<string[]>([]);
  const [specialTraits, setSpecialTraits] = useState<SpecialName[]>([]);
  const [state, setState] = useState<PersistedAppState>(getDefaultState());

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      try {
        const [petData, persisted] = await Promise.all([
          loadPetData(),
          loadPersistedState()
        ]);

        if (disposed) return;
        setEntries(petData.entries);
        setEggGroups(petData.eggGroups);
        setSpecialTraits(petData.specialTraits);
        setState(persisted);
        setLoadError(null);
      } catch (error) {
        if (disposed) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      disposed = true;
    };
  }, []);

  async function patchState(
    updater: (current: PersistedAppState) => PersistedAppState
  ) {
    setState((current) => {
      const nextState = updater(current);
      void savePersistedState(nextState);
      return nextState;
    });
  }

  const activeAccount =
    state.accounts.find((account) => account.id === state.activeAccountId) ??
    state.accounts[0];

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      loadError,
      entries,
      eggGroups,
      specialTraits,
      accounts: state.accounts,
      activeAccountId: state.activeAccountId,
      records: activeAccount.records,
      statsPages: activeAccount.statsPages,
      selectedStatsPageId: activeAccount.selectedStatsPageId,
      preferredStatsMode: activeAccount.preferredStatsMode,
      selectedSpecialFilter: activeAccount.selectedSpecialFilter,
      registerSyncPageId: activeAccount.registerSyncPageId ?? "none",
      addRecord: async (pet, config) => {
        const error = validateConfig(config.personality, config.ivs);
        if (error) return error;

        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? {
                  ...account,
                  records: [createRecord(pet, config), ...account.records]
                }
              : account
          )
        }));

        return null;
      },
      updateRecord: async (recordId, config) => {
        const error = validateConfig(config.personality, config.ivs);
        if (error) return error;

        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? {
                  ...account,
                  records: account.records.map((record) =>
                    record.recordId === recordId
                      ? {
                          ...record,
                          personality: config.personality,
                          ivs: [...config.ivs],
                          specials: [...config.specials]
                        }
                      : record
                  )
                }
              : account
          )
        }));

        return null;
      },
      removeRecord: async (recordId) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? {
                  ...account,
                  records: account.records.filter((record) => record.recordId !== recordId)
                }
              : account
          )
        }));
      },
      addAccount: async (name) => {
        await patchState((current) => {
          const account = createAccountState(name?.trim() || `账号 ${current.accounts.length + 1}`);
          return {
            ...current,
            accounts: [...current.accounts, account],
            activeAccountId: account.id
          };
        });
      },
      renameAccount: async (accountId, name) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === accountId
              ? { ...account, name: name.trim() || account.name }
              : account
          )
        }));
      },
      removeAccount: async (accountId) => {
        await patchState((current) => {
          if (current.accounts.length <= 1) {
            return current;
          }

          const nextAccounts = current.accounts.filter((account) => account.id !== accountId);
          return {
            ...current,
            accounts: nextAccounts,
            activeAccountId:
              current.activeAccountId === accountId
                ? nextAccounts[0]?.id ?? current.activeAccountId
                : current.activeAccountId
          };
        });
      },
      setActiveAccountId: async (accountId) => {
        await patchState((current) => ({
          ...current,
          activeAccountId: accountId
        }));
      },
      addStatsPage: async (name) => {
        await patchState((current) => {
          const active =
            current.accounts.find((account) => account.id === current.activeAccountId) ??
            current.accounts[0];
          const page = createStatsPage(name ?? `第 ${active.statsPages.length + 1} 页`);
          return {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === current.activeAccountId
                ? {
                    ...account,
                    statsPages: [...account.statsPages, page],
                    selectedStatsPageId: page.id
                  }
                : account
            )
          };
        });
      },
      renameStatsPage: async (pageId, name) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? {
                  ...account,
                  statsPages: account.statsPages.map((page) =>
                    page.id === pageId
                      ? { ...page, name: name.trim() || page.name }
                      : page
                  )
                }
              : account
          )
        }));
      },
      removeStatsPage: async (pageId) => {
        await patchState((current) => {
          const active =
            current.accounts.find((account) => account.id === current.activeAccountId) ??
            current.accounts[0];
          if (active.statsPages.length <= 1) {
            return current;
          }

          const nextPages = active.statsPages.filter((page) => page.id !== pageId);
          return {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === current.activeAccountId
                ? {
                    ...account,
                    statsPages: nextPages,
                    selectedStatsPageId:
                      account.selectedStatsPageId === pageId
                        ? nextPages[0]?.id ?? account.selectedStatsPageId
                        : account.selectedStatsPageId
                  }
                : account
            )
          };
        });
      },
      setSelectedStatsPageId: async (pageId) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? { ...account, selectedStatsPageId: pageId }
              : account
          )
        }));
      },
      addStatsRow: async (pageId, row) => {
        const normalized = buildStatsRowDraft(row);
        const targetPage = activeAccount.statsPages.find((page) => page.id === pageId);
        if (!targetPage) {
          return "未找到对应的统计页。";
        }
        if (targetPage.rows.some((item) => item.id === normalized.id)) {
          return "这个统计行已经存在了。";
        }

        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? {
                  ...account,
                  statsPages: account.statsPages.map((page) =>
                    page.id === pageId
                      ? {
                          ...page,
                          rows: normalizeCombos([...page.rows, normalized])
                        }
                      : page
                  )
                }
              : account
          )
        }));

        return null;
      },
      removeStatsRow: async (pageId, rowId) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? {
                  ...account,
                  statsPages: account.statsPages.map((page) =>
                    page.id === pageId
                      ? {
                          ...page,
                          rows: page.rows.filter((row) => row.id !== rowId)
                        }
                      : page
                  )
                }
              : account
          )
        }));
      },
      setPreferredStatsMode: async (mode) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? { ...account, preferredStatsMode: mode }
              : account
          )
        }));
      },
      setSelectedSpecialFilter: async (specials) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? { ...account, selectedSpecialFilter: specials }
              : account
          )
        }));
      },
      setRegisterSyncPageId: async (pageId) => {
        await patchState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.activeAccountId
              ? { ...account, registerSyncPageId: pageId }
              : account
          )
        }));
      }
    }),
    [activeAccount, eggGroups, entries, loading, loadError, specialTraits, state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
