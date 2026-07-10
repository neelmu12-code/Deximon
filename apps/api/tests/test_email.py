from email.message import EmailMessage
from types import SimpleNamespace

from app.services import email as email_service


def smtp_settings(**overrides: object) -> SimpleNamespace:
    values: dict[str, object] = {
        "email_mode": "smtp",
        "smtp_host": "email-smtp.us-east-1.amazonaws.com",
        "smtp_port": 587,
        "smtp_username": "smtp-user",
        "smtp_password": "smtp-password",
        "smtp_from": "noreply@deximon.ca",
        "smtp_from_name": "Deximon",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_console_email_mode_logs_reset_link(monkeypatch, caplog) -> None:
    monkeypatch.setattr(
        email_service,
        "get_settings",
        lambda: smtp_settings(email_mode="console"),
    )

    email_service.send_password_reset_email("misty@example.com", "https://deximon.ca/reset-password?token=abc")

    assert "Local development password reset URL" in caplog.text
    assert "https://deximon.ca/reset-password?token=abc" in caplog.text


def test_smtp_email_mode_uses_starttls_and_sends_message(monkeypatch) -> None:
    calls: list[tuple[str, object]] = []

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: int) -> None:
            calls.append(("connect", (host, port, timeout)))

        def __enter__(self) -> "FakeSMTP":
            return self

        def __exit__(self, *_exc: object) -> None:
            calls.append(("close", None))

        def starttls(self) -> None:
            calls.append(("starttls", None))

        def login(self, username: str, password: str) -> None:
            calls.append(("login", (username, password)))

        def send_message(self, message: EmailMessage) -> None:
            calls.append(("send_message", message))

    monkeypatch.setattr(email_service, "get_settings", smtp_settings)
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)

    email_service.send_password_reset_email("misty@example.com", "https://deximon.ca/reset-password?token=abc")

    assert calls[0] == ("connect", ("email-smtp.us-east-1.amazonaws.com", 587, 15))
    assert ("starttls", None) in calls
    assert ("login", ("smtp-user", "smtp-password")) in calls
    sent = next(value for name, value in calls if name == "send_message")
    assert isinstance(sent, EmailMessage)
    assert sent["To"] == "misty@example.com"
    assert sent["From"] == "Deximon <noreply@deximon.ca>"
    assert "https://deximon.ca/reset-password?token=abc" in sent.get_body(("plain",)).get_content()
