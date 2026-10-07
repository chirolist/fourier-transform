"use client";

import { useCallback } from "react";
import { AxisCaption, CanvasChart } from "./CanvasChart";
import { drawSpectrum, frequencyFromX, type SpectrumMarker } from "@/lib/plot";
import type { SpectrumPoint } from "@/lib/types";

export interface SpectrumMarkerItem extends SpectrumMarker {
  id: string;
}

export function SpectrumChart({
  points,
  maxFrequency,
  markers,
  onToggle,
}: {
  points: SpectrumPoint[];
  maxFrequency: number;
  markers: SpectrumMarkerItem[];
  onToggle: (id: string) => void;
}) {
  const draw = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      drawSpectrum(context, width, height, points, maxFrequency, markers);
    },
    [points, maxFrequency, markers],
  );

  const pick = (x: number, _y: number, width: number) => {
    const frequency = frequencyFromX(x, width, maxFrequency);
    let nearest: SpectrumMarkerItem | null = null;
    let distance = Math.max(36, maxFrequency * 0.035);
    for (const marker of markers) {
      const gap = Math.abs(marker.frequency - frequency);
      if (gap < distance) {
        nearest = marker;
        distance = gap;
      }
    }
    if (nearest) onToggle(nearest.id);
  };

  return (
    <div>
      <div className="h-64 w-full cursor-pointer sm:h-72">
        <CanvasChart draw={draw} label="周波数スペクトル" className="h-full w-full" onPress={pick} />
      </div>
      <AxisCaption y="振幅" x="周波数 Hz" />
      <p className="mt-2 text-xs leading-5 text-[#8a8175]">
        色の線が、音を作っている成分です。線をクリックすると、その成分を合成から外せます。
      </p>
    </div>
  );
}
