import { useEffect, useMemo, useState } from "react";
import { AppProvider, useAppContext } from "./lib/app-context";
import { ConfigEditor } from "./components/ConfigEditor";
import { PetCard } from "./components/PetCard";
import { SearchPicker } from "./components/SearchPicker";
import { EMPTY_PERSONALITY, MEDAL_ONLY_COLUMNS } from "./lib/constants";
import {
  buildCatchRecommendations,
  dedupeRecommendationsByPetId,
  buildParentMatches,
  formatEggGroups,
  formatMedals,
  formatPersonality,
  formatPetLabel,
  getCellRecords,
  getMedalCellRecords,
  getMedalColumns,
  petMatchesKeyword,
  validateConfig
} from "./lib/logic";
import "./styles/app.css";
import {
  type LookupConfig,
  type MedalName,
  type PetEntry,
  type RegisteredPetRecord,
  type StatsMode
} from "./lib/types";

const INITIAL_CONFIG: LookupConfig = {
  personality: {
    increase: EMPTY_PERSONALITY.increase,
    decrease: EMPTY_PERSONALITY.decrease
  },
  ivs: ["生命", "物防", "魔防"],
  medals: []
};

type TabKey = "register" | "lookup" | "stats" | "records" | "about";

function cloneConfig(config: LookupConfig): LookupConfig {
  return {
    personality: { ...config.personality },
    ivs: [...config.ivs],
    medals: [...config.medals]
  };
}

function formatStatsEggGroupLabel(eggGroup: string): string {
  return eggGroup.endsWith("组") ? eggGroup.slice(0, -1) : eggGroup;
}

