import asyncio
import logging
from datetime import datetime

from .database import SessionLocal, Item, PriceHistory, get_or_create_settings
from .scraper import scrape_product
from .notifications import send_sale_email

logger = logging.getLogger(__name__)


async def check_item(item_id: int) -> None:
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.id == item_id).first()
        if not item or not item.is_active:
            return

        logger.info("Checking: %s (%s)", item.name or item.url, item.retailer)

        try:
            info = await scrape_product(item.url)
        except Exception as exc:
            logger.error("Scrape failed for item %d: %s", item_id, exc)
            item.last_checked = datetime.utcnow()
            db.commit()
            return

        if not info.price:
            logger.warning("No price found for item %d", item_id)
            item.last_checked = datetime.utcnow()
            db.commit()
            return

        old_price = item.current_price
        new_price = info.price

        item.current_price = new_price
        if info.name:
            item.name = info.name
        if info.image_url:
            item.image_url = info.image_url
        item.last_checked = datetime.utcnow()

        # Determine on-sale status
        if info.original_price and info.original_price > new_price:
            item.original_price = info.original_price
            item.is_on_sale = True
            item.sale_percentage = (info.original_price - new_price) / info.original_price * 100
        elif info.is_on_sale:
            item.is_on_sale = True
        else:
            item.is_on_sale = False
            item.sale_percentage = None

        db.add(PriceHistory(item_id=item.id, price=new_price, is_on_sale=item.is_on_sale))
        db.commit()

        # Should we notify?
        settings = get_or_create_settings(db)
        comparison_price = item.original_price or old_price

        should_notify = False
        if comparison_price and new_price < comparison_price:
            drop_pct = (comparison_price - new_price) / comparison_price * 100
            if drop_pct >= settings.min_discount_percent:
                should_notify = True
        if item.target_price and new_price <= item.target_price:
            should_notify = True

        if should_notify and settings.gmail_user and settings.gmail_app_password:
            send_sale_email(
                gmail_user=settings.gmail_user,
                gmail_app_password=settings.gmail_app_password,
                to_email=settings.notification_email,
                item_name=item.name or "Unknown Item",
                retailer=item.retailer or "store",
                old_price=comparison_price or new_price,
                new_price=new_price,
                item_url=item.url,
                image_url=item.image_url,
                target_price=item.target_price,
            )
    finally:
        db.close()


async def check_all_prices() -> None:
    db = SessionLocal()
    try:
        item_ids = [r.id for r in db.query(Item.id).filter(Item.is_active == True).all()]
    finally:
        db.close()

    logger.info("Starting price check for %d items", len(item_ids))
    for i, item_id in enumerate(item_ids):
        if i > 0:
            await asyncio.sleep(3)
        await check_item(item_id)
    logger.info("Price check complete for %d items", len(item_ids))
