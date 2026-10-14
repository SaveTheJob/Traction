import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

interface ChipInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Shown as autocomplete options and as quick-add chips when `showSuggestions` is set. */
  suggestions?: string[];
  showSuggestions?: boolean;
  max: number;
  maxLength?: number;
  /** Returns an error message for an invalid entry, or null. */
  validate?: (value: string) => string | null;
  disabled?: boolean;
}

/** Free-text chips (Enter or comma to add). Duplicates are ignored case-insensitively. */
export default function ChipInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  showSuggestions = false,
  max,
  maxLength = 80,
  validate,
  disabled,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const listId = useId();
  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());
  const full = values.length >= max;

  const add = (raw: string) => {
    const v = raw.replace(/\s+/g, " ").trim().slice(0, maxLength);
    if (!v) return;
    if (has(v)) {
      setDraft("");
      return;
    }
    if (full) {
      setError(`Up to ${max} items.`);
      return;
    }
    const problem = validate?.(v);
    if (problem) {
      setError(problem);
      return;
    }
    onChange([...values, v]);
    setDraft("");
    setError("");
  };

  const quick = suggestions.filter((s) => !has(s)).slice(0, 8);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-black/20 border border-white/5 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-white/10 border border-white/10 rounded-full pl-2.5 pr-1 py-1"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="p-0.5 rounded-full hover:bg-white/20 text-slate-300 hover:text-white"
                aria-label={`Remove ${v}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            type="text"
            value={draft}
            list={suggestions.length ? listId : undefined}
            maxLength={maxLength}
            placeholder={full ? `Limit of ${max} reached` : placeholder}
            disabled={full}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && values.length) {
                onChange(values.slice(0, -1));
              }
            }}
            onBlur={() => draft && add(draft)}
            className="flex-1 min-w-[140px] bg-transparent px-1.5 py-1 text-sm font-medium text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
          />
        )}
        {suggestions.length > 0 && (
          <datalist id={listId}>
            {suggestions.slice(0, 200).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </div>
      {error && <p className="text-[11px] font-semibold text-amber-300 mt-1.5 px-1">{error}</p>}
      {showSuggestions && !disabled && quick.length > 0 && !full && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {quick.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 rounded-full px-2.5 py-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
