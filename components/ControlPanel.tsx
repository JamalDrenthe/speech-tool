import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Sparkles, Volume2, Plus, X, Trash2, Mic, Square, Activity, MessageSquare, User, ArrowLeftRight, SlidersHorizontal, FileText, Upload, Save, FolderOpen, Clock, Edit2, ListOrdered, ListPlus } from 'lucide-react';
import { VoiceName, DEFAULT_PERSONAS, VoicePersona, DialogueTurn, SavedScene, BatchItem } from '../types';

interface ControlPanelProps {
  onGenerateSingle: (text: string, persona: VoicePersona, emotion: string, tempo: string) => void;
  onGenerateDialogue: (turns: DialogueTurn[], persona1: VoicePersona, persona2: VoicePersona) => void;
  onGenerateBatch: (queue: BatchItem[]) => void;
  onTranscribe?: (file: File) => Promise<string>;
  isLoading: boolean;
}

type CloneState = 'idle' | 'recording' | 'recorded' | 'training';
type AppMode = 'single' | 'dialogue' | 'transcribe' | 'batch';

const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerateSingle, onGenerateDialogue, onGenerateBatch, onTranscribe, isLoading }) => {
  // App Mode State
  const [mode, setMode] = useState<AppMode>('single');

  // Unified Editable Personas State
  const [personas, setPersonas] = useState<VoicePersona[]>(() => {
    const savedApp = localStorage.getItem('appPersonas');
    if (savedApp) return JSON.parse(savedApp);
    
    // Fallback migration for older customized users
    const savedCustom = localStorage.getItem('customPersonas');
    if (savedCustom) {
      return [...DEFAULT_PERSONAS, ...JSON.parse(savedCustom)];
    }
    return DEFAULT_PERSONAS;
  });

  // Single Speaker State
  const [text, setText] = useState('Initialize text-to-speech engine. System ready.');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(DEFAULT_PERSONAS[0].id);
  const [activeEmotion, setActiveEmotion] = useState('Neutral');
  const [activeTempo, setActiveTempo] = useState('Normal');

  // Dialogue Builder State
  const [char1Id, setChar1Id] = useState<string>(DEFAULT_PERSONAS[0].id); // Puck
  const [char2Id, setChar2Id] = useState<string>(DEFAULT_PERSONAS[1].id); // Kore
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>([
    { id: '1', speaker: 1, text: "System check. Multi-agent framework initialized.", emotion: 'Professionally', tempo: 'Normal' },
    { id: '2', speaker: 2, text: "Acknowledged. All systems optimal.", emotion: 'Neutral', tempo: 'Fast' }
  ]);

  // Batch Queue State
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);

  // Saved Scenes State
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>(() => {
    const saved = localStorage.getItem('savedScenes');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveSceneModal, setShowSaveSceneModal] = useState(false);
  const [showLoadSceneModal, setShowLoadSceneModal] = useState(false);
  const [saveSceneName, setSaveSceneName] = useState('');

  // Transcribe State
  const [transcribeInputMode, setTranscribeInputMode] = useState<'upload' | 'record'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  
  // Transcribe Recording State
  const [transcribeRecordState, setTranscribeRecordState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const transcribeRecorderRef = useRef<MediaRecorder | null>(null);
  const transcribeChunksRef = useRef<BlobPart[]>([]);

  // Forms State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaBase, setNewPersonaBase] = useState<VoiceName>(VoiceName.Puck);
  
  // Advanced Style Builder State
  const [personaEmotion, setPersonaEmotion] = useState('Neutral');
  const [personaSpeed, setPersonaSpeed] = useState('Normal');
  const [personaExtra, setPersonaExtra] = useState('');

  // Voice Cloning State
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [cloneState, setCloneState] = useState<CloneState>('idle');
  const [cloneName, setCloneName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    localStorage.setItem('appPersonas', JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem('savedScenes', JSON.stringify(savedScenes));
  }, [savedScenes]);

  // --- Generation & Transcription ---
  const handleGenerate = () => {
    if (mode === 'single') {
      if (!text.trim()) return;
      const selected = personas.find(p => p.id === selectedPersonaId) || personas[0];
      onGenerateSingle(text, selected, activeEmotion, activeTempo);
    } else if (mode === 'dialogue') {
      const validTurns = dialogueTurns.filter(t => t.text.trim());
      if (validTurns.length === 0) return;
      const p1 = personas.find(p => p.id === char1Id) || personas[0];
      const p2 = personas.find(p => p.id === char2Id) || personas[1] || personas[0];
      onGenerateDialogue(validTurns, p1, p2);
    }
  };

  const handleAddToBatch = () => {
    if (mode === 'single') {
      if (!text.trim()) return;
      const selected = personas.find(p => p.id === selectedPersonaId) || personas[0];
      setBatchQueue([...batchQueue, {
        id: Date.now().toString(),
        type: 'single',
        text,
        persona: selected,
        emotion: activeEmotion,
        tempo: activeTempo
      }]);
    } else if (mode === 'dialogue') {
      const validTurns = dialogueTurns.filter(t => t.text.trim());
      if (validTurns.length === 0) return;
      const p1 = personas.find(p => p.id === char1Id) || personas[0];
      const p2 = personas.find(p => p.id === char2Id) || personas[1] || personas[0];
      setBatchQueue([...batchQueue, {
        id: Date.now().toString(),
        type: 'dialogue',
        turns: validTurns,
        persona1: p1,
        persona2: p2
      }]);
    }
  };

  const handleExecuteBatch = () => {
    if (batchQueue.length > 0) {
      onGenerateBatch(batchQueue);
    }
  };

  const removeFromBatch = (id: string) => {
    setBatchQueue(batchQueue.filter(item => item.id !== id));
  };

  const handleTranscribeClick = async () => {
    const fileToTranscribe = transcribeInputMode === 'upload' ? selectedFile : recordedFile;
    if (!fileToTranscribe || !onTranscribe) return;
    
    setIsTranscribing(true);
    setTranscribeError('');
    try {
      const result = await onTranscribe(fileToTranscribe);
      setTranscription(result);
    } catch (err: any) {
      setTranscribeError(err.message || 'Failed to transcribe the media file.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Transcribe Recording Handlers ---
  const startTranscribeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      transcribeRecorderRef.current = mediaRecorder;
      transcribeChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) transcribeChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(transcribeChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setRecordedFile(file);
        setTranscribeRecordState('recorded');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setTranscribeRecordState('recording');
      setTranscription(''); 
      setTranscribeError('');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setTranscribeError("Microphone access is required to record audio.");
    }
  };

  const stopTranscribeRecording = () => {
    if (transcribeRecorderRef.current && transcribeRecorderRef.current.state !== 'inactive') {
      transcribeRecorderRef.current.stop();
    }
  };

  const clearTranscribeRecording = () => {
      setRecordedFile(null);
      setTranscribeRecordState('idle');
      setTranscription('');
  };

  // --- Dialogue Handlers ---
  const addDialogueTurn = () => {
    const lastSpeaker = dialogueTurns.length > 0 ? dialogueTurns[dialogueTurns.length - 1].speaker : 2;
    const newSpeaker = lastSpeaker === 1 ? 2 : 1;
    setDialogueTurns([...dialogueTurns, { id: Date.now().toString(), speaker: newSpeaker, text: '', emotion: 'Neutral', tempo: 'Normal' }]);
  };

  const removeDialogueTurn = (id: string) => {
    setDialogueTurns(dialogueTurns.filter(t => t.id !== id));
  };

  const updateTurnText = (id: string, newText: string) => {
    setDialogueTurns(dialogueTurns.map(t => t.id === id ? { ...t, text: newText } : t));
  };
  
  const updateTurnEmotion = (id: string, newEmotion: string) => {
    setDialogueTurns(dialogueTurns.map(t => t.id === id ? { ...t, emotion: newEmotion } : t));
  };

  const updateTurnTempo = (id: string, newTempo: string) => {
    setDialogueTurns(dialogueTurns.map(t => t.id === id ? { ...t, tempo: newTempo } : t));
  };

  const swapTurnSpeaker = (id: string) => {
    setDialogueTurns(dialogueTurns.map(t => t.id === id ? { ...t, speaker: t.speaker === 1 ? 2 : 1 } : t));
  };

  // --- Scene Save/Load Handlers ---
  const handleSaveScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSceneName.trim()) return;
    
    const newScene: SavedScene = {
      id: `scene-${Date.now()}`,
      name: saveSceneName.trim(),
      date: Date.now(),
      char1Id,
      char2Id,
      turns: [...dialogueTurns]
    };

    setSavedScenes([newScene, ...savedScenes]);
    setShowSaveSceneModal(false);
    setSaveSceneName('');
  };

  const handleLoadScene = (scene: SavedScene) => {
    const p1Exists = personas.some(p => p.id === scene.char1Id);
    const p2Exists = personas.some(p => p.id === scene.char2Id);
    
    setChar1Id(p1Exists ? scene.char1Id : personas[0].id);
    setChar2Id(p2Exists ? scene.char2Id : (personas[1]?.id || personas[0].id));
    setDialogueTurns([...scene.turns]);
    setShowLoadSceneModal(false);
  };

  const handleDeleteScene = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedScenes(savedScenes.filter(s => s.id !== id));
  };

  // --- Persona Edit/Create Handlers ---
  const openCreateForm = () => {
    setEditingPersonaId(null);
    resetForms();
    setShowCreateForm(true);
  };

  const openEditForm = (e: React.MouseEvent, p: VoicePersona) => {
    e.stopPropagation();
    setEditingPersonaId(p.id);
    setNewPersonaName(p.name);
    setNewPersonaBase(p.baseVoice);
    setPersonaEmotion(p.emotion || 'Neutral');
    setPersonaSpeed(p.tempo || 'Normal');
    setPersonaExtra(p.extraPrompt || '');
    setShowCreateForm(true);
  };

  const handleSavePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim()) return;

    const styleParts = [];
    if (personaEmotion !== 'Neutral') styleParts.push(`speak ${personaEmotion.toLowerCase()}`);
    if (personaSpeed !== 'Normal') styleParts.push(`at a ${personaSpeed.toLowerCase()} pace`);
    if (personaExtra.trim()) styleParts.push(personaExtra.trim());

    const finalStylePrompt = styleParts.length > 0 ? styleParts.join(', ') : '';

    const updatedPersona: VoicePersona = {
      id: editingPersonaId || `custom-${Date.now()}`,
      name: newPersonaName.trim(),
      description: personaEmotion !== 'Neutral' 
        ? personaEmotion 
        : (editingPersonaId ? (personas.find(p => p.id === editingPersonaId)?.description || 'Custom Persona') : 'Custom Persona'),
      baseVoice: newPersonaBase,
      stylePrompt: finalStylePrompt,
      emotion: personaEmotion,
      tempo: personaSpeed,
      extraPrompt: personaExtra,
      isCustom: true, 
      isCloned: editingPersonaId ? personas.find(p=>p.id===editingPersonaId)?.isCloned : false
    };
    
    if (editingPersonaId) {
      setPersonas(personas.map(p => p.id === editingPersonaId ? updatedPersona : p));
    } else {
      setPersonas([...personas, updatedPersona]);
      setSelectedPersonaId(updatedPersona.id);
    }
    
    setShowCreateForm(false);
    resetForms();
  };

  const handleDeletePersona = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = personas.filter(p => p.id !== id);
    if (updated.length === 0) {
      setPersonas(DEFAULT_PERSONAS);
      setSelectedPersonaId(DEFAULT_PERSONAS[0].id);
    } else {
      setPersonas(updated);
      if (selectedPersonaId === id) setSelectedPersonaId(updated[0].id);
      if (char1Id === id) setChar1Id(updated[0].id);
      if (char2Id === id) setChar2Id(updated[1]?.id || updated[0].id);
    }
  };

  const resetForms = () => {
    setNewPersonaName('');
    setNewPersonaBase(VoiceName.Puck);
    setPersonaEmotion('Neutral');
    setPersonaSpeed('Normal');
    setPersonaExtra('');
    setCloneName('');
    setCloneState('idle');
  };

  // --- Voice Cloning Handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        setCloneState('recorded');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setCloneState('recording');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to clone your voice.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const trainClonedVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneName.trim()) return;
    setCloneState('training');

    setTimeout(() => {
      const newClonedPersona: VoicePersona = {
        id: `cloned-${Date.now()}`,
        name: cloneName.trim(),
        description: 'My Cloned Voice',
        baseVoice: VoiceName.Kore, 
        stylePrompt: "speak exactly in a natural, conversational human tone based on the user",
        emotion: 'Neutral',
        tempo: 'Normal',
        extraPrompt: '',
        isCustom: true,
        isCloned: true,
      };

      setPersonas(prev => [...prev, newClonedPersona]);
      setSelectedPersonaId(newClonedPersona.id);
      setShowCloneForm(false);
      resetForms();
    }, 2500);
  };

  const activeChar1 = personas.find(p => p.id === char1Id) || personas[0];
  const activeChar2 = personas.find(p => p.id === char2Id) || personas[1] || personas[0];

  const activeFileForTranscription = transcribeInputMode === 'upload' ? selectedFile : recordedFile;

  return (
    <div className="bg-[#18191D]/90 border border-[rgba(230,234,240,0.06)] rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl relative">
      
      {/* Mode Toggle */}
      <div className="flex p-1.5 bg-[#121317] border border-[rgba(230,234,240,0.03)] rounded-full w-full max-w-2xl mb-8 mx-auto shadow-inner">
        <button
          onClick={() => setMode('single')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
            mode === 'single' ? 'bg-[#E6EAF0] text-[#121317] shadow-md' : 'text-[#B7BFD9] hover:text-white hover:bg-[rgba(230,234,240,0.06)]'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="hidden md:inline">Single Speaker</span>
        </button>
        <button
          onClick={() => setMode('dialogue')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
            mode === 'dialogue' ? 'bg-[#E6EAF0] text-[#121317] shadow-md' : 'text-[#B7BFD9] hover:text-white hover:bg-[rgba(230,234,240,0.06)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden md:inline">Agent Scene</span>
        </button>
        <button
          onClick={() => setMode('transcribe')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
            mode === 'transcribe' ? 'bg-[#E6EAF0] text-[#121317] shadow-md' : 'text-[#B7BFD9] hover:text-white hover:bg-[rgba(230,234,240,0.06)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden md:inline">Transcribe</span>
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
            mode === 'batch' ? 'bg-[#E6EAF0] text-[#121317] shadow-md' : 'text-[#B7BFD9] hover:text-white hover:bg-[rgba(230,234,240,0.06)]'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span className="hidden md:inline">Batch Queue</span>
          {batchQueue.length > 0 && (
             <span className={`ml-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full ${mode === 'batch' ? 'bg-[#121317] text-[#E6EAF0]' : 'bg-[#3186FF] text-white'}`}>
               {batchQueue.length}
             </span>
          )}
        </button>
      </div>

      {/* --- SINGLE SPEAKER MODE --- */}
      {mode === 'single' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-semibold text-[#E6EAF0] flex items-center gap-2 uppercase tracking-widest">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                Select Persona
              </label>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`relative flex flex-col items-center p-4 rounded-[1.5rem] border transition-all duration-200 group ${
                    selectedPersonaId === persona.id
                      ? 'bg-[rgba(49,134,255,0.1)] border-[#3186FF] shadow-[0_0_20px_rgba(49,134,255,0.15)]'
                      : 'bg-[#212226] border-[rgba(230,234,240,0.06)] hover:bg-[#2F3034] hover:border-[rgba(230,234,240,0.12)]'
                  }`}
                >
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <div 
                      onClick={(e) => openEditForm(e, persona)}
                      className="p-1.5 bg-[#121317]/80 text-[#B7BFD9] rounded-full hover:bg-[#3186FF] hover:text-white transition-colors backdrop-blur-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </div>
                    {persona.isCustom && (
                    <div 
                      onClick={(e) => handleDeletePersona(e, persona.id)}
                      className="p-1.5 bg-[#121317]/80 text-[#FC413D] rounded-full hover:bg-[#FC413D] hover:text-white transition-colors backdrop-blur-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    )}
                  </div>

                  <div className={`w-10 h-10 rounded-full mb-3 flex items-center justify-center text-sm font-bold relative ${
                    selectedPersonaId === persona.id ? 'bg-[#3186FF] text-white' : 'bg-[#2F3034] text-[#B7BFD9]'
                  } ${persona.isCloned ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#18191D]' : persona.isCustom ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-[#18191D]' : ''}`}>
                    {persona.isCloned ? <Mic className="w-4 h-4" /> : persona.name[0]}
                  </div>
                  <span className={`text-sm font-semibold truncate w-full text-center ${selectedPersonaId === persona.id ? 'text-white' : 'text-[#E6EAF0]'}`}>
                    {persona.name}
                  </span>
                  <span className="text-[10px] text-[#B7BFD9]/70 mt-1 truncate w-full text-center tracking-wide">
                    {persona.isCloned ? 'Cloned' : persona.isCustom ? 'Custom' : persona.description}
                  </span>
                </button>
              ))}

              <button
                onClick={() => setShowCloneForm(true)}
                className="relative flex flex-col items-center justify-center p-4 rounded-[1.5rem] border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full mb-3 flex items-center justify-center bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-emerald-400/80 group-hover:text-emerald-400">Clone</span>
              </button>

              <button
                onClick={openCreateForm}
                className="relative flex flex-col items-center justify-center p-4 rounded-[1.5rem] border border-dashed border-[rgba(230,234,240,0.2)] bg-[#212226]/50 hover:bg-[#2F3034] hover:border-[#3186FF]/50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full mb-3 flex items-center justify-center bg-[#2F3034] text-[#B7BFD9] group-hover:bg-[#3186FF] group-hover:text-white transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-[#B7BFD9] group-hover:text-[#3186FF]">New</span>
              </button>
            </div>

            {/* Quick Action Modifiers */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#212226] border border-[rgba(230,234,240,0.06)] p-4 rounded-2xl">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-[#B7BFD9] mb-2">Temporary Emotion Overlay</label>
                 <select 
                   value={activeEmotion} 
                   onChange={(e) => setActiveEmotion(e.target.value)} 
                   className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none cursor-pointer appearance-none"
                 >
                   <option value="Neutral">Neutral</option>
                   <option value="Cheerfully">Cheerful</option>
                   <option value="Sadly">Sad</option>
                   <option value="Angrily">Angry</option>
                   <option value="Whispering">Whispering</option>
                   <option value="Excitedly">Excited</option>
                   <option value="Professionally">Professional</option>
                 </select>
              </div>
              <div className="bg-[#212226] border border-[rgba(230,234,240,0.06)] p-4 rounded-2xl">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-[#B7BFD9] mb-2">Temporary Tempo Overlay</label>
                 <select 
                   value={activeTempo} 
                   onChange={(e) => setActiveTempo(e.target.value)} 
                   className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none cursor-pointer appearance-none"
                 >
                   <option value="Very Slow">Very Slow</option>
                   <option value="Slow">Slow</option>
                   <option value="Normal">Normal</option>
                   <option value="Fast">Fast</option>
                   <option value="Very Fast">Very Fast</option>
                 </select>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-[#E6EAF0] mb-3 flex items-center gap-2 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Agent Prompt
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-36 bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-[1.5rem] p-5 text-white placeholder-[#B7BFD9]/50 focus:outline-none focus:ring-2 focus:ring-[#3186FF]/50 focus:border-[#3186FF]/50 resize-none font-light leading-relaxed transition-all text-base"
              placeholder="Enter context for the agent to synthesize..."
            />
          </div>
        </div>
      )}

      {/* --- DIALOGUE MODE --- */}
      {mode === 'dialogue' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className="flex justify-between items-center mb-6 px-1">
             <label className="text-sm font-semibold text-[#E6EAF0] flex items-center gap-2 uppercase tracking-widest">
               <MessageSquare className="w-4 h-4 text-[#3186FF]" />
               Mission Control
             </label>
             <div className="flex gap-2">
                <button 
                  onClick={() => setShowLoadSceneModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#B7BFD9] hover:text-white bg-[rgba(230,234,240,0.03)] hover:bg-[rgba(230,234,240,0.08)] transition-all"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Load
                </button>
                <button 
                  onClick={() => setShowSaveSceneModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#121317] hover:bg-white bg-[#E6EAF0] transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Character 1 Select */}
            <div className="bg-[#212226] border border-[rgba(230,234,240,0.06)] p-5 rounded-[1.5rem] flex flex-col gap-3 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
               <label className="text-[10px] font-bold text-[#B7BFD9] uppercase tracking-widest flex justify-between items-center">
                 Agent Alpha
                 {activeChar1.isCloned && <Mic className="w-3 h-3 text-emerald-400" />}
               </label>
               <select
                 value={char1Id}
                 onChange={(e) => setChar1Id(e.target.value)}
                 className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] text-sm font-medium text-white rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
               >
                 {personas.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </select>
            </div>
            
            {/* Character 2 Select */}
            <div className="bg-[#212226] border border-[rgba(230,234,240,0.06)] p-5 rounded-[1.5rem] flex flex-col gap-3 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400"></div>
               <label className="text-[10px] font-bold text-[#B7BFD9] uppercase tracking-widest flex justify-between items-center">
                 Agent Beta
                 {activeChar2.isCloned && <Mic className="w-3 h-3 text-emerald-400" />}
               </label>
               <select
                 value={char2Id}
                 onChange={(e) => setChar2Id(e.target.value)}
                 className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] text-sm font-medium text-white rounded-xl p-3 focus:ring-2 focus:ring-cyan-400 outline-none appearance-none"
               >
                 {personas.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mb-6 px-1">
             <button onClick={() => setShowCloneForm(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors">
               <Mic className="w-3.5 h-3.5" /> Clone Voice
             </button>
             <button onClick={openCreateForm} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-[#3186FF] bg-[#3186FF]/10 hover:bg-[#3186FF]/20 border border-[#3186FF]/20 transition-colors">
               <Plus className="w-3.5 h-3.5" /> New Persona
             </button>
          </div>

          <div className="bg-[#121317] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-5 mb-8 min-h-[300px] max-h-[500px] overflow-y-auto flex flex-col gap-5 shadow-inner">
             {dialogueTurns.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[#B7BFD9] text-sm font-medium">
                  Initialize scene sequence...
                </div>
             ) : (
                dialogueTurns.map((turn) => (
                  <div key={turn.id} className={`flex w-full animate-in fade-in slide-in-from-bottom-2 ${turn.speaker === 1 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`w-[85%] sm:w-[75%] rounded-2xl p-4 shadow-md relative group ${
                      turn.speaker === 1
                        ? 'bg-[rgba(99,102,241,0.05)] border border-indigo-500/20 rounded-tl-sm'
                        : 'bg-[rgba(34,211,238,0.05)] border border-cyan-400/20 rounded-tr-sm'
                    }`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${turn.speaker === 1 ? 'text-indigo-400' : 'text-cyan-400'}`}>
                           {turn.speaker === 1 ? activeChar1.name : activeChar2.name}
                        </span>
                        <div className="flex gap-1">
                           <button onClick={() => swapTurnSpeaker(turn.id)} className="text-[#B7BFD9] hover:text-white p-1.5 rounded-full hover:bg-[#2F3034] transition-colors" title="Swap Speaker">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => removeDialogueTurn(turn.id)} className="text-[#FC413D]/60 hover:text-[#FC413D] p-1.5 rounded-full hover:bg-[#FC413D]/10 transition-colors opacity-0 group-hover:opacity-100" title="Delete Turn">
                              <X className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </div>
                      
                      <textarea
                        value={turn.text}
                        onChange={(e) => updateTurnText(turn.id, e.target.value)}
                        className="w-full bg-[#18191D]/50 text-base text-white p-4 rounded-xl border border-[rgba(230,234,240,0.06)] focus:outline-none focus:border-[#45474D] resize-none min-h-[80px] font-light"
                        placeholder={`Input transmission for ${turn.speaker === 1 ? activeChar1.name : activeChar2.name}...`}
                      />
                      
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[rgba(230,234,240,0.06)] opacity-60 hover:opacity-100 transition-opacity">
                        <select
                          value={turn.emotion || 'Neutral'}
                          onChange={(e) => updateTurnEmotion(turn.id, e.target.value)}
                          className="bg-[#121317] border border-[rgba(230,234,240,0.1)] text-[10px] font-medium text-[#B7BFD9] rounded-full px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer appearance-none"
                        >
                          <option value="Neutral">Neutral Tone</option>
                          <option value="Cheerfully">Cheerful</option>
                          <option value="Sadly">Sad</option>
                          <option value="Angrily">Angry</option>
                          <option value="Whispering">Whispering</option>
                          <option value="Excitedly">Excited</option>
                          <option value="Professionally">Professional</option>
                        </select>
                        <select
                          value={turn.tempo || 'Normal'}
                          onChange={(e) => updateTurnTempo(turn.id, e.target.value)}
                          className="bg-[#121317] border border-[rgba(230,234,240,0.1)] text-[10px] font-medium text-[#B7BFD9] rounded-full px-3 py-1.5 focus:ring-1 focus:ring-cyan-400 outline-none cursor-pointer appearance-none"
                        >
                          <option value="Very Slow">Very Slow</option>
                          <option value="Slow">Slow</option>
                          <option value="Normal">Normal Pace</option>
                          <option value="Fast">Fast</option>
                          <option value="Very Fast">Very Fast</option>
                        </select>
                      </div>

                    </div>
                  </div>
                ))
             )}
             
             <button
               onClick={addDialogueTurn}
               className="self-center mt-4 flex items-center gap-2 py-2.5 px-6 rounded-full border border-[rgba(230,234,240,0.1)] bg-[#212226] text-[#E6EAF0] hover:bg-[#2F3034] hover:text-white transition-all text-sm font-semibold shadow-lg active:scale-95"
             >
               <Plus className="w-4 h-4" /> Add Sequence
             </button>
          </div>
        </div>
      )}

      {/* --- TRANSCRIBE MODE --- */}
      {mode === 'transcribe' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-6">
             <label className="text-sm font-semibold text-[#E6EAF0] flex items-center gap-2 uppercase tracking-widest">
               <FileText className="w-4 h-4 text-emerald-400" />
               Source Input
             </label>
             <div className="flex gap-1 bg-[#121317] p-1 rounded-full border border-[rgba(230,234,240,0.06)]">
                <button 
                  onClick={() => setTranscribeInputMode('upload')} 
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${transcribeInputMode === 'upload' ? 'bg-[#2F3034] text-emerald-400 shadow-sm' : 'text-[#B7BFD9] hover:text-white'}`}
                >
                  Upload
                </button>
                <button 
                  onClick={() => setTranscribeInputMode('record')} 
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${transcribeInputMode === 'record' ? 'bg-[#2F3034] text-emerald-400 shadow-sm' : 'text-[#B7BFD9] hover:text-white'}`}
                >
                  Record
                </button>
             </div>
          </div>

          <div className="mb-8">
            {transcribeInputMode === 'upload' ? (
              <div className="relative group border-2 border-dashed border-[rgba(230,234,240,0.1)] rounded-[1.5rem] p-10 hover:border-emerald-500/50 transition-colors bg-[#212226]/50 flex flex-col items-center justify-center text-center cursor-pointer min-h-[250px]">
                <input 
                  type="file" 
                  accept="audio/*,video/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                      setTranscription('');
                      setTranscribeError('');
                    }
                  }}
                />
                <div className="p-5 bg-[#121317] rounded-full mb-5 group-hover:bg-emerald-500/10 transition-colors shadow-inner">
                   <Upload className="w-8 h-8 text-[#B7BFD9] group-hover:text-emerald-400 transition-colors" />
                </div>
                <h4 className="text-white font-medium mb-2 truncate max-w-full px-4 text-lg">
                  {selectedFile ? selectedFile.name : 'Select or drop media file'}
                </h4>
                <p className="text-sm text-[#B7BFD9]/70 font-light">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Supported formats: MP3, WAV, MP4, WebM'}
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[rgba(230,234,240,0.1)] rounded-[1.5rem] p-10 bg-[#212226]/50 flex flex-col items-center justify-center text-center min-h-[250px]">
                {transcribeRecordState === 'idle' && (
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={startTranscribeRecording} 
                      className="w-24 h-24 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(5,150,105,0.3)] transition-all hover:scale-105 mb-6"
                    >
                      <Mic className="w-10 h-10" />
                    </button>
                    <p className="text-white font-medium text-lg">Initialize Recording</p>
                    <p className="text-sm text-[#B7BFD9]/70 mt-1 font-light">Verify microphone connection</p>
                  </div>
                )}
                
                {transcribeRecordState === 'recording' && (
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={stopTranscribeRecording} 
                      className="w-24 h-24 bg-[#121317] border-2 border-[#FC413D] text-[#FC413D] hover:bg-[#FC413D]/10 rounded-full flex items-center justify-center transition-all animate-pulse mb-6"
                    >
                      <Square className="w-8 h-8 fill-current" />
                    </button>
                    <p className="text-[#FC413D] font-medium text-lg animate-pulse">Capturing Audio...</p>
                    <p className="text-sm text-[#B7BFD9]/70 mt-1 font-light">Click to terminate</p>
                  </div>
                )}

                {transcribeRecordState === 'recorded' && (
                  <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-5">
                       <Activity className="w-10 h-10 text-emerald-400" />
                    </div>
                    <p className="text-emerald-400 font-medium text-xl">Audio Stored</p>
                    <p className="text-sm text-[#B7BFD9] mt-1 mb-8 font-light">Ready for transcription protocol</p>
                    
                    <button 
                      onClick={clearTranscribeRecording} 
                      className="text-sm font-semibold text-[#FC413D]/80 hover:text-[#FC413D] hover:bg-[#FC413D]/10 px-5 py-2.5 rounded-full transition-colors"
                    >
                      Discard & Re-initialize
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {transcribeError && (
              <p className="mt-4 text-sm font-medium text-[#FC413D] flex items-center gap-1.5"><X className="w-4 h-4"/> {transcribeError}</p>
            )}
          </div>

          {transcription && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <label className="block text-sm font-semibold text-[#E6EAF0] mb-3 flex items-center gap-2 uppercase tracking-widest">
                <FileText className="w-4 h-4 text-emerald-400" />
                Extracted Data
              </label>
              <textarea
                readOnly
                value={transcription}
                className="w-full h-56 bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-[1.5rem] p-6 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none font-light leading-relaxed scrollbar-thin scrollbar-thumb-[#45474D] text-base"
              />
            </div>
          )}
        </div>
      )}

      {/* --- BATCH MODE --- */}
      {mode === 'batch' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="flex items-center justify-between mb-6 px-1">
               <label className="text-sm font-semibold text-[#E6EAF0] flex items-center gap-2 uppercase tracking-widest">
                 <ListOrdered className="w-4 h-4 text-[#3186FF]" />
                 Execution Queue
               </label>
               <div className="flex items-center gap-4">
                 <span className="text-xs font-medium text-[#B7BFD9]">{batchQueue.length} items</span>
                 {batchQueue.length > 0 && (
                    <button 
                      onClick={() => setBatchQueue([])} 
                      className="text-xs font-semibold text-[#FC413D]/80 hover:text-[#FC413D] hover:bg-[#FC413D]/10 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Clear Queue
                    </button>
                 )}
               </div>
           </div>

           <div className="bg-[#121317] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-5 mb-8 min-h-[300px] max-h-[500px] overflow-y-auto flex flex-col gap-3 shadow-inner scrollbar-thin scrollbar-thumb-[#45474D]">
              {batchQueue.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-[#B7BFD9] text-sm font-medium gap-3 opacity-60">
                    <ListPlus className="w-10 h-10" />
                    Queue is empty. Add tasks from Single or Agent modes.
                  </div>
              ) : (
                  batchQueue.map((item, index) => (
                     <div key={item.id} className="bg-[#212226] border border-[rgba(230,234,240,0.06)] p-4 rounded-2xl flex items-center justify-between group hover:bg-[#2F3034] hover:border-[rgba(230,234,240,0.12)] transition-all">
                         <div className="flex items-center gap-4 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#121317] border border-[rgba(230,234,240,0.06)] flex items-center justify-center text-[#B7BFD9] shadow-inner shrink-0">
                               <span className="text-xs font-bold">{index + 1}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                  {item.type === 'single' ? <User className="w-3.5 h-3.5 text-indigo-400"/> : <MessageSquare className="w-3.5 h-3.5 text-cyan-400"/>}
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#E6EAF0]">
                                     {item.type === 'single' ? 'Single Speaker' : 'Agent Scene'}
                                  </span>
                                  <span className="text-[10px] text-[#B7BFD9]/70 px-1.5 py-0.5 bg-[#121317] rounded-full">
                                    {item.type === 'single' ? item.persona.name : `${item.persona1.name} & ${item.persona2.name}`}
                                  </span>
                               </div>
                               <p className="text-sm text-[#B7BFD9] truncate max-w-[220px] sm:max-w-[350px]">
                                  {item.type === 'single' ? item.text : `Scene excerpt: "${item.turns[0]?.text || 'Empty scene'}"`}
                               </p>
                            </div>
                         </div>
                         <button 
                            onClick={() => removeFromBatch(item.id)} 
                            className="p-2 text-[#FC413D]/60 hover:text-[#FC413D] hover:bg-[#FC413D]/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Remove from queue"
                         >
                            <X className="w-4 h-4" />
                         </button>
                     </div>
                  ))
              )}
           </div>
        </div>
      )}

      {/* Action Buttons Container */}
      {mode === 'transcribe' ? (
        <button
          onClick={handleTranscribeClick}
          disabled={isTranscribing || !activeFileForTranscription}
          className="w-full py-4 px-6 bg-[#E6EAF0] hover:bg-white text-[#121317] font-bold text-lg rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99]"
        >
          {isTranscribing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing Transcripts...</>
          ) : (
            <><FileText className="w-5 h-5 fill-current" /> Execute Transcription</>
          )}
        </button>
      ) : mode === 'batch' ? (
        <button
          onClick={handleExecuteBatch}
          disabled={isLoading || batchQueue.length === 0}
          className="w-full py-4 px-6 bg-[#E6EAF0] hover:bg-white text-[#121317] font-bold text-lg rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99]"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing Queue...</>
          ) : (
            <><Play className="w-5 h-5 fill-current ml-1" /> Execute Batch Sequence</>
          )}
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isLoading || (mode === 'single' ? !text.trim() : dialogueTurns.filter(t => t.text.trim()).length === 0)}
            className="flex-1 py-4 px-6 bg-[#E6EAF0] hover:bg-white text-[#121317] font-bold text-lg rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99]"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing Artifact...</>
            ) : (
              <><Play className="w-5 h-5 fill-current ml-1" /> Execute Synthesis</>
            )}
          </button>
          <button
            onClick={handleAddToBatch}
            disabled={isLoading || (mode === 'single' ? !text.trim() : dialogueTurns.filter(t => t.text.trim()).length === 0)}
            className="py-4 px-6 bg-[rgba(230,234,240,0.06)] hover:bg-[rgba(230,234,240,0.12)] text-[#B7BFD9] hover:text-white rounded-full transition-all duration-200 active:scale-[0.95] disabled:opacity-50 flex items-center justify-center"
            title="Add configuration to Batch Queue"
          >
             <ListPlus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Save Scene Modal */}
      {showSaveSceneModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#121317]/80 backdrop-blur-md rounded-[2rem] animate-in fade-in duration-200">
          <div className="bg-[#18191D] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-8 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowSaveSceneModal(false)} className="absolute top-5 right-5 text-[#B7BFD9] hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Save className="w-5 h-5 text-[#3186FF]" /> Save Scene</h3>
            <form onSubmit={handleSaveScene} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#B7BFD9] uppercase tracking-widest mb-2">Scene Name</label>
                <input 
                  type="text" 
                  required 
                  value={saveSceneName} 
                  onChange={(e) => setSaveSceneName(e.target.value)} 
                  placeholder="e.g., Sequence Alpha" 
                  className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSaveSceneModal(false)} className="flex-1 py-3 px-4 bg-[rgba(230,234,240,0.06)] text-[#E6EAF0] rounded-full font-semibold hover:bg-[#2F3034] transition-colors">Cancel</button>
                <button type="submit" disabled={!saveSceneName.trim()} className="flex-1 py-3 px-4 bg-[#3186FF] text-white rounded-full font-semibold hover:bg-[#3186FF]/90 disabled:opacity-50 transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Scene Modal */}
      {showLoadSceneModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#121317]/80 backdrop-blur-md rounded-[2rem] animate-in fade-in duration-200">
          <div className="bg-[#18191D] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-8 w-full max-w-md shadow-2xl relative flex flex-col max-h-[80%]">
            <button onClick={() => setShowLoadSceneModal(false)} className="absolute top-5 right-5 text-[#B7BFD9] hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FolderOpen className="w-5 h-5 text-[#3186FF]" /> Load Sequence</h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#45474D]">
              {savedScenes.length === 0 ? (
                <div className="text-center py-10 text-[#B7BFD9] text-sm font-medium">
                  No sequences stored in memory.
                </div>
              ) : (
                savedScenes.map(scene => (
                  <div key={scene.id} className="group bg-[#212226] border border-[rgba(230,234,240,0.06)] p-4 rounded-2xl flex items-center justify-between hover:bg-[#2F3034] transition-all cursor-pointer" onClick={() => handleLoadScene(scene)}>
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-base font-semibold text-white truncate">{scene.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#B7BFD9]">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(scene.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-mono">{scene.turns.length} turns</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLoadScene(scene); }}
                        className="p-2.5 bg-[#3186FF]/10 text-[#3186FF] hover:bg-[#3186FF] hover:text-white rounded-full transition-colors"
                        title="Load Scene"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteScene(e, scene.id)}
                        className="p-2.5 bg-[#FC413D]/10 text-[#FC413D] hover:bg-[#FC413D] hover:text-white rounded-full transition-colors"
                        title="Delete Scene"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Cloning Modal */}
      {showCloneForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[#121317]/80 backdrop-blur-md rounded-[2rem] animate-in fade-in duration-200">
          <div className="bg-[#18191D] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-8 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => { setShowCloneForm(false); resetForms(); }}
              className="absolute top-5 right-5 text-[#B7BFD9] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-400" /> Voice Cloning Protocol
            </h3>
            <div className="space-y-6">
              {cloneState === 'idle' || cloneState === 'recording' ? (
                <>
                  <div className="bg-[#212226] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-5 shadow-inner">
                    <p className="text-[10px] text-[#B7BFD9] mb-3 font-bold uppercase tracking-widest">Calibration Script:</p>
                    <p className="text-base text-white font-serif leading-relaxed italic">
                      "The quick brown fox jumps over the lazy dog. Voice cloning technology allows artificial intelligence to understand the unique characteristics of speech, including tone, pitch, and cadence."
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6">
                    {cloneState === 'idle' ? (
                      <button onClick={startRecording} className="w-20 h-20 bg-[#FC413D] hover:bg-[#FC413D]/90 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(252,65,61,0.3)] transition-all hover:scale-105">
                        <Mic className="w-8 h-8" />
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="w-20 h-20 bg-[#121317] border-2 border-[#FC413D] text-[#FC413D] hover:bg-[#FC413D]/10 rounded-full flex items-center justify-center transition-all animate-pulse">
                        <Square className="w-8 h-8 fill-current" />
                      </button>
                    )}
                    <p className="text-sm font-medium text-[#B7BFD9] mt-5">
                      {cloneState === 'idle' ? 'Click to begin calibration' : 'Recording... Click to stop'}
                    </p>
                  </div>
                </>
              ) : cloneState === 'recorded' || cloneState === 'training' ? (
                 <form onSubmit={trainClonedVoice} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center"><Activity className="w-6 h-6 text-emerald-400" /></div>
                      <div>
                        <p className="text-base font-bold text-emerald-400">Data Captured</p>
                        <p className="text-xs text-emerald-400/70 font-medium">Ready for model training.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#B7BFD9] uppercase tracking-widest mb-2">Assign Designation</label>
                      <input type="text" required value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="e.g., Operator Primary" className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-emerald-500/50 outline-none" disabled={cloneState === 'training'} />
                    </div>
                    <button type="submit" disabled={!cloneName.trim() || cloneState === 'training'} className="w-full py-4 px-4 bg-[#E6EAF0] text-[#121317] rounded-full font-bold hover:bg-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {cloneState === 'training' ? <><Loader2 className="w-5 h-5 animate-spin" />Processing Voice Data...</> : 'Train Custom Model'}
                    </button>
                 </form>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Persona Builder Modal */}
      {showCreateForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[#121317]/80 backdrop-blur-md rounded-[2rem] animate-in fade-in duration-200">
          <div className="bg-[#18191D] border border-[rgba(230,234,240,0.06)] rounded-[1.5rem] p-8 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => { setShowCreateForm(false); resetForms(); }} className="absolute top-5 right-5 text-[#B7BFD9] hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-[#3186FF]" /> {editingPersonaId ? 'Modify Style Vector' : 'Style Vector Builder'}</h3>
            
            <form onSubmit={handleSavePersona} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#B7BFD9] uppercase tracking-widest mb-2">Designation</label>
                  <input type="text" required value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} placeholder="e.g., Instructor" className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#B7BFD9] uppercase tracking-widest mb-2">Base Model</label>
                  <select value={newPersonaBase} onChange={(e) => setNewPersonaBase(e.target.value as VoiceName)} className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-xl p-3 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none appearance-none cursor-pointer">
                    {DEFAULT_PERSONAS.map(p => <option key={p.id} value={p.baseVoice}>{p.name} ({p.description})</option>)}
                  </select>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#212226] border border-[rgba(230,234,240,0.06)] space-y-5 shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#E6EAF0]">Vocal Parameters</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#B7BFD9] mb-1.5">Emotion Matrix</label>
                    <select value={personaEmotion} onChange={(e) => setPersonaEmotion(e.target.value)} className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-lg p-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none appearance-none cursor-pointer">
                      <option value="Neutral">Neutral</option>
                      <option value="Cheerfully">Cheerful</option>
                      <option value="Sadly">Sad</option>
                      <option value="Angrily">Angry</option>
                      <option value="Whispering">Whispering</option>
                      <option value="Excitedly">Excited</option>
                      <option value="Professionally">Professional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#B7BFD9] mb-1.5">Velocity</label>
                    <select value={personaSpeed} onChange={(e) => setPersonaSpeed(e.target.value)} className="w-full bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-lg p-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-[#3186FF]/50 outline-none appearance-none cursor-pointer">
                      <option value="Very Slow">Very Slow</option>
                      <option value="Slow">Slow</option>
                      <option value="Normal">Normal</option>
                      <option value="Fast">Fast</option>
                      <option value="Very Fast">Very Fast</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#B7BFD9] mb-1.5">Custom Prompt (Optional)</label>
                  <textarea value={personaExtra} onChange={(e) => setPersonaExtra(e.target.value)} placeholder="e.g., speak with a thick Scottish accent" className="w-full h-20 bg-[#121317] border border-[rgba(230,234,240,0.1)] rounded-lg p-3 text-sm font-medium text-white placeholder-[#B7BFD9]/40 focus:ring-2 focus:ring-[#3186FF]/50 outline-none resize-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateForm(false); resetForms(); }} className="flex-1 py-3 px-4 bg-[rgba(230,234,240,0.06)] text-[#E6EAF0] rounded-full font-semibold hover:bg-[#2F3034] transition-colors">Cancel</button>
                <button type="submit" disabled={!newPersonaName.trim()} className="flex-1 py-3 px-4 bg-[#E6EAF0] text-[#121317] rounded-full font-bold hover:bg-white disabled:opacity-50 transition-colors">Apply Vector</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;