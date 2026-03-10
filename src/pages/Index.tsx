import { useState, useCallback, useEffect } from "react";
import { loadLexicon, findWord, addWord, updateDefinition, WordEntry } from "@/lib/lexicon";
import UnifiedInput from "@/components/UnifiedInput";
import WordDisplay from "@/components/WordDisplay";
import WordBrowser from "@/components/WordBrowser";
import WordList from "@/components/WordList";
import { List, BookOpen } from "lucide-react";

type View = "idle" | "found" | "new-word" | "imprint" | "browse";

const Index = () => {
  const [lexicon, setLexicon] = useState<WordEntry[]>(() => loadLexicon());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("idle");
  const [foundEntry, setFoundEntry] = useState<WordEntry | null>(null);
  const [imprintEntry, setImprintEntry] = useState<WordEntry | null>(null);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [listMode, setListMode] = useState(false);

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
      setListMode(false);
      setTimeout(() => {
        setImprintEntry(null);
        setView("browse");
        setBrowseIndex(0);
      }, 2500);
    },
    [lexicon]
  );

  const handleSelectFromList = (entry: WordEntry) => {
    setFoundEntry(entry);
    setView("found");
    setQuery(entry.word);
    setListMode(false);
  };

  const handleEdit = useCallback(
    (word: string, newDefinition: string) => {
      const updated = updateDefinition(lexicon, word, newDefinition);
      setLexicon(updated);
      // Update foundEntry if currently viewing it
      if (foundEntry && foundEntry.word.toLowerCase() === word.toLowerCase()) {
        setFoundEntry({ ...foundEntry, definition: newDefinition });
      }
    },
    [lexicon, foundEntry]
  );

  const showToggle = view === "browse" && lexicon.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background select-none">
      {/* Toggle button */}
      {lexicon.length > 0 && view !== "imprint" && view !== "found" && view !== "new-word" && (
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={() => setListMode(!listMode)}
            className="text-muted-foreground hover:text-foreground transition-colors p-2"
            aria-label={listMode ? "Card view" : "List view"}
          >
            {listMode ? <BookOpen size={18} /> : <List size={18} />}
          </button>
        </div>
      )}

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
        <div className="flex items-center justify-center flex-1 relative">
          <button
            onClick={() => {
              setView("browse");
              setQuery("");
              setFoundEntry(null);
              setListMode(true);
            }}
            className="absolute top-4 left-6 font-body tracking-ui text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
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

      {/* Browse mode - card or list */}
      {view === "browse" && !listMode && (
        <WordBrowser
          entries={lexicon}
          currentIndex={browseIndex}
          onNavigate={setBrowseIndex}
        />
      )}

      {view === "browse" && listMode && (
        <WordList entries={lexicon} onSelect={handleSelectFromList} />
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
