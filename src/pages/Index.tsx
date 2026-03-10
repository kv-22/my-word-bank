import { useState, useCallback, useEffect } from "react";
import { loadLexicon, findWord, addWord, WordEntry } from "@/lib/lexicon";
import UnifiedInput from "@/components/UnifiedInput";
import WordDisplay from "@/components/WordDisplay";
import WordBrowser from "@/components/WordBrowser";

type View = "idle" | "found" | "new-word" | "imprint" | "browse";

const Index = () => {
  const [lexicon, setLexicon] = useState<WordEntry[]>(() => loadLexicon());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("idle");
  const [foundEntry, setFoundEntry] = useState<WordEntry | null>(null);
  const [imprintEntry, setImprintEntry] = useState<WordEntry | null>(null);
  const [browseIndex, setBrowseIndex] = useState(0);

  // Start in browse mode if lexicon has entries
  useEffect(() => {
    if (lexicon.length > 0 && view === "idle" && !query.trim()) {
      setView("browse");
    }
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setView(lexicon.length > 0 ? "browse" : "idle");
        setFoundEntry(null);
        return;
      }
      const found = findWord(lexicon, trimmed);
      if (found) {
        setFoundEntry(found);
        setView("found");
      } else {
        setFoundEntry(null);
        setView("new-word");
      }
    },
    [lexicon]
  );

  const handleSave = useCallback(
    (word: string, definition: string) => {
      const entry: WordEntry = {
        word,
        definition,
        createdAt: Date.now(),
      };
      const updated = addWord(lexicon, entry);
      setLexicon(updated);
      setImprintEntry(entry);
      setView("imprint");
      // Return to browse after the imprint moment
      setTimeout(() => {
        setImprintEntry(null);
        setView("browse");
        setBrowseIndex(0);
      }, 2500);
    },
    [lexicon]
  );

  return (
    <div className="flex flex-col h-screen bg-background select-none">
      {/* Title - only shown when idle with empty lexicon */}
      {view === "idle" && lexicon.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 px-6">
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-foreground text-center">
            Ostracon
          </h1>
          <p className="mt-4 font-body tracking-ui text-muted-foreground">
            Your personal lexicon
          </p>
        </div>
      )}

      {/* Found word display */}
      {view === "found" && foundEntry && (
        <div className="flex items-center justify-center flex-1">
          <WordDisplay entry={foundEntry} />
        </div>
      )}

      {/* New word — definition input visible */}
      {view === "new-word" && (
        <div className="flex items-center justify-center flex-1 px-6">
          <p className="font-display text-3xl sm:text-5xl text-foreground/20 text-center">
            {query || "…"}
          </p>
        </div>
      )}

      {/* Imprint moment */}
      {view === "imprint" && imprintEntry && (
        <div className="flex items-center justify-center flex-1">
          <WordDisplay entry={imprintEntry} isNew />
        </div>
      )}

      {/* Browse mode */}
      {view === "browse" && (
        <WordBrowser
          entries={lexicon}
          currentIndex={browseIndex}
          onNavigate={setBrowseIndex}
        />
      )}

      {/* Unified input — hidden during imprint */}
      {view !== "imprint" && (
        <UnifiedInput
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          onSave={handleSave}
          showDefinitionInput={view === "new-word"}
          wordFound={view === "found"}
        />
      )}
    </div>
  );
};

export default Index;
