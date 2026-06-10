from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime


class Base(DeclarativeBase):
    pass


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    source = Column(String(200))
    source_url = Column(String(1000))
    published_at = Column(DateTime)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    scored_at = Column(DateTime)

    # SDG Analysis (from Claude)
    sdg_scores = Column(JSON)          # {"1": 2, "2": 8, ...}
    primary_sdgs = Column(JSON)        # [2, 13, 15]
    non_extractive_score = Column(JSON)  # {community_ownership: 7, ...}

    # Categorization
    opportunity_type = Column(String(50))   # grant|investment|partnership|procurement|other
    sector = Column(String(100))
    stage = Column(String(50))
    country = Column(String(200))
    organization = Column(String(500))
    amount_usd = Column(Float)

    # AI Reasoning
    impact_thesis = Column(Text)
    risk_flags = Column(JSON)           # ["concern1", ...]
    ai_confidence = Column(Float)

    # Pipeline
    status = Column(String(50), default="sourced")  # sourced|scoring|scored|flagged|reviewed
    is_featured = Column(Boolean, default=False)
    tags = Column(JSON)                 # ["solar", "cooperative", ...]


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String(100), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(String(50), default="running")  # running|completed|failed
    opportunities_found = Column(Integer, default=0)
    opportunities_scored = Column(Integer, default=0)
    error_message = Column(Text)
