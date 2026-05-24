from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

from game.bandit import MultiArmedBandit


ALPHA = 0.1
EPSILON = 0.1
OPTIMISTIC_INITIAL_Q = 13.0
MAX_ASKS_PER_SESSION = 2
OPTION_COUNT = 4


@dataclass
class SessionState:
    user_id: str
    token: str
    words: list[dict]
    ask_counts: dict[str, int] = field(default_factory=dict)
    q_values_by_state: dict[tuple[bool, bool], dict[str, float]] = field(default_factory=dict)
    word_stats: dict[str, dict | None] = field(default_factory=dict)
    previous_word_id: str | None = None
    current_round: dict | None = None
    correct_streak_count: int = 0
    wrong_streak_count: int = 0
    answered: int = 0
    correct: int = 0
    wrong: int = 0

    def state_key(self) -> dict[str, bool]:
        return {
            "wrong_streak": self.wrong_streak_count >= 3,
            "correct_streak": self.correct_streak_count >= 3,
        }

    def summary(self) -> dict:
        return {
            "answered": self.answered,
            "correct": self.correct,
            "wrong": self.wrong,
            "correctStreak": self.correct_streak_count,
        }


def bandit_state_key(state_key: dict[str, bool]) -> tuple[bool, bool]:
    return (state_key["wrong_streak"], state_key["correct_streak"])


def empty_q_values_by_state() -> dict[tuple[bool, bool], dict[str, float]]:
    return {
        (False, False): {},
        (False, True): {},
        (True, False): {},
        (True, True): {},
    }


