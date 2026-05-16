from pydantic import BaseModel


class AnswerRequest(BaseModel):
    wordId: str
    selectedOptionWordId: str


class WordOption(BaseModel):
    wordId: str
    definition: str


class Round(BaseModel):
    wordId: str
    word: str
    options: list[WordOption]


class Summary(BaseModel):
    answered: int
    correct: int
    wrong: int
    correctStreak: int


class StartSessionResponse(BaseModel):
    sessionId: str
    round: Round
    summary: Summary


class AnswerResult(BaseModel):
    correct: bool
    correctOptionWordId: str
    selectedOptionWordId: str


class AnswerResponse(BaseModel):
    result: AnswerResult
    reward: float
    updatedQValue: float
    nextRound: Round | None
    summary: Summary
    sessionComplete: bool


class EndSessionResponse(BaseModel):
    summary: Summary
