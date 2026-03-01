import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  icon?: React.ReactNode;
  className?: string;
  /** Visual variant */
  variant?: "glass" | "solid";
}

export default function CustomSelect({
  value,
  onChange,
  options,
  icon,
  className = "",
  variant = "glass",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const baseClasses =
    variant === "glass"
      ? "bg-black/20 border-white/10 text-slate-200 shadow-inner"
      : "bg-slate-700 border-slate-600 text-white";

  const dropdownClasses =
    variant === "glass"
      ? "bg-slate-900/90 backdrop-blur-2xl border-white/10 shadow-2xl"
      : "bg-slate-800 border-slate-700 shadow-xl";

  const itemHoverClasses =
    variant === "glass" ? "hover:bg-white/10" : "hover:bg-slate-700";

  const activeItemClasses =
    variant === "glass"
      ? "bg-blue-500/15 text-blue-300"
      : "bg-blue-900/30 text-blue-300";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 w-full border rounded-2xl px-3 py-2 sm:py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer select-none ${baseClasses}`}
      >
        {icon && (
          <span className="text-slate-300 shrink-0 flex items-center">
            {icon}
          </span>
        )}
        <span className="flex-1 text-left truncate">
          {selected?.label ?? value}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-300 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-full min-w-[10rem] max-h-60 overflow-y-auto rounded-xl border p-1 ${dropdownClasses}`}
          style={{ scrollbarWidth: "thin" }}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? activeItemClasses
                    : `text-slate-200 ${itemHoverClasses}`
                }`}
              >
                <span className={`truncate ${isActive ? "font-semibold" : ""}`}>
                  {option.label}
                </span>
                {isActive && (
                  <Check
                    className="w-3.5 h-3.5 text-blue-500 shrink-0"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
