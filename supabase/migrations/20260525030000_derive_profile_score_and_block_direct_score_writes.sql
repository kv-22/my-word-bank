-- Score is displayed as SUM(times_correct - times_wrong) from bandit_word_stats.
-- Keep profiles.score for compatibility, but stop changing it from the answer RPC
-- and block direct client edits to that column.
UPDATE public.profiles AS profiles
SET
  score = COALESCE(stats.score, 0),
  updated_at = now()
FROM (
  SELECT
    user_id,
    SUM(times_correct - times_wrong)::INTEGER AS score
  FROM public.bandit_word_stats
  GROUP BY user_id
) AS stats
WHERE profiles.user_id = stats.user_id;

UPDATE public.profiles
SET score = 0, updated_at = now()
WHERE user_id NOT IN (
  SELECT DISTINCT user_id FROM public.bandit_word_stats
);

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

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND score = 0);

CREATE OR REPLACE FUNCTION public.prevent_user_profile_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score THEN
    RAISE EXCEPTION 'Profile score is server managed' USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Profile owner cannot be changed' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_profile_score_change ON public.profiles;
CREATE TRIGGER prevent_user_profile_score_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profile_score_change();

REVOKE EXECUTE ON FUNCTION public.prevent_user_profile_score_change() FROM PUBLIC, anon, authenticated;
