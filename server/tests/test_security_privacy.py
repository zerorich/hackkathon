from __future__ import annotations

import pytest
from httpx import AsyncClient

from server.core.enums import MembershipRole, UserRole
from server.core.security import create_access_token
from server.models.entities import (
    Attempt,
    Challenge,
    ClassMembership,
    SchoolClass,
    Subject,
    Topic,
    User,
)


@pytest.mark.asyncio
async def test_teacher_cannot_read_attempt_from_another_class(client: AsyncClient, session_factory):
    async with session_factory() as db:
        owner = User(
            identifier="owner-teacher@example.com",
            display_name="Owner",
            role=UserRole.TEACHER,
        )
        outsider = User(
            identifier="outsider-teacher@example.com",
            display_name="Outsider",
            role=UserRole.TEACHER,
        )
        student = User(
            identifier="private-student@example.com",
            display_name="Student",
            role=UserRole.STUDENT,
        )
        db.add_all([owner, outsider, student])
        await db.flush()

        school_class = SchoolClass(name="Private class", grade="8", created_by_id=owner.id)
        db.add(school_class)
        await db.flush()
        db.add_all(
            [
                ClassMembership(
                    class_id=school_class.id,
                    user_id=owner.id,
                    role=MembershipRole.TEACHER,
                ),
                ClassMembership(
                    class_id=school_class.id,
                    user_id=student.id,
                    role=MembershipRole.STUDENT,
                ),
            ]
        )
        subject = Subject(
            class_id=school_class.id,
            name="Math",
            created_by_id=owner.id,
        )
        db.add(subject)
        await db.flush()
        topic = Topic(subject_id=subject.id, title="Private topic", created_by_id=owner.id)
        db.add(topic)
        await db.flush()
        challenge = Challenge(
            topic_id=topic.id,
            created_by_id=owner.id,
            title="Private challenge",
            question_count=0,
        )
        db.add(challenge)
        await db.flush()
        attempt = Attempt(
            challenge_id=challenge.id,
            user_id=student.id,
            class_id=school_class.id,
        )
        db.add(attempt)
        await db.commit()
        attempt_id = attempt.id
        outsider_token = create_access_token(user_id=outsider.id, role=outsider.role)

    response = await client.get(
        f"/api/v1/attempts/{attempt_id}",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
