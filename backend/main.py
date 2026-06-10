from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from db.database import init_db
from api.opportunities import router as opp_router
from api.analytics import router as analytics_router
from api.agents import router as agents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Seed if empty
    from db.database import async_session
    from db.models import Opportunity
    from sqlalchemy import select, func
    async with async_session() as session:
        count = (await session.execute(select(func.count()).select_from(Opportunity))).scalar()
        if count == 0:
            import subprocess, sys
            subprocess.run([sys.executable, "seed.py"], check=False)
    yield


app = FastAPI(
    title="ImpactScout API",
    description="AI-powered SDG deal flow intelligence platform",
    version="1.0.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opp_router)
app.include_router(analytics_router)
app.include_router(agents_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ImpactScout"}
