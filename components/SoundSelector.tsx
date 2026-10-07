"use client";

import type { SoundKind } from "@/lib/types";

const SOUNDS: { id: SoundKind; label: string; hint: string }[] = [
  { id: "sine", label: "正弦波", hint: "波は1本" },
  { id: "square", label: "矩形波", hint: "奇数倍音" },
  { id: "bell", label: "鐘", hint: "減衰する" },
  { id: "bird", label: "鳥の声", hint: "高さが動く" },
  { id: "piano", label: "ピアノ", hint: "倍音が重なる" },
  { id: "voice", label: "人の声", hint: "母音" },
];

export function SoundSelector({
  value,
  onChange,
}: {
  value: SoundKind | null;
  onChange: (kind: SoundKind) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {SOUNDS.map((sound) => {
        const selected = value === sound.id;
        return (
          <button
            key={sound.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(sound.id)}
            className={`min-h-16 rounded-2xl border px-3 py-2 text-left transition ${
              selected
                ? "border-[#1c2430] bg-[#1c2430] text-white"
                : "border-[#e6ddd2] bg-white text-[#1c2430] hover:border-[#0f6e6b]"
            }`}
          >
            <span className="block text-sm font-bold">{sound.label}</span>
            <span className={`mt-0.5 block text-[11px] ${selected ? "text-white/70" : "text-[#8a8175]"}`}>
              {sound.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
