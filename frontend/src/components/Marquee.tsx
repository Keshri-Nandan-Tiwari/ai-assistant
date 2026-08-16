interface Props {
  items: string[];
  className?: string;
}

// Seamless infinite horizontal scroll — duplicates the content once so the
// CSS animation can loop from -50% back to 0% with no visible seam/jump.
export default function Marquee({ items, className }: Props) {
  const content = (
    <>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-3 shrink-0">
          <span className="text-sm md:text-base font-medium whitespace-nowrap">{item}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
        </span>
      ))}
    </>
  );

  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <div className="flex items-center gap-8 w-max animate-marquee">
        {content}
        {content}
      </div>
    </div>
  );
}
