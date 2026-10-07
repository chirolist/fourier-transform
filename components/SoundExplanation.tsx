import { FFT_NOTE, type Explanation } from "@/lib/explanations";

export function SoundExplanation({ explanation }: { explanation: Explanation }) {
  return (
    <div>
      <h3 className="text-base font-bold">{explanation.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#243044] sm:text-base">{explanation.body}</p>
      <p className="mt-3 text-sm leading-7 text-[#5e6874]">{explanation.detail}</p>
    </div>
  );
}

export function FftNote() {
  return (
    <aside className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[#3d4654]">
      <p className="font-bold text-[#1c2430]">FFT とフーリエ級数</p>
      <p className="mt-2">{FFT_NOTE}</p>
    </aside>
  );
}
