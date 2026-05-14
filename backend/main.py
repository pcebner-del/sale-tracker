import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import Item, PriceHistory, SessionLocal, create_tables, get_db, get_or_create_settings
from .notifications import send_sale_email
from .scheduler import check_all_prices, check_item
from .schemas import CATEGORIES, ItemCreate, ItemResponse, ItemUpdate, SettingsResponse, SettingsUpdate

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()

    db = SessionLocal()
    settings = get_or_create_settings(db)
    interval = settings.check_interval_hours
    db.close()

    scheduler.add_job(check_all_prices, "interval", hours=interval, id="price_check", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started — checking prices every %d hours", interval)

    yield

    scheduler.shutdown()


app = FastAPI(title="Sale Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Items ────────────────────────────────────────────────────────────────────

@app.get("/api/categories")
def get_categories():
    return CATEGORIES


@app.get("/api/items", response_model=List[ItemResponse])
def list_items(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Item)
    if category and category != "all":
        q = q.filter(Item.category == category)
    return q.order_by(Item.created_at.desc()).all()


@app.post("/api/items", response_model=ItemResponse)
async def add_item(payload: ItemCreate, db: Session = Depends(get_db)):
    if payload.category not in CATEGORIES:
        raise HTTPException(400, f"Invalid category. Choose from: {CATEGORIES}")

    from .scraper import scrape_product
    try:
        info = await scrape_product(payload.url)
    except Exception as exc:
        raise HTTPException(422, f"Could not fetch product: {exc}")

    item = Item(
        url=payload.url,
        name=info.name,
        image_url=info.image_url,
        retailer=info.retailer,
        category=payload.category,
        original_price=info.original_price or info.price,
        current_price=info.price,
        target_price=payload.target_price,
        currency=info.currency,
        is_on_sale=info.is_on_sale,
        last_checked=datetime.utcnow(),
    )
    if info.original_price and info.price and info.original_price > info.price:
        item.sale_percentage = (info.original_price - info.price) / info.original_price * 100

    db.add(item)
    db.commit()
    db.refresh(item)

    if info.price:
        db.add(PriceHistory(item_id=item.id, price=info.price, is_on_sale=info.is_on_sale))
        db.commit()

    return item


@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@app.patch("/api/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    if payload.category is not None:
        item.category = payload.category
    if payload.target_price is not None:
        item.target_price = payload.target_price
    if payload.is_active is not None:
        item.is_active = payload.is_active
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@app.post("/api/items/{item_id}/check")
async def check_now(item_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not db.query(Item).filter(Item.id == item_id).first():
        raise HTTPException(404, "Item not found")
    background_tasks.add_task(check_item, item_id)
    return {"message": "Price check started"}


@app.post("/api/check-all")
async def check_all(background_tasks: BackgroundTasks):
    background_tasks.add_task(check_all_prices)
    return {"message": "Checking all items"}


# ── Settings ─────────────────────────────────────────────────────────────────

@app.get("/api/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@app.put("/api/settings", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    s = get_or_create_settings(db)
    if payload.notification_email is not None:
        s.notification_email = payload.notification_email
    if payload.gmail_user is not None:
        s.gmail_user = payload.gmail_user
    if payload.gmail_app_password is not None:
        s.gmail_app_password = payload.gmail_app_password
    if payload.check_interval_hours is not None:
        s.check_interval_hours = payload.check_interval_hours
        scheduler.reschedule_job("price_check", trigger="interval", hours=payload.check_interval_hours)
    if payload.min_discount_percent is not None:
        s.min_discount_percent = payload.min_discount_percent
    db.commit()
    db.refresh(s)
    return s


@app.post("/api/settings/test-email")
def test_email(db: Session = Depends(get_db)):
    s = get_or_create_settings(db)
    if not s.gmail_user or not s.gmail_app_password:
        raise HTTPException(400, "Gmail credentials not configured")
    ok = send_sale_email(
        gmail_user=s.gmail_user,
        gmail_app_password=s.gmail_app_password,
        to_email=s.notification_email,
        item_name="Test Item — Cashmere Sweater",
        retailer="nordstrom",
        old_price=120.00,
        new_price=79.99,
        item_url="https://www.nordstrom.com",
    )
    if not ok:
        raise HTTPException(500, "Failed to send test email — check your Gmail credentials")
    return {"message": f"Test email sent to {s.notification_email}"}


# ── Serve frontend (production) ───────────────────────────────────────────────

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index):
        # Serve static asset files directly
        asset = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(asset):
            return FileResponse(asset)
        return FileResponse(index)
    return HTMLResponse(
        "<h2>Frontend not built yet.</h2><p>Run: <code>cd frontend && npm install && npm run build</code></p>",
        status_code=200,
    )
