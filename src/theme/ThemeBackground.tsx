import { useEffect, useRef, ReactNode } from 'react';
import { useTheme } from './ThemeProvider';

export default function ThemeBackground({ children }: { children: ReactNode }) {
  const { currentTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let animId = 0;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 0.5,
        a: Math.random() * 0.35 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() * 0.001;

      // Particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.colors.primary;
        ctx.globalAlpha = p.a;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      // Theme-specific effects
      switch (currentTheme.id) {
        case 'nebula-dream': {
          const g = ctx.createRadialGradient(
            canvas.width / 2 + Math.sin(t * 0.02) * 200, canvas.height / 2 + Math.cos(t * 0.03) * 200, 50,
            canvas.width / 2, canvas.height / 2, 400
          );
          g.addColorStop(0, currentTheme.colors.primary + '40');
          g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
        }
        case 'sunset-horizon': {
          const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
          g.addColorStop(0, currentTheme.colors.primary + '30');
          g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
        }
        case 'ocean-depth': {
          ctx.globalAlpha = 1; ctx.strokeStyle = currentTheme.colors.primary + '18'; ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            for (let x = 0; x < canvas.width; x += 2) {
              const y = canvas.height / 2 + Math.sin(x * 0.01 + t * 0.5 + i * 1.5) * 30 + i * 25;
              x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }
        case 'aurora-borealis': {
          for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = [currentTheme.colors.primary, currentTheme.colors.secondary, currentTheme.colors.accent][i];
            ctx.fillRect(0, i * 80 + Math.sin(t * 0.02 + i) * 25, canvas.width, 60);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'cyberpunk-city': {
          ctx.globalAlpha = 1; ctx.strokeStyle = currentTheme.colors.primary + '08'; ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
          for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
          break;
        }
        case 'snow-peace': {
          ctx.globalAlpha = 1;
          for (let i = 0; i < 40; i++) {
            const x = (i * 47 + t * 15) % canvas.width;
            const y = (i * 73 + t * 30 + i * 2) % canvas.height;
            ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
          }
          break;
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, [currentTheme]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" style={{ background: currentTheme.background, backgroundAttachment: 'fixed' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
