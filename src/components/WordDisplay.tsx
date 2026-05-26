import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { WordEntry } from "@/lib/lexicon";
import { Pencil } from "lucide-react";

interface WordDisplayProps {
  entry: WordEntry;
  isNew?: boolean;
  onEdit?: (word: string, newDefinition: string) => void;
}

export default function WordDisplay({ entry, isNew, onEdit }: WordDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.definition);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    if (!editing) return;
    syncTextareaHeight();
  }, [editing, draft]);

  useEffect(() => {
    setDraft(entry.definition);
    setEditing(false);
  }, [entry.word]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed || !onEdit) return;
    onEdit(entry.word, trimmed);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(entry.definition);
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-1 bg-primary/30 rounded-full mb-6" />
      <h2
        className={`font-display text-5xl sm:text-7xl md:text-8xl font-bold text-foreground leading-tight ${
          isNew ? "animate-ink-soak" : ""
        }`}
      >
        {entry.word}
      </h2>

      {entry.partOfSpeech && (
        <span
          className={`mt-4 font-body tracking-ui text-muted-foreground ${
            isNew ? "animate-fade-in-slow" : ""
          }`}
        >
          {entry.partOfSpeech}
        </span>
      )}

      {editing ? (
        <div
          className={`mt-6 w-full max-w-lg flex flex-col items-center ${isNew ? "animate-fade-in-slow" : ""}`}
        >
          {/* column-reverse: underline stays by the actions; extra lines grow upward */}
          <div className="flex w-full flex-col-reverse items-stretch gap-3">
            <div className="flex justify-center gap-6">
              <button
                onClick={handleCancel}
                className="font-body tracking-ui text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] rounded-sm px-1 -mx-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.trim()}
                className="font-body tracking-ui text-accent disabled:text-muted-foreground/30 transition-[color,transform] duration-150 ease-out active:scale-[0.98] disabled:active:scale-100 rounded-sm px-1 -mx-1"
              >
                Save
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              autoFocus
              aria-label="Edit definition"
              className="w-full min-h-0 max-h-[min(50vh,14rem)] overflow-y-auto bg-transparent font-body text-base text-foreground text-center border-b border-border focus:border-accent focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>
      ) : (
        <div className={`mt-6 relative group ${isNew ? "animate-fade-in-slow" : ""}`}>
          <p
            className={`font-body text-base sm:text-lg max-w-lg leading-relaxed ${
              entry.definition.trim()
                ? "text-foreground/80"
                : "text-muted-foreground italic"
            }`}
          >
            {entry.definition.trim() ? entry.definition : "No definition yet"}
          </p>
          {onEdit && !isNew && (
            <button
              onClick={() => setEditing(true)}
              className="mt-3 inline-flex items-center gap-1.5 font-body tracking-ui text-secondary hover:text-primary transition-[color,transform] duration-150 ease-out active:scale-[0.98] rounded-sm px-1 -mx-1"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>
      )}

      <time
        className={`mt-8 font-body tracking-ui text-muted-foreground ${
          isNew ? "animate-fade-in-slow" : ""
        }`}
      >
        {new Date(entry.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
    </div>
  );
}
