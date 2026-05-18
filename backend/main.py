# backend/main.py

from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

from database import SessionLocal, engine, Base
from models import Trade
from ai_insights import router as ai_router
# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ====================================
# CORS
# ====================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================
# HOME
# ====================================

@app.get("/")
def home():

    return {
        "message": "Trade Journal Backend Running"
    }

# ====================================
# UPLOAD CSV
# ====================================

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):

    contents = await file.read()

    df = pd.read_csv(
        io.StringIO(contents.decode("utf-8"))
    )

    df.columns = df.columns.str.lower()

    db = SessionLocal()

    trades_list = []

    # ====================================
    # FORMAT 1
    # entry_price / exit_price
    # ====================================

    if "entry_price" in df.columns:

        for _, row in df.iterrows():

            pnl = (
                (row["exit_price"] - row["entry_price"])
                * row["quantity"]
            )

            trade = Trade(

                symbol=row["symbol"],

                entry_price=row["entry_price"],

                exit_price=row["exit_price"],

                quantity=row["quantity"],

                pnl=pnl,

                trade_date=str(
                    row.get("date", "Unknown")
                ),

                setup=str(
                    row.get("setup", "")
                ),

                emotion=str(
                    row.get("emotion", "")
                ),

                mistake=str(
                    row.get("mistake", "")
                ),

                notes=str(
                    row.get("notes", "")
                ),
            )

            db.add(trade)

            db.flush()

            trades_list.append({

                "id": trade.id,

                "symbol": row["symbol"],

                "entry_price": row["entry_price"],

                "exit_price": row["exit_price"],

                "quantity": row["quantity"],

                "pnl": round(pnl, 2),

                "trade_date": str(
                    row.get("date", "Unknown")
                ),

                "setup": str(
                    row.get("setup", "")
                ),

                "emotion": str(
                    row.get("emotion", "")
                ),

                "mistake": str(
                    row.get("mistake", "")
                ),

                "notes": str(
                    row.get("notes", "")
                ),
            })

    # ====================================
    # FORMAT 2
    # FIFO BUY/SELL
    # ====================================

    elif "trade_type" in df.columns:

        grouped = df.groupby("symbol")

        for symbol, group in grouped:

            buy_queue = []

            group = group.reset_index(drop=True)

            for _, row in group.iterrows():

                trade_type = row["trade_type"].lower()

                quantity = int(row["quantity"])

                price = float(row["price"])

                # BUY

                if trade_type == "buy":

                    buy_queue.append({

                        "quantity": quantity,

                        "price": price,

                        "date": str(
                            row.get("date", "Unknown")
                        ),

                        "setup": str(
                            row.get("setup", "")
                        ),

                        "emotion": str(
                            row.get("emotion", "")
                        ),

                        "mistake": str(
                            row.get("mistake", "")
                        ),

                        "notes": str(
                            row.get("notes", "")
                        ),
                    })

                # SELL

                elif trade_type == "sell":

                    remaining_sell_qty = quantity

                    while (
                        remaining_sell_qty > 0
                        and len(buy_queue) > 0
                    ):

                        first_buy = buy_queue[0]

                        matched_qty = min(
                            remaining_sell_qty,
                            first_buy["quantity"]
                        )

                        pnl = (
                            (price - first_buy["price"])
                            * matched_qty
                        )

                        trade = Trade(

                            symbol=symbol,

                            entry_price=first_buy["price"],

                            exit_price=price,

                            quantity=matched_qty,

                            pnl=pnl,

                            trade_date=first_buy["date"],

                            setup=first_buy["setup"],

                            emotion=first_buy["emotion"],

                            mistake=first_buy["mistake"],

                            notes=first_buy["notes"],
                        )

                        db.add(trade)

                        db.flush()

                        trades_list.append({

                            "id": trade.id,

                            "symbol": symbol,

                            "entry_price": first_buy["price"],

                            "exit_price": price,

                            "quantity": matched_qty,

                            "pnl": round(pnl, 2),

                            "trade_date": first_buy["date"],

                            "setup": first_buy["setup"],

                            "emotion": first_buy["emotion"],

                            "mistake": first_buy["mistake"],

                            "notes": first_buy["notes"],
                        })

                        first_buy["quantity"] -= matched_qty

                        remaining_sell_qty -= matched_qty

                        if first_buy["quantity"] == 0:
                            buy_queue.pop(0)

    else:

        return {
            "error": "Unsupported CSV format"
        }

    db.commit()

    db.close()

    return {
        "trades": trades_list
    }

# ====================================
# UPDATE TRADE JOURNAL
# ====================================

@app.put("/update-trade/{trade_id}")
async def update_trade(
    trade_id: int,
    data: dict = Body(...)
):

    db = SessionLocal()

    trade = db.query(Trade).filter(
        Trade.id == trade_id
    ).first()

    if not trade:

        return {
            "error": "Trade not found"
        }

    trade.setup = data.get("setup", "")

    trade.emotion = data.get("emotion", "")

    trade.mistake = data.get("mistake", "")

    trade.notes = data.get("notes", "")

    db.commit()

    db.close()

    return {
        "message": "Trade updated"
    }

app.include_router(ai_router)