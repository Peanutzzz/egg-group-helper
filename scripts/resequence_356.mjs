import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "public", "rocom_data");
const eggGroupsPath = path.join(dataDir, "rocom_egg_groups.json");
const manifestPath = path.join(dataDir, "rocom_entry_images_manifest.json");
const imageDir = path.join(dataDir, "images", "by_entry_id");

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function imageFileFor(entryIndex) {
  return `${String(entryIndex).padStart(4, "0")}.png`;
}

async function moveIfExists(fromPath, toPath) {
  try {
    await fs.access(fromPath);
  } catch {
    return false;
  }
  await fs.rename(fromPath, toPath);
  return true;
}

async function main() {
  const eggJson = JSON.parse(stripBom(await fs.readFile(eggGroupsPath, "utf8")));
  const manifestJson = JSON.parse(stripBom(await fs.readFile(manifestPath, "utf8")));

  const flame = eggJson.entries.find((entry) => entry.id === 356 && entry.name === "爆焰仔");
  if (!flame) {
    throw new Error("未找到 356 爆焰仔。");
  }

  const flameManifest = manifestJson.entries.find(
    (entry) => entry.id === 356 && entry.name === "爆焰仔"
  );
  if (!flameManifest) {
    throw new Error("未找到 356 爆焰仔的图片清单记录。");
  }

  const shiftStart = 487;
  const shiftEnd = 527;
  const desiredIndex = 487;

  const flameCurrentIndex = flame.entryIndex;
  if (flameCurrentIndex === desiredIndex) {
    console.log(JSON.stringify({ changed: false, reason: "already resequenced" }, null, 2));
    return;
  }

  const tempImagePath = path.join(imageDir, "__356_temp.png");
  const flameCurrentImagePath = path.join(imageDir, imageFileFor(flameCurrentIndex));
  await moveIfExists(flameCurrentImagePath, tempImagePath);

  for (let index = shiftEnd; index >= shiftStart; index -= 1) {
    const fromPath = path.join(imageDir, imageFileFor(index));
    const toPath = path.join(imageDir, imageFileFor(index + 1));
    await moveIfExists(fromPath, toPath);
  }

  await moveIfExists(tempImagePath, path.join(imageDir, imageFileFor(desiredIndex)));

  for (const entry of eggJson.entries) {
    if (entry === flame) continue;
    if (entry.entryIndex >= shiftStart && entry.entryIndex <= shiftEnd) {
      entry.entryIndex += 1;
    }
  }
  flame.entryIndex = desiredIndex;

  for (const entry of manifestJson.entries) {
    if (entry.id === 356 && entry.name === "爆焰仔") continue;
    if (entry.entryIndex >= shiftStart && entry.entryIndex <= shiftEnd) {
      entry.entryIndex += 1;
      entry.entryId = entry.entryIndex;
      entry.imageFile = imageFileFor(entry.entryIndex);
      entry.imageRelativePath = `rocom_images/by_entry_id/${entry.imageFile}`;
    }
  }

  flameManifest.entryIndex = desiredIndex;
  flameManifest.entryId = desiredIndex;
  flameManifest.imageFile = imageFileFor(desiredIndex);
  flameManifest.imageRelativePath = `rocom_images/by_entry_id/${flameManifest.imageFile}`;

  try {
    const stat = await fs.stat(path.join(imageDir, flameManifest.imageFile));
    flameManifest.imageBytes = stat.size;
  } catch {
    flameManifest.imageBytes = 0;
  }

  eggJson.entries.sort((left, right) => left.entryIndex - right.entryIndex);
  manifestJson.entries.sort((left, right) => left.entryIndex - right.entryIndex);

  eggJson.indexes = undefined;
  eggJson.indexes = {
    byEntryIndex: Object.fromEntries(eggJson.entries.map((entry) => [entry.entryIndex, entry.name])),
    byId: eggJson.entries.reduce((acc, entry) => {
      if (!acc[entry.id]) acc[entry.id] = [];
      acc[entry.id].push(entry.entryIndex);
      return acc;
    }, {}),
    byEggGroup: eggJson.eggGroups.reduce((acc, group) => {
      acc[group] = eggJson.entries
        .filter((entry) => entry.eggGroups.includes(group))
        .map((entry) => entry.entryIndex);
      return acc;
    }, {})
  };

  await fs.writeFile(eggGroupsPath, `${JSON.stringify(eggJson, null, 2)}\n`, "utf8");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifestJson, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        changed: true,
        flameOldIndex: flameCurrentIndex,
        flameNewIndex: desiredIndex,
        shiftedRange: [shiftStart, shiftEnd]
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
