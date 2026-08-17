import { useEffect, useRef, useState } from 'react';

interface Props {
  state: 'idle' | 'listening' | 'speaking';
}

// A glowing, rotating orb inspired by Jarvis-style assistant UIs and the
// voice-mode visualizers in ChatGPT/Gemini. Pure CSS + Canvas — no 3D engine
// or character assets, which genuinely aren't feasible to build here.
//
// Important: this deliberately does NOT grab the microphone itself for real
// audio levels. Doing that competes with the SpeechRecognition API for mic
// access at the same time, which broke voice input entirely on several
// Android devices. The pulse below is a smooth simulated animation instead —
// still lively and reactive-looking, just not tied to real mic hardware.
export default function VoiceOrb({ state }: Props) {
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
      // Layered sine waves read as more "alive" than a single steady pulse.
      const wave = Math.sin(t) * 0.5 + Math.sin(t * 2.3) * 0.3 + Math.sin(t * 0.7) * 0.2;
      setLevel(0.35 + Math.abs(wave) * 0.4);
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }, [state]);

  // Draw the rotating rings + core on canvas — smoother and cheaper than
  // animating many DOM nodes, especially on lower-end phones.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let angle = 0;
    let raf: number;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ef4444';

    function draw() {
      ctx!.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      const baseRadius = 34;
      const pulse = state === 'idle' ? Math.sin(angle / 25) * 3 : level * 22;
      const coreRadius = baseRadius + pulse;

      // Core glow
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 1.8);
      grad.addColorStop(0, color + 'cc');
      grad.addColorStop(1, color + '00');
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 1.8, 0, Math.PI * 2);
      ctx!.fill();

      // Solid core
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 0.55, 0, Math.PI * 2);
      ctx!.fill();

      // Rotating rings (the "360" effect)
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = baseRadius + 14 + i * 12 + (state !== 'idle' ? level * 6 : 0);
        ctx!.strokeStyle = color + (state === 'idle' ? '33' : '55');
        ctx!.lineWidth = 1.5;
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
  }, [state, level]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <canvas ref={canvasRef} style={{ width: 160, height: 160 }} />
      <p className="text-xs text-neutral-400">
        {state === 'listening' ? 'Listening…' : state === 'speaking' ? 'Speaking…' : ''}
      </p>
    </div>
  );
}
