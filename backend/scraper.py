import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page

logger = logging.getLogger(__name__)


@dataclass
class ProductInfo:
    name: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    image_url: Optional[str] = None
    is_on_sale: bool = False
    currency: str = "USD"
    retailer: Optional[str] = None


def get_retailer(url: str) -> str:
    domain = urlparse(url).netloc.lower().replace("www.", "")
    for name in ["nordstrom", "sephora", "macys", "zara", "amazon", "target"]:
        if name in domain:
            return name
    return domain.split(".")[0]


def parse_price(text: str) -> Optional[float]:
    if not text:
        return None
    cleaned = re.sub(r"[^\d.]", "", text.strip())
    # Handle cases like "1.234.56" (European format) → take last valid float
    parts = cleaned.split(".")
    if len(parts) > 2:
        cleaned = parts[0] + "." + "".join(parts[1:])
    try:
        val = float(cleaned)
        return val if val > 0 else None
    except (ValueError, TypeError):
        return None


async def extract_json_ld(page: Page) -> Optional[ProductInfo]:
    scripts = await page.query_selector_all('script[type="application/ld+json"]')
    for script in scripts:
        try:
            text = await script.inner_text()
            data = json.loads(text)
            candidates = data if isinstance(data, list) else [data]
            # Also check @graph
            for candidate in candidates:
                if isinstance(candidate, dict) and "@graph" in candidate:
                    candidates = candidates + candidate["@graph"]
            for item in candidates:
                if not isinstance(item, dict):
                    continue
                if item.get("@type") != "Product":
                    continue
                info = ProductInfo()
                info.name = item.get("name")

                image = item.get("image")
                if isinstance(image, list) and image:
                    info.image_url = image[0] if isinstance(image[0], str) else image[0].get("url")
                elif isinstance(image, str):
                    info.image_url = image
                elif isinstance(image, dict):
                    info.image_url = image.get("url")

                offers = item.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}

                price_val = offers.get("price") or offers.get("lowPrice")
                if price_val is not None:
                    try:
                        info.price = float(str(price_val))
                    except (ValueError, TypeError):
                        pass

                high_price = offers.get("highPrice")
                if high_price and info.price:
                    try:
                        hp = float(str(high_price))
                        if hp > info.price:
                            info.original_price = hp
                            info.is_on_sale = True
                    except (ValueError, TypeError):
                        pass

                info.currency = offers.get("priceCurrency", "USD")

                if info.name and info.price:
                    return info
        except Exception:
            continue
    return None


async def extract_open_graph(page: Page) -> Optional[ProductInfo]:
    info = ProductInfo()
    try:
        info.name = await page.get_attribute('meta[property="og:title"]', "content")
        info.image_url = await page.get_attribute('meta[property="og:image"]', "content")

        for attr in ['product:price:amount', 'og:price:amount']:
            price_str = await page.get_attribute(f'meta[property="{attr}"]', "content")
            if price_str:
                info.price = parse_price(price_str)
                break

        currency = await page.get_attribute('meta[property="product:price:currency"]', "content")
        if currency:
            info.currency = currency
    except Exception:
        pass
    return info if (info.name and info.price) else None


# Retailer-specific CSS selectors (fallback when structured data isn't available)
RETAILER_SELECTORS: dict = {
    "nordstrom": {
        "price": [
            '[data-testid="sale-price"]',
            ".price__sale",
            '[data-testid="price"]',
            ".price-component__price",
            '[class*="SalePriceStyle"]',
        ],
        "original_price": ['[data-testid="original-price"]', ".price__original"],
        "name": ['h1[data-test="product-title"]', ".product-page-description-title h1", "h1"],
        "image": ['.primary-image img[src]', '[data-testid="product-image"] img[src]'],
    },
    "sephora": {
        "price": ['[data-comp="Price"] b', ".css-68u28a", '[data-testid="price"]', '[class*="price"]'],
        "name": ['[data-comp="DisplayName"] span', 'span[data-at="sku-item-name"]', "h1"],
        "image": ['[data-comp="PrimaryImage"] img[src]', '[class*="ProductImage"] img[src]'],
    },
    "macys": {
        "price": ["#lowest-sale-price", ".lowest-sale-price", '[data-auto="sale-price"]', ".product-price .sale"],
        "original_price": ["#original-price", ".original-price"],
        "name": ["h1.pdp-product-name", '[itemprop="name"]', "h1"],
        "image": ["#mainImgHero img[src]", ".product-image img[src]"],
    },
    "zara": {
        "price": [
            ".price__amount .money-amount__main",
            ".price-current__amount",
            '[class*="price"] [class*="amount"]',
        ],
        "name": [".product-detail-info__header-name", "h1"],
        "image": [".media-image__image[src]", ".product-detail-images img[src]"],
    },
    "amazon": {
        "price": [
            "#priceblock_dealprice",
            "#priceblock_saleprice",
            ".reinventPricePriceToPayMargin .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
            ".a-price[data-a-size='xl'] .a-offscreen",
            "#price_inside_buybox",
        ],
        "original_price": [".a-text-price .a-offscreen", "#priceblock_ourprice"],
        "name": ["#productTitle"],
        "image": ["#landingImage[src]", "#imgBlkFront[src]"],
    },
    "target": {
        "price": ['[data-test="product-price"]', '[data-test="current-price"]'],
        "name": ['[data-test="product-title"] h1', "h1"],
        "image": ['[data-test="product-image"] img[src]'],
    },
}


async def _try_text_selectors(page: Page, selectors: list) -> Optional[str]:
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if await loc.count() > 0:
                text = (await loc.inner_text()).strip()
                if text:
                    return text
        except Exception:
            continue
    return None


async def _try_img_selectors(page: Page, selectors: list) -> Optional[str]:
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if await loc.count() > 0:
                src = await loc.get_attribute("src")
                if src and src.startswith("http"):
                    return src
        except Exception:
            continue
    return None


async def extract_with_selectors(page: Page, retailer: str) -> Optional[ProductInfo]:
    config = RETAILER_SELECTORS.get(retailer)
    if not config:
        return None

    info = ProductInfo()
    info.name = await _try_text_selectors(page, config.get("name", []))
    price_text = await _try_text_selectors(page, config.get("price", []))
    if price_text:
        info.price = parse_price(price_text)
    orig_text = await _try_text_selectors(page, config.get("original_price", []))
    if orig_text:
        info.original_price = parse_price(orig_text)
    info.image_url = await _try_img_selectors(page, config.get("image", []))

    if info.original_price and info.price and info.original_price > info.price:
        info.is_on_sale = True

    return info if (info.name or info.price) else None


async def scrape_product(url: str) -> ProductInfo:
    retailer = get_retailer(url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )
        # Remove automation indicators
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            # Let JS-heavy sites finish rendering
            await page.wait_for_timeout(2500)

            info = None

            # 1. JSON-LD structured data (most reliable)
            info = await extract_json_ld(page)

            # 2. Open Graph meta tags
            if not info:
                info = await extract_open_graph(page)

            # 3. Site-specific CSS selectors
            if not info:
                info = await extract_with_selectors(page, retailer)

            if not info:
                # Minimal fallback — at least record the page title
                title = await page.title()
                info = ProductInfo(name=title)

            info.retailer = retailer
            if info.original_price and info.price and info.original_price > info.price:
                info.is_on_sale = True

            return info
        finally:
            await browser.close()