function Shell() {
  const {
    loading,
    loadError,
    entries,
    eggGroups,
    records,
    statCombos,
    addRecord,
    removeRecord,
    addCustomCombo,
    removeCustomCombo,
    preferredStatsMode,
    setPreferredStatsMode,
    selectedMedalFilter,
    setSelectedMedalFilter
  } = useAppContext();

  const visibleEggGroups = useMemo(
    () => eggGroups.filter((group) => group !== "无法孵蛋"),
    [eggGroups]
  );

  const [tab, setTab] = useState<TabKey>("register");
  const [registerTarget, setRegisterTarget] = useState<PetEntry | null>(null);
  const [lookupTarget, setLookupTarget] = useState<PetEntry | null>(null);
  const [registerConfig, setRegisterConfig] = useState<LookupConfig>(cloneConfig(INITIAL_CONFIG));
  const [lookupConfig, setLookupConfig] = useState<LookupConfig>(cloneConfig(INITIAL_CONFIG));
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [customComboConfig, setCustomComboConfig] = useState<LookupConfig>(cloneConfig(INITIAL_CONFIG));
  const [customComboMessage, setCustomComboMessage] = useState<string | null>(null);
  const [selectedEggGroup, setSelectedEggGroup] = useState<string | null>(null);
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  const [selectedMedalColumnId, setSelectedMedalColumnId] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [lookupRecommendationPage, setLookupRecommendationPage] = useState(1);
  const [isLookupRecommendationOpen, setIsLookupRecommendationOpen] = useState(false);
  const [lookupRecommendationEggGroupFilter, setLookupRecommendationEggGroupFilter] =
    useState<string>("全部");
  const [statsRecommendationPage, setStatsRecommendationPage] = useState(1);
  const [statsRecommendationEggGroupFilter, setStatsRecommendationEggGroupFilter] =
    useState<string>("全部");
  const [recordKeyword, setRecordKeyword] = useState("");
  const [recordEggGroupFilter, setRecordEggGroupFilter] = useState<string[]>(["全部"]);
  const [recordMedalFilter, setRecordMedalFilter] = useState<MedalName[]>([]);

  const lookupPageSize = 12;
  const statsPageSize = 10;

  const parentMatches = useMemo(() => {
    if (!lookupTarget) return [];
    return buildParentMatches(lookupTarget, lookupConfig, records);
  }, [lookupConfig, lookupTarget, records]);

  const lookupRecommendations = useMemo(() => {
    if (!lookupTarget) return [];
    return dedupeRecommendationsByPetId(
      buildCatchRecommendations(entries, visibleEggGroups, records, lookupConfig, {
        targetEggGroups: lookupTarget.eggGroups.filter((group) => group !== "无法孵蛋")
      })
    );
  }, [entries, visibleEggGroups, records, lookupConfig, lookupTarget]);

  const lookupRecommendationPageCount = Math.max(
    1,
    Math.ceil(
      lookupRecommendations.filter((item) =>
        lookupRecommendationEggGroupFilter === "全部"
          ? true
          : item.pet.eggGroups.includes(lookupRecommendationEggGroupFilter)
      ).length / lookupPageSize
    )
  );
  const filteredLookupRecommendations = lookupRecommendations.filter((item) =>
    lookupRecommendationEggGroupFilter === "全部"
      ? true
      : item.missingEggGroupsCovered.includes(lookupRecommendationEggGroupFilter)
  );
  const pagedLookupRecommendations = filteredLookupRecommendations.slice(
    (lookupRecommendationPage - 1) * lookupPageSize,
    lookupRecommendationPage * lookupPageSize
  );
  const lookupRecommendationEggGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    lookupRecommendations.forEach((item) => {
      item.missingEggGroupsCovered.forEach((group) => {
        if (group !== "无法孵蛋") {
          groups.add(group);
        }
      });
    });
    return ["全部", ...visibleEggGroups.filter((group) => groups.has(group))];
  }, [lookupRecommendations, visibleEggGroups]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesKeyword =
        !recordKeyword.trim() || petMatchesKeyword(record, recordKeyword) || record.name.includes(recordKeyword.trim());
      const matchesEggGroup =
        recordEggGroupFilter.includes("全部") ||
        recordEggGroupFilter.some((group) => record.eggGroups.includes(group));
      const matchesMedals = recordMedalFilter.every((medal) => record.medals.includes(medal));
      return matchesKeyword && matchesEggGroup && matchesMedals;
    });
  }, [recordEggGroupFilter, recordKeyword, recordMedalFilter, records]);

  const selectedCombo = statCombos.find((combo) => combo.id === selectedComboId) ?? null;
  const selectedMedalColumn =
    getMedalColumns().find((column) => column.id === selectedMedalColumnId) ?? null;

  const cellRecords =
    selectedEggGroup && selectedCombo
      ? getCellRecords(records, selectedEggGroup, selectedCombo, selectedMedalFilter)
      : [];
  const medalCellRecords =
    selectedEggGroup && selectedMedalColumn
      ? getMedalCellRecords(records, selectedEggGroup, selectedMedalColumn.requiredMedals)
      : [];

  const selectedRecommendationConfig = useMemo<LookupConfig | null>(() => {
    if (!selectedCombo) return null;
    return {
      personality: selectedCombo.personality,
      ivs: selectedCombo.ivs,
      medals: [...selectedMedalFilter]
    };
  }, [selectedCombo, selectedMedalFilter]);

  const rawStatsRecommendations = useMemo(() => {
    if (!selectedEggGroup || !selectedRecommendationConfig) return [];
    return dedupeRecommendationsByPetId(
      buildCatchRecommendations(
        entries,
        visibleEggGroups,
        records,
        selectedRecommendationConfig,
        { targetEggGroups: [selectedEggGroup] }
      )
    );
  }, [entries, visibleEggGroups, records, selectedEggGroup, selectedRecommendationConfig]);

  const statsRecommendationEggGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    rawStatsRecommendations.forEach((item) => {
      item.missingEggGroupsCovered.forEach((group) => {
        if (group !== "无法孵蛋") {
          groups.add(group);
        }
      });
    });
    return ["全部", ...visibleEggGroups.filter((group) => groups.has(group))];
  }, [rawStatsRecommendations, visibleEggGroups]);

  const statsRecommendations = useMemo(() => {
    if (statsRecommendationEggGroupFilter === "全部") {
      return rawStatsRecommendations;
    }
    return rawStatsRecommendations.filter((item) =>
      item.missingEggGroupsCovered.includes(statsRecommendationEggGroupFilter)
    );
  }, [rawStatsRecommendations, statsRecommendationEggGroupFilter]);

  const statsRecommendationPageCount = Math.max(
    1,
    Math.ceil(statsRecommendations.length / statsPageSize)
  );
  const pagedStatsRecommendations = statsRecommendations.slice(
    (statsRecommendationPage - 1) * statsPageSize,
    statsRecommendationPage * statsPageSize
  );

  useEffect(() => {
    setLookupRecommendationPage(1);
  }, [
    lookupTarget?.entryId,
    lookupConfig.personality.increase,
    lookupConfig.personality.decrease,
    lookupConfig.ivs.join("|"),
    lookupConfig.medals.join("|"),
    records.length
  ]);

  useEffect(() => {
    setLookupRecommendationEggGroupFilter("全部");
  }, [lookupTarget?.entryId, lookupConfig.personality.increase, lookupConfig.personality.decrease, lookupConfig.ivs.join("|"), lookupConfig.medals.join("|")]);

  useEffect(() => {
    setStatsRecommendationPage(1);
  }, [
    selectedEggGroup,
    selectedComboId,
    selectedMedalFilter.join("|"),
    statsRecommendationEggGroupFilter,
    records.length
  ]);

  useEffect(() => {
    setStatsRecommendationEggGroupFilter("全部");
  }, [selectedEggGroup, selectedComboId, selectedMedalColumnId]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-panel">
          <div className="loading-spinner" />
          <h1>正在加载蛋组与图片数据</h1>
          <p>首次启动会把全部精灵资料一次性载入，后续检索会更快。</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="loading-screen">
        <div className="loading-panel">
          <h1>数据加载失败</h1>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  async function handleRegister() {
    if (!registerTarget) {
      setRegisterMessage("请先选择要登记的精灵。");
      return;
    }

    const error = await addRecord(registerTarget, registerConfig);
    setRegisterMessage(error ?? `已登记 ${formatPetLabel(registerTarget)}。`);
  }

  async function handleCreateCombo() {
    const comboWithoutMedals: LookupConfig = {
      personality: customComboConfig.personality,
      ivs: customComboConfig.ivs,
      medals: []
    };

    const error = await addCustomCombo(comboWithoutMedals);
    if (error) {
      setCustomComboMessage(error);
      return;
    }

    setCustomComboConfig(cloneConfig(INITIAL_CONFIG));
    setCustomComboMessage("已添加到统计行。");
  }

  function toggleStatsMedal(medal: MedalName) {
    const exists = selectedMedalFilter.includes(medal);
    const next = exists
      ? selectedMedalFilter.filter((item) => item !== medal)
      : [...selectedMedalFilter, medal];
    void setSelectedMedalFilter(next);
  }

  function toggleRecordMedal(medal: MedalName) {
    const exists = recordMedalFilter.includes(medal);
    setRecordMedalFilter(
      exists
        ? recordMedalFilter.filter((item) => item !== medal)
        : [...recordMedalFilter, medal]
    );
  }

  function toggleRecordEggGroup(group: string) {
    if (group === "全部") {
      setRecordEggGroupFilter(["全部"]);
      return;
    }

    setRecordEggGroupFilter((current) => {
      const withoutAll = current.filter((item) => item !== "全部");
      if (withoutAll.includes(group)) {
        const next = withoutAll.filter((item) => item !== group);
        return next.length > 0 ? next : ["全部"];
      }
      return [...withoutAll, group];
    });
  }

  function closeStatsModal() {
    setIsStatsModalOpen(false);
    setSelectedEggGroup(null);
    setSelectedComboId(null);
    setSelectedMedalColumnId(null);
  }

  function closeLookupRecommendationModal() {
    setIsLookupRecommendationOpen(false);
  }

  function openDetailedCell(eggGroup: string, comboId: string) {
    setSelectedEggGroup(eggGroup);
    setSelectedComboId(comboId);
    setSelectedMedalColumnId(null);
    setIsStatsModalOpen(true);
  }

  function openMedalCell(eggGroup: string, medalColumnId: string) {
    setSelectedEggGroup(eggGroup);
    setSelectedMedalColumnId(medalColumnId);
    setSelectedComboId(null);
    setIsStatsModalOpen(true);
  }

  const customComboError = validateConfig(
    customComboConfig.personality,
    customComboConfig.ivs
  );

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__text">
          <h1>蛋种助手</h1>
          <p>
            快速登记精灵配置、查找父种、补充缺失蛋组父种，并统计你当前的蛋组和配置覆盖率
          </p>
        </div>
        <div className="hero__stats">
          <div>
            <strong>{records.length}</strong>
            <span>已登记记录</span>
          </div>
          <div>
            <strong>{entries.length}</strong>
            <span>图鉴精灵</span>
          </div>
          <div>
            <strong>{visibleEggGroups.length}</strong>
            <span>有效蛋组</span>
          </div>
        </div>
      </header>

      <nav className="tab-bar">
        <div className="tab-bar__group">
          {[
            ["register", "登记精灵"],
            ["lookup", "查询父种"],
            ["stats", "统计信息"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab-button ${tab === key ? "is-active" : ""}`}
              onClick={() => setTab(key as TabKey)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tab-bar__group tab-bar__group--right">
          {[
            ["records", "已登记精灵"],
            ["about", "关于本项目"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab-button ${tab === key ? "is-active" : ""}`}
              onClick={() => setTab(key as TabKey)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="page-stack">
        <section className={`page-panel ${tab === "register" ? "is-active" : ""}`}>
          <div className="two-column-layout">
            <div className="panel-stack">
              <SearchPicker
                label="选择要登记的精灵"
                value={registerTarget}
                onSelect={setRegisterTarget}
              />
              <ConfigEditor
                title="登记配置"
                value={registerConfig}
                onChange={setRegisterConfig}
              />
              <div className="field-card action-card">
                <button type="button" className="primary-button" onClick={handleRegister}>
                  写入本地用户数据
                </button>
                {registerMessage ? <div className="status-message">{registerMessage}</div> : null}
              </div>
            </div>

            <div className="panel-stack">
              <div className="field-card spotlight-card">
                {registerTarget ? (
                  <>
                    <img
                      className="spotlight-card__image"
                      src={registerTarget.imagePath}
                      alt={registerTarget.name}
                    />
                    <div className="spotlight-card__content">
                      <h2>{formatPetLabel(registerTarget)}</h2>
                      <p>{formatEggGroups(registerTarget.eggGroups)}</p>
                      <span>
                        {formatPersonality(registerConfig.personality)} ·{" "}
                        {registerConfig.ivs.join(" / ")} · {formatMedals(registerConfig.medals)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="empty-box">左侧选择一只精灵后，会在这里展示大图与蛋组。</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`page-panel ${tab === "lookup" ? "is-active" : ""}`}>
          <div className="two-column-layout">
            <div className="panel-stack">
              <SearchPicker
                label="选择目标精灵"
                value={lookupTarget}
                onSelect={setLookupTarget}
              />
              <ConfigEditor
                title="目标配置"
                value={lookupConfig}
                onChange={setLookupConfig}
              />
            </div>

            <div className="panel-stack">
              <div className="field-card">
                <div className="field-card__header">
                  <span>符合要求的父种</span>
                  {lookupTarget ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsLookupRecommendationOpen(true)}
                    >
                      推荐抓取列表
                    </button>
                  ) : null}
                </div>
                {lookupTarget ? (
                  <>
                    <div className="target-inline-card">
                      <img src={lookupTarget.imagePath} alt={lookupTarget.name} />
                      <div className="target-inline-card__content">
                        <strong>{formatPetLabel(lookupTarget)}</strong>
                        <span>{formatEggGroups(lookupTarget.eggGroups)}</span>
                        <div className="target-inline-card__personality">
                          <span className="stat-up">+{lookupConfig.personality.increase}</span>
                          <span className="combo-separator"> / </span>
                          <span className="stat-down">-{lookupConfig.personality.decrease}</span>
                        </div>
                        <span>{lookupConfig.ivs.join(" / ")}</span>
                        {lookupConfig.medals.length > 0 ? (
                          <div className="pet-card__medals">
                            {lookupConfig.medals.map((medal) => (
                              <span key={`lookup-target-${medal}`} className="pet-card__medal-chip">
                                {medal}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  <div className="record-list">
                      {parentMatches.length > 0 ? (
                        parentMatches.map((match) => (
                          <PetCard
                            key={match.record.recordId}
                            record={match.record}
                          />
                        ))
                      ) : (
                        <div className="empty-box">没有找到符合要求的父种，可以点右上角查看推荐抓取列表。</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-box">先选择目标精灵和配置。</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`page-panel ${tab === "stats" ? "is-active" : ""}`}>
          <div className="panel-stack">
            <div className="field-card toolbar-card">
              <div className="toolbar-card__row">
                <div className="toolbar-card__group">
                  <strong>统计模式</strong>
                  <div className="pill-group">
                    {[
                      ["detailed", "详细统计"],
                      ["medalOnly", "纯奖章"]
                    ].map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={`pill-button ${preferredStatsMode === mode ? "is-active" : ""}`}
                        onClick={() => void setPreferredStatsMode(mode as StatsMode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {preferredStatsMode === "detailed" ? (
              <div className="field-card">
                <div className="field-card__header">
                  <span>添加自定义统计行</span>
                </div>
                <ConfigEditor
                  title="新增统计组合"
                  value={customComboConfig}
                  onChange={(value) =>
                    setCustomComboConfig({
                      ...value,
                      medals: []
                    })
                  }
                  showMedals={false}
                />
                <div className="toolbar-card__row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleCreateCombo}
                    disabled={Boolean(customComboError)}
                  >
                    添加到统计行
                  </button>
                </div>
                {customComboMessage ? (
                  <div className="status-message">{customComboMessage}</div>
                ) : null}
              </div>
            ) : null}

            <div className="field-card">
              <div className="field-card__header">
                <span>覆盖统计表</span>
              </div>
              {preferredStatsMode === "detailed" ? (
                <div className="table-toolbar">
                  <strong>奖章过滤</strong>
                  <div className="pill-group">
                    {["大块头", "婉转声"].map((medal) => (
                      <button
                        key={medal}
                        type="button"
                        className={`pill-button ${
                          selectedMedalFilter.includes(medal as MedalName) ? "is-active" : ""
                        }`}
                        onClick={() => toggleStatsMedal(medal as MedalName)}
                      >
                        {medal}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="table-scroll">
                {preferredStatsMode === "detailed" ? (
                  <table className="coverage-table coverage-table--equal">
                    <thead>
                      <tr>
                        <th className="coverage-table__lead-column">性格 / 个体</th>
                        {visibleEggGroups.map((eggGroup) => (
                          <th key={eggGroup}>{formatStatsEggGroupLabel(eggGroup)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statCombos.map((combo) => (
                        <tr key={combo.id}>
                          <th className="combo-header-cell">
                            <div className="combo-header-cell__top">
                              <div>
                                <span className="combo-header-cell__personality">
                                  <span className="stat-up">+{combo.personality.increase}</span>
                                  <span className="combo-separator"> / </span>
                                  <span className="stat-down">-{combo.personality.decrease}</span>
                                </span>
                                <span className="combo-header-cell__ivs">{combo.ivs.join(" / ")}</span>
                              </div>
                              <button
                                type="button"
                                className="combo-delete-button"
                                onClick={() => void removeCustomCombo(combo.id)}
                                aria-label={`删除 ${combo.label}`}
                              >
                                ×
                              </button>
                            </div>
                          </th>
                          {visibleEggGroups.map((eggGroup) => {
                            const covered = getCellRecords(
                              records,
                              eggGroup,
                              combo,
                              selectedMedalFilter
                            );
                            return (
                              <td key={`${combo.id}-${eggGroup}`}>
                                <button
                                  type="button"
                                  className={`coverage-cell ${covered.length > 0 ? "is-covered" : "is-empty"}`}
                                  onClick={() => openDetailedCell(eggGroup, combo.id)}
                                >
                                  {covered.length > 0 ? `${covered.length}` : "×"}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="coverage-table coverage-table--equal">
                    <thead>
                      <tr>
                        <th>奖章条件</th>
                        {visibleEggGroups.map((eggGroup) => (
                          <th key={eggGroup}>{formatStatsEggGroupLabel(eggGroup)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MEDAL_ONLY_COLUMNS.map((column) => (
                        <tr key={column.id}>
                          <th className="combo-header-cell">
                            <span className="combo-header-cell__ivs">{column.label}</span>
                          </th>
                          {visibleEggGroups.map((eggGroup) => {
                            const covered = getMedalCellRecords(
                              records,
                              eggGroup,
                              column.requiredMedals
                            );
                            return (
                              <td key={`${column.id}-${eggGroup}`}>
                                <button
                                  type="button"
                                  className={`coverage-cell ${covered.length > 0 ? "is-covered" : "is-empty"}`}
                                  onClick={() => openMedalCell(eggGroup, column.id)}
                                >
                                  {covered.length > 0 ? `${covered.length}` : "×"}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`page-panel ${tab === "records" ? "is-active" : ""}`}>
          <div className="panel-stack">
            <div className="field-card toolbar-card">
              <div className="field-card__header">
                <span>已登记精灵</span>
                <span className="field-card__hint">共 {filteredRecords.length} 条结果</span>
              </div>
              <div className="records-filter-grid">
                <label className="toolbar-card__group">
                  <span>名称 / 序号</span>
                  <input
                    className="app-input"
                    value={recordKeyword}
                    onChange={(event) => setRecordKeyword(event.target.value)}
                    placeholder="输入精灵名或序号"
                  />
                </label>
                <label className="toolbar-card__group">
                  <span>蛋组筛选</span>
                  <div className="pill-group">
                    {["全部", ...visibleEggGroups].map((eggGroup) => (
                      <button
                        key={`record-group-${eggGroup}`}
                        type="button"
                        className={`pill-button ${
                          recordEggGroupFilter.includes(eggGroup) ? "is-active" : ""
                        }`}
                        onClick={() => toggleRecordEggGroup(eggGroup)}
                      >
                        {eggGroup}
                      </button>
                    ))}
                  </div>
                </label>
                <div className="toolbar-card__group">
                  <span>奖章筛选</span>
                  <div className="pill-group">
                    {["大块头", "婉转声"].map((medal) => (
                      <button
                        key={`record-${medal}`}
                        type="button"
                        className={`pill-button ${
                          recordMedalFilter.includes(medal as MedalName) ? "is-active" : ""
                        }`}
                        onClick={() => toggleRecordMedal(medal as MedalName)}
                      >
                        {medal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="field-card">
              <div className="record-list">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <PetCard key={record.recordId} record={record} onRemove={removeRecord} />
                  ))
                ) : (
                  <div className="empty-box">当前筛选条件下没有已登记记录。</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`page-panel ${tab === "about" ? "is-active" : ""}`}>
          <div className="panel-stack">
            <div className="field-card">
              <div className="field-card__header">
                <span>数据来源</span>
              </div>
              <div className="info-page">
                <p>
                  本项目使用的数据来源于 Biligame 洛克王国 Wiki
                  <a
                    href="https://wiki.biligame.com/rocom"
                    target="_blank"
                    rel="noreferrer"
                  >
                    https://wiki.biligame.com/rocom
                  </a>
                </p>
                <p>
                  对数据的转载和引用请遵循数据来源规范。
                </p>
              </div>
            </div>

            <div className="field-card">
              <div className="field-card__header">
                <span>协议与规范</span>
              </div>
              <div className="info-page">
                <p>
                  上述内容采用自动授权协议：
                  <strong> CC BY-NC-SA 4.0 </strong>
                  （署名 - 非商业性使用 - 相同方式共享）
                </p>
                <p>
                  协议链接：
                  <a
                    href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans"
                    target="_blank"
                    rel="noreferrer"
                  >
                    https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans
                  </a>
                </p>
                <ul className="info-list">
                  <li>使用或转载本项目所附带的数据时，应保留来源说明并注明原始链接。</li>
                  <li>不得将这些数据资源用于未经许可的商业用途。</li>
                  <li>若你基于这些数据继续分发或改编，应按相同方式共享。</li>
                </ul>
              </div>
            </div>

            <div className="field-card">
              <div className="field-card__header">
                <span>鸣谢</span>
              </div>
              <div className="info-page">
                <p>感谢 Biligame 洛克王国 Wiki 的编辑者与维护者整理并公开相关资料。</p>
                <p>
                  本项目仅对公开数据进行本地整理、检索与展示，方便用户管理自己的蛋组配置与覆盖情况。
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {isStatsModalOpen ? (
        <div className="modal-overlay" onClick={closeStatsModal}>
          <div className="stats-modal" onClick={(event) => event.stopPropagation()}>
            <div className="stats-modal__header">
              <div className="stats-modal__summary">
                {selectedEggGroup ? (
                  <div className="stats-modal__egg-group-pill">{selectedEggGroup}</div>
                ) : null}
                {selectedCombo ? (
                  <>
                    <div className="stats-modal__summary-line">
                      <span className="stat-up">+{selectedCombo.personality.increase}</span>
                      <span className="combo-separator"> / </span>
                      <span className="stat-down">-{selectedCombo.personality.decrease}</span>
                    </div>
                    <div className="stats-modal__summary-line">{selectedCombo.ivs.join(" / ")}</div>
                    <div className="stats-modal__summary-line">
                      {formatMedals(selectedMedalFilter)}
                    </div>
                  </>
                ) : selectedMedalColumn ? (
                  <>
                    <div className="stats-modal__summary-line">{selectedMedalColumn.label}</div>
                    <div className="stats-modal__summary-line">
                      {selectedMedalColumn.requiredMedals.join(" / ")}
                    </div>
                  </>
                ) : null}
              </div>
              <button type="button" className="ghost-button" onClick={closeStatsModal}>
                关闭
              </button>
            </div>

            <div className="stats-modal__body">
              <div className="stats-modal__section">
                <h3>现有覆盖</h3>
                <div className="record-list modal-scroll-area">
                  {selectedCombo ? (
                    cellRecords.length > 0 ? (
                      cellRecords.map((record) => <PetCard key={record.recordId} record={record} />)
                    ) : (
                      <div className="empty-box">当前格子还没有已登记记录。</div>
                    )
                  ) : selectedMedalColumn ? (
                    medalCellRecords.length > 0 ? (
                      medalCellRecords.map((record) => (
                        <PetCard key={record.recordId} record={record} />
                      ))
                    ) : (
                      <div className="empty-box">当前格子还没有已登记记录。</div>
                    )
                  ) : null}
                </div>
              </div>

              {selectedCombo ? (
                <div className="stats-modal__section">
                  <div className="stats-modal__section-header">
                    <h3>推荐补抓</h3>
                    <div className="stats-modal__filter">
                      <span>缺口蛋组筛选</span>
                      <div className="pill-group">
                        {statsRecommendationEggGroupOptions.map((eggGroup) => (
                          <button
                            key={`stats-filter-${eggGroup}`}
                            type="button"
                            className={`pill-button ${
                              statsRecommendationEggGroupFilter === eggGroup ? "is-active" : ""
                            }`}
                            onClick={() => setStatsRecommendationEggGroupFilter(eggGroup)}
                          >
                            {eggGroup}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="recommendation-grid modal-scroll-area">
                    {pagedStatsRecommendations.length > 0 ? (
                      pagedStatsRecommendations.map((item) => (
                        <article
                          key={`stats-${item.pet.entryId}`}
                          className="recommendation-card"
                        >
                          <img src={item.pet.imagePath} alt={item.pet.name} />
                          <div>
                            <strong>{formatPetLabel(item.pet)}</strong>
                            <span>{formatEggGroups(item.pet.eggGroups)}</span>
                            <span>匹配目标蛋组：{item.matchedTargetEggGroups.join(" / ")}</span>
                            <span>可补缺口：{item.missingEggGroupsCovered.join(" / ")}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-box">当前条件下没有额外推荐，说明这个蛋组缺口已经比较完整。</div>
                    )}
                  </div>
                  {statsRecommendations.length > statsPageSize ? (
                    <div className="pagination-bar">
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={statsRecommendationPage <= 1}
                        onClick={() =>
                          setStatsRecommendationPage((current) => Math.max(1, current - 1))
                        }
                      >
                        上一页
                      </button>
                      <span>
                        第 {statsRecommendationPage} / {statsRecommendationPageCount} 页
                      </span>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={statsRecommendationPage >= statsRecommendationPageCount}
                        onClick={() =>
                          setStatsRecommendationPage((current) =>
                            Math.min(statsRecommendationPageCount, current + 1)
                          )
                        }
                      >
                        下一页
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isLookupRecommendationOpen ? (
        <div className="modal-overlay" onClick={closeLookupRecommendationModal}>
          <div className="stats-modal stats-modal--single" onClick={(event) => event.stopPropagation()}>
            <div className="stats-modal__header">
              <div className="stats-modal__summary">
                {lookupTarget ? (
                  <>
                    <div className="stats-modal__egg-group-pill">
                      {formatEggGroups(lookupTarget.eggGroups)}
                    </div>
                    <div className="stats-modal__summary-line">
                      {formatPetLabel(lookupTarget)}
                    </div>
                    <div className="stats-modal__summary-line">
                      <span className="stat-up">+{lookupConfig.personality.increase}</span>
                      <span className="combo-separator"> / </span>
                      <span className="stat-down">-{lookupConfig.personality.decrease}</span>
                    </div>
                    <div className="stats-modal__summary-line">{lookupConfig.ivs.join(" / ")}</div>
                    <div className="stats-modal__summary-line">
                      {formatMedals(lookupConfig.medals)}
                    </div>
                  </>
                ) : null}
              </div>
              <button type="button" className="ghost-button" onClick={closeLookupRecommendationModal}>
                关闭
              </button>
            </div>
            <div className="stats-modal__body stats-modal__body--single">
              <div className="stats-modal__section">
                <div className="stats-modal__section-header">
                  <h3>推荐抓取列表</h3>
                  <div className="stats-modal__filter">
                    <span>缺口蛋组筛选</span>
                    <div className="pill-group">
                      {lookupRecommendationEggGroupOptions.map((eggGroup) => (
                        <button
                          key={`lookup-filter-${eggGroup}`}
                          type="button"
                          className={`pill-button ${
                            lookupRecommendationEggGroupFilter === eggGroup ? "is-active" : ""
                          }`}
                          onClick={() => setLookupRecommendationEggGroupFilter(eggGroup)}
                        >
                          {eggGroup}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="recommendation-grid modal-scroll-area">
                  {pagedLookupRecommendations.length > 0 ? (
                    pagedLookupRecommendations.map((item) => (
                      <article
                        key={`lookup-${item.pet.entryId}`}
                        className="recommendation-card"
                      >
                        <img src={item.pet.imagePath} alt={item.pet.name} />
                        <div>
                          <strong>{formatPetLabel(item.pet)}</strong>
                          <span>{formatEggGroups(item.pet.eggGroups)}</span>
                          <span>匹配目标蛋组：{item.matchedTargetEggGroups.join(" / ")}</span>
                          <span>可补缺口：{item.missingEggGroupsCovered.join(" / ")}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-box">当前配置下，所有目标蛋组都已经有覆盖了。</div>
                  )}
                </div>
                  {filteredLookupRecommendations.length > lookupPageSize ? (
                    <div className="pagination-bar">
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={lookupRecommendationPage <= 1}
                      onClick={() =>
                        setLookupRecommendationPage((current) => Math.max(1, current - 1))
                      }
                    >
                      上一页
                    </button>
                    <span>
                      第 {lookupRecommendationPage} / {lookupRecommendationPageCount} 页
                    </span>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={lookupRecommendationPage >= lookupRecommendationPageCount}
                      onClick={() =>
                        setLookupRecommendationPage((current) =>
                          Math.min(lookupRecommendationPageCount, current + 1)
                        )
                      }
                    >
                      下一页
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
