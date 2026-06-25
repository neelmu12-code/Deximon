"""SQLAlchemy ORM models. Importing this module registers every model on `Base.metadata`,
which is what Alembic's autogenerate scans."""

from app.models.binder import BinderPage, BinderSlot
from app.models.card import Card
from app.models.chat import Conversation, Message
from app.models.listing import Listing, ListingStatus
from app.models.notification import Notification, NotificationType
from app.models.review import SellerReview
from app.models.tcg_card import TcgCard
from app.models.user import PasswordResetToken, Profile, User

__all__ = [
    "User",
    "Profile",
    "PasswordResetToken",
    "Card",
    "TcgCard",
    "BinderPage",
    "BinderSlot",
    "Listing",
    "ListingStatus",
    "Conversation",
    "Message",
    "Notification",
    "NotificationType",
    "SellerReview",
]
