/** 実数・虚数配列をその場で radix-2 FFT する。長さは 2 の累乗。 */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const reTmp = re[i];
      re[i] = re[j];
      re[j] = reTmp;
      const imTmp = im[i];
      im[i] = im[j];
      im[j] = imTmp;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let start = 0; start < n; start += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < half; j++) {
        const evenRe = re[start + j];
        const evenIm = im[start + j];
        const oddIndex = start + j + half;
        const oddRe = re[oddIndex] * curRe - im[oddIndex] * curIm;
        const oddIm = re[oddIndex] * curIm + im[oddIndex] * curRe;
        re[start + j] = evenRe + oddRe;
        im[start + j] = evenIm + oddIm;
        re[oddIndex] = evenRe - oddRe;
        im[oddIndex] = evenIm - oddIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

export function nextPow2(value: number): number {
  let size = 1;
  while (size < value) size <<= 1;
  return size;
}

export function largestPow2(value: number, cap: number): number {
  let size = 1;
  while (size * 2 <= value && size * 2 <= cap) size <<= 1;
  return size;
}
