import { type CSSProperties, useEffect, useState } from "react";
import {
  answerGameRound,
  endGameSession,
  GameRound,
  GameSummary,
  startGameSession,
} from "@/lib/banditApi";

interface GameSessionProps {
  onDone: () => void;
}

type Feedback = {
  correct: boolean;
  selectedOptionWordId: string;
  correctOptionWordId: string;
} | null;

const emptySummary: GameSummary = { answered: 0, correct: 0, wrong: 0, correctStreak: 0 };
const MAX_STREAK_BULBS = 5;
const answerSubmitErrorMessage = "Could not submit your answer. Please try again in a moment.";
const confettiPieces = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  left: `${12 + ((index * 17) % 76)}%`,
  drift: `${index % 2 === 0 ? "-" : ""}${18 + (index % 5) * 8}px`,
  delay: `${(index % 6) * 0.035}s`,
  rotation: `${(index * 47) % 360}deg`,
  colorClass: [
    "bg-emerald-400",
    "bg-lime-300",
    "bg-sky-400",
    "bg-yellow-300",
    "bg-rose-400",
    "bg-violet-400",
  ][index % 6],
}));

export default function GameSession({ onDone }: GameSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<GameRound | null>(null);
  const [pendingRound, setPendingRound] = useState<GameRound | null>(null);
  const [summary, setSummary] = useState<GameSummary>(emptySummary);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    startGameSession()
      .then((session) => {
        if (cancelled) return;
        setSessionId(session.sessionId);
        setRound(session.round);
        setSummary(session.summary);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not start the game.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnswer = async (selectedOptionWordId: string) => {
    if (!sessionId || !round || feedback || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await answerGameRound(sessionId, round.wordId, selectedOptionWordId);
      setFeedback(response.result);
      setSummary(response.summary);
      setPendingRound(response.nextRound);
    } catch (err) {
      console.error("Failed to submit game answer:", err);
      setError(answerSubmitErrorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setRound(pendingRound);
    setPendingRound(null);
    setFeedback(null);
  };

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        const response = await endGameSession(sessionId);
        setSummary(response.summary);
      } catch {
        // Keep the local summary if the in-memory server session is already gone.
      }
    }
    setSessionId(null);
    setRound(null);
    setPendingRound(null);
    setFeedback(null);
    setComplete(true);
  };

  const handleLeaveSummary = async () => {
    if (sessionId) {
      try {
        await endGameSession(sessionId);
      } catch {
        // Exiting is still okay if the in-memory server session is already gone.
      }
    }
    onDone();
  };

  const correctStreak = summary.correctStreak ?? 0;
  const streakBulbs = Math.min(correctStreak, MAX_STREAK_BULBS);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-12 h-1 bg-primary/30 rounded-full animate-pulse" />
        <p className="mt-6 font-body tracking-ui text-muted-foreground">
          Getting ready...
        </p>
      </div>
    );
  }

  if (error && !round) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-3xl text-foreground">Can’t start play</p>
        <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-muted-foreground">
          {error}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-8 font-body tracking-ui text-accent transition-[color,transform] duration-150 ease-out hover:opacity-80 active:scale-[0.98]"
        >
          Back to lexicon
        </button>
      </div>
    );
  }

  if (complete || !round) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-1 bg-primary/30 rounded-full mb-6" />
        {correctStreak > 0 && (
          <div
            className="summary-bulbs mb-5"
            aria-label={`${correctStreak} correct answer streak`}
            role="img"
          >
            {Array.from({ length: streakBulbs }, (_, index) => (
              <span
                key={index}
                className="cat-bulb"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                💡
              </span>
            ))}
            {correctStreak > MAX_STREAK_BULBS && (
              <span className="cat-streak-count">+{correctStreak - MAX_STREAK_BULBS}</span>
            )}
          </div>
        )}
        <p className="font-display text-4xl text-foreground">Game over</p>
        <p className="mt-5 font-body text-sm text-muted-foreground">
          {summary.correct} correct · {summary.wrong} wrong · {summary.answered} answered
        </p>
        <button
          type="button"
          onClick={handleLeaveSummary}
          className="mt-8 font-body tracking-ui text-accent transition-[color,transform] duration-150 ease-out hover:opacity-80 active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    );
  }

  const shouldClap = feedback?.correct === true;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-6 pb-8">
      {feedback?.correct && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-64 overflow-hidden"
        >
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className={`absolute top-0 h-3 w-1.5 rounded-sm opacity-0 animate-confetti-fall ${piece.colorClass}`}
              style={{
                left: piece.left,
                "--confetti-drift": piece.drift,
                animationDelay: piece.delay,
                transform: `rotate(${piece.rotation})`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      <div className="flex justify-between pt-4 font-body tracking-ui text-muted-foreground">
        <span>
          {summary.correct} / {summary.answered}
        </span>
        <button
          type="button"
          onClick={handleEndSession}
          className="transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.98]"
        >
          Done
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="w-12 h-1 bg-primary/30 rounded-full mb-6" />
        <div
          className={`cat-celebration mb-9 ${shouldClap ? "is-clapping" : ""}`}
          aria-label={
            correctStreak > 0
              ? `Study cat with ${correctStreak} correct answer streak`
              : "Study cat"
          }
          role="img"
        >
          <div className="cat-bulbs" aria-hidden="true">
            {Array.from({ length: streakBulbs }, (_, index) => (
              <span
                key={index}
                className="cat-bulb"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                💡
              </span>
            ))}
            {correctStreak > MAX_STREAK_BULBS && (
              <span className="cat-streak-count">+{correctStreak - MAX_STREAK_BULBS}</span>
            )}
          </div>
          <div className="cat-tail" />
          <div className="cat-ear cat-ear-left" />
          <div className="cat-ear cat-ear-right" />
          <div className="cat-head">
            <span className="cat-eye cat-eye-left" />
            <span className="cat-eye cat-eye-right" />
            <span className="cat-nose" />
            <span className="cat-mouth" />
            <span className="cat-whisker cat-whisker-left-one" />
            <span className="cat-whisker cat-whisker-left-two" />
            <span className="cat-whisker cat-whisker-right-one" />
            <span className="cat-whisker cat-whisker-right-two" />
          </div>
          <div className="cat-body">
            <span className="cat-paw cat-paw-left" />
            <span className="cat-paw cat-paw-right" />
          </div>
        </div>
        <p className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-foreground leading-tight">
          {round.word}
        </p>

        <div className="mt-10 grid w-full max-w-2xl gap-3">
          {round.options.map((option) => {
            const isSelected = feedback?.selectedOptionWordId === option.wordId;
            const isCorrect = feedback?.correctOptionWordId === option.wordId;
            const answeredClass = feedback
              ? isCorrect
                ? "border-emerald-500/70 bg-emerald-500/15 text-foreground shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
                : isSelected
                  ? "border-red-500/70 bg-red-500/15 text-foreground shadow-[0_0_0_1px_rgba(239,68,68,0.16)]"
                  : "border-border text-muted-foreground"
              : "border-border bg-card/30 text-foreground hover:bg-card";

            return (
              <button
                key={option.wordId}
                type="button"
                disabled={Boolean(feedback) || submitting}
                onClick={() => handleAnswer(option.wordId)}
                className={`w-full rounded-md border px-4 py-4 text-left font-body text-sm leading-relaxed transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.995] disabled:active:scale-100 ${answeredClass}`}
              >
                {option.definition}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-5 max-w-md font-body text-sm text-destructive">{error}</p>
        )}

        {feedback && (
          <div className="mt-7 flex flex-col items-center gap-4">
            <p className="font-body tracking-ui text-muted-foreground">
              {feedback.correct ? "Correct" : "Not quite"}
            </p>
            {pendingRound ? (
              <button
                type="button"
                onClick={handleNext}
                className="font-body tracking-ui text-accent transition-[color,transform] duration-150 ease-out hover:opacity-80 active:scale-[0.98]"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setComplete(true)}
                className="font-body tracking-ui text-accent transition-[color,transform] duration-150 ease-out hover:opacity-80 active:scale-[0.98]"
              >
                Summary
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
