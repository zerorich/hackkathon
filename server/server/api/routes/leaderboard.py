from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Query

from server.api.deps import CurrentUser, DbSession
from server.core.errors import success_response
from server.services.domain import LeaderboardService, MembershipService

router = APIRouter(tags=["leaderboard"])


@router.get("/classes/{class_id}/leaderboard")
async def class_leaderboard(
    class_id: str,
    user: CurrentUser,
    db: DbSession,
    period: Annotated[Literal["week", "all"], Query()] = "all",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    await MembershipService(db).get_class_for_user(user, class_id)
    payload = await LeaderboardService(db).for_class(
        user, class_id, period=period, limit=limit
    )
    return success_response(payload)
