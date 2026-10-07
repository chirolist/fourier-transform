import type { FourierCoefficient, Term } from "./types";

export function wrapPhase(phase: number): number {
  const tau = Math.PI * 2;
  let wrapped = phase % tau;
  if (wrapped > Math.PI) wrapped -= tau;
  if (wrapped < -Math.PI) wrapped += tau;
  return wrapped;
}

/** 基本波の位相を、時間ずれとして各成分へ配る。 */
export function renderedPhase(term: Term, phaseOffset: number, fundamental: number): number {
  if (term.frequency <= 0 || fundamental <= 0) return wrapPhase(term.phase);
  return wrapPhase(term.phase + phaseOffset * (term.frequency / fundamental));
}

function syllableEnvelope(localTime: number, duration: number): number {
  const x = localTime / duration;
  if (x <= 0 || x >= 1) return 0;
  const attack = 1 - Math.exp(-28 * x);
  const body = Math.exp(-7 * (x - 0.12) * (x - 0.12));
  return attack * body;
}

export function renderTerm(
  term: Term,
  sampleRate: number,
  length: number,
  phaseOffset: number,
  fundamental: number,
): Float32Array {
  const out = new Float32Array(length);
  if (length === 0 || term.amplitude === 0) return out;

  if (term.frequency <= 0) {
    out.fill(term.amplitude);
    return out;
  }

  const phase0 = renderedPhase(term, phaseOffset, fundamental);

  if (term.syllables.length === 0 && term.chirpRate === 0) {
    const dPhase = (2 * Math.PI * term.frequency) / sampleRate;
    let phase = phase0;
    if (term.decay < 1e-8) {
      const amp = term.amplitude;
      for (let i = 0; i < length; i++) {
        out[i] = amp * Math.sin(phase);
        phase += dPhase;
      }
      return out;
    }
    const decayStep = Math.exp(-term.decay / sampleRate);
    let amp = term.amplitude;
    for (let i = 0; i < length; i++) {
      out[i] = amp * Math.sin(phase);
      phase += dPhase;
      amp *= decayStep;
    }
    return out;
  }

  const syllables =
    term.syllables.length > 0
      ? term.syllables
      : [{ start: 0, duration: length / sampleRate, freqScale: 1 }];

  for (const syllable of syllables) {
    const startIndex = Math.max(0, Math.floor(syllable.start * sampleRate));
    const endIndex = Math.min(length, Math.ceil((syllable.start + syllable.duration) * sampleRate));
    const baseFreq = term.frequency * syllable.freqScale;
    const chirp = term.chirpRate * syllable.freqScale;
    const nyquist = sampleRate * 0.48;
    for (let i = startIndex; i < endIndex; i++) {
      const time = i / sampleRate;
      const local = time - syllable.start;
      const instantaneous = baseFreq + chirp * local;
      if (instantaneous < 20 || instantaneous >= nyquist) continue;
      const envelope = term.syllables.length > 0 ? syllableEnvelope(local, syllable.duration) : 1;
      const decay = Math.exp(-term.decay * time);
      const phase = 2 * Math.PI * (baseFreq * local + 0.5 * chirp * local * local) + phase0;
      out[i] += term.amplitude * envelope * decay * Math.sin(phase);
    }
  }
  return out;
}

export function mixTracks(tracks: Float32Array[], indices: number[]): Float32Array {
  const length = tracks[0]?.length ?? 0;
  const out = new Float32Array(length);
  for (const index of indices) {
    const track = tracks[index];
    if (!track) continue;
    for (let i = 0; i < length; i++) out[i] += track[i];
  }
  return out;
}

export function meanSquare(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return sum / samples.length;
}

export function meanSquareError(actual: Float32Array, expected: Float32Array): number {
  const length = Math.min(actual.length, expected.length);
  if (length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < length; i++) {
    const delta = actual[i] - expected[i];
    sum += delta * delta;
  }
  return sum / length;
}

export function measureFourier(
  samples: Float32Array,
  sampleRate: number,
  frequency: number,
): FourierCoefficient {
  const length = samples.length;
  if (length === 0) return { a: 0, b: 0 };
  if (frequency <= 0) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += samples[i];
    return { a: sum / length, b: 0 };
  }
  const delta = (2 * Math.PI * frequency) / sampleRate;
  let phase = 0;
  let sumCos = 0;
  let sumSin = 0;
  for (let i = 0; i < length; i++) {
    const value = samples[i];
    sumCos += value * Math.cos(phase);
    sumSin += value * Math.sin(phase);
    phase += delta;
  }
  return { a: (2 * sumCos) / length, b: (2 * sumSin) / length };
}

/** 振幅一定の成分なら、式から係数がそのまま決まる。 */
export function analyticalCoefficient(
  term: Term,
  phaseOffset: number,
  fundamental: number,
): FourierCoefficient | null {
  if (term.decay > 1e-6 || term.chirpRate !== 0 || term.syllables.length > 0) return null;
  const phase = renderedPhase(term, phaseOffset, fundamental);
  return {
    a: term.amplitude * Math.sin(phase),
    b: term.amplitude * Math.cos(phase),
  };
}

export function selectTermIndices(termIds: string[], count: number, disabled: ReadonlySet<string>): number[] {
  const limit = Math.max(0, Math.min(count, termIds.length));
  const indices: number[] = [];
  for (let index = 0; index < limit; index++) {
    if (!disabled.has(termIds[index])) indices.push(index);
  }
  return indices;
}

export function zoomWindow(duration: number, frequency: number, ratio: number): { start: number; end: number } {
  const safeFrequency = Math.max(40, frequency || 120);
  const window = Math.min(0.06, Math.max(0.012, 3 / safeFrequency));
  const maxStart = Math.max(0, duration - window);
  const start = maxStart * Math.min(1, Math.max(0, ratio));
  return { start, end: Math.min(duration, start + window) };
}

export function sliceSamples(samples: Float32Array, sampleRate: number, start: number, end: number): Float32Array {
  const from = Math.max(0, Math.floor(start * sampleRate));
  const to = Math.min(samples.length, Math.max(from + 2, Math.ceil(end * sampleRate)));
  return samples.subarray(from, to);
}

export function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;
  const outLength = Math.max(1, Math.round((input.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  const ratio = fromRate / toRate;
  const last = input.length - 1;
  for (let i = 0; i < outLength; i++) {
    const position = i * ratio;
    const left = Math.min(last, Math.floor(position));
    const right = Math.min(last, left + 1);
    const blend = position - left;
    out[i] = input[left] * (1 - blend) + input[right] * blend;
  }
  return out;
}

export function shapeForPlayback(samples: Float32Array, sampleRate: number): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 1e-8 ? 0.9 / peak : 0;
  const out = new Float32Array(samples.length);
  const fade = Math.min(Math.floor(sampleRate * 0.012), Math.floor(samples.length / 10));
  for (let i = 0; i < samples.length; i++) {
    let window = 1;
    if (fade > 0 && i < fade) window = i / fade;
    else if (fade > 0 && i > samples.length - fade) window = (samples.length - i) / fade;
    out[i] = samples[i] * gain * Math.max(0, window);
  }
  return out;
}
