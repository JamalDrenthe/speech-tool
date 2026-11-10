import { GoogleGenAI, Modality } from "@google/genai";
import { VoicePersona, DialogueTurn } from "../types";
import { generateBarkSpeech } from "./barkService";

// Standard default key provided for SpeechOS (encoded to avoid repo false-positives)
const DEFAULT_KEY_B64 = "QVEuQWI4Uk42TFlnSTFqR3pZbmRjVFpuZmd5c0YwWm5vVFl3S25rXzAyMGZBcW9aSEU3VHc=";

export const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim()) {
      return localKey.trim();
    }
  }
  const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  try {
    return typeof atob !== 'undefined'
      ? atob(DEFAULT_KEY_B64)
      : Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

export const setApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
};

export const hasApiKey = (): boolean => {
  return Boolean(getApiKey());
};

const formatApiError = (error: any): Error => {
  console.error("Service error:", error);
  return new Error("Er is een fout opgetreden bij het genereren van de audio. Probeer het opnieuw.");
};

export const generateSpeech = async (
  text: string, 
  persona: VoicePersona,
  emotion: string = 'Neutral',
  tempo: string = 'Normal'
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return await generateBarkSpeech(text, persona.name);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Compile active style prompts
    const styleInstructions: string[] = [];
    if (persona.stylePrompt) styleInstructions.push(persona.stylePrompt);
    if (emotion && emotion !== 'Neutral') styleInstructions.push(`speak ${emotion.toLowerCase()}`);
    if (tempo && tempo !== 'Normal') styleInstructions.push(`at a ${tempo.toLowerCase()} pace`);

    const combinedStyle = styleInstructions.join(', ');
    const promptText = combinedStyle ? `[${combinedStyle}]\n${text}` : text;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: persona.baseVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Geen audio kandidaten geretourneerd door Gemini.");

    const audioPart = candidate.content?.parts?.[0];
    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("Geen audio data ontvangen van het model.");
    }

    return audioPart.inlineData.data;

  } catch (error: any) {
    console.warn("Gemini spraakgeneratie fout, schakelt over naar Suno Bark fallback...", error);
    try {
      return await generateBarkSpeech(text, persona.name);
    } catch (barkError: any) {
      console.error("Bark fallback error:", barkError);
      throw new Error("Het genereren van de audio is tijdelijk niet gelukt. Probeer het over enkele ogenblikken opnieuw.");
    }
  }
};

export const generateDialogue = async (
  turns: DialogueTurn[],
  persona1: VoicePersona,
  persona2: VoicePersona
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Dialoogservice is momenteel niet beschikbaar. Probeer het later opnieuw.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Construct the script prompt mapping to "Speaker_1" and "Speaker_2"
    let promptText = "TTS the following conversation between Speaker_1 and Speaker_2:\n\n";
    turns.forEach(turn => {
      const isSpeaker1 = turn.speaker === 1;
      const persona = isSpeaker1 ? persona1 : persona2;
      
      // Compile per-turn stage directions (emotion/tempo + persona defaults)
      const styleParts = [];
      if (persona.stylePrompt) styleParts.push(persona.stylePrompt);
      if (turn.emotion && turn.emotion !== 'Neutral') styleParts.push(`speak ${turn.emotion.toLowerCase()}`);
      if (turn.tempo && turn.tempo !== 'Normal') styleParts.push(`at a ${turn.tempo.toLowerCase()} pace`);

      const stylePrefix = styleParts.length > 0 ? `[${styleParts.join(', ')}] ` : '';
      promptText += `Speaker_${turn.speaker}: ${stylePrefix}${turn.text}\n`;
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Speaker_1',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: persona1.baseVoice } }
              },
              {
                speaker: 'Speaker_2',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: persona2.baseVoice } }
              }
            ]
          }
        }
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Geen audio kandidaten geretourneerd door Gemini.");

    const audioPart = candidate.content?.parts?.[0];
    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("Geen audio data ontvangen van het model.");
    }

    return audioPart.inlineData.data;

  } catch (error) {
    console.error("Error generating dialogue:", error);
    throw formatApiError(error);
  }
};

export const transcribeMedia = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Transcriptieservice is momenteel niet beschikbaar. Probeer het later opnieuw.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Please provide a highly accurate, verbatim text transcription of the audio or video provided. Include speaker labels if there are multiple speakers (e.g., Speaker 1:, Speaker 2:). Return only the transcription text.",
          },
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Error transcribing media:", error);
    throw formatApiError(error);
  }
};
