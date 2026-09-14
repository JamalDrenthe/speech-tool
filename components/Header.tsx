import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  return (
    <header className="py-5 fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-5 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="brand-mark flex items-center justify-center w-9 h-9 rounded-lg bg-white/95 border border-white/20">
            <img src="/jdlogo-mark.png" alt="Jamal Drenthe" className="brand-logo h-6 w-auto object-contain" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8e929c]">Jamal Drenthe</p>
            <p className="text-sm font-semibold tracking-tight text-white">Speech Tool</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-7">
           <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e929c]">Studio</span>
           <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e929c]">Voice Lab</span>
           <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#79b0ff]">
             <span className="w-1.5 h-1.5 rounded-full bg-[#5b9cff]" />
             Workspace
           </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#8e929c]">
          <span className="hidden sm:inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#63d7a4]" />
            Ready
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="glass-control flex h-9 w-9 items-center justify-center rounded-lg"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;