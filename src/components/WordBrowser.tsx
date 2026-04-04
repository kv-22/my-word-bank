import { useRef } from "react";
import { WordEntry } from "@/lib/lexicon";
import WordDisplay from "./WordDisplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WordBrowserProps {
  entries: WordEntry[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onEdit?: (word: string, newDefinition: string) => void;
}

const SWIPE_MIN_PX = 48;
/** Require horizontal movement to dominate vertical (avoid scrolling being read as swipe). */
const HORIZONTAL_DOMINANCE = 1.35;

export default function WordBrowser({ entries, currentIndex, onNavigate, onEdit }: WordBrowserProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (entries.length === 0) return null;

  const entry = entries[currentIndex];
  if (!entry) return null;

  const goPrev = () =>
    onNavigate(currentIndex - 1 < 0 ? entries.length - 1 : currentIndex - 1);
  const goNext = () => onNavigate((currentIndex + 1) % entries.length);

  const onTouchStart = (e: React.TouchEvent) => {
    if (entries.length <= 1) return;
    const t = e.targetTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (entries.length <= 1 || !touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE) return;

    if (dx < 0) goNext();
    else goPrev();
  };

  const onTouchCancel = () => {
    touchStart.current = null;
  };

  return (
    <div
      className="flex items-center justify-center flex-1 relative touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {entries.length > 1 && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] rounded-md p-1"
          aria-label="Previous word"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <WordDisplay entry={entry} onEdit={onEdit} />

      {entries.length > 1 && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] rounded-md p-1"
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
