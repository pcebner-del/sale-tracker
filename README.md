# Sale Tracker

A web app that monitors product prices across major retail stores (Nordstrom, makeup stores, shoe stores, etc.) and sends notifications when items go on sale.

## Features

- **Multi-store monitoring**: Tracks prices across Nordstrom, makeup retailers, shoe stores, and more
- **Real-time notifications**: Get alerted when items you're watching go on sale
- **Product management**: Add products to your watchlist with details and pricing history
- **Price history tracking**: View historical price data to spot sale trends
- **Scheduled price checks**: Automatic price monitoring on configurable intervals

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Backend**: FastAPI + SQLAlchemy + APScheduler
- **Database**: SQLite

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- pip

### Development

1. **Install dependencies**

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt
```

2. **Start development servers**

```bash
# From the project root
bash dev.sh
```

The frontend will be available at `http://localhost:5173`  
The backend API will be at `http://localhost:8000`

## Project Structure

```
sale-tracker/
├── frontend/          # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/           # FastAPI backend
│   ├── main.py        # FastAPI app
│   ├── scraper.py     # Price scraping logic
│   ├── database.py    # Database models
│   ├── scheduler.py   # Scheduled tasks
│   ├── notifications.py # Alert system
│   └── schemas.py     # Pydantic schemas
└── sale_tracker.db    # SQLite database
```

## License

MIT License - see LICENSE file for details
