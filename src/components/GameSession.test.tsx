import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GameSession from "./GameSession";
import * as api from "@/lib/banditApi";

vi.mock("@/lib/banditApi");

const startGameSession = vi.mocked(api.startGameSession);
const answerGameRound = vi.mocked(api.answerGameRound);
const endGameSession = vi.mocked(api.endGameSession);

const firstRound = {
  wordId: "word-1",
  word: "abate",
  options: [
    { wordId: "word-1", definition: "to lessen" },
    { wordId: "word-2", definition: "to praise" },
  ],
};

const secondRound = {
  wordId: "word-2",
  word: "laud",
  options: [
    { wordId: "word-2", definition: "to praise" },
    { wordId: "word-1", definition: "to lessen" },
  ],
};

describe("GameSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    endGameSession.mockResolvedValue({
      summary: { answered: 1, correct: 1, wrong: 0, correctStreak: 1 },
    });
  });

  it("shows loading copy while getting ready to play", () => {
    startGameSession.mockImplementation(() => new Promise(() => {}));

    render(<GameSession onDone={vi.fn()} />);

    expect(screen.getByText("Getting ready...")).toBeInTheDocument();
  });

  it("starts a play session", async () => {
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 0, correct: 0, wrong: 0, correctStreak: 0 },
    });

    render(<GameSession onDone={vi.fn()} />);

    expect(await screen.findByText("abate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "to lessen" })).toBeInTheDocument();
  });

  it("renders feedback after answering", async () => {
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 0, correct: 0, wrong: 0, correctStreak: 0 },
    });
    answerGameRound.mockResolvedValue({
      result: {
        correct: true,
        correctOptionWordId: "word-1",
        selectedOptionWordId: "word-1",
      },
      reward: 1,
      updatedQValue: 0.1,
      nextRound: secondRound,
      summary: { answered: 1, correct: 1, wrong: 0, correctStreak: 1 },
      sessionComplete: false,
    });

    render(<GameSession onDone={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "to lessen" }));

    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("shows friendly copy when answer submission fails", async () => {
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 0, correct: 0, wrong: 0, correctStreak: 0 },
    });
    answerGameRound.mockRejectedValue(new Error("HTTP Error 404: Not Found"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<GameSession onDone={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "to lessen" }));

    expect(
      await screen.findByText("Could not submit your answer. Please try again in a moment.")
    ).toBeInTheDocument();
    expect(screen.queryByText("HTTP Error 404: Not Found")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("shows a completed session summary", async () => {
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 0, correct: 0, wrong: 0, correctStreak: 0 },
    });
    answerGameRound.mockResolvedValue({
      result: {
        correct: false,
        correctOptionWordId: "word-1",
        selectedOptionWordId: "word-2",
      },
      reward: 5,
      updatedQValue: 0.5,
      nextRound: null,
      summary: { answered: 1, correct: 0, wrong: 1, correctStreak: 0 },
      sessionComplete: true,
    });

    render(<GameSession onDone={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "to praise" }));
    fireEvent.click(await screen.findByRole("button", { name: "Summary" }));

    expect(screen.getByText("Game over")).toBeInTheDocument();
    expect(screen.getByText("0 correct · 1 wrong · 1 answered")).toBeInTheDocument();
  });

  it("ends the active session and shows the summary when Done is clicked", async () => {
    const onDone = vi.fn();
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 0, correct: 0, wrong: 0, correctStreak: 0 },
    });
    endGameSession.mockResolvedValue({
      summary: { answered: 3, correct: 2, wrong: 1, correctStreak: 1 },
    });

    render(<GameSession onDone={onDone} />);
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    expect(await screen.findByText("Game over")).toBeInTheDocument();
    expect(screen.getByLabelText("1 correct answer streak")).toBeInTheDocument();
    expect(screen.getByText("💡")).toBeInTheDocument();
    expect(screen.getByText("2 correct · 1 wrong · 3 answered")).toBeInTheDocument();
    expect(endGameSession).toHaveBeenCalledWith("session-1");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("leaves the summary after the second Done click", async () => {
    const onDone = vi.fn();
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 0, correct: 0, wrong: 0, correctStreak: 0 },
    });

    render(<GameSession onDone={onDone} />);
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    expect(await screen.findByText("Game over")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it("shows a server unavailable state", async () => {
    startGameSession.mockRejectedValue(new Error("Failed to fetch"));

    render(<GameSession onDone={vi.fn()} />);

    expect(await screen.findByText("Can’t start play")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
  });

  it("shows the cat and correct streak bulbs", async () => {
    startGameSession.mockResolvedValue({
      sessionId: "session-1",
      round: firstRound,
      summary: { answered: 2, correct: 2, wrong: 0, correctStreak: 2 },
    });

    render(<GameSession onDone={vi.fn()} />);

    expect(await screen.findByLabelText("Study cat with 2 correct answer streak")).toBeInTheDocument();
    expect(screen.getAllByText("💡")).toHaveLength(2);
  });
});
