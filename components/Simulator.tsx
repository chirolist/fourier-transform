"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { termColor } from "@/lib/constants";
import { explainSound } from "@/lib/explanations";
import { buildPresetModel, buildUploadModel } from "@/lib/model";
import { PRESETS } from "@/lib/sounds";
import { meanSquare, meanSquareError, mixTracks, selectTermIndices, sliceSamples, zoomWindow } from "@/lib/signal";
import type { PlayMode, SoundKind, Vowel } from "@/lib/types";
import { AudioPlayer } from "./AudioPlayer";
import { AudioUploader } from "./AudioUploader";
import { ErrorDisplay } from "./ErrorDisplay";
import { FftNote, SoundExplanation } from "./SoundExplanation";
import { FourierFormula } from "./FourierFormula";
import { FourierSlider } from "./FourierSlider";
import { FourierTerms } from "./FourierTerms";
import { ParameterControls } from "./ParameterControls";
import { ReconstructionChart } from "./ReconstructionChart";
import { SectionCard } from "./SectionCard";
import { SoundSelector } from "./SoundSelector";
import { SpectrumChart } from "./SpectrumChart";
import { SynthesisAnimation } from "./SynthesisAnimation";
import { OverviewChart, WaveformChart } from "./WaveformChart";

const FLOW = [
  ["#pick", "選ぶ"],
  ["#listen", "聴く"],
  ["#wave", "波形"],
  ["#spectrum", "分解"],
  ["#formula", "式"],
  ["#sum", "重ねる"],
  ["#compare", "比べる"],
];

function closenessCaption(closeness: number, used: number, total: number, upload: boolean): string {
  if (!upload && total > 0 && used >= total) {
    return "入っている波を全部足すと、元の波形と重なります。";
  }
  if (upload && used >= total) {
    return "強い成分から順に足しています。ごく弱い成分は捨てているので、完全には一致しないことがあります。";
  }
  if (closeness > 0.97) return "ほとんど元の波形と重なっています。";
  if (closeness > 0.75) return "かなり近づいてきました。細かい形まで再現されています。";
  if (closeness > 0.4) return "おおまかな形は見えてきました。まだ足りない波があります。";
  return "少ない波では、まだ元の音の形を表しきれていません。項を増やすと誤差は小さくなります。";
}

