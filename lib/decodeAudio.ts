export async function decodeAudioFile(file: File): Promise<{ samples: Float32Array; sampleRate: number }> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const mono = new Float32Array(buffer.length);
    const channels = buffer.numberOfChannels;
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) mono[i] += data[i] / channels;
    }
    return { samples: mono, sampleRate: buffer.sampleRate };
  } finally {
    await context.close();
  }
}
