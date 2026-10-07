import { DURATION, MAX_PRESET_TERMS, SAMPLE_RATE } from "./constants";
import type { SoundKind, Syllable, Term, Vowel } from "./types";

export interface PresetDefaults {
  frequency: number;
  decay: number;
  chirp: number;
  vowel: Vowel;
  terms: number;
}

export const PRESETS: Record<SoundKind, PresetDefaults> = {
  sine: { frequency: 440, decay: 1.5, chirp: 900, vowel: "a", terms: 1 },
  square: { frequency: 120, decay: 1.5, chirp: 900, vowel: "a", terms: 5 },
  bell: { frequency: 220, decay: 1.6, chirp: 900, vowel: "a", terms: 6 },
  bird: { frequency: 1500, decay: 1.5, chirp: 1100, vowel: "a", terms: 3 },
  piano: { frequency: 262, decay: 1.3, chirp: 900, vowel: "a", terms: 8 },
  voice: { frequency: 140, decay: 1.5, chirp: 900, vowel: "a", terms: 12 },
};

export const VOWEL_INFO: Record<
  Vowel,
  { label: string; formants: { frequency: number; bandwidth: number; gain: number }[] }
> = {
  a: {
    label: "あ",
    formants: [
      { frequency: 800, bandwidth: 80, gain: 1 },
      { frequency: 1200, bandwidth: 90, gain: 0.72 },
      { frequency: 2600, bandwidth: 140, gain: 0.32 },
    ],
  },
  i: {
    label: "い",
    formants: [
      { frequency: 280, bandwidth: 60, gain: 0.55 },
      { frequency: 2300, bandwidth: 110, gain: 1 },
      { frequency: 3000, bandwidth: 140, gain: 0.42 },
    ],
  },
  u: {
    label: "う",
    formants: [
      { frequency: 340, bandwidth: 60, gain: 1 },
      { frequency: 820, bandwidth: 80, gain: 0.32 },
      { frequency: 2300, bandwidth: 130, gain: 0.12 },
    ],
  },
  e: {
    label: "え",
    formants: [
      { frequency: 520, bandwidth: 70, gain: 1 },
      { frequency: 1840, bandwidth: 100, gain: 0.58 },
      { frequency: 2500, bandwidth: 140, gain: 0.24 },
    ],
  },
  o: {
    label: "お",
    formants: [
      { frequency: 480, bandwidth: 70, gain: 1 },
      { frequency: 860, bandwidth: 80, gain: 0.48 },
      { frequency: 2500, bandwidth: 140, gain: 0.16 },
    ],
  },
};

const BELL_PARTIALS: { ratio: number; amplitude: number; decay: number }[] = [
  { ratio: 0.5, amplitude: 0.34, decay: 0.55 },
  { ratio: 1, amplitude: 0.62, decay: 0.9 },
  { ratio: 1.2, amplitude: 0.46, decay: 1.35 },
  { ratio: 1.5, amplitude: 0.3, decay: 1.7 },
  { ratio: 2, amplitude: 0.5, decay: 2.1 },
  { ratio: 2.4, amplitude: 0.24, decay: 2.6 },
  { ratio: 2.5, amplitude: 0.18, decay: 2.9 },
  { ratio: 3, amplitude: 0.16, decay: 3.3 },
  { ratio: 3.6, amplitude: 0.1, decay: 3.9 },
  { ratio: 4.2, amplitude: 0.08, decay: 4.6 },
  { ratio: 5.1, amplitude: 0.05, decay: 5.4 },
  { ratio: 6, amplitude: 0.035, decay: 6.2 },
];

function tone(id: string, frequency: number, amplitude: number, decay = 0, harmonic: number | null = null): Term {
  return {
    id,
    frequency,
    amplitude,
    phase: 0,
    decay,
    chirpRate: 0,
    syllables: [],
    harmonic,
  };
}

function scalePeak(terms: Term[], peak: number): Term[] {
  const maxAmp = terms.reduce((max, term) => Math.max(max, Math.abs(term.amplitude)), 0);
  if (maxAmp < 1e-8) return terms;
  const gain = peak / maxAmp;
  return terms.map((term) => ({ ...term, amplitude: term.amplitude * gain }));
}

function createSine(frequency: number): Term[] {
  return [tone("sine-1", frequency, 0.8, 0, 1)];
}

