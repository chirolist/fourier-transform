import { formatHz } from "./formula";
import { VOWEL_INFO, soundLabel } from "./sounds";
import type { SoundKind, Term, Vowel } from "./types";

export interface Explanation {
  title: string;
  body: string;
  detail: string;
}

function freqList(terms: Term[], count = 4): string {
  return terms
    .slice(0, count)
    .map((term) => `${formatHz(term.frequency)} Hz`)
    .join("、");
}

export function explainSound(
  kind: SoundKind | "upload",
  terms: Term[],
  frequency: number,
  vowel: Vowel,
): Explanation {
  if (kind === "upload") {
    return {
      title: "読み込んだ音の正体",
      body: "アップロードした音を、強い周波数から順に正弦波へ分解しています。波を足すほど、元の波形に近づきます。",
      detail:
        "ファイルはサーバーへ送っていません。ブラウザの中で波形を読み、FFTで周波数成分を取り、その sin / cos 成分だけから音を組み立て直しています。",
    };
  }

  const names = freqList(terms);
  switch (kind) {
    case "sine":
      return {
        title: "正弦波の正体",
        body: `この音は ${formatHz(frequency)} Hz の正弦波だけです。複雑な音も、結局はこの形の波の足し算として表せます。`,
        detail: "スペクトルには山が1つだけあります。フーリエ級数の、いちばん最初の項そのものです。",
      };
    case "square":
      return {
        title: "矩形波の正体",
        body: "矩形波は、基本周波数だけでは作れません。奇数次の倍音を重ね合わせることで、だんだん矩形波に近づいていきます。",
        detail: `いまの基本周波数は ${formatHz(frequency)} Hz です。足している成分は ${names || "まだありません"}。振幅は 4/(nπ) で、n は 1, 3, 5… と増えます。`,
      };
    case "bell":
      return {
        title: "鐘の音の正体",
        body: "鐘の音には基本周波数だけでなく、複数の倍音が含まれています。それぞれの成分の強さによって、鐘特有の音色が生まれます。",
        detail: `整数倍ではない成分（1.2倍、1.5倍、2.4倍など）が混ざっています。主な山は ${names} 付近です。各成分は A e^(−λt) のように時間とともに小さくなり、高い音ほど早く消えます。`,
      };
    case "bird":
      return {
        title: "鳥の声の正体",
        body: "鳥の声のような音では、時間によって周波数そのものが変化します。そのため、単純な固定周波数の音より複雑なスペクトルになります。",
        detail: `モデルは f(t) = f₀ + kt です。始まりはおよそ ${formatHz(frequency)} Hz で、さえずりのあいだに高くなっていきます。倍音を足すほど、鳴き声らしい明るさが加わります。`,
      };
    case "piano":
      return {
        title: "ピアノの音の正体",
        body: "ピアノは、基本の高さと、そのほぼ整数倍の倍音が同時に鳴る音です。高い倍音ほど小さく、早く減衰します。",
        detail: `基本周波数は ${formatHz(frequency)} Hz。含まれている成分は ${names} などです。弦の硬さで、高い倍音はちょうど整数倍より少し高くなっています。`,
      };
    case "voice": {
      const info = VOWEL_INFO[vowel];
      const formants = info.formants.map((formant) => `${formatHz(formant.frequency)} Hz`).join("、");
      return {
        title: `人の声「${info.label}」の正体`,
        body: `母音は、声帯が作る倍音の列に、口の共鳴（フォルマント）が強弱をつけたものです。「${info.label}」では ${formants} 付近が強めになります。`,
        detail: `声の高さ（基本周波数）は ${formatHz(frequency)} Hz です。同じ倍音の列でも、どの山を強調するかで「あいうえお」の違いが生まれます。`,
      };
    }
    default:
      return {
        title: soundLabel(kind),
        body: "この音は、複数の正弦波の足し算として表せます。",
        detail: names,
      };
  }
}

export const FFT_NOTE =
  "FFTは、デジタル化された音を高速に周波数成分へ分解する方法です。フーリエ級数は、周期的な信号をsin波とcos波の組み合わせで表現する数学的な考え方です。このシミュレーターでは、FFTによる分析結果を利用して、音を構成するsin/cos成分を可視化しています。";
