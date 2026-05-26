import {
  type EggGroupsJson,
  type ImageManifestJson,
  type PetEntry,
  type SpecialTraitsJson
} from "./types";
import {
  getPortableContext,
  readPortableText,
  toPortableFileUrl
} from "./portable";

let cachedEntries: PetEntry[] | null = null;
let cachedEggGroups: string[] | null = null;
let cachedSpecialTraits: string[] | null = null;

export async function loadPetData(): Promise<{
  entries: PetEntry[];
  eggGroups: string[];
  specialTraits: string[];
}> {
  if (cachedEntries && cachedEggGroups && cachedSpecialTraits) {
    return {
      entries: cachedEntries,
      eggGroups: cachedEggGroups,
      specialTraits: cachedSpecialTraits
    };
  }

  const portable = await getPortableContext();

  let eggGroupsJson: EggGroupsJson | null = null;
  let imagesJson: ImageManifestJson | null = null;
  let specialTraitsJson: SpecialTraitsJson | null = null;
  let imageMap: Map<number, string> = new Map();
  let imageFallbackMap: Map<number, string> = new Map();

  if (portable?.hasDataDir) {
    try {
      eggGroupsJson = JSON.parse(
        await readPortableText("rocom_data/rocom_egg_groups.json")
      ) as EggGroupsJson;
      imagesJson = JSON.parse(
        await readPortableText("rocom_data/rocom_entry_images_manifest.json")
      ) as ImageManifestJson;
      specialTraitsJson = JSON.parse(
        await readPortableText("rocom_data/rocom_special_traits.json")
      ) as SpecialTraitsJson;
      imageMap = new Map(
        imagesJson.entries.map((entry) => [
          entry.entryId,
          `./rocom_data/images/by_entry_id/${entry.imageFile}`
        ])
      );
      imageFallbackMap = new Map(
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
      specialTraitsJson = null;
      imageMap = new Map();
      imageFallbackMap = new Map();
    }
  }

  if (!eggGroupsJson || !imagesJson || !specialTraitsJson) {
    const [eggGroupsResponse, imagesResponse, specialTraitsResponse] = await Promise.all([
      fetch("/rocom_data/rocom_egg_groups.json"),
      fetch("/rocom_data/rocom_entry_images_manifest.json"),
      fetch("/rocom_data/rocom_special_traits.json")
    ]);

    eggGroupsJson = (await eggGroupsResponse.json()) as EggGroupsJson;
    imagesJson = (await imagesResponse.json()) as ImageManifestJson;
    specialTraitsJson = (await specialTraitsResponse.json()) as SpecialTraitsJson;
    imageMap = new Map(
      imagesJson.entries.map((entry) => [
        entry.entryId,
        `/rocom_data/images/by_entry_id/${entry.imageFile}`
      ])
    );
    imageFallbackMap = new Map();
  }

  cachedEntries = eggGroupsJson.entries.map((entry) => ({
    entryId: entry.entryIndex,
    petId: entry.id,
    name: entry.name,
    eggGroups: entry.eggGroups,
    height: entry.height ?? "",
    weight: entry.weight ?? "",
    detailUrl: entry.detailUrl ?? "",
    imagePath:
      imageMap.get(entry.entryIndex) ??
      (
        portable?.hasDataDir
          ? `./rocom_data/images/by_entry_id/${String(entry.entryIndex).padStart(4, "0")}.png`
          : `/rocom_data/images/by_entry_id/${String(entry.entryIndex).padStart(4, "0")}.png`
      ),
    imageFallbackPath:
      imageFallbackMap.get(entry.entryIndex) ??
      (
        portable?.hasDataDir
          ? toPortableFileUrl(
              `${portable.dataDir}\\images\\by_entry_id\\${String(entry.entryIndex).padStart(4, "0")}.png`
            )
          : undefined
      )
  }));
  cachedEggGroups = eggGroupsJson.eggGroups;
  cachedSpecialTraits = specialTraitsJson.specialTraits;

  return {
    entries: cachedEntries,
    eggGroups: cachedEggGroups,
    specialTraits: cachedSpecialTraits
  };
}
