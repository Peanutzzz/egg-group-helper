import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";

export interface PortableContext {
  rootDir: string;
  dataDir: string;
  stateFile: string;
  hasDataDir: boolean;
  hasStateFile: boolean;
}

let cachedPortableContext: PortableContext | null = null;

export async function getPortableContext(): Promise<PortableContext | null> {
  if (!isTauri()) {
    return null;
  }

  if (cachedPortableContext) {
    return cachedPortableContext;
  }

  try {
    cachedPortableContext = await invoke<PortableContext>("get_portable_context");
    return cachedPortableContext;
  } catch {
    return null;
  }
}

export async function readPortableText(relativePath: string): Promise<string> {
  return invoke<string>("read_portable_text", { relativePath });
}

export async function writePortableState(contents: string): Promise<void> {
  await invoke("write_portable_state", { contents });
}

export function toPortableFileUrl(path: string): string {
  return convertFileSrc(path);
}
