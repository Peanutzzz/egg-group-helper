import { MEDAL_ORDER, STAT_ORDER } from "../lib/constants";
import {
  formatPersonality,
  sortMedals,
  sortStats,
  validateConfig
} from "../lib/logic";
import {
  type LookupConfig,
  type MedalName,
  type PersonalityEffect,
  type StatName
} from "../lib/types";

interface ConfigEditorProps {
  value: LookupConfig;
  onChange: (value: LookupConfig) => void;
  title?: string;
  showMedals?: boolean;
}

export function ConfigEditor({
  value,
  onChange,
  title,
  showMedals = true
}: ConfigEditorProps) {
  const error = validateConfig(value.personality, value.ivs);

  function updatePersonality(personality: Partial<PersonalityEffect>) {
    onChange({
      ...value,
      personality: {
        ...value.personality,
        ...personality
      }
    });
  }

  function toggleIv(stat: StatName) {
    const exists = value.ivs.includes(stat);
    let next: StatName[];
    if (exists) {
      next = value.ivs.filter((item) => item !== stat);
    } else {
      next = [...value.ivs, stat];
    }

    onChange({
      ...value,
      ivs: sortStats(next)
    });
  }

  function toggleMedal(medal: MedalName) {
    const exists = value.medals.includes(medal);
    const next = exists
      ? value.medals.filter((item) => item !== medal)
      : [...value.medals, medal];

    onChange({
      ...value,
      medals: sortMedals(next)
    });
  }

  return (
    <div className="field-card">
      <div className="field-card__header">
        <span>{title ?? "配置设置"}</span>
        <span className="field-card__hint">{formatPersonality(value.personality)}</span>
      </div>

      <div className="editor-grid">
      <div className="editor-section">
        <strong>性格效果</strong>
        <div className="personality-editor">
          <div className="personality-editor__group">
            <span className="personality-editor__label personality-editor__label--up">
              增加
            </span>
            <div className="pill-group">
              {STAT_ORDER.map((stat) => (
                <button
                  key={`increase-${stat}`}
                  type="button"
                  className={`pill-button pill-button--up ${
                    value.personality.increase === stat ? "is-active" : ""
                  }`}
                  onClick={() => updatePersonality({ increase: stat })}
                >
                  {stat}
                </button>
              ))}
            </div>
          </div>
          <div className="personality-editor__group">
            <span className="personality-editor__label personality-editor__label--down">
              减少
            </span>
            <div className="pill-group">
              {STAT_ORDER.map((stat) => (
                <button
                  key={`decrease-${stat}`}
                  type="button"
                  className={`pill-button pill-button--down ${
                    value.personality.decrease === stat ? "is-active" : ""
                  }`}
                  onClick={() => updatePersonality({ decrease: stat })}
                >
                  {stat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

        <div className="editor-section">
          <strong>3 项个体值</strong>
          <div className="pill-group">
            {STAT_ORDER.map((stat) => (
              <button
                key={stat}
                type="button"
                className={`pill-button ${value.ivs.includes(stat) ? "is-active" : ""}`}
                onClick={() => toggleIv(stat)}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>

        {showMedals ? (
          <div className="editor-section">
            <strong>奖章</strong>
            <div className="pill-group">
              {MEDAL_ORDER.map((medal) => (
                <button
                  key={medal}
                  type="button"
                  className={`pill-button ${value.medals.includes(medal) ? "is-active" : ""}`}
                  onClick={() => toggleMedal(medal)}
                >
                  {medal}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <div className="form-error">{error}</div> : null}
    </div>
  );
}
