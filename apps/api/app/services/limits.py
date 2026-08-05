from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application_counter import ApplicationCounter
from app.models.user import User

ACCOUNT_COUNTER_KEY = "total_accounts"
DAILY_AWS_SCAN_COUNTER_KEY = "daily_aws_scans"


class AccountCapacityError(Exception):
    """Raised when creating another account would exceed the global cap."""


@dataclass(frozen=True)
class DailyScanUsage:
    limit: int
    used: int
    remaining: int
    reset_at: datetime


class DailyScanLimitError(Exception):
    def __init__(self, usage: DailyScanUsage) -> None:
        super().__init__("The daily real-scan limit has been reached.")
        self.usage = usage


def _locked_counter(
    db: Session,
    key: str,
    *,
    initial_value: int = 0,
    period_start: date | None = None,
) -> ApplicationCounter:
    counter = db.scalar(
        select(ApplicationCounter)
        .where(ApplicationCounter.key == key)
        .with_for_update()
    )
    if counter is not None:
        return counter

    # Alembic seeds production counters. This path keeps fresh test databases
    # and manually-created development databases usable.
    counter = ApplicationCounter(
        key=key,
        value=initial_value,
        period_start=period_start,
    )
    db.add(counter)
    db.flush()
    return counter


def reserve_user_account(db: Session, limit: int) -> int:
    """Reserve one lifetime account slot in the caller's transaction."""

    existing_accounts = int(db.scalar(select(func.count(User.id))) or 0)
    counter = _locked_counter(
        db,
        ACCOUNT_COUNTER_KEY,
        initial_value=existing_accounts,
    )
    # Reconcile upward in case an older deployment created users before this
    # counter existed. Never reconcile downward after account deletion.
    counter.value = max(counter.value, existing_accounts)
    if counter.value >= limit:
        raise AccountCapacityError

    counter.value += 1
    return counter.value


def reserve_daily_aws_scan(
    db: Session,
    limit: int,
    *,
    now: datetime | None = None,
) -> DailyScanUsage:
    """Reserve one paid scanner attempt for the current UTC day."""

    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)
    current_time = current_time.astimezone(UTC)
    current_day = current_time.date()
    reset_at = datetime.combine(current_day + timedelta(days=1), time.min, tzinfo=UTC)

    counter = _locked_counter(
        db,
        DAILY_AWS_SCAN_COUNTER_KEY,
        period_start=current_day,
    )
    if counter.period_start != current_day:
        counter.period_start = current_day
        counter.value = 0

    if counter.value >= limit:
        raise DailyScanLimitError(
            DailyScanUsage(limit=limit, used=counter.value, remaining=0, reset_at=reset_at)
        )

    counter.value += 1
    return DailyScanUsage(
        limit=limit,
        used=counter.value,
        remaining=limit - counter.value,
        reset_at=reset_at,
    )
