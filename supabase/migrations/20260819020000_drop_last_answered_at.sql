-- Remove the obsolete answer timestamp from persisted per-word statistics.
-- This is a follow-up migration because the earlier migration version may
-- already have been recorded before its corresponding DROP COLUMN was added.
ALTER TABLE public.bandit_word_stats
  DROP COLUMN IF EXISTS last_answered_at;
