import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "public", "rocom_data");
const imageDir = path.join(dataDir, "images", "by_entry_id");
const eggGroupsPath = path.join(dataDir, "rocom_egg_groups.json");
const manifestPath = path.join(dataDir, "rocom_entry_images_manifest.json");

const listUrl =
  "https://wiki.biligame.com/rocom/%E7%B2%BE%E7%81%B5%E5%9B%BE%E9%89%B4";

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function decodeHtml(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeImageUrl(url) {
  const match = url.match(
    /^https:\/\/patchwiki\.biligame\.com\/images\/rocom\/thumb\/(.+?)\/\d+px-[^/]+$/i
  );
  if (!match) {
    return url;
  }

  return `https://patchwiki.biligame.com/images/rocom/${match[1]}`;
}

function buildEntryKey(entry) {
  return `${entry.id}|${entry.name}`;
}

function formatPhysique(value, unit) {
  if (!value || !unit) return "";
  return `${value.trim()} ${unit.trim()}`.trim();
}

function parsePokedexItems(html) {
  const pattern =
    /<p class="rocom_prop_name new_page_link block_1"><a href="(?<href>\/rocom\/[^"]+)" title="(?<title>[^"]+)"><span[^>]*>NO\.(?<id>\d{3,4})<\/span><\/a><\/p>\s*<p class="rocom_prop_name new_page_link block_2"><a href="\/rocom\/[^"]+" title="[^"]+"><span[^>]*>(?<name>[^<]+)<\/span><\/a><\/p>[\s\S]*?<div style="position:relative;"><a href="\/rocom\/[^"]+" title="[^"]+"><img alt="[^"]+" src="(?<img>[^"]+)"/g;

  const matches = [...html.matchAll(pattern)];
  return matches.map((match) => ({
    id: Number.parseInt(match.groups.id, 10),
    name: decodeHtml(match.groups.name.trim()),
    detailUrl: `https://wiki.biligame.com${match.groups.href}`,
    imageUrl: normalizeImageUrl(match.groups.img)
  }));
}

function parsePhysique(html) {
  const pattern =
    /rocom_sprite_info_physique_icon[\s\S]*?<p>([^<]+)<\/p>\s*<p class="font-runeregular">([^<]+)<\/p>/g;
  const matches = [...html.matchAll(pattern)];
  if (matches.length < 2) {
    return {
      height: "",
      weight: ""
    };
  }

  return {
    height: formatPhysique(matches[0][1], matches[0][2]),
    weight: formatPhysique(matches[1][1], matches[1][2])
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  return response.text();
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Image fetch failed ${response.status}: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

async function main() {
  const eggJson = JSON.parse(stripBom(await fs.readFile(eggGroupsPath, "utf8")));
  const manifestJson = JSON.parse(stripBom(await fs.readFile(manifestPath, "utf8")));

  const listHtml = await fetchText(listUrl);
  const pokedexItems = parsePokedexItems(listHtml);

  if (pokedexItems.length === 0) {
    throw new Error("未能从图鉴页解析出精灵条目。");
  }

  const existingByKey = new Map(
    eggJson.entries.map((entry) => [buildEntryKey(entry), entry])
  );
  const manifestByEntryId = new Map(
    manifestJson.entries.map((entry) => [entry.entryId, entry])
  );

  const detailCache = new Map();
  for (const item of pokedexItems) {
    const detailHtml = await fetchText(item.detailUrl);
    detailCache.set(buildEntryKey(item), parsePhysique(detailHtml));
  }

  let nextEntryIndex =
    Math.max(...eggJson.entries.map((entry) => entry.entryIndex)) + 1;
  const addedEntries = [];

  for (const item of pokedexItems) {
    const key = buildEntryKey(item);
    const physique = detailCache.get(key) ?? { height: "", weight: "" };
    const existing = existingByKey.get(key);

    if (existing) {
      existing.height = physique.height;
      existing.weight = physique.weight;
      existing.detailUrl = item.detailUrl;

      const existingManifest = manifestByEntryId.get(existing.entryIndex);
      continue;
    }

    const entryIndex = nextEntryIndex++;
    const newEntry = {
      entryIndex,
      id: item.id,
      name: item.name,
      eggGroups: [],
      height: physique.height,
      weight: physique.weight,
      detailUrl: item.detailUrl
    };
    eggJson.entries.push(newEntry);
    addedEntries.push({ ...newEntry, imageUrl: item.imageUrl });
    existingByKey.set(key, newEntry);

    manifestJson.entries.push({
      entryId: entryIndex,
      id: item.id,
      name: item.name,
      imageFile: `${String(entryIndex).padStart(4, "0")}.png`
    });
  }

  for (const entry of addedEntries) {
    const imageFile = `${String(entry.entryIndex).padStart(4, "0")}.png`;
    const imagePath = path.join(imageDir, imageFile);
    await downloadImage(entry.imageUrl, imagePath);
  }

  eggJson.entries.sort((left, right) => left.entryIndex - right.entryIndex);
  manifestJson.entries.sort((left, right) => left.entryId - right.entryId);

  const uniqueIds = new Set(eggJson.entries.map((entry) => entry.id));
  const duplicateIdCount = [...eggJson.entries.reduce((map, entry) => {
    map.set(entry.id, (map.get(entry.id) ?? 0) + 1);
    return map;
  }, new Map()).values()].filter((count) => count > 1).length;

  eggJson.schemaVersion = Math.max(eggJson.schemaVersion ?? 1, 2);
  eggJson.source = {
    ...eggJson.source,
    page: "蛋组计算器 + 精灵图鉴",
    url: [
      "https://wiki.biligame.com/rocom/%E8%9B%8B%E7%BB%84%E8%AE%A1%E7%AE%97%E5%99%A8",
      listUrl
    ],
    fetchedAt: new Date().toISOString()
  };
  eggJson.notes = [
    "蛋组数据基于蛋组计算器页面整理。",
    "图鉴缺失精灵基于精灵图鉴页面补全。",
    "身高与体重来自各精灵详情页中的 rocom_sprite_info_physique 区块。",
    "新增精灵的蛋组暂留空，待后续人工补充。"
  ];
  eggJson.stats = {
    entryCount: eggJson.entries.length,
    uniqueIdCount: uniqueIds.size,
    duplicateIdCount,
    uniqueNameCount: new Set(eggJson.entries.map((entry) => entry.name)).size,
    eggGroupCount: eggJson.eggGroups.length
  };
  manifestJson.schemaVersion = Math.max(manifestJson.schemaVersion ?? 1, 2);
  manifestJson.source = {
    page: "蛋组计算器 + 精灵图鉴",
    url: [
      "https://wiki.biligame.com/rocom/%E8%9B%8B%E7%BB%84%E8%AE%A1%E7%AE%97%E5%99%A8",
      listUrl
    ],
    fetchedAt: new Date().toISOString()
  };
  manifestJson.notes = [
    "entryId 与 rocom_egg_groups.json 中的 entryIndex 相同。",
    "新增图片来自精灵图鉴页面卡片中的立绘资源。",
    "名称仅用于校验和展示，不作为图片文件主键。"
  ];
  manifestJson.stats = {
    entryCount: manifestJson.entries.length
  };

  await fs.writeFile(eggGroupsPath, `${JSON.stringify(eggJson, null, 2)}\n`, "utf8");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifestJson, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        parsedPokedexItems: pokedexItems.length,
        totalEntries: eggJson.entries.length,
        addedEntries: addedEntries.length
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
