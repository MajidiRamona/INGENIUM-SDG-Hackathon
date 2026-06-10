from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from db.database import get_db
from db.models import Opportunity
from scorer.sdg_scorer import score_opportunity
from datetime import datetime

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


@router.get("")
async def list_opportunities(
    status: Optional[str] = None,
    sdg: Optional[int] = None,
    opportunity_type: Optional[str] = None,
    sector: Optional[str] = None,
    min_ne_score: Optional[float] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    q = select(Opportunity).order_by(Opportunity.scraped_at.desc())

    if status:
        q = q.where(Opportunity.status == status)
    if opportunity_type:
        q = q.where(Opportunity.opportunity_type == opportunity_type)
    if sector:
        q = q.where(Opportunity.sector == sector)
    if featured is not None:
        q = q.where(Opportunity.is_featured == featured)
    if search:
        term = f"%{search}%"
        q = q.where(or_(
            Opportunity.title.ilike(term),
            Opportunity.description.ilike(term),
            Opportunity.organization.ilike(term),
        ))

    result = await db.execute(q.offset(offset).limit(limit))
    opps = result.scalars().all()

    # Python-side SDG filter (JSON field)
    if sdg:
        opps = [o for o in opps if o.primary_sdgs and sdg in o.primary_sdgs]

    # Non-extractive filter
    if min_ne_score is not None:
        opps = [
            o for o in opps
            if o.non_extractive_score and
               o.non_extractive_score.get("overall", 0) >= min_ne_score
        ]

    return [_serialize(o) for o in opps]


@router.get("/{opp_id}")
async def get_opportunity(opp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    return _serialize(opp)


@router.patch("/{opp_id}/status")
async def update_status(opp_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")

    valid = {"sourced", "scoring", "scored", "flagged", "reviewed"}
    new_status = body.get("status")
    if new_status not in valid:
        raise HTTPException(400, f"Status must be one of {valid}")

    opp.status = new_status
    await db.commit()
    return {"id": opp_id, "status": new_status}


@router.patch("/{opp_id}/feature")
async def toggle_feature(opp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    opp.is_featured = not opp.is_featured
    await db.commit()
    return {"id": opp_id, "is_featured": opp.is_featured}


@router.post("/{opp_id}/rescore")
async def rescore_opportunity(
    opp_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")

    opp.status = "scoring"
    await db.commit()

    background_tasks.add_task(_rescore_task, opp_id)
    return {"message": "Rescoring started", "id": opp_id}


async def _rescore_task(opp_id: int):
    from db.database import async_session
    from agents.rss_agent import _apply_analysis

    async with async_session() as session:
        result = await session.execute(select(Opportunity).where(Opportunity.id == opp_id))
        opp = result.scalar_one_or_none()
        if not opp:
            return
        analysis = await score_opportunity(opp.title, opp.description or "", opp.source or "")
        if analysis:
            _apply_analysis(opp, analysis)
            opp.status = "scored"
        else:
            opp.status = "sourced"
        await session.commit()


def _serialize(o: Opportunity) -> dict:
    from scorer.sdg_scorer import compute_sdg_alignment_score
    return {
        "id": o.id,
        "title": o.title,
        "description": o.description,
        "source": o.source,
        "source_url": o.source_url,
        "published_at": o.published_at.isoformat() if o.published_at else None,
        "scraped_at": o.scraped_at.isoformat() if o.scraped_at else None,
        "scored_at": o.scored_at.isoformat() if o.scored_at else None,
        "sdg_scores": o.sdg_scores,
        "primary_sdgs": o.primary_sdgs,
        "non_extractive_score": o.non_extractive_score,
        "sdg_alignment_score": compute_sdg_alignment_score(o.sdg_scores) if o.sdg_scores else None,
        "opportunity_type": o.opportunity_type,
        "sector": o.sector,
        "stage": o.stage,
        "country": o.country,
        "organization": o.organization,
        "amount_usd": o.amount_usd,
        "impact_thesis": o.impact_thesis,
        "risk_flags": o.risk_flags,
        "ai_confidence": o.ai_confidence,
        "status": o.status,
        "is_featured": o.is_featured,
        "tags": o.tags,
    }
