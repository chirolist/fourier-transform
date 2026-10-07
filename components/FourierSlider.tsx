"use client";

const PRESETS = [1, 3, 5, 10, 20, 30, 50];

export function FourierSlider({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const safe = Math.min(value, max);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">使用する波の数</p>
        <p className="font-mono text-2xl font-semibold text-[#0f6e6b]">
          {safe}
          <span className="ml-1 text-sm font-normal text-[#8a8175]">/ {max}</span>
        </p>
      </div>
      <input
        type="range"
        min={1}
        max={Math.max(1, max)}
        step={1}
        value={safe}
        aria-label="使用する波の数"
        disabled={max <= 1}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-[#0f6e6b]"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.filter((preset) => preset <= max).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`min-h-9 rounded-full px-3 text-xs font-bold ${
              safe === preset ? "bg-[#1c2430] text-white" : "bg-[#f6f1ea] text-[#1c2430]"
            }`}
          >
            {preset}項
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8a8175]">
        左へ寄せると単純な音、右へ寄せると元の音に近づきます。この音から取り出せる波は {max} 本です。
      </p>
    </div>
  );
}
