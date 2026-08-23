.PHONY: install dev run test seed lint docker-up docker-down

install:
	pip install -e ".[dev]"

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v

seed:
	python scripts/seed.py

lint:
	ruff check app tests

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down
