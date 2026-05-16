import { supabase } from "@/integrations/supabase/client";

export interface GameOption {
  wordId: string;
  definition: string;
}

export interface GameRound {
  wordId: string;
  word: string;
  options: GameOption[];
}

export interface GameSummary {
  answered: number;
  correct: number;
  wrong: number;
  correctStreak: number;
}

export interface StartSessionResponse {
  sessionId: string;
  round: GameRound;
  summary: GameSummary;
}

export interface AnswerResponse {
  result: {
    correct: boolean;
    correctOptionWordId: string;
    selectedOptionWordId: string;
  };
  reward: number;
  updatedQValue: number;
  nextRound: GameRound | null;
  summary: GameSummary;
  sessionComplete: boolean;
}

export interface EndSessionResponse {
  summary: GameSummary;
}

const API_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You need to sign in before playing.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(await authHeaders()),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "The bandit server could not complete the request.";
    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      // Keep the default message when the server returns a non-JSON error.
    }
    throw new Error(message);
  }

  return response.json();
}

export function startGameSession(): Promise<StartSessionResponse> {
  return request<StartSessionResponse>("/game/sessions", { method: "POST" });
}

export function answerGameRound(
  sessionId: string,
  wordId: string,
  selectedOptionWordId: string
): Promise<AnswerResponse> {
  return request<AnswerResponse>(`/game/sessions/${sessionId}/answers`, {
    method: "POST",
    body: JSON.stringify({ wordId, selectedOptionWordId }),
  });
}

export function endGameSession(sessionId: string): Promise<EndSessionResponse> {
  return request<EndSessionResponse>(`/game/sessions/${sessionId}/end`, {
    method: "POST",
  });
}
