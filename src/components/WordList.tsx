import { useRef, useLayoutEffect } from "react";
import { WordEntry } from "@/lib/lexicon";

interface WordListProps {
  entries: WordEntry[];
  onSelect: (entry: WordEntry, scrollTop: number) => void;
  scrollTop?: number;
}

export default function WordList({
  entries,
  onSelect,
  scrollTop: savedScrollTop = 0,
}: WordListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = savedScrollTop;
  }, [savedScrollTop]);
  const sorted = [...entries].sort((a, b) =>
    a.word.toLowerCase().localeCompare(b.word.toLowerCase())
  );

  // Group by first letter
  const groups: Record<string, WordEntry[]> = {};
  sorted.forEach((entry) => {
    const letter = entry.word[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(entry);
  });

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-8">
      {Object.entries(groups).map(([letter, words]) => (
        <div key={letter} className="mb-8">
          <h2 className="font-display text-3xl font-bold text-primary/30 mb-4">
            {letter}
          </h2>
          {words.map((entry) => (
            <button
              key={entry.word}
              onClick={() =>
                onSelect(entry, containerRef.current?.scrollTop ?? 0)
              }
              className="block w-full text-left py-3 border-b border-border last:border-b-0 group hover:bg-card rounded-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.995] active:bg-muted/40 px-2 -mx-2"
            >
              <span className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                {entry.word}
              </span>
              <span
                className={`block font-body text-sm mt-1 leading-relaxed ${
                  entry.definition.trim() ? "text-muted-foreground" : "text-muted-foreground/60 italic"
                }`}
              >
                {entry.definition.trim() ? entry.definition : "No definition yet"}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
