from __future__ import annotations

from fastapi import APIRouter

from server.api.routes import (
    admin,
    ai_chat,
    attempts,
    challenges,
    duels,
    health,
    leaderboard,
    me,
    teacher,
)
from server.api.v1 import auth, classes, subjects

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(ai_chat.router, prefix="/ai/chat", tags=["ai-chat"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
api_router.include_router(subjects.router, tags=["subjects"])
api_router.include_router(challenges.router, tags=["challenges"])
api_router.include_router(attempts.router, tags=["attempts"])
api_router.include_router(duels.router, prefix="/duels", tags=["duels"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(leaderboard.router, tags=["leaderboard"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["teacher"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
