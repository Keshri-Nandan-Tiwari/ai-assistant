import { useEffect, useState } from 'react';

interface Props {
  phrases: string[];
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  pauseMs?: number;
  className?: string;
}

// Classic "type it out, pause, delete, move to next phrase" effect —
// pure CSS/JS, no animation library needed, so it stays lightweight.
export default function Typewriter({
  phrases,
  typingSpeedMs = 55,
  deletingSpeedMs = 30,
  pauseMs = 1400,
  className,
}: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex % phrases.length];

    if (!deleting && charCount === current.length) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }

    if (deleting && charCount === 0) {
      setDeleting(false);
      setPhraseIndex((i) => i + 1);
      return;
    }

    const t = setTimeout(
      () => setCharCount((c) => c + (deleting ? -1 : 1)),
      deleting ? deletingSpeedMs : typingSpeedMs
    );
    return () => clearTimeout(t);
  }, [charCount, deleting, phraseIndex, phrases, typingSpeedMs, deletingSpeedMs, pauseMs]);

  const current = phrases[phraseIndex % phrases.length];

  return (
    <span className={className}>
      {current.slice(0, charCount)}
      <span className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 align-middle animate-blink" />
    </span>
  );
}
