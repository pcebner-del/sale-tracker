from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = "sqlite:///./sale_tracker.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(Text, nullable=False)
    name = Column(String(500))
    image_url = Column(Text)
    retailer = Column(String(100))
    category = Column(String(50), default="other")
    original_price = Column(Float)
    current_price = Column(Float)
    target_price = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    is_active = Column(Boolean, default=True)
    is_on_sale = Column(Boolean, default=False)
    sale_percentage = Column(Float, nullable=True)
    last_checked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    price_history = relationship("PriceHistory", back_populates="item", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    price = Column(Float, nullable=False)
    is_on_sale = Column(Boolean, default=False)
    checked_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item", back_populates="price_history")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    notification_email = Column(String(200), default="mcastroebner@gmail.com")
    gmail_user = Column(String(200), nullable=True)
    gmail_app_password = Column(String(200), nullable=True)
    check_interval_hours = Column(Integer, default=4)
    min_discount_percent = Column(Integer, default=0)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_settings(db):
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
