import { useEffect, useMemo, useState } from "react";
import { buildSearchSuggestions, formatPetLabel } from "../lib/logic";
import { useAppContext } from "../lib/app-context";
import { type PetEntry } from "../lib/types";

interface SearchPickerProps {
  label: string;
  value: PetEntry | null;
  onSelect: (pet: PetEntry) => void;
}

export function SearchPicker({ label, value, onSelect }: SearchPickerProps) {
  const { entries } = useAppContext();
  const [keyword, setKeyword] = useState("");
  const suggestions = useMemo(
    () => buildSearchSuggestions(entries, keyword, 12),
    [entries, keyword]
  );

  useEffect(() => {
    if (value) {
      setKeyword(value.name);
    }
  }, [value]);

  return (
    <div className="field-card search-picker">
      <div className="field-card__header">
        <span>{label}</span>
      </div>
      <input
        className="app-input"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="输入精灵名或序号，例如 188 / 棋棋"
      />
      <div className="search-picker__list">
        {suggestions.map(({ pet, reason }) => (
          <button
            key={`${pet.entryId}-${reason}`}
            type="button"
            className={`search-result ${value?.entryId === pet.entryId ? "is-active" : ""}`}
            onClick={() => onSelect(pet)}
          >
            <img src={pet.imagePath} alt={pet.name} className="search-result__image" />
            <div className="search-result__content">
              <strong>{formatPetLabel(pet)}</strong>
              <span>{pet.eggGroups.join(" / ")}</span>
              <span>{reason}</span>
            </div>
          </button>
        ))}
        {keyword.trim() && suggestions.length === 0 ? (
          <div className="search-result search-result--empty">没有找到匹配的精灵。</div>
        ) : null}
      </div>
    </div>
  );
}
