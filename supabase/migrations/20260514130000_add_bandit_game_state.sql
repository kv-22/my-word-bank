CREATE TABLE public.bandit_q_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  q_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id, state_key)
);

CREATE TABLE public.bandit_word_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  times_selected INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  times_wrong INTEGER NOT NULL DEFAULT 0,
  last_result BOOLEAN,
  last_answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);

ALTER TABLE public.bandit_q_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandit_word_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bandit q values"
  ON public.bandit_q_values FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bandit q values"
  ON public.bandit_q_values FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bandit q values"
  ON public.bandit_q_values FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bandit q values"
  ON public.bandit_q_values FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bandit word stats"
  ON public.bandit_word_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bandit word stats"
  ON public.bandit_word_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bandit word stats"
  ON public.bandit_word_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bandit word stats"
  ON public.bandit_word_stats FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bandit_q_values_updated_at
  BEFORE UPDATE ON public.bandit_q_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandit_word_stats_updated_at
  BEFORE UPDATE ON public.bandit_word_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
