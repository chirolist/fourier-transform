"use client";

import { useRef, useState } from "react";
import { largestPow2 } from "@/lib/fft";
import { decodeAudioFile } from "@/lib/decodeAudio";
import { resampleLinear } from "@/lib/signal";
import { SAMPLE_RATE } from "@/lib/constants";

export function AudioUploader({
  fileName,
  active,
  onLoad,
  onClear,
  onError,
}: {
  fileName: string | null;
  active: boolean;
  onLoad: (samples: Float32Array, name: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const decoded = await decodeAudioFile(file);
      const resampled = resampleLinear(decoded.samples, decoded.sampleRate, SAMPLE_RATE);
      const size = largestPow2(resampled.length, 65536);
      if (size < 8192) {
        onError("音声が短すぎます。1秒以上の WAV、MP3、OGG を選んでください。");
        return;
      }
      onLoad(resampled.slice(0, size), file.name);
    } catch {
      onError("このファイルを読み取れませんでした。WAV、MP3、OGG などを選んでください。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-[#d9cfc2] bg-[#fbf8f3] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">音声ファイルを解析する</p>
          <p className="mt-1 text-xs leading-5 text-[#8a8175]">
            WAV / MP3 / OGG をブラウザの中だけで読みます。サーバーには送りません。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={`min-h-11 rounded-full px-4 text-sm font-bold ${
              active ? "bg-[#1c2430] text-white" : "bg-white text-[#1c2430] ring-1 ring-[#e6ddd2]"
            }`}
          >
            {busy ? "読み込み中…" : "ファイルを選ぶ"}
          </button>
          {fileName ? (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-full px-4 text-sm text-[#5e6874] ring-1 ring-[#e6ddd2]"
            >
              やめる
            </button>
          ) : null}
        </div>
      </div>
      {fileName ? <p className="mt-3 truncate text-sm text-[#0f6e6b]">解析中のファイル: {fileName}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac"
        className="sr-only"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </div>
  );
}
