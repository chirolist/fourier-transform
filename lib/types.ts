export type SoundKind = "sine" | "square" | "bell" | "bird" | "piano" | "voice";

export type Vowel = "a" | "i" | "u" | "e" | "o";

export interface Syllable {
  start: number;
  duration: number;
  freqScale: number;
}

/** 音を構成する1本の波。 */
export interface Term {
  id: string;
  frequency: number;
  /** t = 0 での振幅 */
  amplitude: number;
  /** sin の位相（ラジアン） */
  phase: number;
  /** 指数減衰 λ。0 なら振幅一定 */
  decay: number;
  /** さえずりの中で周波数が上がる速さ（Hz/秒） */
  chirpRate: number;
  /** 空なら区間全体で鳴る */
  syllables: Syllable[];
  /** 倍音次数。矩形波なら 1, 3, 5… */
  harmonic: number | null;
}

export interface SpectrumPoint {
  frequency: number;
  amplitude: number;
}

export interface FourierCoefficient {
  a: number;
  b: number;
}

export interface Spectrum {
  points: SpectrumPoint[];
  maxFrequency: number;
}

export type PlayMode = "original" | "reconstruction";
