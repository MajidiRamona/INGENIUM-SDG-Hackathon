from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from db.database import get_db
from db.models import Opportunity, AgentRun

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(Opportunity))).scalar()
    scored = (await db.execute(
        select(func.count()).select_from(Opportunity).where(Opportunity.status.in_(["scored", "flagged", "reviewed"]))
    )).scalar()
    featured = (await db.execute(
        select(func.count()).select_from(Opportunity).where(Opportunity.is_featured == True)
    )).scalar()

    # Average non-extractive score across scored opps
    result = await db.execute(
        select(Opportunity.non_extractive_score).where(Opportunity.non_extractive_score.isnot(None))
    )
    ne_scores = [r[0].get("overall", 0) for r in result.all() if r[0]]
    avg_ne = round(sum(ne_scores) / len(ne_scores), 2) if ne_scores else 0

    # Average SDG alignment
    result2 = await db.execute(
        select(Opportunity.sdg_scores).where(Opportunity.sdg_scores.isnot(None))
    )
    from scorer.sdg_scorer import compute_sdg_alignment_score
    sdg_alignments = [compute_sdg_alignment_score(r[0]) for r in result2.all() if r[0]]
    avg_sdg = round(sum(sdg_alignments) / len(sdg_alignments), 2) if sdg_alignments else 0

    # Pipeline counts
    pipeline = {}
    for stage in ["sourced", "scoring", "scored", "flagged", "reviewed"]:
        cnt = (await db.execute(
            select(func.count()).select_from(Opportunity).where(Opportunity.status == stage)
        )).scalar()
        pipeline[stage] = cnt

    # Active agents (ran in last 24h)
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    active_agents = (await db.execute(
        select(func.count(func.distinct(AgentRun.agent_name))).where(AgentRun.started_at >= cutoff)
    )).scalar()

    return {
        "total_opportunities": total,
        "scored_opportunities": scored,
        "featured_opportunities": featured,
        "avg_ne_score": avg_ne,
        "avg_sdg_alignment": avg_sdg,
        "pipeline": pipeline,
        "active_agents": active_agents,
    }


@router.get("/sdg-distribution")
async def sdg_distribution(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunity.primary_sdgs).where(Opportunity.primary_sdgs.isnot(None))
    )
    rows = result.scalars().all()

    counts = {str(i): 0 for i in range(1, 18)}
    for sdgs in rows:
        if sdgs:
            for s in sdgs:
                key = str(s)
                if key in counts:
                    counts[key] += 1

    return counts


@router.get("/sectors")
async def sector_breakdown(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunity.sector, func.count().label("count"))
        .where(Opportunity.sector.isnot(None))
        .group_by(Opportunity.sector)
        .order_by(func.count().desc())
    )
    return [{"sector": r.sector, "count": r.count} for r in result.all()]


@router.get("/types")
async def type_breakdown(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunity.opportunity_type, func.count().label("count"))
        .where(Opportunity.opportunity_type.isnot(None))
        .group_by(Opportunity.opportunity_type)
        .order_by(func.count().desc())
    )
    return [{"type": r.opportunity_type, "count": r.count} for r in result.all()]
