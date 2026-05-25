from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from api.game_service import GameService
from game.bandit import MultiArmedBandit


class FakeSupabase:
    def __init__(self, words=None):
        self.words = words or [
            {"id": "one", "word": "one", "definition": "first"},
            {"id": "two", "word": "two", "definition": "second"},
            {"id": "three", "word": "three", "definition": "third"},
        ]
        self.q_values = {}
        self.stats = {}
        self.saved_q_values = []
        self.saved_stats = []
        self.saved_answer_logs = []
        self.record_answer_calls = []
        self.load_all_q_values_calls = []
        self.load_q_values_calls = []
        self.load_word_stats_calls = []
        self.profile_score = 0

    def get_user(self, token):
        return {"id": "user-1"}

    def load_playable_words(self, token):
        return self.words

    def load_q_values(self, token, user_id, state_key):
        self.load_q_values_calls.append(self._state_tuple(state_key))
        return self.q_values.get(self._state_tuple(state_key), {})

    def load_all_q_values(self, token, user_id):
        self.load_all_q_values_calls.append(user_id)
        return {
            (False, False): dict(self.q_values.get((False, False), {})),
            (False, True): dict(self.q_values.get((False, True), {})),
            (True, False): dict(self.q_values.get((True, False), {})),
            (True, True): dict(self.q_values.get((True, True), {})),
        }

    def load_word_stats(self, token, user_id, word_id):
        self.load_word_stats_calls.append(word_id)
        return self.stats.get(word_id)

    def record_answer(self, token, payload):
        self.record_answer_calls.append(payload)
        state_key = {
            "wrong_streak": payload["p_wrong_streak"],
            "correct_streak": payload["p_correct_streak"],
        }
        updated_stats = {
            "user_id": "user-1",
            "word_id": payload["p_word_id"],
            "times_selected": payload["p_times_selected"],
            "times_correct": payload["p_times_correct"],
            "times_wrong": payload["p_times_wrong"],
            "last_result": payload["p_last_result"],
            "last_answered_at": payload["p_last_answered_at"],
        }
        answer_log = {
            "user_id": "user-1",
            "word_id": payload["p_word_id"],
            "session_id": payload["p_session_id"],
            "answer_count": payload["p_times_selected"],
            "reward": payload["p_reward"],
            "q_value": payload["p_q_value"],
        }
        self.upsert_q_value(
            token,
            "user-1",
            payload["p_word_id"],
            state_key,
            payload["p_q_value"],
        )
        self.upsert_word_stats(token, updated_stats)
        self.insert_answer_log(token, answer_log)

    def upsert_q_value(self, token, user_id, word_id, state_key, q_value):
        self.saved_q_values.append((word_id, state_key, q_value))
        self.q_values.setdefault(self._state_tuple(state_key), {})[word_id] = q_value

    def _state_tuple(self, state_key):
        return (state_key["wrong_streak"], state_key["correct_streak"])

    def upsert_word_stats(self, token, payload):
        self.saved_stats.append(payload)
        self.stats[payload["word_id"]] = payload

    def insert_answer_log(self, token, payload):
        self.saved_answer_logs.append(payload)


def answer_current_round(service, session_id, token="token"):
    session = service.sessions[session_id]
    word_id = session.current_round["wordId"]
    return service.answer(token, session_id, word_id, word_id)


def answer_current_round_wrong(service, session_id, token="token"):
    session = service.sessions[session_id]
    word_id = session.current_round["wordId"]
    wrong_option = next(
        option for option in session.current_round["options"] if option["wordId"] != word_id
    )
    return service.answer(token, session_id, word_id, wrong_option["wordId"])


