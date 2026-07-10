import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, reset_url: str) -> None:
    settings = get_settings()
    if settings.email_mode == "smtp":
        _send_smtp_password_reset_email(email, reset_url)
        return

    logger.warning("Local development password reset URL for %s: %s", email, reset_url)


def _send_smtp_password_reset_email(email: str, reset_url: str) -> None:
    settings = get_settings()
    missing = [
        name
        for name, value in {
            "SMTP_HOST": settings.smtp_host,
            "SMTP_USERNAME": settings.smtp_username,
            "SMTP_PASSWORD": settings.smtp_password,
            "SMTP_FROM": settings.smtp_from,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"SMTP email mode is missing required settings: {', '.join(missing)}")

    message = EmailMessage()
    message["Subject"] = "Reset your Deximon password"
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_from))
    message["To"] = email
    reset_url_html = escape(reset_url, quote=True)
    message.set_content(
        "\n".join(
            [
                "We received a request to reset your Deximon password.",
                "",
                "Open this link to choose a new password:",
                reset_url,
                "",
                "This link will expire soon. If you did not request a reset, you can ignore this email.",
            ]
        )
    )
    message.add_alternative(
        f"""
        <html>
          <body>
            <p>We received a request to reset your Deximon password.</p>
            <p><a href="{reset_url_html}">Reset your password</a></p>
            <p>This link will expire soon. If you did not request a reset, you can ignore this email.</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
