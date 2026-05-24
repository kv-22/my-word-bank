import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrl, AVATAR_OPTIONS } from "@/lib/avatars";
import { toast } from "@/hooks/use-toast";

interface Profile {
  display_name: string | null;
  avatar_style: string;
  avatar_seed: string;
  score: number;
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
        .select("display_name, avatar_style, avatar_seed, score")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Could not load profile", description: error.message });
      }
      if (data) {
        setProfile(data);
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

  const pickAvatar = async (style: string, seed: string) => {
    if (!user || !profile) return;
    // Optimistic update
    setProfile({ ...profile, avatar_style: style, avatar_seed: seed });
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_style: style, avatar_seed: seed })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save avatar", description: error.message });
    }
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
      <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.98] p-2 rounded-md"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-body tracking-ui text-muted-foreground">Profile</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-6 pb-12 pt-4 max-w-md w-full mx-auto">
        {/* Avatar hero */}
        <div className="flex flex-col items-center mt-4">
          <motion.div
            key={`${profile.avatar_style}-${profile.avatar_seed}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="w-32 h-32 rounded-full bg-card border border-border overflow-hidden flex items-center justify-center"
          >
            <motion.img
              src={avatarUrl(profile.avatar_style, profile.avatar_seed, 160)}
              alt="Your avatar"
              className="w-full h-full"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Name */}
          <div className="mt-6 w-full flex flex-col items-center">
            {editingName ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  placeholder="Your name"
                  className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none font-display text-2xl text-center pb-1 transition-colors"
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
                className="group flex items-center gap-2"
              >
                <span className="font-display text-2xl text-foreground">
                  {profile.display_name}
                </span>
                <Pencil
                  size={14}
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Avatar picker */}
        <div className="mt-12">
          <h2 className="font-body tracking-ui text-muted-foreground text-center mb-4">
            Choose your avatar
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_OPTIONS.map((opt) => {
              const selected =
                opt.style === profile.avatar_style &&
                opt.seed === profile.avatar_seed;
              return (
                <motion.button
                  key={`${opt.style}-${opt.seed}`}
                  onClick={() => pickAvatar(opt.style, opt.seed)}
                  whileHover={{ y: -2, rotate: -2 }}
                  whileTap={{ scale: 0.94 }}
                  className={`aspect-square rounded-full overflow-hidden border-2 bg-card flex items-center justify-center transition-colors ${
                    selected
                      ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  aria-label={`Avatar ${opt.style} ${opt.seed}`}
                  aria-pressed={selected}
                >
                  <img
                    src={avatarUrl(opt.style, opt.seed, 80)}
                    alt=""
                    className="w-full h-full"
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}