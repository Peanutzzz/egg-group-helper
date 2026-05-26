import { STAT_ORDER } from "../lib/constants";
import {
  formatPersonality,
  formatPersonalityFilter,
  sortSpecials,
  sortStats,
  validateConfig
} from "../lib/logic";
import {
  type BaseConfig,
  type PersonalityFilter,
  type PersonalityEffect,
  type SpecialName,
  type StatName
} from "../lib/types";

interface ConfigEditorProps {
  value: BaseConfig;
  onChange: (value: BaseConfig) => void;
  specialTraits: SpecialName[];
  title?: string;
  showSpecials?: boolean;
  allowAnyPersonality?: boolean;
  showAnyIvOption?: boolean;
}

export function ConfigEditor({
  value,
  onChange,
  specialTraits,
  title,
  showSpecials = true,
  allowAnyPersonality = false,
  showAnyIvOption = false
}: ConfigEditorProps) {
  const isConcretePersonality =
    value.personality.increase !== null && value.personality.decrease !== null;
const error = isConcretePersonality
    ? validateConfig(
        {
          increase: value.personality.increase,
          decrease: value.personality.decrease
        } as PersonalityEffect,
        value.ivs
      )
    : value.ivs.length > 3 || new Set(value.ivs).size !== value.ivs.length
      ? "个体值需要选择 1 到 3 个不同属性。"
      : null;

  function updatePersonality(personality: Partial<PersonalityFilter>) {
    onChange({
      ...value,
      personality: {
        ...value.personality,
        ...personality
      }
    });
  }

  function setAnyIvs() {
    onChange({
      ...value,
      ivs: []
    });
  }

  function toggleIv(stat: StatName) {
    if (value.ivs.length === 0) {
      onChange({
        ...value,
        ivs: [stat]
      });
      return;
    }

    const exists = value.ivs.includes(stat);
    let next: StatName[];
    if (exists) {
      if (!showAnyIvOption && value.ivs.length === 1) {
        return;
      }
      next = value.ivs.filter((item) => item !== stat);
    } else {
      next = [...value.ivs, stat];
    }

    onChange({
      ...value,
      ivs: sortStats(next)
    });
  }

  function toggleSpecial(special: SpecialName) {
    const exists = value.specials.includes(special);
    const next = exists
      ? value.specials.filter((item) => item !== special)
      : [...value.specials, special];

    onChange({
      ...value,
      specials: sortSpecials(next, specialTraits)
    });
  }

  const personalityHint = allowAnyPersonality
    ? formatPersonalityFilter(value.personality)
    : formatPersonality(value.personality as PersonalityEffect);

  return (
    <div className="field-card">
      <div className="field-card__header">
        <span>{title ?? "配置设置"}</span>
        <span className="field-card__hint">{personalityHint}</span>
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
                {allowAnyPersonality ? (
                  <button
                    type="button"
                    className={`pill-button pill-button--up ${
                      value.personality.increase === null ? "is-active" : ""
                    }`}
                    onClick={() => updatePersonality({ increase: null })}
                  >
                    任意
                  </button>
                ) : null}
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
                {allowAnyPersonality ? (
                  <button
                    type="button"
                    className={`pill-button pill-button--down ${
                      value.personality.decrease === null ? "is-active" : ""
                    }`}
                    onClick={() => updatePersonality({ decrease: null })}
                  >
                    任意
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="editor-section">
          <strong>{showAnyIvOption ? "个体值筛选" : "个体值"}</strong>
          <div className="pill-group">
            {showAnyIvOption ? (
              <button
                type="button"
                className={`pill-button ${value.ivs.length === 0 ? "is-active" : ""}`}
                onClick={setAnyIvs}
              >
                全部
              </button>
            ) : null}
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

        {showSpecials ? (
          <div className="editor-section">
            <strong>特殊</strong>
            <div className="pill-group">
              {specialTraits.map((special) => (
                <button
                  key={special}
                  type="button"
                  className={`pill-button ${value.specials.includes(special) ? "is-active" : ""}`}
                  onClick={() => toggleSpecial(special)}
                >
                  {special}
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
