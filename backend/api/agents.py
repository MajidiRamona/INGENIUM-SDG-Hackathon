from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from db.database import get_db, async_session
from db.models import AgentRun
from datetime import datetime

router = APIRouter(prefix="/api/agents", tags=["agents"])

AGENT_REGISTRY = {
    "rss_agent": {
        "name": "rss_agent",
        "display_name": "Impact News RSS",
        "description": "Scrapes ImpactAlpha, NextBillion, Devex, SSIR, and other impact news RSS feeds",
        "sources": ["ImpactAlpha", "NextBillion", "Devex", "SSIR", "Alliance Magazine", "Pioneers Post"],
    },
    "worldbank_agent": {
        "name": "worldbank_agent",
        "display_name": "World Bank Projects",
        "description": "Queries the World Bank Projects API for active SDG-aligned investments",
        "sources": ["World Bank Projects API"],
    },
}


@router.get("")
async def list_agents(db: AsyncSession = Depends(get_db)):
    agents = []
    for key, meta in AGENT_REGISTRY.items():
        last_run = (await db.execute(
            select(AgentRun)
            .where(AgentRun.agent_name == key)
            .order_by(desc(AgentRun.started_at))
            .limit(1)
        )).scalar_one_or_none()

        agents.append({
            **meta,
            "last_run": _serialize_run(last_run) if last_run else None,
        })
    return agents


@router.post("/{agent_name}/run")
async def trigger_agent(
    agent_name: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if agent_name not in AGENT_REGISTRY:
        raise HTTPException(404, f"Agent '{agent_name}' not found")

    # Check if already running
    existing = (await db.execute(
        select(AgentRun)
        .where(AgentRun.agent_name == agent_name, AgentRun.status == "running")
        .limit(1)
    )).scalar_one_or_none()

    if existing:
        return {"message": "Agent already running", "run_id": existing.id}

    background_tasks.add_task(_run_agent_task, agent_name)
    return {"message": f"Agent '{agent_name}' started"}


@router.get("/{agent_name}/runs")
async def agent_run_history(agent_name: str, db: AsyncSession = Depends(get_db)):
    if agent_name not in AGENT_REGISTRY:
        raise HTTPException(404, "Agent not found")
    result = await db.execute(
        select(AgentRun)
        .where(AgentRun.agent_name == agent_name)
        .order_by(desc(AgentRun.started_at))
        .limit(20)
    )
    return [_serialize_run(r) for r in result.scalars().all()]


async def _run_agent_task(agent_name: str):
    async with async_session() as session:
        if agent_name == "rss_agent":
            from agents.rss_agent import RSSAgent
            agent = RSSAgent(session)
        elif agent_name == "worldbank_agent":
            from agents.worldbank_agent import WorldBankAgent
            agent = WorldBankAgent(session)
        else:
            return
        await agent.execute()


def _serialize_run(r: AgentRun) -> dict:
    return {
        "id": r.id,
        "agent_name": r.agent_name,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "status": r.status,
        "opportunities_found": r.opportunities_found,
        "opportunities_scored": r.opportunities_scored,
        "error_message": r.error_message,
    }
