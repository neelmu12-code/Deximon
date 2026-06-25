from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.review import SellerReview


def seller_rating(db: Session, seller_id: UUID) -> tuple[float | None, int]:
    avg, count = db.execute(
        select(func.avg(SellerReview.rating), func.count())
        .where(SellerReview.seller_id == seller_id)
    ).one()
    review_count = int(count or 0)
    if not review_count or avg is None:
        return None, review_count
    return round(float(avg), 1), review_count
