import { Client } from "@gradio/client";

// Hugging Face Space derived from https://huggingface.co/spaces/suno/bark via /huggingface-link-hacks
const BARK_SPACE_ID = "suno/bark";
export const BARK_DIRECT_URL = "https://suno-bark.hf.space";

export const getHfToken = (): string => {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('hf_token');
    if (local && local.trim()) return local.trim();
  }
  return process.env.HF_TOKEN || '';
};

export const setHfToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    if (token && token.trim()) {
      localStorage.setItem('hf_token', token.trim());
    } else {
      localStorage.removeItem('hf_token');
    }
  }
};

/**
 * Maps persona names to Suno Bark acoustic prompt presets
 */
export const mapPersonaToBarkPrompt = (personaName: string = ''): string => {
  const name = personaName.toLowerCase();
  if (name.includes('charon') || name.includes('authoritative') || name.includes('deep')) {
    return 'Announcer';
  }
  if (name.includes('kore') || name.includes('calm') || name.includes('soothing')) {
    return 'Speaker 0 (en)';
  }
  if (name.includes('puck') || name.includes('energetic')) {
    return 'Speaker 1 (en)';
  }
  if (name.includes('zephyr')) {
    return 'Speaker 2 (en)';
  }
  if (name.includes('fenrir')) {
    return 'Speaker 3 (en)';
  }
  return 'Speaker 1 (en)';
};

/**
 * Generates speech using Suno Bark via the Hugging Face Space
 */
export const generateBarkSpeech = async (
  text: string,
  personaName?: string
): Promise<string> => {
  const prompt = mapPersonaToBarkPrompt(personaName);
  const token = getHfToken();

  try {
    const client = await Client.connect(BARK_SPACE_ID, {
      hf_token: token ? (`Bearer ${token}` as any) : undefined
    });

    const result = await client.predict("/gen_tts", {
      text: text,
      history_prompt: prompt
    });

    const audioItem = (result.data as any)?.[0];
    const audioUrl = typeof audioItem === 'string' ? audioItem : (audioItem?.url || audioItem?.path);

    if (!audioUrl) {
      throw new Error("Geen audio bestand ontvangen van Suno Bark.");
    }

    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Fout bij downloaden Bark audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);

  } catch (error) {
    console.error("Error generating Bark speech:", error);
    throw new Error(`Suno Bark fallback mislukt: ${error instanceof Error ? error.message : String(error)}`);
  }
};
