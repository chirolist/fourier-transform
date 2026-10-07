"use client";

import { useCallback } from "react";
import { AxisCaption, CanvasChart } from "./CanvasChart";
import { drawLines } from "@/lib/plot";

export function ReconstructionChart({
  original,
  approximation,
  sampleRate,
  timeStart,
}: {
  original: Float32Array;
  approximation: Float32Array;
  sampleRate: number;
  timeStart: number;
}) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      drawLines(
        context,
        width,
        height,
        [
          { samples: original, color: "#243044", width: 2.4, dash: [] },
          { samples: approximation, color: "#d4532b", width: 2, dash: [6, 4] },
        ],
        sampleRate,
        timeStart,
      );
    },
    [original, approximation, sampleRate, timeStart],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-1 w-6 rounded bg-[#243044]" />
          元の波形
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1 w-6 rounded border-t-2 border-dashed border-[#d4532b]" />
          フーリエ級数
        </span>
      </div>
      <div className="h-64 w-full sm:h-80">
        <CanvasChart draw={draw} label="元の波形とフーリエ級数の比較" className="h-full w-full" />
      </div>
      <AxisCaption y="振幅" x="時間 t" />
    </div>
  );
}