export function Simulator() {
  const [kind, setKind] = useState<SoundKind>("square");
  const [frequency, setFrequency] = useState(PRESETS.square.frequency);
  const [phase, setPhase] = useState(0);
  const [decay, setDecay] = useState(PRESETS.square.decay);
  const [chirp, setChirp] = useState(PRESETS.square.chirp);
  const [vowel, setVowel] = useState<Vowel>("a");
  const [termCount, setTermCount] = useState(PRESETS.square.terms);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [volume, setVolume] = useState(70);
  const [zoomRatio, setZoomRatio] = useState(0);
  const [upload, setUpload] = useState<{ samples: Float32Array; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [animCount, setAnimCount] = useState<number | null>(null);
  const [animPlaying, setAnimPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  const termLimitRef = useRef(1);
  const wantRef = useRef<{ mode: PlayMode | null; status: "stopped" | "playing" | "paused" }>({
    mode: null,
    status: "stopped",
  });

  const modelInput = useMemo(
    () => ({ kind, frequency, phase, decay, chirp, vowel, upload }),
    [kind, frequency, phase, decay, chirp, vowel, upload],
  );
  const deferredInput = useDeferredValue(modelInput);
  const pending = deferredInput !== modelInput;

  const player = useAudioPlayer(volume);
  const { play, pause, resume, stop } = player;

  const model = useMemo(() => {
    if (deferredInput.upload) return buildUploadModel(deferredInput.upload.samples, deferredInput.upload.name);
    return buildPresetModel(
      deferredInput.kind,
      deferredInput.frequency,
      (deferredInput.phase * Math.PI) / 180,
      deferredInput.decay,
      deferredInput.chirp,
      deferredInput.vowel,
    );
  }, [deferredInput]);

  const maxTerms = Math.max(1, model.terms.length);
  const safeTermCount = Math.min(Math.max(1, termCount), maxTerms);
  const effectiveCount = Math.min(animCount ?? safeTermCount, maxTerms);

  useEffect(() => {
    termLimitRef.current = safeTermCount;
  }, [safeTermCount]);

  const disabledSet = useMemo(() => new Set(disabled), [disabled]);
  const indices = useMemo(
    () => selectTermIndices(model.terms.map((term) => term.id), effectiveCount, disabledSet),
    [model.terms, effectiveCount, disabledSet],
  );
  const approximation = useMemo(() => {
    if (model.tracks.length === 0) return new Float32Array(model.original.length);
    return mixTracks(model.tracks, indices);
  }, [model.tracks, model.original.length, indices]);

  const zoom = useMemo(
    () => zoomWindow(model.duration, model.fundamental, zoomRatio),
    [model.duration, model.fundamental, zoomRatio],
  );
  const originalZoom = useMemo(
    () => sliceSamples(model.original, model.sampleRate, zoom.start, zoom.end),
    [model.original, model.sampleRate, zoom.start, zoom.end],
  );
  const approximationZoom = useMemo(
    () => sliceSamples(approximation, model.sampleRate, zoom.start, zoom.end),
    [approximation, model.sampleRate, zoom.start, zoom.end],
  );
  const zoomTracks = useMemo(
    () => model.tracks.map((track) => sliceSamples(track, model.sampleRate, zoom.start, zoom.end)),
    [model.tracks, model.sampleRate, zoom.start, zoom.end],
  );

  const mse = useMemo(() => meanSquareError(model.original, approximation), [model.original, approximation]);
  const energy = useMemo(() => meanSquare(model.original), [model.original]);
  const closeness = energy > 1e-10 ? Math.max(0, Math.min(1, 1 - mse / energy)) : 1;

  const stopAnimation = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setAnimPlaying(false);
    setAnimCount(null);
  }, []);

  const halt = useCallback(() => {
    wantRef.current = { mode: null, status: "stopped" };
    stop();
  }, [stop]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    const want = wantRef.current;
    if (want.mode !== "original") return;
    if (want.status === "playing") {
      void play(model.original, model.sampleRate, "original");
      return;
    }
    wantRef.current = { mode: null, status: "stopped" };
    stop();
  }, [model.original, model.sampleRate, play, stop]);

  useEffect(() => {
    const want = wantRef.current;
    if (want.mode !== "reconstruction") return;
    if (want.status === "playing") {
      void play(approximation, model.sampleRate, "reconstruction");
      return;
    }
    wantRef.current = { mode: null, status: "stopped" };
    stop();
  }, [approximation, model.sampleRate, play, stop]);

  const startAnimation = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimPlaying(false);
      setAnimCount(null);
      return;
    }
    let current = 1;
    setAnimPlaying(true);
    setAnimCount(1);
    timerRef.current = window.setInterval(() => {
      current += 1;
      if (current > termLimitRef.current) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setAnimPlaying(false);
        setAnimCount(null);
        return;
      }
      setAnimCount(current);
    }, 680);
  }, []);

  const selectKind = (next: SoundKind) => {
    stopAnimation();
    halt();
    const preset = PRESETS[next];
    setUpload(null);
    setKind(next);
    setFrequency(preset.frequency);
    setPhase(0);
    setDecay(preset.decay);
    setChirp(preset.chirp);
    setVowel(preset.vowel);
    setTermCount(preset.terms);
    setDisabled([]);
    setZoomRatio(0);
    setErrorMessage(null);
  };

  const toggleEnabled = (id: string) => {
    stopAnimation();
    const index = model.terms.findIndex((term) => term.id === id);
    if (index < 0) return;
    if (disabled.includes(id)) {
      setDisabled((previous) => previous.filter((item) => item !== id));
      if (index >= termCount) setTermCount(index + 1);
      return;
    }
    setDisabled((previous) => [...previous, id]);
  };

  const toggleFromSpectrum = (id: string) => {
    stopAnimation();
    const index = model.terms.findIndex((term) => term.id === id);
    if (index < 0) return;
    const inSum = index < safeTermCount && !disabled.includes(id);
    if (inSum) {
      setDisabled((previous) => [...previous, id]);
      return;
    }
    setDisabled((previous) => previous.filter((item) => item !== id));
    if (index >= termCount) setTermCount(index + 1);
  };

  const phaseOffset = model.mode === "preset" ? (deferredInput.phase * Math.PI) / 180 : 0;
  const includedTerms = indices.map((index) => model.terms[index]);
  const includedCoefficients = indices.map((index) => model.coefficients[index]);
  const markers = model.terms.map((term, index) => ({
    id: term.id,
    frequency: term.frequency,
    color: termColor(index),
    enabled: index < effectiveCount && !disabledSet.has(term.id),
  }));
  const explanation = explainSound(
    model.mode === "upload" ? "upload" : (model.kind ?? "sine"),
    model.terms,
    model.fundamental,
    deferredInput.vowel,
  );
  const latestIndex = indices[indices.length - 1];

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold tracking-[0.22em] text-[#0f6e6b]">FOURIER SOUND LAB</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1c2430] sm:text-5xl">音を分解してみよう</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#5e6874] sm:text-base">
          どんな複雑な音も、たくさんの単純な波の組み合わせとして見ることができます。
        </p>
        <nav className="mt-5 flex flex-wrap justify-center gap-2" aria-label="このページの流れ">
          {FLOW.map(([href, label], index) => (
            <a
              key={href}
              href={href}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#3d4654] ring-1 ring-[#e6ddd2]"
            >
              {index + 1}. {label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-5">
        <SectionCard
          id="pick"
          step="01"
          title="音を選ぶ"
          subtitle="サンプルを選ぶと、波形・スペクトル・式・再構成音がまとめて切り替わります。"
        >
          <SoundSelector value={upload ? null : kind} onChange={selectKind} />
          <div className="mt-4">
            <AudioUploader
              fileName={upload?.name ?? null}
              active={upload !== null}
              onLoad={(samples, name) => {
                stopAnimation();
                halt();
                setUpload({ samples, name });
                setDisabled([]);
                setTermCount(16);
                setZoomRatio(0);
                setErrorMessage(null);
              }}
              onClear={() => {
                halt();
                setUpload(null);
                setDisabled([]);
              }}
              onError={setErrorMessage}
            />
          </div>
          {errorMessage ? (
            <p className="mt-3 rounded-xl bg-[#fff1f2] px-3 py-2 text-sm text-[#9f1239]">{errorMessage}</p>
          ) : null}
          <div className="mt-5">
            <ParameterControls
              kind={upload ? null : kind}
              frequency={frequency}
              phase={phase}
              decay={decay}
              chirp={chirp}
              vowel={vowel}
              onFrequency={(value) => {
                setFrequency(value);
              }}
              onPhase={setPhase}
              onDecay={setDecay}
              onChirp={setChirp}
              onVowel={setVowel}
            />
          </div>
          {pending ? <p className="mt-3 text-xs text-[#0f6e6b]">波形を計算しています…</p> : null}
          <div className="mt-6 border-t border-[#efe6dc] pt-5">
            <AudioPlayer
              playback={player.playback}
              volume={volume}
              onVolume={setVolume}
              onPlayOriginal={() => {
                wantRef.current = { mode: "original", status: "playing" };
                void play(model.original, model.sampleRate, "original");
              }}
              onPlayReconstruction={() => {
                wantRef.current = { mode: "reconstruction", status: "playing" };
                void play(approximation, model.sampleRate, "reconstruction");
              }}
              onPause={() => {
                wantRef.current = { ...wantRef.current, status: "paused" };
                pause();
              }}
              onResume={() => {
                if (!wantRef.current.mode) return;
                wantRef.current = { ...wantRef.current, status: "playing" };
                void resume();
              }}
              onStop={halt}
              getProgress={player.getProgress}
            />
            <p className="mt-3 text-xs leading-5 text-[#8a8175]">
              再構成音は、いま選んでいる波だけを足したものです。項を変えると、再生中の音も切り替わります。
            </p>
          </div>
        </SectionCard>

        <SectionCard
          id="wave"
          step="02"
          title="元の音の波形"
          subtitle="上は数周期を拡大した形、下は最初から最後までの変化です。緑の帯が、拡大している時刻です。"
        >
          <WaveformChart
            samples={originalZoom}
            sampleRate={model.sampleRate}
            timeStart={zoom.start}
            label="元の音の拡大波形"
          />
          <label className="mt-4 block">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-medium">拡大して見る時刻</span>
              <span className="font-mono text-[#0f6e6b]">{zoom.start.toFixed(2)} 秒</span>
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(zoomRatio * 1000)}
              aria-label="拡大して見る時刻"
              onChange={(event) => setZoomRatio(Number(event.target.value) / 1000)}
              className="mt-2 w-full accent-[#0f6e6b]"
            />
          </label>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">時間とともにどう変わるか</p>
            <OverviewChart
              samples={model.original}
              sampleRate={model.sampleRate}
              highlightStart={zoom.start}
              highlightEnd={zoom.end}
            />
          </div>
        </SectionCard>

        <SectionCard
          id="spectrum"
          step="03"
          title="音を周波数に分解すると？"
          subtitle="山が高いほど、その高さの波が強く含まれています。"
        >
          <SpectrumChart
            points={model.spectrum.points}
            maxFrequency={model.spectrum.maxFrequency}
            markers={markers}
            onToggle={toggleFromSpectrum}
          />
          <div className="mt-4">
            <FftNote />
          </div>
        </SectionCard>

        <SectionCard
          id="formula"
          step="04"
          title="フーリエ級数"
          subtitle="複雑な音を、sin と cos の足し算として書いた式です。係数は波形から計算しています。"
        >
          <FourierFormula
            terms={includedTerms}
            coefficients={includedCoefficients}
            phaseOffset={phaseOffset}
            fundamental={model.fundamental}
            kind={model.kind}
            frequency={model.fundamental}
            squareCount={effectiveCount}
          />
        </SectionCard>

        <SectionCard
          id="count"
          step="05"
          title="使用する波の数"
          subtitle="項を増やすほど、合成波は元の音に近づきます。"
        >
          <FourierSlider
            value={safeTermCount}
            max={maxTerms}
            onChange={(value) => {
              stopAnimation();
              setTermCount(value);
            }}
          />
          {model.kind === "square" && safeTermCount < 15 ? (
            <p className="mt-3 rounded-xl bg-[#f3faf8] px-3 py-2 text-sm leading-6 text-[#115e59]">
              スライダーを右へ動かすと、角が立って矩形波に近づきます。
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          id="parts"
          step="06"
          title="1本ずつの波"
          subtitle="それぞれの周波数、振幅、位相、フーリエ係数です。チェックを外すとその波が合成から消えます。"
        >
          <FourierTerms
            terms={model.terms}
            tracks={zoomTracks}
            coefficients={model.coefficients}
            activeCount={effectiveCount}
            disabled={disabledSet}
            phaseOffset={phaseOffset}
            fundamental={model.fundamental}
            highlightIndex={animPlaying && latestIndex !== undefined ? latestIndex : null}
            onToggle={toggleEnabled}
            onEnableAll={() => setDisabled([])}
          />
        </SectionCard>

        <SectionCard
          id="sum"
          step="07"
          title="sin波を重ね合わせる"
          subtitle="単純な波から始めて、1本ずつ足していきます。"
        >
          <SynthesisAnimation
            playing={animPlaying}
            shown={effectiveCount}
            total={safeTermCount}
            included={includedTerms}
            latestTrack={latestIndex === undefined ? null : (zoomTracks[latestIndex] ?? null)}
            sumSamples={approximationZoom}
            sampleRate={model.sampleRate}
            timeStart={zoom.start}
            onStart={startAnimation}
            onStop={stopAnimation}
          />
        </SectionCard>

        <SectionCard
          id="compare"
          step="08"
          title="元の波形 vs 近似波形"
          subtitle="同じ時刻を拡大しています。項を増やすと、破線が実線に重なっていきます。"
          emphasis
        >
          <ReconstructionChart
            original={originalZoom}
            approximation={approximationZoom}
            sampleRate={model.sampleRate}
            timeStart={zoom.start}
          />
        </SectionCard>

        <SectionCard
          id="error"
          step="09"
          title="平均二乗誤差"
          subtitle="元の波形と近似のズレです。0 に近いほど、よく似ています。2秒全体で計算しています。"
        >
          <ErrorDisplay
            usedCount={indices.length}
            mse={mse}
            closeness={closeness}
            caption={closenessCaption(closeness, indices.length, model.terms.length, model.mode === "upload")}
          />
        </SectionCard>

        <SectionCard id="about" step="10" title="この音の正体" subtitle="いま聴いている音が、どんな波の足し算なのか。">
          <SoundExplanation explanation={explanation} />
        </SectionCard>
      </div>
    </div>
  );
}
