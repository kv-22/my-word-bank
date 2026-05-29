import { useNavigate } from "react-router-dom";
import { BookOpen, Brain, Sparkles } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Collect",
      description: "Add words as you discover them and write your own definitions.",
    },
    {
      icon: Brain,
      title: "Browse",
      description: "Review your personal lexicon in cards or an alphabetical list.",
    },
    {
      icon: Sparkles,
      title: "Practice",
      description: "Reinforce recall with quick, playful quizzes.",
    },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background select-none">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
        <div className="w-16 h-1 bg-primary rounded-full mb-8" />
        <h1 className="font-display text-5xl sm:text-6xl font-bold text-foreground text-center">
          Word Bank
        </h1>
        <p className="mt-4 font-body tracking-ui text-muted-foreground text-center">
          A personal lexicon
        </p>
        <p className="mt-6 max-w-sm text-center font-body text-sm text-foreground/70 leading-relaxed">
          Collect new words, define them in your own voice, and build recall through browsing and playful practice.
        </p>
        <div className="w-16 h-1 bg-primary/30 rounded-full mt-8 mb-10" />

        <button
          onClick={() => navigate("/auth")}
          className="touch-manipulation px-8 py-3 bg-primary text-primary-foreground font-body tracking-ui rounded-md hover:opacity-90 transition-[opacity,transform] duration-150 ease-out active:scale-[0.98] active:opacity-95"
        >
          Sign In
        </button>
      </div>

      {/* Features */}
      <div className="px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-sm mx-auto space-y-6">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <f.icon size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg text-foreground">{f.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
