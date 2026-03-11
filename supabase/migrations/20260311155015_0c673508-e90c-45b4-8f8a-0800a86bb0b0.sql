-- Create a table for user words/lexicon
CREATE TABLE public.words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  part_of_speech TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on user + word (case-insensitive)
CREATE UNIQUE INDEX idx_words_user_word ON public.words (user_id, lower(word));

-- Enable RLS
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Users can only access their own words
CREATE POLICY "Users can view their own words" ON public.words FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own words" ON public.words FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own words" ON public.words FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own words" ON public.words FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();