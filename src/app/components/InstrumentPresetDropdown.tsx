import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface InstrumentPresetOption {
  id: string;
  name: string;
  color?: string;
}

interface InstrumentPresetDropdownProps {
  presets: InstrumentPresetOption[];
  value: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Dropdown for instrument presets – dark panel theme (#121212, orange #E66000) */
export const InstrumentPresetDropdown: React.FC<InstrumentPresetDropdownProps> = ({
  presets,
  value,
  onSelect,
  placeholder = "Preset",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const selected = presets.find((p) => p.id === value);
  const displayLabel = selected?.name ?? placeholder;

  const dropdownContent =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-[#181818] rounded-[4px] border border-white/10 shadow-xl p-1 min-w-[160px] max-h-[240px] overflow-y-auto z-[9999]"
        style={{
          top: triggerRef.current
            ? triggerRef.current.getBoundingClientRect().bottom + 4
            : 0,
          left: triggerRef.current
            ? triggerRef.current.getBoundingClientRect().left
            : 0,
        }}
      >
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onSelect(p.id);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-[2px] text-[11px] font-sans font-bold text-left transition-colors",
              value === p.id
                ? "bg-[#E66000]/20 text-[#E66000]"
                : "text-white/70 hover:bg-white/05 hover:text-white/90"
            )}
          >
            {p.color != null ? (
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
            ) : null}
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>,
      document.body
    );

  return (
    <div className={cn("flex items-center", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 py-1.5 px-3 rounded-[2px] border text-[11px] font-mono font-bold transition-colors",
          "bg-white/[0.06] border-white/[0.08] text-white/90",
          "hover:border-[#E66000]/40 hover:bg-white/[0.08]",
          "focus:outline-none focus:border-[#E66000]/50",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <span className="truncate max-w-[120px]">{displayLabel}</span>
        <ChevronDown className="size-3.5 text-white/50 flex-shrink-0" />
      </button>
      {dropdownContent}
    </div>
  );
};
