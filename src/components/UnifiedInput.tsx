import { useState, useRef, useEffect } from "react";

interface UnifiedInputProps {
  onSearch: (query: string) => void;
  onSave: (word: string, definition: string) => void;
  showDefinitionInput: boolean;
  query: string;
  setQuery: (q: string) => void;
}

export default function UnifiedInput({
  onSearch,
  onSave,
  showDefinitionInput,
  query,
  setQuery,
}: UnifiedInputProps) {
  const [definition, setDefinition] = useState("");
  const defRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showDefinitionInput && defRef.current) {
      defRef.current.focus();
    }
  }, [showDefinitionInput]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleSave = () => {
    const trimmedWord = query.trim();
    const trimmedDef = definition.trim();
    if (!trimmedWord || !trimmedDef) return;
    onSave(trimmedWord, trimmedDef);
    setDefinition("");
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && showDefinitionInput) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="w-full border-t border-border bg-background">
      {showDefinitionInput && (
        <div className="px-6 pt-5 pb-3 transition-all duration-300">
          <label className="font-body tracking-ui text-muted-foreground mb-2 block">
            Definition
          </label>
          <textarea
            ref={defRef}
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
              disabled={!definition.trim()}
              className="font-body tracking-ui text-accent disabled:text-muted-foreground/30 transition-colors hover:opacity-80"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center px-6 py-5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type a word"
          className="flex-1 bg-transparent font-display text-2xl sm:text-3xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none caret-accent"
        />
        {query.trim() && !showDefinitionInput && (
          <span className="font-body tracking-ui text-muted-foreground ml-4 shrink-0">
            Not in lexicon
          </span>
        )}
      </div>
    </div>
  );
}
