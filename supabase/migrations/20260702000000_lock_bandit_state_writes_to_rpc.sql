-- Bandit answer state should only be mutated through record_bandit_answer.
-- Users can still read their own state, but direct PostgREST writes would let
-- them forge counters, q-values, or logs without the answer RPC checks.
DROP POLICY IF EXISTS "Users can insert their own bandit q values"
  ON public.bandit_q_values;
DROP POLICY IF EXISTS "Users can update their own bandit q values"
  ON public.bandit_q_values;
DROP POLICY IF EXISTS "Users can delete their own bandit q values"
  ON public.bandit_q_values;

DROP POLICY IF EXISTS "Users can insert their own bandit word stats"
  ON public.bandit_word_stats;
DROP POLICY IF EXISTS "Users can update their own bandit word stats"
  ON public.bandit_word_stats;
DROP POLICY IF EXISTS "Users can delete their own bandit word stats"
  ON public.bandit_word_stats;

DROP POLICY IF EXISTS "Users can insert their own bandit answer logs"
  ON public.bandit_answer_logs;
DROP POLICY IF EXISTS "Users can delete their own bandit answer logs"
  ON public.bandit_answer_logs;

CREATE OR REPLACE FUNCTION public.record_bandit_answer(
  p_word_id UUID,
  p_session_id UUID,
  p_reward DOUBLE PRECISION,
  p_q_value DOUBLE PRECISION,
  p_wrong_streak BOOLEAN,
  p_correct_streak BOOLEAN,
  p_times_selected INTEGER,
  p_times_correct INTEGER,
  p_times_wrong INTEGER,
  p_last_result BOOLEAN,
  p_last_answered_at TIMESTAMP WITH TIME ZONE
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
    wrong_streak,
    correct_streak,
    q_value
  )
  VALUES (
    v_user_id,
    p_word_id,
    p_wrong_streak,
    p_correct_streak,
    p_q_value
  )
  ON CONFLICT (user_id, word_id, wrong_streak, correct_streak)
  DO UPDATE SET
    q_value = EXCLUDED.q_value,
    updated_at = now();

  INSERT INTO public.bandit_word_stats (
    user_id,
    word_id,
    times_selected,
    times_correct,
    times_wrong,
    last_result,
    last_answered_at
  )
  VALUES (
    v_user_id,
    p_word_id,
    v_next_selected,
    v_next_correct,
    v_next_wrong,
    p_last_result,
    p_last_answered_at
  )
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET
    times_selected = EXCLUDED.times_selected,
    times_correct = EXCLUDED.times_correct,
    times_wrong = EXCLUDED.times_wrong,
    last_result = EXCLUDED.last_result,
    last_answered_at = EXCLUDED.last_answered_at,
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
  BOOLEAN,
  BOOLEAN,
  INTEGER,
  INTEGER,
  INTEGER,
  BOOLEAN,
  TIMESTAMP WITH TIME ZONE
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_bandit_answer(
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
) TO authenticated;
