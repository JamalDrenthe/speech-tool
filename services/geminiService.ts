import { GoogleGenAI, Modality } from "@google/genai";
import { VoicePersona, DialogueTurn } from "../types";

const API_KEY = process.env.API_KEY || '';

export const generateSpeech = async (
  text: string, 
  persona: VoicePersona,
  emotion: string = 'Neutral',
  tempo: string = 'Normal'
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

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
    if (!candidate) throw new Error("No candidates returned from the model.");

    const audioPart = candidate.content?.parts?.[0];
    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("No audio data returned in the response.");
    }

    return audioPart.inlineData.data;

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

export const generateDialogue = async (
  turns: DialogueTurn[],
  persona1: VoicePersona,
  persona2: VoicePersona
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

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
    if (!candidate) throw new Error("No candidates returned from the model.");

    const audioPart = candidate.content?.parts?.[0];
    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("No audio data returned in the response.");
    }

    return audioPart.inlineData.data;

  } catch (error) {
    console.error("Error generating dialogue:", error);
    throw error;
  }
};

export const transcribeMedia = async (base64Data: string, mimeType: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

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
    throw error;
  }
};