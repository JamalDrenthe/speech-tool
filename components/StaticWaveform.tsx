import React, { useEffect, useRef, useState, useCallback } from 'react';

interface StaticWaveformProps {
  buffer: AudioBuffer | null;
  currentTime: number;
  duration?: number;
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
}

const StaticWaveform: React.FC<StaticWaveformProps> = ({
  buffer,
  currentTime,
  duration = 0,
  isPlaying = false,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const effectiveDuration = duration || buffer?.duration || 0;

  const formatTime = (time: number): string => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms}`;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!effectiveDuration || !onSeek || !containerRef.current) return;
    setIsDragging(true);
    containerRef.current.setPointerCapture(e.pointerId);
    seekFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !effectiveDuration) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    setHoverX(x);
    setHoverTime(percent * effectiveDuration);

    if (isDragging && onSeek) {
      seekFromPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
    }
  };

  const seekFromPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current || !effectiveDuration || !onSeek) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const targetTime = (x / rect.width) * effectiveDuration;
      onSeek(targetTime);
    },
    [effectiveDuration, onSeek]
  );

  useEffect(() => {
    if (!canvasRef.current || !buffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawData = buffer.getChannelData(0);
    const barsCount = 140;
    const step = Math.ceil(rawData.length / barsCount);
    const amp = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const progressPercentage = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;
    const activeBarIndex = Math.floor(progressPercentage * barsCount);
    const barWidth = (canvas.width / barsCount) * 0.68;

    for (let i = 0; i < barsCount; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const index = i * step + j;
        if (index < rawData.length) {
          const datum = rawData[index];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }

      const x = i * (canvas.width / barsCount);
      const magnitude = Math.max(0.06, max - min);
      
      // Add subtle dynamic bounce while playing
      let dynamicMult = 1.0;
      if (isPlaying && i >= activeBarIndex - 3 && i <= activeBarIndex + 3) {
        dynamicMult = 1.15;
      }
      const barHeight = Math.min(canvas.height * 0.9, magnitude * amp * dynamicMult);
      const y = amp - barHeight / 2;

      if (i <= activeBarIndex) {
        // Active played portion: Apple Electric Cyan-Blue to System Blue
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#2997ff');
        gradient.addColorStop(1, '#0071e3');
        ctx.fillStyle = gradient;

        if (i === activeBarIndex) {
          ctx.shadowColor = '#2997ff';
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
      } else {
        // Unplayed portion: deep specular slate
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
  }, [buffer, currentTime, effectiveDuration, isPlaying]);

  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`relative w-full h-36 rounded-2xl bg-[#000000]/80 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_rgba(255,255,255,0.1),0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-center select-none ${
        buffer ? 'cursor-pointer group' : 'cursor-default'
      }`}
    >
      {!buffer && (
        <div className="flex flex-col items-center gap-2 text-white/40 text-xs">
          <div className="w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-white/30" />
          </div>
          <span>Wacht op audio generatie</span>
        </div>
      )}

      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={150}
        className={`w-full h-full absolute inset-0 ${
          buffer ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-300 pointer-events-none px-2`}
      />

      {buffer && (
        <>
          {/* Glowing Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2997ff] via-[#0071e3] to-transparent shadow-[0_0_12px_#2997ff] pointer-events-none transition-transform duration-75"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="absolute top-1 -left-1.5 w-3.5 h-3.5 rounded-full bg-[#2997ff] border-2 border-white shadow-lg" />
          </div>

          {/* Hover Scrubbing Line */}
          {hoverTime !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none"
              style={{ left: `${hoverX}px` }}
            >
              <div className="absolute top-2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-[10px] font-mono text-white shadow-xl">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}

          {/* Time & Spectrum Indicators */}
          <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-[#86868b] pointer-events-none">
            <span className="text-[#2997ff] font-semibold flex items-center gap-1.5">
              {isPlaying && (
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 h-2 bg-[#2997ff] animate-pulse" />
                  <span className="w-0.5 h-3 bg-[#2997ff] animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-1.5 bg-[#2997ff] animate-pulse" style={{ animationDelay: '300ms' }} />
                </span>
              )}
              {formatTime(currentTime)}
            </span>
            <span className="text-white/60">
              {formatTime(effectiveDuration)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default StaticWaveform;
