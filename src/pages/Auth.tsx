import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="w-16 h-1 bg-primary rounded-full mb-8" />
      <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-2">
        Ostracon
      </h1>
      <p className="font-body tracking-ui text-muted-foreground mb-10">
        Your personal lexicon
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-transparent border-b border-border font-body text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary py-3 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full bg-transparent border-b border-border font-body text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary py-3 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-body tracking-ui rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "…" : isSignUp ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-6 font-body tracking-ui text-muted-foreground hover:text-foreground transition-colors"
      >
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
      <div className="w-16 h-1 bg-primary/30 rounded-full mt-10" />
    </div>
  );
}
