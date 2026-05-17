import { formatEggGroups } from "../lib/logic";
import { type RegisteredPetRecord } from "../lib/types";

interface PetCardProps {
  record: RegisteredPetRecord;
  onRemove?: (recordId: string) => void;
  subtitle?: string;
}

export function PetCard({ record, onRemove, subtitle }: PetCardProps) {
  return (
    <article className="pet-card">
      <img src={record.imagePath} alt={record.name} className="pet-card__image" />
      <div className="pet-card__content">
        <div className="pet-card__title-row">
          <div className="pet-card__title-block">
            <strong>{record.name}</strong>
            <span>NO.{String(record.petId).padStart(3, "0")}</span>
          </div>
          {onRemove ? (
            <button type="button" className="ghost-button" onClick={() => onRemove(record.recordId)}>
              删除
            </button>
          ) : null}
        </div>
        <div className="pet-card__meta">
          <span>{formatEggGroups(record.eggGroups)}</span>
          <div className="pet-card__personality-line">
            <span className="stat-up">+{record.personality.increase}</span>
            <span className="combo-separator"> / </span>
            <span className="stat-down">-{record.personality.decrease}</span>
          </div>
          <div className="pet-card__iv-line">{record.ivs.join(" / ")}</div>
          {record.medals.length > 0 ? (
            <div className="pet-card__medals">
              {record.medals.map((medal) => (
                <span key={`${record.recordId}-${medal}`} className="pet-card__medal-chip">
                  {medal}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {subtitle ? <div className="pet-card__subtitle">{subtitle}</div> : null}
      </div>
    </article>
  );
}
