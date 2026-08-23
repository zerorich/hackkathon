FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY requirements.lock ./
COPY STACK.md ./
COPY alembic.ini ./
COPY migrations ./migrations
COPY server ./server
COPY scripts ./scripts

RUN pip install --no-cache-dir --require-hashes -r requirements.lock

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && exec uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
