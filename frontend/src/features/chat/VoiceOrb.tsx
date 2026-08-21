import { useEffect, useRef, useState } from 'react';

interface Props {
  state: 'idle' | 'listening' | 'speaking';
  size?: number; // px — lets it be used compact (next to the mic) or large (full screen)
  interactive?: boolean; // enable mouse/touch-reactive tilt (only makes sense for the large version)
}

// Distinct, named color phases — deliberately a hard shift between named
// colors (not a slow continuous rainbow), holding each for a few seconds,
// per the "completely change its color" request.
const COLOR_PHASES = [40, 210, 190, 140, 270, 300, 0, 25]; // gold, blue, cyan, green, violet, magenta, red, orange
const PHASE_HOLD_MS = 3200;
const PHASE_TRANSITION_MS = 1400;

interface Particle {
  radius: number;
  angle: number;
  speed: number;
  size: number;
}

// Shortest-path hue interpolation so colors don't spin the "long way" round.
function lerpHue(a: number, b: number, t: number) {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (a + diff * t + 360) % 360;
}

export default function VoiceOrb({ state, size = 160, interactive = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState(0);
  const tiltRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 26 }, () => ({
        radius: 46 + Math.random() * 34,
        angle: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.018,
        size: 0.8 + Math.random() * 1.6,
      }));
    }
  }, []);

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

  // Mouse/touch-reactive tilt — the orb subtly leans toward the pointer.
  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;

    function handlePointer(clientX: number, clientY: number) {
      const rect = el!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (clientX - cx) / (window.innerWidth / 2);
      const dy = (clientY - cy) / (window.innerHeight / 2);
      tiltRef.current = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
      if (el) {
        el.style.transform = `rotateY(${tiltRef.current.x * 8}deg) rotateX(${-tiltRef.current.y * 8}deg)`;
      }
    }
    const onMouseMove = (e: MouseEvent) => handlePointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [interactive]);

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
    let phaseIndex = 0;
    let phaseElapsed = 0;
    let lastTime = performance.now();
    let raf: number;

    function draw(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      phaseElapsed += dt * (state === 'speaking' ? 2.2 : state === 'listening' ? 1.4 : 1);

      // Discrete color-phase cycling: hold, then hard-transition to the next.
      let hue: number;
      if (phaseElapsed < PHASE_HOLD_MS) {
        hue = COLOR_PHASES[phaseIndex];
      } else if (phaseElapsed < PHASE_HOLD_MS + PHASE_TRANSITION_MS) {
        const t = (phaseElapsed - PHASE_HOLD_MS) / PHASE_TRANSITION_MS;
        const nextIndex = (phaseIndex + 1) % COLOR_PHASES.length;
        hue = lerpHue(COLOR_PHASES[phaseIndex], COLOR_PHASES[nextIndex], t);
      } else {
        phaseIndex = (phaseIndex + 1) % COLOR_PHASES.length;
        phaseElapsed = 0;
        hue = COLOR_PHASES[phaseIndex];
      }

      ctx!.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const scale = size / 160;
      const color = `hsl(${hue}, 88%, 58%)`;

      const baseRadius = 34 * scale;
      const breathe = state === 'speaking' ? Math.sin(angle / 6) * 14 * scale : 0;
      const pulse = state === 'idle' ? Math.sin(angle / 25) * 3 * scale : level * 20 * scale;
      const coreRadius = Math.max(8 * scale, baseRadius + pulse - Math.abs(breathe) * 1.4);

      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 1.8);
      grad.addColorStop(0, color);
      grad.addColorStop(1, `hsla(${hue}, 88%, 58%, 0)`);
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 1.8, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius * 0.55, 0, Math.PI * 2);
      ctx!.fill();

      // Orbiting particles for a richer, "alive" feel.
      for (const p of particlesRef.current) {
        p.angle += p.speed * (state === 'speaking' ? 1.8 : 1);
        const px = cx + Math.cos(p.angle) * p.radius * scale;
        const py = cy + Math.sin(p.angle) * p.radius * scale * 0.55; // slightly flattened for a 3D-ish orbit
        ctx!.fillStyle = `hsla(${hue}, 90%, 70%, 0.8)`;
        ctx!.beginPath();
        ctx!.arc(px, py, p.size * scale, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Rotating rings at different speeds/directions — the 360° effect.
      const ringCount = 4;
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = baseRadius + (14 + i * 11) * scale + (state !== 'idle' ? level * 6 * scale : 0);
        const ringHue = (hue + i * 22) % 360;
        ctx!.strokeStyle = `hsla(${ringHue}, 85%, 62%, ${state === 'idle' ? 0.22 : 0.45})`;
        ctx!.lineWidth = 1.4 * scale;
        ctx!.beginPath();
        const start = angle * (0.3 + i * 0.13) * (i % 2 === 0 ? 1 : -1);
        ctx!.arc(cx, cy, ringRadius, start, start + Math.PI * 1.3);
        ctx!.stroke();
      }

      angle += state === 'speaking' ? 2.4 : state === 'listening' ? 1.6 : 0.6;
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [state, level, size]);

  return (
    <div ref={containerRef} style={{ width: size, height: size, transition: 'transform 0.15s ease-out' }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
}
