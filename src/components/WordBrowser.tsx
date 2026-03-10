import { WordEntry } from "@/lib/lexicon";
import WordDisplay from "./WordDisplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WordBrowserProps {
  entries: WordEntry[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onEdit?: (word: string, newDefinition: string) => void;
}

export default function WordBrowser({ entries, currentIndex, onNavigate, onEdit }: WordBrowserProps) {
  if (entries.length === 0) return null;

  const entry = entries[currentIndex];
  if (!entry) return null;

  return (
    <div className="flex items-center justify-center flex-1 relative">
      {entries.length > 1 && (
        <button
          onClick={() => onNavigate(currentIndex - 1 < 0 ? entries.length - 1 : currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous word"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <WordDisplay entry={entry} />

      {entries.length > 1 && (
        <button
          onClick={() => onNavigate((currentIndex + 1) % entries.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next word"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div className="absolute bottom-4 font-body tracking-ui text-muted-foreground">
        {currentIndex + 1} / {entries.length}
      </div>
    </div>
  );
}
