import { analyzeBins, coefficientFromBin, extractUploadTerms } from "../lib/analyze";
import { SAMPLE_LENGTH, SAMPLE_RATE } from "../lib/constants";
import { fft } from "../lib/fft";
import { createTerms } from "../lib/sounds";
import { meanSquareError, mixTracks, renderTerm } from "../lib/signal";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function approx(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function testImpulse(): void {
  const re = new Float64Array([1, 0, 0, 0, 0, 0, 0, 0]);
  const im = new Float64Array(8);
  fft(re, im);
  for (let i = 0; i < 8; i++) approx(re[i], 1, 1e-9, `impulse re[${i}]`);
}

function testCosineBin(): void {
  const fftSize = 4096;
  const amplitude = 0.6;
  const bin = 32;
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    re[i] = amplitude * Math.cos((2 * Math.PI * bin * i) / fftSize);
  }
  const samples = Float32Array.from(re);
  fft(re, im);
  const measured = (2 * Math.hypot(re[bin], im[bin])) / fftSize;
  approx(measured, amplitude, 1e-6, "cosine amplitude");
  approx(Math.atan2(im[bin], re[bin]), 0, 1e-6, "cosine phase");
  const bins = analyzeBins(samples, fftSize, false);
  const coeff = coefficientFromBin(bins, bin);
  assert(coeff !== null, "coefficient exists");
  approx(coeff!.a, amplitude, 1e-6, "a of cosine");
  approx(coeff!.b, 0, 1e-6, "b of cosine");
}

function testSineReconstruction(): void {
  const sampleRate = 32768;
  const length = 32768;
  const samples = new Float32Array(length);
  const parts = [
    { frequency: 100, amplitude: 0.5, phase: 0.3 },
    { frequency: 250, amplitude: 0.25, phase: -0.8 },
    { frequency: 440, amplitude: 0.15, phase: 1.2 },
  ];
  for (const part of parts) {
    for (let i = 0; i < length; i++) {
      samples[i] += part.amplitude * Math.sin((2 * Math.PI * part.frequency * i) / sampleRate + part.phase);
    }
  }
  const terms = extractUploadTerms(samples, sampleRate, 10);
  assert(terms.length === 3, `expected 3 components, got ${terms.length}`);
  const tracks = terms.map((term) => renderTerm(term, sampleRate, length, 0, 100));
  const mixed = mixTracks(tracks, tracks.map((_, index) => index));
  const error = meanSquareError(samples, mixed);
  assert(error < 1e-8, `reconstruction mse ${error}`);
}

function testSquareConvergence(): void {
  const frequency = 120;
  const terms = createTerms("square", frequency, 1, 0, "a");
  assert(terms.length >= 20, "square has many harmonics");
  approx(terms[0].amplitude, 4 / Math.PI, 1e-9, "first square coefficient");
  approx(terms[1].amplitude, 4 / (3 * Math.PI), 1e-9, "second square coefficient");
  assert(terms[1].harmonic === 3, "second term is the 3rd harmonic");
  const tracks = terms.map((term) => renderTerm(term, SAMPLE_RATE, SAMPLE_LENGTH, 0, frequency));
  const original = mixTracks(tracks, tracks.map((_, index) => index));
  const one = mixTracks(tracks, [0]);
  const five = mixTracks(tracks, [0, 1, 2, 3, 4]);
  const mseOne = meanSquareError(original, one);
  const mseFive = meanSquareError(original, five);
  const mseAll = meanSquareError(original, original);
  assert(mseOne > mseFive, `mse should fall (${mseOne} -> ${mseFive})`);
  assert(mseFive > 1e-4, "five terms are not yet exact");
  approx(mseAll, 0, 1e-12, "full sum matches");
  const bins = analyzeBins(original, SAMPLE_RATE, false);
  const coeff = coefficientFromBin(bins, frequency);
  assert(coeff !== null, "square fundamental bin");
  approx(coeff!.b, 4 / Math.PI, 0.02, "measured b");
  approx(coeff!.a, 0, 0.02, "measured a");
}

function testBellPeaks(): void {
  const frequency = 220;
  const terms = createTerms("bell", frequency, 1.2, 0, "a");
  assert(terms.length >= 8, "bell partials");
  const nonInteger = terms.some((term) => Math.abs(term.frequency / frequency - Math.round(term.frequency / frequency)) > 0.05);
  assert(nonInteger, "bell includes non-integer partials");
  assert(terms.every((term) => term.decay > 0), "bell decays");
  const tracks = terms.map((term) => renderTerm(term, SAMPLE_RATE, SAMPLE_LENGTH, 0, frequency));
  const original = mixTracks(tracks, tracks.map((_, index) => index));
  const bins = analyzeBins(original, SAMPLE_RATE, true);
  const binWidth = SAMPLE_RATE / bins.fftSize;
  for (const term of terms.slice(0, 5)) {
    const center = Math.round(term.frequency / binWidth);
    let peak = 0;
    for (let k = center - 3; k <= center + 3; k++) peak = Math.max(peak, bins.amplitudes[k] ?? 0);
    assert(peak > 0.01, `missing bell peak near ${term.frequency}`);
  }
}

function testBirdAndVoice(): void {
  const bird = createTerms("bird", 1500, 1, 800, "a");
  assert(bird.every((term) => term.chirpRate > 0 && term.syllables.length > 0), "bird chirps");
  const track = renderTerm(bird[0], SAMPLE_RATE, SAMPLE_LENGTH, 0, 1500);
  let peak = 0;
  for (let i = 0; i < track.length; i++) peak = Math.max(peak, Math.abs(track[i]));
  assert(peak > 0.2, "bird audible");
  const voiceA = createTerms("voice", 140, 1, 0, "a");
  const voiceI = createTerms("voice", 140, 1, 0, "i");
  assert(voiceA.length > 8 && voiceI.length > 8, "vowels have harmonics");
  const loud = (terms: typeof voiceA, target: number) => {
    let best = terms[0];
    let score = Infinity;
    for (const term of terms) {
      const distance = Math.abs(term.frequency - target);
      if (distance < score) {
        score = distance;
        best = term;
      }
    }
    return best.amplitude;
  };
  assert(loud(voiceI, 2300) > loud(voiceA, 2300), "i emphasizes the high formant");
}

function benchmark(): void {
  const terms = createTerms("piano", 262, 1.3, 0, "a");
  const started = performance.now();
  const tracks = terms.map((term) => renderTerm(term, SAMPLE_RATE, SAMPLE_LENGTH, 0.4, 262));
  mixTracks(tracks, tracks.map((_, index) => index));
  const elapsed = performance.now() - started;
  console.log(`piano render ${terms.length} terms: ${elapsed.toFixed(1)} ms`);
  assert(elapsed < 400, "render is too slow");
}

testImpulse();
testCosineBin();
testSineReconstruction();
testSquareConvergence();
testBellPeaks();
testBirdAndVoice();
benchmark();
console.log("math checks passed");
