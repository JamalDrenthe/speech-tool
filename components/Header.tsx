import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-5 fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-5 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/95 shadow-[0_0_28px_rgba(245,166,35,0.16)]">
            <img src="/jdlogo.png" alt="Jamal Drenthe" className="h-6 w-auto object-contain" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8e929c]">Jamal Drenthe</p>
            <p className="text-sm font-semibold tracking-tight text-white">Speech Tool</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-7">
           <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e929c]">Studio</span>
           <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e929c]">Voice Lab</span>
           <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f5a623]">
             <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] shadow-[0_0_10px_rgba(245,166,35,0.8)]" />
             Live
           </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8e929c]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#63d7a4]" />
          Ready
        </div>
      </div>
    </header>
  );
};

export default Header;