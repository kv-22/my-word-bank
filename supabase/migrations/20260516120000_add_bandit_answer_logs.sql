CREATE TABLE public.bandit_answer_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  answer_count INTEGER NOT NULL,
  reward DOUBLE PRECISION NOT NULL,
  q_value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX bandit_answer_logs_user_session_idx
  ON public.bandit_answer_logs (user_id, session_id, created_at);

ALTER TABLE public.bandit_answer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bandit answer logs"
  ON public.bandit_answer_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bandit answer logs"
  ON public.bandit_answer_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bandit answer logs"
  ON public.bandit_answer_logs FOR DELETE USING (auth.uid() = user_id);
