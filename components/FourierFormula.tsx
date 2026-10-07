"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import { formatNumber, GENERAL_SERIES_TEX, seriesTex, squareTextbookTex, termPlain } from "@/lib/formula";
import type { FourierCoefficient, SoundKind, Term } from "@/lib/types";

function Formula({ tex }: { tex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    katex.render(tex, ref.current, { throwOnError: false, displayMode: true });
  }, [tex]);
  return <div ref={ref} className="overflow-x-auto py-1 text-[#1c2430]" />;
}

export function FourierFormula({
  terms,
  coefficients,
  phaseOffset,
  fundamental,
  kind,
  frequency,
  squareCount,
}: {
  terms: Term[];
  coefficients: FourierCoefficient[];
  phaseOffset: number;
  fundamental: number;
  kind: SoundKind | null;
  frequency: number;
  squareCount: number;
}) {
  const leading = terms.slice(0, 4);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#f7f3ec] px-3 py-2 sm:px-5">
        <p className="text-xs font-bold tracking-wide text-[#8a8175]">一般形</p>
        <Formula tex={GENERAL_SERIES_TEX} />
        <p className="pb-2 text-xs leading-5 text-[#5e6874]">
          aₙ は cos の係数、bₙ は sin の係数です。位相が 0 の正弦波は、ほぼ bₙ だけで表せます。
        </p>
      </div>
      {kind === "square" ? (
        <div className="rounded-2xl bg-[#f3faf8] px-3 py-2 sm:px-5">
          <p className="text-xs font-bold tracking-wide text-[#0f6e6b]">矩形波の教科書の式</p>
          <Formula tex={squareTextbookTex(Math.max(1, squareCount), frequency)} />
        </div>
      ) : null}
      <div>
        <p className="text-xs font-bold tracking-wide text-[#8a8175]">いま足している波</p>
        <Formula tex={seriesTex(terms, phaseOffset, fundamental)} />
        {terms.length > 6 ? (
          <p className="text-xs text-[#8a8175]">式には先頭の6項だけを書いています。残りは下の一覧にあります。</p>
        ) : null}
      </div>
      <ul className="space-y-1 font-mono text-xs leading-6 text-[#243044] sm:text-sm">
        {leading.map((term, index) => (
          <li key={term.id}>
            {termPlain(term, phaseOffset, fundamental)}
            <span className="ml-2 text-[#8a8175]">
              a={formatNumber(coefficients[index]?.a ?? 0, 3)} / b={formatNumber(coefficients[index]?.b ?? 0, 3)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
