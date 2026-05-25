CREATE OR REPLACE FUNCTION public.record_bandit_answer(
  p_word_id uuid,
  p_session_id uuid,
  p_reward double precision,
  p_q_value double precision,
  p_wrong_streak boolean,
  p_correct_streak boolean,
  p_times_selected integer,
  p_times_correct integer,
  p_times_wrong integer,
  p_last_result boolean,
  p_last_answered_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_prev_selected INTEGER := 0;
  v_prev_correct  INTEGER := 0;
  v_prev_wrong    INTEGER := 0;
  v_word_owned    BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- 1. Word must belong to the calling user
  SELECT EXISTS (
    SELECT 1 FROM public.words
    WHERE id = p_word_id AND user_id = v_user_id
  ) INTO v_word_owned;

  IF NOT v_word_owned THEN
    RAISE EXCEPTION 'Word does not belong to caller' USING ERRCODE = '42501';
  END IF;

  -- 2. Load existing stats (if any) and enforce monotonic +1 increments
  SELECT times_selected, times_correct, times_wrong
    INTO v_prev_selected, v_prev_correct, v_prev_wrong
  FROM public.bandit_word_stats
  WHERE user_id = v_user_id AND word_id = p_word_id;

  IF NOT FOUND THEN
    v_prev_selected := 0;
    v_prev_correct  := 0;
    v_prev_wrong    := 0;
  END IF;

  IF p_times_selected <> v_prev_selected + 1
     OR p_times_correct <> v_prev_correct + (CASE WHEN p_last_result THEN 1 ELSE 0 END)
     OR p_times_wrong   <> v_prev_wrong   + (CASE WHEN p_last_result THEN 0 ELSE 1 END)
     OR p_times_correct + p_times_wrong  <> p_times_selected
  THEN
    RAISE EXCEPTION 'Invalid stat increments' USING ERRCODE = '22023';
  END IF;

  -- 3. Persist q-value
  INSERT INTO public.bandit_q_values (
    user_id, word_id, wrong_streak, correct_streak, q_value
  )
  VALUES (
    v_user_id, p_word_id, p_wrong_streak, p_correct_streak, p_q_value
  )
  ON CONFLICT (user_id, word_id, wrong_streak, correct_streak)
  DO UPDATE SET
    q_value = EXCLUDED.q_value,
    updated_at = now();

  -- 4. Persist word stats
  INSERT INTO public.bandit_word_stats (
    user_id, word_id, times_selected, times_correct, times_wrong,
    last_result, last_answered_at
  )
  VALUES (
    v_user_id, p_word_id, p_times_selected, p_times_correct, p_times_wrong,
    p_last_result, p_last_answered_at
  )
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET
    times_selected   = EXCLUDED.times_selected,
    times_correct    = EXCLUDED.times_correct,
    times_wrong      = EXCLUDED.times_wrong,
    last_result      = EXCLUDED.last_result,
    last_answered_at = EXCLUDED.last_answered_at,
    updated_at = now();

  -- 5. Append answer log
  INSERT INTO public.bandit_answer_logs (
    user_id, word_id, session_id, answer_count, reward, q_value
  )
  VALUES (
    v_user_id, p_word_id, p_session_id, p_times_selected, p_reward, p_q_value
  );

  -- 6. Update score using a server-derived delta (client cannot influence magnitude)
  UPDATE public.profiles
  SET
    score = score + CASE WHEN p_last_result THEN 1 ELSE -1 END,
    updated_at = now()
  WHERE user_id = v_user_id;
END;
$function$;