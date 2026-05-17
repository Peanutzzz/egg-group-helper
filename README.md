# 蛋种助手

`蛋种助手` 是一个基于 `Tauri + React + TypeScript` 的本地桌面工具，用于管理精灵蛋组、登记已有配置、查询父种，以及统计当前配置覆盖情况。

## 许可证

本仓库中的代码部分采用 [MIT](./LICENSE) 许可证。

注意：

- 代码许可证仅适用于本项目的源代码
- 数据与图片资源仍应遵循下文所述的数据来源规范与 `CC BY-NC-SA 4.0` 要求

## 功能

- 登记精灵配置：支持按中文名或序号模糊搜索，登记性格、3 项个体值和奖章
- 查询父种：根据目标精灵和目标配置，从已登记记录中查找可用父种
- 推荐抓取：在缺少合适父种时，按当前配置下的缺口蛋组推荐候选精灵
- 统计信息：按蛋组与配置组合查看覆盖情况，并支持纯奖章统计模式

## 数据资源

项目内置以下本地数据资源：

- `public/rocom_data/rocom_egg_groups.json`
- `public/rocom_data/rocom_entry_images_manifest.json`
- `public/rocom_data/images/by_entry_id/*.png`

图片文件通过数据中的唯一记录索引与精灵条目对应。

## 数据来源与授权

本项目使用的数据来源于 Biligame 洛克王国 Wiki：

- 来源页面：
  `https://wiki.biligame.com/rocom/%E5%85%B6%E4%BB%96`
- 协议页面：
  `https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans`

原站说明包含以下要求：

- WIKI 编辑不易，欢迎使用数据，但请标注来源
- 规范转载需注明来源链接
- 自动授权协议：`CC BY-NC-SA 4.0`
  （署名 - 非商业性使用 - 相同方式共享）

因此，如果你继续分发、转载或改编本项目所附带的数据资源，请至少遵守以下规范：

- 保留来源说明，并注明原始来源链接
- 不得将相关数据资源用于未经许可的商业用途
- 若继续分发或改编，应按相同方式共享

## 开发环境

- Node.js 18+
- Rust stable
- Tauri 2

Windows 下首次使用 Tauri 时，还需要安装对应的 WebView2 和 C++ Build Tools。

## 本地启动

```powershell
npm install
npm run tauri -- dev
```

如果只想启动前端开发服务器：

```powershell
npm run dev
```

## 构建

```powershell
npm run build
npm run tauri -- build
```

## 压缩包分发

如果你打算以压缩包形式分发给 Windows 用户，建议直接基于 Tauri 构建后的可执行文件进行打包。

推荐说明文案如下：

- 解压压缩包后，直接运行 `蛋种助手.exe` 即可
- 不需要额外安装 Node.js、Rust 或其他开发环境
- 如果程序无法启动，请先确认系统已安装 `Microsoft Edge WebView2 Runtime`

推荐的压缩包目录结构如下：

```text
蛋种助手/
├─ 蛋种助手.exe
├─ README.md
├─ LICENSE
├─ rocom-user-data.json
└─ rocom_data/
   ├─ rocom_egg_groups.json
   ├─ rocom_entry_images_manifest.json
   └─ images/
      └─ by_entry_id/
```

说明：

- `蛋种助手.exe`：程序本体
- `rocom_data/`：程序运行所需的数据与图片资源
- `rocom-user-data.json`：便携版用户配置文件；由打包脚本基于默认模板生成
- `README.md` / `LICENSE`：建议一并放入压缩包