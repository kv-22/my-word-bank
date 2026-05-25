import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadLexicon, searchWords, addWord, updateDefinition, WordEntry } from "@/lib/lexicon";
import { useAuth } from "@/contexts/AuthContext";
import UnifiedInput from "@/components/UnifiedInput";
import WordDisplay from "@/components/WordDisplay";
import WordBrowser from "@/components/WordBrowser";
import WordList from "@/components/WordList";
import GameSession from "@/components/GameSession";
import { List, BookOpen, LogOut, Play, Library, User } from "lucide-react";

type View = "idle" | "found" | "new-word" | "imprint" | "browse";
type AppMode = "lexicon" | "play";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [lexicon, setLexicon] = useState<WordEntry[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("idle");
  const [foundEntry, setFoundEntry] = useState<WordEntry | null>(null);
  const [matches, setMatches] = useState<WordEntry[]>([]);
  const [imprintEntry, setImprintEntry] = useState<WordEntry | null>(null);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [listMode, setListMode] = useState(false);
  const [listScrollTop, setListScrollTop] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>("lexicon");

  useEffect(() => {
    loadLexicon().then((entries) => {
      setLexicon(entries);
      setLoading(false);
      if (entries.length > 0) setView("browse");
    });
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setMatches([]);
        setView(lexicon.length > 0 ? "browse" : "idle");
        setFoundEntry(null);
        return;
      }
      const partialMatches = searchWords(lexicon, trimmed).slice(0, 8);
      setMatches(partialMatches);
      setFoundEntry(null);
      setView(partialMatches.length > 0 ? "browse" : "new-word");
    },
    [lexicon]
  );

  const handleSave = useCallback(
    async (word: string, definition: string) => {
      if (!user) return;
      const entry = await addWord(user.id, word, definition);
      if (!entry) return;

      setLexicon((prev) => [entry, ...prev.filter((e) => e.word.toLowerCase() !== word.toLowerCase())]);
      setMatches([]);
      setImprintEntry(entry);
      setView("imprint");
      setListMode(false);
      setTimeout(() => {
        setImprintEntry(null);
        setView("browse");
        setBrowseIndex(0);
      }, 2500);
    },
    [user]
  );

  const handleSelectFromList = (entry: WordEntry, scrollTop?: number) => {
    if (scrollTop !== undefined) {
      setListScrollTop(scrollTop);
    }
    setFoundEntry(entry);
    setMatches([]);
    setView("found");
    setQuery(entry.word);
    setListMode(false);
  };

  const handleEdit = useCallback(
    async (word: string, newDefinition: string) => {
      if (!user) return;
      const success = await updateDefinition(user.id, word, newDefinition);
      if (!success) return;

      setLexicon((prev) =>
        prev.map((e) =>
          e.word.toLowerCase() === word.toLowerCase()
            ? { ...e, definition: newDefinition }
            : e
        )
      );
      if (foundEntry && foundEntry.word.toLowerCase() === word.toLowerCase()) {
        setFoundEntry({ ...foundEntry, definition: newDefinition });
      }
    },
    [user, foundEntry]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-12 h-1 bg-primary/30 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background select-none">
      {/* Header with toggle and sign out */}
      <div className="flex justify-between items-center px-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={signOut}
          className="text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] p-2 rounded-md"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
        <div className="flex items-center gap-2">
          {lexicon.length > 0 && view !== "imprint" && view !== "found" && view !== "new-word" && (
            <button
              onClick={() => {
                setAppMode(appMode === "play" ? "lexicon" : "play");
                setQuery("");
                setMatches([]);
                setFoundEntry(null);
                if (view !== "browse") setView("browse");
              }}
              className="text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] p-2 rounded-md"
              aria-label={appMode === "play" ? "Lexicon mode" : "Play mode"}
            >
              {appMode === "play" ? <Library size={18} /> : <Play size={18} />}
            </button>
          )}
          {appMode === "lexicon" && lexicon.length > 0 && view !== "imprint" && view !== "found" && view !== "new-word" && (
            <button
              onClick={() => {
                if (listMode) setListScrollTop(0);
                setListMode(!listMode);
              }}
              className="text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] p-2 rounded-md"
              aria-label={listMode ? "Card view" : "List view"}
            >
              {listMode ? <BookOpen size={18} /> : <List size={18} />}
            </button>
          )}
          <button
            onClick={() => navigate("/profile")}
            className="text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] p-2 rounded-md"
            aria-label="Profile"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {appMode === "play" && (
        <GameSession onDone={() => setAppMode("lexicon")} />
      )}

      {/* Title - only shown when idle with empty lexicon */}
      {appMode === "lexicon" && view === "idle" && lexicon.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 px-6">
          <div className="w-16 h-1 bg-primary rounded-full mb-8" />
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-foreground text-center">
            My Word Bank
          </h1>
          <p className="mt-4 font-body tracking-ui text-secondary">
            Your personal lexicon
          </p>
          <div className="w-16 h-1 bg-primary/30 rounded-full mt-8" />
        </div>
      )}

      {/* Found word display */}
      {appMode === "lexicon" && view === "found" && foundEntry && (
        <div className="flex items-center justify-center flex-1 relative">
          <button
            onClick={() => {
              setView("browse");
              setQuery("");
              setMatches([]);
              setFoundEntry(null);
              setListMode(true);
            }}
            className="absolute top-4 left-6 font-body tracking-ui text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] rounded-sm px-1 -mx-1"
          >
            ← Back
          </button>
          <WordDisplay entry={foundEntry} onEdit={handleEdit} />
        </div>
      )}

      {/* New word */}
      {appMode === "lexicon" && view === "new-word" && (
        <div className="flex items-center justify-center flex-1 px-6">
          <p className="font-display text-3xl sm:text-5xl text-foreground/20 text-center">
            {query || "…"}
          </p>
        </div>
      )}

      {/* Imprint moment */}
      {appMode === "lexicon" && view === "imprint" && imprintEntry && (
        <div className="flex items-center justify-center flex-1">
          <WordDisplay entry={imprintEntry} isNew />
        </div>
      )}

      {/* Browse mode */}
      {appMode === "lexicon" && view === "browse" && !listMode && (
        <WordBrowser
          entries={lexicon}
          currentIndex={browseIndex}
          onNavigate={setBrowseIndex}
          onEdit={handleEdit}
        />
      )}

      {appMode === "lexicon" && view === "browse" && listMode && (
        <WordList
          entries={lexicon}
          onSelect={handleSelectFromList}
          scrollTop={listScrollTop}
        />
      )}

      {/* Unified input */}
      {appMode === "lexicon" && view !== "imprint" && (
        <UnifiedInput
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          onSave={handleSave}
          matches={matches}
          onSelectMatch={handleSelectFromList}
          showDefinitionInput={view === "new-word"}
          wordFound={view === "found"}
        />
      )}
    </div>
  );
};

export default Index;
