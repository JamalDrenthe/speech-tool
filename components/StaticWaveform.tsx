import React, { useEffect, useRef } from 'react';

interface StaticWaveformProps {
  buffer: AudioBuffer | null;
  currentTime: number;
}

const StaticWaveform: React.FC<StaticWaveformProps> = ({ buffer, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !buffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the raw audio data from the buffer (mono channel)
    const rawData = buffer.getChannelData(0);
    
    // Calculate pixels to jump per drawn bar to fit the canvas
    const barsCount = 150; 
    const step = Math.ceil(rawData.length / barsCount);
    const amp = canvas.height / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the playback progress boundary
    const progressPercentage = currentTime / buffer.duration;
    const activeBarIndex = Math.floor(progressPercentage * barsCount);

    // Draw the static waveform
    const barWidth = (canvas.width / barsCount) * 0.7; // 70% bar width, 30% gap
    
    for (let i = 0; i < barsCount; i++) {
      let min = 1.0;
      let max = -1.0;
      
      // Calculate min/max for this chunk
      for (let j = 0; j < step; j++) {
        const index = (i * step) + j;
        if (index < rawData.length) {
          const datum = rawData[index];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      const x = i * (canvas.width / barsCount);
      // Ensure there's a minimum height for very quiet parts
      const magnitude = Math.max(0.05, max - min); 
      const barHeight = magnitude * amp;
      const y = amp - (barHeight / 2);

      // Gradient for active vs inactive bars
      if (i <= activeBarIndex) {
        // Active color (warm signal gradient)
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#69d9d0');
        gradient.addColorStop(1, '#f5a623');
        ctx.fillStyle = gradient;
        
        // Add a slight glow effect to the playhead
        if (i === activeBarIndex) {
          ctx.shadowColor = '#f5a623';
          ctx.shadowBlur = 10;
        } else {
          ctx.shadowBlur = 0;
        }
      } else {
        // Inactive color
        ctx.fillStyle = '#3a3e47';
        ctx.shadowBlur = 0;
      }
      
      // Draw rounded rect equivalent
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();
    }
  }, [buffer, currentTime]);

  return (
    <div className="relative w-full h-32 rounded-xl bg-[#090a0c] shadow-inner border border-white/[0.08] overflow-hidden flex items-center justify-center">
      {!buffer && <span className="text-[#6d717b] text-sm">No audio generated</span>}
      <canvas
        ref={canvasRef}
        width={800}
        height={150}
        className={`w-full h-full absolute inset-0 ${buffer ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      />
    </div>
  );
};

export default StaticWaveform;