from fastapi import APIRouter
from groq import Groq
from dotenv import load_dotenv
import os

# ====================================
# LOAD ENV
# ====================================

load_dotenv()

# ====================================
# GROQ CLIENT
# ====================================

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# ====================================
# ROUTER
# ====================================

router = APIRouter()

# ====================================
# AI INSIGHTS ENDPOINT
# ====================================

@router.post("/ai-insights")
async def ai_insights(data: dict):

    trades = data.get("trades", [])

    prompt = f"""
    You are an AI trading coach.

    Analyze the following trade journal data.

    Give:
    1. strengths
    2. weaknesses
    3. emotional mistakes
    4. setup observations
    5. risk management advice

    Keep the response concise and practical.

    Trade Data:
    {trades}
    """

    completion = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.7,
    )

    response = (
        completion
        .choices[0]
        .message
        .content
    )

    return {
        "insights": response
    }