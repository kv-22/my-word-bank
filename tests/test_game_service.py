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

    def get_user(self, token):
        return {"id": "user-1"}

    def load_playable_words(self, token):
        return self.words

    def load_q_values(self, token, user_id, state_key):
        return self.q_values.get(state_key, {})

    def load_word_stats(self, token, user_id, word_id):
        return self.stats.get(word_id)

    def load_word_stats_for_words(self, token, user_id, word_ids):
        return {
            word_id: self.stats[word_id]
            for word_id in word_ids
            if word_id in self.stats
        }

    def upsert_q_value(self, token, user_id, word_id, state_key, q_value):
        self.saved_q_values.append((word_id, state_key, q_value))
        self.q_values.setdefault(state_key, {})[word_id] = q_value

    def upsert_word_stats(self, token, payload):
        self.saved_stats.append(payload)
        self.stats[payload["word_id"]] = payload

    def insert_answer_log(self, token, payload):
        self.saved_answer_logs.append(payload)


def answer_current_round(service, session_id, token="token"):
    session = service.sessions[session_id]
    word_id = session.current_round["wordId"]
    return service.answer(token, session_id, word_id, word_id)


class GameServiceTest(unittest.TestCase):
    def test_bandit_updates_q_value(self):
        bandit = MultiArmedBandit(alpha=0.1, epsilon=0)
        bandit.update_table("state", "word", 5)

        self.assertEqual(bandit.get_q_value("state", "word"), 0.5)

    def test_bandit_selects_highest_thompson_sampled_action(self):
        bandit = MultiArmedBandit(alpha=0.1)

        with patch("game.bandit.random.betavariate", side_effect=[0.25, 0.75]):
            self.assertEqual(
                bandit.select(
                    ["low", "high"],
                    {"low": (1, 4), "high": (4, 1)},
                ),
                "high",
            )

    def test_bandit_adds_review_priority_to_sample(self):
        bandit = MultiArmedBandit(alpha=0.1)

        with patch("game.bandit.random.betavariate", side_effect=[0.7, 0.2]):
            self.assertEqual(
                bandit.select(
                    ["recent", "stale"],
                    {"recent": (1, 1), "stale": (1, 1)},
                    {"stale": 0.6},
                ),
                "stale",
            )

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

    def test_beta_params_use_loaded_counts_without_incrementing_history(self):
        service = GameService(FakeSupabase())

        self.assertEqual(service._beta_params(None), (1.0, 1.0))
        self.assertEqual(
            service._beta_params({"times_wrong": 3, "times_correct": 7}),
            (3, 7),
        )
        self.assertEqual(
            service._beta_params({"times_wrong": 0, "times_correct": 7}),
            (1.0, 7),
        )

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

    def test_thompson_sampling_uses_loaded_word_stats(self):
        fake = FakeSupabase()
        fake.stats = {
            "one": {"times_correct": 8, "times_wrong": 1, "last_answered_at": None},
            "two": {"times_correct": 1, "times_wrong": 8, "last_answered_at": None},
            "three": {"times_correct": 4, "times_wrong": 4, "last_answered_at": None},
        }
        service = GameService(fake)

        with patch("game.bandit.random.betavariate", side_effect=[0.1, 0.9, 0.5]):
            started = service.start_session("token")

        self.assertEqual(started["round"]["wordId"], "two")

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
