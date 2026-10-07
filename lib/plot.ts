export interface PlotFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
}

export function plotFrame(width: number, height: number): PlotFrame {
  const left = 46;
  const right = 12;
  const top = 12;
  const bottom = 28;
  return {
    left,
    right,
    top,
    bottom,
    width,
    height,
    innerWidth: Math.max(1, width - left - right),
    innerHeight: Math.max(1, height - top - bottom),
  };
}

function fontStack(): string {
  if (typeof document === "undefined") return "sans-serif";
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

function clear(ctx: CanvasRenderingContext2D, frame: PlotFrame): void {
  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.fillStyle = "#fffdf9";
  ctx.fillRect(0, 0, frame.width, frame.height);
}

function strokeGrid(
  ctx: CanvasRenderingContext2D,
  frame: PlotFrame,
  xTicks: { ratio: number; label: string }[],
  yTicks: { ratio: number; label: string }[],
): void {
  const font = fontStack();
  ctx.font = `11px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 1;
  for (const tick of xTicks) {
    const x = frame.left + tick.ratio * frame.innerWidth;
    ctx.strokeStyle = "#f0e9df";
    ctx.beginPath();
    ctx.moveTo(x, frame.top);
    ctx.lineTo(x, frame.top + frame.innerHeight);
    ctx.stroke();
    ctx.fillStyle = "#8a8175";
    ctx.fillText(tick.label, x, frame.top + frame.innerHeight + 8);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const tick of yTicks) {
    const y = frame.top + (1 - tick.ratio) * frame.innerHeight;
    ctx.strokeStyle = "#f0e9df";
    ctx.beginPath();
    ctx.moveTo(frame.left, y);
    ctx.lineTo(frame.left + frame.innerWidth, y);
    ctx.stroke();
    ctx.fillStyle = "#8a8175";
    ctx.fillText(tick.label, frame.left - 6, y);
  }
  ctx.strokeStyle = "#e4dbd0";
  ctx.strokeRect(frame.left, frame.top, frame.innerWidth, frame.innerHeight);
}

function extent(series: ArrayLike<number>[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const samples of series) {
    for (let i = 0; i < samples.length; i++) {
      const value = samples[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (!Number.isFinite(min) || min === max) return { min: -1, max: 1 };
  const pad = (max - min) * 0.14 || 0.2;
  return { min: min - pad, max: max + pad };
}

function formatTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(2);
}

export function drawOverview(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Float32Array,
  sampleRate: number,
  color: string,
  highlightStart: number,
  highlightEnd: number,
): void {
  const frame = plotFrame(width, height);
  clear(ctx, frame);
  if (samples.length < 2) return;
  const duration = samples.length / sampleRate;
  const buckets = Math.max(2, Math.floor(frame.innerWidth));
  const mins = new Float64Array(buckets);
  const maxs = new Float64Array(buckets);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = Math.floor((bucket * samples.length) / buckets);
    const end = Math.max(start + 1, Math.floor(((bucket + 1) * samples.length) / buckets));
    let min = Infinity;
    let max = -Infinity;
    for (let i = start; i < end; i++) {
      const value = samples[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    mins[bucket] = min;
    maxs[bucket] = max;
    if (min < yMin) yMin = min;
    if (max > yMax) yMax = max;
  }
  const pad = ((yMax - yMin) || 1) * 0.12;
  const min = yMin - pad;
  const max = yMax + pad;
  const span = max - min || 1;
  const yOf = (value: number) => frame.top + ((max - value) / span) * frame.innerHeight;

  const highlightX = frame.left + (highlightStart / duration) * frame.innerWidth;
  const highlightW = Math.max(2, ((highlightEnd - highlightStart) / duration) * frame.innerWidth);
  ctx.fillStyle = "rgba(15, 110, 107, 0.14)";
  ctx.fillRect(highlightX, frame.top, highlightW, frame.innerHeight);

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    label: `${(duration * ratio).toFixed(1)}s`,
  }));
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    label: formatTick(min + span * ratio),
  }));
  strokeGrid(ctx, frame, xTicks, yTicks);

  ctx.beginPath();
  for (let bucket = 0; bucket < buckets; bucket++) {
    const x = frame.left + ((bucket + 0.5) / buckets) * frame.innerWidth;
    const y = yOf(maxs[bucket]);
    if (bucket === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let bucket = buckets - 1; bucket >= 0; bucket--) {
    const x = frame.left + ((bucket + 0.5) / buckets) * frame.innerWidth;
    ctx.lineTo(x, yOf(mins[bucket]));
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#0f6e6b";
  ctx.lineWidth = 2;
  ctx.strokeRect(highlightX + 1, frame.top + 1, Math.max(2, highlightW - 2), frame.innerHeight - 2);
}

export interface LineSeries {
  samples: Float32Array;
  color: string;
  width: number;
  dash: number[];
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  series: LineSeries[],
  sampleRate: number,
  timeStart: number,
): void {
  const frame = plotFrame(width, height);
  clear(ctx, frame);
  const usable = series.filter((item) => item.samples.length > 1);
  if (usable.length === 0) return;
  const { min, max } = extent(usable.map((item) => item.samples));
  const span = max - min || 1;
  const yOf = (value: number) => frame.top + ((max - value) / span) * frame.innerHeight;
  const duration = usable[0].samples.length / sampleRate;
  const xTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    label: `${((timeStart + duration * ratio) * 1000).toFixed(0)}ms`,
  }));
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    label: formatTick(min + span * ratio),
  }));
  strokeGrid(ctx, frame, xTicks, yTicks);

  const zeroRatio = (0 - min) / span;
  if (zeroRatio > 0 && zeroRatio < 1) {
    ctx.strokeStyle = "#e7d7c8";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const y = yOf(0);
    ctx.moveTo(frame.left, y);
    ctx.lineTo(frame.left + frame.innerWidth, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const item of usable) {
    ctx.beginPath();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.width;
    ctx.setLineDash(item.dash);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const count = item.samples.length;
    for (let i = 0; i < count; i++) {
      const x = frame.left + (i / (count - 1)) * frame.innerWidth;
      const y = yOf(item.samples[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export interface SpectrumMarker {
  frequency: number;
  color: string;
  enabled: boolean;
}

export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: { frequency: number; amplitude: number }[],
  maxFrequency: number,
  markers: SpectrumMarker[],
): void {
  const frame = plotFrame(width, height);
  clear(ctx, frame);
  if (points.length === 0 || maxFrequency <= 0) return;
  let maxAmp = 0;
  for (const point of points) maxAmp = Math.max(maxAmp, point.amplitude);
  if (maxAmp <= 0) maxAmp = 1;
  const xOf = (frequency: number) => frame.left + (frequency / maxFrequency) * frame.innerWidth;
  const yOf = (amplitude: number) => frame.top + (1 - amplitude / maxAmp) * frame.innerHeight;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    label: `${Math.round(maxFrequency * ratio)}`,
  }));
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    label: formatTick(maxAmp * ratio),
  }));
  strokeGrid(ctx, frame, xTicks, yTicks);

  const barWidth = Math.max(1, frame.innerWidth / points.length - 0.6);
  for (const point of points) {
    const x = xOf(point.frequency);
    const y = yOf(point.amplitude);
    const barHeight = frame.top + frame.innerHeight - y;
    ctx.fillStyle = "#7dcec6";
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
  }

  for (const marker of markers) {
    if (marker.frequency < 0 || marker.frequency > maxFrequency) continue;
    const x = xOf(marker.frequency);
    ctx.strokeStyle = marker.enabled ? marker.color : "#c9c1b6";
    ctx.globalAlpha = marker.enabled ? 0.95 : 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, frame.top);
    ctx.lineTo(x, frame.top + frame.innerHeight);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function frequencyFromX(x: number, width: number, maxFrequency: number): number {
  const frame = plotFrame(width, 100);
  const ratio = (x - frame.left) / frame.innerWidth;
  return ratio * maxFrequency;
}
