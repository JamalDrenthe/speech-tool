export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface VoicePersona {
  id: string;
  name: string;
  description: string;
  baseVoice: VoiceName;
  stylePrompt?: string; // Instructions for Gemini, e.g., "cheerfully", "like an old British man"
  emotion?: string;     // Explicitly track emotion for UI editing
  tempo?: string;       // Explicitly track tempo for UI editing
  extraPrompt?: string; // Track any additional quirks for UI editing
  isCustom?: boolean;
  isCloned?: boolean; // Flag to identify user-recorded voice personas
}

export const DEFAULT_PERSONAS: VoicePersona[] = [
  { id: 'default-puck', name: 'Puck', description: 'Energetic & clear', baseVoice: VoiceName.Puck, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-kore', name: 'Kore', description: 'Calm & soothing', baseVoice: VoiceName.Kore, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-charon', name: 'Charon', description: 'Deep & authoritative', baseVoice: VoiceName.Charon, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-fenrir', name: 'Fenrir', description: 'Strong & intense', baseVoice: VoiceName.Fenrir, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-zephyr', name: 'Zephyr', description: 'Gentle & airy', baseVoice: VoiceName.Zephyr, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
];

export interface AudioState {
  buffer: AudioBuffer | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  duration: number;
  bpm?: number;
  key?: string;
}

export interface DialogueTurn {
  id: string;
  speaker: 1 | 2; // Maps to Character 1 or Character 2
  text: string;
  emotion?: string;
  tempo?: string;
}

export interface SavedScene {
  id: string;
  name: string;
  date: number;
  char1Id: string;
  char2Id: string;
  turns: DialogueTurn[];
}

export interface BatchItemSingle {
  id: string;
  type: 'single';
  text: string;
  persona: VoicePersona;
  emotion: string;
  tempo: string;
}

export interface BatchItemDialogue {
  id: string;
  type: 'dialogue';
  turns: DialogueTurn[];
  persona1: VoicePersona;
  persona2: VoicePersona;
}

export type BatchItem = BatchItemSingle | BatchItemDialogue;