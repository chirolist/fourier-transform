"use client";

import { useMemo } from "react";

export function Sparkline({
  samples,
  color,
  muted = false,
}: {
  samples: Float32Array;
  color: string;
  muted?: boolean;
}) {
  const points = useMemo(() => {
    if (samples.length < 2) return "";
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < min) min = samples[i];
      if (samples[i] > max) max = samples[i];
    }
    const span = max - min || 1;
    const step = Math.max(1, Math.ceil(samples.length / 160));
    const values: number[] = [];
    for (let i = 0; i < samples.length; i += step) values.push(samples[i]);
    return values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * 160;
        const y = 4 + ((max - value) / span) * 34;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [samples]);

  return (
    <svg viewBox="0 0 160 42" className={`h-12 w-full ${muted ? "opacity-35" : ""}`} aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
