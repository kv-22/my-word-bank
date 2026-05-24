const MAX_STREAK_BULBS = 5;

interface StudyCatProps {
  correctStreak?: number;
  clapping?: boolean;
  className?: string;
}

export default function StudyCat({
  correctStreak = 0,
  clapping = false,
  className = "",
}: StudyCatProps) {
  const streakBulbs = Math.min(correctStreak, MAX_STREAK_BULBS);

  return (
    <div
      className={`cat-celebration ${clapping ? "is-clapping" : ""} ${className}`}
      aria-label={
        correctStreak > 0
          ? `Study cat with ${correctStreak} correct answer streak`
          : "Study cat"
      }
      role="img"
    >
      {correctStreak > 0 && (
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
      )}
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
  );
}
