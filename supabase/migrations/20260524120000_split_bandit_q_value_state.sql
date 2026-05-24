ALTER TABLE public.bandit_q_values
  ADD COLUMN wrong_streak BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN correct_streak BOOLEAN NOT NULL DEFAULT false;

UPDATE public.bandit_q_values
SET
  wrong_streak = state_key LIKE '%wrong:true%',
  correct_streak = state_key LIKE '%correct:true%';

ALTER TABLE public.bandit_q_values
  DROP CONSTRAINT IF EXISTS bandit_q_values_user_id_word_id_state_key_key;

ALTER TABLE public.bandit_q_values
  DROP COLUMN state_key;

ALTER TABLE public.bandit_q_values
  ADD CONSTRAINT bandit_q_values_user_word_state_key
  UNIQUE (user_id, word_id, wrong_streak, correct_streak);
