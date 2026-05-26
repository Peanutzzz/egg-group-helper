import { useEffect, useMemo, useState } from "react";
import { AppProvider, useAppContext } from "./lib/app-context";
import { ConfigEditor } from "./components/ConfigEditor";
import { PetCard } from "./components/PetCard";
import { SearchPicker } from "./components/SearchPicker";
import { DEFAULT_STATS_PAGE_ID, EMPTY_PERSONALITY } from "./lib/constants";
import {
  buildCatchRecommendations,
  buildParentMatches,
  dedupeRecommendationsByPetId,
  formatEggGroups,
  formatPersonality,
  formatPersonalityFilter,
  formatPhysique,
  formatPetLabel,
  formatSpecials,
  getCellRecords,
  getSpecialCellRecords,
  petMatchesKeyword,
  sortSpecials
} from "./lib/logic";
import "./styles/app.css";
import {
  type BaseConfig,
  type LookupConfig,
  type PetEntry,
  type RegisteredPetRecord,
  type SpecialName,
  type StatsMode
} from "./lib/types";

const INITIAL_CONFIG: LookupConfig = {
  personality: {
    increase: EMPTY_PERSONALITY.increase,
    decrease: EMPTY_PERSONALITY.decrease
  },
  ivs: ["生命", "物防", "魔防"],
  specials: []
};

const INITIAL_STATS_ROW_CONFIG: BaseConfig = {
  personality: {
    increase: EMPTY_PERSONALITY.increase,
    decrease: EMPTY_PERSONALITY.decrease
  },
  ivs: ["生命", "物防", "魔防"],
  specials: []
};

type TabKey = "register" | "lookup" | "stats" | "records" | "accounts" | "about";

function cloneConfig(config: LookupConfig): LookupConfig {
  return {
    personality: { ...config.personality },
    ivs: [...config.ivs],
    specials: [...config.specials]
  };
}

function cloneBaseConfig(config: BaseConfig): BaseConfig {
  return {
    personality: { ...config.personality },
    ivs: [...config.ivs],
    specials: [...config.specials]
  };
}

function formatStatsEggGroupLabel(eggGroup: string): string {
  return eggGroup.endsWith("组") ? eggGroup.slice(0, -1) : eggGroup;
}

function renderPersonalityFilter(personality: BaseConfig["personality"]) {
  if (personality.increase && personality.decrease) {
    return (
      <>
        <span className="stat-up">+{personality.increase}</span>
        <span className="combo-separator"> / </span>
        <span className="stat-down">-{personality.decrease}</span>
      </>
    );
  }

  if (personality.increase) {
    return <span className="stat-up">+{personality.increase}</span>;
  }

  if (personality.decrease) {
    return <span className="stat-down">-{personality.decrease}</span>;
  }

  return <span>任意性格</span>;
}

