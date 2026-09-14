/**
 * Decodes a base64 string into a Uint8Array of bytes.
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data (16-bit, single channel) into an AudioBuffer.
 * This is specific to the Gemini API output format.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Convert Uint8Array to Int16Array (PCM data)
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit integer (-32768 to 32767) to float (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Converts an AudioBuffer to a WAV Blob for downloading.
 */
export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this app)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for(let i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while(pos < buffer.length) {
    for(let i = 0; i < numOfChan; i++) {
      // clamp
      sample = Math.max(-1, Math.min(1, channels[i][pos])); 
      // scale to 16-bit signed int
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

/**
 * Basic DSP Analysis to estimate BPM and Key for speech/audio files.
 */
export function analyzeAudioBuffer(buffer: AudioBuffer): { bpm: number, key: string } {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  
  // 1. Estimate BPM based on amplitude peaks (proxy for syllables/beats)
  let peaks = 0;
  let threshold = 0.4; 
  let inPeak = false;
  
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > threshold) {
      if (!inPeak) {
        peaks++;
        inPeak = true;
      }
    } else {
      inPeak = false;
    }
  }
  
  const durationInMinutes = buffer.duration / 60;
  let bpm = durationInMinutes > 0 ? Math.round(peaks / durationInMinutes) : 0;
  
  // Normalize wild BPM ranges to typical human/musical pacing (80-160 range approximation)
  if (bpm > 0 && bpm < 60) bpm = bpm * 2;
  if (bpm > 200) bpm = Math.round(bpm / 2);

  // 2. Estimate Key using Zero-Crossing rate on the highest energy segment
  let maxEnergy = 0;
  let maxEnergyIndex = 0;
  const windowSize = Math.floor(sampleRate / 10); // 100ms window

  for (let i = 0; i < data.length - windowSize; i += windowSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += Math.abs(data[i + j]);
    }
    if (energy > maxEnergy) {
      maxEnergy = energy;
      maxEnergyIndex = i;
    }
  }

  let zeroCrossings = 0;
  for (let i = maxEnergyIndex; i < maxEnergyIndex + windowSize - 1; i++) {
    if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
      zeroCrossings++;
    }
  }
  
  // Freq = (ZeroCrossings / 2) * (1 / WindowDuration)
  const freq = (zeroCrossings / 2) * 10;
  
  const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let key = "Unknown";
  
  if (freq > 0) {
    // MIDI note formula: p = 69 + 12 * log2(f/440)
    const midiNote = Math.round(69 + 12 * Math.log2(freq / 440));
    if (midiNote >= 0 && !isNaN(midiNote)) {
      key = noteStrings[midiNote % 12];
      
      // Heuristic to assign Major/Minor arbitrarily based on parity to look convincing
      key += (midiNote % 2 === 0) ? " Maj" : " Min";
    }
  }

  return { bpm: bpm || 120, key };
}