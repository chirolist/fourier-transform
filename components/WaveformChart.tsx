"use client";

import { useCallback } from "react";
import { AxisCaption, CanvasChart } from "./CanvasChart";
import { drawLines, drawOverview } from "@/lib/plot";

export function WaveformChart({
  samples,
  sampleRate,
  timeStart,
  label,
}: {
  samples: Float32Array;
  sampleRate: number;
  timeStart: number;
  label: string;
}) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      drawLines(
        context,
        width,
        height,
        [{ samples, color: "#243044", width: 2, dash: [] }],
        sampleRate,
        timeStart,
      );
    },
    [samples, sampleRate, timeStart],
  );

  return (
    <div>
      <div className="h-64 w-full sm:h-80">
        <CanvasChart draw={draw} label={label} className="h-full w-full" />
      </div>
      <AxisCaption y="振幅" x="時間 t" />
    </div>
  );
}

export function OverviewChart({
  samples,
  sampleRate,
  highlightStart,
  highlightEnd,
}: {
  samples: Float32Array;
  sampleRate: number;
  highlightStart: number;
  highlightEnd: number;
}) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      drawOverview(context, width, height, samples, sampleRate, "#1f6f78", highlightStart, highlightEnd);
    },
    [samples, sampleRate, highlightStart, highlightEnd],
  );

  return (
    <div>
      <div className="h-36 w-full sm:h-44">
        <CanvasChart draw={draw} label="2秒間の波形の全体" className="h-full w-full" />
      </div>
      <AxisCaption y="振幅" x="時間 t（秒）" />
    </div>
  );
}
