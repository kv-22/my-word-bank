-- Ensure one word per user for upsert operations
-- First, remove any accidental duplicates while keeping the newest row
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, word
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.words
)
DELETE FROM public.words w
USING ranked r
WHERE w.id = r.id
  AND r.rn > 1;

-- Add the unique constraint required by onConflict: "user_id,word"
ALTER TABLE public.words
ADD CONSTRAINT words_user_id_word_key UNIQUE (user_id, word);