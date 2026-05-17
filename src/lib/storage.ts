import { isTauri } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";
import { USER_STORE_KEY } from "./constants";
import { getDefaultState, mergeCombos, normalizeCombos } from "./logic";
import {
  getPortableContext,
  readPortableText,
  writePortableState
} from "./portable";
import { type PersistedAppState } from "./types";

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
  const merged = { ...defaults, ...state };
  const statCombos =
    state.statCombos && state.statCombos.length > 0
      ? normalizeCombos(state.statCombos)
      : normalizeCombos(mergeCombos(state.customCombos ?? []));

  return {
    ...merged,
    statCombos
  };
}
