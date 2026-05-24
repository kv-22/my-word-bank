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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
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
    p_times_selected,
    p_times_correct,
    p_times_wrong,
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
    p_times_selected,
    p_reward,
    p_q_value
  );
END;
$$;

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
