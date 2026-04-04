import { useState, useEffect } from "react";
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
      <h1
        className={`font-display text-5xl sm:text-7xl md:text-8xl font-bold text-foreground leading-tight ${
          isNew ? "animate-ink-soak" : ""
        }`}
      >
        {entry.word}
      </h1>

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
        <div className={`mt-6 w-full max-w-lg ${isNew ? "animate-fade-in-slow" : ""}`}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            className="w-full bg-transparent font-body text-base text-foreground text-center border-b border-border focus:border-accent focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-center gap-6 mt-4">
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