class GameServiceTest(unittest.TestCase):
    def test_bandit_updates_q_value(self):
        bandit = MultiArmedBandit(alpha=0.1, epsilon=0)
        bandit.update_table("state", "word", 5)

        self.assertEqual(bandit.get_q_value("state", "word"), 0.5)

    def test_bandit_selects_best_action(self):
        table = {
            ("state", "low"): 0.25,
            ("state", "high"): 1.5,
        }
        bandit = MultiArmedBandit(alpha=0.1, epsilon=0, table=table)

        self.assertEqual(bandit.select("state", ["low", "high"]), "high")

    def test_reward_calculation(self):
        service = GameService(FakeSupabase())

        self.assertAlmostEqual(service._calculate_reward(True, None), 1.3333333333333335)
        self.assertAlmostEqual(
            service._calculate_reward(True, {"last_result": False}),
            2.3333333333333335,
        )
        self.assertEqual(service._calculate_reward(False, None), 7)

        old_timestamp = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
        stats = {"last_result": True, "last_answered_at": old_timestamp}
        self.assertEqual(service._calculate_reward(False, stats), 12)

    def test_candidate_generation_includes_correct_and_dedupes_definitions(self):
        words = [
            {"id": "one", "word": "one", "definition": "same"},
            {"id": "two", "word": "two", "definition": "same"},
            {"id": "three", "word": "three", "definition": "third"},
        ]
        service = GameService(FakeSupabase(words))
        session = service.start_session("token")

        definitions = [option["definition"] for option in session["round"]["options"]]
        self.assertIn(session["round"]["wordId"], [word["id"] for word in words])
        self.assertEqual(len(definitions), len(set(definitions)))

    def test_no_word_is_selected_more_than_twice_per_session(self):
        service = GameService(FakeSupabase())
        started = service.start_session("token")
        session_id = started["sessionId"]

        while True:
            response = answer_current_round(service, session_id)
            if response["sessionComplete"]:
                break

        session = service.sessions[session_id]
        self.assertLessEqual(max(session.ask_counts.values()), 2)
        self.assertLessEqual(sum(session.ask_counts.values()), 6)

    def test_same_word_is_not_selected_consecutively_when_alternatives_exist(self):
        words = [
            {"id": "one", "word": "one", "definition": "first"},
            {"id": "two", "word": "two", "definition": "second"},
            {"id": "three", "word": "three", "definition": "third"},
            {"id": "four", "word": "four", "definition": "fourth"},
        ]
        service = GameService(FakeSupabase(words))
        started = service.start_session("token")
        session_id = started["sessionId"]
        seen = [started["round"]["wordId"]]

        while True:
            response = answer_current_round(service, session_id)
            if response["nextRound"]:
                seen.append(response["nextRound"]["wordId"])
            if response["sessionComplete"]:
                break

        self.assertTrue(
            all(previous != current for previous, current in zip(seen, seen[1:]))
        )

    def test_optimistic_initialization_prefers_untried_words(self):
        fake = FakeSupabase()
        fake.q_values = {
            (False, False): {
                "one": 0.2,
                "two": 0.1,
            }
        }
        service = GameService(fake)

        with patch("game.bandit.random.random", return_value=1.0):
            started = service.start_session("token")

        self.assertEqual(started["round"]["wordId"], "three")

    def test_session_rejects_insufficient_vocabulary(self):
        service = GameService(
            FakeSupabase([{"id": "one", "word": "one", "definition": "first"}])
        )

        with self.assertRaises(ValueError):
            service.start_session("token")

    def test_answer_updates_q_values_and_stats(self):
        fake = FakeSupabase()
        service = GameService(fake)
        started = service.start_session("token")
        session_id = started["sessionId"]

        response = answer_current_round(service, session_id)

        self.assertEqual(response["summary"]["answered"], 1)
        self.assertEqual(response["summary"]["correctStreak"], 1)
        self.assertTrue(fake.saved_q_values)
        self.assertTrue(fake.saved_stats)
        self.assertEqual(len(fake.record_answer_calls), 1)

    def test_answer_records_correctness_without_updating_profile_score(self):
        fake = FakeSupabase()
        service = GameService(fake)
        started = service.start_session("token")
        session_id = started["sessionId"]

        answer_current_round(service, session_id)
        answer_current_round_wrong(service, session_id)

        self.assertEqual(fake.profile_score, 0)
        self.assertEqual(
            [call["p_last_result"] for call in fake.record_answer_calls],
            [True, False],
        )

    def test_session_loads_all_q_values_once(self):
        fake = FakeSupabase()
        service = GameService(fake)
        started = service.start_session("token")
        session_id = started["sessionId"]

        answer_current_round(service, session_id)

        self.assertEqual(fake.load_all_q_values_calls, ["user-1"])
        self.assertEqual(fake.load_q_values_calls, [])
        self.assertEqual(len(fake.load_word_stats_calls), 1)

    def test_answer_logs_updated_count_reward_q_value_and_session(self):
        fake = FakeSupabase()
        service = GameService(fake)
        started = service.start_session("token")
        session_id = started["sessionId"]

        response = answer_current_round(service, session_id)

        self.assertEqual(len(fake.saved_answer_logs), 1)
        log = fake.saved_answer_logs[0]
        saved_stats = fake.saved_stats[0]
        self.assertEqual(log["word_id"], saved_stats["word_id"])
        self.assertEqual(log["session_id"], session_id)
        self.assertEqual(log["answer_count"], saved_stats["times_selected"])
        self.assertEqual(log["reward"], response["reward"])
        self.assertEqual(log["q_value"], response["updatedQValue"])
        self.assertEqual(len(fake.record_answer_calls), 1)

    def test_end_session_clears_active_session(self):
        service = GameService(FakeSupabase())
        started = service.start_session("token")

        response = service.end_session("token", started["sessionId"])

        self.assertEqual(
            response["summary"],
            {"answered": 0, "correct": 0, "wrong": 0, "correctStreak": 0},
        )
        self.assertNotIn(started["sessionId"], service.sessions)


if __name__ == "__main__":
    unittest.main()
