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
  createRecord,
  getDefaultState,
  normalizeCombo,
  normalizeCombos,
  validateConfig
} from "./logic";
import { loadPersistedState, savePersistedState } from "./storage";
import {
  type LookupConfig,
  type MedalName,
  type PersistedAppState,
  type PetEntry,
  type RegisteredPetRecord,
  type StatCombo,
  type StatsMode
} from "./types";

interface AppContextValue {
  loading: boolean;
  loadError: string | null;
  entries: PetEntry[];
  eggGroups: string[];
  records: RegisteredPetRecord[];
  statCombos: StatCombo[];
  preferredStatsMode: StatsMode;
  selectedMedalFilter: MedalName[];
  addRecord: (pet: PetEntry, config: LookupConfig) => Promise<string | null>;
  removeRecord: (recordId: string) => Promise<void>;
  addCustomCombo: (combo: LookupConfig) => Promise<string | null>;
  removeCustomCombo: (comboId: string) => Promise<void>;
  setPreferredStatsMode: (mode: StatsMode) => Promise<void>;
  setSelectedMedalFilter: (medals: MedalName[]) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entries, setEntries] = useState<PetEntry[]>([]);
  const [eggGroups, setEggGroups] = useState<string[]>([]);
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

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      loadError,
      entries,
      eggGroups,
      records: state.records,
      statCombos: state.statCombos,
      preferredStatsMode: state.preferredStatsMode,
      selectedMedalFilter: state.selectedMedalFilter,
      addRecord: async (pet, config) => {
        const error = validateConfig(config.personality, config.ivs);
        if (error) return error;

        await patchState((current) => ({
          ...current,
          records: [createRecord(pet, config), ...current.records]
        }));

        return null;
      },
      removeRecord: async (recordId) => {
        await patchState((current) => ({
          ...current,
          records: current.records.filter((record) => record.recordId !== recordId)
        }));
      },
      addCustomCombo: async (combo) => {
        const error = validateConfig(combo.personality, combo.ivs);
        if (error) return error;

        const normalized = normalizeCombo(combo.personality, combo.ivs);
        if (state.statCombos.some((item) => item.id === normalized.id)) {
          return "这个统计组合已经存在了。";
        }

        await patchState((current) => {
          return {
            ...current,
            statCombos: normalizeCombos([...current.statCombos, normalized])
          };
        });

        return null;
      },
      removeCustomCombo: async (comboId) => {
        await patchState((current) => ({
          ...current,
          statCombos: current.statCombos.filter((combo) => combo.id !== comboId)
        }));
      },
      setPreferredStatsMode: async (mode) => {
        await patchState((current) => ({
          ...current,
          preferredStatsMode: mode
        }));
      },
      setSelectedMedalFilter: async (medals) => {
        await patchState((current) => ({
          ...current,
          selectedMedalFilter: medals
        }));
      }
    }),
    [eggGroups, entries, loading, loadError, state]
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
