#!/usr/bin/env bash
# Development mode: hot-reload backend + Vite dev server
set -e
cd "$(dirname "$0")"

VENV="backend/.venv"

if [ ! -d "$VENV" ]; then
  echo "→ Run ./start.sh first to set up dependencies"
  exit 1
fi

source "$VENV/bin/activate"

if [ ! -d "frontend/node_modules" ]; then
  echo "→ Installing frontend dependencies..."
  cd frontend && npm install --silent && cd ..
fi

echo "→ Starting backend on :8000 and frontend dev server on :5173"
echo "  Open http://localhost:5173 in your browser"
echo "  (Ctrl+C to stop both)"
echo ""

# Run both concurrently
trap 'kill %1 %2 2>/dev/null; exit' INT TERM
python -m uvicorn backend.main:app --reload --port 8000 &
(cd frontend && npm run dev) &
wait
