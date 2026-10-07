"use client";

import { useCallback } from "react";
import { termColor } from "@/lib/constants";
import { formatHz } from "@/lib/formula";
import { drawLines } from "@/lib/plot";
import type { Term } from "@/lib/types";
import { CanvasChart } from "./CanvasChart";
import { Sparkline } from "./Sparkline";

export function SynthesisAnimation({
  playing,
  shown,
  total,
  included,
  latestTrack,
  sumSamples,
  sampleRate,
  timeStart,
  onStart,
  onStop,
}: {
  playing: boolean;
  shown: number;
  total: number;
  included: Term[];
  latestTrack: Float32Array | null;
  sumSamples: Float32Array;
  sampleRate: number;
  timeStart: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      drawLines(
        context,
        width,
        height,
        [{ samples: sumSamples, color: "#d4532b", width: 2, dash: [] }],
        sampleRate,
        timeStart,
      );
    },
    [sumSamples, sampleRate, timeStart],
  );
  const latest = included[included.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={playing ? onStop : onStart}
          className="min-h-12 rounded-full bg-[#0f6e6b] px-5 text-sm font-bold text-white"
        >
          {playing ? "合成を止める" : "合成を見る"}
        </button>
        <p className="font-mono text-sm text-[#0f6e6b]">
          {shown} / {total} 項
        </p>
      </div>
      <p className="text-sm leading-6 text-[#5e6874]">
        単純な波を1本ずつ足すと、少しずつ複雑な形になり、最後は元の音に近づきます。
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {included.slice(0, 8).map((term, index) => (
          <span key={term.id} className="rounded-full bg-[#f6f1ea] px-2 py-1 font-medium" style={{ color: termColor(index) }}>
            {index > 0 ? "+ " : ""}
            {formatHz(term.frequency)} Hz
          </span>
        ))}
        {included.length > 8 ? <span className="text-[#8a8175]">+ ほか {included.length - 8} 項</span> : null}
      </div>
      {latest && latestTrack ? (
        <div className="rounded-2xl border border-[#efe6dc] p-3">
          <p className="text-xs font-bold text-[#8a8175]">いま足した波</p>
          <p className="mt-1 text-sm font-bold" style={{ color: termColor(included.length - 1) }}>
            第{included.length}成分
          </p>
          <Sparkline samples={latestTrack} color={termColor(included.length - 1)} />
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-xs font-bold text-[#8a8175]">ここまでの合計</p>
        <div className="h-40 w-full">
          <CanvasChart draw={draw} label="ここまで足し合わせた波形" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
