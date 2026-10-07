"use client";

import { termColor } from "@/lib/constants";
import { formatHz, formatNumber, termPlain } from "@/lib/formula";
import { renderedPhase } from "@/lib/signal";
import type { FourierCoefficient, Term } from "@/lib/types";
import { Sparkline } from "./Sparkline";

function degrees(term: Term, phaseOffset: number, fundamental: number): string {
  const value = (renderedPhase(term, phaseOffset, fundamental) * 180) / Math.PI;
  return `${value.toFixed(0)}°`;
}

export function FourierTerms({
  terms,
  tracks,
  coefficients,
  activeCount,
  disabled,
  phaseOffset,
  fundamental,
  highlightIndex,
  onToggle,
  onEnableAll,
}: {
  terms: Term[];
  tracks: Float32Array[];
  coefficients: FourierCoefficient[];
  activeCount: number;
  disabled: ReadonlySet<string>;
  phaseOffset: number;
  fundamental: number;
  highlightIndex: number | null;
  onToggle: (id: string) => void;
  onEnableAll: () => void;
}) {
  return (
    <div>
      {disabled.size > 0 ? (
        <button type="button" onClick={onEnableAll} className="mb-3 text-sm font-medium text-[#0f6e6b] underline">
          オフにした波をすべて戻す
        </button>
      ) : null}
      <ul className="max-h-[36rem] space-y-2 overflow-auto pr-1">
        {terms.map((term, index) => {
          const included = index < activeCount && !disabled.has(term.id);
          const waiting = index >= activeCount;
          const color = termColor(index);
          const coefficient = coefficients[index];
          return (
            <li
              key={term.id}
              className={`grid gap-3 rounded-2xl border p-3 sm:grid-cols-[11rem_1fr] ${
                highlightIndex === index ? "border-[#0f6e6b] bg-[#f3faf8]" : "border-[#efe6dc] bg-white"
              } ${included ? "" : "opacity-70"}`}
            >
              <Sparkline samples={tracks[index] ?? new Float32Array()} color={color} muted={!included} />
              <div className="min-w-0">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#0f6e6b]"
                    checked={!disabled.has(term.id)}
                    onChange={() => onToggle(term.id)}
                  />
                  <span>
                    <span className="block text-sm font-bold" style={{ color }}>
                      第{index + 1}成分
                      {waiting ? "（波の数を増やすと加わります）" : included ? "" : "（オフ）"}
                    </span>
                    <span className="mt-1 block font-mono text-xs leading-5 text-[#243044] sm:text-sm">
                      {termPlain(term, phaseOffset, fundamental)}
                    </span>
                  </span>
                </label>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#5e6874] sm:grid-cols-4">
                  <div>
                    <dt>周波数</dt>
                    <dd className="font-mono text-[#1c2430]">{formatHz(term.frequency)} Hz</dd>
                  </div>
                  <div>
                    <dt>振幅</dt>
                    <dd className="font-mono text-[#1c2430]">{formatNumber(term.amplitude, 3)}</dd>
                  </div>
                  <div>
                    <dt>位相</dt>
                    <dd className="font-mono text-[#1c2430]">{degrees(term, phaseOffset, fundamental)}</dd>
                  </div>
                  <div>
                    <dt>係数 a, b</dt>
                    <dd className="font-mono text-[#1c2430]">
                      {formatNumber(coefficient?.a ?? 0, 3)}, {formatNumber(coefficient?.b ?? 0, 3)}
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
