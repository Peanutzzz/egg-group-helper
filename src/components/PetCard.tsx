import { useEffect, useState } from "react";
import { formatEggGroups } from "../lib/logic";
import { type RegisteredPetRecord } from "../lib/types";

interface PetCardProps {
  record: RegisteredPetRecord;
  onRemove?: (recordId: string) => void;
  onEdit?: (record: RegisteredPetRecord) => void;
  subtitle?: string;
}

export function PetCard({ record, onRemove, onEdit, subtitle }: PetCardProps) {
  return (
    <article className="pet-card">
      <PetCardImage record={record} />
      <div className="pet-card__content">
        <div className="pet-card__title-row">
          <div className="pet-card__title-head">
            <div className="pet-card__title-block">
              <strong>{record.name}</strong>
              <span>NO.{String(record.petId).padStart(3, "0")}</span>
            </div>
            {onEdit ? (
              <button type="button" className="ghost-button" onClick={() => onEdit(record)}>
                编辑
              </button>
            ) : null}
          </div>
          <div className="pet-card__actions">
            {onRemove ? (
              <button type="button" className="ghost-button" onClick={() => onRemove(record.recordId)}>
                删除
              </button>
            ) : null}
          </div>
        </div>
        <div className="pet-card__meta">
          <span>{formatEggGroups(record.eggGroups)}</span>
          <div className="pet-card__personality-line">
            <span className="stat-up">+{record.personality.increase}</span>
            <span className="combo-separator"> / </span>
            <span className="stat-down">-{record.personality.decrease}</span>
          </div>
          <div className="pet-card__iv-line">{record.ivs.join(" / ")}</div>
          {record.specials.length > 0 ? (
            <div className="pet-card__medals">
              {record.specials.map((special) => (
                <span key={`${record.recordId}-${special}`} className="pet-card__medal-chip">
                  {special}
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

function PetCardImage({ record }: { record: RegisteredPetRecord }) {
  const [src, setSrc] = useState(record.imagePath);

  useEffect(() => {
    setSrc(record.imagePath);
  }, [record.imagePath]);

  return (
    <img
      src={src}
      alt={record.name}
      className="pet-card__image"
      onError={() => {
        if (record.imageFallbackPath && src !== record.imageFallbackPath) {
          setSrc(record.imageFallbackPath);
        }
      }}
    />
  );
}
