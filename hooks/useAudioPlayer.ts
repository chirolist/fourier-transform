"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { shapeForPlayback } from "@/lib/signal";
import type { PlayMode } from "@/lib/types";

export interface PlaybackState {
  status: "stopped" | "playing" | "paused";
  mode: PlayMode | null;
}

export function useAudioPlayer(volumePercent: number) {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const tokenRef = useRef(0);
  const playingRef = useRef<{
    samples: Float32Array;
    sampleRate: number;
    offset: number;
    startedAt: number;
    mode: PlayMode;
  } | null>(null);
  const volumeRef = useRef(volumePercent / 100);
  const [playback, setPlayback] = useState<PlaybackState>({ status: "stopped", mode: null });

  const stopSource = useCallback(() => {
    const source = sourceRef.current;
    if (!source) return;
    source.onended = null;
    try {
      source.stop();
    } catch {
      // すでに止まっている
    }
    source.disconnect();
    sourceRef.current = null;
  }, []);

  const ensure = useCallback(() => {
    if (!contextRef.current) {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.connect(context.destination);
      contextRef.current = context;
      gainRef.current = gain;
    }
    gainRef.current!.gain.value = volumeRef.current;
    return contextRef.current;
  }, []);

  useEffect(() => {
    volumeRef.current = volumePercent / 100;
    const gain = gainRef.current;
    const context = contextRef.current;
    if (!gain || !context) return;
    gain.gain.setTargetAtTime(volumeRef.current, context.currentTime, 0.03);
  }, [volumePercent]);

  const startSource = useCallback(() => {
    const context = contextRef.current;
    const info = playingRef.current;
    const gain = gainRef.current;
    if (!context || !info || !gain) return;
    stopSource();
    const buffer = context.createBuffer(1, info.samples.length, info.sampleRate);
    buffer.getChannelData(0).set(info.samples);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    const duration = info.samples.length / info.sampleRate;
    const offset = ((info.offset % duration) + duration) % duration;
    source.start(0, offset);
    info.offset = offset;
    info.startedAt = context.currentTime;
    sourceRef.current = source;
  }, [stopSource]);

  const play = useCallback(
    async (samples: Float32Array, sampleRate: number, mode: PlayMode) => {
      const token = ++tokenRef.current;
      const context = ensure();
      if (context.state === "suspended") await context.resume();
      if (token !== tokenRef.current) return;
      playingRef.current = {
        samples: shapeForPlayback(samples, sampleRate),
        sampleRate,
        offset: 0,
        startedAt: 0,
        mode,
      };
      startSource();
      setPlayback({ status: "playing", mode });
    },
    [ensure, startSource],
  );

  const pause = useCallback(() => {
    const context = contextRef.current;
    const info = playingRef.current;
    if (!context || !info || !sourceRef.current) return;
    const duration = info.samples.length / info.sampleRate;
    info.offset = (info.offset + (context.currentTime - info.startedAt)) % duration;
    stopSource();
    setPlayback({ status: "paused", mode: info.mode });
  }, [stopSource]);

  const resume = useCallback(async () => {
    const info = playingRef.current;
    if (!info) return;
    const token = ++tokenRef.current;
    const context = ensure();
    if (context.state === "suspended") await context.resume();
    if (token !== tokenRef.current) return;
    startSource();
    setPlayback({ status: "playing", mode: info.mode });
  }, [ensure, startSource]);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    stopSource();
    playingRef.current = null;
    setPlayback((previous) => (previous.status === "stopped" ? previous : { status: "stopped", mode: null }));
  }, [stopSource]);

  const getProgress = useCallback(() => {
    const info = playingRef.current;
    if (!info) return 0;
    const duration = info.samples.length / info.sampleRate;
    if (duration <= 0) return 0;
    const context = contextRef.current;
    if (!context || !sourceRef.current) return info.offset / duration;
    const elapsed = context.currentTime - info.startedAt;
    return ((info.offset + elapsed) % duration) / duration;
  }, []);

  useEffect(
    () => () => {
      stopSource();
      void contextRef.current?.close();
      contextRef.current = null;
    },
    [stopSource],
  );

  return { playback, play, pause, resume, stop, getProgress };
}
