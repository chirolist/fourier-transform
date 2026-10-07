import { largestPow2 } from "./fft";
import { fft } from "./fft";
import type { FourierCoefficient, Spectrum, SpectrumPoint, Term } from "./types";

export interface BinSpectrum {
  sampleRate: number;
  fftSize: number;
  /** 片側の振幅。index はビン番号 */
  amplitudes: Float64Array;
  re: Float64Array;
  im: Float64Array;
}

function periodicHann(index: number, size: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * index) / size));
}

export function analyzeBins(samples: Float32Array, sampleRate: number, windowed: boolean): BinSpectrum {
  const fftSize = largestPow2(Math.min(samples.length, 65536), 65536);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  let windowSum = 0;
  const length = Math.min(samples.length, fftSize);
  for (let i = 0; i < length; i++) {
    const window = windowed ? periodicHann(i, fftSize) : 1;
    windowSum += window;
    re[i] = samples[i] * window;
  }
  if (windowSum <= 0) windowSum = 1;
  fft(re, im);
  const amplitudes = new Float64Array(fftSize / 2);
  amplitudes[0] = Math.abs(re[0]) / windowSum;
  for (let k = 1; k < fftSize / 2; k++) {
    amplitudes[k] = (2 * Math.hypot(re[k], im[k])) / windowSum;
  }
  return { sampleRate, fftSize, amplitudes, re, im };
}

/** 矩形窓の FFT から、a cos(2πft) + b sin(2πft) の係数を読む。 */
export function coefficientFromBin(
  bins: BinSpectrum,
  frequency: number,
): FourierCoefficient | null {
  if (frequency <= 0) {
    return { a: bins.re[0] / bins.fftSize, b: 0 };
  }
  const exact = (frequency * bins.fftSize) / bins.sampleRate;
  const bin = Math.round(exact);
  if (bin <= 0 || bin >= bins.fftSize / 2) return null;
  if (Math.abs(exact - bin) > 0.03) return null;
  return {
    a: (2 * bins.re[bin]) / bins.fftSize,
    b: (-2 * bins.im[bin]) / bins.fftSize,
  };
}

export function computeSpectrum(samples: Float32Array, sampleRate: number, focusHz: number): Spectrum {
  if (samples.length < 32) {
    return { points: [], maxFrequency: Math.max(2000, focusHz) };
  }
  const bins = analyzeBins(samples, sampleRate, true);
  const binWidth = sampleRate / bins.fftSize;
  let peak = 0;
  for (let k = 1; k < bins.amplitudes.length; k++) {
    if (bins.amplitudes[k] > peak) peak = bins.amplitudes[k];
  }
  let highest = Math.max(800, focusHz);
  const gate = peak * 0.015;
  for (let k = 1; k < bins.amplitudes.length; k++) {
    if (bins.amplitudes[k] >= gate) highest = Math.max(highest, k * binWidth);
  }
  const maxFrequency = Math.min(sampleRate / 2, Math.max(2000, highest * 1.12, focusHz * 4));
  const maxBin = Math.max(2, Math.min(bins.amplitudes.length - 1, Math.ceil(maxFrequency / binWidth)));
  const bucketCount = Math.min(480, maxBin);
  const points: SpectrumPoint[] = [];
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = Math.floor((bucket * maxBin) / bucketCount);
    const end = Math.max(start + 1, Math.floor(((bucket + 1) * maxBin) / bucketCount));
    let amplitude = 0;
    for (let k = start; k < end; k++) amplitude = Math.max(amplitude, bins.amplitudes[k]);
    points.push({
      frequency: ((start + end) / 2) * binWidth,
      amplitude,
    });
  }
  return { points, maxFrequency };
}

export function extractUploadTerms(samples: Float32Array, sampleRate: number, limit: number): Term[] {
  const bins = analyzeBins(samples, sampleRate, false);
  const ranked: { bin: number; amplitude: number; phase: number }[] = [];
  for (let k = 1; k < bins.fftSize / 2; k++) {
    const amplitude = (2 * Math.hypot(bins.re[k], bins.im[k])) / bins.fftSize;
    if (amplitude < 1e-4) continue;
    const cosPhase = Math.atan2(bins.im[k], bins.re[k]);
    ranked.push({ bin: k, amplitude, phase: cosPhase + Math.PI / 2 });
  }
  ranked.sort((a, b) => b.amplitude - a.amplitude);
  const strongest = ranked[0]?.amplitude ?? 1;
  const chosen = ranked.filter((peak) => peak.amplitude >= strongest * 0.01).slice(0, limit);
  const terms: Term[] = [];
  const dc = bins.re[0] / bins.fftSize;
  if (Math.abs(dc) >= strongest * 0.03) {
    terms.push({
      id: "dc",
      frequency: 0,
      amplitude: dc,
      phase: 0,
      decay: 0,
      chirpRate: 0,
      syllables: [],
      harmonic: null,
    });
  }
  for (const peak of chosen) {
    terms.push({
      id: `bin-${peak.bin}`,
      frequency: (peak.bin * sampleRate) / bins.fftSize,
      amplitude: peak.amplitude,
      phase: peak.phase,
      decay: 0,
      chirpRate: 0,
      syllables: [],
      harmonic: null,
    });
  }
  terms.sort((a, b) => Math.abs(b.amplitude) - Math.abs(a.amplitude));
  return terms;
}
