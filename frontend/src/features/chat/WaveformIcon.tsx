interface Props {
  size?: number;
  className?: string;
}

// A clean, minimal white-circle + black-waveform-bars icon — the trigger
// button look. The rich animated colorful orb lives inside Voice Mode itself
// once opened; this is just the small "launch it" icon.
export default function WaveformIcon({ size = 26, className }: Props) {
  // 7 bars, center tallest, tapering symmetrically toward both edges.
  const heights = [5, 8, 12, 16, 12, 8, 5];
  const barWidth = 1.6;
  const gap = 1.5;
  const totalWidth = heights.length * barWidth + (heights.length - 1) * gap;
  const startX = (24 - totalWidth) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-label="Voice mode"
    >
      <circle cx="12" cy="12" r="12" fill="#ffffff" />
      {heights.map((h, i) => {
        const x = startX + i * (barWidth + gap);
        const y = 12 - h / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={barWidth / 2}
            fill="#111111"
          />
        );
      })}
    </svg>
  );
}
