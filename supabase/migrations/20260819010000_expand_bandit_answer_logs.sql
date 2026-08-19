ALTER TABLE public.bandit_answer_logs
  RENAME COLUMN q_value TO q_value_after;

ALTER TABLE public.bandit_answer_logs
  ADD COLUMN q_value_before DOUBLE PRECISION NOT NULL,
  ADD COLUMN is_correct BOOLEAN NOT NULL,
  ADD COLUMN selection_strategy TEXT NOT NULL,
  ADD CONSTRAINT bandit_answer_logs_selection_strategy_check
    CHECK (selection_strategy IN ('explore', 'exploit'));

-- Clients may edit their display name, but only trusted database functions may
-- change the server-managed score.
DROP TRIGGER IF EXISTS prevent_user_profile_score_change ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.record_bandit_answer(
  UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION,
  INTEGER, INTEGER, INTEGER, BOOLEAN
);

CREATE OR REPLACE FUNCTION public.record_bandit_answer(
  p_word_id UUID,
  p_session_id UUID,
  p_reward DOUBLE PRECISION,
  p_q_value_before DOUBLE PRECISION,
  p_q_value_after DOUBLE PRECISION,
  p_selection_strategy TEXT,
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
    SELECT 1 FROM public.words
    WHERE id = p_word_id AND user_id = v_user_id
  ) INTO v_word_owned;

  IF NOT v_word_owned THEN
    RAISE EXCEPTION 'Word does not belong to caller' USING ERRCODE = '42501';
  END IF;

  IF p_last_result IS NULL THEN
    RAISE EXCEPTION 'Answer result is required' USING ERRCODE = '22004';
  END IF;

  IF p_q_value_before IS NULL OR p_q_value_after IS NULL THEN
    RAISE EXCEPTION 'Q-values are required' USING ERRCODE = '22004';
  END IF;

  IF p_selection_strategy IS NULL
     OR p_selection_strategy NOT IN ('explore', 'exploit') THEN
    RAISE EXCEPTION 'Invalid selection strategy' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(v_user_id::TEXT),
    hashtext(p_word_id::TEXT)
  );

  SELECT times_selected, times_correct, times_wrong
    INTO v_prev_selected, v_prev_correct, v_prev_wrong
  FROM public.bandit_word_stats
  WHERE user_id = v_user_id AND word_id = p_word_id
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
     OR p_times_wrong IS DISTINCT FROM v_next_wrong THEN
    RAISE EXCEPTION 'Invalid stat increments' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.bandit_q_values (user_id, word_id, q_value)
  VALUES (v_user_id, p_word_id, p_q_value_after)
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET q_value = EXCLUDED.q_value, updated_at = now();

  INSERT INTO public.bandit_word_stats (
    user_id, word_id, times_selected, times_correct, times_wrong, last_result
  ) VALUES (
    v_user_id, p_word_id, v_next_selected, v_next_correct,
    v_next_wrong, p_last_result
  )
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET
    times_selected = EXCLUDED.times_selected,
    times_correct = EXCLUDED.times_correct,
    times_wrong = EXCLUDED.times_wrong,
    last_result = EXCLUDED.last_result,
    updated_at = now();

  INSERT INTO public.bandit_answer_logs (
    user_id, word_id, session_id, answer_count, reward,
    is_correct, q_value_before, q_value_after, selection_strategy
  ) VALUES (
    v_user_id, p_word_id, p_session_id, v_next_selected, p_reward,
    p_last_result, p_q_value_before, p_q_value_after, p_selection_strategy
  );

  UPDATE public.profiles
  SET
    score = score + CASE WHEN p_last_result THEN 1 ELSE -1 END,
    updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_bandit_answer(
  UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT,
  INTEGER, INTEGER, INTEGER, BOOLEAN
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_bandit_answer(
  UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT,
  INTEGER, INTEGER, INTEGER, BOOLEAN
) TO authenticated;
