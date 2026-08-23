from __future__ import annotations

import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)

_JSON_BLOCK = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def extract_json_payload(text: str) -> object:
    stripped = text.strip()
    if not stripped:
        raise ValueError("Empty model response")

    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    block_match = _JSON_BLOCK.search(stripped)
    if block_match:
        return json.loads(block_match.group(1).strip())

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end > start:
        return json.loads(stripped[start : end + 1])

    start = stripped.find("[")
    end = stripped.rfind("]")
    if start != -1 and end > start:
        return json.loads(stripped[start : end + 1])

    raise ValueError("Could not parse JSON from model response")


def parse_model_json(text: str, model: type[T]) -> T:
    payload = extract_json_payload(text)
    try:
        return model.model_validate(payload)
    except ValidationError as exc:
        raise ValueError(f"Model output failed schema validation: {exc}") from exc
