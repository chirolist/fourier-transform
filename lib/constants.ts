/** 2秒ちょうどが 2 の累乗サンプルになり、整数 Hz が FFT のビンに乗る。 */
export const SAMPLE_RATE = 32768;
export const DURATION = 2;
export const SAMPLE_LENGTH = SAMPLE_RATE * DURATION;

export const MAX_PRESET_TERMS = 50;
export const MAX_UPLOAD_COMPONENTS = 100;

export const TERM_COLORS = [
  "#0f6e6b",
  "#d4532b",
  "#2c5aa0",
  "#b58105",
  "#7c3aed",
  "#0e7490",
  "#be123c",
  "#4d7c0f",
  "#c026d3",
  "#0369a1",
];

export function termColor(index: number): string {
  return TERM_COLORS[index % TERM_COLORS.length];
}
