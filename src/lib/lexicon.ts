import { supabase } from "@/integrations/supabase/client";

export interface WordEntry {
  id?: string;
  word: string;
  definition: string;
  partOfSpeech?: string;
  createdAt: number;
}

function rowToEntry(row: any): WordEntry {
  return {
    id: row.id,
    word: row.word,
    definition: row.definition,
    partOfSpeech: row.part_of_speech ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function loadLexicon(): Promise<WordEntry[]> {
  const { data, error } = await supabase
    .from("words")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load lexicon:", error);
    return [];
  }
  return (data || []).map(rowToEntry);
}

export async function addWord(userId: string, word: string, definition: string): Promise<WordEntry | null> {
  const { data, error } = await supabase
    .from("words")
    .upsert(
      { user_id: userId, word, definition },
      { onConflict: "user_id,word" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to add word:", error);
    return null;
  }
  return rowToEntry(data);
}

export async function updateDefinition(userId: string, word: string, newDefinition: string): Promise<boolean> {
  const { error } = await supabase
    .from("words")
    .update({ definition: newDefinition })
    .eq("user_id", userId)
    .ilike("word", word);

  if (error) {
    console.error("Failed to update definition:", error);
    return false;
  }
  return true;
}

export async function deleteWord(userId: string, word: string): Promise<boolean> {
  const { error } = await supabase
    .from("words")
    .delete()
    .eq("user_id", userId)
    .ilike("word", word);

  if (error) {
    console.error("Failed to delete word:", error);
    return false;
  }
  return true;
}

export function findWord(entries: WordEntry[], query: string): WordEntry | undefined {
  const q = query.trim().toLowerCase();
  return entries.find((e) => e.word.toLowerCase() === q);
}

export function searchWords(entries: WordEntry[], query: string): WordEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries.filter((e) => e.word.toLowerCase().includes(q));
}
