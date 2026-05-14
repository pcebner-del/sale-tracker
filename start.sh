#!/usr/bin/env bash
# One-command launcher for Sale Tracker (production mode)
set -e
cd "$(dirname "$0")"

VENV="backend/.venv"

# ── Python environment ─────────────────────────────────────────────────────
if [ ! -d "$VENV" ]; then
  echo "→ Creating Python virtual environment..."
  python3 -m venv "$VENV"
  source "$VENV/bin/activate"
  echo "→ Installing Python dependencies..."
  pip install -q -r backend/requirements.txt
  echo "→ Installing Playwright Chromium browser..."
  playwright install chromium
else
  source "$VENV/bin/activate"
fi

# ── Frontend ──────────────────────────────────────────────────────────────
if [ ! -d "frontend/node_modules" ]; then
  echo "→ Installing frontend dependencies..."
  cd frontend && npm install --silent && cd ..
fi

echo "→ Building frontend..."
cd frontend && npm run build --silent && cd ..

# ── Launch ─────────────────────────────────────────────────────────────────
echo ""
echo "✓ Sale Tracker is running at: http://localhost:8000"
echo "  (Press Ctrl+C to stop)"
echo ""
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
