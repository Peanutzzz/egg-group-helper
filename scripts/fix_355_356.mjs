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

async function main() {
  const eggJson = JSON.parse(stripBom(await fs.readFile(eggGroupsPath, "utf8")));
  const manifestJson = JSON.parse(stripBom(await fs.readFile(manifestPath, "utf8")));

  const snowMonster = eggJson.entries.find((entry) => entry.id === 355 && entry.name === "雪怪");
  if (!snowMonster) {
    throw new Error("未找到 355 雪怪。");
  }

  let flameKid = eggJson.entries.find((entry) => entry.id === 356 && entry.name === "爆焰仔");
  const nextEntryIndex =
    Math.max(...eggJson.entries.map((entry) => Number(entry.entryIndex) || 0)) + 1;
  if (!flameKid) {
    flameKid = {
      entryIndex: nextEntryIndex,
      id: 356,
      name: "爆焰仔",
      eggGroups: [],
      height: "",
      weight: "",
      detailUrl: "https://wiki.biligame.com/rocom/%E7%88%86%E7%84%B0%E4%BB%94"
    };
    eggJson.entries.push(flameKid);
  } else {
    const duplicateEntryIndex = eggJson.entries.filter(
      (entry) => entry.entryIndex === flameKid.entryIndex
    );
    if (duplicateEntryIndex.length > 1) {
      flameKid.entryIndex = nextEntryIndex;
    }
  }

  snowMonster.imageMissing = true;

  const snowManifest = manifestJson.entries.find(
    (entry) => entry.id === 355 && entry.name === "雪怪"
  );
  if (snowManifest) {
    snowManifest.imageUrl = "";
    snowManifest.imageBytes = 0;
    snowManifest.height = snowMonster.height ?? "";
    snowManifest.weight = snowMonster.weight ?? "";
    snowManifest.detailUrl = snowMonster.detailUrl ?? "";
  }

  let flameManifest = manifestJson.entries.find(
    (entry) => entry.id === 356 && entry.name === "爆焰仔"
  );
  if (!flameManifest) {
    flameManifest = {
      entryId: flameKid.entryIndex,
      entryIndex: flameKid.entryIndex,
      id: 356,
      name: "爆焰仔",
      eggGroups: [],
      imageFile: `${String(flameKid.entryIndex).padStart(4, "0")}.png`,
      imageRelativePath: `rocom_images/by_entry_id/${String(flameKid.entryIndex).padStart(4, "0")}.png`,
      imageUrl: "https://patchwiki.biligame.com/images/rocom/e/e4/pd01mne2ugswj9qumyujbjjxh5qqi5y.png",
      imageBytes: 0,
      height: "",
      weight: "",
      detailUrl: flameKid.detailUrl
    };
    manifestJson.entries.push(flameManifest);
  } else {
    flameManifest.entryId = flameKid.entryIndex;
    flameManifest.entryIndex = flameKid.entryIndex;
    flameManifest.imageFile = `${String(flameKid.entryIndex).padStart(4, "0")}.png`;
    flameManifest.imageRelativePath = `rocom_images/by_entry_id/${String(flameKid.entryIndex).padStart(4, "0")}.png`;
  }

  const targetPath = path.join(imageDir, flameManifest.imageFile);
  try {
    await fs.access(targetPath);
  } catch {
    const response = await fetch(flameManifest.imageUrl, {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });
    if (!response.ok) {
      throw new Error(`下载爆焰仔图片失败：${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(targetPath, bytes);
    flameManifest.imageBytes = bytes.length;
  }

  try {
    const stat = await fs.stat(targetPath);
    flameManifest.imageBytes = stat.size;
  } catch {
    flameManifest.imageBytes = 0;
  }

  try {
    await fs.unlink(path.join(imageDir, `${String(snowMonster.entryIndex).padStart(4, "0")}.png`));
  } catch {
    // Ignore missing local snow monster image; user will补 later.
  }

  manifestJson.stats = {
    ...manifestJson.stats,
    entryCount: manifestJson.entries.length,
    downloadedImageCount: manifestJson.entries.filter((entry) => entry.imageBytes > 0).length,
    totalBytes: manifestJson.entries.reduce((sum, entry) => sum + (entry.imageBytes ?? 0), 0)
  };
  manifestJson.stats.totalMB =
    Math.round((manifestJson.stats.totalBytes / 1024 / 1024) * 100) / 100;

  eggJson.stats = {
    ...eggJson.stats,
    entryCount: eggJson.entries.length,
    uniqueIdCount: new Set(eggJson.entries.map((entry) => entry.id)).size,
    uniqueNameCount: new Set(eggJson.entries.map((entry) => entry.name)).size
  };

  eggJson.entries.sort((left, right) => left.entryIndex - right.entryIndex);
  manifestJson.entries.sort((left, right) => left.entryIndex - right.entryIndex);

  await fs.writeFile(eggGroupsPath, `${JSON.stringify(eggJson, null, 2)}\n`, "utf8");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifestJson, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        snowMonsterEntryIndex: snowMonster.entryIndex,
        flameKidEntryIndex: flameKid.entryIndex,
        snowImageCleared: true,
        flameImageFile: flameManifest.imageFile
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
