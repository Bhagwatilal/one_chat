import React, { useRef, useEffect } from 'react';

const STAR_COUNT = 1000;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface SpaceBackgroundProps {
  theme: 'dark' | 'light';
}

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useRef<{x: number, y: number, z: number}[]>([]);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Initialize stars
    stars.current = Array.from({ length: STAR_COUNT }, () => ({
      x: randomBetween(-1, 1),
      y: randomBetween(-1, 1),
      z: randomBetween(0.1, 1),
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animationId: number;

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      // Background color
      if (theme === 'dark') {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0a0f1c');
        grad.addColorStop(0.5, '#181e2a');
        grad.addColorStop(1, '#1a1333');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#d3bed6';
      }
      ctx.fillRect(0, 0, w, h);

      // Black hole position (center + mouse offset)
      const bhX = w / 2 + mouse.current.x * w * 0.15;
      const bhY = h / 2 + mouse.current.y * h * 0.15;

      // Draw stars
      for (const star of stars.current) {
        // Parallax effect
        const sx = w / 2 + (star.x + mouse.current.x * star.z * 0.5) * w * 0.45;
        const sy = h / 2 + (star.y + mouse.current.y * star.z * 0.5) * h * 0.45;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.1 + 1.5 * (1 - star.z), 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.7)';
        ctx.fill();
      }

      // Draw black hole glow
      const gradient = ctx.createRadialGradient(bhX, bhY, w * 0.04, bhX, bhY, w * 0.08);
      if (theme === 'dark') {
        gradient.addColorStop(0, 'rgba(60,50,80,0.7)');
        gradient.addColorStop(1, 'rgba(30,20,60,0.4)');
      } else {
        gradient.addColorStop(0, 'rgba(60,50,80,0.5)');
        gradient.addColorStop(1, 'rgba(211,190,214,0.5)');
      }
      ctx.beginPath();
      ctx.arc(bhX, bhY, w * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw black hole core
      ctx.beginPath();
      ctx.arc(bhX, bhY, w * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = '#2d2833';
      ctx.shadowColor = theme === 'dark' ? '#a78bfa' : '#bfa6c7';
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default SpaceBackground; 