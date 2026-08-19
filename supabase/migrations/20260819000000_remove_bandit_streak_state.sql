-- The bandit now keeps one Q-value per user-word. Correct streaks remain
-- session-only UI state and are not part of the persisted bandit state.

-- Remove the previous RPC overload, whose signature included streak flags.
DROP FUNCTION IF EXISTS public.record_bandit_answer(
  UUID,
  UUID,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  BOOLEAN,
  BOOLEAN,
  INTEGER,
  INTEGER,
  INTEGER,
  BOOLEAN,
  TIMESTAMP WITH TIME ZONE
);

-- Retain the most recently updated value if this migration encounters data
-- created under more than one streak state.
WITH ranked_q_values AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, word_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM public.bandit_q_values
)
DELETE FROM public.bandit_q_values
WHERE id IN (
  SELECT id
  FROM ranked_q_values
  WHERE row_number > 1
);

ALTER TABLE public.bandit_q_values
  DROP CONSTRAINT IF EXISTS bandit_q_values_user_word_state_key;

ALTER TABLE public.bandit_q_values
  DROP COLUMN IF EXISTS wrong_streak,
  DROP COLUMN IF EXISTS correct_streak;

ALTER TABLE public.bandit_word_stats
  DROP COLUMN IF EXISTS last_answered_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bandit_q_values'::regclass
      AND conname = 'bandit_q_values_user_word_key'
  ) THEN
    ALTER TABLE public.bandit_q_values
      ADD CONSTRAINT bandit_q_values_user_word_key
      UNIQUE (user_id, word_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_bandit_answer(
  p_word_id UUID,
  p_session_id UUID,
  p_reward DOUBLE PRECISION,
  p_q_value DOUBLE PRECISION,
  p_times_selected INTEGER,
  p_times_correct INTEGER,
  p_times_wrong INTEGER,
  p_last_result BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prev_selected INTEGER := 0;
  v_prev_correct INTEGER := 0;
  v_prev_wrong INTEGER := 0;
  v_next_selected INTEGER;
  v_next_correct INTEGER;
  v_next_wrong INTEGER;
  v_word_owned BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.words
    WHERE id = p_word_id
      AND user_id = v_user_id
  )
  INTO v_word_owned;

  IF NOT v_word_owned THEN
    RAISE EXCEPTION 'Word does not belong to caller' USING ERRCODE = '42501';
  END IF;

  IF p_last_result IS NULL THEN
    RAISE EXCEPTION 'Answer result is required' USING ERRCODE = '22004';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(v_user_id::TEXT),
    hashtext(p_word_id::TEXT)
  );

  SELECT times_selected, times_correct, times_wrong
    INTO v_prev_selected, v_prev_correct, v_prev_wrong
  FROM public.bandit_word_stats
  WHERE user_id = v_user_id
    AND word_id = p_word_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prev_selected := 0;
    v_prev_correct := 0;
    v_prev_wrong := 0;
  END IF;

  v_next_selected := v_prev_selected + 1;
  v_next_correct := v_prev_correct + CASE WHEN p_last_result THEN 1 ELSE 0 END;
  v_next_wrong := v_prev_wrong + CASE WHEN p_last_result THEN 0 ELSE 1 END;

  IF p_times_selected IS DISTINCT FROM v_next_selected
     OR p_times_correct IS DISTINCT FROM v_next_correct
     OR p_times_wrong IS DISTINCT FROM v_next_wrong
  THEN
    RAISE EXCEPTION 'Invalid stat increments' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.bandit_q_values (
    user_id,
    word_id,
    q_value
  )
  VALUES (
    v_user_id,
    p_word_id,
    p_q_value
  )
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET
    q_value = EXCLUDED.q_value,
    updated_at = now();

  INSERT INTO public.bandit_word_stats (
    user_id,
    word_id,
    times_selected,
    times_correct,
    times_wrong,
    last_result
  )
  VALUES (
    v_user_id,
    p_word_id,
    v_next_selected,
    v_next_correct,
    v_next_wrong,
    p_last_result
  )
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET
    times_selected = EXCLUDED.times_selected,
    times_correct = EXCLUDED.times_correct,
    times_wrong = EXCLUDED.times_wrong,
    last_result = EXCLUDED.last_result,
    updated_at = now();

  INSERT INTO public.bandit_answer_logs (
    user_id,
    word_id,
    session_id,
    answer_count,
    reward,
    q_value
  )
  VALUES (
    v_user_id,
    p_word_id,
    p_session_id,
    v_next_selected,
    p_reward,
    p_q_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_bandit_answer(
  UUID,
  UUID,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER,
  INTEGER,
  BOOLEAN
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_bandit_answer(
  UUID,
  UUID,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER,
  INTEGER,
  BOOLEAN
) TO authenticated;
