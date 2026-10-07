import { renderedPhase } from "./signal";
import type { Term } from "./types";

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 5 * 10 ** -(digits + 1)) return "0";
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(digits);
}

export function formatHz(frequency: number): string {
  if (!Number.isFinite(frequency)) return "0";
  if (Math.abs(frequency) >= 100 || Math.abs(frequency - Math.round(frequency)) < 0.05) {
    return String(Math.round(frequency));
  }
  return frequency.toFixed(1);
}

export function formatMse(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value !== 0 && value < 0.0001) return value.toExponential(2);
  return value.toFixed(4);
}

function phaseSuffix(phase: number, tex: boolean): string {
  if (Math.abs(phase) < 0.08) return "";
  const sign = phase > 0 ? "+" : "-";
  const body = Math.abs(phase).toFixed(2);
  return tex ? `${sign}${body}` : ` ${sign} ${body}`;
}

export function termPlain(term: Term, phaseOffset: number, fundamental: number): string {
  const amplitude = formatNumber(term.amplitude);
  if (term.frequency <= 0) return amplitude;
  const frequency = formatHz(term.frequency);
  const phase = phaseSuffix(renderedPhase(term, phaseOffset, fundamental), false);
  if (term.chirpRate !== 0) {
    const half = formatNumber(Math.abs(term.chirpRate) / 2);
    return `${amplitude} sin(2π(${frequency}t + ${half}t²))`;
  }
  const wave = `sin(2π × ${frequency} t${phase})`;
  if (term.decay > 0.01) return `${amplitude} e^(−${formatNumber(term.decay)}t) ${wave}`;
  return `${amplitude} ${wave}`;
}

export function termTex(term: Term, phaseOffset: number, fundamental: number): string {
  const amplitude = formatNumber(term.amplitude);
  if (term.frequency <= 0) return amplitude;
  const frequency = formatHz(term.frequency);
  const phase = phaseSuffix(renderedPhase(term, phaseOffset, fundamental), true);
  if (term.chirpRate !== 0) {
    const half = formatNumber(Math.abs(term.chirpRate) / 2);
    return `${amplitude}\\sin\\!\\left(2\\pi\\left(${frequency}t+${half}t^{2}\\right)\\right)`;
  }
  const decay = term.decay > 0.01 ? `e^{-${formatNumber(term.decay)}t}` : "";
  return `${amplitude}${decay}\\sin(2\\pi\\cdot ${frequency}t${phase})`;
}

export function seriesTex(terms: Term[], phaseOffset: number, fundamental: number): string {
  if (terms.length === 0) return "f(t)=0";
  const visible = terms.slice(0, 6).map((term) => termTex(term, phaseOffset, fundamental));
  const hidden = terms.length > 6 ? `+\\cdots` : "";
  const lines = visible.map((part, index) => (index === 0 ? part : `+${part}`));
  if (hidden) lines.push(hidden);
  return `\\begin{aligned} f(t)&= ${lines.join(" \\\\ &\\quad ")} \\end{aligned}`;
}

export function squareTextbookTex(count: number, frequency: number): string {
  const shown = Math.min(count, 5);
  const parts = Array.from({ length: shown }, (_, index) => {
    const harmonic = index * 2 + 1;
    if (harmonic === 1) return "\\sin\\omega t";
    return `\\frac{1}{${harmonic}}\\sin ${harmonic}\\omega t`;
  });
  const tail = count > shown ? "+\\cdots" : "";
  return `x(t)=\\frac{4}{\\pi}\\left(${parts.join("+")}${tail}\\right),\\quad \\omega=2\\pi\\cdot ${formatHz(frequency)}`;
}

export const GENERAL_SERIES_TEX =
  "f(t)=\\dfrac{a_0}{2}+\\sum_{n=1}^{N}\\left[a_n\\cos(n\\omega_0 t)+b_n\\sin(n\\omega_0 t)\\right]";
