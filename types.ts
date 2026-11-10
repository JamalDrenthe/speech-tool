export enum VoiceName {
  Puck = 'Puck',
  Kore = 'Kore',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
  Aoede = 'Aoede',
  Orus = 'Orus',
  Leda = 'Leda',
  Callirrhoe = 'Callirrhoe',
  Atlas = 'Atlas',
  Nova = 'Nova',
  Echo = 'Echo'
}

export interface VoicePersona {
  id: string;
  name: string;
  description: string;
  baseVoice: VoiceName;
  stylePrompt?: string; // Instructions for Gemini/Bark, e.g., "cheerfully", "like an authoritative host"
  emotion?: string;     // Explicitly track emotion for UI editing
  tempo?: string;       // Explicitly track tempo for UI editing
  extraPrompt?: string; // Track any additional quirks for UI editing
  isCustom?: boolean;
  isCloned?: boolean; // Flag to identify user-recorded voice personas
}

export const DEFAULT_PERSONAS: VoicePersona[] = [
  { id: 'default-puck', name: 'Puck', description: 'Energetic & clear', baseVoice: VoiceName.Puck, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-kore', name: 'Kore', description: 'Calm & soothing', baseVoice: VoiceName.Kore, emotion: 'Neutral', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-charon', name: 'Charon', description: 'Deep & authoritative', baseVoice: VoiceName.Charon, emotion: 'Professionally', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-fenrir', name: 'Fenrir', description: 'Strong & intense', baseVoice: VoiceName.Fenrir, emotion: 'Angrily', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-zephyr', name: 'Zephyr', description: 'Gentle & airy', baseVoice: VoiceName.Zephyr, emotion: 'Calmly', tempo: 'Slow', extraPrompt: '' },
  { id: 'default-aoede', name: 'Aoede', description: 'Melodic & storytelling', baseVoice: VoiceName.Aoede, emotion: 'Warmly', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-orus', name: 'Orus', description: 'Resonant & confident', baseVoice: VoiceName.Orus, emotion: 'Confident', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-leda', name: 'Leda', description: 'Soft & empathetic', baseVoice: VoiceName.Leda, emotion: 'Calmly', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-callirrhoe', name: 'Callirrhoe', description: 'Bright & theatrical', baseVoice: VoiceName.Callirrhoe, emotion: 'Playful', tempo: 'Normal', extraPrompt: '' },
  { id: 'default-atlas', name: 'Atlas', description: 'Grounded & cinematic narrator', baseVoice: VoiceName.Atlas, emotion: 'Dramatically', tempo: 'Slow', extraPrompt: '' },
  { id: 'default-nova', name: 'Nova', description: 'Futuristic & sharp executive', baseVoice: VoiceName.Nova, emotion: 'Professionally', tempo: 'Fast', extraPrompt: '' },
  { id: 'default-echo', name: 'Echo', description: 'Intriguing & enigmatic', baseVoice: VoiceName.Echo, emotion: 'Mysterious', tempo: 'Hesitant', extraPrompt: '' },
];

export interface OptionItem {
  value: string;
  label: string;
}

export const EMOTION_OPTIONS: OptionItem[] = [
  { value: 'Neutral', label: 'Neutral Tone' },
  { value: 'Cheerfully', label: 'Cheerful' },
  { value: 'Excitedly', label: 'Excited' },
  { value: 'Professionally', label: 'Professional' },
  { value: 'Calmly', label: 'Calm & Soothing' },
  { value: 'Warmly', label: 'Warm & Friendly' },
  { value: 'Whispering', label: 'Whispering' },
  { value: 'Sadly', label: 'Sad & Emotional' },
  { value: 'Angrily', label: 'Angry & Fierce' },
  { value: 'Sarcastic', label: 'Sarcastic & Ironic' },
  { value: 'Nervously', label: 'Nervous & Anxious' },
  { value: 'Dramatically', label: 'Dramatic & Cinematic' },
  { value: 'Curiously', label: 'Curious & Inquiring' },
  { value: 'Confident', label: 'Bold & Confident' },
  { value: 'Mysterious', label: 'Mysterious & Enigmatic' },
  { value: 'Playful', label: 'Playful & Teasing' },
  { value: 'Tired', label: 'Tired & Exhausted' },
];

export const TEMPO_OPTIONS: OptionItem[] = [
  { value: 'Very Slow', label: 'Very Slow' },
  { value: 'Slow', label: 'Slow' },
  { value: 'Normal', label: 'Normal Pace' },
  { value: 'Fast', label: 'Fast' },
  { value: 'Very Fast', label: 'Very Fast' },
  { value: 'Stuttering', label: 'Stotter (Stuttering)' },
  { value: 'Hesitant', label: 'Hesitant (Aarzelend)' },
  { value: 'Rapid Fire', label: 'Rapid Fire' },
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

export type TranscribeMode = 'verbatim' | 'clean' | 'summary' | 'srt';

export interface TranscribeOptions {
  mode: TranscribeMode;
  timestamps: boolean;
  speakerDiarization: boolean;
  targetLanguage: 'auto' | 'nl' | 'en';
}
