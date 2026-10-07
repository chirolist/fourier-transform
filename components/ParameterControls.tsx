"use client";

import { VOWEL_INFO } from "@/lib/sounds";
import type { SoundKind, Vowel } from "@/lib/types";

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const shown = Number.isInteger(step) ? String(value) : value.toFixed(step < 0.1 ? 2 : 1);
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[#0f6e6b]">
          {shown}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[#0f6e6b]"
      />
      <span className="mt-1 block text-xs leading-5 text-[#8a8175]">{hint}</span>
    </label>
  );
}

export function ParameterControls({
  kind,
  frequency,
  phase,
  decay,
  chirp,
  vowel,
  onFrequency,
  onPhase,
  onDecay,
  onChirp,
  onVowel,
}: {
  kind: SoundKind | null;
  frequency: number;
  phase: number;
  decay: number;
  chirp: number;
  vowel: Vowel;
  onFrequency: (value: number) => void;
  onPhase: (value: number) => void;
  onDecay: (value: number) => void;
  onChirp: (value: number) => void;
  onVowel: (value: Vowel) => void;
}) {
  if (!kind) {
    return (
      <p className="text-sm leading-6 text-[#5e6874]">
        読み込んだ音を解析しています。基本周波数などのモデル用スライダーは、上のサンプル音を選ぶと再び使えます。
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Slider
        label="基本周波数"
        hint="音の高さです。高いほど、1秒間に多く振動します。"
        value={frequency}
        min={20}
        max={2000}
        step={1}
        unit=" Hz"
        onChange={onFrequency}
      />
      <Slider
        label="位相"
        hint="波の開始位置をずらします。高さそのものは変わりません。"
        value={phase}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={onPhase}
      />
      {kind === "bell" || kind === "piano" ? (
        <Slider
          label="減衰率"
          hint="大きいほど、音が早く小さくなります。0 だと減衰しません。"
          value={decay}
          min={0}
          max={8}
          step={0.1}
          unit=""
          onChange={onDecay}
        />
      ) : null}
      {kind === "bird" ? (
        <Slider
          label="周波数変化量"
          hint="さえずりのあいだに、高さが1秒あたり何 Hz 上がるかです。"
          value={chirp}
          min={0}
          max={2500}
          step={10}
          unit=" Hz/秒"
          onChange={onChirp}
        />
      ) : null}
      {kind === "voice" ? (
        <div className="sm:col-span-2">
          <p className="text-sm font-medium">母音</p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {(Object.keys(VOWEL_INFO) as Vowel[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={vowel === item}
                onClick={() => onVowel(item)}
                className={`min-h-11 rounded-xl text-sm font-bold ${
                  vowel === item ? "bg-[#0f6e6b] text-white" : "bg-[#f6f1ea] text-[#1c2430]"
                }`}
              >
                {VOWEL_INFO[item].label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