function PetImage({
  src,
  fallbackSrc,
  alt,
  className
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}

function Shell() {
  const {
    loading,
    loadError,
    entries,
    eggGroups,
    specialTraits,
    accounts,
    activeAccountId,
    records,
    statsPages,
      selectedStatsPageId,
      addRecord,
      updateRecord,
      removeRecord,
      addAccount,
    renameAccount,
    removeAccount,
    setActiveAccountId,
    addStatsPage,
    removeStatsPage,
    setSelectedStatsPageId,
      addStatsRow,
      removeStatsRow,
      preferredStatsMode,
      setPreferredStatsMode,
      selectedSpecialFilter,
      setSelectedSpecialFilter,
      registerSyncPageId,
      setRegisterSyncPageId
    } = useAppContext();

  const visibleEggGroups = useMemo(
    () => eggGroups.filter((group) => group !== "无法孵蛋"),
    [eggGroups]
  );

  const [tab, setTab] = useState<TabKey>("register");
  const [registerTarget, setRegisterTarget] = useState<PetEntry | null>(null);
    const [lookupTarget, setLookupTarget] = useState<PetEntry | null>(null);
    const [statsHighlightTarget, setStatsHighlightTarget] = useState<PetEntry | null>(null);
  const [registerConfig, setRegisterConfig] = useState<LookupConfig>(
    cloneConfig(INITIAL_CONFIG)
  );
  const [lookupConfig, setLookupConfig] = useState<BaseConfig>(
    cloneBaseConfig(INITIAL_CONFIG)
  );
    const [registerMessage, setRegisterMessage] = useState<string | null>(null);
    const [statsRowConfig, setStatsRowConfig] = useState<BaseConfig>(
      cloneBaseConfig(INITIAL_STATS_ROW_CONFIG)
    );
  const [statsRowMessage, setStatsRowMessage] = useState<string | null>(null);
  const [newStatsPageName, setNewStatsPageName] = useState("");
  const [selectedEggGroup, setSelectedEggGroup] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedSpecialColumnId, setSelectedSpecialColumnId] = useState<string | null>(null);
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
  const [recordSpecialFilter, setRecordSpecialFilter] = useState<SpecialName[]>([]);
  const [editingRecord, setEditingRecord] = useState<RegisteredPetRecord | null>(null);
  const [editingConfig, setEditingConfig] = useState<LookupConfig | null>(null);
    const [editingMessage, setEditingMessage] = useState<string | null>(null);
    const [newAccountName, setNewAccountName] = useState("");
    const [pendingDeleteAccount, setPendingDeleteAccount] = useState<{ id: string; name: string } | null>(null);
    const [pendingRenameAccount, setPendingRenameAccount] = useState<{ id: string; currentName: string } | null>(null);
    const [renameAccountInput, setRenameAccountInput] = useState("");

  const lookupPageSize = 12;
  const statsPageSize = 10;
  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0] ?? null;

    const activeStatsPage =
      statsPages.find((page) => page.id === selectedStatsPageId) ?? statsPages[0] ?? null;
    const activeStatsRows = activeStatsPage?.rows ?? [];
    const selectedRow = activeStatsRows.find((row) => row.id === selectedRowId) ?? null;
    const highlightedStatsEggGroups = statsHighlightTarget?.eggGroups.filter(
      (group) => group !== "无法孵蛋"
    ) ?? [];

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

  const filteredLookupRecommendations = lookupRecommendations.filter((item) =>
    lookupRecommendationEggGroupFilter === "全部"
      ? true
      : item.missingEggGroupsCovered.includes(lookupRecommendationEggGroupFilter)
  );
  const lookupRecommendationPageCount = Math.max(
    1,
    Math.ceil(filteredLookupRecommendations.length / lookupPageSize)
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
        !recordKeyword.trim() ||
        petMatchesKeyword(record, recordKeyword) ||
        record.name.includes(recordKeyword.trim());
      const matchesEggGroup =
        recordEggGroupFilter.includes("全部") ||
        recordEggGroupFilter.some((group) => record.eggGroups.includes(group));
      const matchesSpecials = recordSpecialFilter.every((special) =>
        record.specials.includes(special)
      );
      return matchesKeyword && matchesEggGroup && matchesSpecials;
    });
  }, [recordEggGroupFilter, recordKeyword, recordSpecialFilter, records]);

  const cellRecords =
    selectedEggGroup && selectedRow
      ? getCellRecords(records, selectedEggGroup, selectedRow, selectedSpecialFilter)
      : [];
  const specialCellRecords = selectedEggGroup
    ? getSpecialCellRecords(records, selectedEggGroup, selectedSpecialFilter)
    : [];

  const selectedRecommendationConfig = useMemo<LookupConfig | null>(() => {
    if (!selectedRow) return null;
    if (
      selectedRow.personality.increase === null ||
      selectedRow.personality.decrease === null ||
      selectedRow.ivs.length === 0
    ) {
      return null;
    }

    return {
      personality: {
        increase: selectedRow.personality.increase,
        decrease: selectedRow.personality.decrease
      },
      ivs: selectedRow.ivs,
      specials: [...selectedSpecialFilter]
    };
  }, [selectedRow, selectedSpecialFilter]);

  const rawStatsRecommendations = useMemo(() => {
    if (!selectedEggGroup || !selectedRecommendationConfig) return [];
    return dedupeRecommendationsByPetId(
      buildCatchRecommendations(entries, visibleEggGroups, records, selectedRecommendationConfig, {
        targetEggGroups: [selectedEggGroup]
      })
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
    lookupConfig.specials.join("|"),
    lookupRecommendationEggGroupFilter,
    records.length
  ]);

  useEffect(() => {
    setLookupRecommendationEggGroupFilter("全部");
  }, [
    lookupTarget?.entryId,
    lookupConfig.personality.increase,
    lookupConfig.personality.decrease,
    lookupConfig.ivs.join("|"),
    lookupConfig.specials.join("|")
  ]);

  useEffect(() => {
    setStatsRecommendationPage(1);
  }, [
    selectedEggGroup,
    selectedRowId,
    selectedSpecialFilter.join("|"),
    statsRecommendationEggGroupFilter,
    records.length
  ]);

  useEffect(() => {
    setStatsRecommendationEggGroupFilter("全部");
  }, [selectedEggGroup, selectedRowId, selectedSpecialColumnId]);

  useEffect(() => {
      if (
        registerSyncPageId !== "none" &&
        !statsPages.some((page) => page.id === registerSyncPageId)
      ) {
        void setRegisterSyncPageId("none");
      }
    }, [registerSyncPageId, statsPages]);

  function handleRegisterConfigChange(value: BaseConfig) {
    if (value.personality.increase === null || value.personality.decrease === null) {
      return;
    }

    setRegisterConfig({
      personality: {
        increase: value.personality.increase,
        decrease: value.personality.decrease
      },
      ivs: value.ivs,
      specials: value.specials
    });
  }

  function handleLookupConfigChange(value: BaseConfig) {
    setLookupConfig(value);
  }

  function handleEditingConfigChange(value: BaseConfig) {
    if (!editingConfig) return;
    if (value.personality.increase === null || value.personality.decrease === null) {
      return;
    }

    setEditingConfig({
      personality: {
        increase: value.personality.increase,
        decrease: value.personality.decrease
      },
      ivs: value.ivs,
      specials: value.specials
    });
  }

  async function handleRegister() {
    if (!registerTarget) {
      setRegisterMessage("请先选择要登记的精灵。");
      return;
    }

    const error = await addRecord(registerTarget, registerConfig);
    if (error) {
      setRegisterMessage(error);
      return;
    }

    if (registerSyncPageId !== "none") {
      const syncError = await addStatsRow(registerSyncPageId, {
        ...registerConfig,
        specials: []
      });
      const syncPage = statsPages.find((page) => page.id === registerSyncPageId);

      if (syncError && syncError !== "这个统计行已经存在了。") {
        setRegisterMessage(
          `已登记 ${formatPetLabel(registerTarget)}，但同步统计行失败：${syncError}`
        );
        return;
      }

      if (syncError === null && syncPage) {
        setRegisterMessage(
          `已登记 ${formatPetLabel(registerTarget)}，并同步到统计页“${syncPage.name}”。`
        );
        return;
      }
    }

    setRegisterMessage(`已登记 ${formatPetLabel(registerTarget)}。`);
  }

  async function handleCreateStatsRow() {
    if (!activeStatsPage) {
      setStatsRowMessage("未找到当前统计页。");
      return;
    }

    const error = await addStatsRow(activeStatsPage.id, {
      ...statsRowConfig,
      specials: []
    });
    if (error) {
      setStatsRowMessage(error);
      return;
    }

    setStatsRowConfig(cloneBaseConfig(INITIAL_STATS_ROW_CONFIG));
    setStatsRowMessage("已添加到统计行。");
  }

  async function handleCreateStatsPage() {
    await addStatsPage(newStatsPageName || `第 ${statsPages.length + 1} 页`);
    setNewStatsPageName("");
  }

  async function handleCreateAccount() {
    await addAccount(newAccountName || `账号 ${accounts.length + 1}`);
    setNewAccountName("");
  }

    async function handleRenameActiveAccount() {
      if (!activeAccount) return;
      setPendingRenameAccount({
        id: activeAccount.id,
        currentName: activeAccount.name
      });
      setRenameAccountInput(activeAccount.name);
    }

  async function handleRemoveActiveAccount() {
    if (!activeAccount || accounts.length <= 1) return;
    setPendingDeleteAccount({
      id: activeAccount.id,
      name: activeAccount.name
    });
  }

    async function confirmRemoveAccount() {
      if (!pendingDeleteAccount) return;
      await removeAccount(pendingDeleteAccount.id);
      setPendingDeleteAccount(null);
    }

    async function confirmRenameAccount() {
      if (!pendingRenameAccount) return;
      const nextName = renameAccountInput.trim();
      if (!nextName) return;
      await renameAccount(pendingRenameAccount.id, nextName);
      setPendingRenameAccount(null);
      setRenameAccountInput("");
    }

  function toggleStatsSpecial(special: SpecialName) {
    const exists = selectedSpecialFilter.includes(special);
    const next = exists
      ? selectedSpecialFilter.filter((item) => item !== special)
      : [...selectedSpecialFilter, special];
    void setSelectedSpecialFilter(sortSpecials(next, specialTraits));
  }

  function toggleRecordSpecial(special: SpecialName) {
    const exists = recordSpecialFilter.includes(special);
    setRecordSpecialFilter(
      exists
        ? recordSpecialFilter.filter((item) => item !== special)
        : sortSpecials([...recordSpecialFilter, special], specialTraits)
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
    setSelectedRowId(null);
    setSelectedSpecialColumnId(null);
  }

  function closeLookupRecommendationModal() {
    setIsLookupRecommendationOpen(false);
  }

  function openDetailedCell(eggGroup: string, rowId: string) {
    setSelectedEggGroup(eggGroup);
    setSelectedRowId(rowId);
    setSelectedSpecialColumnId(null);
    setIsStatsModalOpen(true);
  }

  function openSpecialCell(eggGroup: string) {
    setSelectedEggGroup(eggGroup);
    setSelectedSpecialColumnId("special-filter");
    setSelectedRowId(null);
    setIsStatsModalOpen(true);
  }

  function openRecordEditor(record: RegisteredPetRecord) {
    setEditingRecord(record);
    setEditingConfig({
      personality: { ...record.personality },
      ivs: [...record.ivs],
      specials: [...record.specials]
    });
    setEditingMessage(null);
  }

  function closeRecordEditor() {
    setEditingRecord(null);
    setEditingConfig(null);
    setEditingMessage(null);
  }

  async function handleSaveRecordEdit() {
    if (!editingRecord || !editingConfig) {
      return;
    }

    const error = await updateRecord(editingRecord.recordId, editingConfig);
    if (error) {
      setEditingMessage(error);
      return;
    }

    closeRecordEditor();
  }

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

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__text">
          <h1>蛋种助手</h1>
          <p>快速登记精灵配置、查找父种、补充缺失蛋组父种，并统计你当前的蛋组和配置覆盖率</p>
        </div>
        <div className="hero__side">
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
          <div className="hero__account-corner">
            <div className="hero__account-pill">
              当前账号：<strong>{activeAccount?.name ?? "默认账号"}</strong>
            </div>
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
            ["accounts", "账号管理"],
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
              <SearchPicker label="选择要登记的精灵" value={registerTarget} onSelect={setRegisterTarget} />
              <ConfigEditor
                title="登记配置"
                value={registerConfig}
                onChange={handleRegisterConfigChange}
                specialTraits={specialTraits}
              />
              <div className="field-card action-card">
                <button type="button" className="primary-button" onClick={handleRegister}>
                  写入本地用户数据
                </button>
                {registerMessage ? <div className="status-message">{registerMessage}</div> : null}
              </div>
            </div>

            <div className="panel-stack">
              <div className="field-card">
                <div className="field-card__header">
                  <span>同步到统计行</span>
                </div>
                <select
                  className="app-select"
                  value={registerSyncPageId}
                  onChange={(event) => setRegisterSyncPageId(event.target.value)}
                >
                  <option value="none">不同步</option>
                  {statsPages.map((page) => (
                    <option key={`register-sync-${page.id}`} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-card spotlight-card">
                {registerTarget ? (
                  <>
                    <PetImage
                      className="spotlight-card__image"
                      src={registerTarget.imagePath}
                      fallbackSrc={registerTarget.imageFallbackPath}
                      alt={registerTarget.name}
                    />
                    <div className="spotlight-card__content">
                      <h2>{formatPetLabel(registerTarget)}</h2>
                      <p>{formatEggGroups(registerTarget.eggGroups)}</p>
                      {formatPhysique(registerTarget) ? (
                        <small className="pet-physique">{formatPhysique(registerTarget)}</small>
                      ) : null}
                      <div className="spotlight-card__personality">
                        <span className="stat-up">+{registerConfig.personality.increase}</span>
                        <span className="combo-separator"> / </span>
                        <span className="stat-down">-{registerConfig.personality.decrease}</span>
                      </div>
                      <div className="spotlight-card__ivs">{registerConfig.ivs.join(" / ")}</div>
                      {registerConfig.specials.length > 0 ? (
                        <div className="pet-card__medals">
                          {registerConfig.specials.map((special) => (
                            <span key={`register-preview-${special}`} className="pet-card__medal-chip">
                              {special}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
              <SearchPicker label="选择目标精灵" value={lookupTarget} onSelect={setLookupTarget} />
              <ConfigEditor
                title="目标配置"
                value={lookupConfig}
                onChange={handleLookupConfigChange}
                specialTraits={specialTraits}
                allowAnyPersonality
              />
            </div>

            <div className="panel-stack">
              <div className="field-card">
                <div className="field-card__header">
                  <span>符合要求的父种</span>
                  {lookupTarget ? (
                    <button type="button" className="secondary-button" onClick={() => setIsLookupRecommendationOpen(true)}>
                      推荐抓取列表
                    </button>
                  ) : null}
                </div>
                {lookupTarget ? (
                  <>
                    <div className="target-inline-card">
                      <PetImage
                        src={lookupTarget.imagePath}
                        fallbackSrc={lookupTarget.imageFallbackPath}
                        alt={lookupTarget.name}
                      />
                      <div className="target-inline-card__content">
                        <strong>{formatPetLabel(lookupTarget)}</strong>
                        <span>{formatEggGroups(lookupTarget.eggGroups)}</span>
                        {formatPhysique(lookupTarget) ? (
                          <small className="pet-physique">{formatPhysique(lookupTarget)}</small>
                        ) : null}
                        <div className="target-inline-card__personality">
                          {renderPersonalityFilter(lookupConfig.personality)}
                        </div>
                        <span>{lookupConfig.ivs.length > 0 ? lookupConfig.ivs.join(" / ") : "任意个体"}</span>
                        {lookupConfig.specials.length > 0 ? (
                          <div className="pet-card__medals">
                            {lookupConfig.specials.map((special) => (
                              <span key={`lookup-target-${special}`} className="pet-card__medal-chip">
                                {special}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="record-list">
                      {parentMatches.length > 0 ? (
                        parentMatches.map((match) => <PetCard key={match.record.recordId} record={match.record} />)
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
                      ["medalOnly", "纯特殊"]
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
                <div className="toolbar-card__group">
                  <strong>统计页</strong>
                  <div className="pill-group">
                    {statsPages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        className={`pill-button ${selectedStatsPageId === page.id ? "is-active" : ""}`}
                        onClick={() => void setSelectedStatsPageId(page.id)}
                      >
                        {page.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="toolbar-card__row">
                <input
                  className="app-input"
                  value={newStatsPageName}
                  onChange={(event) => setNewStatsPageName(event.target.value)}
                  placeholder="输入新统计页名称"
                />
                <button type="button" className="secondary-button" onClick={handleCreateStatsPage}>
                  新增统计页
                </button>
                {activeStatsPage && activeStatsPage.id !== DEFAULT_STATS_PAGE_ID ? (
                  <button type="button" className="ghost-button" onClick={() => void removeStatsPage(activeStatsPage.id)}>
                    删除当前页
                  </button>
                ) : null}
              </div>
            </div>

              {preferredStatsMode === "detailed" ? (
                <div className="field-card">
                  <div className="field-card__header">
                    <span>添加统计行</span>
                  </div>
                  <div className="stats-builder-grid">
                    <div>
                      <ConfigEditor
                        title="新增统计行"
                        value={statsRowConfig}
                        onChange={(value) => setStatsRowConfig({ ...value, specials: [] })}
                        specialTraits={specialTraits}
                        showSpecials={false}
                        allowAnyPersonality
                        showAnyIvOption
                      />
                      <div className="toolbar-card__row">
                        <button type="button" className="secondary-button" onClick={handleCreateStatsRow}>
                          添加到统计行
                        </button>
                      </div>
                      {statsRowMessage ? <div className="status-message">{statsRowMessage}</div> : null}
                    </div>

                    <div className="field-card stats-highlight-card">
                      <div className="field-card__header">
                        <span>图鉴定位</span>
                        {statsHighlightTarget ? (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => setStatsHighlightTarget(null)}
                          >
                            清除高亮
                          </button>
                        ) : null}
                      </div>
                      <SearchPicker
                        label="选择要定位的精灵"
                        value={statsHighlightTarget}
                        onSelect={setStatsHighlightTarget}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

            <div className="field-card">
              <div className="field-card__header">
                <span>覆盖统计表</span>
              </div>
              <div className="table-toolbar">
                <strong>特殊过滤</strong>
                <div className="pill-group">
                  {specialTraits.map((special) => (
                    <button
                      key={special}
                      type="button"
                      className={`pill-button ${selectedSpecialFilter.includes(special) ? "is-active" : ""}`}
                      onClick={() => toggleStatsSpecial(special)}
                    >
                      {special}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-scroll">
                {preferredStatsMode === "detailed" ? (
                  <table className="coverage-table coverage-table--equal">
                    <thead>
                        <tr>
                          <th className="coverage-table__lead-column">性格 / 个体</th>
                          {visibleEggGroups.map((eggGroup) => (
                            <th
                              key={eggGroup}
                              className={
                                highlightedStatsEggGroups.includes(eggGroup)
                                  ? "coverage-table__column-highlight"
                                  : undefined
                              }
                            >
                              {formatStatsEggGroupLabel(eggGroup)}
                            </th>
                          ))}
                        </tr>
                    </thead>
                    <tbody>
                      {activeStatsRows.map((row) => (
                        <tr key={row.id}>
                          <th className="combo-header-cell">
                            <div className="combo-header-cell__top">
                              <div>
                                <span className="combo-header-cell__personality">
                                  {renderPersonalityFilter(row.personality)}
                                </span>
                                <span className="combo-header-cell__ivs">
                                  {row.ivs.length > 0 ? row.ivs.join(" / ") : "任意个体"}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="combo-delete-button"
                                onClick={() =>
                                  activeStatsPage && void removeStatsRow(activeStatsPage.id, row.id)
                                }
                                aria-label={`删除 ${row.label}`}
                              >
                                ×
                              </button>
                            </div>
                          </th>
                          {visibleEggGroups.map((eggGroup) => {
                            const covered = getCellRecords(records, eggGroup, row, selectedSpecialFilter);
                              return (
                                <td key={`${row.id}-${eggGroup}`}>
                                  <button
                                    type="button"
                                    className={`coverage-cell ${covered.length > 0 ? "is-covered" : "is-empty"} ${
                                      highlightedStatsEggGroups.includes(eggGroup)
                                        ? "is-highlighted"
                                        : ""
                                    }`}
                                    onClick={() => openDetailedCell(eggGroup, row.id)}
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
                          <th>特殊条件</th>
                          {visibleEggGroups.map((eggGroup) => (
                            <th
                              key={eggGroup}
                              className={
                                highlightedStatsEggGroups.includes(eggGroup)
                                  ? "coverage-table__column-highlight"
                                  : undefined
                              }
                            >
                              {formatStatsEggGroupLabel(eggGroup)}
                            </th>
                          ))}
                        </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th className="combo-header-cell">
                          <span className="combo-header-cell__ivs">
                            {selectedSpecialFilter.length > 0 ? formatSpecials(selectedSpecialFilter) : "任意特殊"}
                          </span>
                        </th>
                        {visibleEggGroups.map((eggGroup) => {
                          const covered = getSpecialCellRecords(records, eggGroup, selectedSpecialFilter);
                            return (
                              <td key={`special-filter-${eggGroup}`}>
                                <button
                                  type="button"
                                  className={`coverage-cell ${covered.length > 0 ? "is-covered" : "is-empty"} ${
                                    highlightedStatsEggGroups.includes(eggGroup)
                                      ? "is-highlighted"
                                      : ""
                                  }`}
                                  onClick={() => openSpecialCell(eggGroup)}
                                >
                                  {covered.length > 0 ? `${covered.length}` : "×"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
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
                        className={`pill-button ${recordEggGroupFilter.includes(eggGroup) ? "is-active" : ""}`}
                        onClick={() => toggleRecordEggGroup(eggGroup)}
                      >
                        {eggGroup}
                      </button>
                    ))}
                  </div>
                </label>
                <div className="toolbar-card__group">
                  <span>特殊筛选</span>
                  <div className="pill-group">
                    {specialTraits.map((special) => (
                      <button
                        key={`record-${special}`}
                        type="button"
                        className={`pill-button ${recordSpecialFilter.includes(special) ? "is-active" : ""}`}
                        onClick={() => toggleRecordSpecial(special)}
                      >
                        {special}
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
                    <PetCard key={record.recordId} record={record} onEdit={openRecordEditor} onRemove={removeRecord} />
                  ))
                ) : (
                  <div className="empty-box">当前筛选条件下没有已登记记录。</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`page-panel ${tab === "accounts" ? "is-active" : ""}`}>
          <div className="two-column-layout">
            <div className="panel-stack">
              <div className="field-card">
                <div className="field-card__header">
                  <span>当前账号</span>
                  <span className="field-card__hint">
                    共 {accounts.length} 个账号
                  </span>
                </div>
                <div className="account-current-card">
                  <div className="account-current-card__main">
                    <strong>{activeAccount?.name ?? "默认账号"}</strong>
                    <span>当前正在使用的用户存档</span>
                  </div>
                  <div className="account-current-card__stats">
                    <div>
                      <strong>{records.length}</strong>
                      <span>已登记</span>
                    </div>
                    <div>
                      <strong>{statsPages.length}</strong>
                      <span>统计页</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="field-card">
                <div className="field-card__header">
                  <span>切换与新增</span>
                </div>
                <div className="panel-stack">
                  <label className="toolbar-card__group">
                    <span>切换账号</span>
                    <select
                      className="app-select"
                      value={activeAccountId}
                      onChange={(event) => void setActiveAccountId(event.target.value)}
                    >
                      {accounts.map((account) => (
                        <option key={`account-${account.id}`} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="account-create-row">
                    <input
                      className="app-input"
                      value={newAccountName}
                      onChange={(event) => setNewAccountName(event.target.value)}
                      placeholder="输入新账号名称"
                    />
                    <button type="button" className="secondary-button" onClick={handleCreateAccount}>
                      新增账号
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-stack">
              <div className="field-card">
                <div className="field-card__header">
                  <span>账号操作</span>
                </div>
                <div className="account-actions-card">
                  <button type="button" className="secondary-button" onClick={handleRenameActiveAccount}>
                    重命名当前账号
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleRemoveActiveAccount}
                    disabled={accounts.length <= 1}
                  >
                    删除当前账号
                  </button>
                  <p className="field-card__hint">
                    删除账号会移除该账号下的全部登记记录和统计配置，操作前会再次确认。
                  </p>
                </div>
              </div>

              <div className="field-card">
                <div className="field-card__header">
                  <span>所有账号</span>
                </div>
                <div className="account-grid">
                  {accounts.map((account) => (
                    <button
                      key={`account-card-${account.id}`}
                      type="button"
                      className={`account-card ${account.id === activeAccountId ? "is-active" : ""}`}
                      onClick={() => void setActiveAccountId(account.id)}
                    >
                      <div className="account-card__top">
                        <strong>{account.name}</strong>
                        {account.id === activeAccountId ? <span>当前</span> : null}
                      </div>
                      <div className="account-card__meta">
                        <span>{account.records.length} 条登记</span>
                        <span>{account.statsPages.length} 个统计页</span>
                      </div>
                    </button>
                  ))}
                </div>
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
                  <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noreferrer">
                    https://wiki.biligame.com/rocom
                  </a>
                </p>
                <p>对数据的转载和引用请遵循数据来源规范。</p>
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

            <div className="field-card">
              <div className="field-card__header">
                <span>联系作者</span>
              </div>
              <div className="info-page">
                <p>
                  如果使用过程发现任何问题可以通过B站或QQ联系我，也可以在帖子下回复。
                  <br />
                  B站id：黑皇小狗。
                  <br />
                  QQ：461304186。
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
                {selectedEggGroup ? <div className="stats-modal__egg-group-pill">{selectedEggGroup}</div> : null}
                {selectedRow ? (
                  <>
                    <div className="stats-modal__summary-line">
                      {renderPersonalityFilter(selectedRow.personality)}
                    </div>
                    <div className="stats-modal__summary-line">
                      {selectedRow.ivs.length > 0 ? selectedRow.ivs.join(" / ") : "任意个体"}
                    </div>
                    <div className="stats-modal__summary-line">{formatSpecials(selectedSpecialFilter)}</div>
                  </>
                ) : selectedSpecialColumnId ? (
                  <div className="stats-modal__summary-line">
                    {selectedSpecialFilter.length > 0 ? formatSpecials(selectedSpecialFilter) : "任意特殊"}
                  </div>
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
                  {selectedRow ? (
                    cellRecords.length > 0 ? (
                      cellRecords.map((record) => <PetCard key={record.recordId} record={record} />)
                    ) : (
                      <div className="empty-box">当前格子还没有已登记记录。</div>
                    )
                  ) : selectedSpecialColumnId ? (
                    specialCellRecords.length > 0 ? (
                      specialCellRecords.map((record) => <PetCard key={record.recordId} record={record} />)
                    ) : (
                      <div className="empty-box">当前格子还没有已登记记录。</div>
                    )
                  ) : null}
                </div>
              </div>

              {selectedRow && selectedRecommendationConfig ? (
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
                            className={`pill-button ${statsRecommendationEggGroupFilter === eggGroup ? "is-active" : ""}`}
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
                        <article key={`stats-${item.pet.entryId}`} className="recommendation-card">
                          <PetImage
                            src={item.pet.imagePath}
                            fallbackSrc={item.pet.imageFallbackPath}
                            alt={item.pet.name}
                          />
                          <div>
                            <strong>{formatPetLabel(item.pet)}</strong>
                            <span>{formatEggGroups(item.pet.eggGroups)}</span>
                            {formatPhysique(item.pet) ? (
                              <small className="pet-physique">{formatPhysique(item.pet)}</small>
                            ) : null}
                            <span>匹配目标蛋组：{item.matchedTargetEggGroups.join(" / ")}</span>
                            <span>可补缺口：{item.missingEggGroupsCovered.join(" / ")}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty-box">当前条件下没有额外推荐。</div>
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
                    <div className="stats-modal__egg-group-pill">{formatEggGroups(lookupTarget.eggGroups)}</div>
                    <div className="stats-modal__summary-line">{formatPetLabel(lookupTarget)}</div>
                    {formatPhysique(lookupTarget) ? (
                      <div className="stats-modal__summary-line stats-modal__summary-line--muted">
                        {formatPhysique(lookupTarget)}
                      </div>
                    ) : null}
                    <div className="stats-modal__summary-line">
                      {renderPersonalityFilter(lookupConfig.personality)}
                    </div>
                    <div className="stats-modal__summary-line">
                      {lookupConfig.ivs.length > 0 ? lookupConfig.ivs.join(" / ") : "任意个体"}
                    </div>
                    <div className="stats-modal__summary-line">{formatSpecials(lookupConfig.specials)}</div>
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
                          className={`pill-button ${lookupRecommendationEggGroupFilter === eggGroup ? "is-active" : ""}`}
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
                        <article key={`lookup-${item.pet.entryId}`} className="recommendation-card">
                          <PetImage
                            src={item.pet.imagePath}
                            fallbackSrc={item.pet.imageFallbackPath}
                            alt={item.pet.name}
                          />
                          <div>
                            <strong>{formatPetLabel(item.pet)}</strong>
                            <span>{formatEggGroups(item.pet.eggGroups)}</span>
                            {formatPhysique(item.pet) ? (
                              <small className="pet-physique">{formatPhysique(item.pet)}</small>
                            ) : null}
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

      {editingRecord && editingConfig ? (
        <div className="modal-overlay" onClick={closeRecordEditor}>
          <div className="stats-modal stats-modal--single" onClick={(event) => event.stopPropagation()}>
            <div className="stats-modal__header">
                <div className="stats-modal__summary">
                  <div className="stats-modal__egg-group-pill">{formatEggGroups(editingRecord.eggGroups)}</div>
                  <div className="stats-modal__summary-line">{formatPetLabel(editingRecord)}</div>
                </div>
              <button type="button" className="ghost-button" onClick={closeRecordEditor}>
                关闭
              </button>
            </div>
            <div className="stats-modal__body stats-modal__body--single">
              <div className="stats-modal__section">
                <ConfigEditor
                  title="编辑已登记配置"
                  value={editingConfig}
                  onChange={handleEditingConfigChange}
                  specialTraits={specialTraits}
                />
                <div className="toolbar-card__row toolbar-card__row--end">
                  <button type="button" className="secondary-button" onClick={handleSaveRecordEdit}>
                    保存修改
                  </button>
                </div>
                {editingMessage ? <div className="status-message">{editingMessage}</div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteAccount ? (
        <div className="modal-overlay" onClick={() => setPendingDeleteAccount(null)}>
          <div className="stats-modal stats-modal--single" onClick={(event) => event.stopPropagation()}>
            <div className="stats-modal__header">
              <div className="stats-modal__summary">
                <div className="stats-modal__egg-group-pill">删除账号确认</div>
                <div className="stats-modal__summary-line">
                  {pendingDeleteAccount.name}
                </div>
              </div>
              <button type="button" className="ghost-button" onClick={() => setPendingDeleteAccount(null)}>
                取消
              </button>
            </div>
            <div className="stats-modal__body stats-modal__body--single">
              <div className="stats-modal__section">
                <div className="empty-box">
                  删除账号会移除该账号下的全部登记记录和统计配置，这个操作不能撤销。
                </div>
                <div className="toolbar-card__row toolbar-card__row--end">
                  <button type="button" className="ghost-button" onClick={() => setPendingDeleteAccount(null)}>
                    返回
                  </button>
                  <button type="button" className="secondary-button" onClick={confirmRemoveAccount}>
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingRenameAccount ? (
        <div
          className="modal-overlay"
          onClick={() => {
            setPendingRenameAccount(null);
            setRenameAccountInput("");
          }}
        >
          <div className="stats-modal stats-modal--single" onClick={(event) => event.stopPropagation()}>
            <div className="stats-modal__header">
              <div className="stats-modal__summary">
                <div className="stats-modal__egg-group-pill">重命名账号</div>
                <div className="stats-modal__summary-line">{pendingRenameAccount.currentName}</div>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setPendingRenameAccount(null);
                  setRenameAccountInput("");
                }}
              >
                取消
              </button>
            </div>
            <div className="stats-modal__body stats-modal__body--single">
              <div className="stats-modal__section">
                <label className="toolbar-card__group">
                  <span>新的账号名称</span>
                  <input
                    className="app-input"
                    value={renameAccountInput}
                    onChange={(event) => setRenameAccountInput(event.target.value)}
                    placeholder="输入新的账号名称"
                    autoFocus
                  />
                </label>
                <div className="toolbar-card__row toolbar-card__row--end">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setPendingRenameAccount(null);
                      setRenameAccountInput("");
                    }}
                  >
                    返回
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={confirmRenameAccount}
                    disabled={!renameAccountInput.trim()}
                  >
                    保存名称
                  </button>
                </div>
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
