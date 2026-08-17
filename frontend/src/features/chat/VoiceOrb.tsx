import { useEffect, useRef, useState } from 'react';

interface Props {
  state: 'idle' | 'listening' | 'speaking';
}

// A glowing, audio-reactive orb inspired by Jarvis-style assistant UIs and
// the voice-mode visualizers in ChatGPT/Gemini. Pure CSS + Canvas — no 3D
// engine or character assets, which genuinely aren't feasible to build here,
// but this still reacts live to real microphone volume, not just a loop.
export default function VoiceOrb({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(0); // 0..1 live volume while listening
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  // Sample real microphone volume while listening, so the orb genuinely
  // reacts to how loudly the person is talking, not a canned animation.
  useEffect(() => {
    if (state !== 'listening') {
      setLevel(0);
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(s);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(1, avg / 90));
          rafRef.current = requestAnimationFrame(tick);
        }
        tick();
      })
      .catch(() => {
        // Mic access denied/unavailable — fall back to a gentle idle pulse
        // rather than breaking the visual entirely.
        setLevel(0.3);
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
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
