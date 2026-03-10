import { WordEntry } from "@/lib/lexicon";

interface WordDisplayProps {
  entry: WordEntry;
  isNew?: boolean;
}

export default function WordDisplay({ entry, isNew }: WordDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6">
      <h1
        className={`font-display text-5xl sm:text-7xl md:text-8xl font-bold text-foreground leading-tight ${
          isNew ? "animate-ink-soak" : ""
        }`}
      >
        {entry.word}
      </h1>

      {entry.partOfSpeech && (
        <span
          className={`mt-4 font-body tracking-ui text-muted-foreground ${
            isNew ? "animate-fade-in-slow" : ""
          }`}
        >
          {entry.partOfSpeech}
        </span>
      )}

      <p
        className={`mt-6 font-body text-base sm:text-lg text-foreground/80 max-w-lg leading-relaxed ${
          isNew ? "animate-fade-in-slow" : ""
        }`}
      >
        {entry.definition}
      </p>

      <time
        className={`mt-8 font-body tracking-ui text-muted-foreground ${
          isNew ? "animate-fade-in-slow" : ""
        }`}
      >
        {new Date(entry.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
    </div>
  );
}