function createSquare(frequency: number): Term[] {
  const nyquist = SAMPLE_RATE * 0.45;
  const terms: Term[] = [];
  let harmonic = 1;
  while (harmonic * frequency < nyquist && terms.length < MAX_PRESET_TERMS) {
    terms.push(tone(`square-${harmonic}`, harmonic * frequency, 4 / (Math.PI * harmonic), 0, harmonic));
    harmonic += 2;
  }
  return terms;
}

function createBell(frequency: number, decayScale: number): Term[] {
  const nyquist = SAMPLE_RATE * 0.45;
  const terms = BELL_PARTIALS.flatMap((partial) => {
    const freq = frequency * partial.ratio;
    if (freq >= nyquist || freq < 15) return [];
    return [
      tone(
        `bell-${partial.ratio}`,
        freq,
        partial.amplitude,
        partial.decay * decayScale,
        null,
      ),
    ];
  });
  return scalePeak(terms, 0.75);
}

function birdSyllables(): Syllable[] {
  return [
    { start: 0.06, duration: 0.34, freqScale: 1 },
    { start: 0.48, duration: 0.28, freqScale: 1.08 },
    { start: 0.88, duration: 0.36, freqScale: 0.94 },
    { start: 1.36, duration: 0.46, freqScale: 1.18 },
  ];
}

function createBird(frequency: number, chirp: number): Term[] {
  const syllables = birdSyllables();
  const weights = [1, 0.48, 0.26, 0.14, 0.08, 0.05];
  const nyquist = SAMPLE_RATE * 0.45;
  const terms: Term[] = [];
  weights.forEach((weight, index) => {
    const harmonic = index + 1;
    const freq = frequency * harmonic;
    if (freq >= nyquist) return;
    terms.push({
      id: `bird-${harmonic}`,
      frequency: freq,
      amplitude: weight,
      phase: 0,
      decay: 0,
      chirpRate: chirp * harmonic,
      syllables,
      harmonic,
    });
  });
  return scalePeak(terms, 0.72);
}

function createPiano(frequency: number, decayScale: number): Term[] {
  const nyquist = SAMPLE_RATE * 0.45;
  const terms: Term[] = [];
  for (let harmonic = 1; harmonic <= 24; harmonic++) {
    const stretched = harmonic * frequency * Math.sqrt(1 + 0.00018 * harmonic * harmonic);
    if (stretched >= nyquist) break;
    const amplitude = 1 / harmonic ** 1.12;
    const decay = decayScale * (0.55 + 0.28 * harmonic);
    terms.push(tone(`piano-${harmonic}`, stretched, amplitude, decay, harmonic));
  }
  return scalePeak(terms, 0.8);
}

function formantGain(frequency: number, vowel: Vowel): number {
  let gain = 0;
  for (const formant of VOWEL_INFO[vowel].formants) {
    const x = (frequency - formant.frequency) / formant.bandwidth;
    gain += formant.gain * Math.exp(-0.5 * x * x);
  }
  return gain;
}

function createVoice(frequency: number, vowel: Vowel): Term[] {
  const nyquist = Math.min(SAMPLE_RATE * 0.45, 5200);
  const terms: Term[] = [];
  let harmonic = 1;
  while (harmonic * frequency < nyquist && terms.length < 36) {
    const freq = harmonic * frequency;
    const source = 1 / harmonic;
    const amplitude = source * (0.2 + formantGain(freq, vowel));
    if (amplitude > 0.004) {
      terms.push(tone(`voice-${vowel}-${harmonic}`, freq, amplitude, 0, harmonic));
    }
    harmonic += 1;
  }
  return scalePeak(terms, 0.7);
}

export function createTerms(
  kind: SoundKind,
  frequency: number,
  decay: number,
  chirp: number,
  vowel: Vowel,
): Term[] {
  const safeFrequency = Math.min(2000, Math.max(20, frequency));
  switch (kind) {
    case "sine":
      return createSine(safeFrequency);
    case "square":
      return createSquare(safeFrequency);
    case "bell":
      return createBell(safeFrequency, decay);
    case "bird":
      return createBird(safeFrequency, chirp);
    case "piano":
      return createPiano(safeFrequency, decay);
    case "voice":
      return createVoice(safeFrequency, vowel);
  }
}

export function soundLabel(kind: SoundKind): string {
  switch (kind) {
    case "sine":
      return "正弦波";
    case "square":
      return "矩形波";
    case "bell":
      return "鐘";
    case "bird":
      return "鳥の声";
    case "piano":
      return "ピアノ";
    case "voice":
      return "人の声";
  }
}

export const SIGNAL_DURATION = DURATION;
