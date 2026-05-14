from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

CATEGORIES = ["shoes", "accessories", "makeup", "clothing", "other"]


class ItemCreate(BaseModel):
    url: str
    category: str = "other"
    target_price: Optional[float] = None


class ItemUpdate(BaseModel):
    category: Optional[str] = None
    target_price: Optional[float] = None
    is_active: Optional[bool] = None


class PriceHistoryResponse(BaseModel):
    id: int
    price: float
    is_on_sale: bool
    checked_at: datetime

    model_config = {"from_attributes": True}


class ItemResponse(BaseModel):
    id: int
    url: str
    name: Optional[str] = None
    image_url: Optional[str] = None
    retailer: Optional[str] = None
    category: str
    original_price: Optional[float] = None
    current_price: Optional[float] = None
    target_price: Optional[float] = None
    currency: str
    is_active: bool
    is_on_sale: bool
    sale_percentage: Optional[float] = None
    last_checked: Optional[datetime] = None
    created_at: datetime
    price_history: List[PriceHistoryResponse] = []

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    notification_email: Optional[str] = None
    gmail_user: Optional[str] = None
    gmail_app_password: Optional[str] = None
    check_interval_hours: Optional[int] = None
    min_discount_percent: Optional[int] = None


class SettingsResponse(BaseModel):
    notification_email: Optional[str] = None
    gmail_user: Optional[str] = None
    check_interval_hours: int
    min_discount_percent: int

    model_config = {"from_attributes": True}
