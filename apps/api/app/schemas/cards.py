from pydantic import BaseModel


class CardSearchResult(BaseModel):
    id: str
    name: str
    set: str
    set_name: str
    num: str
    rarity: str
    image: str