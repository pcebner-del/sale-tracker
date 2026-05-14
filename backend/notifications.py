import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)


def send_sale_email(
    gmail_user: str,
    gmail_app_password: str,
    to_email: str,
    item_name: str,
    retailer: str,
    old_price: float,
    new_price: float,
    item_url: str,
    image_url: Optional[str] = None,
    target_price: Optional[float] = None,
) -> bool:
    savings = old_price - new_price
    savings_pct = (savings / old_price * 100) if old_price else 0

    subject = f"Sale Alert: {item_name[:60]} — {savings_pct:.0f}% off!"

    img_html = (
        f'<img src="{image_url}" style="max-width:280px;border-radius:8px;margin-bottom:16px;display:block;" alt="">'
        if image_url
        else ""
    )
    target_html = (
        f'<p style="color:#16a34a;font-weight:600;margin:8px 0;">✓ Hit your target price of ${target_price:.2f}!</p>'
        if target_price and new_price <= target_price
        else ""
    )

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <h2 style="margin:0 0 20px;color:#111827;font-size:22px;">Sale Alert 🏷️</h2>
  {img_html}
  <p style="color:#6b7280;font-size:13px;text-transform:capitalize;margin:0 0 4px;">{retailer}</p>
  <h3 style="margin:0 0 16px;color:#111827;font-size:17px;line-height:1.4;">{item_name}</h3>
  <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
    <span style="font-size:32px;font-weight:700;color:#dc2626;">${new_price:.2f}</span>
    <span style="font-size:18px;color:#9ca3af;text-decoration:line-through;">${old_price:.2f}</span>
    <span style="background:#fef2f2;color:#dc2626;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600;">{savings_pct:.0f}% off</span>
  </div>
  <p style="color:#374151;margin:0 0 4px;">You save <strong>${savings:.2f}</strong></p>
  {target_html}
  <a href="{item_url}" style="display:inline-block;margin-top:20px;background:#111827;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Shop Now →</a>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:11px;margin:0;">You're tracking this item in Sale Tracker. Remove it from the app to stop alerts.</p>
</div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = gmail_user
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_app_password)
            server.sendmail(gmail_user, to_email, msg.as_string())
        logger.info("Sale email sent to %s for: %s", to_email, item_name)
        return True
    except Exception as exc:
        logger.error("Failed to send sale email: %s", exc)
        return False
