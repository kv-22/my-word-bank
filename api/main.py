import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.game_service import GameService
from api.schemas import AnswerRequest
from api.supabase_client import SupabaseClient, SupabaseError

load_dotenv()

def _allowed_origins() -> list[str]:
    configured = os.getenv("BANDIT_CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return ["http://localhost:8080", "http://127.0.0.1:8080"]


app = FastAPI(title="Ostracon Bandit API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = SupabaseClient(
    url=os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL"),
    key=(
        os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    ),
)
game_service = GameService(supabase)


def auth_token(authorization: str = Header(default="")) -> str:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return token


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/game/sessions")
def start_session(token: str = Depends(auth_token)):
    try:
        return game_service.start_session(token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/game/sessions/{session_id}/answers")
def answer(session_id: str, request: AnswerRequest, token: str = Depends(auth_token)):
    try:
        return game_service.answer(
            token,
            session_id,
            request.wordId,
            request.selectedOptionWordId,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/game/sessions/{session_id}/end")
def end_session(session_id: str, token: str = Depends(auth_token)):
    try:
        return game_service.end_session(token, session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
