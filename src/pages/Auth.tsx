import { useState } from "react";
import { Helmet } from "react-helmet-async";
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
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-background px-6 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Helmet>
        <title>Sign In — Word Bank</title>
        <meta name="description" content="Sign in or create a free Word Bank account to start collecting words, writing personal definitions, and practicing recall." />
        <link rel="canonical" href="/auth" />
        <meta property="og:title" content="Sign In — Word Bank" />
        <meta property="og:description" content="Sign in to your personal lexicon and keep building your vocabulary." />
        <meta property="og:url" content="/auth" />
      </Helmet>
      <div className="w-16 h-1 bg-primary rounded-full mb-8" />
      <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-2">
        Word Bank — A personal lexicon
      </h1>
      <p className="font-body tracking-ui text-muted-foreground mb-10">
        Sign in to continue
      </p>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm space-y-4">
        <label htmlFor="auth-email" className="sr-only">Email address</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email address"
          required
          className="w-full touch-manipulation appearance-none bg-transparent border-b border-border font-body text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary py-3 transition-colors"
        />
        <label htmlFor="auth-password" className="sr-only">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          required
          minLength={6}
          className="w-full touch-manipulation appearance-none bg-transparent border-b border-border font-body text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary py-3 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full touch-manipulation py-3 bg-primary text-primary-foreground font-body tracking-ui rounded-md hover:opacity-90 transition-[opacity,transform] duration-150 ease-out active:scale-[0.98] active:opacity-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? "…" : isSignUp ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="relative z-10 mt-6 touch-manipulation font-body tracking-ui text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] rounded-sm px-1 -mx-1"
      >
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
      <div className="w-16 h-1 bg-primary/30 rounded-full mt-10" />
    </main>
  );
}
