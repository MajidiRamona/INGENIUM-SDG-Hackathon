import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db
from db.models import Opportunity

router = APIRouter(prefix="/api/opportunities", tags=["memo"])

MEMO_SYSTEM = """You are a senior investment analyst at an impact finance fund specialising in SDG-aligned, non-extractive capital deployment.

Write investment memos that are direct, evidence-based, and honest. Do not hedge excessively. Make a clear recommendation.

Non-extractive finance criteria you weight heavily:
- Community ownership / cooperative governance
- Revenue circularity (value stays in local economy)
- Worker equity (ownership, profit share, living wages)
- Ecological integrity (regenerative or net-positive)

Format your memo using plain text with these exact section headers (uppercase, followed by a line of dashes):

INVESTMENT MEMO
Opportunity · Organization · Country · Capital Size

EXECUTIVE SUMMARY
---
2-3 sentences.

SDG ALIGNMENT
---
List each primary SDG with specific evidence from the deal description.

NON-EXTRACTIVE ASSESSMENT
---
Score and justify each dimension: Community Ownership / Revenue Circularity / Worker Equity / Ecological Integrity.
Overall: X/10 — one-sentence verdict.

RISK ANALYSIS
---
Bullet each material risk. Be specific, not generic.

CAPITAL RECOMMENDATION
---
Recommend capital type (grant / concessional loan / equity / blended) and structure. Justify.

RECOMMENDATION
---
One of: STRONG INVEST / INVEST / MONITOR / PASS
Confidence: X%
One sentence rationale."""


def _build_prompt(opp: Opportunity) -> str:
    ne = opp.non_extractive_score or {}
    sdgs = opp.primary_sdgs or []
    amount = f"${opp.amount_usd / 1_000_000:.1f}M" if opp.amount_usd else "Size undisclosed"

    return f"""Write a one-page investment memo for the following opportunity.

DEAL DATA
Title: {opp.title}
Organization: {opp.organization or 'Unknown'}
Country/Region: {opp.country or 'Global'}
Capital Size: {amount}
Type: {opp.opportunity_type or 'Unknown'}
Sector: {opp.sector or 'Unknown'}
Stage: {opp.stage or 'Unknown'}
Primary SDGs: {', '.join(f'SDG {s}' for s in sdgs)}
Non-Extractive Scores: Community Ownership {ne.get('community_ownership', '?')}/10 · Revenue Circularity {ne.get('revenue_circularity', '?')}/10 · Worker Equity {ne.get('worker_equity', '?')}/10 · Ecological Integrity {ne.get('ecological_integrity', '?')}/10 · Overall {ne.get('overall', '?')}/10
Risk Flags: {', '.join(opp.risk_flags) if opp.risk_flags else 'None identified'}
Tags: {', '.join(opp.tags) if opp.tags else 'None'}

DESCRIPTION
{(opp.description or '')[:3000]}

Write the full investment memo now."""


async def _stream_real(opp: Opportunity):
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic()
    prompt = _build_prompt(opp)
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=MEMO_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"


async def _stream_mock(opp: Opportunity):
    """Streams a mock memo word-by-word when no API key is set."""
    import asyncio
    ne = opp.non_extractive_score or {}
    sdgs = opp.primary_sdgs or []
    amount = f"${opp.amount_usd / 1_000_000:.1f}M" if opp.amount_usd else "Size undisclosed"
    overall_ne = ne.get('overall', 0)
    rec = "INVEST" if overall_ne >= 7 else "MONITOR" if overall_ne >= 5 else "PASS"
    confidence = int(min(95, max(55, overall_ne * 9 + 10)))

    sdg_lines = "\n".join(
        f"  SDG {s}: Directly addressed through the core activities described."
        for s in sdgs[:3]
    )

    memo = f"""INVESTMENT MEMO
{opp.title[:60]} · {opp.organization or 'Unknown'} · {opp.country or 'Global'} · {amount}

EXECUTIVE SUMMARY
---
{opp.title} represents a {opp.opportunity_type or 'capital deployment'} opportunity in the {opp.sector or 'impact'} sector. The initiative demonstrates strong alignment with multiple SDG targets and scores {overall_ne:.1f}/10 on non-extractive finance criteria. {('The cooperative / community-ownership structure is a meaningful differentiator from conventional ESG instruments.' if overall_ne >= 7 else 'Some extractive elements warrant scrutiny before commitment.')}

SDG ALIGNMENT
---
{sdg_lines}
Alignment is substantiated by the operational model and beneficiary demographics described in the source materials.

NON-EXTRACTIVE ASSESSMENT
---
Community Ownership: {ne.get('community_ownership', 0):.1f}/10 — {'Community holds direct governance and/or equity stake.' if ne.get('community_ownership', 0) >= 7 else 'Limited community ownership structure identified.'}
Revenue Circularity: {ne.get('revenue_circularity', 0):.1f}/10 — {'Revenues demonstrably recirculate within the target community.' if ne.get('revenue_circularity', 0) >= 7 else 'Revenue extraction risk present; verify reinvestment commitments.'}
Worker Equity: {ne.get('worker_equity', 0):.1f}/10 — {'Worker profit-sharing or ownership mechanism confirmed.' if ne.get('worker_equity', 0) >= 7 else 'Worker equity provisions unclear from available data.'}
Ecological Integrity: {ne.get('ecological_integrity', 0):.1f}/10 — {'Net-positive ecological design; regenerative approach confirmed.' if ne.get('ecological_integrity', 0) >= 7 else 'Ecological claims require third-party verification.'}
Overall: {overall_ne:.1f}/10 — {'Strong non-extractive profile; aligns with fund mandate.' if overall_ne >= 7 else 'Mixed profile; extractive elements offset impact claims.'}

RISK ANALYSIS
---
{chr(10).join(f'- {r}' for r in (opp.risk_flags or [])) or '- No material risks flagged by automated screening; manual due diligence required.'}
- Data quality: automated screening of public sources; original source documents not reviewed.

CAPITAL RECOMMENDATION
---
{'Concessional equity or patient capital is appropriate given cooperative structure and community governance. Target 5-7 year horizon with exit via community buyout or secondary impact fund.' if opp.opportunity_type == 'investment' else 'Grant capital appropriate; no financial return expected. Blended with ODA where sovereign context applies.' if opp.opportunity_type == 'grant' else 'Partnership capital or technical assistance facility. Assess co-investor landscape before committing.'}

RECOMMENDATION
---
{rec}
Confidence: {confidence}%
{'Non-extractive score and SDG alignment both exceed fund thresholds. Proceed to full due diligence.' if rec == 'INVEST' else 'Borderline profile. Commission independent governance review before proceeding.' if rec == 'MONITOR' else 'Non-extractive score below fund minimum. Do not commit without structural redesign.'}"""

    words = memo.split(' ')
    for i, word in enumerate(words):
        chunk = word + (' ' if i < len(words) - 1 else '')
        yield f"data: {json.dumps({'text': chunk})}\n\n"
        await asyncio.sleep(0.015)

    yield "data: [DONE]\n\n"


@router.get("/{opp_id}/memo")
async def investment_memo(opp_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(404, "Opportunity not found")

    streamer = _stream_real(opp) if os.getenv("ANTHROPIC_API_KEY") else _stream_mock(opp)

    return StreamingResponse(
        streamer,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
