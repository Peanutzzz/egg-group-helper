# rocom_data 说明

本目录用于存放程序运行时读取的图鉴、蛋组、图片和特殊词条数据。

## 目录结构

- `rocom_egg_groups.json`
  主数据文件。用于保存每只精灵的基础图鉴数据。
- `rocom_entry_images_manifest.json`
  图片清单与图片文件映射。用于把 `entryIndex / entryId` 和本地图片文件对应起来。
- `rocom_special_traits.json`
  特殊词条库。程序中的“特殊”选项从这里读取。
- `images/by_entry_id/*.png`
  图鉴图片文件，按 `entryId` 命名。

## 各文件作用

### 1. rocom_egg_groups.json

这是最重要的主数据文件。

每条 `entries` 记录主要包含：

- `entryIndex`
  当前程序内部使用的唯一条目编号。会对应图片文件和图片清单中的 `entryId`。
- `id`
  图鉴编号，也就是 `NO.xxx`。
- `name`
  精灵中文名。带形态的精灵也保留完整中文名。
- `eggGroups`
  蛋组数组。允许为空数组，表示尚未补完。
- `height`
  身高文本，例如 `0.35~0.47 M`。
- `weight`
  体重文本，例如 `2.90~4.15 KG`。
- `detailUrl`
  对应 Wiki 详情页链接。

程序中的图鉴查询、父种查询、统计页图鉴定位等功能，都会读取这里的基础数据。

说明：

- 当前版本中不再维护 `indexes` 字段。
- 程序运行时直接遍历 `entries`，不依赖额外索引表。

### 2. rocom_entry_images_manifest.json

这是图片映射清单。

当前版本中，它只保留程序运行实际需要的最小字段。

每条 `entries` 记录主要包含：

- `entryId`
  与 `rocom_egg_groups.json` 中的 `entryIndex` 对应。
- `id`
  图鉴编号，也就是 `NO.xxx`。
- `name`
  精灵中文名。
- `imageFile`
  对应本地图片文件名，例如 `0438.png`。

程序加载图片时主要依赖这个文件和 `images/by_entry_id` 目录。

### 3. rocom_special_traits.json

这里维护程序中的“特殊”词条列表。

例如：

```json
{
  "schemaVersion": 1,
  "specialTraits": ["大块头", "婉转声", "异色", "炫彩"]
}
```

如果要新增“特殊”词条，直接在 `specialTraits` 数组里追加中文名称即可。

注意：

- 可以调整顺序，只会影响界面显示顺序。
- 不建议随意修改已有词条的中文名称，否则旧用户数据里的对应词条会失配。

## 手动补数据时改哪个文件

### 补蛋组

优先改：

- `rocom_egg_groups.json`

直接找到目标精灵的 `entries` 记录，修改 `eggGroups` 数组即可。

示例：

```json
{
  "entryIndex": 281,
  "id": 220,
  "name": "海枝枝（碧蓝珊瑚）",
  "eggGroups": ["海洋组", "植物组"],
  "height": "0.35~0.47 M",
  "weight": "2.90~4.15 KG",
  "detailUrl": "https://wiki.biligame.com/rocom/..."
}
```

说明：

- 蛋组顺序不影响程序逻辑。
- 但蛋组中文名称必须与现有名称一致。
- 如果一只精灵有两个蛋组，请都填入数组。

### 补身高体重

优先改：

- `rocom_egg_groups.json`

身高体重现在只保存在主数据文件 `rocom_egg_groups.json` 中。

格式示例：

- `height`: `0.35~0.47 M`
- `weight`: `2.90~4.15 KG`

注意：

- 单位请保留为 `M` 和 `KG`
- 范围值直接按页面原文填写即可
- 程序只把身高体重当作图鉴展示信息，不写入用户存档

## 手动补录建议流程

### 补蛋组

1. 打开 `rocom_egg_groups.json`
2. 搜索目标精灵的 `name` 或 `id`
3. 修改对应条目的 `eggGroups`
4. 保存文件

### 补身高体重

1. 打开 `missing_physique_fill_template.txt`
2. 先整理缺失编号的身高体重
3. 再把结果同步回 `rocom_egg_groups.json`

## entryIndex / entryId 说明

- `rocom_egg_groups.json` 中使用 `entryIndex`
- `rocom_entry_images_manifest.json` 中使用 `entryId`
- 这两个值在当前数据里应当一一对应
- 图片文件名也按这个编号命名，例如：
  - `0438.png` 对应 `entryIndex / entryId = 438`

如果后续删除或插入条目，需要同步调整：

- `rocom_egg_groups.json` 的 `entryIndex`
- `rocom_entry_images_manifest.json` 的 `entryId` 和 `imageFile`
- `images/by_entry_id` 中对应的图片文件名

## 当前维护约定

- 蛋组可以手动补，顺序不影响逻辑
- 身高体重优先从 Wiki 详情页获取
- 如果同编号的某个形态已经有身高体重，允许同编号其他形态直接共用
- 用户存档 `rocom-user-data.json` 不保存身高体重，它们只用于图鉴展示
