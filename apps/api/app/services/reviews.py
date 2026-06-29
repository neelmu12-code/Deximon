from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.review import SellerReview


def _to_rating(avg: float | None, count: int | None) -> tuple[float | None, int]:
    review_count = int(count or 0)
    if not review_count or avg is None:
        return None, review_count
    return round(float(avg), 1), review_count


def seller_rating(db: Session, seller_id: UUID) -> tuple[float | None, int]:
    avg, count = db.execute(
        select(func.avg(SellerReview.rating), func.count())
        .where(SellerReview.seller_id == seller_id)
    ).one()
    return _to_rating(avg, count)


def seller_ratings(
    db: Session, seller_ids: Iterable[UUID]
) -> dict[UUID, tuple[float | None, int]]:
    """Aggregate ratings for many sellers in one query.

    Use this on list endpoints (e.g. the marketplace feed) instead of calling
    seller_rating per row, which fires an avg+count query for every listing.
    Sellers with no reviews are simply absent from the result.
    """
    ids = list(seller_ids)
    if not ids:
        return {}
    rows = db.execute(
        select(SellerReview.seller_id, func.avg(SellerReview.rating), func.count())
        .where(SellerReview.seller_id.in_(ids))
        .group_by(SellerReview.seller_id)
    ).all()
    return {seller_id: _to_rating(avg, count) for seller_id, avg, count in rows}
