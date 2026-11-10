import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, X, ExternalLink, ShieldCheck, AlertTriangle, Cpu, Sparkles } from 'lucide-react';
import { getApiKey, setApiKey } from '../services/geminiService';
import { getHfToken, setHfToken, BARK_DIRECT_URL } from '../services/barkService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeyUpdated }) => {
  const [keyInput, setKeyInput] = useState('');
  const [hfTokenInput, setHfTokenInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showHfToken, setShowHfToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeKey, setActiveKey] = useState('');
  const [activeHfToken, setActiveHfToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = getApiKey();
      const currentHf = getHfToken();
      setActiveKey(current);
      setKeyInput(current);
      setActiveHfToken(currentHf);
      setHfTokenInput(currentHf);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(keyInput.trim());
    setActiveKey(keyInput.trim());
    setHfToken(hfTokenInput.trim());
    setActiveHfToken(hfTokenInput.trim());
    setSavedSuccess(true);
    onKeyUpdated?.();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setApiKey('');
    setActiveKey('');
    setKeyInput('');
    setHfToken('');
    setActiveHfToken('');
    setHfTokenInput('');
    onKeyUpdated?.();
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-2xl glass-control border border-white/15 p-6 shadow-2xl relative overflow-hidden"
        style={{
          background: 'rgba(18, 20, 24, 0.94)'
        }}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#5b9cff]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5b9cff]/15 border border-[#5b9cff]/30 flex items-center justify-center text-[#5b9cff]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI Engine & Fallback Keys</h3>
              <p className="text-xs text-[#8e929c]">Gemini 2.5 Flash TTS + Suno Bark Fallback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8e929c] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fallback info card */}
        <div className="my-4 p-3.5 rounded-xl bg-[#5b9cff]/[0.08] border border-[#5b9cff]/20 flex items-start gap-3 text-xs">
          <Sparkles className="w-4 h-4 text-[#79b0ff] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block mb-0.5">Automatische Bark Fallback Actief</span>
            <span className="text-[#a8abb3] leading-relaxed">
              Zodra de gratis Gemini limiet bereikt is, schakelt de app automatisch over naar{' '}
              <a href={BARK_DIRECT_URL} target="_blank" rel="noreferrer" className="text-[#79b0ff] underline">
                Suno Bark op Hugging Face
              </a>.
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#c0c5cf] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#5b9cff]" />
                Google Gemini API Key (Primair)
              </label>
              {activeKey && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {maskKey(activeKey)}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy... of ingebouwde key"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#5b9cff] focus:ring-1 focus:ring-[#5b9cff] transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Hugging Face Token (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#c0c5cf] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Hugging Face Token (Optioneel voor Suno Bark)
              </label>
              {activeHfToken && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {maskKey(activeHfToken)}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showHfToken ? 'text' : 'password'}
                value={hfTokenInput}
                onChange={(e) => setHfTokenInput(e.target.value)}
                placeholder="hf_... (Niet verplicht, Bark werkt ook zonder token)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#5b9cff] focus:ring-1 focus:ring-[#5b9cff] transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowHfToken(!showHfToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                {showHfToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8e929c] mt-1.5">
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#79b0ff] hover:underline"
              >
                Hugging Face token aanmaken
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-white/40">Bark werkt standaard gratis zonder key</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8e929c] pt-2 border-t border-white/10">
            {activeKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Instellingen resetten
              </button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/15 text-sm font-medium text-[#c0c5cf] hover:bg-white/5 transition-all"
              >
                Sluiten
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#5b9cff] text-[#090a0c] hover:bg-[#70a8ff]'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Opgeslagen!
                  </>
                ) : (
                  'Opslaan'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
