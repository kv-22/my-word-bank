export interface WordEntry {
  word: string;
  definition: string;
  partOfSpeech?: string;
  createdAt: number;
}

const STORAGE_KEY = 'ostracon-lexicon';

export function loadLexicon(): WordEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLexicon(entries: WordEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function findWord(entries: WordEntry[], query: string): WordEntry | undefined {
  const q = query.trim().toLowerCase();
  return entries.find(e => e.word.toLowerCase() === q);
}

export function searchWords(entries: WordEntry[], query: string): WordEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries.filter(e => e.word.toLowerCase().includes(q));
}

export function addWord(entries: WordEntry[], entry: WordEntry): WordEntry[] {
  const updated = [entry, ...entries.filter(e => e.word.toLowerCase() !== entry.word.toLowerCase())];
  saveLexicon(updated);
  return updated;
}

export function updateDefinition(entries: WordEntry[], word: string, newDefinition: string): WordEntry[] {
  const updated = entries.map(e =>
    e.word.toLowerCase() === word.toLowerCase() ? { ...e, definition: newDefinition } : e
  );
  saveLexicon(updated);
  return updated;
}

export function deleteWord(entries: WordEntry[], word: string): WordEntry[] {
  const updated = entries.filter(e => e.word.toLowerCase() !== word.toLowerCase());
  saveLexicon(updated);
  return updated;
}
