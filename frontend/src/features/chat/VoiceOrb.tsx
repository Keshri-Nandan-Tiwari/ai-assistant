import { useEffect, useRef, useState } from 'react';

interface Props {
  state: 'idle' | 'listening' | 'speaking';
  size?: number; // px — lets it be used compact (next to the mic) or large (centered)
}

// A glowing, rotating, color-shifting orb — an original sci-fi assistant
// visual (not a recreation of any specific film's design). Pure CSS + Canvas,
// no 3D engine or character assets, which genuinely aren't feasible to build
// here reliably on a phone browser over free hosting.
//
// Important: this deliberately does NOT grab the microphone itself for real
// audio levels. Doing that competes with the SpeechRecognition API for mic
// access at the same time, which broke voice input entirely on several
// Android devices. The motion below is a smooth simulated animation instead.
export default function VoiceOrb({ state, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (state === 'idle') {
      setLevel(0);
      return;
    }
    let raf: number;
    let t = 0;
    function tick() {
      t += 0.06;
      const wave = Math.sin(t) * 0.5 + Math.sin(t * 2.3) * 0.3 + Math.sin(t * 0.7) * 0.2;
      setLevel(0.35 + Math.abs(wave) * 0.4);
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let angle = 0;
    let hue = 0; // continuously cycling color wheel
    let raf: number;

    function draw() {
      ctx!.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const scale = size / 160;

      // Color slowly cycles through the palette; speeds up while speaking
      // so it visibly shifts "in different color mixing" as requested.
      hue += state === 'speaking' ? 0.6 : state === 'listening' ? 0.25 : 0.08;
      const color = `hsl(${hue % 360}, 85%, 58%)`;

      const baseRadius = 34 * scale;
      // While speaking, the core breathes — repeatedly shrinking and growing
      // rather than only pulsing outward, per the "shrink then come back" ask.
      const breathe = state === 'speaking' ? Math.sin(angle / 6) * 14 * scale : 0;
      const pulse = state === 'idle' ? Math.sin(angle / 25) * 3 * scale : level * 20 * scale;
      const coreRadius = Math.max(8 * scale, baseRadius + pulse - Math.abs(breathe) * 1.4);

      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 1.8);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color.replace('58%)', '58%, 0)').replace('hsl', 'hsla'));
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 1.8, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 0.55, 0, Math.PI * 2);
      ctx!.fill();

      // Rotating rings at different speeds/directions — the 360° effect.
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = baseRadius + (14 + i * 12) * scale + (state !== 'idle' ? level * 6 * scale : 0);
        const ringHue = (hue + i * 40) % 360;
        ctx!.strokeStyle = `hsla(${ringHue}, 85%, 60%, ${state === 'idle' ? 0.25 : 0.5})`;
        ctx!.lineWidth = 1.5 * scale;
        ctx!.beginPath();
        const start = angle * (0.3 + i * 0.15) * (i % 2 === 0 ? 1 : -1);
        ctx!.arc(cx, cy, ringRadius, start, start + Math.PI * 1.3);
        ctx!.stroke();
      }

      angle += state === 'speaking' ? 2.4 : state === 'listening' ? 1.6 : 0.6;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [state, level, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}
