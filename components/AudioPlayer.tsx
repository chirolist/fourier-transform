"use client";

import { useEffect, useRef } from "react";
import type { PlaybackState } from "@/hooks/useAudioPlayer";

export function AudioPlayer({
  playback,
  volume,
  onVolume,
  onPlayOriginal,
  onPlayReconstruction,
  onPause,
  onResume,
  onStop,
  getProgress,
}: {
  playback: PlaybackState;
  volume: number;
  onVolume: (value: number) => void;
  onPlayOriginal: () => void;
  onPlayReconstruction: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  getProgress: () => number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const playing = playback.status === "playing";

  useEffect(() => {
    if (!playing) {
      if (barRef.current) barRef.current.style.width = playback.status === "paused" ? `${getProgress() * 100}%` : "0%";
      return;
    }
    let frame = 0;
    const tick = () => {
      if (barRef.current) barRef.current.style.width = `${getProgress() * 100}%`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, playback.status, getProgress]);

  return (
    <div id="listen" className="scroll-mt-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onPlayOriginal}
          className={`min-h-12 flex-1 rounded-full px-4 text-sm font-bold ${
            playback.mode === "original" && playback.status !== "stopped"
              ? "bg-[#0f6e6b] text-white"
              : "bg-[#1c2430] text-white"
          }`}
        >
          ▶ 元の音を再生
        </button>
        <button
          type="button"
          onClick={onPlayReconstruction}
          className={`min-h-12 flex-1 rounded-full px-4 text-sm font-bold ${
            playback.mode === "reconstruction" && playback.status !== "stopped"
              ? "bg-[#d4532b] text-white"
              : "bg-[#fff4ee] text-[#9a3412] ring-1 ring-[#f0c7b4]"
          }`}
        >
          ▶ フーリエ再構成音を再生
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={playing ? onPause : onResume}
          disabled={playback.status === "stopped"}
          className="min-h-11 rounded-full border border-[#e6ddd2] bg-white px-4 text-sm font-medium disabled:opacity-40"
        >
          {playing ? "一時停止" : "再開"}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={playback.status === "stopped"}
          className="min-h-11 rounded-full border border-[#e6ddd2] bg-white px-4 text-sm font-medium disabled:opacity-40"
        >
          停止
        </button>
        <p className="flex items-center text-xs text-[#8a8175]">
          {playback.status === "playing"
            ? playback.mode === "original"
              ? "元の音を鳴らしています"
              : "再構成した音を鳴らしています"
            : playback.status === "paused"
              ? "一時停止中"
              : "停止中。音は数式からその場で作っています"}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#efe8de]">
        <div ref={barRef} className="h-full w-0 rounded-full bg-[#0f6e6b]" />
      </div>
      <label className="block">
        <span className="flex items-baseline justify-between text-sm">
          <span className="font-medium">音量</span>
          <span className="font-mono text-[#0f6e6b]">{volume}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          aria-label="音量"
          onChange={(event) => onVolume(Number(event.target.value))}
          className="mt-2 w-full accent-[#0f6e6b]"
        />
      </label>
    </div>
  );
}
