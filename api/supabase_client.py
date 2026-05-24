import json
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class SupabaseError(RuntimeError):
    pass


class SupabaseClient:
    def __init__(self, url: str | None = None, key: str | None = None):
        if not url or not key:
            raise SupabaseError("SUPABASE_URL and SUPABASE_ANON_KEY are required")
        self.url = url.rstrip("/")
        self.key = key

    def _headers(self, token: str, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _request(
        self,
        method: str,
        path: str,
        token: str,
        body: Any | None = None,
        prefer: str | None = None,
    ) -> Any:
        data = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(
            f"{self.url}{path}",
            data=data,
            headers=self._headers(token, prefer),
            method=method,
        )
        try:
            with urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8")
        except Exception as exc:
            raise SupabaseError(str(exc)) from exc
        if not raw:
            return None
        return json.loads(raw)

    def get_user(self, token: str) -> dict[str, Any]:
        return self._request("GET", "/auth/v1/user", token)

    def load_playable_words(self, token: str) -> list[dict[str, Any]]:
        query = urlencode(
            {
                "select": "id,word,definition",
                "definition": "not.eq.",
                "order": "created_at.desc",
            }
        )
        rows = self._request("GET", f"/rest/v1/words?{query}", token)
        return [row for row in rows if row.get("definition", "").strip()]

    def load_q_values(self, token: str, user_id: str, state_key: dict[str, bool]) -> dict[str, float]:
        query = urlencode(
            {
                "select": "word_id,q_value",
                "user_id": f"eq.{user_id}",
                "wrong_streak": f"eq.{str(state_key['wrong_streak']).lower()}",
                "correct_streak": f"eq.{str(state_key['correct_streak']).lower()}",
            }
        )
        rows = self._request("GET", f"/rest/v1/bandit_q_values?{query}", token)
        return {row["word_id"]: float(row["q_value"]) for row in rows}

    def load_all_q_values(self, token: str, user_id: str) -> dict[tuple[bool, bool], dict[str, float]]:
        query = urlencode(
            {
                "select": "word_id,q_value,wrong_streak,correct_streak",
                "user_id": f"eq.{user_id}",
            }
        )
        rows = self._request("GET", f"/rest/v1/bandit_q_values?{query}", token)
        q_values: dict[tuple[bool, bool], dict[str, float]] = {
            (False, False): {},
            (False, True): {},
            (True, False): {},
            (True, True): {},
        }
        for row in rows:
            state_tuple = (bool(row["wrong_streak"]), bool(row["correct_streak"]))
            q_values[state_tuple][row["word_id"]] = float(row["q_value"])
        return q_values

    def load_word_stats(self, token: str, user_id: str, word_id: str) -> dict[str, Any] | None:
        query = urlencode(
            {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "word_id": f"eq.{word_id}",
                "limit": "1",
            }
        )
        rows = self._request("GET", f"/rest/v1/bandit_word_stats?{query}", token)
        return rows[0] if rows else None

    def record_answer(self, token: str, payload: dict[str, Any]) -> None:
        self._request(
            "POST",
            "/rest/v1/rpc/record_bandit_answer",
            token,
            payload,
        )

    def upsert_q_value(
        self,
        token: str,
        user_id: str,
        word_id: str,
        state_key: dict[str, bool],
        q_value: float,
    ) -> None:
        query = urlencode({"on_conflict": "user_id,word_id,wrong_streak,correct_streak"})
        self._request(
            "POST",
            f"/rest/v1/bandit_q_values?{query}",
            token,
            {
                "user_id": user_id,
                "word_id": word_id,
                "wrong_streak": state_key["wrong_streak"],
                "correct_streak": state_key["correct_streak"],
                "q_value": q_value,
            },
            prefer="resolution=merge-duplicates",
        )

    def upsert_word_stats(self, token: str, payload: dict[str, Any]) -> None:
        query = urlencode({"on_conflict": "user_id,word_id"})
        self._request(
            "POST",
            f"/rest/v1/bandit_word_stats?{query}",
            token,
            payload,
            prefer="resolution=merge-duplicates",
        )

    def insert_answer_log(self, token: str, payload: dict[str, Any]) -> None:
        self._request(
            "POST",
            "/rest/v1/bandit_answer_logs",
            token,
            payload,
        )
