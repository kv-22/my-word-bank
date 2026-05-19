import { useState } from "react";
import { WordEntry } from "@/lib/lexicon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnifiedInputProps {
  onSearch: (query: string) => void;
  onSave: (word: string, definition: string) => void;
  matches: WordEntry[];
  onSelectMatch: (entry: WordEntry) => void;
  showDefinitionInput: boolean;
  wordFound: boolean;
  query: string;
  setQuery: (q: string) => void;
}

export default function UnifiedInput({
  onSearch,
  onSave,
  matches,
  onSelectMatch,
  showDefinitionInput,
  wordFound,
  query,
  setQuery,
}: UnifiedInputProps) {
  const [definition, setDefinition] = useState("");
  const [confirmNoDefOpen, setConfirmNoDefOpen] = useState(false);
  const [pendingWord, setPendingWord] = useState("");
  // No auto-focus on definition input — user navigates manually

  const handleInputChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const finishSave = (word: string, def: string) => {
    onSave(word, def);
    setDefinition("");
    setQuery("");
    setPendingWord("");
    setConfirmNoDefOpen(false);
  };

  const handleSave = () => {
    const trimmedWord = query.trim();
    if (!trimmedWord) return;
    const trimmedDef = definition.trim();
    if (trimmedDef) {
      finishSave(trimmedWord, trimmedDef);
      return;
    }
    setPendingWord(trimmedWord);
    setConfirmNoDefOpen(true);
  };

  const handleConfirmSaveWithoutDef = () => {
    if (!pendingWord) {
      setConfirmNoDefOpen(false);
      return;
    }
    finishSave(pendingWord, "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && showDefinitionInput) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="w-full border-t border-border bg-background">
      <AlertDialog
        open={confirmNoDefOpen}
        onOpenChange={(open) => {
          setConfirmNoDefOpen(open);
          if (!open) setPendingWord("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save without a definition?</AlertDialogTitle>
            <AlertDialogDescription>
              You can add one later from your lexicon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body tracking-ui">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSaveWithoutDef}
              className="font-body tracking-ui"
            >
              Save word
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showDefinitionInput && (
        <div className="px-6 pt-5 pb-3 transition-all duration-300">
          <label className="font-body tracking-ui text-muted-foreground mb-2 block">
            Definition
          </label>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What does this word mean to you?"
            rows={3}
            className="w-full bg-transparent font-body text-base text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none leading-relaxed"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSave}
              disabled={!query.trim()}
              className="font-body tracking-ui text-accent disabled:text-muted-foreground/30 transition-[color,opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-[0.98] disabled:active:scale-100 rounded-sm px-1 -mx-1"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center px-6 py-5">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type a word"
          className="flex-1 bg-transparent font-display text-2xl sm:text-3xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none caret-accent"
        />
        {query.trim() && !showDefinitionInput && !wordFound && matches.length === 0 && (
          <span className="font-body tracking-ui text-muted-foreground ml-4 shrink-0">
            Not in lexicon
          </span>
        )}
      </div>
      {query.trim() && !showDefinitionInput && !wordFound && matches.length > 0 && (
        <div className="px-6 pb-4">
          <div className="border border-border rounded-md bg-card/40 overflow-hidden">
            {matches.map((entry) => (
              <button
                key={entry.word}
                type="button"
                onClick={() => onSelectMatch(entry)}
                className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-card transition-[background-color,transform] duration-150 ease-out active:scale-[0.995] active:bg-muted/40"
              >
                <span className="block font-display text-lg text-foreground">{entry.word}</span>
                <span
                  className={`block font-body text-sm mt-0.5 line-clamp-1 ${
                    entry.definition.trim()
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60 italic"
                  }`}
                >
                  {entry.definition.trim() ? entry.definition : "No definition yet"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
