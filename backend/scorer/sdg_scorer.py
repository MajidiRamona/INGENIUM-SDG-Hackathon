import os
import json
import asyncio
from typing import Optional
from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SCORING_TOOL = {
    "name": "record_sdg_analysis",
    "description": "Record structured SDG alignment and non-extractive finance analysis for an opportunity",
    "input_schema": {
        "type": "object",
        "properties": {
            "sdg_scores": {
                "type": "object",
                "description": "Score 0-10 for each of the 17 SDGs. Key is SDG number as string.",
                "additionalProperties": {"type": "number"}
            },
            "primary_sdgs": {
                "type": "array",
                "items": {"type": "integer"},
                "description": "Top 3 most relevant SDG numbers (integers 1-17)"
            },
            "non_extractive_score": {
                "type": "object",
                "properties": {
                    "community_ownership": {
                        "type": "number",
                        "description": "0=no community stake, 10=fully community-owned or cooperative"
                    },
                    "revenue_circularity": {
                        "type": "number",
                        "description": "0=all value extracted, 10=all value recirculates locally"
                    },
                    "worker_equity": {
                        "type": "number",
                        "description": "0=no worker stake, 10=full worker ownership or profit-sharing"
                    },
                    "ecological_integrity": {
                        "type": "number",
                        "description": "0=ecologically destructive, 10=regenerative or net-positive"
                    },
                    "overall": {
                        "type": "number",
                        "description": "Weighted overall non-extractive score 0-10"
                    }
                },
                "required": ["community_ownership", "revenue_circularity", "worker_equity", "ecological_integrity", "overall"]
            },
            "opportunity_type": {
                "type": "string",
                "enum": ["grant", "investment", "partnership", "procurement", "other"]
            },
            "sector": {
                "type": "string",
                "description": "Primary sector: climate, health, education, agriculture, energy, finance, technology, infrastructure, other"
            },
            "stage": {
                "type": "string",
                "enum": ["seed", "early", "growth", "mature", "unknown"]
            },
            "country": {
                "type": "string",
                "description": "Primary country or region (e.g. 'Kenya', 'Southeast Asia', 'Global')"
            },
            "organization": {
                "type": "string",
                "description": "Lead organization, fund, or institution"
            },
            "amount_usd": {
                "type": "number",
                "description": "Dollar amount if mentioned, otherwise null"
            },
            "impact_thesis": {
                "type": "string",
                "description": "2-3 sentence explanation of why this opportunity advances the SDGs and non-extractive finance principles"
            },
            "risk_flags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Concerns: greenwashing, extractive structure, weak governance, etc. Empty if none."
            },
            "tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 keywords: solar, cooperative, indigenous, blended-finance, etc."
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Confidence in this analysis given available information"
            }
        },
        "required": ["sdg_scores", "primary_sdgs", "non_extractive_score", "opportunity_type",
                     "sector", "stage", "impact_thesis", "risk_flags", "tags", "confidence"]
    }
}

SYSTEM_PROMPT = """You are an expert SDG alignment analyst for an AI-first impact finance platform focused on non-extractive capital.

Your role is to evaluate investment opportunities, grants, and partnerships against:
1. The 17 UN Sustainable Development Goals (SDGs)
2. Non-extractive finance principles: community ownership, revenue circularity, worker equity, ecological integrity

Non-extractive finance means capital that DOES NOT extract value from communities or ecosystems — instead, it builds local wealth, cooperative ownership, and regenerative systems. Score accordingly:
- High non-extractive: cooperatives, community land trusts, worker-owned enterprises, B Corps with strong governance, regenerative projects
- Low non-extractive: traditional VC extraction, resource extraction, absentee ownership, profit repatriation

SDG scoring (0-10):
- 0: No relevance
- 3-4: Tangential alignment
- 6-7: Clear alignment
- 9-10: Core focus of the initiative

Be critical of greenwashing — if claims are vague or the structure is extractive, flag it."""


async def score_opportunity(
    title: str,
    description: str,
    source: str,
    timeout: float = 30.0
) -> Optional[dict]:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return _mock_score(title)

    prompt = f"""Analyze this impact investment opportunity:

**Title:** {title}
**Source:** {source}
**Description:**
{description[:3000]}

Use the record_sdg_analysis tool to record your analysis."""

    try:
        response = await asyncio.wait_for(
            client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                tools=[SCORING_TOOL],
                tool_choice={"type": "tool", "name": "record_sdg_analysis"},
                messages=[{"role": "user", "content": prompt}]
            ),
            timeout=timeout
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "record_sdg_analysis":
                result = block.input
                # Ensure all 17 SDGs are present
                sdg_scores = result.get("sdg_scores", {})
                for i in range(1, 18):
                    sdg_scores.setdefault(str(i), 0)
                result["sdg_scores"] = sdg_scores
                return result

    except Exception as e:
        print(f"Scoring error for '{title}': {e}")
        return None

    return None


def compute_sdg_alignment_score(sdg_scores: dict) -> float:
    if not sdg_scores:
        return 0.0
    scores = [float(v) for v in sdg_scores.values()]
    top3 = sorted(scores, reverse=True)[:3]
    return round(sum(top3) / (3 * 10) * 10, 2)


def _mock_score(title: str) -> dict:
    """Fallback mock scorer when API key is absent — used for demo/dev."""
    import hashlib
    h = int(hashlib.md5(title.encode()).hexdigest(), 16)

    sdgs = [(h >> (i * 4)) % 10 for i in range(17)]
    top_idx = sorted(range(17), key=lambda i: sdgs[i], reverse=True)[:3]

    return {
        "sdg_scores": {str(i + 1): sdgs[i] for i in range(17)},
        "primary_sdgs": [i + 1 for i in top_idx],
        "non_extractive_score": {
            "community_ownership": (h % 7) + 3,
            "revenue_circularity": ((h >> 4) % 6) + 4,
            "worker_equity": ((h >> 8) % 8) + 2,
            "ecological_integrity": ((h >> 12) % 7) + 3,
            "overall": ((h >> 16) % 5) + 5,
        },
        "opportunity_type": ["grant", "investment", "partnership", "procurement"][h % 4],
        "sector": ["climate", "health", "education", "agriculture", "energy"][h % 5],
        "stage": ["seed", "early", "growth", "mature"][h % 4],
        "country": ["Kenya", "Bangladesh", "Brazil", "India", "Colombia", "Global"][h % 6],
        "organization": "Mock Organization",
        "amount_usd": None,
        "impact_thesis": f"This opportunity demonstrates alignment with multiple SDGs through systemic change approaches. Mock analysis for: {title[:80]}",
        "risk_flags": [],
        "tags": ["impact", "sustainable", "sdg"],
        "confidence": 0.5,
    }
