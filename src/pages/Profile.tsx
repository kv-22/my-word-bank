import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import StudyCat from "@/components/StudyCat";

interface Profile {
  display_name: string | null;
  score: number;
}

interface BanditWordStat {
  times_correct: number;
  times_wrong: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Could not load profile", description: error.message });
      }
      const { data: stats, error: statsError } = await supabase
        .from("bandit_word_stats")
        .select("times_correct, times_wrong")
        .eq("user_id", user.id);
      if (statsError) {
        toast({ title: "Could not load score", description: statsError.message });
      }
      if (data) {
        const score = ((stats ?? []) as BanditWordStat[]).reduce(
          (total, stat) => total + stat.times_correct - stat.times_wrong,
          0
        );
        setProfile({ ...data, score });
        setNameDraft(data.display_name ?? "");
        if (!data.display_name) setEditingName(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const saveName = async () => {
    if (!user || !profile) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast({ title: "Name cannot be empty" });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save", description: error.message });
      return;
    }
    setProfile({ ...profile, display_name: trimmed });
    setEditingName(false);
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-12 h-1 bg-primary/30 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background select-none">
      <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center px-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] p-2 rounded-md"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-center font-body tracking-ui text-muted-foreground">Profile</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-6 pb-12 pt-4 max-w-md w-full mx-auto">
        <div className="flex flex-col items-center mt-6 text-center">
          <div className="mb-16 flex h-24 w-full items-center justify-center">
            <StudyCat className="scale-[1.35]" />
          </div>

          {/* Name */}
          <div className="w-full flex flex-col items-center justify-center">
            <span className="mb-2 font-body tracking-ui text-muted-foreground">Keep going</span>
            {editingName ? (
              <div className="grid w-full max-w-xs grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2">
                <span aria-hidden="true" />
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  placeholder="Your name"
                  className="min-w-0 bg-transparent border-b border-border focus:border-primary outline-none font-display text-2xl text-center pb-1 transition-colors"
                />
                <button
                  onClick={saveName}
                  className="text-primary p-1 rounded hover:bg-muted transition-colors"
                  aria-label="Save name"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNameDraft(profile.display_name ?? "");
                  setEditingName(true);
                }}
                className="group grid w-full grid-cols-[1fr_auto_1fr] items-center"
              >
                <span className="col-start-2 font-display text-2xl text-foreground">
                  {profile.display_name}
                </span>
                <Pencil
                  size={14}
                  className="col-start-3 ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            )}
          </div>

          {/* Score */}
          <div className="mt-8 flex flex-col items-center">
            <span className="font-body tracking-ui text-muted-foreground">Score</span>
            <span className="font-display text-5xl text-primary mt-1">
              {profile.score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
