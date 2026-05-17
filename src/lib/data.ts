import {
  type EggGroupsJson,
  type ImageManifestJson,
  type PetEntry
} from "./types";
import {
  getPortableContext,
  readPortableText,
  toPortableFileUrl
} from "./portable";

let cachedEntries: PetEntry[] | null = null;
let cachedEggGroups: string[] | null = null;

export async function loadPetData(): Promise<{
  entries: PetEntry[];
  eggGroups: string[];
}> {
  if (cachedEntries && cachedEggGroups) {
    return {
      entries: cachedEntries,
      eggGroups: cachedEggGroups
    };
  }

  const portable = await getPortableContext();

  let eggGroupsJson: EggGroupsJson | null = null;
  let imagesJson: ImageManifestJson | null = null;
  let imageMap: Map<number, string> = new Map();

  if (portable?.hasDataDir) {
    try {
      eggGroupsJson = JSON.parse(
        await readPortableText("rocom_data/rocom_egg_groups.json")
      ) as EggGroupsJson;
      imagesJson = JSON.parse(
        await readPortableText("rocom_data/rocom_entry_images_manifest.json")
      ) as ImageManifestJson;
      imageMap = new Map(
        imagesJson.entries.map((entry) => [
          entry.entryId,
          toPortableFileUrl(
            `${portable.dataDir}\\images\\by_entry_id\\${entry.imageFile}`
          )
        ])
      );
    } catch {
      eggGroupsJson = null;
      imagesJson = null;
      imageMap = new Map();
    }
  }

  if (!eggGroupsJson || !imagesJson) {
    const [eggGroupsResponse, imagesResponse] = await Promise.all([
      fetch("/rocom_data/rocom_egg_groups.json"),
      fetch("/rocom_data/rocom_entry_images_manifest.json")
    ]);

    eggGroupsJson = (await eggGroupsResponse.json()) as EggGroupsJson;
    imagesJson = (await imagesResponse.json()) as ImageManifestJson;
    imageMap = new Map(
      imagesJson.entries.map((entry) => [
        entry.entryId,
        `/rocom_data/images/by_entry_id/${entry.imageFile}`
      ])
    );
  }

  cachedEntries = eggGroupsJson.entries.map((entry) => ({
    entryId: entry.entryIndex,
    petId: entry.id,
    name: entry.name,
    eggGroups: entry.eggGroups,
    imagePath:
      imageMap.get(entry.entryIndex) ??
      (
        portable?.hasDataDir
          ? toPortableFileUrl(
              `${portable.dataDir}\\images\\by_entry_id\\${String(entry.entryIndex).padStart(4, "0")}.png`
            )
          : `/rocom_data/images/by_entry_id/${String(entry.entryIndex).padStart(4, "0")}.png`
      )
  }));
  cachedEggGroups = eggGroupsJson.eggGroups;

  return {
    entries: cachedEntries,
    eggGroups: cachedEggGroups
  };
}
