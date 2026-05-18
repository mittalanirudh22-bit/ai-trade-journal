from sqlalchemy import Column, Integer, Float, String
from database import Base

class Trade(Base):

    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)

    symbol = Column(String)

    entry_price = Column(Float)

    exit_price = Column(Float)

    quantity = Column(Integer)

    pnl = Column(Float)

    trade_date = Column(String)

    setup = Column(String)

    emotion = Column(String)

    mistake = Column(String)

    notes = Column(String)