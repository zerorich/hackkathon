.PHONY: install dev run test seed lint docker-up docker-down

install:
	pip install -e ".[dev]"

dev:
	uvicorn server.main:app --reload --host 0.0.0.0 --port 8000

run:
	uvicorn server.main:app --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v

seed:
	python scripts/seed.py

lint:
	ruff check server tests

docker-up:
	docker compose -f ../docker-compose.yml up -d --build

docker-down:
	docker compose -f ../docker-compose.yml down
