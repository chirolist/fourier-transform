import { analyzeBins, coefficientFromBin, computeSpectrum, extractUploadTerms } from "./analyze";
import { MAX_UPLOAD_COMPONENTS, SAMPLE_LENGTH, SAMPLE_RATE } from "./constants";
import { createTerms } from "./sounds";
import { analyticalCoefficient, measureFourier, mixTracks, renderTerm } from "./signal";
import type { FourierCoefficient, SoundKind, Spectrum, Term, Vowel } from "./types";

export interface BuiltModel {
  mode: "preset" | "upload";
  kind: SoundKind | null;
  fileName: string | null;
  fundamental: number;
  sampleRate: number;
  duration: number;
  terms: Term[];
  tracks: Float32Array[];
  original: Float32Array;
  spectrum: Spectrum;
  coefficients: FourierCoefficient[];
}

function attachCoefficients(
  original: Float32Array,
  sampleRate: number,
  terms: Term[],
  phaseOffset: number,
  fundamental: number,
): FourierCoefficient[] {
  const bins = analyzeBins(original, sampleRate, false);
  return terms.map((term) => {
    const fromBin = coefficientFromBin(bins, term.frequency);
    if (fromBin) return fromBin;
    return (
      analyticalCoefficient(term, phaseOffset, fundamental) ??
      measureFourier(original, sampleRate, term.frequency)
    );
  });
}

export function buildPresetModel(
  kind: SoundKind,
  frequency: number,
  phaseOffset: number,
  decay: number,
  chirp: number,
  vowel: Vowel,
): BuiltModel {
  const terms = createTerms(kind, frequency, decay, chirp, vowel);
  const tracks = terms.map((term) => renderTerm(term, SAMPLE_RATE, SAMPLE_LENGTH, phaseOffset, frequency));
  const original = mixTracks(
    tracks,
    terms.map((_, index) => index),
  );
  return {
    mode: "preset",
    kind,
    fileName: null,
    fundamental: frequency,
    sampleRate: SAMPLE_RATE,
    duration: SAMPLE_LENGTH / SAMPLE_RATE,
    terms,
    tracks,
    original,
    spectrum: computeSpectrum(original, SAMPLE_RATE, frequency),
    coefficients: attachCoefficients(original, SAMPLE_RATE, terms, phaseOffset, frequency),
  };
}

export function buildUploadModel(samples: Float32Array, fileName: string): BuiltModel {
  const terms = extractUploadTerms(samples, SAMPLE_RATE, MAX_UPLOAD_COMPONENTS);
  const fundamental = terms.find((term) => term.frequency > 0)?.frequency ?? 440;
  const tracks = terms.map((term) => renderTerm(term, SAMPLE_RATE, samples.length, 0, fundamental));
  return {
    mode: "upload",
    kind: null,
    fileName,
    fundamental,
    sampleRate: SAMPLE_RATE,
    duration: samples.length / SAMPLE_RATE,
    terms,
    tracks,
    original: samples,
    spectrum: computeSpectrum(samples, SAMPLE_RATE, fundamental),
    coefficients: attachCoefficients(samples, SAMPLE_RATE, terms, 0, fundamental),
  };
}