class GameService:
    def __init__(self, supabase):
        self.supabase = supabase
        self.sessions: dict[str, SessionState] = {}

    def start_session(self, token: str) -> dict:
        user = self.supabase.get_user(token)
        user_id = user["id"]
        words = self.supabase.load_playable_words(token)
        if len(words) < 2:
            raise ValueError("At least 2 words with definitions are required to play")

        # print(len(words))
        session_id = str(uuid4())
        session = SessionState(
            user_id=user_id,
            token=token,
            words=words,
            q_values_by_state=self._load_all_q_values(token, user_id),
        )
        self.sessions[session_id] = session
        round_payload = self._next_round(session)
        if not round_payload:
            raise ValueError("No playable words are available")
        return {
            "sessionId": session_id,
            "round": round_payload,
            "summary": session.summary(),
        }

    def answer(self, token: str, session_id: str, word_id: str, selected_option_word_id: str) -> dict:
        session = self._get_session(token, session_id)
        current_round = session.current_round
        if not current_round or current_round["wordId"] != word_id:
            raise ValueError("Answer does not match the active round")

        correct_option_word_id = word_id
        is_correct = selected_option_word_id == correct_option_word_id
        state_key = session.state_key()
        stats = self._word_stats(session, word_id)
        reward = self._calculate_reward(is_correct, stats)

        q_values = self._q_values(session, state_key)
        old_q = q_values.get(word_id, OPTIMISTIC_INITIAL_Q)
        
        new_q = old_q + (ALPHA * (reward - old_q))
        updated_stats = self._updated_stats_payload(session.user_id, word_id, is_correct, stats)

        session.answered += 1
        if is_correct:
            session.correct += 1
            session.correct_streak_count += 1
            session.wrong_streak_count = 0
        else:
            session.wrong += 1
            session.wrong_streak_count += 1
            session.correct_streak_count = 0
        
        # print(session.correct_streak_count)
        # print(session.wrong_streak_count)

        self.supabase.upsert_q_value(token, session.user_id, word_id, state_key, new_q)
        q_values[word_id] = new_q
        self.supabase.upsert_word_stats(token, updated_stats)
        session.word_stats[word_id] = updated_stats
        self.supabase.insert_answer_log(
            token,
            {
                "user_id": session.user_id,
                "word_id": word_id,
                "session_id": session_id,
                "answer_count": updated_stats["times_selected"],
                "reward": reward,
                "q_value": new_q,
            },
        )

        next_round = self._next_round(session)
        return {
            "result": {
                "correct": is_correct,
                "correctOptionWordId": correct_option_word_id,
                "selectedOptionWordId": selected_option_word_id,
            },
            "reward": reward,
            "updatedQValue": new_q,
            "nextRound": next_round,
            "summary": session.summary(),
            "sessionComplete": next_round is None,
        }

    def end_session(self, token: str, session_id: str) -> dict:
        session = self._get_session(token, session_id)
        del self.sessions[session_id]
        return {"summary": session.summary()}

    def _get_session(self, token: str, session_id: str) -> SessionState:
        session = self.sessions.get(session_id)
        if not session:
            raise KeyError("Session not found")
        user = self.supabase.get_user(token)
        if user["id"] != session.user_id:
            raise PermissionError("Session does not belong to this token")
        session.token = token
        return session

    def _eligible_words(self, session: SessionState) -> list[dict]:
        under_limit = [
            word
            for word in session.words
            if session.ask_counts.get(word["id"], 0) < MAX_ASKS_PER_SESSION
        ]
        if not under_limit:
            return []
        return [
            word for word in under_limit if word["id"] != session.previous_word_id
        ]

    def _next_round(self, session: SessionState) -> dict | None:
        eligible_words = self._eligible_words(session)
        if not eligible_words:
            session.current_round = None
            return None

        state_key = session.state_key()
        bandit_key = bandit_state_key(state_key)
        q_values = self._q_values(session, state_key)
        table = {
            (bandit_key, word["id"]): q_values.get(word["id"], OPTIMISTIC_INITIAL_Q)
            for word in eligible_words
        }
        # print(table)
        bandit = MultiArmedBandit(alpha=ALPHA, epsilon=EPSILON, table=table)
        selected_word_id = bandit.select(bandit_key, [word["id"] for word in eligible_words])
        selected_word = next(word for word in eligible_words if word["id"] == selected_word_id)

        session.ask_counts[selected_word_id] = session.ask_counts.get(selected_word_id, 0) + 1
        session.previous_word_id = selected_word_id
        session.current_round = self._round_payload(session, selected_word)
        return session.current_round

    def _round_payload(self, session: SessionState, selected_word: dict) -> dict:
        distractors = [word for word in session.words if word["id"] != selected_word["id"]]
        random.shuffle(distractors)
        options_by_definition: dict[str, dict] = {selected_word["definition"].strip(): selected_word}
        for word in distractors:
            definition = word["definition"].strip()
            if definition and definition not in options_by_definition:
                options_by_definition[definition] = word
            if len(options_by_definition) >= OPTION_COUNT:
                break

        options = [
            {"wordId": word["id"], "definition": word["definition"]}
            for word in options_by_definition.values()
        ]
        random.shuffle(options)
        return {
            "wordId": selected_word["id"],
            "word": selected_word["word"],
            "options": options,
        }

    def _q_values(self, session: SessionState, state_key: dict[str, bool]) -> dict[str, float]:
        state_tuple = bandit_state_key(state_key)
        return session.q_values_by_state.setdefault(state_tuple, {})

    def _load_all_q_values(self, token: str, user_id: str) -> dict[tuple[bool, bool], dict[str, float]]:
        if hasattr(self.supabase, "load_all_q_values"):
            loaded = self.supabase.load_all_q_values(token, user_id)
            q_values = empty_q_values_by_state()
            q_values.update(loaded)
            return q_values
        return empty_q_values_by_state()

    def _word_stats(self, session: SessionState, word_id: str) -> dict | None:
        if word_id not in session.word_stats:
            session.word_stats[word_id] = self.supabase.load_word_stats(
                session.token,
                session.user_id,
                word_id,
            )
        return session.word_stats[word_id]

    def _calculate_reward(self, is_correct: bool, stats: dict | None) -> float:
        reward = 1.0 if is_correct else 5.0

        times_correct = int(stats.get("times_correct", 0)) if stats else 0
        times_selected = int(stats.get("times_selected", 0)) if stats else 0
        times_correct += 1 if is_correct else 0
        times_selected += 1
    
        if is_correct and stats and stats.get("last_result") is False:
            reward += 1.0
        if not is_correct and stats and stats.get("last_result") is True:
            reward += 2.0
            last_answered_at = self._parse_timestamp(stats.get("last_answered_at"))
            if last_answered_at:
                elapsed = datetime.now(timezone.utc) - last_answered_at
                if elapsed.days >= 7:
                    reward += 3.0
        if not is_correct and stats and stats.get("last_result") is False:
            reward += 3

        recall_rate = (times_correct + 1) / (times_selected + 2)
        difficulty_bonus = (1.0 - recall_rate) * (3.0 if not is_correct else 1.0)
        reward += difficulty_bonus
        return reward

    def _updated_stats_payload(
        self,
        user_id: str,
        word_id: str,
        is_correct: bool,
        stats: dict | None,
    ) -> dict:
        times_selected = int(stats.get("times_selected", 0)) if stats else 0
        times_correct = int(stats.get("times_correct", 0)) if stats else 0
        times_wrong = int(stats.get("times_wrong", 0)) if stats else 0
        return {
            "user_id": user_id,
            "word_id": word_id,
            "times_selected": times_selected + 1,
            "times_correct": times_correct + (1 if is_correct else 0),
            "times_wrong": times_wrong + (0 if is_correct else 1),
            "last_result": is_correct,
            "last_answered_at": datetime.now(timezone.utc).isoformat(),
        }

    def _parse_timestamp(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None
