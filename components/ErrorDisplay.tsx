import { formatMse } from "@/lib/formula";

export function ErrorDisplay({
  usedCount,
  mse,
  closeness,
  caption,
}: {
  usedCount: number;
  mse: number;
  closeness: number;
  caption: string;
}) {
  const percent = Math.round(closeness * 100);
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <div>
        <p className="text-sm text-[#5e6874]">
          使用波数：<span className="font-mono text-base font-bold text-[#1c2430]">{usedCount}</span>
        </p>
        <p className="mt-2 text-sm text-[#5e6874]">平均二乗誤差</p>
        <p className="font-mono text-4xl font-semibold tracking-tight text-[#1c2430] sm:text-5xl">{formatMse(mse)}</p>
      </div>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span>波形の近さ</span>
          <span className="font-mono font-bold text-[#0f6e6b]">{percent}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#efe8de]">
          <div className="h-full rounded-full bg-[#0f6e6b]" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#5e6874]">{caption}</p>
      </div>
    </div>
  );
}
