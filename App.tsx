import React, { useState, useRef, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import StaticWaveform from './components/StaticWaveform';
import { generateSpeech, generateDialogue, transcribeMedia } from './services/geminiService';
import { decodeBase64, decodeAudioData, bufferToWav, analyzeAudioBuffer } from './utils/audioUtils';
import { VoicePersona, AudioState, DialogueTurn, BatchItem } from './types';
import { Download, Play, Pause, RotateCcw, Volume2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    buffer: null,
    isPlaying: false,
    isLoading: false,
    error: null,
    duration: 0,
    bpm: undefined,
    key: undefined
  });

  const [currentTime, setCurrentTime] = useState(0);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const welcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize AudioContext
    const initAudio = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
    };
    initAudio();

    // Initialize Houdini PaintWorklet
    if ('paintWorklet' in CSS) {
      try {
        (CSS as any).paintWorklet.addModule('https://unpkg.com/css-houdini-ringparticles/dist/ringparticles.js');
      } catch (e) {
        console.warn("Could not load paint worklet", e);
      }
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Handle Houdini Interactive Background
  useEffect(() => {
    const $welcome = welcomeRef.current;
    if (!$welcome) return;

    // Check if PaintWorklet is supported
    const supportsPaintWorklet = 'paintWorklet' in CSS;
    
    if (!supportsPaintWorklet) {
      // Fallback: Add CSS-based animated background
      $welcome.style.background = `
        radial-gradient(circle at 20% 50%, rgba(49, 134, 255, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 50%, rgba(49, 134, 255, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(49, 134, 255, 0.05) 0%, transparent 70%),
        linear-gradient(135deg, #121317 0%, #18191D 100%)
      `;
      $welcome.style.backgroundSize = '200% 200%, 200% 200%, 150% 150%, 100% 100%';
      $welcome.style.backgroundPosition = '0% 50%, 100% 50%, 50% 50%, 0% 0%';
      $welcome.style.animation = 'gradientShift 15s ease-in-out infinite, pulse 4s ease-in-out infinite';
      
      // Add fallback animation keyframes if not already added
      if (!document.getElementById('fallback-animations')) {
        const style = document.createElement('style');
        style.id = 'fallback-animations';
        style.textContent = `
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%, 100% 50%, 50% 50%, 0% 0%; }
            25% { background-position: 100% 50%, 0% 50%, 30% 50%, 0% 0%; }
            50% { background-position: 50% 50%, 50% 50%, 80% 50%, 0% 0%; }
            75% { background-position: 0% 50%, 100% 50%, 20% 50%, 0% 0%; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `;
        document.head.appendChild(style);
      }
    }

    if (supportsPaintWorklet) {
      let isInteractive = false;
      
      // Apply initial styles for the worklet - Made more visible!
      $welcome.style.setProperty('--ring-radius', '120');
      $welcome.style.setProperty('--ring-thickness', '800');
      $welcome.style.setProperty('--particle-count', '200'); // Increased count
      $welcome.style.setProperty('--particle-rows', '25'); // Increased rows
      $welcome.style.setProperty('--particle-size', '3'); // Increased size
      $welcome.style.setProperty('--particle-color', '#3186FF'); // Brighter primary blue
      $welcome.style.setProperty('--particle-min-alpha', '0.2'); // Increased min opacity
      $welcome.style.setProperty('--particle-max-alpha', '1.0'); // Increased max opacity
      $welcome.style.setProperty('--seed', '42');
      
      // Add animations via inline style to ensure they apply
      $welcome.style.animation = 'ripple 8s linear infinite, ring 8s ease-in-out infinite alternate';
      $welcome.style.backgroundImage = 'paint(ring-particles)';
      $welcome.style.transition = '--ring-x 1.5s ease-out, --ring-y 1.5s ease-out';

      const handlePointerMove = (e: PointerEvent) => {
        if (!isInteractive) {
          isInteractive = true;
        }
        // Calculate percentage position
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        $welcome.style.setProperty('--ring-x', x.toString());
        $welcome.style.setProperty('--ring-y', y.toString());
        $welcome.style.setProperty('--ring-interactive', '1');
      };

      const handlePointerLeave = () => {
        isInteractive = false;
        $welcome.style.setProperty('--ring-x', '50');
        $welcome.style.setProperty('--ring-y', '50');
        $welcome.style.setProperty('--ring-interactive', '0');
      };

      window.addEventListener('pointermove', handlePointerMove);
      document.body.addEventListener('pointerleave', handlePointerLeave);

      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        document.body.removeEventListener('pointerleave', handlePointerLeave);
      };
    }
  }, []);

  // Timer for progress bar & static waveform playhead tracking
  useEffect(() => {
    let animationFrame: number;
    const updateTime = () => {
      if (audioState.isPlaying && audioContextRef.current) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        if (elapsed >= (audioState.buffer?.duration || 0)) {
          stopAudio();
          setCurrentTime(audioState.buffer?.duration || 0);
        } else {
          setCurrentTime(elapsed);
          animationFrame = requestAnimationFrame(updateTime);
        }
      }
    };

    if (audioState.isPlaying) {
      animationFrame = requestAnimationFrame(updateTime);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [audioState.isPlaying, audioState.buffer]);

  const handleGenerateSingle = async (text: string, persona: VoicePersona, emotion: string, tempo: string) => {
    setAudioState(prev => ({ ...prev, isLoading: true, error: null }));
    stopAudio();

    try {
      const base64Audio = await generateSpeech(text, persona, emotion, tempo);
      await processAndPlayAudio(base64Audio);
    } catch (error: any) {
      setAudioState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to generate speech"
      }));
    }
  };

  const handleGenerateDialogue = async (turns: DialogueTurn[], persona1: VoicePersona, persona2: VoicePersona) => {
    setAudioState(prev => ({ ...prev, isLoading: true, error: null }));
    stopAudio();

    try {
      const base64Audio = await generateDialogue(turns, persona1, persona2);
      await processAndPlayAudio(base64Audio);
    } catch (error: any) {
      setAudioState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to generate dialogue"
      }));
    }
  };

  const handleGenerateBatch = async (queue: BatchItem[]) => {
    setAudioState(prev => ({ ...prev, isLoading: true, error: null }));
    stopAudio();

    try {
      const allPcmBytes: Uint8Array[] = [];
      let totalLength = 0;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        let base64Audio = '';

        if (item.type === 'single') {
          base64Audio = await generateSpeech(item.text, item.persona, item.emotion, item.tempo);
        } else if (item.type === 'dialogue') {
          base64Audio = await generateDialogue(item.turns, item.persona1, item.persona2);
        }

        const pcmBytes = decodeBase64(base64Audio);
        allPcmBytes.push(pcmBytes);
        totalLength += pcmBytes.length;
      }

      if (totalLength === 0) {
        throw new Error("Batch execution returned no audio data.");
      }

      // Seamlessly concatenate raw PCM streams
      const combinedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const bytes of allPcmBytes) {
        combinedPcm.set(bytes, offset);
        offset += bytes.length;
      }

      await processAndPlayAudioBytes(combinedPcm);
    } catch (error: any) {
      setAudioState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to process batch queue"
      }));
    }
  };

  const handleTranscribe = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(',')[1];
          const result = await transcribeMedia(base64Data, file.type);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read the media file."));
      };
      reader.readAsDataURL(file);
    });
  };

  const processAndPlayAudioBytes = async (rawBytes: Uint8Array) => {
    if (!audioContextRef.current) throw new Error("Audio Context not initialized");

    const audioBuffer = await decodeAudioData(rawBytes, audioContextRef.current);
    
    // Analyze Buffer for DSP stats
    const { bpm, key } = analyzeAudioBuffer(audioBuffer);

    setAudioState(prev => ({
      ...prev,
      isLoading: false,
      buffer: audioBuffer,
      duration: audioBuffer.duration,
      bpm,
      key
    }));
    setCurrentTime(0);
    pausedAtRef.current = 0;
  };

  const processAndPlayAudio = async (base64Audio: string) => {
    const rawBytes = decodeBase64(base64Audio);
    await processAndPlayAudioBytes(rawBytes);
  };

  const playAudio = async () => {
    if (!audioState.buffer || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioState.buffer;
    
    source.connect(audioContextRef.current.destination);

    const offset = pausedAtRef.current;
    source.start(0, offset);
    
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    sourceNodeRef.current = source;

    setAudioState(prev => ({ ...prev, isPlaying: true }));
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    pausedAtRef.current = 0;
    setCurrentTime(0);
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  };

  const handleDownload = () => {
    if (!audioState.buffer) return;
    const wavBlob = bufferToWav(audioState.buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-speech-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={welcomeRef} id="welcome" className="min-h-screen text-[#E6EAF0] pb-20 relative">
      {/* Less obscuring overlay so the particles pop more */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#121317]/20 to-[#121317]/90 pointer-events-none"></div>
      
      <div className="relative z-10">
        <section className="flex flex-col items-center justify-center pt-32 pb-12 px-4 text-center">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white drop-shadow-lg">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Speech Tool</span><br/>
            <span className="text-[0.6em] text-[#B7BFD9] font-normal tracking-normal mt-2 block">Advanced Voice Synthesis</span>
          </h2>
          <p className="text-[#B7BFD9] max-w-2xl mx-auto text-lg mb-8 font-light leading-relaxed">
            Generate high-fidelity single speaker audio, orchestrate multi-character dialogue scenes, or transcribe media.
          </p>
        </section>

        <main className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              <ControlPanel 
                onGenerateSingle={handleGenerateSingle} 
                onGenerateDialogue={handleGenerateDialogue}
                onGenerateBatch={handleGenerateBatch}
                onTranscribe={handleTranscribe}
                isLoading={audioState.isLoading} 
              />

              {audioState.error && (
                <div className="bg-[#FC413D]/10 border border-[#FC413D]/30 p-4 rounded-2xl flex items-center gap-3 text-[#FC413D] backdrop-blur-md">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{audioState.error}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#18191D]/80 border border-[rgba(230,234,240,0.06)] rounded-[2rem] p-6 sticky top-28 backdrop-blur-xl shadow-2xl">
                <h3 className="text-sm font-semibold text-[#B7BFD9] uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Output Artifact
                </h3>

                {!audioState.buffer && !audioState.isLoading && (
                  <div className="h-48 rounded-[1.5rem] border border-dashed border-[rgba(230,234,240,0.1)] flex flex-col items-center justify-center text-[#B7BFD9]/60 bg-[#212226]/50">
                     <div className="p-4 bg-[#2F3034] rounded-full mb-3 shadow-inner">
                       <Play className="w-6 h-6 text-[#B7BFD9]/50 ml-1" />
                     </div>
                     <p className="text-sm font-medium">Awaiting synthesis</p>
                  </div>
                )}

                {audioState.isLoading && (
                   <div className="h-48 rounded-[1.5rem] bg-[#212226] flex flex-col items-center justify-center animate-pulse border border-[rgba(230,234,240,0.03)]">
                      <div className="flex gap-1.5 mb-4">
                         <div className="w-1.5 h-6 bg-indigo-500 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                         <div className="w-1.5 h-10 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
                         <div className="w-1.5 h-8 bg-indigo-500 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                         <div className="w-1.5 h-12 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
                         <div className="w-1.5 h-5 bg-indigo-500 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                      </div>
                      <p className="text-xs text-indigo-400 font-medium typewriter uppercase tracking-widest">Synthesizing</p>
                   </div>
                )}

                {audioState.buffer && !audioState.isLoading && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StaticWaveform buffer={audioState.buffer} currentTime={currentTime} />
                    
                    <div className="space-y-2 px-1">
                      <div className="flex justify-between text-xs text-[#B7BFD9] font-mono font-medium">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(audioState.duration)}</span>
                      </div>
                      {/* Simple progress bar track */}
                      <div className="w-full h-1 bg-[#2F3034] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-75 ease-linear"
                          style={{ width: `${(currentTime / audioState.duration) * 100}%`, '--progress-width': `${(currentTime / audioState.duration) * 100}%` } as React.CSSProperties}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={audioState.isPlaying ? pauseAudio : playAudio}
                        className="btn-primary"
                      >
                        {audioState.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        {audioState.isPlaying ? 'Pause' : 'Play'}
                      </button>
                      
                      <button
                        onClick={stopAudio}
                        className="btn-secondary"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="btn-ghost"
                    >
                      <Download className="w-4 h-4" />
                      Download WAV Artifact
                    </button>
                  </div>
                )}

                {audioState.buffer && (
                  <div className="mt-8 pt-6 border-t border-[rgba(230,234,240,0.06)]">
                    <h4 className="text-[10px] font-bold text-[#45474D] uppercase tracking-widest mb-4">Verification Artifacts</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="audio-analysis">
                        <span className="analysis-label">Pacing</span>
                        <span className="analysis-value">{audioState.bpm || 'N/A'} <span className="analysis-unit">BPM</span></span>
                      </div>
                      <div className="audio-analysis">
                        <span className="analysis-label">Key Est.</span>
                        <span className="analysis-value">{audioState.key || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;