import logging

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, reset_url: str) -> None:
    _ = email
    # TODO(email): wire SMTP/provider delivery. Until then, local dev logs the
    # reset URL so the flow is testable without exposing it in API responses.
    logger.warning("Local development password reset URL: %s", reset_url)
