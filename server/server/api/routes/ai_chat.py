from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query, Response

from server.api.deps import CurrentUser, DbSession, require_roles
from server.core.enums import UserRole
from server.core.errors import success_response
from server.schemas.chat import (
    ChatConversationOut,
    ChatCreateBody,
    ChatMessageOut,
    ChatSendBody,
)
from server.services.chat import AiChatService

router = APIRouter(tags=["ai-chat"])
ChatUser = Annotated[
    CurrentUser,
    require_roles(UserRole.STUDENT, UserRole.TEACHER),
]


def _conversation_out(conversation) -> dict:
    return ChatConversationOut.model_validate(conversation).model_dump(mode="json")


def _message_out(message) -> dict:
    return ChatMessageOut.model_validate(message).model_dump(mode="json")


@router.post("/conversations", status_code=201)
async def create_conversation(body: ChatCreateBody, user: ChatUser, db: DbSession):
    conversation = await AiChatService(db).create(user, body.title)
    return success_response(_conversation_out(conversation))


@router.get("/conversations")
async def list_conversations(
    user: ChatUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items = await AiChatService(db).list(user, limit=limit, offset=offset)
    return success_response({"items": [_conversation_out(item) for item in items]})


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, user: ChatUser, db: DbSession):
    conversation = await AiChatService(db).get_owned(user, conversation_id)
    return success_response(_conversation_out(conversation))


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str, user: ChatUser, db: DbSession) -> Response:
    await AiChatService(db).delete(user, conversation_id)
    return Response(status_code=204)


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    user: ChatUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    before: Annotated[datetime | None, Query()] = None,
):
    items, next_before = await AiChatService(db).history(
        user, conversation_id, limit=limit, before=before
    )
    return success_response(
        {
            "items": [_message_out(item) for item in items],
            "next_before": next_before.isoformat() if next_before else None,
        }
    )


@router.post("/conversations/{conversation_id}/messages", status_code=201)
async def send_message(
    conversation_id: str,
    body: ChatSendBody,
    user: ChatUser,
    db: DbSession,
):
    user_message, assistant_message, fallback = await AiChatService(db).send(
        user, conversation_id, body.content
    )
    return success_response(
        {
            "user_message": _message_out(user_message),
            "assistant_message": _message_out(assistant_message),
            "fallback_used": fallback,
        }
    )
